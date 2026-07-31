"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eraser, Pen, Trash2 } from "lucide-react";

const PEN_COLORS = [
  { id: "black", value: "#000000", label: "Black" },
  { id: "red", value: "#ef4444", label: "Red" },
  { id: "blue", value: "#3b82f6", label: "Blue" },
  { id: "green", value: "#22c55e", label: "Green" },
  { id: "amber", value: "#f59e0b", label: "Amber" },
] as const;

const PEN_SIZES = [2, 4, 6, 10] as const;

type Tool = "pen" | "eraser";

interface ProblemWhiteboardProps {
  questionId: string;
}

export default function ProblemWhiteboard({
  questionId,
}: ProblemWhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const savedDataUrlRef = useRef<string | null>(null);

  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(PEN_COLORS[0].value);
  const [size, setSize] = useState<number>(4);

  const storageKey = `dsa-whiteboard:${questionId}`;

  const fillBackground = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
  }, []);

  const drawImageDataUrl = useCallback(
    (dataUrl: string, width: number, height: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const img = new Image();
      img.onload = () => {
        fillBackground(ctx, width, height);
        ctx.drawImage(img, 0, 0, width, height);
      };
      img.src = dataUrl;
    },
    [fillBackground],
  );

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = container.getBoundingClientRect();
    if (width <= 0 || height <= 0) return;

    if (canvas.width > 0 && canvas.height > 0) {
      try {
        savedDataUrlRef.current = canvas.toDataURL("image/png");
      } catch {
        // ignore
      }
    }

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (savedDataUrlRef.current) {
      drawImageDataUrl(savedDataUrlRef.current, width, height);
    } else {
      fillBackground(ctx, width, height);
    }
  }, [drawImageDataUrl, fillBackground]);

  const saveSnapshot = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const dataUrl = canvas.toDataURL("image/png");
      savedDataUrlRef.current = dataUrl;
      localStorage.setItem(storageKey, dataUrl);
    } catch {
      // ignore quota / security errors
    }
  }, [storageKey]);

  const restoreSnapshot = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const saved = localStorage.getItem(storageKey);
    if (!saved) return;

    savedDataUrlRef.current = saved;
    const { width, height } = container.getBoundingClientRect();
    drawImageDataUrl(saved, width, height);
  }, [drawImageDataUrl, storageKey]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = container.getBoundingClientRect();
    fillBackground(ctx, width, height);
    savedDataUrlRef.current = null;
    localStorage.removeItem(storageKey);
  }, [fillBackground, storageKey]);

  const getPoint = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }, []);

  const drawLine = useCallback(
    (from: { x: number; y: number }, to: { x: number; y: number }) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;
      ctx.lineWidth = tool === "eraser" ? size * 3 : size;
      ctx.stroke();
    },
    [color, size, tool],
  );

  const startDrawing = useCallback(
    (clientX: number, clientY: number) => {
      const point = getPoint(clientX, clientY);
      if (!point) return;
      isDrawingRef.current = true;
      lastPointRef.current = point;
    },
    [getPoint],
  );

  const continueDrawing = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDrawingRef.current) return;
      const point = getPoint(clientX, clientY);
      if (!point || !lastPointRef.current) return;
      drawLine(lastPointRef.current, point);
      lastPointRef.current = point;
    },
    [drawLine, getPoint],
  );

  const stopDrawing = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastPointRef.current = null;
    saveSnapshot();
  }, [saveSnapshot]);

  useEffect(() => {
    resizeCanvas();
    restoreSnapshot();

    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => resizeCanvas());
    observer.observe(container);
    return () => observer.disconnect();
  }, [resizeCanvas, restoreSnapshot]);

  const toolBtn =
    "flex items-center gap-1.5 border px-2.5 py-1.5 font-mono text-[10px] tracking-wider uppercase transition-colors";

  return (
    <div className="flex h-full flex-col bg-white dark:bg-black">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-gray-200 px-4 py-2.5 dark:border-white/8">
        <button
          type="button"
          onClick={() => setTool("pen")}
          className={`${toolBtn} ${
            tool === "pen"
              ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
              : "border-gray-200 text-gray-500 hover:border-gray-400 dark:border-white/10 dark:text-gray-400 dark:hover:border-white/30"
          }`}
        >
          <Pen className="h-3.5 w-3.5" />
          Pen
        </button>
        <button
          type="button"
          onClick={() => setTool("eraser")}
          className={`${toolBtn} ${
            tool === "eraser"
              ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
              : "border-gray-200 text-gray-500 hover:border-gray-400 dark:border-white/10 dark:text-gray-400 dark:hover:border-white/30"
          }`}
        >
          <Eraser className="h-3.5 w-3.5" />
          Eraser
        </button>

        <div className="mx-1 h-5 w-px bg-gray-200 dark:bg-white/10" />

        <div className="flex items-center gap-1.5">
          {PEN_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              title={c.label}
              onClick={() => {
                setColor(c.value);
                setTool("pen");
              }}
              className={`h-6 w-6 rounded-full border-2 transition-transform ${
                color === c.value && tool === "pen"
                  ? "scale-110 border-black dark:border-white"
                  : "border-gray-300 dark:border-white/20"
              }`}
              style={{ backgroundColor: c.value }}
            />
          ))}
        </div>

        <div className="mx-1 h-5 w-px bg-gray-200 dark:bg-white/10" />

        <div className="flex items-center gap-1">
          {PEN_SIZES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSize(s)}
              className={`flex h-7 w-7 items-center justify-center border font-mono text-[10px] transition-colors ${
                size === s
                  ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                  : "border-gray-200 text-gray-500 hover:border-gray-400 dark:border-white/10 dark:text-gray-400"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={clearCanvas}
          className={`${toolBtn} ml-auto border-gray-200 text-gray-500 hover:border-red-400 hover:text-red-500 dark:border-white/10 dark:text-gray-400 dark:hover:border-red-400 dark:hover:text-red-400`}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Clear
        </button>
      </div>

      <div
        ref={containerRef}
        className="relative min-h-0 flex-1 border-t border-gray-100 bg-white dark:border-white/5"
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 cursor-crosshair touch-none"
          onMouseDown={(e) => startDrawing(e.clientX, e.clientY)}
          onMouseMove={(e) => continueDrawing(e.clientX, e.clientY)}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={(e) => {
            e.preventDefault();
            const touch = e.touches[0];
            if (touch) startDrawing(touch.clientX, touch.clientY);
          }}
          onTouchMove={(e) => {
            e.preventDefault();
            const touch = e.touches[0];
            if (touch) continueDrawing(touch.clientX, touch.clientY);
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            stopDrawing();
          }}
        />
      </div>
    </div>
  );
}
