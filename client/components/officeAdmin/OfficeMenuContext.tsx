"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

interface OfficeMenuContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const OfficeMenuContext = createContext<OfficeMenuContextValue | undefined>(undefined);

export function MenuProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  return (
    <OfficeMenuContext.Provider value={{ isOpen, open, close, toggle }}>
      {children}
    </OfficeMenuContext.Provider>
  );
}

export function useMenu() {
  const ctx = useContext(OfficeMenuContext);
  if (!ctx) throw new Error("useMenu must be used within MenuProvider");
  return ctx;
}


