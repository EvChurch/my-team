---
title: "Tiptap 3 rich text editor in Next.js with JSON storage"
category: integration-issues
date: 2026-03-20
tags: [tiptap, rich-text, nextjs, ssr, json]
components: [apps/web/src/components/guides]
severity: low
---

# Tiptap 3 Rich Text Editor in Next.js with JSON Storage

## Problem

Integrating Tiptap 3 as a rich text editor in Next.js with server-side rendering, storing content as JSON for cross-platform portability (future mobile app).

## Key Learnings

### immediatelyRender: false is mandatory

Without this, Tiptap tries to render before hydration completes, causing mismatches:

```typescript
const editor = useEditor({
  immediatelyRender: false,  // REQUIRED for Next.js
  extensions: [StarterKit, Image],
  content: initialContent,
});
```

### StarterKit v3 bundles Link and Underline

No need to install `@tiptap/extension-link` separately — it's in StarterKit. Only `@tiptap/extension-image` needs separate installation.

If you need custom Link config, disable the built-in one:
```typescript
StarterKit.configure({ link: false })
```

### JSON storage pattern

Store as Prisma `Json` column. Save with `editor.getJSON()`, load by passing to `content` prop:

```typescript
// Save
const json = editor.getJSON();
await guides.update.mutate({ id, content: json });

// Load
const editor = useEditor({
  content: guide.content,  // JSON from database
});
```

### Server-side rendering of stored content

For guide detail pages (Server Components), use the static renderer:

```typescript
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";

const html = generateHTML(guide.content, [StarterKit, Image]);
```

Then render with `dangerouslySetInnerHTML` and style the output with a `.guide-content` CSS class targeting semantic HTML elements (h1-h3, p, ul, ol, a, img).

### BubbleMenu/FloatingMenu imports changed in v3

Import from `@tiptap/react/menus`, NOT `@tiptap/react`.

## Prevention

- Always set `immediatelyRender: false` when using Tiptap in Next.js/SSR contexts
- Add `.guide-content` styles to globals.css for rendered HTML — Tailwind's reset strips default heading/list styles
- Test editor with empty content, existing content, and content with images to catch edge cases
