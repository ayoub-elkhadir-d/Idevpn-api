import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { z } from "zod";

config({ path: fileURLToPath(new URL("../../../../.env", import.meta.url)) });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().min(1).max(65535).default(3306),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string(),
  DB_NAME: z.string().min(1),
  FRONTEND_ORIGIN: z.string().url().refine((value) => {
    try {
      const url = new URL(value);
      return ["http:", "https:"].includes(url.protocol)
        && !url.username && !url.password
        && url.origin === value;
    } catch {
      return false;
    }
  }, "FRONTEND_ORIGIN must be an HTTP(S) origin without a path or trailing slash."),
  CONFIG_ENCRYPTION_KEY: z.string().regex(/^[A-Za-z0-9+/]{43}=$/).refine(
    (value) => Buffer.from(value, "base64").length === 32,
    "CONFIG_ENCRYPTION_KEY must be a base64-encoded 32-byte key"
  ),
  SESSION_COOKIE_SECURE: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  TRUST_PROXY: z.enum(["true", "false"]).default("false").transform((value) => value === "true")
}).superRefine((value, context) => {
  if (value.NODE_ENV === "production") {
    if (!value.DB_PASSWORD) {
      context.addIssue({
        code: "custom",
        path: ["DB_PASSWORD"],
        message: "DB_PASSWORD must be set in production."
      });
    }
    if (!value.SESSION_COOKIE_SECURE) {
      context.addIssue({
        code: "custom",
        path: ["SESSION_COOKIE_SECURE"],
        message: "SESSION_COOKIE_SECURE must be true in production."
      });
    }
    if (!value.FRONTEND_ORIGIN.startsWith("https://")) {
      context.addIssue({
        code: "custom",
        path: ["FRONTEND_ORIGIN"],
        message: "FRONTEND_ORIGIN must use HTTPS in production."
      });
    }
  }
});

export const env = envSchema.parse(process.env);
