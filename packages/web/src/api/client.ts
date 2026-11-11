export type Admin = { id: string; email: string };
export type DashboardData = {
  stats: { label: string; value: string; change: string; tone: "positive" | "neutral" }[];
  chart: number[];
  recentActivity: { id: string; title: string; detail: string; time: string; status: "success" | "info" | "warning" }[];
};
export type ConfigurationStatus = "draft" | "published" | "disabled";
export type Protocol = "vless" | "vmess" | "trojan" | "shadowsocks" | "wireguard" | "hysteria2";
export type Configuration = {
  id: string; name: string; logoUrl: string | null; protocol: Protocol;
  status: ConfigurationStatus; description: string; createdAt: string; updatedAt: string;
  androidCompatible: boolean; protocolData?: Record<string, unknown>;
};
export type ConfigurationInput = {
  name: string; logoUrl: string; protocol: Protocol;
  description: string; status: ConfigurationStatus; protocolData: Record<string, unknown>;
};
export type Pagination = { page: number; pageSize: number; total: number; totalPages: number };

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: { field: string; message: string }[]
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.details?.length) {
    return error.details.map((item) => `${item.field}: ${item.message}`).join(" · ");
  }
  return error instanceof Error ? error.message : fallback;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers
    }
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string; details?: { field: string; message: string }[] } | null;
    throw new ApiError(body?.error ?? "Something went wrong. Please try again.", response.status, body?.details);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ admin: Admin }>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  logout: () => request<void>("/api/auth/logout", { method: "POST" }),
  currentAdmin: () => request<{ admin: Admin }>("/api/auth/me"),
  dashboard: () => request<DashboardData>("/api/admin/dashboard"),
  configurations: (filters: Record<string, string | number | undefined>) => {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== "") query.set(key, String(value));
    });
    return request<{ configurations: Configuration[]; pagination: Pagination }>(
      `/api/admin/configurations?${query.toString()}`
    );
  },
  configuration: (id: string) =>
    request<{ configuration: Configuration }>(`/api/admin/configurations/${encodeURIComponent(id)}`),
  createConfiguration: (input: ConfigurationInput) =>
    request<{ configuration: Configuration }>("/api/admin/configurations", { method: "POST", body: JSON.stringify(input) }),
  updateConfiguration: (id: string, input: ConfigurationInput) =>
    request<{ configuration: Configuration }>(`/api/admin/configurations/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(input) }),
  configurationStatus: (id: string, status: ConfigurationStatus) =>
    request<{ configuration: Configuration }>(`/api/admin/configurations/${encodeURIComponent(id)}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  duplicateConfiguration: (id: string) =>
    request<{ configuration: Configuration }>(`/api/admin/configurations/${encodeURIComponent(id)}/duplicate`, { method: "POST" }),
  deleteConfiguration: (id: string) =>
    request<void>(`/api/admin/configurations/${encodeURIComponent(id)}`, { method: "DELETE" }),
  capabilities: () =>
    request<{ protocols: { protocol: Protocol; androidCompatible: boolean; draftsAllowed: boolean; publishingAllowed: boolean }[] }>("/api/admin/configurations/capabilities")
};
