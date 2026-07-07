import { mergeAttributes, Node } from "@tiptap/core";
import type { DOMOutputSpec } from "@tiptap/pm/model";
import { Plugin } from "@tiptap/pm/state";
import messages from "../../../messages/en.json";

export type GuideResourceKind = "file" | "google_drive";

type ResourceCardAttributes = {
  title: string | null;
  url: string | null;
  kind: GuideResourceKind;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
};

const removeResourceLabel = messages.Guides.removeResource;

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

function fileTypeBadge(attrs: ResourceCardAttributes) {
  const url = attrs.url ?? "";
  const mimeType = attrs.mimeType ?? "";

  if (url.includes("docs.google.com/document")) return "DOC";
  if (url.includes("docs.google.com/spreadsheets")) return "XLS";
  if (url.includes("docs.google.com/presentation")) return "PPT";
  if (url.includes("docs.google.com/forms")) return "FORM";
  if (url.includes("docs.google.com/drawings")) return "DRAW";
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType.startsWith("image/")) return "IMG";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) {
    return "XLS";
  }
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) {
    return "PPT";
  }
  if (mimeType.includes("document") || mimeType.includes("word")) return "DOC";

  return "FILE";
}

function applyResourceCardData(
  element: HTMLElement,
  attrs: ResourceCardAttributes,
) {
  element.dataset.type = "guide-resource-card";
  element.dataset.kind = attrs.kind;
  if (attrs.url) element.dataset.url = attrs.url;
  if (attrs.title) element.dataset.title = attrs.title;
  if (attrs.fileName) element.dataset.fileName = attrs.fileName;
  if (attrs.mimeType) element.dataset.mimeType = attrs.mimeType;
  if (attrs.fileSize) element.dataset.fileSize = String(attrs.fileSize);
}

function createResourceCardElement(
  attrs: ResourceCardAttributes,
  options: { asLink: boolean },
) {
  const title = attrs.title || attrs.fileName || attrs.url || "Resource";
  const label = kindLabel(attrs.kind, attrs.mimeType);
  const badge = fileTypeBadge(attrs);
  const size = formatBytes(attrs.fileSize);
  const card = document.createElement("div");
  applyResourceCardData(card, attrs);
  card.className =
    "guide-resource-card group my-3 rounded-xl border border-border bg-bg-muted/45 shadow-[var(--shadow-card)] transition-colors hover:bg-bg-muted/70 hover:shadow-md";

  const body = document.createElement(options.asLink ? "a" : "div");
  body.className = "flex items-center gap-3 p-3 no-underline";
  if (body instanceof HTMLAnchorElement) {
    body.href = attrs.url ?? "#";
    body.target = "_blank";
    body.rel = "noreferrer";
  } else {
    body.setAttribute("role", "button");
    body.tabIndex = 0;
  }

  const icon = document.createElement("span");
  icon.className =
    "flex h-10 w-10 shrink-0 items-center justify-center text-text-secondary transition-colors group-hover:text-text-primary";

  const fileShape = document.createElement("span");
  fileShape.className =
    "relative flex h-9 w-7 items-end justify-center rounded-md border border-border bg-bg-page pb-1 text-[7px] font-semibold uppercase shadow-[0_1px_2px_rgba(26,25,24,0.05)] transition-colors group-hover:bg-bg-card";

  const foldedCorner = document.createElement("span");
  foldedCorner.className =
    "absolute right-0 top-0 h-2 w-2 rounded-bl-sm border-b border-l border-border bg-bg-muted";

  fileShape.append(foldedCorner, badge);
  icon.append(fileShape);

  const text = document.createElement("span");
  text.className = "min-w-0 flex-1";

  const type = document.createElement("span");
  type.className = "block text-[10px] font-semibold uppercase text-text-tertiary";
  type.textContent = label;

  const titleElement = document.createElement("span");
  titleElement.className =
    "mt-0.5 block truncate text-sm font-semibold text-text-primary";
  titleElement.textContent = title;

  const meta = document.createElement("span");
  meta.className = size
    ? "mt-0.5 block truncate text-xs text-text-secondary"
    : "sr-only";
  meta.textContent = size ?? label;

  text.append(type, titleElement, meta);
  body.append(icon, text);

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "guide-resource-card-remove";
  removeButton.dataset.resourceCardRemove = "true";
  removeButton.setAttribute("aria-label", removeResourceLabel);

  card.append(body, removeButton);
  return card;
}

function renderResourceCard(attrs: ResourceCardAttributes): DOMOutputSpec {
  const title = attrs.title || attrs.fileName || attrs.url || "Resource";
  const label = kindLabel(attrs.kind, attrs.mimeType);
  const badge = fileTypeBadge(attrs);
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
        "guide-resource-card group my-3 rounded-xl border border-border bg-bg-muted/45 shadow-[var(--shadow-card)] transition-colors hover:bg-bg-muted/70 hover:shadow-md",
    }),
    [
      "a",
      {
        href: attrs.url ?? "#",
        target: "_blank",
        rel: "noreferrer",
        class: "flex items-center gap-3 p-3 no-underline",
      },
      [
        "span",
        {
          class:
            "flex h-10 w-10 shrink-0 items-center justify-center text-text-secondary transition-colors group-hover:text-text-primary",
        },
        [
          "span",
          {
            class:
              "relative flex h-9 w-7 items-end justify-center rounded-md border border-border bg-bg-page pb-1 text-[7px] font-semibold uppercase shadow-[0_1px_2px_rgba(26,25,24,0.05)] transition-colors group-hover:bg-bg-card",
          },
          [
            "span",
            {
              class:
                "absolute right-0 top-0 h-2 w-2 rounded-bl-sm border-b border-l border-border bg-bg-muted",
            },
          ],
          badge,
        ],
      ],
      [
        "span",
        {
          class: "min-w-0 flex-1",
        },
        [
          "span",
          {
            class:
              "block text-[10px] font-semibold uppercase text-text-tertiary",
          },
          label,
        ],
        [
          "span",
          {
            class: "mt-0.5 block truncate text-sm font-semibold text-text-primary",
          },
          title,
        ],
        size
          ? [
              "span",
              {
                class: "mt-0.5 block truncate text-xs text-text-secondary",
              },
              size,
            ]
          : ["span", { class: "sr-only" }, label],
      ],
    ],
    [
      "button",
      {
        type: "button",
        class: "guide-resource-card-remove",
        "data-resource-card-remove": "true",
        "aria-label": removeResourceLabel,
      },
    ],
  ];
}

export const ResourceCard = Node.create({
  name: "resourceCard",
  group: "block",
  atom: true,
  selectable: true,

  addNodeView() {
    return ({ node }) => ({
      dom: createResourceCardElement(node.attrs as ResourceCardAttributes, {
        asLink: false,
      }),
    });
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleDOMEvents: {
            click: (_view, event) => {
              const target = event.target;
              if (!(target instanceof HTMLElement)) return false;

              const card = target.closest('[data-type="guide-resource-card"]');
              if (!card) return false;

              event.preventDefault();
              event.stopPropagation();
              return true;
            },
          },
        },
      }),
    ];
  },

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
