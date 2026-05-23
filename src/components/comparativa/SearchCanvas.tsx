'use client';

/* Canvas interactivo para la comparativa — muestra WorldModel + paths de búsqueda */

import { useRef, useEffect, useCallback } from 'react';
import type { Grid, GridSize, Position, AgentState, Direction } from '@/types/world';
import type { KnownCellRecord } from '@/lib/agent/memory';
import { BLUEPRINT_COLORS } from '@/config/colors';
import {
  calcCellSize,
  drawGridLayer,
  drawCellsLayer,
  drawAgentLayer,
  drawFogLayer,
  drawSearchPathLayer,
  drawGoalMarker,
  pixelToCell,
} from '@/lib/canvas/draw';

interface Props {
  grid: Grid;
  gridSize: GridSize;
  agentState: AgentState;
  agentLastDir: Direction;
  knownCells: KnownCellRecord;
  goalPos: Position | null;
  bfsPath: Position[];
  astarPath: Position[];
  onCellClick: (pos: Position) => void;
}

export function SearchCanvas({
  grid, gridSize, agentState, agentLastDir, knownCells,
  goalPos, bfsPath, astarPath, onCellClick,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvas.width === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const cellSize = calcCellSize(canvas.width, gridSize);

    // Capa 0: fondo + cuadrícula
    drawGridLayer(ctx, gridSize, cellSize);
    // Capa 1: celdas reales (realidad vs conocimiento visible por el agente)
    drawCellsLayer(ctx, grid, gridSize, cellSize);
    // Capa 2: niebla sobre celdas no conocidas por el agente
    drawFogLayer(ctx, knownCells, gridSize, cellSize);
    // Capa 3: paths de búsqueda — BFS en amarillo, A* en verde
    if (bfsPath.length > 1) {
      drawSearchPathLayer(ctx, bfsPath, cellSize, BLUEPRINT_COLORS.accentData);
    }
    if (astarPath.length > 1) {
      drawSearchPathLayer(ctx, astarPath, cellSize, BLUEPRINT_COLORS.accentSuccess);
    }
    // Capa 4: marcador de objetivo
    if (goalPos) drawGoalMarker(ctx, goalPos, cellSize);
    // Capa 5: agente
    drawAgentLayer(ctx, agentState, agentLastDir, cellSize);
  }, [grid, gridSize, agentState, agentLastDir, knownCells, goalPos, bfsPath, astarPath]);

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

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cellSize = calcCellSize(canvas.width, gridSize);
    const pos = pixelToCell(e.clientX, e.clientY, canvas, cellSize);
    if (!pos || pos.x < 0 || pos.y < 0 || pos.x >= gridSize || pos.y >= gridSize) return;
    onCellClick(pos);
  }

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center">
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        style={{ display: 'block', cursor: 'crosshair' }}
      />
    </div>
  );
}
