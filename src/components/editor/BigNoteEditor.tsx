import { useEditor, EditorContent, Extension } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import { Mathematics } from "@tiptap/extension-mathematics";
import "katex/dist/katex.min.css";

import { useEffect, useRef, useCallback } from "react";
import {
  Bold, Italic, UnderlineIcon, Strikethrough, Highlighter,
  Heading1, Heading2, List, ListOrdered, ListTodo,
  AlignLeft, AlignCenter, AlignRight,
  Table as TableIcon, Code, Quote, Minus,
  Undo2, Redo2, Sigma,
} from "lucide-react";
import clsx from "clsx";

// ─── Types ───────────────────────────────────────────────────────────────────
interface TocEntry {
  id: string;
  type: "chapter" | "date";
  label: string;
  level?: number;
}

interface BigNoteEditorProps {
  content: string;
  onChange: (html: string) => void;
  onTocChange?: (toc: TocEntry[]) => void;
  onActiveChange?: (id: string | null) => void;
  lessonsByDate?: Record<string, any>;
  subject?: string;
  placeholder?: string;
}

// ─── Date pattern matcher ─────────────────────────────────────────────────────
// Matches: Date: 04/05/2026, date: 4-5-2026, Datum: 04/05, 04 mei 2026, May 4 2026, etc.
const MONTH_NAMES: Record<string, number> = {
  jan: 0, january: 0, januari: 0,
  feb: 1, february: 1, februari: 1,
  mar: 2, march: 2, maart: 2,
  apr: 3, april: 3,
  may: 4, mei: 4,
  jun: 5, june: 5, juni: 5,
  jul: 6, july: 6, juli: 6,
  aug: 7, august: 7, augustus: 7,
  sep: 8, september: 8,
  oct: 9, october: 9, oktober: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

function parseDateLine(text: string): string | null {
  const t = text.trim();
  // Must start with date/datum prefix
  if (!/^(date|datum)\s*[:\-–]\s*/i.test(t)) return null;
  const raw = t.replace(/^(date|datum)\s*[:\-–]\s*/i, "").trim();

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const slashMatch = raw.match(/^(\d{1,2})[\/\-\.](\d{1,2})(?:[\/\-\.](\d{2,4}))?/);
  if (slashMatch) {
    const d = parseInt(slashMatch[1]);
    const m = parseInt(slashMatch[2]) - 1;
    const y = slashMatch[3] ? parseInt(slashMatch[3]) : new Date().getFullYear();
    const fullYear = y < 100 ? 2000 + y : y;
    return `${String(d).padStart(2, "0")}/${String(m + 1).padStart(2, "0")}/${fullYear}`;
  }

  // DD MonthName YYYY or MonthName DD YYYY
  const wordMatch = raw.match(/^(\d{1,2})\s+([a-z]+)\s*(\d{4})?/i) ||
                    raw.match(/^([a-z]+)\s+(\d{1,2})\s*,?\s*(\d{4})?/i);
  if (wordMatch) {
    let day: number, monthStr: string, year: number;
    if (/^\d/.test(wordMatch[0])) {
      day = parseInt(wordMatch[1]);
      monthStr = wordMatch[2].toLowerCase();
      year = wordMatch[3] ? parseInt(wordMatch[3]) : new Date().getFullYear();
    } else {
      monthStr = wordMatch[1].toLowerCase();
      day = parseInt(wordMatch[2]);
      year = wordMatch[3] ? parseInt(wordMatch[3]) : new Date().getFullYear();
    }
    const month = MONTH_NAMES[monthStr];
    if (month !== undefined) {
      return `${String(day).padStart(2, "0")}/${String(month + 1).padStart(2, "0")}/${year}`;
    }
  }

  return null;
}

// ─── Chapter name extractor ───────────────────────────────────────────────────
function extractChapterLabel(text: string): string {
  // Strip common prefixes: "Chapter 4: ", "Hoofdstuk 3 — ", "H5 - ", "Ch. 2 "
  return text
    .replace(/^(chapter|hoofdstuk|h\.|ch\.?)\s*\d+\s*[:\-–—]\s*/i, "")
    .replace(/^\d+\.\s*/, "")
    .trim() || text.trim();
}

// ─── Tiptap extension: auto-id headings & date lines ─────────────────────────
const AutoIdExtension = Extension.create({
  name: "autoId",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("autoId"),
        appendTransaction(transactions, oldState, newState) {
          const tr = newState.tr;
          let modified = false;
          newState.doc.descendants((node, pos) => {
            if (node.type.name === "heading" || node.type.name === "paragraph") {
              const text = node.textContent;
              const isDate = /^(date|datum)\s*[:\-–]/i.test(text);
              const isHeading = node.type.name === "heading";
              if (isDate || isHeading) {
                const existingId = node.attrs.id;
                if (!existingId) {
                  const id = `node-${Math.random().toString(36).slice(2, 9)}`;
                  tr.setNodeAttribute(pos, "id", id);
                  modified = true;
                }
              }
            }
          });
          return modified ? tr : null;
        },
      }),
    ];
  },
});

