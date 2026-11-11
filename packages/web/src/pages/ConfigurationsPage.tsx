import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeft, ArrowRight, Check, ChevronDown, Copy, Eye, FilePlus2, Pencil, Plus,
  Search, ShieldAlert, Trash2, X
} from "lucide-react";
import {
  api, ApiError, type Configuration, type ConfigurationInput, type ConfigurationStatus,
  type Protocol
} from "../api/client";

type FieldKind = "text" | "password" | "number" | "select" | "list" | "toggle";
type ProtocolField = {
  key: string; label: string; kind: FieldKind; required?: boolean; placeholder?: string;
  options?: { label: string; value: string }[]; help?: string; disabled?: boolean;
};

const protocols: { value: Protocol; label: string; summary: string; fields: ProtocolField[] }[] = [
  {
    value: "vless", label: "VLESS", summary: "Lightweight, UUID-based transport with optional TLS or Reality.",
    fields: [
      { key: "address", label: "Address", kind: "text", required: true, placeholder: "edge.example.net" },
      { key: "port", label: "Port", kind: "number", required: true, placeholder: "443" },
      { key: "uuid", label: "UUID", kind: "password", required: true, placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" },
      { key: "flow", label: "Flow", kind: "select", options: [{ label: "None", value: "" }, { label: "XTLS Vision", value: "xtls-rprx-vision" }] },
      { key: "transport", label: "Network / Transport", kind: "select", required: true, options: ["tcp", "ws", "grpc", "httpupgrade", "xhttp"].map((value) => ({ label: value.toUpperCase(), value })) },
      { key: "security", label: "Security", kind: "select", required: true, options: ["none", "tls", "reality"].map((value) => ({ label: value.toUpperCase(), value })) },
      { key: "sni", label: "SNI", kind: "text", placeholder: "www.example.net" },
      { key: "host", label: "Host header", kind: "text", placeholder: "cdn.example.net" },
      { key: "wsPath", label: "WebSocket path", kind: "text", placeholder: "/tunnel" },
      { key: "fingerprint", label: "TLS fingerprint", kind: "select", options: ["", "chrome", "firefox", "safari", "ios", "android", "edge", "random"].map((value) => ({ label: value || "None", value })) },
      { key: "alpn", label: "ALPN", kind: "list", placeholder: "h2, http/1.1" },
      { key: "tlsAllowInsecure", label: "Allow insecure TLS certificates", kind: "toggle" },
      { key: "realityPublicKey", label: "Reality public key", kind: "password", placeholder: "Public key from the Reality server" },
      { key: "realityShortId", label: "Reality short ID", kind: "text", placeholder: "Optional short ID" }
    ]
  },
  {
    value: "vmess", label: "VMess", summary: "VMess UUID authentication with selectable transport and cipher.",
    fields: [
      { key: "address", label: "Address", kind: "text", required: true, placeholder: "edge.example.net" },
      { key: "port", label: "Port", kind: "number", required: true, placeholder: "443" },
      { key: "uuid", label: "UUID", kind: "password", required: true, placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" },
      { key: "alterId", label: "Alter ID", kind: "number" },
      { key: "cipher", label: "Cipher", kind: "select", options: ["auto", "aes-128-gcm", "chacha20-poly1305", "none", "zero"].map((value) => ({ label: value, value })) },
      { key: "transport", label: "Network / Transport", kind: "select", required: true, options: ["tcp", "ws", "grpc", "httpupgrade", "xhttp"].map((value) => ({ label: value.toUpperCase(), value })) },
      { key: "tls", label: "Enable TLS", kind: "toggle" },
      { key: "sni", label: "SNI", kind: "text", placeholder: "www.example.net" },
      { key: "host", label: "Host header", kind: "text", placeholder: "cdn.example.net" },
      { key: "wsPath", label: "WebSocket path", kind: "text", placeholder: "/tunnel" },
      { key: "fingerprint", label: "TLS fingerprint", kind: "select", options: ["", "chrome", "firefox", "safari", "ios", "android", "edge", "random"].map((value) => ({ label: value || "None", value })) },
      { key: "alpn", label: "ALPN", kind: "list", placeholder: "h2, http/1.1" }
    ]
  },
  {
    value: "trojan", label: "Trojan", summary: "Password-authenticated TLS transport.",
    fields: [
      { key: "address", label: "Address", kind: "text", required: true, placeholder: "edge.example.net" },
      { key: "port", label: "Port", kind: "number", required: true, placeholder: "443" },
      { key: "password", label: "Trojan password", kind: "password", required: true },
      { key: "transport", label: "Network / Transport", kind: "select", required: true, options: ["tcp", "ws", "grpc", "httpupgrade", "xhttp"].map((value) => ({ label: value.toUpperCase(), value })) },
      { key: "tls", label: "TLS required", kind: "toggle", disabled: true, help: "Trojan requires TLS." },
      { key: "sni", label: "SNI", kind: "text", required: true, placeholder: "www.example.net" },
      { key: "host", label: "Host header", kind: "text", placeholder: "cdn.example.net" },
      { key: "wsPath", label: "WebSocket path", kind: "text", placeholder: "/tunnel" },
      { key: "fingerprint", label: "TLS fingerprint", kind: "select", options: ["", "chrome", "firefox", "safari", "ios", "android", "edge", "random"].map((value) => ({ label: value || "None", value })) },
      { key: "alpn", label: "ALPN", kind: "list", placeholder: "h2, http/1.1" }
    ]
  },
  {
    value: "shadowsocks", label: "Shadowsocks", summary: "AEAD stream cipher and optional transport plugin.",
    fields: [
      { key: "address", label: "Address", kind: "text", required: true, placeholder: "edge.example.net" },
      { key: "port", label: "Port", kind: "number", required: true, placeholder: "8388" },
      { key: "method", label: "Encryption method", kind: "select", required: true, options: ["2022-blake3-aes-128-gcm", "2022-blake3-aes-256-gcm", "2022-blake3-chacha20-poly1305", "aes-128-gcm", "aes-256-gcm", "chacha20-ietf-poly1305", "xchacha20-ietf-poly1305"].map((value) => ({ label: value, value })) },
      { key: "password", label: "Password / key", kind: "password", required: true },
      { key: "plugin", label: "Plugin", kind: "select", options: [{ label: "None", value: "" }, { label: "obfs-local", value: "obfs-local" }, { label: "v2ray-plugin", value: "v2ray-plugin" }] },
      { key: "pluginOptions", label: "Plugin options", kind: "text", placeholder: "mode=websocket;host=cdn.example.net" }
    ]
  },
  {
    value: "wireguard", label: "WireGuard", summary: "Peer keys, interface addresses, allowed IP ranges, and DNS.",
    fields: [
      { key: "endpoint", label: "Endpoint host", kind: "text", required: true, placeholder: "edge.example.net" },
      { key: "port", label: "Endpoint port", kind: "number", required: true, placeholder: "51820" },
      { key: "privateKey", label: "Client private key", kind: "password", required: true },
      { key: "publicKey", label: "Server public key", kind: "password", required: true },
      { key: "presharedKey", label: "Preshared key", kind: "password" },
      { key: "addresses", label: "Interface addresses (CIDR)", kind: "list", required: true, placeholder: "10.0.0.2/32" },
      { key: "allowedIPs", label: "Allowed IPs (CIDR)", kind: "list", required: true, placeholder: "0.0.0.0/0, ::/0" },
      { key: "dns", label: "DNS servers", kind: "list", placeholder: "1.1.1.1, 2606:4700:4700::1111" },
      { key: "mtu", label: "MTU", kind: "number" },
      { key: "persistentKeepalive", label: "Persistent keepalive (seconds)", kind: "number" }
    ]
  },
  {
    value: "hysteria2", label: "Hysteria 2", summary: "QUIC-based transport with optional Salamander obfuscation.",
    fields: [
      { key: "address", label: "Address", kind: "text", required: true, placeholder: "edge.example.net" },
      { key: "port", label: "Port", kind: "number", required: true, placeholder: "443" },
      { key: "password", label: "Authentication password", kind: "password", required: true },
      { key: "sni", label: "TLS SNI", kind: "text", required: true, placeholder: "www.example.net" },
      { key: "obfs", label: "Obfuscation", kind: "select", options: [{ label: "None", value: "none" }, { label: "Salamander", value: "salamander" }] },
      { key: "obfsPassword", label: "Salamander password", kind: "password" },
      { key: "tlsAllowInsecure", label: "Allow insecure TLS certificates", kind: "toggle" },
      { key: "alpn", label: "ALPN", kind: "list", placeholder: "h3" },
      { key: "uploadMbps", label: "Upload limit (Mbps)", kind: "number" },
      { key: "downloadMbps", label: "Download limit (Mbps)", kind: "number" }
    ]
  }
];

const protocolDefaults: Record<Protocol, Record<string, string | boolean>> = {
  vless: { address: "", port: "443", uuid: "", flow: "", transport: "tcp", security: "tls", sni: "", host: "", wsPath: "", fingerprint: "", alpn: "h2, http/1.1", tlsAllowInsecure: false, realityPublicKey: "", realityShortId: "" },
  vmess: { address: "", port: "443", uuid: "", alterId: "0", cipher: "auto", transport: "tcp", tls: true, sni: "", host: "", wsPath: "", fingerprint: "", alpn: "h2, http/1.1" },
  trojan: { address: "", port: "443", password: "", transport: "tcp", tls: true, sni: "", host: "", wsPath: "", fingerprint: "", alpn: "h2, http/1.1" },
  shadowsocks: { address: "", port: "8388", method: "aes-256-gcm", password: "", plugin: "", pluginOptions: "" },
  wireguard: { endpoint: "", port: "51820", privateKey: "", publicKey: "", presharedKey: "", addresses: "10.0.0.2/32", allowedIPs: "0.0.0.0/0, ::/0", dns: "1.1.1.1", mtu: "1420", persistentKeepalive: "25" },
  hysteria2: { address: "", port: "443", password: "", sni: "", obfs: "none", obfsPassword: "", tlsAllowInsecure: false, alpn: "h3", uploadMbps: "0", downloadMbps: "0" }
};

function fromProtocolData(protocol: Protocol, data?: Record<string, unknown>) {
  return Object.fromEntries(Object.entries({ ...protocolDefaults[protocol], ...data }).map(([key, value]) => [
    key,
    Array.isArray(value) ? value.join(", ") : typeof value === "boolean" ? value : String(value ?? "")
  ])) as Record<string, string | boolean>;
}

function toProtocolData(protocol: Protocol, values: Record<string, string | boolean>) {
  const numeric = new Set(["port", "alterId", "mtu", "persistentKeepalive", "uploadMbps", "downloadMbps"]);
  const lists = new Set(["alpn", "addresses", "allowedIPs", "dns"]);
  const data: Record<string, unknown> = {};
  protocols.find((item) => item.value === protocol)?.fields.forEach(({ key }) => {
    const value = values[key];
    if (numeric.has(key)) data[key] = Number(value);
    else if (lists.has(key)) data[key] = String(value).split(/[,\n]/).map((part) => part.trim()).filter(Boolean);
    else data[key] = value;
  });
  return data;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

function showProtocol(protocol: string) {
  return protocols.find((item) => item.value === protocol)?.label ?? protocol;
}

function StatusBadge({ status }: { status: ConfigurationStatus }) {
  return <span className={`cm-status cm-status-${status}`}>{status}</span>;
}

function ConfigDialog({
  initial, publishingAllowed, readOnly, onClose, onSave
}: {
  initial?: Configuration; publishingAllowed: Record<string, boolean>;
  readOnly?: boolean; onClose: () => void; onSave: (input: ConfigurationInput, id?: string) => Promise<void>;
}) {
  const [protocol, setProtocol] = useState<Protocol>(initial?.protocol ?? "vless");
  const [common, setCommon] = useState({
    name: initial?.name ?? "", logoUrl: initial?.logoUrl ?? "",
    description: initial?.description ?? "", status: initial?.status ?? "draft" as ConfigurationStatus
  });
  const [fields, setFields] = useState(() => fromProtocolData(initial?.protocol ?? "vless", initial?.protocolData));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const selectedProtocol = protocols.find((item) => item.value === protocol)!;

  function updateField(key: string, value: string | boolean) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  function changeProtocol(value: Protocol) {
    setProtocol(value);
    setFields(fromProtocolData(value));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      await onSave({
        ...common,
        protocol,
        protocolData: toProtocolData(protocol, fields)
      }, initial?.id);
    } catch (reason) {
      setError(reason instanceof ApiError && reason.details?.length
        ? reason.details.map((item) => `${item.field}: ${item.message}`).join(" · ")
        : reason instanceof Error ? reason.message : "Could not save this configuration.");
    } finally {
      setSaving(false);
    }
  }

  return <div className="cm-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="cm-dialog" role="dialog" aria-modal="true" aria-labelledby="config-dialog-title">
      <header className="cm-dialog-header">
        <div><div className="cm-kicker">{readOnly ? "CONFIGURATION DETAILS" : initial ? "EDIT CONFIGURATION" : "NEW CONFIGURATION"}</div><h2 id="config-dialog-title">{readOnly ? initial?.name : initial ? "Edit configuration" : "Create configuration"}</h2></div>
        <button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={18} /></button>
      </header>
      <form className="cm-dialog-body" onSubmit={(event) => void handleSubmit(event)}>
        {!readOnly && <div className="cm-security-note"><ShieldAlert size={16} /><span>Credentials and protocol secrets are encrypted before storage. Android compatibility is unverified; new configurations are saved as drafts.</span></div>}
        <div className="cm-form-section">
          <div className="cm-section-heading"><span>01</span><div><strong>General</strong><small>Identify this network profile and its appearance.</small></div></div>
          <div className="cm-form-grid">
            <label className="cm-field">Configuration name
              <input required minLength={2} maxLength={120} disabled={readOnly} value={common.name} placeholder="e.g. Orange Maroc — Secure" onChange={(event) => setCommon({ ...common, name: event.target.value })} />
            </label>
            <label className="cm-field">Logo URL
              <input type="url" maxLength={2048} disabled={readOnly} value={common.logoUrl} placeholder="https://example.com/logo.png" onChange={(event) => setCommon({ ...common, logoUrl: event.target.value })} />
            </label>
            <label className="cm-field">Protocol
              <select disabled={readOnly} value={protocol} onChange={(event) => changeProtocol(event.target.value as Protocol)}>
                {protocols.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label className="cm-field">Status
              <select disabled={readOnly} value={common.status} onChange={(event) => setCommon({ ...common, status: event.target.value as ConfigurationStatus })}>
                <option value="draft">Draft</option>
                <option value="published" disabled={!publishingAllowed[protocol]}>{publishingAllowed[protocol] ? "Published" : "Published · compatibility unverified"}</option>
                <option value="disabled">Disabled</option>
              </select>
            </label>
            <label className="cm-field cm-span-two">Description
              <textarea rows={2} maxLength={2000} disabled={readOnly} value={common.description} placeholder="Optional notes for administrators" onChange={(event) => setCommon({ ...common, description: event.target.value })} />
            </label>
          </div>
        </div>

        <div className="cm-form-section">
          <div className="cm-section-heading"><span>02</span><div><strong>{selectedProtocol.label} settings</strong><small>{selectedProtocol.summary}</small></div></div>
          <div className="cm-form-grid">
            {selectedProtocol.fields.map((field) => <label key={field.key} className={`cm-field ${field.kind === "toggle" ? "cm-toggle-field" : ""}`}>
              {field.kind === "toggle" ? <>
                <span>{field.label}{field.help && <small className="cm-help">{field.help}</small>}</span>
                <input type="checkbox" disabled={readOnly || field.disabled} checked={Boolean(fields[field.key])} onChange={(event) => updateField(field.key, event.target.checked)} />
              </> : <>
                {field.label}
                {field.kind === "select" ? <select disabled={readOnly} required={field.required} value={String(fields[field.key] ?? "")} onChange={(event) => updateField(field.key, event.target.value)}>
                  {field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select> : field.kind === "list" ? <textarea disabled={readOnly} required={field.required} rows={2} value={String(fields[field.key] ?? "")} placeholder={field.placeholder} onChange={(event) => updateField(field.key, event.target.value)} /> :
                  <input disabled={readOnly} required={field.required || (field.key === "wsPath" && fields.transport === "ws") || (field.key === "realityPublicKey" && fields.security === "reality") || (field.key === "sni" && protocol === "vless" && fields.security === "reality")} type={field.kind} min={field.kind === "number" ? field.key === "port" ? 1 : 0 : undefined} max={field.key === "port" || field.key === "alterId" || field.key === "persistentKeepalive" ? 65535 : field.key === "mtu" ? 9000 : field.kind === "number" ? 1000000 : undefined} value={String(fields[field.key] ?? "")} placeholder={field.placeholder} onChange={(event) => updateField(field.key, event.target.value)} />}
              </>}
            </label>)}
          </div>
          <p className="cm-protocol-note">{publishingAllowed[protocol]
            ? <>This protocol is <strong>verified as Android-compatible</strong>. Publishing is available.</>
            : <>This protocol is <strong>not verified as compatible</strong> with the current Android VPN engine. Keep it as a draft until compatibility is confirmed.</>}</p>
        </div>
        {error && <div role="alert" className="cm-error">{error}</div>}
      </form>
      <footer className="cm-dialog-footer">
        <button className="cm-button cm-button-quiet" onClick={onClose}>{readOnly ? "Close" : "Cancel"}</button>
        {!readOnly && <button className="cm-button cm-button-primary" disabled={saving} onClick={(event) => {
          const form = event.currentTarget.closest(".cm-dialog")?.querySelector("form");
          form?.requestSubmit();
        }}>{saving ? "Saving…" : initial ? "Save changes" : "Create draft"}<Check size={15} /></button>}
      </footer>
    </section>
  </div>;
}

export function ConfigurationsPage() {
  const [items, setItems] = useState<Configuration[]>([]);
  const [publishingAllowed, setPublishingAllowed] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [protocol, setProtocol] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [dialog, setDialog] = useState<{ configuration?: Configuration; readOnly?: boolean } | null>(null);
  const [busyId, setBusyId] = useState("");

  const hasVerifiedProtocols = Object.values(publishingAllowed).some(Boolean);

  const loadReferenceData = useCallback(async () => {
    try {
      const capabilities = await api.capabilities();
      setPublishingAllowed(Object.fromEntries(capabilities.protocols.map((item) => [item.protocol, item.publishingAllowed])));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load protocol capabilities.");
    }
  }, []);

  useEffect(() => { void loadReferenceData(); }, [loadReferenceData]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const timer = window.setTimeout(() => {
      api.configurations({ search, protocol, status, page, pageSize })
        .then((result) => {
          if (!active) return;
          setItems(result.configurations);
          setTotal(result.pagination.total);
          setTotalPages(result.pagination.totalPages);
          setError("");
        })
        .catch((reason: unknown) => {
          if (active) setError(reason instanceof Error ? reason.message : "Could not load configurations.");
        })
        .finally(() => { if (active) setLoading(false); });
    }, search ? 220 : 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [search, protocol, status, page, pageSize]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  }

  async function openDetails(configuration: Configuration, readOnly = false) {
    setBusyId(configuration.id);
    try {
      const { configuration: details } = await api.configuration(configuration.id);
      setDialog({ configuration: details, readOnly });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load configuration details.");
    } finally {
      setBusyId("");
    }
  }

  async function saveConfiguration(input: ConfigurationInput, id?: string) {
    if (id) await api.updateConfiguration(id, input);
    else await api.createConfiguration(input);
    setDialog(null);
    notify(id ? "Configuration updated." : "Configuration draft created.");
    setPage(1);
    const result = await api.configurations({ search, protocol, status, page: 1, pageSize });
    setItems(result.configurations); setTotal(result.pagination.total); setTotalPages(result.pagination.totalPages);
  }

  async function changeStatus(configuration: Configuration, nextStatus: ConfigurationStatus) {
    if (nextStatus === "published" && !publishingAllowed[configuration.protocol]) return;
    setBusyId(configuration.id);
    setError("");
    try {
      await api.configurationStatus(configuration.id, nextStatus);
      notify(nextStatus === "published" ? "Configuration published." : nextStatus === "disabled" ? "Configuration disabled." : "Configuration set to draft.");
      const result = await api.configurations({ search, protocol, status, page, pageSize });
      setItems(result.configurations);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update configuration status.");
    } finally {
      setBusyId("");
    }
  }

  async function duplicate(configuration: Configuration) {
    setBusyId(configuration.id);
    setError("");
    try {
      await api.duplicateConfiguration(configuration.id);
      notify("Draft copy created.");
      setPage(1);
      const result = await api.configurations({ search, protocol, status, page: 1, pageSize });
      setItems(result.configurations); setTotal(result.pagination.total); setTotalPages(result.pagination.totalPages);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not duplicate configuration.");
    } finally {
      setBusyId("");
    }
  }

  async function remove(configuration: Configuration) {
    if (!window.confirm(`Delete "${configuration.name}"? This cannot be undone.`)) return;
    setBusyId(configuration.id);
    setError("");
    try {
      await api.deleteConfiguration(configuration.id);
      notify("Configuration deleted.");
      const nextPage = page > 1 && items.length === 1 ? page - 1 : page;
      setPage(nextPage);
      const result = await api.configurations({ search, protocol, status, page: nextPage, pageSize });
      setItems(result.configurations); setTotal(result.pagination.total); setTotalPages(result.pagination.totalPages);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not delete configuration.");
    } finally {
      setBusyId("");
    }
  }

  return <div className="dashboard-page cm-page">
    <div className="page-heading">
      <div><div className="eyebrow"><span className="eyebrow-line" /> INFRASTRUCTURE</div><h1>Configurations<span className="text-accent">.</span></h1><p>Create and organize protocol profiles across your network.</p></div>
      <button className="cm-button cm-button-primary" onClick={() => setDialog({})}><Plus size={16} /> New configuration</button>
    </div>
    <div className="cm-protocol-banner"><ShieldAlert size={17} /><div><strong>{hasVerifiedProtocols ? "Android compatibility is verified for selected protocols" : "Protocol compatibility is not yet verified"}</strong><span>{hasVerifiedProtocols ? "Publishing is enabled only for protocols verified in the Android engine; the rest remain draft-only." : "Drafts are safe to prepare. Publishing remains locked until the Android engine support matrix is confirmed."}</span></div><span className="cm-unverified">{hasVerifiedProtocols ? "VERIFIED MATRIX" : "DRAFTS ONLY"}</span></div>
    <div className="cm-toolbar">
      <label className="cm-search"><Search size={16} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search configurations…" aria-label="Search configuration name" /></label>
      <label className="cm-filter"><span>Protocol</span><select aria-label="Filter by protocol" value={protocol} onChange={(event) => { setProtocol(event.target.value); setPage(1); }}><option value="">All protocols</option>{protocols.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><ChevronDown size={13} /></label>
      <label className="cm-filter"><span>Status</span><select aria-label="Filter by status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">All statuses</option><option value="draft">Draft</option><option value="published">Published</option><option value="disabled">Disabled</option></select><ChevronDown size={13} /></label>
    </div>
    {error && <div className="cm-error cm-page-error" role="alert">{error}<button onClick={() => setError("")} aria-label="Dismiss error"><X size={14} /></button></div>}
    <section className="panel cm-table-panel">
      <div className="cm-table-heading"><div><strong>All configurations</strong><span>{total} {total === 1 ? "configuration" : "configurations"}</span></div><div className="cm-table-refresh">{loading && <span className="cm-spinner" />}<span>Encrypted at rest</span></div></div>
      <div className="cm-table-scroll"><table className="cm-table"><thead><tr>
        <th>Configuration name</th><th>Protocol</th><th>Status</th><th>Created date</th><th>Updated date</th><th><span className="sr-only">Actions</span></th>
      </tr></thead><tbody>
        {loading && items.length === 0 && <tr><td colSpan={6} className="cm-table-message"><span className="cm-spinner" /> Loading configurations…</td></tr>}
        {!loading && items.length === 0 && <tr><td colSpan={6} className="cm-table-empty"><FilePlus2 size={26} /><strong>No configurations found</strong><span>{search || protocol || status ? "Try changing the search or filters." : "Create a configuration draft to get started."}</span>{!search && !protocol && !status && <button className="cm-button cm-button-primary" onClick={() => setDialog({})}><Plus size={14} /> Create first draft</button>}</td></tr>}
        {items.map((configuration) => {
          const isBusy = busyId === configuration.id;
          return <tr key={configuration.id}>
            <td><div className="cm-name-cell">{configuration.logoUrl ? <img className="cm-logo" src={configuration.logoUrl} alt="" loading="lazy" /> : <span className="cm-protocol-icon">{showProtocol(configuration.protocol).slice(0, 1)}</span>}<div><strong>{configuration.name}</strong><small>{configuration.description || "No description"}</small></div></div></td>
            <td><span className={`cm-protocol-tag cm-protocol-${configuration.protocol}`}>{showProtocol(configuration.protocol)}</span></td>
            <td><StatusBadge status={configuration.status} /></td>
            <td className="cm-date">{formatDate(configuration.createdAt)}</td>
            <td className="cm-date">{formatDate(configuration.updatedAt)}</td>
            <td><div className="cm-actions">
              <button title="View details" aria-label={`View ${configuration.name}`} disabled={isBusy} onClick={() => void openDetails(configuration, true)}><Eye size={14} /></button>
              <button title="Edit" aria-label={`Edit ${configuration.name}`} disabled={isBusy} onClick={() => void openDetails(configuration)}><Pencil size={14} /></button>
              <button title="Duplicate as draft" aria-label={`Duplicate ${configuration.name}`} disabled={isBusy} onClick={() => void duplicate(configuration)}><Copy size={14} /></button>
              {configuration.status === "published"
                ? <button title="Unpublish" aria-label={`Unpublish ${configuration.name}`} disabled={isBusy} onClick={() => void changeStatus(configuration, "draft")}><ArrowLeft size={14} /></button>
                : configuration.status === "disabled"
                  ? <button title="Enable as draft" aria-label={`Enable ${configuration.name}`} disabled={isBusy} onClick={() => void changeStatus(configuration, "draft")}><Check size={14} /></button>
                  : <button title={publishingAllowed[configuration.protocol] ? "Publish" : "Publishing locked until Android compatibility is verified"} aria-label={`Publish ${configuration.name}`} disabled={isBusy || !publishingAllowed[configuration.protocol]} onClick={() => void changeStatus(configuration, "published")}><ArrowRight size={14} /></button>}
              {configuration.status !== "disabled" && <button title="Disable" aria-label={`Disable ${configuration.name}`} disabled={isBusy} onClick={() => void changeStatus(configuration, "disabled")}><ShieldAlert size={14} /></button>}
              <button className="cm-action-danger" title="Delete" aria-label={`Delete ${configuration.name}`} disabled={isBusy} onClick={() => void remove(configuration)}><Trash2 size={14} /></button>
            </div></td>
          </tr>;
        })}
      </tbody></table></div>
      <div className="cm-pagination"><span>Showing {total ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, total)} of {total}</span><div><button aria-label="Previous page" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)}><ArrowLeft size={14} /></button><span>Page {page} of {Math.max(totalPages, 1)}</span><button aria-label="Next page" disabled={page >= totalPages || loading} onClick={() => setPage((current) => current + 1)}><ArrowRight size={14} /></button></div></div>
    </section>
    {dialog && <ConfigDialog initial={dialog.configuration} readOnly={dialog.readOnly} publishingAllowed={publishingAllowed} onClose={() => setDialog(null)} onSave={saveConfiguration} />}
    {toast && <div role="status" className="cm-toast"><Check size={15} />{toast}</div>}
  </div>;
}
