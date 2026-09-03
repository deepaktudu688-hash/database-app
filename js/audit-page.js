import { all } from "./storage.js";

export async function renderAuditPage(el, { esc }) {
  const logs = (await all("audit")).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  el.innerHTML = `<div class="toolbar"><div><div class="muted">ACTIVITY HISTORY</div><h1 style="margin:4px 0">Audit log</h1><p class="muted">Review important authentication and workspace changes.</p></div><input class="search" id="audit-search" placeholder="Search activity..."></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Action</th><th>Details</th><th>Time</th></tr></thead><tbody id="audit-rows"></tbody></table></div>`;
  const rows = document.querySelector("#audit-rows");
  function render(filter = "") { const visible = logs.filter((item) => `${item.action} ${item.details}`.toLowerCase().includes(filter.toLowerCase())); rows.innerHTML = visible.map((item) => `<tr><td><strong>${esc(item.action)}</strong></td><td>${esc(item.details)}</td><td>${new Date(item.createdAt).toLocaleString()}</td></tr>`).join("") || '<tr><td colspan="3" class="empty">No matching activity found.</td></tr>'; }
  render(); document.querySelector("#audit-search").oninput = (event) => render(event.target.value);
}
