import { apiRequest } from "./storage.js";

export async function hasUsers() { return (await apiRequest("/auth/status")).hasUsers; }

export async function createUser({ username, password, role = "ADMIN" }) {
  const result = await apiRequest("/auth/register", { method: "POST", body: JSON.stringify({ username, password, role }) });
  return result.user;
}

export async function login(username, password) {
  const result = await apiRequest("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
  return result.user;
}

export async function currentUser() {
  return (await apiRequest("/auth/status")).user;
}

export async function logout() {
  await apiRequest("/auth/logout", { method: "POST" });
}