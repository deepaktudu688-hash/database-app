const permissions = {
  ADMIN: new Set(["overview", "tables", "schema", "data", "query", "builder", "relations", "views", "indexes", "transactions", "reports", "importExport", "demo", "security", "settings", "audit", "backup", "users"]),
  EDITOR: new Set(["overview", "tables", "data", "query", "builder", "relations", "views", "transactions", "reports", "importExport", "security", "settings", "audit"]),
  VIEWER: new Set(["overview", "tables", "data", "builder", "relations", "views", "reports", "security", "settings"]),
};

export function can(role, page) {
  return permissions[role]?.has(page) || false;
}

export function allowedPages(role) {
  return permissions[role] || permissions.VIEWER;
}
