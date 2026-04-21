import { useRef, useState, useCallback, useEffect } from "react";

export type Tool = "pen" | "highlighter" | "eraser" | "text";

export interface StrokePoint {
  x: number;
  y: number;
  pressure: number;
}

interface BaseElement {
  id: string;
  pageIndex: number;
}

interface LegacyStrokeRecord extends BaseElement {
  tool: "pen" | "highlighter" | "eraser";
  color: string;
  size: number;
  opacity: number;
  points: StrokePoint[];
}

export interface StrokeElement extends BaseElement {
  type: "stroke";
  tool: "pen" | "highlighter";
  color: string;
  size: number;
  opacity: number;
  points: StrokePoint[];
}

export interface TextElement extends BaseElement {
  type: "text";
  text: string;
  x: number;
  y: number;
  width: number;
  fontSize: number;
  color: string;
}

export type InkElement = StrokeElement | TextElement;

export interface InkDocument {
  version: 2;
  totalPages: number;
  elements: InkElement[];
}

interface InkSnapshot {
  elements: InkElement[];
  totalPages: number;
  currentPageIndex: number;
}

export interface InkEngineState {
  elements: InkElement[];
  tool: Tool;
  color: string;
  size: number;
  canUndo: boolean;
  canRedo: boolean;
  currentPageIndex: number;
  totalPages: number;
}

export interface TextPlacement {
  x: number;
  y: number;
  pageIndex: number;
}

interface CanvasHandlerOptions {
  onTextPlacement?: (placement: TextPlacement) => void;
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
  addText: (input: {
    text: string;
    x: number;
    y: number;
    width?: number;
    fontSize?: number;
    color?: string;
    pageIndex?: number;
  }) => void;
  getCanvasHandlers: (
    canvas: HTMLCanvasElement | null,
    options?: CanvasHandlerOptions
  ) => PointerHandlers;
  renderToCanvas: (canvas: HTMLCanvasElement, pageIndex: number) => void;
  exportDocument: () => InkDocument;
  importDocument: (document: InkDocument | Array<StrokeElement | LegacyStrokeRecord>) => void;
}

export interface PointerHandlers {
  onPointerDown: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerLeave: (e: React.PointerEvent<HTMLCanvasElement>) => void;
}

const DEFAULT_TEXT_WIDTH = 360;
const DEFAULT_TEXT_FONT_SIZE = 30;
const TEXT_FONT_FAMILY = '"Patrick Hand", "Segoe Print", "Bradley Hand", cursive';

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function cloneElement(element: InkElement): InkElement {
  if (element.type === "stroke") {
    return {
      ...element,
      points: element.points.map((point) => ({ ...point })),
    };
  }
  return { ...element };
}

function cloneElements(elements: InkElement[]) {
  return elements.map(cloneElement);
}

