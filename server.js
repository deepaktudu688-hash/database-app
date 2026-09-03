import crypto from "node:crypto";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 8000);
const dataDir = path.join(root, "data");
const dataFile = path.join(dataDir, "studio-data.json");
const databaseFile = path.join(dataDir, "studio-data.sqlite");
fs.mkdirSync(dataDir, { recursive: true });
const database = new DatabaseSync(databaseFile);
database.exec("CREATE TABLE IF NOT EXISTS records (store TEXT NOT NULL, id TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY (store, id)); CREATE INDEX IF NOT EXISTS records_store_idx ON records (store); CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, userId TEXT NOT NULL, expiresAt TEXT NOT NULL)");
if (!fs.existsSync(databaseFile + ".migrated") && fs.existsSync(dataFile)) {
  const legacy = JSON.parse(fs.readFileSync(dataFile, "utf8"));
  const insertRecord = database.prepare("INSERT OR REPLACE INTO records (store, id, value) VALUES (?, ?, ?)");
  database.exec("BEGIN");
  try {
    for (const [store, values] of Object.entries(legacy.records || {})) for (const value of Object.values(values)) insertRecord.run(store, value.id, JSON.stringify(value));
    for (const [token, session] of Object.entries(legacy.sessions || {})) database.prepare("INSERT OR REPLACE INTO sessions (token, userId, expiresAt) VALUES (?, ?, ?)").run(token, session.userId, session.expiresAt);
    database.exec("COMMIT");
    fs.writeFileSync(dataFile + ".migrated", new Date().toISOString());
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}
const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const records = (store) => database.prepare("SELECT value FROM records WHERE store = ?").all(store).map((record) => JSON.parse(record.value));
function put(store, value) { database.prepare("INSERT OR REPLACE INTO records (store, id, value) VALUES (?, ?, ?)").run(store, value.id, JSON.stringify(value)); return value; }
function remove(store, recordId) { database.prepare("DELETE FROM records WHERE store = ? AND id = ?").run(store, recordId); }
function readCookies(request) { return Object.fromEntries((request.headers.cookie || "").split(";").filter(Boolean).map((item) => item.trim().split("="))); }
function cookie(value, maxAge = 604800) { return `studio_session=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}`; }
function json(response, status, value) { response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }); response.end(JSON.stringify(value)); }
function readBody(request) { return new Promise((resolve, reject) => { let raw = ""; request.on("data", (chunk) => { raw += chunk; if (raw.length > 5_000_000) reject(new Error("Request is too large.")); }); request.on("end", () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error("Invalid JSON.")); } }); request.on("error", reject); }); }
function currentUser(request) { const token = readCookies(request).studio_session, session = token && database.prepare("SELECT userId, expiresAt FROM sessions WHERE token = ?").get(token); if (!session || new Date(session.expiresAt) < new Date()) return null; return records("users").find((user) => user.id === session.userId) || null; }
function publicUser(user) { if (!user) return null; const { passwordHash, ...safe } = user; return safe; }
function passwordHash(password, salt = crypto.randomBytes(16).toString("hex")) { return new Promise((resolve, reject) => crypto.scrypt(String(password), salt, 64, (error, derived) => error ? reject(error) : resolve(`${salt}:${derived.toString("hex")}`))); }
async function passwordMatches(password, stored) { const [salt, expected] = String(stored || "").split(":"); if (!salt || !expected) return false; const actual = (await passwordHash(password, salt)).split(":")[1]; return crypto.timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex")); }
function startSession(response, user) { const token = id(), expiresAt = new Date(Date.now() + 604800000).toISOString(); database.prepare("INSERT INTO sessions (token, userId, expiresAt) VALUES (?, ?, ?)").run(token, user.id, expiresAt); response.setHeader("Set-Cookie", cookie(token)); }
async function api(request, response, url) {
  if (url.pathname === "/api/auth/status" && request.method === "GET") return json(response, 200, { hasUsers: records("users").length > 0, user: publicUser(currentUser(request)) });
  if (url.pathname === "/api/auth/register" && request.method === "POST") { const input = await readBody(request), username = String(input.username || "").trim(), hasExistingUsers = records("users").length > 0; if (!/^[a-zA-Z0-9._-]{3,32}$/.test(username)) return json(response, 400, { error: "Username must be 3-32 letters, numbers, dots, underscores, or hyphens." }); if (records("users").some((user) => user.username.toLowerCase() === username.toLowerCase())) return json(response, 409, { error: "That username is already in use." }); if (String(input.password || "").length < 8) return json(response, 400, { error: "Password must be at least 8 characters." }); const user = { id: id(), username, role: hasExistingUsers ? "VIEWER" : "ADMIN", status: "ACTIVE", passwordHash: await passwordHash(input.password), createdAt: now() }; put("users", user); startSession(response, user); return json(response, 201, { user: publicUser(user) }); }
  if (url.pathname === "/api/auth/login" && request.method === "POST") { const input = await readBody(request), user = records("users").find((candidate) => candidate.username.toLowerCase() === String(input.username || "").trim().toLowerCase()); if (!user || user.status !== "ACTIVE" || !(await passwordMatches(input.password, user.passwordHash))) return json(response, 401, { error: "Incorrect username or password." }); startSession(response, user); return json(response, 200, { user: publicUser(user) }); }
  if (url.pathname === "/api/auth/logout" && request.method === "POST") { const token = readCookies(request).studio_session; if (token) database.prepare("DELETE FROM sessions WHERE token = ?").run(token); response.setHeader("Set-Cookie", cookie("", 0)); return json(response, 200, { ok: true }); }
  const user = currentUser(request); if (!user) return json(response, 401, { error: "Sign in required." });
  const match = url.pathname.match(/^\/api\/store\/([A-Za-z0-9_-]+)(?:\/([^/]+))?$/); if (!match) return json(response, 404, { error: "API route not found." }); const [, store, recordId] = match;
  if (request.method === "GET") { const value = recordId ? records(store).find((record) => record.id === recordId) : records(store); return json(response, recordId && !value ? 404 : 200, value || { error: "Record not found." }); }
  if (request.method === "PUT" || request.method === "POST") { const value = await readBody(request); if (!value.id) return json(response, 400, { error: "Record id is required." }); put(store, value); return json(response, 200, value); }
  if (request.method === "DELETE" && recordId) { remove(store, recordId); return json(response, 200, { ok: true }); }
  return json(response, 405, { error: "Method not allowed." });
}
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json" };
http.createServer(async (request, response) => { try { const url = new URL(request.url, `http://${request.headers.host || "localhost"}`); if (url.pathname.startsWith("/api/")) return await api(request, response, url); const requested = url.pathname === "/" ? "/index.html" : url.pathname; const file = path.resolve(root, `.${requested}`); if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return json(response, 404, { error: "Page not found." }); response.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" }); fs.createReadStream(file).pipe(response); } catch (error) { json(response, 500, { error: error.message }); } }).listen(port, () => console.log(`Database Studio running at http://localhost:${port}`));
