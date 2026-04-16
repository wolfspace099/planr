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
import { Mathematics } from "@tiptap/extension-mathematics";
import TextStyle from "@tiptap/extension-text-style"; // NEW
import { Color } from "@tiptap/extension-color"; // NEW
import "katex/dist/katex.min.css"; 

import { useEffect, useRef } from "react";
import {
  Bold, Italic, UnderlineIcon, Strikethrough, Highlighter,
  Heading1, Heading2, List, ListOrdered, AlignLeft, 
  AlignCenter, AlignRight, Table as TableIcon, Undo2, Redo2, 
  Sigma, Type, Palette
} from "lucide-react";
import clsx from "clsx";

type NoteEditorProps = {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

// Colors for the dropdowns
const COLORS = ["#000000", "#ef4444", "#f97316", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899"];
const HIGHLIGHTS = ["#ffec3d", "#ffa39e", "#b7eb8f", "#91d5ff", "#d3adf7"];

function ToolbarButton({ onClick, active, title, children, className }: any) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={clsx(
        "p-1.5 rounded transition-colors text-sm flex items-center justify-center",
        active ? "bg-accent/10 text-accent" : "text-ink-muted hover:text-ink hover:bg-border/60",
        className
      )}
    >
      {children}
    </button>
  );
}

export default function NoteEditor({ content, onChange, placeholder = "Start writing..." }: NoteEditorProps) {
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }), // Enable multi-color
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      Mathematics,
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

  if (!editor) return null;

  return (
    <div className="flex flex-col border border-border rounded-lg overflow-hidden bg-surface">
      <style>{`
        .ProseMirror ul { list-style-type: disc !important; padding-left: 1.5rem !important; margin: 1rem 0 !important; }
        .ProseMirror ol { list-style-type: decimal !important; padding-left: 1.5rem !important; margin: 1rem 0 !important; }
        .ProseMirror li { display: list-item !important; }
        .Tiptap-mathematics-render { cursor: pointer; padding: 0 0.2rem; border-radius: 3px; background: rgba(0,0,0,0.05); }
      `}</style>

      {/* Toolbar */}
      <div className="flex items-center flex-wrap gap-1 px-3 py-2 border-b border-border bg-bg/50">
        <ToolbarButton title="Undo" onClick={() => editor.chain().focus().undo().run()}><Undo2 size={14} /></ToolbarButton>
        <ToolbarButton title="Redo" onClick={() => editor.chain().focus().redo().run()}><Redo2 size={14} /></ToolbarButton>
        
        <div className="w-px h-4 bg-border mx-1" />

        {/* Text Size (Using Headings as proxy for size) */}
        <ToolbarButton 
          title="Small Text" 
          onClick={() => editor.chain().focus().setParagraph().run()}
          active={editor.isActive('paragraph')}
        >
          <span className="text-[10px] font-bold">A</span>
        </ToolbarButton>
        <ToolbarButton 
          title="Large Text" 
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive('heading', { level: 3 })}
        >
          <span className="text-sm font-bold">A</span>
        </ToolbarButton>

        <div className="w-px h-4 bg-border mx-1" />

        {/* Text Color Picker */}
        <div className="flex items-center gap-0.5 group relative">
          <Palette size={14} className="text-ink-muted mr-1" />
          {COLORS.map(color => (
            <button
              key={color}
              onClick={() => editor.chain().focus().setColor(color).run()}
              className="w-4 h-4 rounded-full border border-black/10 transition-transform hover:scale-125"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>

        <div className="w-px h-4 bg-border mx-1" />

        {/* Highlight Color Picker */}
        <div className="flex items-center gap-0.5">
          <Highlighter size={14} className="text-ink-muted mr-1" />
          {HIGHLIGHTS.map(color => (
            <button
              key={color}
              onClick={() => editor.chain().focus().toggleHighlight({ color }).run()}
              className={clsx(
                "w-4 h-4 rounded-sm border border-black/10 transition-transform hover:scale-125",
                editor.isActive('highlight', { color }) && "ring-2 ring-accent"
              )}
              style={{ backgroundColor: color }}
            />
          ))}
          <button 
            onClick={() => editor.chain().focus().unsetHighlight().run()}
            className="text-[10px] text-ink-muted ml-1 hover:text-danger"
          >Clear</button>
        </div>

        <div className="w-px h-4 bg-border mx-1" />

        <ToolbarButton active={editor.isActive("bold")} title="Bold" onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={14} /></ToolbarButton>
        <ToolbarButton active={editor.isActive("italic")} title="Italic" onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={14} /></ToolbarButton>
        <ToolbarButton active={editor.isActive("underline")} title="Underline" onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon size={14} /></ToolbarButton>
        
        <div className="w-px h-4 bg-border mx-1" />

        <ToolbarButton title="Bullet List" onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={14} /></ToolbarButton>
        <ToolbarButton title="Formula" onClick={() => editor.chain().focus().insertContent("$E=mc^2$").run()}><Sigma size={14} /></ToolbarButton>
      </div>

      <EditorContent
        editor={editor}
        className="px-8 py-6 min-h-[400px] prose-sm max-w-none focus:outline-none"
      />
    </div>
  );
}