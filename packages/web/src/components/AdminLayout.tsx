import { useState, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  ChevronLeft, ChevronRight, CircleHelp, Command, LayoutDashboard,
  LockKeyhole, Menu, Network, Users, X
} from "lucide-react";
import { Brand } from "./Brand";
import { useAuth } from "../auth/AuthProvider";

const navigation = [
  { label: "Dashboard", to: "/", icon: LayoutDashboard },
  { label: "Configurations", to: "/configurations", icon: Network },
  { label: "Users", to: "/users", icon: Users }
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const { admin, signOut } = useAuth();
  const location = useLocation();
  const pageTitle = navigation.find((item) => item.to === location.pathname)?.label
    ?? "Dashboard";

  async function handleSignOut() {
    setLogoutError("");
    try {
      await signOut();
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : "Could not sign out. Please try again.");
    }
  }

  return (
    <div className="min-h-screen bg-ink text-white">
      {mobileOpen && <button className="mobile-backdrop" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar ${collapsed ? "sidebar-collapsed" : ""} ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="flex h-[76px] items-center justify-between border-b border-line px-5">
          <Brand />
          <button className="icon-button hidden lg:grid" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
          <button className="icon-button lg:hidden" aria-label="Close navigation" onClick={() => setMobileOpen(false)}><X size={17} /></button>
        </div>

        <div className="px-3 pt-7">
          <div className="sidebar-label">{!collapsed && "Workspace"}</div>
          <nav className="mt-3 space-y-1">
            {navigation.map(({ label, to, icon: Icon }) => (
              <NavLink key={to} to={to} end={to === "/"} onClick={() => setMobileOpen(false)} title={collapsed ? label : undefined}
                className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}>
                <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="sidebar-bottom">
          {!collapsed && <div className="upgrade-card">
            <div className="flex items-center gap-2 text-[12px] font-medium text-white"><LockKeyhole size={14} className="text-accent" /> Infrastructure secure</div>
            <p className="mt-2 text-[11px] leading-5 text-muted">All systems are protected with end-to-end encryption.</p>
            <div className="mt-3 flex items-center gap-2 text-[10px] font-medium text-emerald-300"><span className="status-dot" /> All systems operational</div>
          </div>}
          <button className="profile-button" onClick={() => void handleSignOut()} title="Sign out">
            <div className="avatar">{admin?.email?.slice(0, 1).toUpperCase() ?? "A"}</div>
            {!collapsed && <div className="min-w-0 flex-1 text-left"><div className="truncate text-[12px] font-medium text-white">Administrator</div><div className="truncate text-[10px] text-muted">{admin?.email}</div></div>}
            {!collapsed && <span className="text-[10px] text-muted">Sign out</span>}
          </button>
        </div>
      </aside>

      <main className={`main-shell ${collapsed ? "main-shell-collapsed" : ""}`}>
        <header className="topbar">
          <div className="flex items-center gap-3">
            <button className="icon-button lg:hidden" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={19} /></button>
            <div className="text-[13px] text-muted">Workspace <span className="mx-2 text-[#414756]">/</span><span className="font-medium text-white">{pageTitle}</span></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="environment-pill"><span className="status-dot" /> Production</div>
            <button className="icon-button topbar-help" aria-label="Help"><CircleHelp size={17} /></button>
            <div className="topbar-divider" />
            <div className="topbar-user hidden sm:flex"><span className="avatar avatar-small">{admin?.email?.slice(0, 1).toUpperCase() ?? "A"}</span><span>{admin?.email?.split("@")[0]}</span></div>
          </div>
        </header>
        {logoutError && <div className="mx-6 mt-4 form-error sm:mx-8" role="alert">{logoutError}</div>}
        <div className="page-content">{children}</div>
        <footer className="page-footer"><span>ULTIMATE TUNNEL <span className="text-[#505667]">·</span> ADMIN CONSOLE</span><span className="footer-version"><Command size={12} /> v1.0.0</span></footer>
      </main>
    </div>
  );
}
