"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { defaultLocale } from "@/i18n/config";

export function LocaleSync({
  dbLocale,
  cookieLocale,
}: {
  dbLocale: string;
  cookieLocale: string | undefined;
}) {
  const router = useRouter();

  useEffect(() => {
    const locale = dbLocale === defaultLocale ? dbLocale : defaultLocale;

    if (locale !== cookieLocale) {
      document.cookie = `locale=${locale};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
      router.refresh();
    }
  }, [dbLocale, cookieLocale, router]);

  return null;
}
