import { all, log, put } from "./storage.js";

const dataTypes = ["INTEGER", "BIGINT", "FLOAT", "DOUBLE", "DECIMAL", "CHAR", "VARCHAR", "TEXT", "BOOLEAN", "DATE", "TIME", "DATETIME", "JSON"];

export async function renderSchema(el, { databaseId, esc, toast, renderApp }) {
  const database = (await all("databases")).find((item) => item.id === databaseId);
  let columnCount = 0;
  el.innerHTML = `<div class="toolbar"><div><div class="muted">SCHEMA DESIGNER</div><h1 style="margin:4px 0">Create a table</h1><p class="muted">Describe your data once. The workspace will generate the form and table for you.</p></div></div><form class="card schema-form" id="schema-form"><div class="field"><label>DATABASE</label><input value="${esc(database?.name || "Select a database first")}" disabled></div><div class="field"><label>TABLE NAME</label><input name="tableName" required pattern="[A-Za-z_][A-Za-z0-9_]*" placeholder="e.g. customers"></div><div class="field"><label>COLUMNS</label><div class="schema-columns" id="schema-columns"></div><button type="button" class="btn small" id="add-column">＋ Add column</button></div><div class="actions"><button type="submit" class="btn primary">Create table →</button></div><p class="error" id="schema-error" role="alert"></p></form>`;
  const columns = document.querySelector("#schema-columns");
  function addColumn() {
    columnCount += 1;
    const row = document.createElement("div");
    row.className = "schema-column-row";
    row.innerHTML = `<input name="columnName" required pattern="[A-Za-z_][A-Za-z0-9_]*" placeholder="column_name"><select name="columnType">${dataTypes.map((type) => `<option>${type}</option>`).join("")}</select><label class="schema-check"><input type="checkbox" name="primaryKey"> PK</label><label class="schema-check"><input type="checkbox" name="notNull"> Required</label><label class="schema-check"><input type="checkbox" name="unique"> Unique</label><label class="schema-check"><input type="checkbox" name="autoIncrement"> Auto</label><button type="button" class="btn small danger remove-column" title="Remove column">×</button>`;
    row.querySelector(".remove-column").onclick = () => { row.remove(); };
    columns.append(row);
  }
  document.querySelector("#add-column").onclick = addColumn;
  addColumn();
  document.querySelector("#schema-form").onsubmit = async (event) => {
    event.preventDefault();
    const error = document.querySelector("#schema-error");
    try {
      const formData = new FormData(event.currentTarget);
      const names = [...columns.querySelectorAll('[name="columnName"]')].map((input) => input.value.trim());
      if (!names.length) throw new Error("Add at least one column.");
      if (new Set(names.map((name) => name.toLowerCase())).size !== names.length) throw new Error("Column names must be unique.");
      const tableName = formData.get("tableName").trim();
      const existing = (await all("tables")).filter((table) => table.databaseId === databaseId);
      if (existing.some((table) => table.name.toLowerCase() === tableName.toLowerCase())) throw new Error("That table name already exists.");
      const rows = [...columns.querySelectorAll(".schema-column-row")];
      const table = { id: crypto.randomUUID(), databaseId, name: tableName, columns: rows.map((row, index) => ({ name: row.querySelector('[name="columnName"]').value.trim(), type: row.querySelector('[name="columnType"]').value, primaryKey: row.querySelector('[name="primaryKey"]').checked, notNull: row.querySelector('[name="notNull"]').checked, unique: row.querySelector('[name="unique"]').checked, autoIncrement: row.querySelector('[name="autoIncrement"]').checked, order: index })), rowCount: 0, createdAt: new Date().toISOString() };
      if (table.columns.filter((column) => column.primaryKey).length > 1) throw new Error("Choose only one primary key column.");
      await put("tables", table);
      await log("Created table", table.name);
      toast("Table created");
      renderApp();
    } catch (exception) {
      error.textContent = exception.message;
    }
  };
}
