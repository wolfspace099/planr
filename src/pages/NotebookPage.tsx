import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { format } from "date-fns";
import { useState } from "react";
import { BookOpen, Plus, ChevronRight, FileText, ClipboardList, Tag } from "lucide-react";
import { PageHeader, Button, Modal, Input, EmptyState, Badge } from "../components/ui/primitives";
import clsx from "clsx";

export default function NotebookPage() {
  const { subject: encodedSubject } = useParams<{ subject?: string }>();
  const subject = encodedSubject ? decodeURIComponent(encodedSubject) : null;
  const navigate = useNavigate();

  const subjects = useQuery(api.lessons.getSubjects);
  const lessons = useQuery(
    api.lessons.getBySubject,
    subject ? { subject } : "skip"
  );
  const chapters = useQuery(
    api.misc.getBySubject,
    subject ? { subject } : "skip"
  );

  const createChapter = useMutation(api.misc.createChapter);
  const setChapter = useMutation(api.lessons.setChapter);
  const [chapterModal, setChapterModal] = useState(false);
  const [newChapterName, setNewChapterName] = useState("");
  const [assignModal, setAssignModal] = useState<string | null>(null);

  if (!subject) {
    // Subject list view
    return (
      <div className="animate-fade-in">
        <PageHeader title="Notebook" subtitle="Your notes, organised by subject and chapter" />
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
                <div className="p-4 bg-surface border border-border rounded-lg hover:border-border-strong hover:shadow-card transition-all group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-accent-light rounded">
                      <BookOpen size={16} className="text-accent" />
                    </div>
                    <ChevronRight size={14} className="text-ink-light group-hover:text-ink transition-colors" />
                  </div>
                  <p className="font-semibold text-ink text-sm mt-2">{s}</p>
                  <p className="text-xs text-ink-muted mt-0.5">View notes →</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Group lessons by chapter
  const ungrouped = (lessons ?? []).filter((l) => !l.chapterId);
  const grouped: Record<string, typeof lessons> = {};
  for (const ch of chapters ?? []) {
    grouped[ch._id] = (lessons ?? []).filter((l) => l.chapterId === ch._id);
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={subject}
        subtitle="Lesson notes by chapter"
        actions={
          <Button size="sm" onClick={() => setChapterModal(true)}>
            <Plus size={13} /> New chapter
          </Button>
        }
      />

      {/* Chapters */}
      {(chapters ?? []).map((ch) => (
        <div key={ch._id} className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Tag size={13} className="text-ink-light" />
            <h2 className="text-sm font-semibold text-ink">{ch.name}</h2>
            <span className="text-xs text-ink-light">
              {grouped[ch._id]?.length ?? 0} lessons
            </span>
          </div>
          <div className="space-y-1.5">
            {(grouped[ch._id] ?? []).length === 0 ? (
              <p className="text-xs text-ink-light pl-5 py-1">No lessons assigned to this chapter yet.</p>
            ) : (
              grouped[ch._id]?.map((l) => (
                <LessonRow key={l._id} lesson={l} onAssign={() => setAssignModal(l._id)} />
              ))
            )}
          </div>
        </div>
      ))}

      {/* Ungrouped */}
      {ungrouped.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-semibold text-ink-muted">Unassigned lessons</h2>
          </div>
          <div className="space-y-1.5">
            {ungrouped.map((l) => (
              <LessonRow key={l._id} lesson={l} onAssign={() => setAssignModal(l._id)} />
            ))}
          </div>
        </div>
      )}

      {(lessons?.length ?? 0) === 0 && (
        <EmptyState
          icon={<BookOpen size={32} />}
          title="No lessons for this subject"
          description="Lessons will appear here after syncing your Zermelo calendar."
        />
      )}

      {/* New chapter modal */}
      <Modal open={chapterModal} onClose={() => setChapterModal(false)} title="New chapter">
        <div className="space-y-3">
          <Input
            label="Chapter name"
            value={newChapterName}
            onChange={(e) => setNewChapterName(e.target.value)}
            placeholder="e.g. Chapter 3 — Algebra"
          />
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setChapterModal(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={async () => {
                if (!newChapterName.trim()) return;
                await createChapter({ subject, name: newChapterName, order: (chapters?.length ?? 0) });
                setNewChapterName("");
                setChapterModal(false);
              }}
            >
              Create
            </Button>
          </div>
        </div>
      </Modal>

      {/* Assign chapter modal */}
      {assignModal && (
        <Modal open={!!assignModal} onClose={() => setAssignModal(null)} title="Assign to chapter">
          <div className="space-y-2">
            <button
              className="w-full text-left px-3 py-2 rounded text-sm text-ink-muted hover:bg-bg transition-colors border border-border"
              onClick={async () => {
                await setChapter({ lessonId: assignModal as Id<"lessons">, chapterId: undefined });
                setAssignModal(null);
              }}
            >
              None (unassigned)
            </button>
            {(chapters ?? []).map((ch) => (
              <button
                key={ch._id}
                className="w-full text-left px-3 py-2 rounded text-sm text-ink hover:bg-bg transition-colors border border-border"
                onClick={async () => {
                  await setChapter({ lessonId: assignModal as Id<"lessons">, chapterId: ch._id });
                  setAssignModal(null);
                }}
              >
                {ch.name}
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

function LessonRow({ lesson, onAssign }: { lesson: any; onAssign: () => void }) {
  const note = useQuery(api.notes.getByLesson, { lessonId: lesson._id });
  const homework = useQuery(api.homework.getByLesson, { lessonId: lesson._id });

  return (
    <div className="flex items-center gap-3 group">
      <Link
        to={`/lesson/${lesson._id}`}
        className="flex-1 flex items-center gap-3 p-3 bg-surface border border-border rounded-lg hover:border-border-strong hover:shadow-card transition-all"
      >
        <span className="text-xs font-mono text-ink-muted w-20 flex-shrink-0">
          {format(new Date(lesson.startTime), "dd MMM HH:mm")}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-ink truncate">{lesson.subject}</p>
          {lesson.location && (
            <p className="text-xs text-ink-light">{lesson.location}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {note?.content && note.content !== "<p></p>" && (
            <span title="Has notes">
              <FileText size={13} className="text-accent" />
            </span>
          )}
          {(homework?.length ?? 0) > 0 && (
            <Badge color="amber">{homework!.length} hw</Badge>
          )}
        </div>
      </Link>
      <button
        onClick={onAssign}
        className="opacity-0 group-hover:opacity-100 p-1.5 rounded text-ink-light hover:text-ink hover:bg-border transition-all"
        title="Assign to chapter"
      >
        <Tag size={13} />
      </button>
    </div>
  );
}
