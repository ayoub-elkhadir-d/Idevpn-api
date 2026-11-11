import { Router } from "express";
import { requireAdmin } from "../auth/middleware.js";

export const adminRouter = Router();

adminRouter.use(requireAdmin);

adminRouter.get("/dashboard", (_request, response) => {
  response.json({
    stats: [
      { label: "Active configurations", value: "1,284", change: "+12.8%", tone: "positive" },
      { label: "Online servers", value: "24", change: "of 28 regions", tone: "neutral" },
      { label: "Connected users", value: "8,942", change: "+8.2%", tone: "positive" },
      { label: "Bandwidth this month", value: "18.6 TB", change: "+4.3%", tone: "positive" }
    ],
    chart: [24, 31, 28, 42, 37, 49, 45, 59, 52, 68, 61, 76],
    recentActivity: [
      { id: "1", title: "New server added", detail: "Frankfurt, Germany · DE-FRA-04", time: "2 min ago", status: "success" },
      { id: "2", title: "Configuration updated", detail: "Stealth Protocol · v2.4.1", time: "18 min ago", status: "info" },
      { id: "3", title: "Carrier profile synced", detail: "Orange France · 12 new endpoints", time: "42 min ago", status: "success" },
      { id: "4", title: "Server health check", detail: "Singapore · SG-SIN-02 · 142 ms", time: "1 hour ago", status: "warning" }
    ]
  });
});
