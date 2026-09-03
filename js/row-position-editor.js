import { all, log, put } from "./storage.js";
import { currentUser } from "./auth.js";
import { validateRow } from "./validation.js";

const esc = (value = "") => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));

function orderedRows(rows) {
  return [...rows].sort((left, right) => {
    if (left.order !== undefined && right.order !== undefined) return left.order - right.order;
    if (left.order !== undefined) return -1;
    if (right.order !== undefined) return 1;
    return String(left.createdAt || "").localeCompare(String(right.createdAt || ""));
  });
}

async function insertAtPosition() {
  const tableName = document.querySelector("#content .toolbar h1")?.textContent.trim();
  const table = (await all("tables")).find((item) => item.name === tableName);
  if (!table) return;
  const rows = orderedRows((await all("rows")).filter((row) => row.tableId === table.id));
  const wrap = document.createElement("div");
  wrap.className = "modal-backdrop";
  wrap.innerHTML = `<div class="modal"><h2>Insert row at position</h2><p class="muted">Choose where this new record should appear.</p><form><div class="field"><label>POSITION</label><select name="position">${rows.map((row, index) => `<option value="${index}">Before row ${index + 1}</option>`).join("")}<option value="${rows.length}" selected>At end</option></select></div>${table.columns.map((column) => `<div class="field" style="margin-top:12px"><label>${esc(column.name)} · ${esc(column.type)}</label><input name="${esc(column.name)}" ${column.name === "id" ? "type=number" : ""}></div>`).join("")}<p class="error" data-position-error role="alert"></p><div class="actions"><button type="button" class="btn" data-cancel>Cancel</button><button class="btn primary">Insert row</button></div></form></div>`;
  document.body.append(wrap);
  wrap.querySelector("[data-cancel]").onclick = () => wrap.remove();
  wrap.querySelector("form").onsubmit = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const values = Object.fromEntries(table.columns.map((column) => [column.name, form.get(column.name)]));
    const error = wrap.querySelector("[data-position-error]");
    const errors = validateRow(table, values, rows);
    if (errors.length) { error.textContent = errors.join(" "); return; }
    try {
      const position = Math.max(0, Math.min(rows.length, Number(form.get("position"))));
      const newRow = { id: crypto.randomUUID(), tableId: table.id, values, createdAt: new Date().toISOString(), order: position };
      rows.splice(position, 0, newRow);
      for (const [index, row] of rows.entries()) await put("rows", { ...row, order: index });
      await log("Inserted row at position", `${table.name}: ${position + 1}`);
      wrap.remove();
      window.location.reload();
    } catch (exception) {
      error.textContent = exception.message;
    }
  };
}

function syncRowOrder() {
  const tableBody = document.querySelector("#content .data-table tbody");
  if (!tableBody) return;
  all("rows").then((rows) => {
    const visibleIds = new Set([...tableBody.querySelectorAll("[data-delete]")].map((button) => button.dataset.delete));
    const orderedIds = orderedRows(rows.filter((row) => visibleIds.has(row.id))).map((row) => row.id);
    const rowElements = new Map([...tableBody.querySelectorAll("tr")].map((row) => [row.querySelector("[data-delete]")?.dataset.delete, row]));
    orderedIds.forEach((id) => { const row = rowElements.get(id); if (row) tableBody.append(row); });
  }).catch(() => {});
}

const observer = new MutationObserver(async () => {
  const insert = document.querySelector("#insert");
  if (!insert || insert.dataset.positionAttached) return;
  insert.dataset.positionAttached = "true";
  if ((await currentUser())?.role === "VIEWER") return;
  const button = document.createElement("button");
  button.className = "btn";
  button.id = "insert-at-position";
  button.type = "button";
  button.textContent = "＋ Insert at position";
  button.onclick = () => insertAtPosition().catch((error) => window.alert(error.message));
  insert.after(button);
  syncRowOrder();
});
observer.observe(document.body, { childList: true, subtree: true });
