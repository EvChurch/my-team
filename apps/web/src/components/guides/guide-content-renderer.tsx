"use client";

import { useMemo } from "react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { renderToHTMLString } from "@tiptap/static-renderer/pm/html-string";

type GuideContentRendererProps = {
  content: unknown;
};

/**
 * Renders Tiptap JSON content as HTML.
 * Uses the static renderer (no editor instance needed).
 */
export function GuideContentRenderer({ content }: GuideContentRendererProps) {
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
        ],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        content: content as any,
      });
    } catch {
      return "<p>Unable to render content.</p>";
    }
  }, [content]);

  if (!html) {
    return (
      <p className="text-sm text-text-secondary italic">
        This guide has no content yet.
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