// ─── Toolbar ─────────────────────────────────────────────────────────────────
function ToolbarButton({ onClick, active, title, children }: {
  onClick: () => void; active?: boolean; title: string; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={clsx(
        "p-1.5 rounded transition-colors text-sm",
        active ? "bg-accent/10 text-accent" : "text-ink-muted hover:text-ink hover:bg-border/60"
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-border-strong mx-0.5 self-center" />;
}

// ─── Main editor ─────────────────────────────────────────────────────────────
export default function BigNoteEditor({
  content,
  onChange,
  onTocChange,
  onActiveChange,
  lessonsByDate = {},
  subject,
  placeholder = "Start writing… use headings for chapters, and 'Date: DD/MM/YYYY' to link a lesson.",
}: BigNoteEditorProps) {
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tocTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Build TOC from editor content ──────────────────────────────────────────
  const buildToc = useCallback((editor: any) => {
    const entries: TocEntry[] = [];
    editor.state.doc.descendants((node: any) => {
      if (node.type.name === "heading") {
        const text = node.textContent;
        const id = node.attrs.id;
        if (!id || !text.trim()) return;
        entries.push({
          id,
          type: "chapter",
          label: extractChapterLabel(text),
          level: node.attrs.level,
        });
      } else if (node.type.name === "paragraph") {
        const text = node.textContent;
        const id = node.attrs.id;
        const dateKey = parseDateLine(text);
        if (dateKey && id) {
          const lesson = lessonsByDate[dateKey];
          entries.push({
            id,
            type: "date",
            label: lesson
              ? `${format(new Date(lesson.startTime), "d MMM")} — ${lesson.subject ?? subject ?? ""}`
              : dateKey,
          });
        }
      }
    });
    onTocChange?.(entries);
  }, [lessonsByDate, onTocChange, subject]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
          HTMLAttributes: { class: "notebook-heading" },
        },
      }),
      Underline,
      Highlight.configure({ multicolor: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Mathematics,
      AutoIdExtension,
    ],
    content,
    editorProps: {
      attributes: {
        spellcheck: "true",
        lang: "nl, en",
        class: "focus:outline-none notebook-content",
      },
    },
    onUpdate({ editor }) {
      // Debounced save
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        onChange(editor.getHTML());
      }, 800);

      // Debounced TOC rebuild
      if (tocTimerRef.current) clearTimeout(tocTimerRef.current);
      tocTimerRef.current = setTimeout(() => {
        buildToc(editor);
      }, 300);
    },
  });

  // Sync content on load
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (content && content !== current && content !== "<p></p>") {
      editor.commands.setContent(content, false);
    }
  }, [content, editor]);

  // Build initial TOC
  useEffect(() => {
    if (editor) buildToc(editor);
  }, [editor, buildToc]);

  // Scroll spy — update active TOC entry
  useEffect(() => {
    if (!editor) return;
    const el = editor.view.dom.closest(".notebook-scroll");
    if (!el) return;
    const handler = () => {
      const headings = el.querySelectorAll("[id^='node-']");
      let current: string | null = null;
      headings.forEach((h) => {
        const rect = h.getBoundingClientRect();
        if (rect.top < 200) current = h.id;
      });
      onActiveChange?.(current);
    };
    el.addEventListener("scroll", handler);
    return () => el.removeEventListener("scroll", handler);
  }, [editor, onActiveChange]);

  if (!editor) return null;

  // ── Render date line with linked lesson pill ────────────────────────────────
  // We inject a DOM decoration for date paragraphs — simpler: post-render pass
  // We'll handle this with a CSS + data-attribute approach in the editor styles

  return (
    <div className="flex flex-col h-full overflow-hidden bg-bg">
      <style>{`
        /* Lists */
        .notebook-content ul { list-style-type: disc !important; padding-left: 1.5rem !important; margin: 0.75rem 0 !important; }
        .notebook-content ol { list-style-type: decimal !important; padding-left: 1.5rem !important; margin: 0.75rem 0 !important; }
        .notebook-content li { display: list-item !important; margin-bottom: 0.2rem !important; }
        .notebook-content ul[data-type="taskList"] { list-style: none !important; padding: 0 !important; }
        .notebook-content ul[data-type="taskList"] li { display: flex !important; gap: 0.5rem; align-items: flex-start; }

        /* Headings — chapter style */
        .notebook-content h1 {
          font-size: 1.5rem !important;
          font-weight: 700 !important;
          color: var(--color-ink) !important;
          margin-top: 2.5rem !important;
          margin-bottom: 0.5rem !important;
          padding-bottom: 0.4rem !important;
          border-bottom: 2px solid var(--color-accent) !important;
          scroll-margin-top: 1rem;
        }
        .notebook-content h2 {
          font-size: 1.15rem !important;
          font-weight: 600 !important;
          color: var(--color-ink) !important;
          margin-top: 2rem !important;
          margin-bottom: 0.4rem !important;
          padding-left: 0.6rem !important;
          border-left: 3px solid var(--color-accent) !important;
          scroll-margin-top: 1rem;
        }
        .notebook-content h3 {
          font-size: 1rem !important;
          font-weight: 600 !important;
          color: var(--color-ink-muted) !important;
          margin-top: 1.5rem !important;
          margin-bottom: 0.3rem !important;
          scroll-margin-top: 1rem;
        }

        /* Date line detection — visual hint */
        .notebook-content p[id^="node-"] {
          scroll-margin-top: 1rem;
        }

        /* Math */
        .Tiptap-mathematics-editor {
          background: #202020; color: #fff;
          font-family: monospace; padding: 0.2rem 0.5rem; border-radius: 4px;
        }
        .Tiptap-mathematics-render { cursor: pointer; padding: 0 0.25rem; transition: background 0.2s; }
        .Tiptap-mathematics-render:hover { background: rgba(0,0,0,0.05); }

        /* Placeholder */
        .tiptap p.is-editor-empty:first-child::before {
          color: var(--color-ink-light);
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }

        /* Table */
        .notebook-content table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
        .notebook-content td, .notebook-content th {
          border: 1px solid var(--color-border);
          padding: 0.4rem 0.6rem;
          min-width: 60px;
          font-size: 0.875rem;
        }
        .notebook-content th { background: var(--color-surface); font-weight: 600; }
        .selectedCell::after { background: var(--color-accent); opacity: 0.1; }

        /* Blockquote */
        .notebook-content blockquote {
          border-left: 3px solid var(--color-border-strong);
          padding-left: 1rem;
          color: var(--color-ink-muted);
          margin: 0.75rem 0;
          font-style: italic;
        }

        /* Code */
        .notebook-content code {
          background: var(--color-border);
          padding: 0.1em 0.35em;
          border-radius: 3px;
          font-size: 0.85em;
          font-family: 'Fira Code', monospace;
        }
        .notebook-content pre {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 6px;
          padding: 0.75rem 1rem;
          overflow-x: auto;
          margin: 0.75rem 0;
        }
        .notebook-content pre code { background: none; padding: 0; }

        /* First heading no top margin */
        .notebook-content > h1:first-child,
        .notebook-content > h2:first-child { margin-top: 0 !important; }

        /* Paragraph spacing */
        .notebook-content p { margin-bottom: 0.5rem; line-height: 1.7; }
      `}</style>

      {/* Toolbar */}
      <div className="flex items-center flex-wrap gap-0.5 px-4 py-2 border-b border-border bg-surface/80 flex-shrink-0">
        <ToolbarButton title="Undo" onClick={() => editor.chain().focus().undo().run()}><Undo2 size={14} /></ToolbarButton>
        <ToolbarButton title="Redo" onClick={() => editor.chain().focus().redo().run()}><Redo2 size={14} /></ToolbarButton>
        <Divider />

        <ToolbarButton title="Heading 1 (Chapter)" active={editor.isActive("heading", { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 size={14} /></ToolbarButton>
        <ToolbarButton title="Heading 2" active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={14} /></ToolbarButton>
        <Divider />

        <ToolbarButton active={editor.isActive("bold")} title="Bold"
          onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={14} /></ToolbarButton>
        <ToolbarButton active={editor.isActive("italic")} title="Italic"
          onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={14} /></ToolbarButton>
        <ToolbarButton active={editor.isActive("underline")} title="Underline"
          onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon size={14} /></ToolbarButton>
        <ToolbarButton active={editor.isActive("highlight")} title="Highlight"
          onClick={() => editor.chain().focus().toggleHighlight().run()}><Highlighter size={14} /></ToolbarButton>
        <ToolbarButton active={editor.isActive("strike")} title="Strikethrough"
          onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough size={14} /></ToolbarButton>
        <Divider />

        <ToolbarButton active={editor.isActive("bulletList")} title="Bullet list"
          onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={14} /></ToolbarButton>
        <ToolbarButton active={editor.isActive("orderedList")} title="Numbered list"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={14} /></ToolbarButton>
        <ToolbarButton active={editor.isActive("taskList")} title="Task list"
          onClick={() => editor.chain().focus().toggleTaskList().run()}><ListTodo size={14} /></ToolbarButton>
        <Divider />

        <ToolbarButton active={editor.isActive("blockquote")} title="Quote"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote size={14} /></ToolbarButton>
        <ToolbarButton active={editor.isActive("code")} title="Inline code"
          onClick={() => editor.chain().focus().toggleCode().run()}><Code size={14} /></ToolbarButton>
        <ToolbarButton title="Horizontal rule"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus size={14} /></ToolbarButton>
        <Divider />

        <ToolbarButton title="Insert table"
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
          <TableIcon size={14} />
        </ToolbarButton>
        <ToolbarButton title="Formula (LaTeX)"
          onClick={() => editor.chain().focus().insertContent("$E=mc^2$").run()}>
          <Sigma size={14} />
        </ToolbarButton>
        <Divider />

        <ToolbarButton active={editor.isActive({ textAlign: "left" })} title="Align left"
          onClick={() => editor.chain().focus().setTextAlign("left").run()}><AlignLeft size={14} /></ToolbarButton>
        <ToolbarButton active={editor.isActive({ textAlign: "center" })} title="Align center"
          onClick={() => editor.chain().focus().setTextAlign("center").run()}><AlignCenter size={14} /></ToolbarButton>
        <ToolbarButton active={editor.isActive({ textAlign: "right" })} title="Align right"
          onClick={() => editor.chain().focus().setTextAlign("right").run()}><AlignRight size={14} /></ToolbarButton>
      </div>

      {/* Editor area */}
      <div className="notebook-scroll flex-1 overflow-y-auto">
        <EditorContent
          editor={editor}
          className="max-w-3xl mx-auto px-12 py-10 min-h-full"
        />
        <DateLinkedLessons editor={editor} lessonsByDate={lessonsByDate} />
      </div>
    </div>
  );
}

// ─── Inline lesson link pills rendered below date paragraphs ─────────────────
// This component renders floating lesson pills by scanning the editor DOM
function DateLinkedLessons({ editor, lessonsByDate }: {
  editor: any;
  lessonsByDate: Record<string, any>;
}) {
  // We use a portal-free approach: render pills as a React overlay
  // by watching editor updates and checking DOM positions
  // For simplicity in this implementation, we detect date lines and
  // show an inline widget by hooking into the editor's decorations

  // This is handled via CSS class + content attr on date paragraphs.
  // A full decoration-based approach would require ProseMirror NodeViews.
  // For now, this is a lightweight read-only scan that appends pills to the DOM.
  
  useEffect(() => {
    if (!editor) return;
    const update = () => {
      const dom = editor.view.dom;
      // Remove old pills
      dom.querySelectorAll(".date-lesson-pill").forEach((el: Element) => el.remove());
      // Scan paragraphs
      dom.querySelectorAll("p[id^='node-']").forEach((el: Element) => {
        const text = el.textContent ?? "";
        const dateKey = parseDateLine(text);
        if (!dateKey) return;
        const lesson = lessonsByDate[dateKey];
        if (!lesson) return;
        // Already has pill?
        if (el.querySelector(".date-lesson-pill")) return;
        const pill = document.createElement("span");
        pill.className = "date-lesson-pill";
        pill.style.cssText = `
          display: inline-flex; align-items: center; gap: 4px;
          margin-left: 8px; padding: 1px 8px;
          background: var(--color-accent-light, rgba(139,92,246,0.1));
          color: var(--color-accent, #8B5CF6);
          border-radius: 999px; font-size: 11px; font-weight: 500;
          cursor: default; user-select: none; vertical-align: middle;
          border: 1px solid var(--color-accent, #8B5CF6); opacity: 0.8;
        `;
        const startMs = lesson.startTime;
        const d = new Date(startMs);
        const timeStr = `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
        pill.textContent = `📅 ${lesson.subject} · ${timeStr}${lesson.location ? ` · ${lesson.location}` : ""}`;
        el.appendChild(pill);
      });
    };
    editor.on("update", update);
    editor.on("create", update);
    update();
    return () => {
      editor.off("update", update);
      editor.off("create", update);
    };
  }, [editor, lessonsByDate]);

  return null;
}

// Re-export format for use in NotebookPage
import { format } from "date-fns";