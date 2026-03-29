"use client";

import { useState } from "react";
import {
  Music,
  Video,
  AlignLeft,
  ChevronDown,
  ChevronUp,
  FileText,
  Paperclip,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type ItemNote = {
  id: string;
  content: string | null;
  categoryName: string | null;
};

type Song = {
  id: string;
  title: string | null;
  author: string | null;
  ccliNumber: number | null;
};

type Arrangement = {
  id: string;
  name: string | null;
  bpm: number | null;
  meter: string | null;
  length: number | null;
  chordChart: string | null;
  chordChartKey: string | null;
  hasChordChart: boolean;
};

type Key = {
  name: string | null;
  startingKey: string | null;
  endingKey: string | null;
};

type ServiceOrderItem = {
  id: string;
  title: string | null;
  itemType: string;
  servicePosition: string | null;
  sequence: number;
  length: number | null;
  description: string | null;
  htmlDetails: string | null;
  keyName: string | null;
  song: Song | null;
  arrangement: Arrangement | null;
  key: Key | null;
  itemNotes: ItemNote[];
};

type Attachment = {
  id: string;
  filename: string | null;
  url: string | null;
  contentType: string | null;
  fileSize: number | null;
  remoteLink: string | null;
};

type ServiceOrderProps = {
  items: ServiceOrderItem[];
  attachments: Attachment[];
};

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return secs > 0 ? `${mins}:${String(secs).padStart(2, "0")}` : `${mins}m`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function SongItem({
  item,
  attachments,
}: {
  item: ServiceOrderItem;
  attachments: Attachment[];
}) {
  const [showChordChart, setShowChordChart] = useState(false);
  const hasChordChart = item.arrangement?.chordChart;

  return (
    <div className="px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent/10 shrink-0 mt-0.5">
          <Music className="w-4 h-4 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-text-primary">
              {item.title}
            </span>
            {item.keyName && (
              <Badge variant="accent" className="text-[10px] px-1.5 py-0.5">
                {item.keyName}
              </Badge>
            )}
            {item.length != null && item.length > 0 && (
              <span className="text-xs text-text-tertiary">
                {formatDuration(item.length)}
              </span>
            )}
          </div>
          {item.arrangement?.name && (
            <p className="text-xs text-text-secondary mt-0.5">
              Arrangement: {item.arrangement.name}
              {item.arrangement.bpm
                ? ` \u00b7 ${item.arrangement.bpm} BPM`
                : ""}
              {item.arrangement.meter
                ? ` \u00b7 ${item.arrangement.meter}`
                : ""}
            </p>
          )}
          {item.song?.author && (
            <p className="text-xs text-text-tertiary mt-0.5">
              {item.song.author}
            </p>
          )}
          {item.description && (
            <p className="text-xs text-text-secondary mt-1.5 whitespace-pre-line break-all">
              {item.description}
            </p>
          )}
          {item.itemNotes.length > 0 && (
            <div className="mt-1.5 space-y-1">
              {item.itemNotes.map((note) => (
                <div
                  key={note.id}
                  className="text-xs text-text-secondary whitespace-pre-line break-all"
                >
                  {note.categoryName && (
                    <span className="font-medium">{note.categoryName}: </span>
                  )}
                  {note.content}
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {hasChordChart && (
              <button
                onClick={() => setShowChordChart(!showChordChart)}
                className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent-dark transition-colors"
              >
                <FileText className="w-3 h-3" />
                {showChordChart ? "Hide" : "Show"} chord chart
                {showChordChart ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
            )}
            {attachments.length > 0 &&
              attachments.map((att) => (
                <a
                  key={att.id}
                  href={att.url ?? att.remoteLink ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent-dark transition-colors"
                >
                  <Paperclip className="w-3 h-3" />
                  {att.filename ?? "Attachment"}
                  {att.fileSize != null && (
                    <span className="text-text-tertiary">
                      ({formatFileSize(att.fileSize)})
                    </span>
                  )}
                </a>
              ))}
          </div>
        </div>
      </div>
      {showChordChart && item.arrangement?.chordChart && (
        <div className="ml-11 mt-2 p-3 bg-bg-muted rounded-lg overflow-x-auto">
          {item.arrangement.chordChartKey && (
            <p className="text-xs text-text-secondary mb-2">
              Key: {item.arrangement.chordChartKey}
            </p>
          )}
          <pre className="text-xs text-text-primary font-mono whitespace-pre-wrap break-all leading-relaxed">
            {item.arrangement.chordChart}
          </pre>
        </div>
      )}
    </div>
  );
}

function HeaderItem({ item }: { item: ServiceOrderItem }) {
  return (
    <div className="px-4 py-2.5 bg-bg-muted/50">
      <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wide">
        {item.title}
      </p>
    </div>
  );
}

function MediaItem({ item }: { item: ServiceOrderItem }) {
  return (
    <div className="px-4 py-3 flex items-start gap-3">
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-bg-muted shrink-0 mt-0.5">
        <Video className="w-4 h-4 text-text-secondary" />
      </div>
      <div className="min-w-0">
        <span className="text-sm text-text-primary">{item.title}</span>
        {item.length != null && item.length > 0 && (
          <span className="text-xs text-text-tertiary ml-2">
            {formatDuration(item.length)}
          </span>
        )}
        {item.description && (
          <p className="text-xs text-text-secondary mt-0.5 whitespace-pre-line break-all">
            {item.description}
          </p>
        )}
      </div>
    </div>
  );
}

function RegularItem({ item }: { item: ServiceOrderItem }) {
  return (
    <div className="px-4 py-3 flex items-start gap-3">
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-bg-muted shrink-0 mt-0.5">
        <AlignLeft className="w-4 h-4 text-text-secondary" />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-primary">{item.title}</span>
          {item.length != null && item.length > 0 && (
            <span className="text-xs text-text-tertiary">
              {formatDuration(item.length)}
            </span>
          )}
        </div>
        {item.description && (
          <p className="text-xs text-text-secondary mt-0.5 whitespace-pre-line break-all">
            {item.description}
          </p>
        )}
        {item.itemNotes.length > 0 && (
          <div className="mt-1 space-y-1">
            {item.itemNotes.map((note) => (
              <div
                key={note.id}
                className="text-xs text-text-secondary whitespace-pre-line break-all"
              >
                {note.categoryName && (
                  <span className="font-medium">{note.categoryName}: </span>
                )}
                {note.content}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function ServiceOrder({ items, attachments }: ServiceOrderProps) {
  if (items.length === 0) return null;

  return (
    <Card className="divide-y divide-border overflow-hidden">
      {items.map((item) => {
        switch (item.itemType) {
          case "header":
            return <HeaderItem key={item.id} item={item} />;
          case "song":
            return <SongItem key={item.id} item={item} attachments={[]} />;
          case "media":
            return <MediaItem key={item.id} item={item} />;
          default:
            return <RegularItem key={item.id} item={item} />;
        }
      })}
    </Card>
  );
}
