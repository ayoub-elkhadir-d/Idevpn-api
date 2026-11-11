import assert from "node:assert/strict";
import test from "node:test";
import { protocolCapabilities } from "./android-compatibility.js";
import { parseProtocolData } from "./protocols.js";

test("validates the VLESS schema and transport-dependent WebSocket settings", () => {
  const data = {
    address: "edge.example.net", port: 443, uuid: "5a19b5e8-b672-48b3-82ee-144f1e88da92",
    transport: "tcp", security: "tls"
  };
  assert.equal(parseProtocolData("vless", data).success, true);
  assert.equal(parseProtocolData("vless", { ...data, port: 65536 }).success, false);
  assert.equal(parseProtocolData("vless", { ...data, transport: "ws" }).success, false);
  assert.equal(parseProtocolData("vless", { ...data, security: "reality" }).success, false);
});

test("validates VMess UUID, port, cipher, and WebSocket path", () => {
  const data = {
    address: "vmess.example.net", port: 443, uuid: "5a19b5e8-b672-48b3-82ee-144f1e88da92",
    transport: "ws", wsPath: "/ws"
  };
  assert.equal(parseProtocolData("vmess", data).success, true);
  assert.equal(parseProtocolData("vmess", { ...data, wsPath: "" }).success, false);
  assert.equal(parseProtocolData("vmess", { ...data, uuid: "not-a-uuid" }).success, false);
});

test("requires TLS and SNI for Trojan", () => {
  const data = { address: "trojan.example.net", port: 443, password: "secret", tls: true, transport: "tcp", sni: "trojan.example.net" };
  assert.equal(parseProtocolData("trojan", data).success, true);
  assert.equal(parseProtocolData("trojan", { ...data, tls: false }).success, false);
  assert.equal(parseProtocolData("trojan", { ...data, sni: "" }).success, false);
});

test("validates Shadowsocks cipher and password", () => {
  const data = { address: "ss.example.net", port: 8388, method: "aes-256-gcm", password: "secret" };
  assert.equal(parseProtocolData("shadowsocks", data).success, true);
  assert.equal(parseProtocolData("shadowsocks", { ...data, method: "unsupported" }).success, false);
  assert.equal(parseProtocolData("shadowsocks", { ...data, password: "" }).success, false);
});

test("validates WireGuard key lengths, IP ranges, and port", () => {
  const key = Buffer.alloc(32).toString("base64");
  const data = {
    endpoint: "wg.example.net", port: 51820, privateKey: key, publicKey: key,
    addresses: ["10.0.0.2/32"], allowedIPs: ["0.0.0.0/0", "::/0"]
  };
  assert.equal(parseProtocolData("wireguard", data).success, true);
  assert.equal(parseProtocolData("wireguard", { ...data, privateKey: "bad" }).success, false);
  assert.equal(parseProtocolData("wireguard", { ...data, addresses: ["10.0.0.2/999"] }).success, false);
});

test("requires Salamander obfuscation credentials for Hysteria 2", () => {
  const data = { address: "hy2.example.net", port: 443, password: "secret", sni: "hy2.example.net" };
  assert.equal(parseProtocolData("hysteria2", data).success, true);
  assert.equal(parseProtocolData("hysteria2", { ...data, obfs: "salamander" }).success, false);
  assert.equal(parseProtocolData("hysteria2", { ...data, obfs: "salamander", obfsPassword: "secret" }).success, true);
});

test("does not claim compatibility for protocols without Android engine verification", () => {
  assert.ok(protocolCapabilities().every((item) => item.androidCompatible === false && item.publishingAllowed === false && item.draftsAllowed));
});
