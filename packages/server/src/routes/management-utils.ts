import type { Request, RequestHandler, Response } from "express";
import { z } from "zod";

export class HttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "HttpError";
  }
}

export function asyncRoute(
  callback: (request: Request, response: Response) => Promise<void>
): RequestHandler {
  return (request, response, next) => {
    callback(request, response).catch(next);
  };
}

export function sendValidationError(response: Response, error: z.ZodError): void {
  response.status(400).json({
    error: "Validation failed.",
    details: error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message
    }))
  });
}

export const uuidSchema = z.uuid();

export function parseUuid(value: unknown, response: Response): string | null {
  const parsed = uuidSchema.safeParse(value);
  if (!parsed.success) {
    response.status(400).json({ error: "Invalid resource ID." });
    return null;
  }
  return parsed.data;
}

export function isForeignKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error
    && (error.code === "ER_NO_REFERENCED_ROW_2" || error.code === "ER_ROW_IS_REFERENCED_2");
}

export function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ER_DUP_ENTRY";
}
