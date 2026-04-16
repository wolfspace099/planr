import { useEditor, EditorContent } from "@tiptap/react";
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
// NEW: Mathematics imports
import { Mathematics } from "@tiptap/extension-mathematics";
import "katex/dist/katex.min.css"; 

import { useEffect, useRef } from "react";
import {
  Bold,
  Italic,
  UnderlineIcon,
  Strikethrough,
  Highlighter,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListTodo,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Table as TableIcon,
  Code,
  Quote,
  Minus,
  Undo2,
  Redo2,
  Sigma, // New icon for formulas
} from "lucide-react";
import clsx from "clsx";

type NoteEditorProps = {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={clsx(
        "p-1.5 rounded transition-colors text-sm",
        active
          ? "bg-accent/10 text-accent"
          : "text-ink-muted hover:text-ink hover:bg-border/60"
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-border-strong mx-0.5 self-center" />;
}

export default function NoteEditor({
  content,
  onChange,
  placeholder = "Start writing your notes…",
}: NoteEditorProps) {
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
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
      // NEW: Mathematics configuration
      Mathematics.configure({
        HTMLAttributes: {
          class: 'tiptap-math',
        },
      }),
    ],
    content,
    editorProps: {
      attributes: {
        spellcheck: "true",
        lang: "nl, en",
        class: "focus:outline-none",
      },
    },
    onUpdate({ editor }) {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        onChange(editor.getHTML());
      }, 800);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (content && content !== current && content !== "<p></p>") {
      editor.commands.setContent(content, false);
    }
  }, [content, editor]);

  if (!editor) return null;

  return (
    <div className="flex flex-col border border-border rounded-lg overflow-hidden bg-surface">
      <style>{`
        .ProseMirror ul { list-style-type: disc !important; padding-left: 1.5rem !important; margin: 1rem 0 !important; }
        .ProseMirror ol { list-style-type: decimal !important; padding-left: 1.5rem !important; margin: 1rem 0 !important; }
        .ProseMirror li { display: list-item !important; margin-bottom: 0.25rem !important; }
        .ProseMirror ul[data-type="taskList"] { list-style: none !important; padding: 0 !important; }
        .ProseMirror ul[data-type="taskList"] li { display: flex !important; gap: 0.5rem; list-style: none !important; }
        
        /* Math specific styling */
        .tiptap-math {
          background: rgba(0, 0, 0, 0.05);
          padding: 0.2rem 0.4rem;
          border-radius: 4px;
          cursor: pointer;
        }
        .tiptap-math:hover {
          background: rgba(0, 0, 0, 0.1);
        }
      `}</style>

      {/* Toolbar */}
      <div className="flex items-center flex-wrap gap-0.5 px-3 py-2 border-b border-border bg-bg/50">
        <ToolbarButton title="Undo" onClick={() => editor.chain().focus().undo().run()}><Undo2 size={14} /></ToolbarButton>
        <ToolbarButton title="Redo" onClick={() => editor.chain().focus().redo().run()}><Redo2 size={14} /></ToolbarButton>
        <Divider />

        <ToolbarButton 
            title="Bold" 
            active={editor.isActive("bold")} 
            onClick={() => editor.chain().focus().toggleBold().run()}
        ><Bold size={14} /></ToolbarButton>
        <ToolbarButton 
            title="Italic" 
            active={editor.isActive("italic")} 
            onClick={() => editor.chain().focus().toggleItalic().run()}
        ><Italic size={14} /></ToolbarButton>
        <Divider />

        {/* NEW: Formula Button */}
        <ToolbarButton
          title="Add Formula (LaTeX)"
          onClick={() => {
            const latex = prompt("Enter LaTeX formula (e.g., E=mc^2):");
            if (latex) {
              editor.chain().focus().insertContent(`$${latex}$`).run();
            }
          }}
        >
          <Sigma size={14} />
        </ToolbarButton>

        <ToolbarButton
          title="Bullet list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List size={14} />
        </ToolbarButton>
        <ToolbarButton
          title="Numbered list"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered size={14} />
        </ToolbarButton>
        <Divider />

        <ToolbarButton
          title="Insert table"
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        >
          <TableIcon size={14} />
        </ToolbarButton>
      </div>

      <EditorContent
        editor={editor}
        className="px-8 py-6 min-h-[420px] prose-sm max-w-none"
      />
    </div>
  );
}