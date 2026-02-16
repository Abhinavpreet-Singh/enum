import { useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";

interface JwtPayload {
  exp: number;
}

export default function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("accessToken");

      if (!token) {
        setIsAuthenticated(false);
        return;
      }

      try {
        const decoded: JwtPayload = jwtDecode(token);
        const currentTime = Date.now() / 1000;

        if (decoded.exp < currentTime) {
          localStorage.removeItem("accessToken");
          setIsAuthenticated(false);
        } else {
          setIsAuthenticated(true);
        }
      } catch {
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, []);

  return isAuthenticated;
}
