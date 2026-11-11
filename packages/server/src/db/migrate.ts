import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./pool.js";

const migrationsDirectory = resolve(fileURLToPath(new URL(".", import.meta.url)), "../../migrations");

async function migrate(): Promise<void> {
  try {
    const connection = await pool.getConnection();
    try {
      await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name VARCHAR(255) PRIMARY KEY,
        applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      const files = (await readdir(migrationsDirectory)).filter((file) => file.endsWith(".sql")).sort();
      for (const file of files) {
        const [alreadyApplied] = await connection.execute(
          "SELECT 1 FROM schema_migrations WHERE name = ?",
          [file]
        );
        if (Array.isArray(alreadyApplied) && alreadyApplied.length) continue;

        const sql = await readFile(resolve(migrationsDirectory, file), "utf8");
        for (const statement of sql.split(";").map((item) => item.trim()).filter(Boolean)) {
          await connection.query(statement);
        }
        await connection.execute("INSERT INTO schema_migrations (name) VALUES (?)", [file]);
        console.info(`Applied migration ${file}`);
      }
    } finally {
      connection.release();
    }
  } finally {
    await pool.end();
  }
}

migrate().catch((error: unknown) => {
  console.error("Database migration failed", error);
  process.exitCode = 1;
});
