import { all } from "./storage.js";
import { createUser, currentUser, logout } from "./auth.js";

export async function renderUsers(el, { esc, modal, toast }) {
  const current = await currentUser();
  if (current?.role !== "ADMIN") {
    el.innerHTML = '<div class="card"><h3>Administrator access required</h3><p class="muted">Only the workspace administrator can manage users and roles.</p></div>';
    return;
  }
  const users = await all("users");
  el.innerHTML = `<div class="toolbar"><div><div class="muted">ACCESS CONTROL</div><h1 style="margin:4px 0">Users & permissions</h1><p class="muted">Control who can manage, edit, or view this workspace.</p></div><div class="actions"><button class="btn primary" id="new-user">＋ Create user</button><button class="btn danger" id="users-logout">Log out</button></div></div><div class="card"><table class="data-table"><thead><tr><th>Username</th><th>Role</th><th>Status</th><th>Created</th></tr></thead><tbody>${users.map((user) => `<tr><td><strong>${esc(user.username)}</strong></td><td><span class="badge role-${user.role.toLowerCase()}">${esc(user.role)}</span></td><td><span class="status-pill active"><span></span>${esc(user.status)}</span></td><td>${new Date(user.createdAt).toLocaleDateString()}</td></tr>`).join("")}</tbody></table></div>`;
  document.querySelector("#users-logout").onclick = async () => { await logout(); window.location.reload(); };
  document.querySelector("#new-user").onclick = () => modal("Create workspace user", `<div class="field"><label>USERNAME</label><input name="username" required autocomplete="off"></div><div class="field" style="margin-top:12px"><label>TEMPORARY PASSWORD</label><input name="password" required minlength="8" type="password"></div><div class="field" style="margin-top:12px"><label>ROLE</label><select name="role"><option>EDITOR</option><option>VIEWER</option><option>ADMIN</option></select></div>`, async (formData) => {
    await createUser({ username: formData.get("username"), password: formData.get("password"), role: formData.get("role") });
    toast("User created");
    renderUsers(el, { esc, modal, toast });
  });
}
