import { StickyNote } from "lucide-react";
import { Card } from "@/components/ui/card";

type PlanNote = {
  id: string;
  content: string | null;
  categoryName: string | null;
};

type PlanNotesProps = {
  notes: PlanNote[];
};

export function PlanNotes({ notes }: PlanNotesProps) {
  if (notes.length === 0) return null;

  return (
    <Card className="p-4">
        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note.id} className="flex items-start gap-3">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-bg-muted shrink-0 mt-0.5">
                <StickyNote className="w-3.5 h-3.5 text-text-secondary" />
              </div>
              <div className="min-w-0">
                {note.categoryName && (
                  <p className="text-xs font-semibold text-text-secondary mb-0.5">
                    {note.categoryName}
                  </p>
                )}
                <p className="text-sm text-text-primary whitespace-pre-wrap">
                  {note.content}
                </p>
              </div>
            </div>
          ))}
        </div>
    </Card>
  );
}
