'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useWorldStore } from '@/store/worldStore';
import { useUIStore } from '@/store/uiStore';
import { BLUEPRINT_COLORS } from '@/config/colors';
import { getCell } from '@/lib/environment/grid';
import { DEFAULTS } from '@/config/defaults';
import type { Grid, AgentState, Position, Direction } from '@/types/world';

/** Píxeles de margen izquierdo y superior para etiquetas de coordenadas */
const MARGIN = 24;

// ─────────────────────────────────────────
// Capa 0 — fondo y líneas de cuadrícula
// ─────────────────────────────────────────
function drawGridLayer(
  ctx: CanvasRenderingContext2D,
  gridSize: number,
  cellSize: number
): void {
  // Fondo completo del canvas
  ctx.fillStyle = BLUEPRINT_COLORS.bg;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const labelSize = Math.max(8, Math.floor(cellSize * 0.28));
  ctx.fillStyle = BLUEPRINT_COLORS.textDim;
  ctx.font = `${labelSize}px "JetBrains Mono", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < gridSize; i++) {
    const colCenter = MARGIN + (i + 0.5) * cellSize;
    const rowCenter = MARGIN + (i + 0.5) * cellSize;
    // Números de columna (x) arriba
    ctx.fillText(String(i), colCenter, MARGIN / 2);
    // Números de fila (y) a la izquierda
    ctx.fillText(String(i), MARGIN / 2, rowCenter);
  }

  // Líneas de cuadrícula
  ctx.strokeStyle = BLUEPRINT_COLORS.gridLine;
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= gridSize; i++) {
    const off = MARGIN + i * cellSize;
    // Vertical
    ctx.beginPath();
    ctx.moveTo(off, MARGIN);
    ctx.lineTo(off, MARGIN + gridSize * cellSize);
    ctx.stroke();
    // Horizontal
    ctx.beginPath();
    ctx.moveTo(MARGIN, off);
    ctx.lineTo(MARGIN + gridSize * cellSize, off);
    ctx.stroke();
  }
}

// ─────────────────────────────────────────
// Capa 1 — celdas con su tipo
// ─────────────────────────────────────────
function drawCellsLayer(
  ctx: CanvasRenderingContext2D,
  grid: Grid,
  gridSize: number,
  cellSize: number
): void {
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const cell = getCell(grid, { x, y });
      if (!cell) continue;
      const px = MARGIN + x * cellSize;
      const py = MARGIN + y * cellSize;

      switch (cell.type) {
        case 'obstacle':
          drawObstacle(ctx, px, py, cellSize);
          break;
        case 'danger':
          drawDanger(ctx, px, py, cellSize, cell.dangerProb ?? 0.5);
          break;
        case 'victim':
          drawVictim(ctx, px, py, cellSize);
          break;
        case 'station':
          drawStation(ctx, px, py, cellSize);
          break;
      }
    }
  }
}

function drawObstacle(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  cellSize: number
): void {
  const pad = 1;
  ctx.fillStyle = BLUEPRINT_COLORS.obstacle;
  ctx.fillRect(px + pad, py + pad, cellSize - 2 * pad, cellSize - 2 * pad);
}

function drawDanger(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  cellSize: number,
  prob: number
): void {
  // Fondo semitransparente
  ctx.fillStyle = BLUEPRINT_COLORS.dangerZone;
  ctx.fillRect(px, py, cellSize, cellSize);

  // Líneas diagonales recortadas al área de la celda
  ctx.save();
  ctx.beginPath();
  ctx.rect(px + 0.5, py + 0.5, cellSize - 1, cellSize - 1);
  ctx.clip();
  ctx.strokeStyle = BLUEPRINT_COLORS.accentDanger;
  ctx.lineWidth = 0.5;
  ctx.globalAlpha = 0.4;
  const spacing = Math.max(4, cellSize / 5);
  for (let off = -cellSize; off < cellSize * 2; off += spacing) {
    ctx.beginPath();
    ctx.moveTo(px + off, py);
    ctx.lineTo(px + off + cellSize, py + cellSize);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // Probabilidad como texto pequeño (solo si la celda tiene suficiente espacio)
  if (cellSize >= 18) {
    ctx.fillStyle = BLUEPRINT_COLORS.accentDanger;
    ctx.font = `${Math.max(7, Math.floor(cellSize * 0.22))}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${Math.round(prob * 100)}%`, px + cellSize / 2, py + cellSize - 1);
  }
}

function drawVictim(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  cellSize: number
): void {
  const cx = px + cellSize / 2;
  const cy = py + cellSize / 2;
  // Escala relativa a un tamaño de referencia de 32px para que se vea bien en cualquier zoom
  const s = cellSize / 32;

  ctx.strokeStyle = BLUEPRINT_COLORS.victim;
  ctx.lineWidth = Math.max(1, 1.5 * s);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Cabeza
  ctx.beginPath();
  ctx.arc(cx, cy - 7 * s, 3.5 * s, 0, Math.PI * 2);
  ctx.stroke();

  // Cuerpo, brazos y piernas en un solo path
  ctx.beginPath();
  ctx.moveTo(cx, cy - 3.5 * s);      // base del cuello
  ctx.lineTo(cx, cy + 4 * s);         // cadera
  ctx.moveTo(cx - 4 * s, cy);         // brazo izquierdo
  ctx.lineTo(cx + 4 * s, cy);         // brazo derecho
  ctx.moveTo(cx, cy + 4 * s);
  ctx.lineTo(cx - 3 * s, cy + 10 * s); // pierna izquierda
  ctx.moveTo(cx, cy + 4 * s);
  ctx.lineTo(cx + 3 * s, cy + 10 * s); // pierna derecha
  ctx.stroke();

  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';
}

function drawStation(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  cellSize: number
): void {
  const cx = px + cellSize / 2;
  const cy = py + cellSize / 2;
  const s = cellSize / 32;

  ctx.fillStyle = BLUEPRINT_COLORS.station;

  // Relámpago ⚡ minimalista (dos triángulos encadenados)
  const w = 5 * s;
  const h = 9 * s;
  ctx.beginPath();
  ctx.moveTo(cx + 1.5 * s, cy - h);
  ctx.lineTo(cx - w, cy + 0.5 * s);
  ctx.lineTo(cx + 0.5 * s, cy + 0.5 * s);
  ctx.lineTo(cx - 1.5 * s, cy + h);
  ctx.lineTo(cx + w, cy - 0.5 * s);
  ctx.lineTo(cx - 0.5 * s, cy - 0.5 * s);
  ctx.closePath();
  ctx.fill();
}

// ─────────────────────────────────────────
// Capa 2 — agente como rombo con indicador
// ─────────────────────────────────────────
function drawAgentLayer(
  ctx: CanvasRenderingContext2D,
  agentState: AgentState,
  lastDir: Direction,
  cellSize: number
): void {
  const { x, y } = agentState.pos;
  const cx = MARGIN + (x + 0.5) * cellSize;
  const cy = MARGIN + (y + 0.5) * cellSize;
  const hs = cellSize * 0.38; // half-size del rombo

  // Rombo principal
  ctx.fillStyle = BLUEPRINT_COLORS.agent;
  ctx.beginPath();
  ctx.moveTo(cx, cy - hs);
  ctx.lineTo(cx + hs, cy);
  ctx.lineTo(cx, cy + hs);
  ctx.lineTo(cx - hs, cy);
  ctx.closePath();
  ctx.fill();

  // Línea indicadora de dirección (color de fondo para que contraste)
  const lineLen = hs * 0.65;
  ctx.strokeStyle = BLUEPRINT_COLORS.bg;
  ctx.lineWidth = Math.max(1.5, cellSize * 0.06);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  switch (lastDir) {
    case 'N': ctx.lineTo(cx, cy - lineLen); break;
    case 'S': ctx.lineTo(cx, cy + lineLen); break;
    case 'E': ctx.lineTo(cx + lineLen, cy); break;
    case 'W': ctx.lineTo(cx - lineLen, cy); break;
  }
  ctx.stroke();
  ctx.lineCap = 'butt';
}

// ─────────────────────────────────────────
// Capa 3 — overlay de observabilidad parcial
// ─────────────────────────────────────────
function drawVisibilityLayer(
  ctx: CanvasRenderingContext2D,
  gridSize: number,
  cellSize: number,
  agentPos: Position,
  visionRadius: number
): void {
  const dotStep = Math.max(3, Math.floor(cellSize / 6));

  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const chebyshev = Math.max(
        Math.abs(x - agentPos.x),
        Math.abs(y - agentPos.y)
      );
      if (chebyshev <= visionRadius) continue;

      const px = MARGIN + x * cellSize;
      const py = MARGIN + y * cellSize;

      // Oscurecer la celda no observada
      ctx.fillStyle = 'rgba(14, 26, 38, 0.65)';
      ctx.fillRect(px, py, cellSize, cellSize);

      // Patrón sutil de puntos para indicar "zona no explorada"
      ctx.fillStyle = 'rgba(42, 58, 74, 0.85)';
      for (let dy = dotStep; dy < cellSize; dy += dotStep) {
        for (let dx = dotStep; dx < cellSize; dx += dotStep) {
          ctx.fillRect(px + dx, py + dy, 1, 1);
        }
      }
    }
  }
}

// ─────────────────────────────────────────
// Capa 4 — heatmap de creencias (toggle)
// ─────────────────────────────────────────
function drawBeliefLayer(
  ctx: CanvasRenderingContext2D,
  gridSize: number,
  cellSize: number,
  beliefs: Record<string, number>
): void {
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const prob = beliefs[`${x},${y}`] ?? 0;
      if (prob < 0.02) continue;
      const px = MARGIN + x * cellSize;
      const py = MARGIN + y * cellSize;
      // Más oscuro = mayor probabilidad de peligro inferida
      ctx.fillStyle = `rgba(80, 40, 40, ${prob * 0.6})`;
      ctx.fillRect(px, py, cellSize, cellSize);
    }
  }
}

// ─────────────────────────────────────────
// Capa 5 — flechas del plan (toggle)
// ─────────────────────────────────────────
function drawPlanLayer(
  ctx: CanvasRenderingContext2D,
  plan: Position[],
  cellSize: number
): void {
  if (plan.length < 2) return;

  ctx.strokeStyle = BLUEPRINT_COLORS.accentInfo;
  ctx.lineWidth = Math.max(1, cellSize * 0.05);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = 0.75;

  ctx.beginPath();
  for (let i = 0; i < plan.length; i++) {
    const px = MARGIN + (plan[i].x + 0.5) * cellSize;
    const py = MARGIN + (plan[i].y + 0.5) * cellSize;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // Cabeza de flecha en el último punto
  if (plan.length >= 2) {
    const last = plan[plan.length - 1];
    const prev = plan[plan.length - 2];
    const ex = MARGIN + (last.x + 0.5) * cellSize;
    const ey = MARGIN + (last.y + 0.5) * cellSize;
    const sx = MARGIN + (prev.x + 0.5) * cellSize;
    const sy = MARGIN + (prev.y + 0.5) * cellSize;
    const angle = Math.atan2(ey - sy, ex - sx);
    const aw = cellSize * 0.12;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - aw * Math.cos(angle - 0.5), ey - aw * Math.sin(angle - 0.5));
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - aw * Math.cos(angle + 0.5), ey - aw * Math.sin(angle + 0.5));
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';
}

// ─────────────────────────────────────────
// Componente GridCanvas
// ─────────────────────────────────────────
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

    const cellSize = (canvas.width - MARGIN) / gridSize;

    // Capa 0: fondo y cuadrícula
    drawGridLayer(ctx, gridSize, cellSize);

    // Capa 1: celdas
    drawCellsLayer(ctx, grid, gridSize, cellSize);

    // Capa 4: heatmap (antes del overlay de visibilidad para que sea coherente)
    if (showBeliefs) {
      drawBeliefLayer(ctx, gridSize, cellSize, beliefs);
    }

    // Capa 3: overlay de observabilidad
    if (showVisibility) {
      drawVisibilityLayer(ctx, gridSize, cellSize, agentState.pos, DEFAULTS.agentVisionRadius);
    }

    // Capa 5: plan
    if (showPlan) {
      drawPlanLayer(ctx, plan, cellSize);
    }

    // Capa 2: agente (siempre visible, encima de todo overlay)
    drawAgentLayer(ctx, agentState, agentLastDir, cellSize);
  }, [grid, gridSize, agentState, agentLastDir, plan, beliefs, showVisibility, showBeliefs, showPlan]);

  // Referencia siempre actualizada a draw para el ResizeObserver
  const drawRef = useRef(draw);
  useEffect(() => {
    drawRef.current = draw;
  }, [draw]);

  // Configura el ResizeObserver una sola vez para hacer el canvas cuadrado y responsivo
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

  // Redibujar cuando el estado cambia
  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center">
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </div>
  );
}
