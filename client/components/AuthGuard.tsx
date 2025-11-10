"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Shield, Lock } from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

// Basic JWT token format validation (3 parts separated by dots)
const isValidTokenFormat = (token: string | null): boolean => {
  if (!token) return false;
  const parts = token.split('.');
  return parts.length === 3 && parts.every(part => part.length > 0);
};

// Check if JWT token is expired (client-side check, doesn't verify signature)
const isTokenExpired = (token: string): boolean => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    
    // Decode payload (base64url)
    const payload = parts[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    
    // Check expiration
    if (decoded.exp) {
      const expTime = decoded.exp * 1000; // Convert to milliseconds
      const now = Date.now();
      return now >= expTime;
    }
    return false; // No expiration claim, assume valid
  } catch {
    return true; // If we can't decode, assume expired/invalid
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
      // Prevent multiple simultaneous checks
      if (checkingRef.current) return;
      
      // Skip if we're already on login page
      if (pathname === "/login" || pathname === "/") {
        setChecking(false);
        return;
      }
      
      // Skip if we've already determined token is invalid
      if (invalidTokenRef.current) {
        router.replace("/login");
        setChecking(false);
        return;
      }
      
      // Check sessionStorage for recent auth failure to avoid unnecessary requests
      if (typeof window !== "undefined") {
        const recentFailure = sessionStorage.getItem("auth_failed");
        const token = localStorage.getItem("token");
        // If we have a valid token but auth_failed is set, clear the flag (might be stale)
        if (recentFailure === "true" && token && isValidTokenFormat(token) && !isTokenExpired(token)) {
          try {
            sessionStorage.removeItem("auth_failed");
          } catch { }
        } else if (recentFailure === "true" && !token) {
          // Only redirect if we have no token AND the flag is set
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
        
        // If no token, skip request entirely
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
        
        // If token format is invalid, skip request entirely
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
        
        // If token is expired, skip request entirely
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
        
        // Prevent making multiple requests - if we've already made one and it failed, don't retry
        if (hasMadeRequestRef.current) {
          setChecking(false);
          checkingRef.current = false;
          return;
        }
        
        hasMadeRequestRef.current = true;

        // Only make request if token passes all client-side checks
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        
        // Use AbortController to allow cancellation if needed
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
        
        const res = await fetch(`${baseUrl}/api/user/me`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
          signal: controller.signal,
        }).catch((err) => {
          clearTimeout(timeoutId);
          // Suppress abort errors and network errors from console
          if (err.name !== 'AbortError') {
            // Silently handle - browser will still log 401s but we handle gracefully
          }
          return null;
        });
        
        clearTimeout(timeoutId);

        if (!res || !res.ok) {
          // Mark token as invalid to prevent future requests
          invalidTokenRef.current = true;
          // Always clear invalid tokens on 401 - don't rely on cache
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
        
        // Reset request flag on success
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

        // Update local cache with freshest user info
        try {
          if (typeof window !== "undefined") {
            localStorage.setItem("user", JSON.stringify(data.user));
            // Clear auth failure flag on successful auth
            sessionStorage.removeItem("auth_failed");
          }
        } catch { }

        setAuthorized(true);
      } catch (e) {
        // Mark token as invalid on any error
        invalidTokenRef.current = true;
        // Network or unexpected error: don't allow access even with cache
        // This prevents children from making API calls with invalid tokens
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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="flex flex-col items-center gap-6 p-8 bg-white rounded-2xl shadow-lg border border-slate-200 max-w-md w-full mx-4">
          {/* Animated Shield Icon */}
          <div className="relative">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center border-4 border-blue-100">
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
            {/* Outer pulsing ring */}
            <div className="absolute inset-0 rounded-full border-4 border-blue-200 animate-ping opacity-20"></div>
          </div>

          {/* Loading Text */}
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold text-slate-800">Securing Your Access</h2>
            <p className="text-slate-600 text-sm">Verifying your credentials...</p>
          </div>

          {/* Animated Loading Bar */}
          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full animate-pulse"></div>
          </div>

          {/* Security Tips */}
          <div className="text-center space-y-3 mt-2">
            <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
              <Lock className="w-3 h-3" />
              <span>Your session is encrypted</span>
            </div>
            <p className="text-xs text-slate-400">
              This should only take a moment
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!authorized) return null;

  return <>{children}</>;
}