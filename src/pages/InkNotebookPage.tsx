import { useRef, useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  useInkEngine,
  Tool,
  TextPlacement,
  InkDocument,
  StrokeElement,
} from "../hooks/useInkEngine";
import {
  Pen,
  Highlighter,
  Eraser,
  Undo2,
  Redo2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  ArrowLeft,
  Type,
  Check,
  X,
} from "lucide-react";
import { Button } from "../components/ui/primitives";
import clsx from "clsx";

const PAGE_WIDTH = 1240;
const PAGE_HEIGHT = 1754;
const TEXT_BOX_WIDTH = 360;

const PEN_COLORS = [
  { label: "Black", value: "#1a1a1a" },
  { label: "Blue", value: "#1d4ed8" },
  { label: "Red", value: "#dc2626" },
  { label: "Green", value: "#16a34a" },
  { label: "Purple", value: "#7c3aed" },
];

const HIGHLIGHTER_COLORS = [
  { label: "Yellow", value: "#fbbf24" },
  { label: "Cyan", value: "#22d3ee" },
  { label: "Pink", value: "#f472b6" },
  { label: "Green", value: "#4ade80" },
];

function ToolBtn({
  active,
  onClick,
  title,
  children,
  danger,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={clsx(
        "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
        active && !danger && "bg-ink text-white shadow-md scale-105",
        active && danger && "bg-red-500 text-white shadow-md",
        !active && "text-ink-muted hover:text-ink hover:bg-border/60"
      )}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div className="w-full h-px bg-border my-1" />;
}

function clampTextPlacement(placement: TextPlacement): TextPlacement {
  return {
    ...placement,
    x: Math.max(88, Math.min(placement.x, PAGE_WIDTH - TEXT_BOX_WIDTH - 56)),
    y: Math.max(44, Math.min(placement.y, PAGE_HEIGHT - 220)),
  };
}

function getTextFontSize(size: number) {
  return size * 4 + 16;
}

function isInkDocument(value: unknown): value is InkDocument | StrokeElement[] {
  return Array.isArray(value) || (!!value && typeof value === "object");
}

export default function InkNotebookPage() {
  const { subject: encodedSubject } = useParams<{ subject: string }>();
  const subject = encodedSubject ? decodeURIComponent(encodedSubject) : "Notebook";

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const loadedRef = useRef(false);
  const savedDocumentRef = useRef<string | null>(null);

  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "idle" | "error">("idle");
  const [saveRetryToken, setSaveRetryToken] = useState(0);
  const [pendingText, setPendingText] = useState<{
    placement: TextPlacement;
    value: string;
  } | null>(null);

  const inkData = useQuery(api.inkStrokes.get, { subject });
  const saveInk = useMutation(api.inkStrokes.save);

  const [state, actions] = useInkEngine();
  const { tool, color, size, canUndo, canRedo, currentPageIndex, totalPages } = state;

  const documentJson = JSON.stringify(actions.exportDocument());

  useEffect(() => {
    if (inkData === undefined || loadedRef.current) return;

    loadedRef.current = true;
    savedDocumentRef.current = inkData?.strokes ?? documentJson;

    if (!inkData?.strokes) return;

    try {
      const parsed = JSON.parse(inkData.strokes);
      if (isInkDocument(parsed)) {
        actions.importDocument(parsed);
      }
    } catch {
      savedDocumentRef.current = documentJson;
    }
  }, [actions, documentJson, inkData]);

  useEffect(() => {
    if (!pendingText) return;
    textAreaRef.current?.focus();
  }, [pendingText]);

  useEffect(() => {
    if (!loadedRef.current) return;
    if (savedDocumentRef.current === documentJson) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);

    setSaveStatus("saving");

    saveTimerRef.current = setTimeout(async () => {
      try {
        await saveInk({ subject, strokes: documentJson });
        savedDocumentRef.current = documentJson;
        setSaveStatus("saved");
        retryTimerRef.current = setTimeout(() => setSaveStatus("idle"), 1800);
      } catch {
        setSaveStatus("error");
        retryTimerRef.current = setTimeout(() => {
          setSaveRetryToken((token) => token + 1);
        }, 2500);
      }
    }, 900);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [documentJson, saveInk, saveRetryToken, subject]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = PAGE_WIDTH;
    canvas.height = PAGE_HEIGHT;
    actions.renderToCanvas(canvas, currentPageIndex);
  }, [actions, currentPageIndex]);

  const activateTool = useCallback((nextTool: Tool) => {
    if (nextTool !== "text") {
      setPendingText(null);
    }
    if (nextTool === "text" && !PEN_COLORS.some((option) => option.value === color)) {
      actions.setColor(PEN_COLORS[0].value);
    }
    actions.setTool(nextTool);
  }, [actions, color]);

  const commitText = useCallback(() => {
    if (!pendingText) return;

    actions.addText({
      text: pendingText.value,
      x: pendingText.placement.x,
      y: pendingText.placement.y,
      width: TEXT_BOX_WIDTH,
      fontSize: getTextFontSize(size),
      color,
      pageIndex: pendingText.placement.pageIndex,
    });
    setPendingText(null);
  }, [actions, color, pendingText, size]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTypingTarget =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (pendingText && e.key === "Escape") {
        e.preventDefault();
        setPendingText(null);
        return;
      }

      if (isTypingTarget) return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) actions.redo();
        else actions.undo();
        return;
      }

      if (e.key === "p") activateTool("pen");
      if (e.key === "h") activateTool("highlighter");
      if (e.key === "e") activateTool("eraser");
      if (e.key === "t") activateTool("text");
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [actions, activateTool, pendingText]);

  const handlers = actions.getCanvasHandlers(canvasRef.current, {
    onTextPlacement: (placement) => {
      setPendingText({
        placement: clampTextPlacement(placement),
        value: "",
      });
    },
  });

  const colorOptions = tool === "highlighter" ? HIGHLIGHTER_COLORS : PEN_COLORS;
  const saveLabel =
    saveStatus === "saving"
      ? "Saving…"
      : saveStatus === "saved"
        ? "Saved"
        : saveStatus === "error"
          ? "Retrying save…"
          : "Autosaves on its own";

  return (
    <div
      className="fixed inset-0 z-50 bg-[#f5f3ef] flex"
      style={{ touchAction: "none" }}
    >
      <div className="w-16 flex-shrink-0 bg-white border-r border-border flex flex-col items-center py-3 gap-1 shadow-sm z-10">
        <Link
          to="/notebook"
          className="w-10 h-10 rounded-xl flex items-center justify-center text-ink-muted hover:text-ink hover:bg-border/60 transition-all mb-1"
          title="Back to notebooks"
        >
          <ArrowLeft size={16} />
        </Link>

        <Sep />

        <ToolBtn active={tool === "pen"} onClick={() => activateTool("pen")} title="Pen (P)">
          <Pen size={17} />
        </ToolBtn>
        <ToolBtn active={tool === "highlighter"} onClick={() => activateTool("highlighter")} title="Highlighter (H)">
          <Highlighter size={17} />
        </ToolBtn>
        <ToolBtn active={tool === "text"} onClick={() => activateTool("text")} title="Text (T)">
          <Type size={17} />
        </ToolBtn>
        <ToolBtn active={tool === "eraser"} onClick={() => activateTool("eraser")} title="Eraser (E)">
          <Eraser size={17} />
        </ToolBtn>

        <Sep />

        <div className="flex flex-col items-center gap-1.5 py-1">
          {colorOptions.map((option) => (
            <button
              key={option.value}
              title={option.label}
              onClick={() => actions.setColor(option.value)}
              className={clsx(
                "w-6 h-6 rounded-full border-2 transition-all",
                color === option.value ? "border-ink scale-110 shadow-md" : "border-white hover:scale-105"
              )}
              style={{ backgroundColor: option.value }}
            />
          ))}
        </div>

        <Sep />

        <div className="flex flex-col items-center gap-1.5 py-1">
          {[2, 4, 7].map((s) => (
            <button
              key={s}
              title={tool === "text" ? `Text size ${getTextFontSize(s)}` : `Size ${s}`}
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

        <ToolBtn onClick={actions.undo} title="Undo (Ctrl/Cmd+Z)">
          <Undo2 size={16} className={canUndo ? "text-ink" : "text-ink-light"} />
        </ToolBtn>
        <ToolBtn onClick={actions.redo} title="Redo (Ctrl/Cmd+Shift+Z)">
          <Redo2 size={16} className={canRedo ? "text-ink" : "text-ink-light"} />
        </ToolBtn>

        <Sep />

        <ToolBtn onClick={actions.clearPage} title="Clear page" danger>
          <Trash2 size={15} className="text-ink-muted" />
        </ToolBtn>

        <div className="flex-1" />

        <div className="w-10 h-8 flex items-center justify-center" title={saveLabel}>
          {saveStatus === "saving" && (
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          )}
          {saveStatus === "saved" && (
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          )}
          {saveStatus === "error" && (
            <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto flex flex-col items-center py-8 px-6 gap-6">
        <div className="flex items-center gap-3 self-start ml-2 flex-wrap">
          <h1 className="text-sm font-semibold text-ink-muted tracking-wide">{subject}</h1>
          <span className="text-xs text-ink-light">
            Page {currentPageIndex + 1} of {totalPages}
          </span>
          <span
            className={clsx(
              "text-xs",
              saveStatus === "error"
                ? "text-danger"
                : saveStatus === "saved"
                  ? "text-success"
                  : "text-ink-light"
            )}
          >
            {saveLabel}
          </span>
          {tool === "text" && (
            <span className="text-xs text-ink-light">
              Click anywhere on the page to place typed text
            </span>
          )}
        </div>

        <div
          className="relative bg-white shadow-2xl rounded-sm"
          style={{
            width: "min(calc(100vw - 200px), 900px)",
            aspectRatio: `${PAGE_WIDTH} / ${PAGE_HEIGHT}`,
          }}
        >
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
          <div
            className="absolute top-0 bottom-0 pointer-events-none"
            style={{ left: "72px", width: "1px", backgroundColor: "#f0a0a0", opacity: 0.5 }}
          />

          {pendingText && (
            <div
              className="absolute z-20"
              style={{
                left: `${(pendingText.placement.x / PAGE_WIDTH) * 100}%`,
                top: `${(pendingText.placement.y / PAGE_HEIGHT) * 100}%`,
                width: `${(TEXT_BOX_WIDTH / PAGE_WIDTH) * 100}%`,
                maxWidth: "min(360px, calc(100% - 32px))",
              }}
            >
              <div className="rounded-2xl border border-border bg-[#fffdf8]/95 shadow-xl backdrop-blur-sm p-3">
                <textarea
                  ref={textAreaRef}
                  value={pendingText.value}
                  onChange={(e) =>
                    setPendingText((current) =>
                      current ? { ...current, value: e.target.value } : current
                    )
                  }
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                      e.preventDefault();
                      commitText();
                    }
                    if (e.key === "Escape") {
                      e.preventDefault();
                      setPendingText(null);
                    }
                  }}
                  placeholder="Type your note here..."
                  className="w-full min-h-[120px] resize-none rounded-xl border border-border bg-white/90 px-3 py-2 text-ink placeholder:text-ink-light focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  style={{
                    fontSize: `clamp(14px, 1.2vw, ${getTextFontSize(size)}px)`,
                    lineHeight: 1.45,
                  }}
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-[11px] text-ink-light">Ctrl/Cmd+Enter inserts the text</p>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setPendingText(null)}>
                      <X size={14} />
                      Cancel
                    </Button>
                    <Button size="sm" variant="primary" onClick={commitText}>
                      <Check size={14} />
                      Insert text
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
            style={{
              cursor: tool === "eraser" ? "cell" : tool === "text" ? "text" : "crosshair",
              touchAction: "none",
            }}
            {...handlers}
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (currentPageIndex === 0) return;
              setPendingText(null);
              actions.setPage(currentPageIndex - 1);
            }}
            disabled={currentPageIndex === 0}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-ink-muted hover:text-ink hover:bg-white transition-all disabled:opacity-30"
          >
            <ChevronLeft size={18} />
          </button>

          {Array.from({ length: totalPages }, (_, index) => (
            <button
              key={index}
              onClick={() => {
                setPendingText(null);
                actions.setPage(index);
              }}
              className={clsx(
                "w-8 h-8 rounded-lg text-sm font-medium transition-all",
                currentPageIndex === index
                  ? "bg-ink text-white shadow-md"
                  : "bg-white text-ink-muted hover:text-ink shadow-sm"
              )}
            >
              {index + 1}
            </button>
          ))}

          <button
            onClick={() => {
              setPendingText(null);
              actions.addPage();
            }}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-ink-muted hover:text-ink hover:bg-white transition-all"
            title="Add page"
          >
            <Plus size={18} />
          </button>

          <button
            onClick={() => {
              if (currentPageIndex >= totalPages - 1) return;
              setPendingText(null);
              actions.setPage(currentPageIndex + 1);
            }}
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
