import { createPool, type ResultSetHeader, type RowDataPacket } from "mysql2/promise";
import { env } from "../config/env.js";

export type SqlValue = string | number | boolean | Date | Buffer | null;

export const pool = createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 5_000,
  timezone: "Z",
  charset: "utf8mb4"
});

pool.pool.on("connection", (connection) => {
  connection.query("SET time_zone = '+00:00'", (error) => {
    if (error) {
      console.error("Could not set MySQL connection timezone", { name: error.name, code: error.code });
    }
  });
});

export async function select<T extends RowDataPacket>(
  sql: string,
  values: SqlValue[] = []
): Promise<T[]> {
  const [rows] = await pool.execute<T[]>(sql, values);
  return rows;
}

export async function execute(
  sql: string,
  values: SqlValue[] = []
): Promise<ResultSetHeader> {
  const [result] = await pool.execute<ResultSetHeader>(sql, values);
  return result;
}
