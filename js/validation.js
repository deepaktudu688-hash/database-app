const integerTypes = new Set(["INTEGER", "BIGINT"]);
const decimalTypes = new Set(["FLOAT", "DOUBLE", "DECIMAL"]);

export function validateRow(table, values, existingRows = [], editingId = null) {
  const errors = [];
  for (const column of table.columns) {
    const rawValue = values[column.name];
    const value = typeof rawValue === "string" ? rawValue.trim() : rawValue;
    const empty = value === "" || value === null || value === undefined;
    if (empty && column.notNull) errors.push(`${column.name} is required.`);
    if (empty) continue;
    if (integerTypes.has(column.type) && !/^-?\d+$/.test(String(value))) errors.push(`${column.name} must be a whole number.`);
    if (decimalTypes.has(column.type) && !/^-?\d+(\.\d+)?$/.test(String(value))) errors.push(`${column.name} must be a number.`);
    if (column.type === "BOOLEAN" && !["true", "false", "1", "0"].includes(String(value).toLowerCase())) errors.push(`${column.name} must be true or false.`);
    if (["DATE", "TIME", "DATETIME"].includes(column.type) && Number.isNaN(Date.parse(String(value)))) errors.push(`${column.name} must be a valid ${column.type.toLowerCase()}.`);
    if (column.type === "JSON") { try { JSON.parse(String(value)); } catch { errors.push(`${column.name} must contain valid JSON.`); } }
    if (column.unique || column.primaryKey) {
      const duplicate = existingRows.some((row) => row.id !== editingId && String(row.values[column.name] ?? "").toLowerCase() === String(value).toLowerCase());
      if (duplicate) errors.push(`${column.name} must be unique.`);
    }
  }
  return errors;
}
