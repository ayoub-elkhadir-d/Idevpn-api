import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const { VITE_API_BASE_URL: apiBaseUrl } = loadEnv(mode, process.cwd(), "");
  if (mode === "production" && !apiBaseUrl) {
    throw new Error("VITE_API_BASE_URL must be set to the HTTPS API origin for production builds.");
  }
  if (apiBaseUrl) {
    let apiUrl: URL;
    try {
      apiUrl = new URL(apiBaseUrl);
    } catch {
      throw new Error("VITE_API_BASE_URL must be an absolute HTTP or HTTPS origin.");
    }
    if (!["http:", "https:"].includes(apiUrl.protocol)
      || apiUrl.username || apiUrl.password || apiUrl.search || apiUrl.hash
      || (apiUrl.pathname !== "/" && apiUrl.pathname !== "")
      || (mode === "production" && apiUrl.protocol !== "https:")) {
      throw new Error(mode === "production"
        ? "VITE_API_BASE_URL must be an HTTPS origin without a path in production."
        : "VITE_API_BASE_URL must be an absolute HTTP or HTTPS origin without a path.");
    }
  }

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/api": "http://localhost:4000"
      }
    }
  };
});
