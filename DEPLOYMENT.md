# Namecheap cPanel / CloudLinux deployment

The local project remains an npm-workspaces monorepo. **Do not install from the repository root in CloudLinux Node.js Selector.** Its npm wrapper redirects the install prefix into the application virtual environment and cannot reliably install the monorepo workspaces.

`deploy/cpanel` is a separate, standalone Node.js application root. Its package manifest and lockfile list the backend runtime dependencies and TypeScript build dependencies directly, with no `workspaces` field. The backend source and migrations are staged into this directory by the local `npm run build:cpanel` command. The frontend is deployed as static files on its own domain.

## Requirements

- Namecheap shared hosting with CloudLinux **Setup Node.js App / Node.js Selector**, Node.js 22.
- MySQL 8.0.16+ database and user created in cPanel.
- An API subdomain and frontend origin under the same registrable domain, both served over HTTPS. Example: `api.example.com` and `admin.example.com`.

Confirm the hosting plan supports persistent Node applications and MySQL connections before switching production traffic.

## Build the upload bundle locally

Run these commands from the repository root on a development machine with Node.js 22 and npm:

```sh
npm ci
```

In PowerShell, set the API URL before building:

```powershell
$env:VITE_API_BASE_URL = "https://api.example.com"
npm run build:cpanel
```

In Bash:

```sh
VITE_API_BASE_URL=https://api.example.com npm run build:cpanel
```

The command runs the existing workspace production build and stages:

- Backend source and `tsconfig.json` under `deploy/cpanel/server/`
- MySQL migrations under `deploy/cpanel/server/migrations/`
- Frontend assets plus Apache SPA fallback `.htaccess` under `deploy/cpanel/public/`

The generated stage directories are intentionally gitignored. They must be transferred along with the tracked cPanel files. Do not upload `.env`, `node_modules`, or credentials.

## What to pull and upload

1. Pull the GitHub repository to `~/Idevpn-api` (or your chosen repository directory). Git provides the tracked app manifest and lockfile in `deploy/cpanel/`, the cPanel startup file, scripts, and application source.
2. Build the upload bundle locally using the commands above.
3. Use SFTP/File Manager to upload these generated paths from the local checkout into the matching repository paths on Namecheap:
   - `deploy/cpanel/server/src/`
   - `deploy/cpanel/server/tsconfig.json`
   - `deploy/cpanel/server/migrations/`
   - All contents of `deploy/cpanel/public/`, including `.htaccess`
4. Ensure the tracked files are also present on Namecheap:
   - `deploy/cpanel/package.json`
   - `deploy/cpanel/package-lock.json`
   - `deploy/cpanel/app.cjs`
   - `deploy/cpanel/.env.example`

Upload the generated bundle after each code update. Do not overwrite the live `deploy/cpanel/.env` or CloudLinux-managed `node_modules` symlink when uploading.

## Create the cPanel app

1. In cPanel, create a MySQL database and user, grant the user access, and note the exact cPanel-prefixed names and database host.
2. Create the Node.js app in **Setup Node.js App**:
   - Node.js version: `22`
   - Application root: `Idevpn-api/deploy/cpanel` (relative to your cPanel home directory)
   - Application URL: your API subdomain
   - Application startup file: `app.cjs`
   - Application mode: `Production`
3. Add the environment variables from the next section in the application configuration. Leave `PORT` to CloudLinux.
4. Run the Terminal commands below from the standalone application root.
5. In cPanel, click **Restart** after installing/building and whenever the app environment or compiled backend changes.

## Exact Terminal commands

After uploading the tracked files and generated bundle, run:

```sh
cd ~/Idevpn-api/deploy/cpanel
source ~/nodevenv/Idevpn-api/22/bin/activate
cp .env.example .env
nano .env
chmod 600 .env
npm install --include=dev --workspaces=false
npm run build
npm run db:migrate
npm run admin:create
```

Edit `.env` with the real production values before continuing. Use the exact MySQL host and cPanel-prefixed database/user from cPanel. Generate `CONFIG_ENCRYPTION_KEY` with:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Keep a secure backup of that key; without it encrypted configuration credentials cannot be recovered. The `.env` file is ignored by Git and must never be uploaded to a public document root.

The install and build commands run **inside `deploy/cpanel`** against its standalone `package.json` and `package-lock.json`; they do not invoke npm workspaces. `npm install` is used rather than `npm ci` because CloudLinux manages `node_modules` through the Node.js Selector virtual environment. `--include=dev` installs TypeScript, needed by the standalone `npm run build` script.

Run migrations once for a fresh database and create the initial admin once. On later deployments, upload the new staged bundle, then run `npm install --include=dev --workspaces=false`, `npm run build`, and restart the app. Do not repeatedly create the initial admin.

## Environment variables

Set these in the cPanel app configuration. A private `deploy/cpanel/.env` is also read by the CLI commands when run from that directory; process environment values supplied by cPanel take precedence.

| Variable | Production value |
| --- | --- |
| `NODE_ENV` | `production` |
| `PORT` | Do not set manually; CloudLinux supplies it. The Express listener validates and uses it. |
| `DB_HOST` | MySQL host shown in cPanel. |
| `DB_PORT` | MySQL port, usually `3306`. |
| `DB_USER` | Exact cPanel database username. |
| `DB_PASSWORD` | Database password. |
| `DB_NAME` | Exact cPanel database name. |
| `FRONTEND_ORIGIN` | Exact HTTPS frontend origin, e.g. `https://admin.example.com`, with no path or trailing slash. |
| `SESSION_COOKIE_SECURE` | `true` (required in production). |
| `TRUST_PROXY` | Set `true` only if the trusted cPanel proxy setup requires Express proxy handling; otherwise `false`. |
| `CONFIG_ENCRYPTION_KEY` | Private base64-encoded 32-byte key. |
| `VITE_API_BASE_URL` | Build-time only, e.g. `https://api.example.com`. It is compiled into public frontend files and is not a secret. |

Never commit `.env`, database credentials, encryption keys, or other deployment secrets. The root and cPanel `.env` files are ignored by Git.

## Frontend deployment

The cPanel Node app is API-only; it does not serve the React frontend. Upload the **contents** of `deploy/cpanel/public/` into the frontend domain's document root (for example `public_html`). The staged `.htaccess` provides an SPA fallback for React Router on Apache. Keep the frontend and API on HTTPS subdomains of the same registrable domain, such as `admin.example.com` and `api.example.com`.

The frontend API client uses the build-time `VITE_API_BASE_URL`; rebuild and re-upload the static assets if it changes. Vite's `/api` development proxy is unchanged and remains for local development.

## CORS, cookies, and startup

Express allows credentialed browser requests only from the exact configured `FRONTEND_ORIGIN`. The API does not use a wildcard origin. Admin session cookies remain `HttpOnly`, `Secure`, and `SameSite=Strict` in production.

The frontend and API are cross-origin but same-site when served over HTTPS on sibling subdomains of the same registrable domain. `SameSite=Strict` works for that deployment; unrelated frontend/API domains are cross-site and will not send this cookie.

CloudLinux starts `deploy/cpanel/app.cjs`, which dynamically imports the compiled `server/dist/index.js`. The standalone `npm start` script uses the same entry point. The package includes direct runtime dependencies (`express`, `mysql2`, auth/security libraries) and direct build dependencies (`typescript` and type packages); it needs no root workspace install or root `node_modules`.

After restarting, check `https://api.example.com/api/health` for API and MySQL connectivity. Then verify login, `/api/auth/me`, logout, and the session cookie from the HTTPS frontend in a browser.
