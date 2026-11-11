import { cp, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const cpanelRoot = resolve(root, "deploy", "cpanel");

await mkdir(resolve(cpanelRoot, "server"), { recursive: true });
await mkdir(resolve(cpanelRoot, "public"), { recursive: true });
await Promise.all([
  cp(resolve(root, "packages", "server", "src"), resolve(cpanelRoot, "server", "src"), { recursive: true }),
  cp(resolve(root, "packages", "server", "migrations"), resolve(cpanelRoot, "server", "migrations"), { recursive: true }),
  cp(resolve(root, "packages", "server", "tsconfig.json"), resolve(cpanelRoot, "server", "tsconfig.json")),
  cp(resolve(root, "packages", "web", "dist"), resolve(cpanelRoot, "public"), { recursive: true })
]);
await writeFile(
  resolve(cpanelRoot, "public", ".htaccess"),
  "RewriteEngine On\nRewriteBase /\nRewriteRule ^index\\.html$ - [L]\nRewriteCond %{REQUEST_FILENAME} !-f\nRewriteCond %{REQUEST_FILENAME} !-d\nRewriteRule . /index.html [L]\n"
);

console.info("Staged standalone cPanel app source, MySQL migrations, and frontend assets.");
