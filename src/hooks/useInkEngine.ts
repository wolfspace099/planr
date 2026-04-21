import { useRef, useState, useCallback, useEffect } from "react";
import getStroke from "perfect-freehand";

// ─── Types ────────────────────────────────────────────────────────────────────
export type Tool = "pen" | "highlighter" | "eraser";

export interface StrokePoint {
  x: number;
  y: number;
  pressure: number;
}

export interface Stroke {
  id: string;
  tool: Tool;
  color: string;
  size: number;
  opacity: number;
  points: StrokePoint[];
  pageIndex: number;
}

export interface InkEngineState {
  strokes: Stroke[];
  tool: Tool;
  color: string;
  size: number;
  canUndo: boolean;
  canRedo: boolean;
  currentPageIndex: number;
  totalPages: number;
}

export interface InkEngineActions {
  setTool: (t: Tool) => void;
  setColor: (c: string) => void;
  setSize: (s: number) => void;
  undo: () => void;
  redo: () => void;
  addPage: () => void;
  setPage: (i: number) => void;
  clearPage: () => void;
  getCanvasHandlers: (canvas: HTMLCanvasElement | null) => PointerHandlers;
  renderToCanvas: (canvas: HTMLCanvasElement, pageIndex: number) => void;
  exportStrokes: () => Stroke[];
  importStrokes: (strokes: Stroke[]) => void;
}

export interface PointerHandlers {
  onPointerDown: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerLeave: (e: React.PointerEvent<HTMLCanvasElement>) => void;
}

// ─── Perfect Freehand options per tool ───────────────────────────────────────
function getFreehandOptions(tool: Tool, size: number) {
  if (tool === "highlighter") {
    return {
      size: size * 3,
      smoothing: 0.5,
      thinning: 0,
      streamline: 0.4,
      easing: (t: number) => t,
      start: { taper: 0, cap: true },
      end: { taper: 0, cap: true },
      simulatePressure: false,
    };
  }
  return {
    size,
    smoothing: 0.5,
    thinning: 0.5,
    streamline: 0.5,
    easing: (t: number) => Math.sin((t * Math.PI) / 2),
    start: { taper: 10, cap: true },
    end: { taper: 10, cap: true },
    simulatePressure: false,
  };
}

// ─── SVG path from perfect-freehand points ───────────────────────────────────
function getSvgPathFromStroke(points: number[][]): string {
  if (!points.length) return "";
  const d = points.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ["M", ...points[0], "Q"] as (string | number)[]
  );
  d.push("Z");
  return d.join(" ");
}

// ─── Render a single stroke onto a canvas context ────────────────────────────
function renderStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  if (stroke.points.length < 2) return;

  const inputPoints = stroke.points.map(
    (p): [number, number, number] => [p.x, p.y, p.pressure]
  );

  const outlinePoints = getStroke(
    inputPoints, 
    getFreehandOptions(stroke.tool, stroke.size)
  );
  const pathStr = getSvgPathFromStroke(outlinePoints);
  const path = new Path2D(pathStr);

  ctx.save();
  if (stroke.tool === "highlighter") {
    ctx.globalAlpha = 0.35;
    ctx.globalCompositeOperation = "multiply";
  } else {
    ctx.globalAlpha = stroke.opacity;
    ctx.globalCompositeOperation = "source-over";
  }
  ctx.fillStyle = stroke.color;
  ctx.fill(path);
  ctx.restore();
}

