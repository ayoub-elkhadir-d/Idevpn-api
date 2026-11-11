import assert from "node:assert/strict";
import test, { mock } from "node:test";
import type { Request, Response } from "express";
import type { RowDataPacket } from "mysql2/promise";

process.env.DB_HOST ??= "127.0.0.1";
process.env.DB_USER ??= "uta_test";
process.env.DB_PASSWORD ??= "test-password";
process.env.DB_NAME ??= "uta_test";
process.env.CONFIG_ENCRYPTION_KEY ??= Buffer.alloc(32, 1).toString("base64");

const [{ requireAdmin }, { pool }] = await Promise.all([
  import("./middleware.js"),
  import("../db/pool.js")
]);

test("admin middleware rejects requests without an authenticated session", async () => {
  const request = { cookies: {} } as unknown as Request;
  let statusCode = 0;
  const response = {
    status(code: number) { statusCode = code; return this; },
    json() { return this; }
  } as unknown as Response;
  let calledNext = false;
  await requireAdmin(request, response, () => { calledNext = true; });
  assert.equal(statusCode, 401);
  assert.equal(calledNext, false);
});

test("admin middleware attaches only an authenticated identity", async (context) => {
  const query = context.mock.method(pool, "execute", async () => [[
    { id: "00000000-0000-4000-8000-000000000001", email: "admin@example.test" } as RowDataPacket
  ], []] as never);
  const request = { cookies: { uta_admin_session: "opaque-token" } } as unknown as Request & { admin?: { id: string; email: string } };
  const response = {} as Response;
  let calledNext = false;
  await requireAdmin(request, response, () => { calledNext = true; });
  assert.equal(calledNext, true);
  assert.deepEqual(request.admin, { id: "00000000-0000-4000-8000-000000000001", email: "admin@example.test" });
  query.mock.restore();
});
