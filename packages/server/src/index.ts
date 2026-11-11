import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { env } from "./config/env.js";
import { pool } from "./db/pool.js";
import { authRouter } from "./routes/auth.js";
import { adminRouter } from "./routes/admin.js";
import { configurationsRouter } from "./routes/configurations.js";
import { HttpError } from "./routes/management-utils.js";
import { requireAdmin } from "./auth/middleware.js";

const app = express();
if (env.TRUST_PROXY) app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(helmet());
app.use((request, response, next) => {
  const origin = request.get("Origin");
  if (origin && origin !== env.FRONTEND_ORIGIN) {
    response.status(403).json({ error: "Origin is not allowed." });
    return;
  }
  if (origin) {
    response.vary("Origin");
    response.setHeader("Access-Control-Allow-Origin", env.FRONTEND_ORIGIN);
    response.setHeader("Access-Control-Allow-Credentials", "true");
  }
  if (request.method === "OPTIONS" && origin) {
    response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type");
    response.setHeader("Access-Control-Max-Age", "600");
    response.status(204).end();
    return;
  }
  next();
});
app.use(express.json({ limit: "16kb" }));
app.use(cookieParser());

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many sign-in attempts. Try again in 15 minutes." }
});

app.get("/api/health", async (_request, response, next) => {
  try {
    await pool.execute("SELECT 1");
    response.json({ status: "ok", database: "connected" });
  } catch (error) {
    next(error);
  }
});

app.use("/api/auth/login", loginLimiter);
app.use("/api/auth", authRouter);
app.use("/api/admin/configurations", requireAdmin, configurationsRouter);
app.use("/api/admin", adminRouter);

app.use((_request, response) => {
  response.status(404).json({ error: "Not found." });
});

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  if (error instanceof HttpError) {
    response.status(error.status).json({ error: error.message });
    return;
  }
  if (typeof error === "object" && error !== null && "type" in error && error.type === "entity.parse.failed") {
    response.status(400).json({ error: "Malformed JSON request." });
    return;
  }
  if (typeof error === "object" && error !== null && "type" in error && error.type === "entity.too.large") {
    response.status(413).json({ error: "Request body is too large." });
    return;
  }
  if (typeof error === "object" && error !== null && "code" in error
    && (error.code === "ER_NO_REFERENCED_ROW_2" || error.code === "ER_ROW_IS_REFERENCED_2")) {
    response.status(409).json({ error: "This resource is still associated with other records." });
    return;
  }
  if (typeof error === "object" && error !== null && "code" in error && error.code === "ER_DUP_ENTRY") {
    response.status(409).json({ error: "A resource with these details already exists." });
    return;
  }
  const errorName = error instanceof Error ? error.name : "UnknownError";
  const errorCode = typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
    ? error.code : undefined;
  console.error("Unhandled API error", { name: errorName, code: errorCode });
  response.status(500).json({ error: "An unexpected server error occurred." });
});

const server = app.listen(env.PORT, () => {
  console.info(`Ultimate Tunnel Admin API listening on port ${env.PORT}`);
});

async function shutdown(): Promise<void> {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
