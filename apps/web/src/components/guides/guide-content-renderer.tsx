"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import { renderToHTMLString } from "@tiptap/static-renderer/pm/html-string";
import { ResourceCard } from "./resource-card-extension";

type GuideContentRendererProps = {
  content: unknown;
};

/**
 * Renders Tiptap JSON content as HTML.
 * Uses the static renderer (no editor instance needed).
 */
export function GuideContentRenderer({ content }: GuideContentRendererProps) {
  const t = useTranslations("Guides");
  const html = useMemo(() => {
    if (!content || typeof content !== "object") {
      return "";
    }

    try {
      return renderToHTMLString({
        extensions: [
          StarterKit.configure({
            heading: { levels: [1, 2, 3] },
          }),
          Image,
          Youtube.configure({
            nocookie: true,
            width: 640,
            height: 360,
            HTMLAttributes: {
              class: "guide-youtube-iframe",
            },
          }),
          ResourceCard,
        ],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        content: content as any,
      });
    } catch {
      return `<p>${t("unableToRenderContent")}</p>`;
    }
  }, [content, t]);

  if (!html) {
    return (
      <p className="text-sm text-text-secondary italic">
        {t("guideNoContent")}
      </p>
    );
  }

  return (
    <div
      className="guide-content"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
