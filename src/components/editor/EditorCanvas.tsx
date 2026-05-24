'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useEditorStore } from '@/store/editorStore';
import {
  CANVAS_MARGIN,
  calcCellSize,
  drawGridLayer,
  drawCellsLayer,
  drawAgentStart,
  drawHoverHighlight,
  pixelToCell,
} from '@/lib/canvas/draw';
import type { Position } from '@/types/world';

export function EditorCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const isErasingRef = useRef(false);
  const hoverRef = useRef<Position | null>(null);

  const { grid, gridSize, agentStart, applyTool } = useEditorStore();

  // ─── Dibujo ────────────────────────────────────────────────────────────────

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvas.width === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cellSize = calcCellSize(canvas.width, gridSize);

    drawGridLayer(ctx, gridSize, cellSize);
    drawCellsLayer(ctx, grid, gridSize, cellSize);
    drawAgentStart(ctx, agentStart, cellSize);

    if (hoverRef.current) {
      drawHoverHighlight(ctx, hoverRef.current, cellSize);
    }
  }, [grid, gridSize, agentStart]);

  // Referencia estable para usar en event listeners
  const drawRef = useRef(draw);
  useEffect(() => { drawRef.current = draw; }, [draw]);

  // ─── ResizeObserver ───────────────────────────────────────────────────────

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const observer = new ResizeObserver(() => {
      const size = Math.min(container.clientWidth, container.clientHeight);
      if (size <= 0) return;
      canvas.width = size;
      canvas.height = size;
      drawRef.current();
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => { draw(); }, [draw]);

  // ─── Event handlers ───────────────────────────────────────────────────────

  const getCellSize = useCallback((): number => {
    const canvas = canvasRef.current;
    return canvas ? calcCellSize(canvas.width, gridSize) : 1;
  }, [gridSize]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      isDraggingRef.current = true;
      isErasingRef.current = e.button === 2;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const pos = pixelToCell(e.clientX, e.clientY, canvas, getCellSize(), gridSize);
      if (pos) applyTool(pos, isErasingRef.current);
    },
    [applyTool, getCellSize]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const pos = pixelToCell(e.clientX, e.clientY, canvas, getCellSize(), gridSize);

      hoverRef.current = pos;

      if (isDraggingRef.current && pos) {
        applyTool(pos, isErasingRef.current);
      }

      drawRef.current();
    },
    [applyTool, getCellSize]
  );

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    isErasingRef.current = false;
  }, []);

  const handleMouseLeave = useCallback(() => {
    isDraggingRef.current = false;
    hoverRef.current = null;
    drawRef.current();
  }, []);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      e.preventDefault();
    },
    []
  );

  // Etiqueta auxiliar para accesibilidad del canvas
  void CANVAS_MARGIN;

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center">
      <canvas
        ref={canvasRef}
        style={{ display: 'block', cursor: 'crosshair' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onContextMenu={handleContextMenu}
      />
    </div>
  );
}
