import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./auth/AuthProvider";
import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/Login";
import { AdminLayout } from "./components/AdminLayout";
import { SectionPage } from "./pages/SectionPage";
import { ConfigurationsPage } from "./pages/ConfigurationsPage";

function ProtectedApp() {
  const { admin, loading, authError } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-ink"><div className="loading-mark" /></div>;
  }
  if (authError) {
    return <div className="grid min-h-screen place-items-center bg-ink px-6 text-center">
      <div><div className="text-sm font-semibold text-white">Unable to verify your session</div><p className="mt-2 text-xs text-muted">{authError}</p><button className="select-small mx-auto mt-5" onClick={() => window.location.reload()}>Try again</button></div>
    </div>;
  }
  if (!admin) return <Navigate to="/login" replace state={{ from: location }} />;

  return (
    <AdminLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/configurations" element={<ConfigurationsPage />} />
        <Route path="/users" element={<SectionPage section="Users" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AdminLayout>
  );
}

export function App() {
  const { admin } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={admin ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/*" element={<ProtectedApp />} />
    </Routes>
  );
}
