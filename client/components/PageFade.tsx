"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function PageFade({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [key, setKey] = useState<string>("initial");

  useEffect(() => {
    // Change key on path change to retrigger CSS animation
    setKey(`${pathname ?? ""}-${Date.now()}`);
  }, [pathname]);

  return (
    <div key={key} className="page-fade">
      {children}
    </div>
  );
}
