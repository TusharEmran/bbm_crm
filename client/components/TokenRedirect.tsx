"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function TokenRedirect() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const check = () => {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        if (!token && pathname !== "/login") {
          router.replace("/login");
        }
      } catch {}
    };

    check();

    const onVisibility = () => {
      if (document.visibilityState === "visible") check();
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key === "token") check();
    };

    window.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("storage", onStorage);
    };
  }, [pathname, router]);

  return null;
}
