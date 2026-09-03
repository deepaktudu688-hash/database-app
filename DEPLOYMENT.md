# Deployment

Database Studio is now a Node.js website and API. The browser UI and API are served by the same process.

## Local preview

Run `npm install` followed by `npm start`, then open `http://localhost:8000`.

## Hosting

Deploy the Node process to a service such as Render, Railway, Fly.io, or an IBM Cloud application runtime. Set `PORT` from the platform environment and use persistent storage for the `data` directory. The SQLite database is stored at `data/studio-data.sqlite`.

GitHub Pages and other static-only hosts cannot run this version because they do not provide the API process.

## IBM Cloud Static hosting

For production, replace the local SQLite adapter with PostgreSQL and configure a managed persistent database. SQLite supports substantially larger datasets than the previous whole-file JSON adapter, but this single-process deployment is still not intended for multiple application instances or high write concurrency.

## Production security roadmap

The website now has server sessions, but production identity and authorization still require:

- Secure deployment secrets and HTTPS
- Server-side authorization checks on every data mutation
- PostgreSQL migrations and backups
- Optional hosted OAuth callback service

Never commit the `data` directory or production secrets.
