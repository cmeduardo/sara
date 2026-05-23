'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useWorldStore } from '@/store/worldStore';
import { useUIStore } from '@/store/uiStore';
import { DEFAULTS } from '@/config/defaults';
import {
  CANVAS_MARGIN,
  calcCellSize,
  drawGridLayer,
  drawCellsLayer,
  drawAgentLayer,
  drawVisibilityLayer,
  drawBeliefLayer,
  drawPlanLayer,
} from '@/lib/canvas/draw';

export function GridCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { grid, gridSize, agentState, agentLastDir, plan, beliefs } = useWorldStore();
  const { showVisibility, showBeliefs, showPlan } = useUIStore();

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvas.width === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cellSize = calcCellSize(canvas.width, gridSize);

    drawGridLayer(ctx, gridSize, cellSize);
    drawCellsLayer(ctx, grid, gridSize, cellSize);

    if (showBeliefs) drawBeliefLayer(ctx, gridSize, cellSize, beliefs);
    if (showVisibility)
      drawVisibilityLayer(ctx, gridSize, cellSize, agentState.pos, DEFAULTS.agentVisionRadius);
    if (showPlan) drawPlanLayer(ctx, plan, cellSize);

    drawAgentLayer(ctx, agentState, agentLastDir, cellSize);
  }, [grid, gridSize, agentState, agentLastDir, plan, beliefs, showVisibility, showBeliefs, showPlan]);

  // Referencia siempre actualizada para el ResizeObserver
  const drawRef = useRef(draw);
  useEffect(() => { drawRef.current = draw; }, [draw]);

  // ResizeObserver: ajusta el canvas a cuadrado y redibujar
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

  // Redibujar ante cualquier cambio de estado
  useEffect(() => { draw(); }, [draw]);

  // Etiqueta de dimensiones en la esquina (solo como dato, usa CANVAS_MARGIN)
  void CANVAS_MARGIN;

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center">
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </div>
  );
}
