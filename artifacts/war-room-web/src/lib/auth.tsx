import { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from "react";
import { setAuthTokenGetter, setSilentRefreshFn, useGetMe } from "@workspace/api-client-react";
import type { UserProfile } from "@workspace/api-client-react";

interface AuthContextType {
  user: UserProfile | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (accessToken: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Access token — memory only (never persisted to any browser storage)
  const [accessToken, setAccessToken] = useState<string | null>(null);
  // Refresh token is managed server-side via httpOnly cookie — never stored in JS
  const [isInitialized, setIsInitialized] = useState(false);
  const refreshingRef = useRef(false);

  const doRefresh = useCallback(async (): Promise<string | null> => {
    if (refreshingRef.current) return null;
    refreshingRef.current = true;
    try {
      // Cookie is sent automatically — no refresh token needed in the request body
      const res = await fetch("/api/v1/auth/refresh", {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        setAccessToken(null);
        return null;
      }

      const json = await res.json() as { data?: { accessToken?: string } };
      const newAt = json.data?.accessToken ?? null;
      if (newAt) setAccessToken(newAt);
      return newAt;
    } catch {
      return null;
    } finally {
      refreshingRef.current = false;
    }
  }, []);

  useEffect(() => {
    // No stored access token — user must log in fresh each session.
    // Refresh token lives in an httpOnly cookie; we probe it silently on mount.
    doRefresh().finally(() => setIsInitialized(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setAuthTokenGetter(() => accessToken);
    setSilentRefreshFn(doRefresh);
  }, [accessToken, doRefresh]);

  const { data: rawUserResponse, isLoading: userLoading, isError } = useGetMe({
    query: {
      queryKey: ["getMe", accessToken],
      enabled: isInitialized && !!accessToken,
      retry: false,
      staleTime: 5 * 60 * 1000,
    },
  });

  // The API wraps the response in { data: UserProfile }; unwrap it here
  const user = (rawUserResponse as unknown as { data?: UserProfile })?.data ?? null;

  useEffect(() => {
    if (isError) setAccessToken(null);
  }, [isError]);

  const login = useCallback((token: string) => {
    setAccessToken(token);
    // Refresh token is set as httpOnly cookie by the server — no JS handling needed
  }, []);

  const logout = useCallback(() => {
    const at = accessToken;
    setAccessToken(null);
    // Clear the server-side session (refresh token cookie + DB record)
    fetch("/api/v1/auth/logout", {
      method: "POST",
      credentials: "include",
      headers: at ? { Authorization: `Bearer ${at}` } : {},
    }).catch(() => {});
  }, [accessToken]);

  const isLoading = !isInitialized || (userLoading && !!accessToken);

  return (
    <AuthContext.Provider value={{ user, accessToken, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
