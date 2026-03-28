import { Paperclip, Download, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";

type Attachment = {
  id: string;
  filename: string | null;
  url: string | null;
  contentType: string | null;
  fileSize: number | null;
  remoteLink: string | null;
  downloadable: boolean;
};

type PlanAttachmentsProps = {
  attachments: Attachment[];
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function PlanAttachments({ attachments }: PlanAttachmentsProps) {
  if (attachments.length === 0) return null;

  return (
    <section>
      <h2 className="text-[15px] font-semibold text-text-primary mb-3">
        Attachments
      </h2>
      <Card className="p-4">
        <div className="space-y-2">
          {attachments.map((att) => {
            const href = att.url ?? att.remoteLink ?? "#";
            const Icon = att.downloadable ? Download : ExternalLink;

            return (
              <a
                key={att.id}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 py-1.5 hover:bg-bg-muted rounded-lg px-2 -mx-2 transition-colors"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-bg-muted shrink-0">
                  <Paperclip className="w-4 h-4 text-text-secondary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-accent truncate">
                    {att.filename ?? "Attachment"}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-text-tertiary">
                    {att.contentType && (
                      <span>{att.contentType.split("/").pop()}</span>
                    )}
                    {att.fileSize != null && (
                      <span>{formatFileSize(att.fileSize)}</span>
                    )}
                  </div>
                </div>
                <Icon className="w-4 h-4 text-text-tertiary shrink-0" />
              </a>
            );
          })}
        </div>
      </Card>
    </section>
  );
}
