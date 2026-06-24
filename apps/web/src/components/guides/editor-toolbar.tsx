"use client";

import { useRef } from "react";
import type { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link as LinkIcon,
  ImageIcon,
  Loader2,
  Paperclip,
  HardDrive,
  Youtube,
} from "lucide-react";

type EditorToolbarProps = {
  editor: Editor;
  isUploadingAsset?: boolean;
  onUploadImage?: (file: File) => void | Promise<void>;
  onUploadFile?: (file: File) => void | Promise<void>;
  onAddDriveFile?: () => void;
  onAddYouTubeVideo?: () => void;
  youtubeTitle: string;
};

export function EditorToolbar({
  editor,
  isUploadingAsset = false,
  onUploadImage,
  onUploadFile,
  onAddDriveFile,
  onAddYouTubeVideo,
  youtubeTitle,
}: EditorToolbarProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLink = () => {
    const url = window.prompt("Enter URL");
    if (url) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  };

  const addImage = () => {
    if (onUploadImage) {
      imageInputRef.current?.click();
      return;
    }

    const url = window.prompt("Enter image URL");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  return (
    <div className="flex items-center gap-0.5 flex-wrap border-b border-border px-2 py-1.5">
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive("bold")}
        title="Bold"
      >
        <Bold className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive("italic")}
        title="Italic"
      >
        <Italic className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive("heading", { level: 1 })}
        title="Heading 1"
      >
        <Heading1 className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive("heading", { level: 2 })}
        title="Heading 2"
      >
        <Heading2 className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive("heading", { level: 3 })}
        title="Heading 3"
      >
        <Heading3 className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive("bulletList")}
        title="Bullet List"
      >
        <List className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive("orderedList")}
        title="Ordered List"
      >
        <ListOrdered className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton
        onClick={addLink}
        isActive={editor.isActive("link")}
        title="Add Link"
      >
        <LinkIcon className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarButton
        onClick={addImage}
        isActive={false}
        disabled={isUploadingAsset}
        title="Add Image"
      >
        {isUploadingAsset ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <ImageIcon className="w-4 h-4" />
        )}
      </ToolbarButton>
      {onUploadImage && (
        <input
          ref={imageInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void onUploadImage(file);
          }}
        />
      )}

      <ToolbarButton
        onClick={() => fileInputRef.current?.click()}
        isActive={false}
        disabled={isUploadingAsset || !onUploadFile}
        title="Upload File"
      >
        <Paperclip className="w-4 h-4" />
      </ToolbarButton>
      {onUploadFile && (
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,image/png,image/jpeg,image/webp,image/gif"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void onUploadFile(file);
          }}
        />
      )}

      <ToolbarButton
        onClick={() => onAddDriveFile?.()}
        isActive={false}
        disabled={!onAddDriveFile}
        title="Add Google Drive File"
      >
        <HardDrive className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => onAddYouTubeVideo?.()}
        isActive={editor.isActive("youtube")}
        disabled={!onAddYouTubeVideo}
        title={youtubeTitle}
      >
        <Youtube className="w-4 h-4" />
      </ToolbarButton>
    </div>
  );
}

function ToolbarButton({
  onClick,
  isActive,
  title,
  children,
  disabled = false,
}: {
  onClick: () => void;
  isActive: boolean;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`p-1.5 rounded-md transition-colors ${
        isActive
          ? "bg-accent-light text-accent"
          : "text-text-secondary hover:bg-bg-muted hover:text-text-primary"
      } disabled:opacity-50 disabled:pointer-events-none`}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-5 bg-border mx-1" />;
}
