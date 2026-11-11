import assert from "node:assert/strict";
import test from "node:test";

process.env.DB_HOST ??= "127.0.0.1";
process.env.DB_USER ??= "uta_test";
process.env.DB_PASSWORD ??= "test-password";
process.env.DB_NAME ??= "uta_test";
process.env.FRONTEND_ORIGIN ??= "http://localhost:5173";
process.env.CONFIG_ENCRYPTION_KEY ??= Buffer.alloc(32, 2).toString("base64");

const { decryptConfiguration, encryptConfiguration } = await import("./secrets.js");

test("encrypts configuration values without storing plaintext and round-trips", () => {
  const credentials = { uuid: "5a19b5e8-b672-48b3-82ee-144f1e88da92", password: "example-secret-value" };
  const encrypted = encryptConfiguration(credentials);
  assert.equal(JSON.stringify(encrypted).includes(credentials.password), false);
  assert.deepEqual(decryptConfiguration(encrypted), credentials);
});

test("rejects tampered encrypted configuration payloads", () => {
  const encrypted = encryptConfiguration({ password: "secret" });
  encrypted.data = `${encrypted.data.slice(0, -4)}AAAA`;
  assert.throws(() => decryptConfiguration(encrypted));
});
