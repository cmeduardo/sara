/* Funciones de dibujo Canvas 2D compartidas entre GridCanvas y EditorCanvas */

import { BLUEPRINT_COLORS } from '@/config/colors';
import { getCell } from '@/lib/environment/grid';
import type { Grid, AgentState, Position, Direction } from '@/types/world';

/** Margen en píxeles para las etiquetas de coordenadas */
export const CANVAS_MARGIN = 24;

/** Convierte coordenadas de mouse (cliente) a posición de celda en la cuadrícula */
export function pixelToCell(
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement,
  cellSize: number
): Position | null {
  const rect = canvas.getBoundingClientRect();
  // Factor de escala: el canvas puede estar escalado por CSS
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const cx = (clientX - rect.left) * scaleX;
  const cy = (clientY - rect.top) * scaleY;
  const gx = Math.floor((cx - CANVAS_MARGIN) / cellSize);
  const gy = Math.floor((cy - CANVAS_MARGIN) / cellSize);
  if (gx < 0 || gy < 0) return null;
  return { x: gx, y: gy };
}

/** Calcula el tamaño de celda en función del ancho del canvas */
export function calcCellSize(canvasWidth: number, gridSize: number): number {
  return (canvasWidth - CANVAS_MARGIN) / gridSize;
}

// ─── Capa 0: fondo y cuadrícula ─────────────────────────────────────────────

