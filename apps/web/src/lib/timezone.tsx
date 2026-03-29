"use client";

import { createContext, useContext, useEffect } from "react";

const TimezoneContext = createContext<string>("UTC");

export function useTimezone(): string {
  return useContext(TimezoneContext);
}

export function TimezoneProvider({
  serverTimezone,
  children,
}: {
  serverTimezone: string;
  children: React.ReactNode;
}) {
  // Set timezone cookie on mount so future SSR requests have it
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    document.cookie = `tz=${tz};path=/;max-age=31536000;SameSite=Lax`;
  }, []);

  // On client, always use the real timezone. On server, use whatever was in the cookie.
  const tz =
    typeof window !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : serverTimezone;

  return (
    <TimezoneContext.Provider value={tz}>{children}</TimezoneContext.Provider>
  );
}
