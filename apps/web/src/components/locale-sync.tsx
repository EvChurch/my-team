"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function LocaleSync({
  dbLocale,
  cookieLocale,
}: {
  dbLocale: string;
  cookieLocale: string | undefined;
}) {
  const router = useRouter();

  useEffect(() => {
    if (dbLocale && dbLocale !== cookieLocale) {
      document.cookie = `locale=${dbLocale};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
      router.refresh();
    }
  }, [dbLocale, cookieLocale, router]);

  return null;
}
