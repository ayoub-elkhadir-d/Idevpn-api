import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { RowDataPacket } from "mysql2/promise";
import { requireAdmin, type AuthenticatedRequest } from "../auth/middleware.js";
import { createSession, destroySession, getSessionToken } from "../auth/session.js";
import { select } from "../db/pool.js";

export const authRouter = Router();
const dummyPasswordHash = bcrypt.hash("unavailable-account", 12);

const loginSchema = z.object({
  email: z.string().email().max(254).transform((email) => email.toLowerCase()),
  password: z.string().min(1).max(72).refine((password) => Buffer.byteLength(password, "utf8") <= 72)
});

authRouter.post("/login", async (request, response, next) => {
  try {
    const input = loginSchema.safeParse(request.body);
    if (!input.success) {
      response.status(400).json({ error: "Enter a valid email and password." });
      return;
    }
    const fallbackHash = await dummyPasswordHash;
    const admins = await select<RowDataPacket & { id: string; email: string; password_hash: string }>(
      "SELECT id, email, password_hash FROM admin_users WHERE email = ?",
      [input.data.email]
    );
    const admin = admins[0];
    const storedHash = admin?.password_hash ?? fallbackHash;
    const passwordMatches = await bcrypt.compare(input.data.password, storedHash);
    if (!admin || !passwordMatches) {
      response.status(401).json({ error: "Email or password is incorrect." });
      return;
    }
    await createSession(admin.id, response);
    response.json({ admin: { id: admin.id, email: admin.email } });
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me", requireAdmin, (request, response) => {
  const { id, email } = (request as AuthenticatedRequest).admin;
  response.json({ admin: { id, email } });
});

authRouter.post("/logout", async (request, response, next) => {
  try {
    await destroySession(getSessionToken(request), response);
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});
