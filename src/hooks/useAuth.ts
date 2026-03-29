import { useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";

interface JwtPayload {
  exp?: number;
}

const normalizeToken = (value: string | null) => {
  if (!value) return "";

  let token = value.trim();
  token = token.replace(/^Bearer\s+/i, "").replace(/^"|"$/g, "").trim();

  try {
    return decodeURIComponent(token);
  } catch {
    return token;
  }
};

export default function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = () => {
      const rawToken = localStorage.getItem("accessToken");
      const token = normalizeToken(rawToken);

      if (!token) {
        localStorage.removeItem("accessToken");
        setIsAuthenticated(false);
        return;
      }

      if (rawToken !== token) {
        localStorage.setItem("accessToken", token);
      }

      try {
        const decoded: JwtPayload = jwtDecode(token);
        const currentTime = Date.now() / 1000;

        if (typeof decoded.exp === "number" && decoded.exp < currentTime) {
          localStorage.removeItem("accessToken");
          setIsAuthenticated(false);
        } else {
          setIsAuthenticated(true);
        }
      } catch {
        // Some backends return non-standard/opaque tokens; allow route access
        // and let API calls be the source of truth.
        setIsAuthenticated(true);
      }
    };

    checkAuth();
  }, []);

  return isAuthenticated;
}
