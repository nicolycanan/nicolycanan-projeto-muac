"use client";

import { useReveal } from "@/hooks/useReveal";

export function RevealGroup({ children }: { children: React.ReactNode }) {
  const ref = useReveal<HTMLDivElement>();
  return <div ref={ref}>{children}</div>;
}
