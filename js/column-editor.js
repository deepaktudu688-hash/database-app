import { all, log, put } from "./storage.js";
import { currentUser } from "./auth.js";

const esc = (value = "") => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
const dataTypes = ["INTEGER", "BIGINT", "FLOAT", "DOUBLE", "DECIMAL", "CHAR", "VARCHAR", "TEXT", "BOOLEAN", "DATE", "TIME", "DATETIME", "JSON"];

async function addColumn() {
  const tableName = document.querySelector("#content .toolbar h1")?.textContent.trim();
  const table = (await all("tables")).find((item) => item.name === tableName);
  if (!table) return;
  if ((await currentUser())?.role !== "ADMIN") return;

  const wrap = document.createElement("div");
  wrap.className = "modal-backdrop";
  wrap.innerHTML = `<div class="modal"><h2>Add column</h2><p class="muted">Add a field to this table without changing existing records.</p><form><div class="field"><label>COLUMN NAME</label><input name="name" required pattern="[A-Za-z_][A-Za-z0-9_]*" placeholder="column_name"></div><div class="field"><label>DATA TYPE</label><select name="type">${dataTypes.map((type) => `<option>${type}</option>`).join("")}</select></div><div class="field"><label>INSERT POSITION</label><select name="position">${table.columns.map((column, index) => `<option value="${index}">Before ${esc(column.name)}</option>`).join("")}<option value="${table.columns.length}" selected>At end</option></select></div><p class="error" data-column-error role="alert"></p><div class="actions"><button type="button" class="btn" data-cancel>Cancel</button><button class="btn primary">Add column</button></div></form></div>`;
  document.body.append(wrap);
  wrap.querySelector("[data-cancel]").onclick = () => wrap.remove();
  wrap.querySelector("form").onsubmit = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name")).trim();
    const error = wrap.querySelector("[data-column-error]");
    try {
      if (table.columns.some((column) => column.name.toLowerCase() === name.toLowerCase())) throw new Error("That column name already exists.");
      const position = Math.max(0, Math.min(table.columns.length, Number(form.get("position"))));
      const columns = [...table.columns];
      columns.splice(position, 0, { name, type: form.get("type"), primaryKey: false, notNull: false, unique: false, autoIncrement: false, order: position });
      await put("tables", { ...table, columns: columns.map((column, index) => ({ ...column, order: index })) });
      const rows = (await all("rows")).filter((row) => row.tableId === table.id);
      for (const row of rows) await put("rows", { ...row, values: { ...row.values, [name]: "" } });
      await log("Added table column", `${table.name}: ${name}`);
      wrap.remove();
      window.location.reload();
    } catch (exception) {
      error.textContent = exception.message;
    }
  };
}

const observer = new MutationObserver(async () => {
  const insert = document.querySelector("#insert");
  if (!insert || document.querySelector("#add-column")) return;
  if ((await currentUser())?.role !== "ADMIN") return;
  const button = document.createElement("button");
  button.className = "btn";
  button.id = "add-column";
  button.type = "button";
  button.textContent = "＋ Add column";
  button.onclick = () => addColumn().catch((error) => window.alert(error.message));
  insert.after(button);
});
observer.observe(document.body, { childList: true, subtree: true });
