"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Shield, Lock } from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

const isValidTokenFormat = (token: string | null): boolean => {
  if (!token) return false;
  const parts = token.split('.');
  return parts.length === 3 && parts.every(part => part.length > 0);
};

const isTokenExpired = (token: string): boolean => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;

    const payload = parts[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));

    if (decoded.exp) {
      const expTime = decoded.exp * 1000; 
      const now = Date.now();
      return now >= expTime;
    }
    return false; 
  } catch {
    return true; 
  }
};

export default function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const checkingRef = useRef(false);
  const invalidTokenRef = useRef(false);
  const hasMadeRequestRef = useRef(false);

  useEffect(() => {
    const checkAuth = async () => {

      if (checkingRef.current) return;

      if (pathname === "/login" || pathname === "/") {
        setChecking(false);
        return;
      }

      if (invalidTokenRef.current) {
        router.replace("/login");
        setChecking(false);
        return;
      }

      if (typeof window !== "undefined") {
        const recentFailure = sessionStorage.getItem("auth_failed");
        const token = localStorage.getItem("token");

        if (recentFailure === "true" && token && isValidTokenFormat(token) && !isTokenExpired(token)) {
          try {
            sessionStorage.removeItem("auth_failed");
          } catch { }
        } else if (recentFailure === "true" && !token) {

          try {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
          } catch { }
          router.replace("/login");
          setChecking(false);
          return;
        }
      }

      checkingRef.current = true;

      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

        if (!token) {
          invalidTokenRef.current = true;
          try {
            if (typeof window !== "undefined") {
              localStorage.removeItem("token");
              localStorage.removeItem("user");
              sessionStorage.setItem("auth_failed", "true");
            }
          } catch { }
          router.replace("/login");
          setChecking(false);
          checkingRef.current = false;
          return;
        }

        if (!isValidTokenFormat(token)) {
          invalidTokenRef.current = true;
          try {
            if (typeof window !== "undefined") {
              localStorage.removeItem("token");
              localStorage.removeItem("user");
              sessionStorage.setItem("auth_failed", "true");
            }
          } catch { }
          router.replace("/login");
          setChecking(false);
          checkingRef.current = false;
          return;
        }

        if (isTokenExpired(token)) {
          invalidTokenRef.current = true;
          try {
            if (typeof window !== "undefined") {
              localStorage.removeItem("token");
              localStorage.removeItem("user");
              sessionStorage.setItem("auth_failed", "true");
            }
          } catch { }
          router.replace("/login");
          setChecking(false);
          checkingRef.current = false;
          return;
        }

        if (hasMadeRequestRef.current) {
          setChecking(false);
          checkingRef.current = false;
          return;
        }

        hasMadeRequestRef.current = true;

        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); 

        const res = await fetch(`${baseUrl}/api/user/me`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
          signal: controller.signal,
        }).catch((err) => {
          clearTimeout(timeoutId);

          if (err.name !== 'AbortError') {

          }
          return null;
        });

        clearTimeout(timeoutId);

        if (!res || !res.ok) {

          invalidTokenRef.current = true;

          try {
            if (typeof window !== "undefined") {
              localStorage.removeItem("token");
              localStorage.removeItem("user");
              sessionStorage.setItem("auth_failed", "true");
            }
          } catch { }
          router.replace("/login");
          setChecking(false);
          checkingRef.current = false;
          return;
        }

        hasMadeRequestRef.current = false;

        const data = await res.json();
        const role = data?.user?.role as string | undefined;
        if (!role || !allowedRoles.includes(role)) {
          invalidTokenRef.current = true;
          try {
            if (typeof window !== "undefined") {
              localStorage.removeItem("token");
              localStorage.removeItem("user");
              sessionStorage.setItem("auth_failed", "true");
            }
          } catch { }
          router.replace("/login");
          setChecking(false);
          checkingRef.current = false;
          return;
        }

        try {
          if (typeof window !== "undefined") {
            localStorage.setItem("user", JSON.stringify(data.user));

            sessionStorage.removeItem("auth_failed");
          }
        } catch { }

        setAuthorized(true);
      } catch (e) {

        invalidTokenRef.current = true;

        try {
          if (typeof window !== "undefined") {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
          }
        } catch { }
        router.replace("/login");
      } finally {
        setChecking(false);
        checkingRef.current = false;
      }
    };
    checkAuth();

  }, [router, allowedRoles, pathname]);

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-linear-0-to-br from-blue-50 to-indigo-50">
        <div className="flex flex-col items-center gap-6 p-8 bg-white rounded-2xl shadow-xl border border-gray-100">

          <div className="w-16 h-16 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin"></div>

          <h2 className="text-xl font-semibold text-gray-800">Please wait loading</h2>

          <div className="flex items-center gap-2 mt-2 text-blue-500">
            <Shield className="w-5 h-5 animate-pulse" />
            <span className="text-sm font-medium">Securely verifying your session</span>
          </div>
        </div>
      </div>
    );
  };

  if (!authorized) return null;

  return <>{children}</>;
}


