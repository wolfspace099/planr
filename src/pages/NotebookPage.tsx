import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { format } from "date-fns";
import { useState, useEffect, useRef } from "react";
import { BookOpen, ChevronRight, FileText, Hash, Calendar, ClipboardList, Plus } from "lucide-react";
import { PageHeader, Button, EmptyState, Badge } from "../components/ui/primitives";
import BigNoteEditor from "../components/editor/BigNoteEditor";
import clsx from "clsx";

// ─── Subject list ────────────────────────────────────────────────────────────
export default function NotebookPage() {
  const { subject: encodedSubject } = useParams<{ subject?: string }>();
  const subject = encodedSubject ? decodeURIComponent(encodedSubject) : null;
  const navigate = useNavigate();

  const subjects = useQuery(api.lessons.getSubjects);

  if (!subject) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Notebook" subtitle="One notebook per subject — write freely" />
        {(subjects?.length ?? 0) === 0 ? (
          <EmptyState
            icon={<BookOpen size={32} />}
            title="No subjects yet"
            description="Sync your Zermelo calendar in Settings to import your lessons."
            action={<Button onClick={() => navigate("/settings")}>Go to Settings</Button>}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {subjects?.map((s) => (
              <Link key={s} to={`/notebook/${encodeURIComponent(s)}`}>
                <div className="p-4 bg-surface border border-border rounded-lg hover:border-border-strong hover:shadow-card transition-all group cursor-pointer">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-accent-light rounded">
                      <BookOpen size={16} className="text-accent" />
                    </div>
                    <ChevronRight size={14} className="text-ink-light group-hover:text-ink transition-colors" />
                  </div>
                  <p className="font-semibold text-ink text-sm mt-2">{s}</p>
                  <p className="text-xs text-ink-muted mt-0.5">Open notebook →</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  return <SubjectNotebook subject={subject} />;
}

// ─── TOC entry types ─────────────────────────────────────────────────────────
interface TocEntry {
  id: string;
  type: "chapter" | "date";
  label: string;
  level?: number;
}

// ─── Subject notebook ────────────────────────────────────────────────────────
function SubjectNotebook({ subject }: { subject: string }) {
  const lessons = useQuery(api.lessons.getBySubject, { subject });
  const notebookNote = useQuery(api.notes.getNotebook, { subject });
  const saveNotebook = useMutation(api.notes.saveNotebook);

  const [toc, setToc] = useState<TocEntry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSave = async (html: string) => {
    await saveNotebook({ subject, content: html });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Lesson map: date string → lesson for auto-linking
  const lessonsByDate: Record<string, any> = {};
  for (const l of lessons ?? []) {
    const key = format(new Date(l.startTime), "dd/MM/yyyy");
    lessonsByDate[key] = l;
    // Also match short forms
    const key2 = format(new Date(l.startTime), "d/M/yyyy");
    lessonsByDate[key2] = l;
    const key3 = format(new Date(l.startTime), "dd-MM-yyyy");
    lessonsByDate[key3] = l;
  }

  return (
    <div className="animate-fade-in flex h-full gap-0">
      {/* TOC sidebar */}
      <aside className="w-52 flex-shrink-0 border-r border-border bg-surface/40 flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <Link to="/notebook" className="text-xs text-ink-muted hover:text-ink transition-colors">
            ← Notebooks
          </Link>
          {saved && <span className="text-[10px] text-success">Saved ✓</span>}
        </div>
        <div className="px-3 py-2 border-b border-border">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">{subject}</p>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {toc.length === 0 ? (
            <div className="px-4 py-3">
              <p className="text-xs text-ink-light leading-relaxed">
                Your chapters and dates will appear here as you write.
              </p>
              <div className="mt-3 space-y-1.5 text-[11px] text-ink-light">
                <p className="font-medium text-ink-muted">Tips:</p>
                <p>• H1/H2 → chapter</p>
                <p>• <code className="bg-border/60 px-1 rounded">Date: 04/05/2026</code></p>
              </div>
            </div>
          ) : (
            toc.map((entry) => (
              <button
                key={entry.id}
                onClick={() => {
                  setActiveId(entry.id);
                  document.getElementById(entry.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className={clsx(
                  "w-full text-left flex items-center gap-2 px-3 py-1.5 transition-colors text-xs rounded-md mx-1",
                  activeId === entry.id
                    ? "bg-accent/10 text-accent"
                    : "text-ink-muted hover:text-ink hover:bg-border/40",
                  entry.type === "date" && "pl-5"
                )}
              >
                {entry.type === "chapter" ? (
                  <Hash size={10} className="flex-shrink-0 opacity-60" />
                ) : (
                  <Calendar size={10} className="flex-shrink-0 opacity-60" />
                )}
                <span className="truncate">{entry.label}</span>
              </button>
            ))
          )}
        </div>

        {/* Linked lesson count */}
        {(lessons?.length ?? 0) > 0 && (
          <div className="px-4 py-3 border-t border-border">
            <p className="text-[10px] text-ink-light">{lessons!.length} lessons available to link</p>
          </div>
        )}
      </aside>

      {/* Editor */}
      <div className="flex-1 overflow-hidden flex flex-col min-w-0">
        <BigNoteEditor
          content={notebookNote?.content ?? ""}
          onChange={handleSave}
          onTocChange={setToc}
          onActiveChange={setActiveId}
          lessonsByDate={lessonsByDate}
          subject={subject}
        />
      </div>
    </div>
  );
}