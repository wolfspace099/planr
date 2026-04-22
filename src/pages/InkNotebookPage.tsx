import { useRef, useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useInkEngine, Tool, Stroke } from "../hooks/useInkEngine";
import {
  Pen, Highlighter, Eraser, Undo2, Redo2,
  ChevronLeft, ChevronRight, Plus, Trash2,
  Save, ArrowLeft, Type,
} from "lucide-react";
import clsx from "clsx";

// ─── Page dimensions (A4 ratio) ───────────────────────────────────────────────
const PAGE_WIDTH = 1240;
const PAGE_HEIGHT = 1754;

// ─── Pen colours ─────────────────────────────────────────────────────────────
const PEN_COLORS = [
  { label: "Black",  value: "#1a1a1a" },
  { label: "Blue",   value: "#1d4ed8" },
  { label: "Red",    value: "#dc2626" },
  { label: "Green",  value: "#16a34a" },
  { label: "Purple", value: "#7c3aed" },
];

const HIGHLIGHTER_COLORS = [
  { label: "Yellow", value: "#fbbf24" },
  { label: "Cyan",   value: "#22d3ee" },
  { label: "Pink",   value: "#f472b6" },
  { label: "Green",  value: "#4ade80" },
];

// ─── Toolbar button ───────────────────────────────────────────────────────────
function ToolBtn({
  active, onClick, title, children, danger,
}: {
  active?: boolean; onClick: () => void; title: string;
  children: React.ReactNode; danger?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={clsx(
        "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
        active && !danger && "bg-ink text-white shadow-md scale-105",
        active && danger && "bg-red-500 text-white shadow-md",
        !active && "text-ink-muted hover:text-ink hover:bg-border/60",
      )}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div className="w-full h-px bg-border my-1" />;
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function InkNotebookPage() {
  const { subject: encodedSubject } = useParams<{ subject: string }>();
  const subject = encodedSubject ? decodeURIComponent(encodedSubject) : "Notebook";

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "idle">("idle");

  const inkData = useQuery(api.inkStrokes.get, { subject });
  const saveInk = useMutation(api.inkStrokes.save);

  const [state, actions] = useInkEngine();
  const {
    tool, color, size, canUndo, canRedo,
    currentPageIndex, totalPages,
  } = state;

  // ── Load saved strokes ─────────────────────────────────────────────────────
  const loadedRef = useRef(false);
  useEffect(() => {
    if (inkData?.strokes && !loadedRef.current) {
      loadedRef.current = true;
      try {
        const parsed = JSON.parse(inkData.strokes) as Stroke[];
        actions.importStrokes(parsed);
      } catch {
        // empty / corrupt data, start fresh
      }
    }
  }, [inkData]);

  // ── Auto-save with debounce ────────────────────────────────────────────────
  const triggerSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus("saving");
    saveTimerRef.current = setTimeout(async () => {
      const json = JSON.stringify(actions.exportStrokes());
      await saveInk({ subject, strokes: json });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    }, 1200);
  }, [actions, saveInk, subject]);

  // Trigger save whenever strokes change
  const strokesJson = JSON.stringify(state.strokes);
  const prevStrokesRef = useRef(strokesJson);
  useEffect(() => {
    if (prevStrokesRef.current !== strokesJson && loadedRef.current) {
      prevStrokesRef.current = strokesJson;
      triggerSave();
    }
  }, [strokesJson, triggerSave]);

  // ── Canvas sizing ──────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = PAGE_WIDTH;
    canvas.height = PAGE_HEIGHT;
    actions.renderToCanvas(canvas, currentPageIndex);
  }, [currentPageIndex]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) actions.redo();
        else actions.undo();
      }
      if (e.key === "p") actions.setTool("pen");
      if (e.key === "h") actions.setTool("highlighter");
      if (e.key === "e") actions.setTool("eraser");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [actions]);

  const { onSelectStart: _onSelectStart, ...handlers } = actions.getCanvasHandlers(canvasRef.current);

  const colorOptions = tool === "highlighter" ? HIGHLIGHTER_COLORS : PEN_COLORS;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-[#f5f3ef] flex ink-canvas-wrapper"
      style={{
        touchAction: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      <style>{`
        .ink-canvas-wrapper, .ink-canvas-wrapper * {
          -webkit-user-select: none !important;
          user-select: none !important;
          -webkit-touch-callout: none !important;
          -webkit-tap-highlight-color: transparent !important;
        }
        .ink-canvas-wrapper ::selection { background: transparent !important; }
        .ink-canvas-wrapper ::-moz-selection { background: transparent !important; }
      `}</style>
      {/* ── Left toolbar ── */}
      <div className="w-16 flex-shrink-0 bg-white border-r border-border flex flex-col items-center py-3 gap-1 shadow-sm z-10">

        {/* Back */}
        <Link
          to={`/notebook/${encodedSubject}`}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-ink-muted hover:text-ink hover:bg-border/60 transition-all mb-1"
          title="Back to notebook"
        >
          <ArrowLeft size={16} />
        </Link>

        <Sep />

        {/* Tools */}
        <ToolBtn active={tool === "pen"} onClick={() => actions.setTool("pen")} title="Pen (P)">
          <Pen size={17} />
        </ToolBtn>
        <ToolBtn active={tool === "highlighter"} onClick={() => actions.setTool("highlighter")} title="Highlighter (H)">
          <Highlighter size={17} />
        </ToolBtn>
        <ToolBtn active={tool === "eraser"} onClick={() => actions.setTool("eraser")} title="Eraser (E)">
          <Eraser size={17} />
        </ToolBtn>

        <Sep />

        {/* Colours */}
        <div className="flex flex-col items-center gap-1.5 py-1">
          {colorOptions.map((c) => (
            <button
              key={c.value}
              title={c.label}
              onClick={() => actions.setColor(c.value)}
              className={clsx(
                "w-6 h-6 rounded-full border-2 transition-all",
                color === c.value ? "border-ink scale-110 shadow-md" : "border-white hover:scale-105"
              )}
              style={{ backgroundColor: c.value }}
            />
          ))}
        </div>

        <Sep />

        {/* Size */}
        <div className="flex flex-col items-center gap-1.5 py-1">
          {[2, 4, 7].map((s) => (
            <button
              key={s}
              title={`Size ${s}`}
              onClick={() => actions.setSize(s)}
              className={clsx(
                "rounded-full bg-ink transition-all",
                size === s ? "opacity-100 ring-2 ring-accent ring-offset-1" : "opacity-30 hover:opacity-60"
              )}
              style={{ width: s * 2.5 + 4, height: s * 2.5 + 4 }}
            />
          ))}
        </div>

        <Sep />

        {/* Undo / Redo */}
        <ToolBtn onClick={actions.undo} title="Undo (⌘Z)" active={false}>
          <Undo2 size={16} className={canUndo ? "text-ink" : "text-ink-light"} />
        </ToolBtn>
        <ToolBtn onClick={actions.redo} title="Redo (⌘⇧Z)" active={false}>
          <Redo2 size={16} className={canRedo ? "text-ink" : "text-ink-light"} />
        </ToolBtn>

        <Sep />

        {/* Clear page */}
        <ToolBtn onClick={actions.clearPage} title="Clear page" danger>
          <Trash2 size={15} className="text-ink-muted" />
        </ToolBtn>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Switch to text mode */}
        <Link
          to={`/notebook/${encodedSubject}`}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-ink-muted hover:text-ink hover:bg-border/60 transition-all"
          title="Switch to text mode"
        >
          <Type size={15} />
        </Link>

        {/* Save indicator */}
        <div className="w-10 h-6 flex items-center justify-center">
          {saveStatus === "saving" && (
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          )}
          {saveStatus === "saved" && (
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          )}
        </div>
      </div>

      {/* ── Canvas area ── */}
      <div className="flex-1 overflow-auto flex flex-col items-center py-8 px-6 gap-6" style={{ touchAction: "pan-y", WebkitOverflowScrolling: "touch" }}>

        {/* Subject label */}
        <div className="flex items-center gap-3 self-start ml-2">
          <h1 className="text-sm font-semibold text-ink-muted tracking-wide">{subject}</h1>
          <span className="text-xs text-ink-light">
            Page {currentPageIndex + 1} of {totalPages}
          </span>
        </div>

        {/* Paper canvas */}
        <div
          className="relative bg-white shadow-2xl rounded-sm"
          style={{
            width: "min(calc(100vw - 200px), 900px)",
            aspectRatio: `${PAGE_WIDTH} / ${PAGE_HEIGHT}`,
            touchAction: "none",
            WebkitUserSelect: "none",
            userSelect: "none",
          }}
        >
          {/* Ruled lines */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `repeating-linear-gradient(
                transparent,
                transparent 31px,
                #e8e4dc 31px,
                #e8e4dc 32px
              )`,
              backgroundPositionY: "40px",
            }}
          />
          {/* Margin line */}
          <div
            className="absolute top-0 bottom-0 pointer-events-none"
            style={{ left: "72px", width: "1px", backgroundColor: "#f0a0a0", opacity: 0.5 }}
          />

          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
            style={{
              cursor: tool === "eraser" ? "cell" : "crosshair",
              touchAction: "none",
              WebkitUserSelect: "none",
              userSelect: "none",
            }}
            onContextMenu={(e) => e.preventDefault()}
            onTouchStart={(e) => {
              // Only block multi-touch (palm = multiple touch points)
              // Single touch is still blocked by pointerType check in engine
              if (e.touches.length > 1) e.preventDefault();
            }}
            onSelectStart={(e) => e.preventDefault()}
            {...handlers}
          />
        </div>

        {/* Page navigation */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => currentPageIndex > 0 && actions.setPage(currentPageIndex - 1)}
            disabled={currentPageIndex === 0}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-ink-muted hover:text-ink hover:bg-white transition-all disabled:opacity-30"
          >
            <ChevronLeft size={18} />
          </button>

          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => actions.setPage(i)}
              className={clsx(
                "w-8 h-8 rounded-lg text-sm font-medium transition-all",
                currentPageIndex === i
                  ? "bg-ink text-white shadow-md"
                  : "bg-white text-ink-muted hover:text-ink shadow-sm"
              )}
            >
              {i + 1}
            </button>
          ))}

          <button
            onClick={actions.addPage}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-ink-muted hover:text-ink hover:bg-white transition-all"
            title="Add page"
          >
            <Plus size={18} />
          </button>

          <button
            onClick={() => currentPageIndex < totalPages - 1 && actions.setPage(currentPageIndex + 1)}
            disabled={currentPageIndex === totalPages - 1}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-ink-muted hover:text-ink hover:bg-white transition-all disabled:opacity-30"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}