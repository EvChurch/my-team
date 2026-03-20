"use client";

import { TRPCReactProvider } from "@repo/api/client";

export function Providers({ children }: { children: React.ReactNode }) {
  return <TRPCReactProvider>{children}</TRPCReactProvider>;
}
