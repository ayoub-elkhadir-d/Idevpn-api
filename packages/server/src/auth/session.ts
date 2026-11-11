import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import type { RowDataPacket } from "mysql2/promise";
import { env } from "../config/env.js";
import { execute, select } from "../db/pool.js";

export const sessionCookieName = "uta_admin_session";
const sessionDurationMs = 1000 * 60 * 60 * 12;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(adminUserId: string, response: Response): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const sessionId = randomUUID();
  const expiresAt = new Date(Date.now() + sessionDurationMs);
  await execute("DELETE FROM admin_sessions WHERE expires_at <= CURRENT_TIMESTAMP(3)");
  await execute(
    "INSERT INTO admin_sessions (id, admin_user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)",
    [sessionId, adminUserId, hashToken(token), expiresAt]
  );
  response.cookie(sessionCookieName, token, {
    httpOnly: true,
    secure: env.SESSION_COOKIE_SECURE,
    sameSite: "strict",
    path: "/",
    expires: expiresAt
  });
}

export async function getSession(token: string | undefined) {
  if (!token) return null;
  const rows = await select<RowDataPacket & { id: string; email: string }>(
    `SELECT users.id, users.email
     FROM admin_sessions sessions
     JOIN admin_users users ON users.id = sessions.admin_user_id
     WHERE sessions.token_hash = ? AND sessions.expires_at > CURRENT_TIMESTAMP(3)`,
    [hashToken(token)]
  );
  return rows[0] ?? null;
}

export async function destroySession(token: string | undefined, response: Response): Promise<void> {
  if (token) {
    await execute("DELETE FROM admin_sessions WHERE token_hash = ?", [hashToken(token)]);
  }
  response.clearCookie(sessionCookieName, {
    httpOnly: true,
    secure: env.SESSION_COOKIE_SECURE,
    sameSite: "strict",
    path: "/"
  });
}

export function getSessionToken(request: Request): string | undefined {
  return request.cookies?.[sessionCookieName];
}
