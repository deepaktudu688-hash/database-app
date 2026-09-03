const SETTINGS_KEY = "offline-database-studio-settings";

function readSettings() {
  try { return { theme: "dark", density: "comfortable", ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}")} } catch { return { theme: "dark", density: "comfortable" }; }
}

function saveSettings(settings) { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); document.documentElement.dataset.theme = settings.theme; document.documentElement.dataset.density = settings.density; }

export function applySettings() { const settings = readSettings(); document.documentElement.dataset.theme = settings.theme; document.documentElement.dataset.density = settings.density; }

export async function renderSettings(el) {
  const settings = readSettings();
  el.innerHTML = `<div class="toolbar"><div><div class="muted">WORKSPACE PREFERENCES</div><h1 style="margin:4px 0">Settings</h1><p class="muted">These preferences stay on this browser and do not leave your device.</p></div></div><div class="card settings-card"><div class="setting-row"><div><strong>Appearance</strong><p class="muted">Choose a comfortable workspace theme.</p></div><select id="theme-setting"><option value="dark" ${settings.theme === "dark" ? "selected" : ""}>Dark mode</option><option value="light" ${settings.theme === "light" ? "selected" : ""}>Light mode</option></select></div><div class="setting-row"><div><strong>Table density</strong><p class="muted">Adjust the amount of data visible in tables.</p></div><select id="density-setting"><option value="comfortable" ${settings.density === "comfortable" ? "selected" : ""}>Comfortable</option><option value="compact" ${settings.density === "compact" ? "selected" : ""}>Compact</option></select></div><div class="notice">Settings are stored locally using LocalStorage. Database content remains in IndexedDB.</div></div>`;
  const update = () => { saveSettings({ theme: document.querySelector("#theme-setting").value, density: document.querySelector("#density-setting").value }); };
  document.querySelector("#theme-setting").onchange = update;
  document.querySelector("#density-setting").onchange = update;
}
