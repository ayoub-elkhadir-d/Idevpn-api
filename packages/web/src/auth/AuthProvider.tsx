import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ApiError, api, type Admin } from "../api/client";

type AuthContextValue = {
  admin: Admin | null;
  loading: boolean;
  authError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    api.currentAdmin()
      .then(({ admin: current }) => setAdmin(current))
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 401) {
          setAdmin(null);
          return;
        }
        setAuthError(error instanceof Error ? error.message : "Could not verify the admin session.");
      })
      .finally(() => setLoading(false));
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await api.login(email, password);
    setAuthError(null);
    setAdmin(result.admin);
  }, []);

  const signOut = useCallback(async () => {
    await api.logout();
    setAdmin(null);
  }, []);

  const value = useMemo(() => ({ admin, loading, authError, signIn, signOut }), [admin, loading, authError, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
