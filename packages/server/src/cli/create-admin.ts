import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { execute, pool } from "../db/pool.js";

async function readHiddenPassword(): Promise<string> {
  if (!stdin.isTTY) throw new Error("Run this command in an interactive terminal to enter the admin password securely.");

  stdout.write("Password (minimum 12 characters): ");
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding("utf8");

  return new Promise((resolve, reject) => {
    let password = "";
    const cleanup = () => {
      stdin.removeListener("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write("\n");
    };
    const onData = (key: string) => {
      if (key === "\u0003") {
        cleanup();
        reject(new Error("Admin creation cancelled."));
      } else if (key === "\r" || key === "\n") {
        cleanup();
        resolve(password);
      } else if (key === "\u007f" || key === "\b") {
        password = password.slice(0, -1);
      } else {
        password += key;
      }
    };
    stdin.on("data", onData);
  });
}

async function main(): Promise<void> {
  const prompt = createInterface({ input: stdin, output: stdout });
  try {
    const email = (await prompt.question("Admin email: ")).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
    prompt.close();
    const password = await readHiddenPassword();
    if (password.length < 12) throw new Error("Password must contain at least 12 characters.");
    if (Buffer.byteLength(password, "utf8") > 72) throw new Error("Password must not exceed 72 UTF-8 bytes.");

    const passwordHash = await bcrypt.hash(password, 12);
    await execute(
      "INSERT INTO admin_users (id, email, password_hash) VALUES (?, ?, ?)",
      [randomUUID(), email, passwordHash]
    );
    console.info(`Admin account created for ${email}.`);
  } finally {
    prompt.close();
    await pool.end();
  }
}

main().catch((error: unknown) => {
  if (typeof error === "object" && error !== null && "code" in error && error.code === "ER_DUP_ENTRY") {
    console.error("An admin account with that email already exists.");
  } else {
    console.error("Could not create admin account", error);
  }
  process.exitCode = 1;
});
