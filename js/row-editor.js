import { all, log, put } from "./storage.js";

const esc = (value = "") => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));

function showEditor(rowId, table, row) {
  const wrap = document.createElement("div");
  wrap.className = "modal-backdrop";
  wrap.innerHTML = `<div class="modal row-editor-modal"><h2>Edit row</h2><p class="muted">Select the values you want to change, then save them together.</p><form><label class="select-all"><input type="checkbox" data-select-all> Select all values in this row</label><div class="row-editor-fields">${table.columns.map((column) => `<label class="row-editor-field"><input type="checkbox" name="selected" value="${esc(column.name)}"><span><strong>${esc(column.name)}</strong><small>${esc(column.type)}</small></span><input name="value-${esc(column.name)}" value="${esc(row.values[column.name] ?? "")}" aria-label="${esc(column.name)} value"></label>`).join("")}</div><p class="error" data-editor-error role="alert"></p><div class="actions"><button type="button" class="btn" data-cancel>Cancel</button><button type="button" class="btn danger" data-clear>Clear selected values</button><button class="btn primary">Save selected values</button></div></form></div>`;
  document.body.append(wrap);
  const form = wrap.querySelector("form");
  wrap.querySelector("[data-select-all]").onchange = (event) => { form.querySelectorAll('[name="selected"]').forEach((checkbox) => { checkbox.checked = event.target.checked; }); };
  wrap.querySelector("[data-cancel]").onclick = () => wrap.remove();
  wrap.querySelector("[data-clear]").onclick = async () => {
    const selected = new FormData(form).getAll("selected");
    if (!selected.length) { wrap.querySelector("[data-editor-error]").textContent = "Select at least one value to clear."; return; }
    if (!window.confirm(`Clear ${selected.length} selected value(s)?`)) return;
    const values = { ...row.values };
    selected.forEach((column) => { values[column] = ""; });
    await put("rows", { ...row, values });
    await log("Cleared row values", `${table.name}: ${selected.join(", ")}`);
    wrap.remove();
    window.location.reload();
  };
  form.onsubmit = async (event) => {
    event.preventDefault();
    const data = new FormData(form), selected = data.getAll("selected");
    if (!selected.length) { wrap.querySelector("[data-editor-error]").textContent = "Select at least one value to replace."; return; }
    const values = { ...row.values };
    selected.forEach((column) => { values[column] = data.get(`value-${column}`); });
    await put("rows", { ...row, values });
    await log("Updated row values", `${table.name}: ${selected.join(", ")}`);
    wrap.remove();
    window.location.reload();
  };
}

async function attachEditors() {
  const buttons = [...document.querySelectorAll("[data-delete]")].filter((button) => !button.dataset.editorAttached);
  if (!buttons.length) return;
  const tables = await all("tables");
  const rows = await all("rows");
  buttons.forEach((button) => {
    button.dataset.editorAttached = "true";
    const edit = document.createElement("button");
    edit.className = "btn small";
    edit.type = "button";
    edit.textContent = "Edit values";
    edit.onclick = async () => {
      const row = rows.find((item) => item.id === button.dataset.delete);
      const table = row && tables.find((item) => item.id === row.tableId);
      if (row && table) showEditor(row.id, table, row);
    };
    const clear = document.createElement("button");
    clear.className = "btn small danger";
    clear.type = "button";
    clear.textContent = "Clear values";
    clear.onclick = () => { edit.click(); };
    button.parentElement.prepend(edit, clear);
  });
}

const observer = new MutationObserver(() => { attachEditors().catch(() => {}); });
observer.observe(document.body, { childList: true, subtree: true });
