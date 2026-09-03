const aggregatePattern = /^(COUNT|SUM|AVG|MIN|MAX)\s*\(\s*(\*|[A-Za-z_][A-Za-z0-9_]*)\s*\)$/i;

function cleanIdentifier(value) {
  return value.trim().replace(/^`|`$/g, "");
}

function compare(actual, operator, expected) {
  const left = Number(actual), right = Number(expected);
  const numeric = actual !== "" && expected !== "" && !Number.isNaN(left) && !Number.isNaN(right);
  const a = numeric ? left : String(actual ?? "").toLowerCase();
  const b = numeric ? right : String(expected ?? "").toLowerCase();
  if (operator === "=") return a === b;
  if (operator === "!=") return a !== b;
  if (operator === ">") return a > b;
  if (operator === "<") return a < b;
  if (operator === ">=") return a >= b;
  if (operator === "<=") return a <= b;
  if (operator.toUpperCase() === "LIKE") return String(actual ?? "").toLowerCase().includes(String(expected).replace(/%/g, "").toLowerCase());
  throw new Error(`Unsupported operator: ${operator}`);
}

export function parseSelect(sql) {
  const match = sql.trim().replace(/;$/, "").match(/^SELECT\s+(DISTINCT\s+)?(.+?)\s+FROM\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER\s+BY\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s+(ASC|DESC))?)?(?:\s+LIMIT\s+(\d+))?$/i);
  if (!match) throw new Error("Unsupported SQL. Use SELECT columns FROM table with optional WHERE, ORDER BY, and LIMIT.");
  const [, distinct, columns, table, where, orderColumn, orderDirection, limit] = match;
  const condition = where?.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*(=|!=|>=|<=|>|<|LIKE)\s*(?:'([^']*)'|"([^"]*)"|(\S+))$/i);
  if (where && !condition) throw new Error("Invalid WHERE condition. Example: marks > 80");
  return { distinct: Boolean(distinct), columns: columns.split(",").map(cleanIdentifier), table: cleanIdentifier(table), condition: condition ? { column: condition[1], operator: condition[2], value: condition[3] ?? condition[4] ?? condition[5] } : null, orderColumn, orderDirection: orderDirection?.toUpperCase() || "ASC", limit: limit ? Number(limit) : 100 };
}

export function executeSelect(sql, table, rows) {
  const query = parseSelect(sql);
  if (query.table.toLowerCase() !== table.name.toLowerCase()) throw new Error(`Table not found: ${query.table}`);
  const availableColumns = table.columns.map((column) => column.name);
  const aggregate = query.columns.length === 1 ? query.columns[0].match(aggregatePattern) : null;
  const selectedColumns = query.columns[0] === "*" ? availableColumns : query.columns;
  if (!aggregate) { const missing = selectedColumns.find((column) => !availableColumns.some((available) => available.toLowerCase() === column.toLowerCase())); if (missing) throw new Error(`Column not found: ${missing}`); }
  let result = rows.filter((row) => !query.condition || compare(row.values[query.condition.column], query.condition.operator, query.condition.value));
  if (query.distinct) { const seen = new Set(); result = result.filter((row) => { const key = selectedColumns.map((column) => row.values[column] ?? "").join("\u0001"); if (seen.has(key)) return false; seen.add(key); return true; }); }
  if (query.orderColumn) { if (!availableColumns.includes(query.orderColumn)) throw new Error(`Column not found: ${query.orderColumn}`); result.sort((left, right) => { const comparison = String(left.values[query.orderColumn] ?? "").localeCompare(String(right.values[query.orderColumn] ?? ""), undefined, { numeric: true }); return query.orderDirection === "DESC" ? -comparison : comparison; }); }
  if (aggregate) { const [, name, column] = aggregate; const values = column === "*" ? result : result.map((row) => Number(row.values[column])).filter((value) => !Number.isNaN(value)); const value = name.toUpperCase() === "COUNT" ? values.length : name.toUpperCase() === "SUM" ? values.reduce((sum, item) => sum + item, 0) : name.toUpperCase() === "AVG" ? (values.length ? values.reduce((sum, item) => sum + item, 0) / values.length : 0) : name.toUpperCase() === "MIN" ? Math.min(...values) : Math.max(...values); return { columns: [`${name.toUpperCase()}(${column})`], rows: [{ values: { [`${name.toUpperCase()}(${column})`]: value } }], query }; }
  return { columns: selectedColumns, rows: result.slice(0, query.limit).map((row) => ({ values: Object.fromEntries(selectedColumns.map((column) => [column, row.values[column] ?? ""])) })), query };
}
