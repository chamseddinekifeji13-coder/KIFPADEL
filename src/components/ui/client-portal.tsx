"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/** Monte les overlays (modales) sur `document.body` — évite les bugs `fixed` sur Android Chrome. */
export function ClientPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  return createPortal(children, document.body);
}