// ─── Main hook ────────────────────────────────────────────────────────────────
export function useInkEngine(): [InkEngineState, InkEngineActions] {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[][]>([]);
  const [tool, setToolState] = useState<Tool>("pen");
  const [color, setColorState] = useState("#1a1a1a");
  const [size, setSizeState] = useState(3);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const activeStrokeRef = useRef<Stroke | null>(null);
  const isDrawingRef = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // ── Render all strokes for a page ──────────────────────────────────────────
  const renderToCanvas = useCallback((canvas: HTMLCanvasElement, pageIndex: number) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const pageStrokes = strokes.filter((s) => s.pageIndex === pageIndex);
    for (const stroke of pageStrokes) {
      renderStroke(ctx, stroke);
    }
  }, [strokes]);

  // ── Re-render current page when strokes change ─────────────────────────────
  useEffect(() => {
    if (canvasRef.current) {
      renderToCanvas(canvasRef.current, currentPageIndex);
    }
  }, [strokes, currentPageIndex, renderToCanvas]);

  // ── Erase strokes that intersect point ─────────────────────────────────────
  const eraseAt = useCallback((x: number, y: number, radius: number) => {
    setStrokes((prev) => prev.filter((stroke) => {
      if (stroke.pageIndex !== currentPageIndex) return true;
      return !stroke.points.some(
        (p) => Math.hypot(p.x - x, p.y - y) < radius
      );
    }));
  }, [currentPageIndex]);

  // ── Pointer handlers ───────────────────────────────────────────────────────
  const getCanvasHandlers = useCallback((canvas: HTMLCanvasElement | null): PointerHandlers => {
    canvasRef.current = canvas;

    const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    };

    const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
      // Palm rejection: only accept pen or mouse, never touch
      if (e.pointerType === "touch") return;
      e.preventDefault();
      canvas?.setPointerCapture(e.pointerId);
      isDrawingRef.current = true;

      const { x, y } = getPos(e);
      const pressure = e.pressure || 0.5;

      if (tool === "eraser") {
        eraseAt(x, y, size * 4);
        return;
      }

      const stroke: Stroke = {
        id: `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        tool,
        color,
        size,
        opacity: 1,
        points: [{ x, y, pressure }],
        pageIndex: currentPageIndex,
      };
      activeStrokeRef.current = stroke;

      // Clear redo stack on new stroke
      setRedoStack([]);
    };

    const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (e.pointerType === "touch") return;
      if (!isDrawingRef.current) return;
      e.preventDefault();

      const { x, y } = getPos(e);
      const pressure = e.pressure || 0.5;

      if (tool === "eraser") {
        eraseAt(x, y, size * 4);
        return;
      }

      if (!activeStrokeRef.current || !canvas) return;
      activeStrokeRef.current.points.push({ x, y, pressure });

      // Live render active stroke
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Redraw page strokes + active stroke
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const pageStrokes = strokes.filter((s) => s.pageIndex === currentPageIndex);
        for (const s of pageStrokes) renderStroke(ctx, s);
        renderStroke(ctx, activeStrokeRef.current);
      }
    };

    const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (e.pointerType === "touch") return;
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;

      if (tool === "eraser") return;

      const stroke = activeStrokeRef.current;
      if (stroke && stroke.points.length > 1) {
        setStrokes((prev) => [...prev, stroke]);
      }
      activeStrokeRef.current = null;
    };

    const onPointerLeave = (e: React.PointerEvent<HTMLCanvasElement>) => {
      onPointerUp(e);
    };

    return { onPointerDown, onPointerMove, onPointerUp, onPointerLeave };
  }, [tool, color, size, currentPageIndex, strokes, eraseAt]);

  // ── Undo ───────────────────────────────────────────────────────────────────
  const undo = useCallback(() => {
    setStrokes((prev) => {
      const pageStrokes = prev.filter((s) => s.pageIndex === currentPageIndex);
      if (pageStrokes.length === 0) return prev;
      const lastStroke = pageStrokes[pageStrokes.length - 1];
      setRedoStack((r) => [...r, prev]);
      return prev.filter((s) => s.id !== lastStroke.id);
    });
  }, [currentPageIndex]);

  // ── Redo ───────────────────────────────────────────────────────────────────
  const redo = useCallback(() => {
    setRedoStack((stack) => {
      if (stack.length === 0) return stack;
      const prev = stack[stack.length - 1];
      setStrokes(prev);
      return stack.slice(0, -1);
    });
  }, []);

  // ── Pages ──────────────────────────────────────────────────────────────────
  const addPage = useCallback(() => {
    setTotalPages((n) => n + 1);
    setCurrentPageIndex((i) => i + 1);
  }, []);

  const setPage = useCallback((i: number) => {
    setCurrentPageIndex(i);
  }, []);

  const clearPage = useCallback(() => {
    setRedoStack((r) => [...r, strokes]);
    setStrokes((prev) => prev.filter((s) => s.pageIndex !== currentPageIndex));
  }, [strokes, currentPageIndex]);

  // ── Import / export ────────────────────────────────────────────────────────
  const exportStrokes = useCallback(() => strokes, [strokes]);
  const importStrokes = useCallback((s: Stroke[]) => {
    setStrokes(s);
    const maxPage = s.reduce((m, stroke) => Math.max(m, stroke.pageIndex), 0);
    setTotalPages(maxPage + 1);
  }, []);

  const pageStrokesForCurrent = strokes.filter((s) => s.pageIndex === currentPageIndex);

  return [
    {
      strokes,
      tool,
      color,
      size,
      canUndo: pageStrokesForCurrent.length > 0,
      canRedo: redoStack.length > 0,
      currentPageIndex,
      totalPages,
    },
    {
      setTool: setToolState,
      setColor: setColorState,
      setSize: setSizeState,
      undo,
      redo,
      addPage,
      setPage,
      clearPage,
      getCanvasHandlers,
      renderToCanvas,
      exportStrokes,
      importStrokes,
    },
  ];
}