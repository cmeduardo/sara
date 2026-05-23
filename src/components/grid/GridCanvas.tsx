'use client';

import { useRef, useEffect, useCallback } from 'react';
import type { Grid, GridSize, Position, AgentState, Direction } from '@/types/world';
import { DEFAULTS } from '@/config/defaults';
import {
  calcCellSize,
  drawGridLayer,
  drawCellsLayer,
  drawAgentLayer,
  drawVisibilityLayer,
  drawBeliefLayer,
  drawPlanLayer,
} from '@/lib/canvas/draw';

interface GridCanvasProps {
  grid: Grid;
  gridSize: GridSize;
  agentState: AgentState;
  agentLastDir: Direction;
  plan: Position[];
  beliefs: Record<string, number>;
  showVisibility: boolean;
  showBeliefs: boolean;
  showPlan: boolean;
}

export function GridCanvas({
  grid, gridSize, agentState, agentLastDir, plan,
  beliefs, showVisibility, showBeliefs, showPlan,
}: GridCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const drawRef = useRef(draw);
  useEffect(() => { drawRef.current = draw; }, [draw]);

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

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center">
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </div>
  );
}
