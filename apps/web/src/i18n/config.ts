export const locales = [
  "en",
  "zh-CN",
  "zh-TW",
  "mi",
  "sm",
  "hi",
  "ko",
  "to",
  "tl",
  "ja",
] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";
