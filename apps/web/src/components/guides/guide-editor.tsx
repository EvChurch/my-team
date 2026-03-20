"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { EditorToolbar } from "./editor-toolbar";

type GuideEditorProps = {
  content?: unknown;
  onChange: (json: unknown) => void;
};

/**
 * Rich text editor for guide content.
 * Uses Tiptap 3 with StarterKit + Image extension.
 * Content is stored/loaded as JSON.
 */
export function GuideEditor({ content, onChange }: GuideEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Image,
    ],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    content: (content as any) ?? {
      type: "doc",
      content: [{ type: "paragraph" }],
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
  });

  if (!editor) {
    return (
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="h-10 border-b border-border bg-bg-muted animate-pulse" />
        <div className="h-64 bg-bg-card animate-pulse" />
      </div>
    );
  }

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-bg-card">
      <EditorToolbar editor={editor} />
      <EditorContent
        editor={editor}
        className="guide-editor-content px-4 py-3 min-h-[300px] text-sm text-text-primary outline-none [&_.tiptap]:outline-none [&_.tiptap]:min-h-[280px] [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mb-1 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2 [&_li]:mb-1 [&_a]:text-accent [&_a]:underline [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-2"
      />
    </div>
  );
}
