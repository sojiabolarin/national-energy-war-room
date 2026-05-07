import { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from "react";
import { setAuthTokenGetter, setSilentRefreshFn, useGetMe } from "@workspace/api-client-react";
import type { UserProfile } from "@workspace/api-client-react";

interface AuthContextType {
  user: UserProfile | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (accessToken: string, refreshToken?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Access token — memory only (never persisted to any browser storage)
  const [accessToken, setAccessToken] = useState<string | null>(null);
  // Refresh token — memory only for security; session is lost on page reload
  const refreshTokenRef = useRef<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const refreshingRef = useRef(false);

  const doRefresh = useCallback(async (): Promise<string | null> => {
    if (refreshingRef.current) return null;
    const rt = refreshTokenRef.current;
    if (!rt) return null;

    refreshingRef.current = true;
    try {
      const res = await fetch("/api/v1/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: rt }),
      });

      if (!res.ok) {
        refreshTokenRef.current = null;
        setAccessToken(null);
        return null;
      }

      const json = await res.json() as { data?: { accessToken?: string; refreshToken?: string } };
      const newAt = json.data?.accessToken ?? null;
      const newRt = json.data?.refreshToken ?? null;

      if (newAt) {
        setAccessToken(newAt);
        if (newRt) refreshTokenRef.current = newRt;
      }
      return newAt;
    } catch {
      return null;
    } finally {
      refreshingRef.current = false;
    }
  }, []);

  useEffect(() => {
    // No stored token — user must log in fresh each session
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    setAuthTokenGetter(() => accessToken);
    setSilentRefreshFn(doRefresh);
  }, [accessToken, doRefresh]);

  const { data: user, isLoading: userLoading, isError } = useGetMe({
    query: {
      queryKey: ["getMe", accessToken],
      enabled: isInitialized && !!accessToken,
      retry: false,
      staleTime: 5 * 60 * 1000,
    },
  });

  useEffect(() => {
    if (isError) setAccessToken(null);
  }, [isError]);

  const login = useCallback((token: string, refreshToken?: string) => {
    setAccessToken(token);
    if (refreshToken) refreshTokenRef.current = refreshToken;
  }, []);

  const logout = useCallback(() => {
    const rt = refreshTokenRef.current;
    if (rt) {
      fetch("/api/v1/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: rt }),
      }).catch(() => {});
    }
    setAccessToken(null);
    refreshTokenRef.current = null;
  }, []);

  const isLoading = !isInitialized || (userLoading && !!accessToken);

  return (
    <AuthContext.Provider value={{ user: user ?? null, accessToken, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