export function drawGridLayer(
  ctx: CanvasRenderingContext2D,
  gridSize: number,
  cellSize: number
): void {
  ctx.fillStyle = BLUEPRINT_COLORS.bg;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const labelPx = Math.max(8, Math.floor(cellSize * 0.28));
  ctx.fillStyle = BLUEPRINT_COLORS.textDim;
  ctx.font = `${labelPx}px "JetBrains Mono", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < gridSize; i++) {
    ctx.fillText(String(i), CANVAS_MARGIN + (i + 0.5) * cellSize, CANVAS_MARGIN / 2);
    ctx.fillText(String(i), CANVAS_MARGIN / 2, CANVAS_MARGIN + (i + 0.5) * cellSize);
  }

  ctx.strokeStyle = BLUEPRINT_COLORS.gridLine;
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= gridSize; i++) {
    const off = CANVAS_MARGIN + i * cellSize;
    ctx.beginPath();
    ctx.moveTo(off, CANVAS_MARGIN);
    ctx.lineTo(off, CANVAS_MARGIN + gridSize * cellSize);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(CANVAS_MARGIN, off);
    ctx.lineTo(CANVAS_MARGIN + gridSize * cellSize, off);
    ctx.stroke();
  }
}

// ─── Capa 1: celdas ──────────────────────────────────────────────────────────

export function drawCellsLayer(
  ctx: CanvasRenderingContext2D,
  grid: Grid,
  gridSize: number,
  cellSize: number
): void {
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const cell = getCell(grid, { x, y });
      if (!cell) continue;
      const px = CANVAS_MARGIN + x * cellSize;
      const py = CANVAS_MARGIN + y * cellSize;
      switch (cell.type) {
        case 'obstacle': drawObstacle(ctx, px, py, cellSize); break;
        case 'danger':   drawDanger(ctx, px, py, cellSize, cell.dangerProb ?? 0.5); break;
        case 'victim':   drawVictim(ctx, px, py, cellSize); break;
        case 'station':  drawStation(ctx, px, py, cellSize); break;
      }
    }
  }
}

export function drawObstacle(
  ctx: CanvasRenderingContext2D, px: number, py: number, cellSize: number
): void {
  ctx.fillStyle = BLUEPRINT_COLORS.obstacle;
  ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
}

export function drawDanger(
  ctx: CanvasRenderingContext2D, px: number, py: number, cellSize: number, prob: number
): void {
  ctx.fillStyle = BLUEPRINT_COLORS.dangerZone;
  ctx.fillRect(px, py, cellSize, cellSize);

  ctx.save();
  ctx.beginPath();
  ctx.rect(px + 0.5, py + 0.5, cellSize - 1, cellSize - 1);
  ctx.clip();
  ctx.strokeStyle = BLUEPRINT_COLORS.accentDanger;
  ctx.lineWidth = 0.5;
  ctx.globalAlpha = 0.4;
  const sp = Math.max(4, cellSize / 5);
  for (let off = -cellSize; off < cellSize * 2; off += sp) {
    ctx.beginPath();
    ctx.moveTo(px + off, py);
    ctx.lineTo(px + off + cellSize, py + cellSize);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  if (cellSize >= 18) {
    ctx.fillStyle = BLUEPRINT_COLORS.accentDanger;
    ctx.font = `${Math.max(7, Math.floor(cellSize * 0.22))}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${Math.round(prob * 100)}%`, px + cellSize / 2, py + cellSize - 1);
  }
}

export function drawVictim(
  ctx: CanvasRenderingContext2D, px: number, py: number, cellSize: number
): void {
  const cx = px + cellSize / 2;
  const cy = py + cellSize / 2;
  const s = cellSize / 32;

  ctx.strokeStyle = BLUEPRINT_COLORS.victim;
  ctx.lineWidth = Math.max(1, 1.5 * s);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.arc(cx, cy - 7 * s, 3.5 * s, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx, cy - 3.5 * s);
  ctx.lineTo(cx, cy + 4 * s);
  ctx.moveTo(cx - 4 * s, cy);
  ctx.lineTo(cx + 4 * s, cy);
  ctx.moveTo(cx, cy + 4 * s);
  ctx.lineTo(cx - 3 * s, cy + 10 * s);
  ctx.moveTo(cx, cy + 4 * s);
  ctx.lineTo(cx + 3 * s, cy + 10 * s);
  ctx.stroke();

  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';
}

export function drawStation(
  ctx: CanvasRenderingContext2D, px: number, py: number, cellSize: number
): void {
  const cx = px + cellSize / 2;
  const cy = py + cellSize / 2;
  const s = cellSize / 32;

  ctx.fillStyle = BLUEPRINT_COLORS.station;
  ctx.beginPath();
  ctx.moveTo(cx + 1.5 * s, cy - 9 * s);
  ctx.lineTo(cx - 5 * s, cy + 0.5 * s);
  ctx.lineTo(cx + 0.5 * s, cy + 0.5 * s);
  ctx.lineTo(cx - 1.5 * s, cy + 9 * s);
  ctx.lineTo(cx + 5 * s, cy - 0.5 * s);
  ctx.lineTo(cx - 0.5 * s, cy - 0.5 * s);
  ctx.closePath();
  ctx.fill();
}

// ─── Capa 2: agente ───────────────────────────────────────────────────────────

export function drawAgentLayer(
  ctx: CanvasRenderingContext2D,
  agentState: AgentState,
  lastDir: Direction,
  cellSize: number
): void {
  const { x, y } = agentState.pos;
  const cx = CANVAS_MARGIN + (x + 0.5) * cellSize;
  const cy = CANVAS_MARGIN + (y + 0.5) * cellSize;
  const hs = cellSize * 0.38;

  ctx.fillStyle = BLUEPRINT_COLORS.agent;
  ctx.beginPath();
  ctx.moveTo(cx, cy - hs);
  ctx.lineTo(cx + hs, cy);
  ctx.lineTo(cx, cy + hs);
  ctx.lineTo(cx - hs, cy);
  ctx.closePath();
  ctx.fill();

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

/** Dibuja el marcador de inicio del agente (para el editor — distinto del agente en vivo) */
export function drawAgentStart(
  ctx: CanvasRenderingContext2D,
  pos: Position,
  cellSize: number
): void {
  const cx = CANVAS_MARGIN + (pos.x + 0.5) * cellSize;
  const cy = CANVAS_MARGIN + (pos.y + 0.5) * cellSize;
  const r = cellSize * 0.3;

  // Círculo exterior
  ctx.strokeStyle = BLUEPRINT_COLORS.accentData;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  // Cruz interior
  const arm = r * 0.5;
  ctx.beginPath();
  ctx.moveTo(cx - arm, cy); ctx.lineTo(cx + arm, cy);
  ctx.moveTo(cx, cy - arm); ctx.lineTo(cx, cy + arm);
  ctx.stroke();
}

// ─── Capa 3: overlay de visibilidad ─────────────────────────────────────────

export function drawVisibilityLayer(
  ctx: CanvasRenderingContext2D,
  gridSize: number,
  cellSize: number,
  agentPos: Position,
  visionRadius: number
): void {
  const dotStep = Math.max(3, Math.floor(cellSize / 6));
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      if (Math.max(Math.abs(x - agentPos.x), Math.abs(y - agentPos.y)) <= visionRadius) continue;
      const px = CANVAS_MARGIN + x * cellSize;
      const py = CANVAS_MARGIN + y * cellSize;
      ctx.fillStyle = 'rgba(14, 26, 38, 0.65)';
      ctx.fillRect(px, py, cellSize, cellSize);
      ctx.fillStyle = 'rgba(42, 58, 74, 0.85)';
      for (let dy = dotStep; dy < cellSize; dy += dotStep) {
        for (let dx = dotStep; dx < cellSize; dx += dotStep) {
          ctx.fillRect(px + dx, py + dy, 1, 1);
        }
      }
    }
  }
}

// ─── Capa 4: heatmap de creencias ────────────────────────────────────────────

export function drawBeliefLayer(
  ctx: CanvasRenderingContext2D,
  gridSize: number,
  cellSize: number,
  beliefs: Record<string, number>
): void {
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const prob = beliefs[`${x},${y}`] ?? 0;
      if (prob < 0.02) continue;
      const px = CANVAS_MARGIN + x * cellSize;
      const py = CANVAS_MARGIN + y * cellSize;
      ctx.fillStyle = `rgba(80, 40, 40, ${prob * 0.6})`;
      ctx.fillRect(px, py, cellSize, cellSize);
    }
  }
}

// ─── Capa 5: flechas de plan ─────────────────────────────────────────────────

export function drawPlanLayer(
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
    const px = CANVAS_MARGIN + (plan[i].x + 0.5) * cellSize;
    const py = CANVAS_MARGIN + (plan[i].y + 0.5) * cellSize;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  if (plan.length >= 2) {
    const last = plan[plan.length - 1];
    const prev = plan[plan.length - 2];
    const ex = CANVAS_MARGIN + (last.x + 0.5) * cellSize;
    const ey = CANVAS_MARGIN + (last.y + 0.5) * cellSize;
    const angle = Math.atan2(ey - (CANVAS_MARGIN + (prev.y + 0.5) * cellSize),
                             ex - (CANVAS_MARGIN + (prev.x + 0.5) * cellSize));
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

// ─── Capas de búsqueda (comparativa) ─────────────────────────────────────────

/** Dibuja un camino de búsqueda con el color hex especificado */
export function drawSearchPathLayer(
  ctx: CanvasRenderingContext2D,
  path: Position[],
  cellSize: number,
  color: string,
): void {
  if (path.length < 2) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.5, cellSize * 0.07);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = 0.82;
  ctx.beginPath();
  for (let i = 0; i < path.length; i++) {
    const px = CANVAS_MARGIN + (path[i]!.x + 0.5) * cellSize;
    const py = CANVAS_MARGIN + (path[i]!.y + 0.5) * cellSize;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';
}

/** Dibuja el marcador de objetivo — círculo con X */
export function drawGoalMarker(
  ctx: CanvasRenderingContext2D,
  pos: Position,
  cellSize: number,
): void {
  const cx = CANVAS_MARGIN + (pos.x + 0.5) * cellSize;
  const cy = CANVAS_MARGIN + (pos.y + 0.5) * cellSize;
  const r = cellSize * 0.32;
  const arm = r * 0.55;
  ctx.strokeStyle = BLUEPRINT_COLORS.accentData;
  ctx.lineWidth = Math.max(1.5, cellSize * 0.06);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - arm, cy - arm); ctx.lineTo(cx + arm, cy + arm);
  ctx.moveTo(cx + arm, cy - arm); ctx.lineTo(cx - arm, cy + arm);
  ctx.stroke();
  ctx.lineCap = 'butt';
}

/**
 * Oscurece con patrón de puntos las celdas que el agente no ha observado.
 * knownCells solo se usa para comprobar si la clave "x,y" existe.
 */
export function drawFogLayer(
  ctx: CanvasRenderingContext2D,
  knownCells: Record<string, unknown>,
  gridSize: number,
  cellSize: number,
): void {
  const dotStep = Math.max(3, Math.floor(cellSize / 6));
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      if (`${x},${y}` in knownCells) continue;
      const px = CANVAS_MARGIN + x * cellSize;
      const py = CANVAS_MARGIN + y * cellSize;
      ctx.fillStyle = 'rgba(14, 26, 38, 0.72)';
      ctx.fillRect(px, py, cellSize, cellSize);
      ctx.fillStyle = 'rgba(42, 58, 74, 0.9)';
      for (let dy = dotStep; dy < cellSize; dy += dotStep) {
        for (let dx = dotStep; dx < cellSize; dx += dotStep) {
          ctx.fillRect(px + dx, py + dy, 1, 1);
        }
      }
    }
  }
}

// ─── Hover highlight (solo en editor) ────────────────────────────────────────

export function drawHoverHighlight(
  ctx: CanvasRenderingContext2D,
  pos: Position,
  cellSize: number
): void {
  const px = CANVAS_MARGIN + pos.x * cellSize;
  const py = CANVAS_MARGIN + pos.y * cellSize;
  ctx.strokeStyle = BLUEPRINT_COLORS.accentData;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.6;
  ctx.strokeRect(px + 0.5, py + 0.5, cellSize - 1, cellSize - 1);
  ctx.globalAlpha = 1;
}
