import type { NextFunction, Request, Response } from "express";
import { getSession, getSessionToken } from "./session.js";

export type AdminIdentity = { id: string; email: string };
export type AuthenticatedRequest = Request & { admin: AdminIdentity };

export async function requireAdmin(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const admin = await getSession(getSessionToken(request));
    if (!admin) {
      response.status(401).json({ error: "Authentication required." });
      return;
    }
    (request as AuthenticatedRequest).admin = admin;
    next();
  } catch (error) {
    next(error);
  }
}
