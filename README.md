# Database Studio

A browser-based database management website built with HTML, CSS, vanilla ES modules, and a Node.js API. Users manage databases through visual controls instead of needing to write SQL.

The current server provides shared online persistence, server-side sessions, administrator setup, password hashing, databases, tables, rows, relationships, audit records, and the existing visual workspace. Data is stored in SQLite at `data/studio-data.sqlite`, with automatic one-time migration from the older `data/studio-data.json` format.

## Run

Install Node.js 22.5 or newer, then run:

```text
npm install
npm start
```

Open `http://localhost:8000`. Do not open `index.html` directly because the website now communicates with its API.

## Included

- First-use administrator setup, Web Crypto password hashing, local sessions, logout, and audit events
- Persistent SQLite-backed databases, tables, records, and audit events
- Database and table creation, row insertion/deletion, and record search
- Basic SQL-like query console and visual query builder
- JSON backup and restore
- Responsive dark administration UI with offline status indicator

## Current scope

The next production phase is to replace the local SQLite adapter with PostgreSQL for multi-instance hosting, enforce server-side role permissions on every operation, and move query execution to parameterized server-side SQL. Individual API request bodies remain limited to 5 MB; this affects a single write or import request, not the total number of rows in a table.
