import { Router } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { RowDataPacket } from "mysql2/promise";
import { isAndroidProtocolVerified, protocolCapabilities } from "../config/android-compatibility.js";
import { decryptConfiguration, encryptConfiguration } from "../config/secrets.js";
import { parseProtocolData, protocolNamesList, type ConfigurationStatus, type Protocol } from "../config/protocols.js";
import { execute, pool, select, type SqlValue } from "../db/pool.js";
import {
  asyncRoute, HttpError, isForeignKeyError, parseUuid, sendValidationError
} from "./management-utils.js";

export const configurationsRouter = Router();

const commonFields = z.object({
  name: z.string().trim().min(2).max(120),
  logoUrl: z.string().trim().max(2048)
    .refine((value) => value === "" || (
      z.url().safeParse(value).success && /^https?:\/\//i.test(value)
    ), "Enter a valid HTTP or HTTPS logo URL.")
    .default(""),
  protocol: z.enum(protocolNamesList),
  description: z.string().trim().max(2000).default(""),
  status: z.enum(["draft", "published", "disabled"]).default("draft"),
  protocolData: z.unknown()
}).strict();

const listQuerySchema = z.object({
  search: z.string().trim().max(120).default(""),
  protocol: z.enum(protocolNamesList).optional(),
  country: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/).optional(),
  carrierId: z.uuid().optional(),
  status: z.enum(["draft", "published", "disabled"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10)
});

function rejectUnverifiedPublish(protocol: Protocol, status: ConfigurationStatus): void {
  if (status === "published" && !isAndroidProtocolVerified(protocol)) {
    throw new HttpError(409, "Publishing is disabled until this protocol is verified in the Android VPN engine. Save it as a draft instead.");
  }
}

async function parseInput(
  requestBody: unknown,
  response: Parameters<typeof sendValidationError>[0]
) {
  const parsed = commonFields.safeParse(requestBody);
  if (!parsed.success) {
    sendValidationError(response, parsed.error);
    return null;
  }
  const protocolData = parseProtocolData(parsed.data.protocol, parsed.data.protocolData);
  if (!protocolData.success) {
    sendValidationError(response, protocolData.error);
    return null;
  }
  rejectUnverifiedPublish(parsed.data.protocol, parsed.data.status);
  return { ...parsed.data, logoUrl: parsed.data.logoUrl || null, protocolData: protocolData.data };
}

function listProjection() {
  return `cfg.id, cfg.name, cfg.logo_url AS \`logoUrl\`, cfg.protocol, cfg.country_code AS \`countryCode\`,
          cfg.country_name AS \`countryName\`, cfg.carrier_id AS \`carrierId\`,
          c.name AS \`carrierName\`, cfg.server_id AS \`serverId\`, s.name AS \`serverName\`,
          cfg.status, cfg.description, cfg.created_at AS \`createdAt\`, cfg.updated_at AS \`updatedAt\``;
}

function mutationProjection() {
  return `id, name, logo_url AS \`logoUrl\`, protocol, description, status,
          created_at AS \`createdAt\`, updated_at AS \`updatedAt\``;
}

configurationsRouter.get("/capabilities", (_request, response) => {
  response.json({ protocols: protocolCapabilities() });
});

