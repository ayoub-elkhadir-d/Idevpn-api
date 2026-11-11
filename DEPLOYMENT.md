# Namecheap cPanel deployment

## Requirements

- Namecheap hosting with **Setup Node.js App** enabled and a Node.js 20+ runtime.
- MySQL 8.0.16+ database and user created in cPanel.
- A frontend origin and API subdomain under the same registrable domain, both served over HTTPS. For example, `https://admin.example.com` and `https://api.example.com`.

The shared-hosting plan must support a persistent Node.js application, outbound/local MySQL connections, and the dependencies in this repository. Confirm those capabilities with the host if they are not available in cPanel.

## Build and upload

1. In cPanel, create the MySQL database and user, grant the user access to the database, and note the exact cPanel-prefixed database and username plus the database host.
2. Set `VITE_API_BASE_URL` to the HTTPS API origin (for example `https://api.example.com`) in the build environment. Production builds fail when it is missing or invalid. This is a public frontend setting, not a secret. Do not add a trailing path such as `/api`.
3. From the repository root, install all workspace dependencies and build both applications:

   ```sh
   npm ci
   npm run build
   ```

4. Upload the repository, including the root `node_modules`, `app.cjs`, and both generated directories (`packages/server/dist` and `packages/web/dist`). Do not upload `.env` to source control or expose it in the frontend build.
5. In cPanel **Setup Node.js App**, choose Node.js 20 or newer, set the application root to the repository root, and set the startup file to `app.cjs`. Use production mode.
6. Configure the environment variables below in cPanel, save, and restart the application.
7. Configure the frontend web root to serve `packages/web/dist` at the frontend domain. Configure the API subdomain to route requests to the Node.js application using cPanel's application URL / reverse-proxy integration. Keep API paths (including `/api`) unchanged.
8. Apply schema migrations once from the repository root against the production MySQL database, using the same environment variables:

   ```sh
   npm run db:migrate
   ```

9. Create the initial admin account in an interactive shell with the production environment:

   ```sh
   npm run admin:create
   ```

   Do not run first-admin creation as a public web route.

## cPanel environment variables

| Variable | Production value |
| --- | --- |
| `NODE_ENV` | `production` |
| `PORT` | Leave to the hosting platform; the app listens on this value. |
| `DB_HOST` | MySQL host shown in cPanel. |
| `DB_PORT` | MySQL port, usually `3306`. |
| `DB_USER` | Exact cPanel database username. |
| `DB_PASSWORD` | Database password, set only in cPanel. |
| `DB_NAME` | Exact cPanel database name. |
| `FRONTEND_ORIGIN` | Exact HTTPS origin only, e.g. `https://admin.example.com`; no path or trailing slash. |
| `SESSION_COOKIE_SECURE` | `true` (required in production). |
| `TRUST_PROXY` | `true` only if cPanel's trusted proxy is required for client IP / protocol handling; otherwise `false`. |
| `CONFIG_ENCRYPTION_KEY` | A private base64-encoded 32-byte key. Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` and keep a secure backup. |
| `VITE_API_BASE_URL` | `https://api.example.com`, supplied at build time; it is compiled into frontend assets and is not a secret. |

Never commit `.env`, database credentials, encryption keys, or other deployment secrets. The repository ignores `.env` files; use cPanel's environment settings for runtime secrets.

## HTTPS, CORS, and session cookies

The API allows browser origins only when they exactly match `FRONTEND_ORIGIN`; credentialed requests are enabled for that origin only. The frontend API client uses `credentials: "include"` so login can set the admin session cookie and later calls can send it. CORS does not authenticate requests; protected API routes continue to enforce the existing server-side session.

The session cookie remains `HttpOnly` and `SameSite=Strict`, and production validation requires `SESSION_COOKIE_SECURE=true` and an HTTPS `FRONTEND_ORIGIN`. Separate frontend/API subdomains such as `admin.example.com` and `api.example.com` are cross-origin but same-site when both use HTTPS under the same registrable domain. This permits the strict cookie policy while CORS controls which browser origin may read credentialed responses.

Do not use unrelated registrable domains for frontend and API with this cookie configuration: `SameSite=Strict` will not send the session cookie in that cross-site setup. Use same-site subdomains and HTTPS for both. Make sure Namecheap's proxy preserves the request host and forwards HTTPS correctly.

## Startup and verification

- cPanel starts the root `app.cjs`, which dynamically imports `packages/server/dist/index.js`.
- The package `npm start` command starts the same compiled API.
- The Express listener uses the validated `PORT` environment variable supplied by cPanel.
- Check `https://api.example.com/api/health` after restart; it should report both API and database connectivity.
- Confirm login, `/api/auth/me`, and logout from the deployed frontend in a browser. Check the browser network panel for the exact CORS origin, credentialed requests, and a `Secure; HttpOnly; SameSite=Strict` session cookie.
- Rebuild the frontend whenever `VITE_API_BASE_URL` changes. It is not read from cPanel at browser runtime.
- Run `npm run build` before upload and verify both `packages/server/dist` and `packages/web/dist` exist. `npm start` requires the compiled server output; build first.

This deployment guide does not transfer existing PostgreSQL data. If moving existing data, create and validate a separate backup/export/import plan before switching production traffic.
