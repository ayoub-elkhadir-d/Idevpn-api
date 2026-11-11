import { z } from "zod";
import { isIP } from "node:net";

const port = z.number().int().min(1).max(65535);
const hostnamePattern = /^(?=.{1,253}$)(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)(?:\.(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?))*\.?$/;
export const hostSchema = z.string().trim().min(1).max(253)
  .refine((value) => isIP(value) > 0 || hostnamePattern.test(value), "Enter a hostname or IP address.");
const host = hostSchema;
const optionalText = (max = 255) => z.string().trim().max(max).optional().default("");
const stringList = z.array(z.string().trim().min(1).max(255)).max(16).default([]);
const transport = z.enum(["tcp", "ws", "grpc", "httpupgrade", "xhttp"]);
const fingerprint = z.enum(["", "chrome", "firefox", "safari", "ios", "android", "edge", "random", "randomized"]);
const wireguardKey = z.base64().refine((value) => Buffer.from(value, "base64").length === 32, "WireGuard keys must be 32 bytes.");
const cidr = z.string().refine((value) => {
  const [address, prefix, extra] = value.split("/");
  if (!address || prefix === undefined || extra !== undefined || !/^\d+$/.test(prefix)) return false;
  const version = isIP(address);
  return version > 0 && Number(prefix) <= (version === 4 ? 32 : 128);
}, "Enter a valid IPv4 or IPv6 CIDR.");

const tlsFields = {
  sni: optionalText(253),
  host: optionalText(253),
  wsPath: optionalText(1024),
  fingerprint: fingerprint.default(""),
  alpn: stringList
};

const vlessSchema = z.object({
  address: host, port, uuid: z.uuid(), flow: z.enum(["", "xtls-rprx-vision"]).default(""),
  transport, security: z.enum(["none", "tls", "reality"]), ...tlsFields,
  tlsAllowInsecure: z.boolean().default(false),
  realityPublicKey: optionalText(512), realityShortId: optionalText(64)
}).strict().superRefine((value, context) => {
  if (value.security === "reality" && (!value.sni || !value.realityPublicKey)) {
    context.addIssue({ code: "custom", path: ["realityPublicKey"], message: "Reality requires an SNI and public key." });
  }
  if (value.transport === "ws" && !value.wsPath) {
    context.addIssue({ code: "custom", path: ["wsPath"], message: "WebSocket transport requires a path." });
  }
});

const vmessSchema = z.object({
  address: host, port, uuid: z.uuid(), alterId: z.number().int().min(0).max(65535).default(0),
  cipher: z.enum(["auto", "aes-128-gcm", "chacha20-poly1305", "none", "zero"]).default("auto"),
  transport, tls: z.boolean().default(false), ...tlsFields
}).strict().superRefine((value, context) => {
  if (value.transport === "ws" && !value.wsPath) {
    context.addIssue({ code: "custom", path: ["wsPath"], message: "WebSocket transport requires a path." });
  }
});

const trojanSchema = z.object({
  address: host, port, password: z.string().min(1).max(512), transport,
  tls: z.literal(true), ...tlsFields
}).strict().superRefine((value, context) => {
  if (!value.sni) context.addIssue({ code: "custom", path: ["sni"], message: "Trojan requires an SNI host." });
  if (value.transport === "ws" && !value.wsPath) {
    context.addIssue({ code: "custom", path: ["wsPath"], message: "WebSocket transport requires a path." });
  }
});

const shadowsocksSchema = z.object({
  address: host, port,
  method: z.enum([
    "2022-blake3-aes-128-gcm", "2022-blake3-aes-256-gcm", "2022-blake3-chacha20-poly1305",
    "aes-128-gcm", "aes-256-gcm", "chacha20-ietf-poly1305", "xchacha20-ietf-poly1305"
  ]),
  password: z.string().min(1).max(512),
  plugin: z.enum(["", "obfs-local", "v2ray-plugin"]).default(""),
  pluginOptions: optionalText(1024)
}).strict().superRefine((value, context) => {
  const expectedLength = value.method === "2022-blake3-aes-128-gcm" ? 16
    : value.method.startsWith("2022-blake3-") ? 32 : null;
  const decoded = Buffer.from(value.password, "base64");
  if (expectedLength !== null && (decoded.length !== expectedLength || decoded.toString("base64") !== value.password)) {
    context.addIssue({ code: "custom", path: ["password"], message: `This 2022 cipher requires a ${expectedLength}-byte base64 key.` });
  }
});

const wireguardSchema = z.object({
  endpoint: host, port,
  privateKey: wireguardKey,
  publicKey: wireguardKey,
  presharedKey: z.union([z.literal(""), wireguardKey]).default(""),
  addresses: z.array(cidr).min(1).max(16),
  allowedIPs: z.array(cidr).min(1).max(32),
  dns: stringList,
  mtu: z.number().int().min(1280).max(9000).default(1420),
  persistentKeepalive: z.number().int().min(0).max(65535).default(25)
}).strict();

const hysteria2Schema = z.object({
  address: host, port, password: z.string().min(1).max(512),
  sni: host, obfs: z.enum(["none", "salamander"]).default("none"),
  obfsPassword: optionalText(512), tlsAllowInsecure: z.boolean().default(false),
  alpn: stringList, uploadMbps: z.number().int().min(0).max(1_000_000).default(0),
  downloadMbps: z.number().int().min(0).max(1_000_000).default(0)
}).strict().superRefine((value, context) => {
  if (value.obfs === "salamander" && !value.obfsPassword) {
    context.addIssue({ code: "custom", path: ["obfsPassword"], message: "Salamander obfuscation requires a password." });
  }
});

export const protocolSchemas = {
  vless: vlessSchema,
  vmess: vmessSchema,
  trojan: trojanSchema,
  shadowsocks: shadowsocksSchema,
  wireguard: wireguardSchema,
  hysteria2: hysteria2Schema
};

export const protocolNames = {
  vless: "VLESS",
  vmess: "VMess",
  trojan: "Trojan",
  shadowsocks: "Shadowsocks",
  wireguard: "WireGuard",
  hysteria2: "Hysteria 2"
} as const;

export type Protocol = keyof typeof protocolSchemas;
export type ConfigurationStatus = "draft" | "published" | "disabled";

export function parseProtocolData(protocol: Protocol, data: unknown) {
  return protocolSchemas[protocol].safeParse(data);
}

export const protocolNamesList = Object.keys(protocolSchemas) as Protocol[];