configurationsRouter.get("/", asyncRoute(async (request, response) => {
  const parsed = listQuerySchema.safeParse(request.query);
  if (!parsed.success) return sendValidationError(response, parsed.error);
  const { search, protocol, country, carrierId, status, page, pageSize } = parsed.data;
  const values: SqlValue[] = [];
  const conditions: string[] = [];
  const addFilter = (sql: string, value: SqlValue) => {
    values.push(value);
    conditions.push(sql);
  };
  if (search) addFilter("cfg.name LIKE CONCAT('%', ?, '%')", search);
  if (protocol) addFilter("cfg.protocol = ?", protocol);
  if (country) addFilter("cfg.country_code = ?", country);
  if (carrierId) addFilter("cfg.carrier_id = ?", carrierId);
  if (status) addFilter("cfg.status = ?", status);
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const count = await select<RowDataPacket & { total: number }>(
    `SELECT COUNT(*) AS total FROM configurations cfg ${where}`,
    values
  );
  const total = Number(count[0].total);
  const result = await select<RowDataPacket & { protocol: Protocol }>(
    `SELECT ${listProjection()} FROM configurations cfg
     LEFT JOIN carriers c ON c.id=cfg.carrier_id
     LEFT JOIN servers s ON s.id=cfg.server_id
     ${where}
     ORDER BY cfg.created_at DESC
     LIMIT ? OFFSET ?`,
    [...values, pageSize, (page - 1) * pageSize]
  );
  response.json({
    configurations: result.map((row) => ({
      ...row,
      androidCompatible: isAndroidProtocolVerified(row.protocol)
    })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
  });
}));

configurationsRouter.get("/:id", asyncRoute(async (request, response) => {
  const id = parseUuid(request.params.id, response);
  if (!id) return;
  const result = await select<RowDataPacket & { protocol: Protocol; protocol_data_encrypted: ReturnType<typeof encryptConfiguration> }>(
    `SELECT ${listProjection()}, cfg.protocol_data_encrypted
     FROM configurations cfg LEFT JOIN carriers c ON c.id=cfg.carrier_id
     LEFT JOIN servers s ON s.id=cfg.server_id WHERE cfg.id=?`,
    [id]
  );
  if (!result.length) throw new HttpError(404, "Configuration not found.");
  const row = result[0];
  const { protocol_data_encrypted: encryptedData, ...configuration } = row;
  const protocolData = decryptConfiguration(encryptedData);
  response.json({
    configuration: { ...configuration, protocolData, androidCompatible: isAndroidProtocolVerified(row.protocol) }
  });
}));

configurationsRouter.post("/", asyncRoute(async (request, response) => {
  const input = await parseInput(request.body, response);
  if (!input) return;
  const id = randomUUID();
  await execute(
    `INSERT INTO configurations
       (id, name, logo_url, protocol, description, status,
        protocol_data_encrypted, created_by, updated_by)
     VALUES (?,?,?,?,?,?,?, ?,?)`,
    [
      id, input.name, input.logoUrl, input.protocol, input.description, input.status,
      JSON.stringify(encryptConfiguration(input.protocolData)),
      (request as typeof request & { admin: { id: string } }).admin.id,
      (request as typeof request & { admin: { id: string } }).admin.id
    ]
  );
  const result = await select<RowDataPacket>(`SELECT ${mutationProjection()} FROM configurations WHERE id=?`, [id]);
  response.status(201).json({
    configuration: { ...result[0], androidCompatible: isAndroidProtocolVerified(input.protocol) }
  });
}));

configurationsRouter.put("/:id", asyncRoute(async (request, response) => {
  const id = parseUuid(request.params.id, response);
  if (!id) return;
  const existing = await select<RowDataPacket>("SELECT id FROM configurations WHERE id=?", [id]);
  if (!existing.length) throw new HttpError(404, "Configuration not found.");
  const input = await parseInput(request.body, response);
  if (!input) return;
  await execute(
    `UPDATE configurations SET name=?, logo_url=?, protocol=?, description=?, status=?,
       protocol_data_encrypted=?, updated_by=?, updated_at=CURRENT_TIMESTAMP(3)
     WHERE id=?`,
    [
      input.name, input.logoUrl, input.protocol, input.description, input.status,
      JSON.stringify(encryptConfiguration(input.protocolData)),
      (request as typeof request & { admin: { id: string } }).admin.id,
      id
    ]
  );
  const result = await select<RowDataPacket>(`SELECT ${mutationProjection()} FROM configurations WHERE id=?`, [id]);
  if (!result.length) throw new HttpError(404, "Configuration not found.");
  response.json({
    configuration: { ...result[0], androidCompatible: isAndroidProtocolVerified(input.protocol) }
  });
}));

configurationsRouter.patch("/:id/status", asyncRoute(async (request, response) => {
  const id = parseUuid(request.params.id, response);
  if (!id) return;
  const parsed = z.object({ status: z.enum(["draft", "published", "disabled"]) }).strict().safeParse(request.body);
  if (!parsed.success) return sendValidationError(response, parsed.error);
  const existing = await select<RowDataPacket & { protocol: Protocol }>(
    "SELECT protocol FROM configurations WHERE id=?",
    [id]
  );
  if (!existing.length) throw new HttpError(404, "Configuration not found.");
  rejectUnverifiedPublish(existing[0].protocol, parsed.data.status as ConfigurationStatus);
  await execute(
    `UPDATE configurations SET status=?, updated_by=?, updated_at=CURRENT_TIMESTAMP(3) WHERE id=?`,
    [parsed.data.status, (request as typeof request & { admin: { id: string } }).admin.id, id]
  );
  const result = await select<RowDataPacket>(`SELECT ${mutationProjection()} FROM configurations WHERE id=?`, [id]);
  response.json({
    configuration: {
      ...result[0],
      androidCompatible: isAndroidProtocolVerified(existing[0].protocol)
    }
  });
}));

configurationsRouter.post("/:id/duplicate", asyncRoute(async (request, response) => {
  const id = parseUuid(request.params.id, response);
  if (!id) return;
  const client = await pool.getConnection();
  let transactionStarted = false;
  try {
    await client.beginTransaction();
    transactionStarted = true;
    const source = await client.execute<(RowDataPacket & {
      name: string;
      logo_url: string | null;
      protocol: Protocol;
      country_code: string | null;
      country_name: string | null;
      carrier_id: string | null;
      server_id: string | null;
      description: string;
      protocol_data_encrypted: ReturnType<typeof encryptConfiguration>;
    })[]>(
      "SELECT * FROM configurations WHERE id=? FOR UPDATE",
      [id]
    );
    const original = source[0][0];
    if (!original) throw new HttpError(404, "Configuration not found.");
    const name = `${original.name} (copy)`.slice(0, 120);
    const newId = randomUUID();
    await client.execute(
      `INSERT INTO configurations
         (id, name, logo_url, protocol, country_code, country_name, carrier_id, server_id, description, status,
          protocol_data_encrypted, created_by, updated_by)
       VALUES (?,?,?,?,?,?,?,?,?,'draft',?,?,?)`,
      [
        newId, name, original.logo_url, original.protocol, original.country_code, original.country_name,
        original.carrier_id, original.server_id, original.description,
        JSON.stringify(encryptConfiguration(decryptConfiguration(original.protocol_data_encrypted))),
        (request as typeof request & { admin: { id: string } }).admin.id,
        (request as typeof request & { admin: { id: string } }).admin.id
      ]
    );
    const copied = await client.execute<RowDataPacket[]>(
      `SELECT ${listProjection()} FROM configurations cfg
       LEFT JOIN carriers c ON c.id=cfg.carrier_id
       LEFT JOIN servers s ON s.id=cfg.server_id
       WHERE cfg.id=?`,
      [newId]
    );
    await client.commit();
    transactionStarted = false;
    response.status(201).json({
      configuration: { ...copied[0][0], androidCompatible: isAndroidProtocolVerified(original.protocol) }
    });
  } catch (error) {
    if (transactionStarted) await client.rollback();
    if (isForeignKeyError(error)) throw new HttpError(409, "The configuration's carrier or server is no longer available.");
    throw error;
  } finally {
    client.release();
  }
}));

configurationsRouter.delete("/:id", asyncRoute(async (request, response) => {
  const id = parseUuid(request.params.id, response);
  if (!id) return;
  const result = await execute("DELETE FROM configurations WHERE id=?", [id]);
  if (!result.affectedRows) throw new HttpError(404, "Configuration not found.");
  response.status(204).end();
}));
