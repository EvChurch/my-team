"use client";

import { TRPCReactProvider } from "@mt/api/client";
import { ToastProvider } from "@/components/ui/toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TRPCReactProvider>
      <ToastProvider>{children}</ToastProvider>
    </TRPCReactProvider>
  );
}
