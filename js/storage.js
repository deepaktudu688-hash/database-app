async function request(path, options = {}) {
  const response = await fetch(`/api${path}`, { credentials: "same-origin", headers: { "Content-Type": "application/json", ...(options.headers || {}) }, ...options });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "The server request failed.");
  return result;
}

export function apiRequest(path, options) { return request(path, options); }
export function all(store) { return request(`/store/${encodeURIComponent(store)}`); }
export function get(store, id) { return request(`/store/${encodeURIComponent(store)}/${encodeURIComponent(id)}`); }
export function put(store, value) { return request(`/store/${encodeURIComponent(store)}/${encodeURIComponent(value.id)}`, { method: "PUT", body: JSON.stringify(value) }); }
export function remove(store, id) { return request(`/store/${encodeURIComponent(store)}/${encodeURIComponent(id)}`, { method: "DELETE" }); }
export async function clear(store) { const values = await all(store); await Promise.all(values.map((value) => remove(store, value.id))); }
export function log(action, details) { return put("audit", { id: crypto.randomUUID(), action, details, createdAt: new Date().toISOString() }); }
