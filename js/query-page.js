import { all, log, remove } from "./storage.js";
import { executeSelect } from "./query-engine.js";

export async function renderQueryPage(el, { databaseId, esc }) {
  const tables = (await all("tables")).filter((table) => table.databaseId === databaseId);
  el.innerHTML = `<div class="toolbar"><div><div class="muted">QUERY WORKSPACE</div><h1 style="margin:4px 0">Work with your data</h1><p class="muted">Use the visual controls or the optional SQL-style reader.</p></div></div><div class="card query-card"><div class="field"><label for="sql">READ QUERY</label><textarea id="sql" rows="5" spellcheck="false" placeholder="SELECT name, marks FROM Students WHERE marks > 80 ORDER BY marks DESC LIMIT 25"></textarea></div><div class="query-actions"><button class="btn primary" id="run-query">Run query →</button><button class="btn" id="clear-query">Clear</button></div><p class="error" id="query-error" role="alert"></p><div id="query-result"></div></div><div class="card query-card"><h2>Delete matching rows</h2><p class="muted">Choose what to remove. This changes shared server data after confirmation.</p><div class="form-grid"><div class="field"><label for="delete-table">TABLE</label><select id="delete-table"><option value="">Choose a table</option>${tables.map((table) => `<option value="${table.id}">${esc(table.name)}</option>`).join("")}</select></div><div class="field"><label for="delete-column">COLUMN</label><select id="delete-column"><option value="">Choose a table first</option></select></div><div class="field"><label for="delete-operator">MATCH</label><select id="delete-operator"><option value="contains">Contains</option><option value="equals">Equals</option><option value="starts">Starts with</option><option value="ends">Ends with</option></select></div><div class="field"><label for="delete-value">VALUE</label><input id="delete-value" placeholder="Deepak"></div></div><div class="query-actions"><button class="btn danger" id="preview-delete">Preview matches</button><button class="btn danger" id="confirm-delete" disabled>Delete matching rows</button></div><p class="error" id="delete-error" role="alert"></p><div id="delete-preview"></div></div><div class="section"><div class="muted">AVAILABLE TABLES</div><p>${tables.map((table) => `<span class="badge" style="margin:6px 4px 0 0">${esc(table.name)}</span>`).join("") || "No tables yet"}</p></div>`;
  const sqlInput = document.querySelector("#sql");
  const result = document.querySelector("#query-result");
  const deleteTable = document.querySelector("#delete-table");
  const deleteColumn = document.querySelector("#delete-column");
  const deleteValue = document.querySelector("#delete-value");
  const deletePreview = document.querySelector("#delete-preview");
  const deleteError = document.querySelector("#delete-error");
  let matches = [];
  const selectedDeleteTable = () => tables.find((table) => table.id === deleteTable.value);
  deleteTable.onchange = () => { const table = selectedDeleteTable(); deleteColumn.innerHTML = table ? table.columns.map((column) => `<option value="${esc(column.name)}">${esc(column.name)}</option>`).join("") : "<option value=\"\">Choose a table first</option>"; matches = []; deletePreview.innerHTML = ""; document.querySelector("#confirm-delete").disabled = true; };
  document.querySelector("#preview-delete").onclick = async () => { deleteError.textContent = ""; const table = selectedDeleteTable(), column = deleteColumn.value, value = deleteValue.value.trim(), operator = document.querySelector("#delete-operator").value; if (!table || !column || !value) { deleteError.textContent = "Choose a table, column, and value first."; return; } const rows = (await all("rows")).filter((row) => row.tableId === table.id); matches = rows.filter((row) => { const actual = String(row.values[column] ?? "").toLowerCase(), expected = value.toLowerCase(); if (operator === "equals") return actual === expected; if (operator === "starts") return actual.startsWith(expected); if (operator === "ends") return actual.endsWith(expected); return actual.includes(expected); }); deletePreview.innerHTML = `<div class="notice">${matches.length} row(s) match ${esc(column)} ${esc(operator)} “${esc(value)}”. Review the count, then confirm.</div>`; document.querySelector("#confirm-delete").disabled = matches.length === 0; };
  document.querySelector("#confirm-delete").onclick = async () => { if (!matches.length || !window.confirm(`Delete ${matches.length} matching row(s)? This cannot be undone.`)) return; await Promise.all(matches.map((row) => remove("rows", row.id))); await log("Deleted matching rows", `${matches.length} row(s) from ${selectedDeleteTable().name}`); deletePreview.innerHTML = `<div class="notice">Deleted ${matches.length} row(s).</div>`; matches = []; document.querySelector("#confirm-delete").disabled = true; };
  document.querySelector("#clear-query").onclick = () => { sqlInput.value = ""; result.innerHTML = ""; document.querySelector("#query-error").textContent = ""; };
  document.querySelector("#run-query").onclick = async () => {
    const error = document.querySelector("#query-error");
    error.textContent = "";
    try {
      const parsed = sqlInput.value.trim();
      const tableName = parsed.match(/\bFROM\s+([A-Za-z_][A-Za-z0-9_]*)/i)?.[1];
      const table = tables.find((candidate) => candidate.name.toLowerCase() === tableName?.toLowerCase());
      if (!table) throw new Error("Choose a table that exists in this database.");
      const output = executeSelect(parsed, table, (await all("rows")).filter((row) => row.tableId === table.id));
      result.innerHTML = `<div class="notice">${output.rows.length} row(s) returned</div><div class="table-wrap"><table class="data-table"><thead><tr>${output.columns.map((column) => `<th>${esc(column)}</th>`).join("")}</tr></thead><tbody>${output.rows.map((row) => `<tr>${output.columns.map((column) => `<td>${esc(row.values[column])}</td>`).join("")}</tr>`).join("") || '<tr><td class="empty">No matching rows.</td></tr>'}</tbody></table></div>`;
    } catch (exception) { error.textContent = exception.message; }
  };
}
