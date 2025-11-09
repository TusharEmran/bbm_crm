"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

export interface ShowroomMenuContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export const ShowroomMenuContext = createContext<ShowroomMenuContextValue | undefined>(undefined);

export function MenuProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  return (
    <ShowroomMenuContext.Provider value={{ isOpen, open, close, toggle }}>
      {children}
    </ShowroomMenuContext.Provider>
  );
}

export function useMenu() {
  const ctx = useContext(ShowroomMenuContext);
  if (!ctx) throw new Error("useMenu must be used within MenuProvider");
  return ctx;
}


