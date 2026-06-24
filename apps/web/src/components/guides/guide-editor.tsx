"use client";

import { type MouseEvent, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Youtube, { isValidYoutubeUrl } from "@tiptap/extension-youtube";
import { useTranslations } from "next-intl";
import { useTRPC } from "@mt/api/client";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EditorToolbar } from "./editor-toolbar";
import { ResourceCard } from "./resource-card-extension";

const supportedImageTypes = [
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
const supportedAssetTypes = [
  "application/pdf",
  ...supportedImageTypes,
] as const;
const maxImageBytes = 10 * 1024 * 1024;
const maxAssetBytes = 25 * 1024 * 1024;

type GuideEditorProps = {
  content?: unknown;
  teamId?: string;
  onChange: (json: unknown) => void;
};

/**
 * Rich text editor for guide content.
 * Uses Tiptap 3 with StarterKit + Image extension.
 * Content is stored/loaded as JSON.
 */
export function GuideEditor({ content, teamId, onChange }: GuideEditorProps) {
  const trpc = useTRPC();
  const { toast } = useToast();
  const t = useTranslations("Guides");
  const tCommon = useTranslations("Common");
  const [isDriveDialogOpen, setIsDriveDialogOpen] = useState(false);
  const [driveUrl, setDriveUrl] = useState("");
  const [driveTitle, setDriveTitle] = useState("");
  const [isYouTubeDialogOpen, setIsYouTubeDialogOpen] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [editingResourcePosition, setEditingResourcePosition] = useState<
    number | null
  >(null);
  const createAssetUpload = useMutation(
    trpc.guides.createAssetUpload.mutationOptions(),
  );

  const editor = useEditor({
    immediatelyRender: false,
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
    content: (content as any) ?? {
      type: "doc",
      content: [{ type: "paragraph" }],
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
  });

  const uploadImage = teamId
    ? async (file: File) => {
        if (
          !supportedImageTypes.includes(
            file.type as (typeof supportedImageTypes)[number],
          )
        ) {
          toast(t("unsupportedImageType"), "error");
          return;
        }

        if (file.size > maxImageBytes) {
          toast(t("imageTooLarge"), "error");
          return;
        }

        try {
          const upload = await createAssetUpload.mutateAsync({
            teamId,
            fileName: file.name,
            contentType: file.type as (typeof supportedImageTypes)[number],
            contentLength: file.size,
          });

          const response = await fetch(upload.uploadUrl, {
            method: "PUT",
            headers: {
              "Content-Type": file.type,
            },
            body: file,
          });

          if (!response.ok) {
            throw new Error("Image upload failed.");
          }

          editor?.chain().focus().setImage({ src: upload.publicUrl }).run();
        } catch {
          toast(t("imageUploadFailed"), "error");
        }
      }
    : undefined;

  const uploadFile = teamId
    ? async (file: File) => {
        if (
          !supportedAssetTypes.includes(
            file.type as (typeof supportedAssetTypes)[number],
          )
        ) {
          toast(t("unsupportedFileType"), "error");
          return;
        }

        if (file.size > maxAssetBytes) {
          toast(t("fileTooLarge"), "error");
          return;
        }

        try {
          const upload = await createAssetUpload.mutateAsync({
            teamId,
            fileName: file.name,
            contentType: file.type as (typeof supportedAssetTypes)[number],
            contentLength: file.size,
          });

          const response = await fetch(upload.uploadUrl, {
            method: "PUT",
            headers: {
              "Content-Type": file.type,
            },
            body: file,
          });

          if (!response.ok) {
            throw new Error("File upload failed.");
          }

          editor
            ?.chain()
            .focus()
            .insertContent([
              {
                type: "resourceCard",
                attrs: {
                  title: file.name,
                  url: upload.publicUrl,
                  kind: "file",
                  fileName: file.name,
                  mimeType: file.type,
                  fileSize: file.size,
                },
              },
              { type: "paragraph" },
            ])
            .run();
        } catch {
          toast(t("fileUploadFailed"), "error");
        }
      }
    : undefined;

  const resetDriveDialog = () => {
    setDriveUrl("");
    setDriveTitle("");
    setEditingResourcePosition(null);
    setIsDriveDialogOpen(false);
  };

  const openDriveDialog = () => {
    setDriveUrl("");
    setDriveTitle("");
    setEditingResourcePosition(null);
    setIsDriveDialogOpen(true);
  };

  const resetYouTubeDialog = () => {
    setYoutubeUrl("");
    setIsYouTubeDialogOpen(false);
  };

  const openYouTubeDialog = () => {
    setYoutubeUrl("");
    setIsYouTubeDialogOpen(true);
  };

  const saveYouTubeVideo = () => {
    const url = youtubeUrl.trim();

    if (!isValidYoutubeUrl(url)) {
      toast(t("invalidYouTubeUrl"), "error");
      return;
    }

    editor
      ?.chain()
      .focus()
      .setYoutubeVideo({ src: url, width: 640, height: 360 })
      .insertContent({ type: "paragraph" })
      .run();

    resetYouTubeDialog();
  };

  const saveDriveFile = () => {
    let parsed: URL;
    try {
      parsed = new URL(driveUrl);
    } catch {
      toast(t("invalidGoogleDriveUrl"), "error");
      return;
    }

    const isGoogleDriveUrl =
      parsed.hostname === "drive.google.com" ||
      parsed.hostname.endsWith(".drive.google.com") ||
      parsed.hostname === "docs.google.com" ||
      parsed.hostname.endsWith(".docs.google.com");

    if (!isGoogleDriveUrl) {
      toast(t("invalidGoogleDriveUrl"), "error");
      return;
    }

    const attrs = {
      title: driveTitle.trim() || parsed.hostname,
      url: parsed.toString(),
      kind: "google_drive",
    };

    if (editingResourcePosition !== null) {
      editor
        ?.chain()
        .focus()
        .command(({ tr }) => {
          tr.setNodeMarkup(editingResourcePosition, undefined, attrs);
          return true;
        })
        .run();
    } else {
      editor
        ?.chain()
        .focus()
        .insertContent([
          {
            type: "resourceCard",
            attrs,
          },
          { type: "paragraph" },
        ])
        .run();
    }

    resetDriveDialog();
  };

  const resourcePositionFromElement = (element: HTMLElement) => {
    return editor?.view.posAtDOM(element, 0) ?? null;
  };

  const handleEditorClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const card = target.closest<HTMLElement>(
      '[data-type="guide-resource-card"]',
    );

    if (!card || !editor) return;

    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.preventDefault();
    event.nativeEvent.stopImmediatePropagation();

    const position = resourcePositionFromElement(card);
    if (position === null) return;

    if (target.closest("[data-resource-card-remove]")) {
      editor.chain().focus().deleteRange({ from: position, to: position + 1 }).run();
      return;
    }

    if (card.dataset.kind !== "google_drive") {
      editor.chain().focus().setNodeSelection(position).run();
      return;
    }

    setDriveUrl(card.dataset.url ?? "");
    setDriveTitle(card.dataset.title ?? "");
    setEditingResourcePosition(position);
    setIsDriveDialogOpen(true);
  };

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
      <EditorToolbar
        editor={editor}
        isUploadingAsset={createAssetUpload.isPending}
        onUploadImage={uploadImage}
        onUploadFile={uploadFile}
        onAddDriveFile={openDriveDialog}
        onAddYouTubeVideo={openYouTubeDialog}
        youtubeTitle={t("addYouTubeVideo")}
      />
      <EditorContent
        editor={editor}
        onClickCapture={handleEditorClick}
        className="guide-editor-content px-4 py-3 min-h-[300px] text-sm text-text-primary outline-none [&_.tiptap]:outline-none [&_.tiptap]:min-h-[280px] [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mb-1 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2 [&_li]:mb-1 [&_a]:text-accent [&_a]:underline [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-2"
      />
      {isDriveDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <Card className="w-full max-w-md p-5">
            <h2 className="text-lg font-semibold text-text-primary">
              {t("addGoogleDriveFile")}
            </h2>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="text-xs font-medium text-text-secondary">
                  {t("googleDriveUrlLabel")}
                </span>
                <input
                  type="url"
                  value={driveUrl}
                  onChange={(event) => setDriveUrl(event.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="mt-1 w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent/30"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-text-secondary">
                  {t("resourceTitlePrompt")}
                </span>
                <input
                  type="text"
                  value={driveTitle}
                  onChange={(event) => setDriveTitle(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent/30"
                />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={resetDriveDialog}
              >
                {tCommon("cancel")}
              </Button>
              <Button
                type="button"
                onClick={saveDriveFile}
                disabled={!driveUrl.trim()}
              >
                {editingResourcePosition === null
                  ? t("addResource")
                  : tCommon("save")}
              </Button>
            </div>
          </Card>
        </div>
      )}
      {isYouTubeDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <Card className="w-full max-w-md p-5">
            <h2 className="text-lg font-semibold text-text-primary">
              {t("addYouTubeVideo")}
            </h2>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="text-xs font-medium text-text-secondary">
                  {t("youtubeUrlLabel")}
                </span>
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(event) => setYoutubeUrl(event.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="mt-1 w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent/30"
                />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={resetYouTubeDialog}
              >
                {tCommon("cancel")}
              </Button>
              <Button
                type="button"
                onClick={saveYouTubeVideo}
                disabled={!youtubeUrl.trim()}
              >
                {t("embedVideo")}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