function renderStroke(ctx: CanvasRenderingContext2D, stroke: StrokeElement) {
  ctx.save();
  if (stroke.tool === "highlighter") {
    ctx.globalAlpha = 0.35;
    ctx.globalCompositeOperation = "multiply";
  } else {
    ctx.globalAlpha = stroke.opacity;
    ctx.globalCompositeOperation = "source-over";
  }
  ctx.strokeStyle = stroke.color;
  ctx.fillStyle = stroke.color;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  if (stroke.points.length === 1) {
    const radius = stroke.tool === "highlighter" ? stroke.size * 1.5 : Math.max(stroke.size / 2, 1.5);
    const point = stroke.points[0];
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  for (let index = 1; index < stroke.points.length; index += 1) {
    const previous = stroke.points[index - 1];
    const current = stroke.points[index];
    const pressure = (previous.pressure + current.pressure) / 2 || 0.5;
    ctx.lineWidth =
      stroke.tool === "highlighter"
        ? stroke.size * 3
        : Math.max(stroke.size * (0.45 + pressure * 0.9), 1.25);

    ctx.beginPath();
    ctx.moveTo(previous.x, previous.y);
    ctx.lineTo(current.x, current.y);
    ctx.stroke();
  }
  ctx.restore();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number
) {
  const paragraphs = text.split(/\r?\n/);
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }

    let currentLine = words[0];
    for (const word of words.slice(1)) {
      const candidate = `${currentLine} ${word}`;
      if (ctx.measureText(candidate).width <= width) {
        currentLine = candidate;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
  }

  return lines;
}

function getTextMetrics(ctx: CanvasRenderingContext2D, element: TextElement) {
  ctx.save();
  ctx.font = `${element.fontSize}px ${TEXT_FONT_FAMILY}`;
  const lines = wrapText(ctx, element.text, element.width);
  const measuredWidth = lines.reduce(
    (max, line) => Math.max(max, ctx.measureText(line || " ").width),
    0
  );
  ctx.restore();

  const lineHeight = Math.round(element.fontSize * 1.35);
  return {
    lines,
    lineHeight,
    width: Math.max(measuredWidth, element.fontSize),
    height: Math.max(lines.length, 1) * lineHeight,
  };
}

function renderText(ctx: CanvasRenderingContext2D, element: TextElement) {
  const metrics = getTextMetrics(ctx, element);

  ctx.save();
  ctx.font = `${element.fontSize}px ${TEXT_FONT_FAMILY}`;
  ctx.fillStyle = element.color;
  ctx.textBaseline = "top";
  ctx.globalCompositeOperation = "source-over";

  metrics.lines.forEach((line, index) => {
    ctx.fillText(line || " ", element.x, element.y + index * metrics.lineHeight);
  });

  ctx.restore();
}

function renderElement(ctx: CanvasRenderingContext2D, element: InkElement) {
  if (element.type === "stroke") {
    renderStroke(ctx, element);
    return;
  }
  renderText(ctx, element);
}

function isPointInsideText(
  ctx: CanvasRenderingContext2D,
  element: TextElement,
  x: number,
  y: number,
  radius: number
) {
  const metrics = getTextMetrics(ctx, element);
  const padding = Math.max(radius, 10);
  return (
    x >= element.x - padding &&
    x <= element.x + metrics.width + padding &&
    y >= element.y - padding &&
    y <= element.y + metrics.height + padding
  );
}

function normalizeImportedDocument(
  document: InkDocument | Array<StrokeElement | LegacyStrokeRecord>
): InkDocument {
  if (Array.isArray(document)) {
    const elements = document.map<StrokeElement>((element) => {
      if ("type" in element) {
        return cloneElement(element) as StrokeElement;
      }

      return {
        ...element,
        type: "stroke",
        tool: element.tool === "highlighter" ? "highlighter" : "pen",
        points: element.points.map((point) => ({ ...point })),
      };
    });
    const maxPage = elements.reduce((max, element) => Math.max(max, element.pageIndex), 0);
    return {
      version: 2,
      totalPages: Math.max(maxPage + 1, 1),
      elements,
    };
  }

  return {
    version: 2,
    totalPages: Math.max(document.totalPages ?? 1, 1),
    elements: cloneElements(document.elements ?? []),
  };
}

export function useInkEngine(): [InkEngineState, InkEngineActions] {
  const [elements, setElements] = useState<InkElement[]>([]);
  const [historyPast, setHistoryPast] = useState<InkSnapshot[]>([]);
  const [historyFuture, setHistoryFuture] = useState<InkSnapshot[]>([]);
  const [tool, setToolState] = useState<Tool>("pen");
  const [color, setColorState] = useState("#1a1a1a");
  const [size, setSizeState] = useState(3);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const activeStrokeRef = useRef<StrokeElement | null>(null);
  const isDrawingRef = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const elementsRef = useRef<InkElement[]>([]);
  const eraseSessionRef = useRef(false);

  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);

  const createSnapshot = useCallback(
    (): InkSnapshot => ({
      elements: cloneElements(elementsRef.current),
      totalPages,
      currentPageIndex,
    }),
    [currentPageIndex, totalPages]
  );

  const restoreSnapshot = useCallback((snapshot: InkSnapshot) => {
    setElements(cloneElements(snapshot.elements));
    setTotalPages(Math.max(snapshot.totalPages, 1));
    setCurrentPageIndex(Math.min(snapshot.currentPageIndex, Math.max(snapshot.totalPages - 1, 0)));
  }, []);

  const pushHistory = useCallback((snapshot: InkSnapshot) => {
    setHistoryPast((prev) => [...prev, snapshot]);
    setHistoryFuture([]);
  }, []);

  const renderToCanvas = useCallback((canvas: HTMLCanvasElement, pageIndex: number) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const pageElements = elementsRef.current.filter((element) => element.pageIndex === pageIndex);
    for (const element of pageElements) {
      renderElement(ctx, element);
    }
  }, []);

  useEffect(() => {
    if (canvasRef.current) {
      renderToCanvas(canvasRef.current, currentPageIndex);
    }
  }, [elements, currentPageIndex, renderToCanvas]);

  const eraseAt = useCallback((x: number, y: number, radius: number) => {
    const ctx = canvasRef.current?.getContext("2d");
    const currentElements = elementsRef.current;

    const nextElements = currentElements.filter((element) => {
      if (element.pageIndex !== currentPageIndex) return true;

      if (element.type === "text") {
        if (!ctx) return true;
        return !isPointInsideText(ctx, element, x, y, radius);
      }

      return !element.points.some((point) => Math.hypot(point.x - x, point.y - y) < radius);
    });

    if (nextElements.length === currentElements.length) {
      return false;
    }

    setElements(nextElements);
    return true;
  }, [currentPageIndex]);

  const addText = useCallback((input: {
    text: string;
    x: number;
    y: number;
    width?: number;
    fontSize?: number;
    color?: string;
    pageIndex?: number;
  }) => {
    const trimmed = input.text.trim();
    if (!trimmed) return;

    pushHistory(createSnapshot());

    const textElement: TextElement = {
      id: createId("text"),
      type: "text",
      text: trimmed,
      x: input.x,
      y: input.y,
      width: input.width ?? DEFAULT_TEXT_WIDTH,
      fontSize: input.fontSize ?? DEFAULT_TEXT_FONT_SIZE,
      color: input.color ?? color,
      pageIndex: input.pageIndex ?? currentPageIndex,
    };

    setElements((prev) => [...prev, textElement]);
  }, [color, createSnapshot, currentPageIndex, pushHistory]);

  const getCanvasHandlers = useCallback((
    canvas: HTMLCanvasElement | null,
    options?: CanvasHandlerOptions
  ): PointerHandlers => {
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
      if (e.pointerType === "touch") return;
      e.preventDefault();

      const { x, y } = getPos(e);

      if (tool === "text") {
        options?.onTextPlacement?.({ x, y, pageIndex: currentPageIndex });
        return;
      }

      canvas?.setPointerCapture(e.pointerId);
      isDrawingRef.current = true;
      const pressure = e.pressure || 0.5;

      if (tool === "eraser") {
        const snapshot = createSnapshot();
        const changed = eraseAt(x, y, size * 4);
        eraseSessionRef.current = changed;
        if (changed) {
          pushHistory(snapshot);
        }
        return;
      }

      const stroke: StrokeElement = {
        id: createId("stroke"),
        type: "stroke",
        tool,
        color,
        size,
        opacity: 1,
        points: [{ x, y, pressure }],
        pageIndex: currentPageIndex,
      };
      activeStrokeRef.current = stroke;
      setHistoryFuture([]);
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

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const pageElements = elementsRef.current.filter((element) => element.pageIndex === currentPageIndex);
      for (const element of pageElements) {
        renderElement(ctx, element);
      }
      renderStroke(ctx, activeStrokeRef.current);
    };

    const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (e.pointerType === "touch") return;
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;

      if (tool === "eraser") {
        eraseSessionRef.current = false;
        return;
      }

      const stroke = activeStrokeRef.current;
      if (stroke && stroke.points.length > 1) {
        pushHistory(createSnapshot());
        setElements((prev) => [...prev, cloneElement(stroke)]);
      }
      activeStrokeRef.current = null;
    };

    const onPointerLeave = (e: React.PointerEvent<HTMLCanvasElement>) => {
      onPointerUp(e);
    };

    return { onPointerDown, onPointerMove, onPointerUp, onPointerLeave };
  }, [color, createSnapshot, currentPageIndex, eraseAt, pushHistory, size, tool]);

  const undo = useCallback(() => {
    setHistoryPast((prev) => {
      if (prev.length === 0) return prev;

      const previous = prev[prev.length - 1];
      setHistoryFuture((future) => [...future, createSnapshot()]);
      restoreSnapshot(previous);
      return prev.slice(0, -1);
    });
  }, [createSnapshot, restoreSnapshot]);

  const redo = useCallback(() => {
    setHistoryFuture((future) => {
      if (future.length === 0) return future;

      const next = future[future.length - 1];
      setHistoryPast((prev) => [...prev, createSnapshot()]);
      restoreSnapshot(next);
      return future.slice(0, -1);
    });
  }, [createSnapshot, restoreSnapshot]);

  const addPage = useCallback(() => {
    pushHistory(createSnapshot());
    setTotalPages((count) => count + 1);
    setCurrentPageIndex((index) => index + 1);
  }, [createSnapshot, pushHistory]);

  const setPage = useCallback((index: number) => {
    setCurrentPageIndex(index);
  }, []);

  const clearPage = useCallback(() => {
    const hasContent = elementsRef.current.some((element) => element.pageIndex === currentPageIndex);
    if (!hasContent) return;

    pushHistory(createSnapshot());
    setElements((prev) => prev.filter((element) => element.pageIndex !== currentPageIndex));
  }, [createSnapshot, currentPageIndex, pushHistory]);

  const exportDocument = useCallback((): InkDocument => ({
    version: 2,
    totalPages,
    elements: cloneElements(elementsRef.current),
  }), [totalPages]);

  const importDocument = useCallback((
    document: InkDocument | Array<StrokeElement | LegacyStrokeRecord>
  ) => {
    const normalized = normalizeImportedDocument(document);
    setElements(normalized.elements);
    setTotalPages(normalized.totalPages);
    setCurrentPageIndex(0);
    setHistoryPast([]);
    setHistoryFuture([]);
  }, []);

  return [
    {
      elements,
      tool,
      color,
      size,
      canUndo: historyPast.length > 0,
      canRedo: historyFuture.length > 0,
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
      addText,
      getCanvasHandlers,
      renderToCanvas,
      exportDocument,
      importDocument,
    },
  ];
}
