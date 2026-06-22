import { mergeAttributes, Node } from "@tiptap/core";
import type { DOMOutputSpec } from "@tiptap/pm/model";

export type GuideResourceKind = "file" | "google_drive";

type ResourceCardAttributes = {
  title: string | null;
  url: string | null;
  kind: GuideResourceKind;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
};

function formatBytes(bytes: number | null) {
  if (!bytes) return null;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function kindLabel(kind: GuideResourceKind, mimeType: string | null) {
  if (kind === "google_drive") return "Google Drive";
  if (mimeType === "application/pdf") return "PDF";
  return "File";
}

function renderResourceCard(attrs: ResourceCardAttributes): DOMOutputSpec {
  const title = attrs.title || attrs.fileName || attrs.url || "Resource";
  const label = kindLabel(attrs.kind, attrs.mimeType);
  const size = formatBytes(attrs.fileSize);

  return [
    "div",
    mergeAttributes({
      "data-type": "guide-resource-card",
      "data-kind": attrs.kind,
      "data-url": attrs.url,
      "data-title": attrs.title,
      "data-file-name": attrs.fileName,
      "data-mime-type": attrs.mimeType,
      "data-file-size": attrs.fileSize,
      class:
        "guide-resource-card my-3 rounded-xl border border-border bg-bg-muted/45 p-4",
    }),
    [
      "a",
      {
        href: attrs.url ?? "#",
        target: "_blank",
        rel: "noreferrer",
        class: "block no-underline",
      },
      [
        "span",
        {
          class:
            "block text-xs font-semibold uppercase tracking-wide text-text-tertiary",
        },
        label,
      ],
      [
        "span",
        {
          class: "mt-1 block text-sm font-semibold text-text-primary",
        },
        title,
      ],
      size
        ? [
            "span",
            {
              class: "mt-1 block text-xs text-text-secondary",
            },
            size,
          ]
        : [
            "span",
            {
              class: "mt-1 block text-xs text-text-secondary",
            },
            attrs.url ?? "",
          ],
    ],
  ];
}

export const ResourceCard = Node.create({
  name: "resourceCard",
  group: "block",
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      title: { default: null },
      url: { default: null },
      kind: { default: "file" },
      fileName: { default: null },
      mimeType: { default: null },
      fileSize: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="guide-resource-card"]',
        getAttrs: (node) => {
          if (!(node instanceof HTMLElement)) return false;
          return {
            title: node.dataset.title || null,
            url: node.dataset.url || null,
            kind: node.dataset.kind || "file",
            fileName: node.dataset.fileName || null,
            mimeType: node.dataset.mimeType || null,
            fileSize: node.dataset.fileSize
              ? Number(node.dataset.fileSize)
              : null,
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return renderResourceCard(HTMLAttributes as ResourceCardAttributes);
  },
});
