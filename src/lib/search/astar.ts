/* A* con heurística Manhattan + penalización de riesgo esperado */

import type { Position } from '@/types/world';
import type { KnownCellRecord } from '@/lib/agent/memory';
import type { SearchProblem, SearchResult } from './types';

/** Penalización de energía por entrar en celda desconocida */
const UNKNOWN_PENALTY = 2;
/** Peso del riesgo en la heurística — la hace inadmisible pero consciente del peligro */
const RISK_LAMBDA = 0.5;
/** Daño esperado promedio (punto medio del rango 5-25 de DEFAULTS) */
const AVG_DANGER_DAMAGE = 12.5;

function posKey(p: Position): string {
  return `${p.x},${p.y}`;
}

function manhattan(a: Position, b: Position): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/**
 * Suma el riesgo esperado a lo largo de un camino Manhattan en L desde pos hasta goal.
 * Segmento horizontal primero (pos.y fijo), luego vertical (goal.x fijo).
 * Aproxima "celdas cerca del path" descrito en el prompt.
 */
function riskAlongLPath(
  pos: Position,
  goal: Position,
  beliefs: Record<string, number>,
): number {
  let risk = 0;
  const dx = pos.x <= goal.x ? 1 : -1;
  for (let x = pos.x; x !== goal.x; x += dx) {
    risk += (beliefs[`${x},${pos.y}`] ?? 0) * AVG_DANGER_DAMAGE;
  }
  const dy = pos.y <= goal.y ? 1 : -1;
  for (let y = pos.y; y !== goal.y; y += dy) {
    risk += (beliefs[`${goal.x},${y}`] ?? 0) * AVG_DANGER_DAMAGE;
  }
  return risk;
}

/** h(n) = Manhattan + λ * riesgo_esperado_en_L_path(n, goal) */
function heuristic(pos: Position, goal: Position, beliefs: Record<string, number>): number {
  return manhattan(pos, goal) + RISK_LAMBDA * riskAlongLPath(pos, goal, beliefs);
}

/** Costo de moverse a la celda `next` según el WorldModel del agente */
function stepCost(next: Position, knownCells: KnownCellRecord): number {
  const known = knownCells[posKey(next)];
  if (!known) return 1 + UNKNOWN_PENALTY;
  if (known.cell.type === 'danger') {
    const prob = known.cell.dangerProb ?? 0.5;
    const damage = known.cell.dangerDamage ?? AVG_DANGER_DAMAGE;
    return 1 + prob * damage;
  }
  return 1;
}

// ── Min-heap de nodos A* ──────────────────────────────────────────────────────

interface AStarNode {
  pos: Position;
  g: number;
  f: number;
  parent: AStarNode | null;
}

class MinHeap {
  private data: AStarNode[] = [];

  push(node: AStarNode): void {
    this.data.push(node);
    this.bubbleUp(this.data.length - 1);
  }

  pop(): AStarNode | undefined {
    if (this.data.length === 0) return undefined;
    const top = this.data[0]!;
    const last = this.data.pop()!;
    if (this.data.length > 0) {
      this.data[0] = last;
      this.siftDown(0);
    }
    return top;
  }

  get size(): number {
    return this.data.length;
  }

  private bubbleUp(i: number): void {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.data[i]!.f < this.data[p]!.f) {
        [this.data[i], this.data[p]] = [this.data[p]!, this.data[i]!];
        i = p;
      } else break;
    }
  }

  private siftDown(i: number): void {
    const n = this.data.length;
    while (true) {
      let min = i;
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      if (l < n && this.data[l]!.f < this.data[min]!.f) min = l;
      if (r < n && this.data[r]!.f < this.data[min]!.f) min = r;
      if (min === i) break;
      [this.data[i], this.data[min]] = [this.data[min]!, this.data[i]!];
      i = min;
    }
  }
}

// ── A* ────────────────────────────────────────────────────────────────────────

const DIRS: Position[] = [
  { x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 },
];

export function astar(problem: SearchProblem): SearchResult {
  const t0 = performance.now();
  const { start, goal, knownCells, beliefs, gridSize } = problem;

  const open = new MinHeap();
  open.push({ pos: start, g: 0, f: heuristic(start, goal, beliefs), parent: null });

  const gScore: Record<string, number> = { [posKey(start)]: 0 };
  const closed = new Set<string>();
  let nodesExpanded = 0;
  let frontierMax = 1;

  while (open.size > 0) {
    const node = open.pop()!;
    const key = posKey(node.pos);

    if (closed.has(key)) continue;
    closed.add(key);
    nodesExpanded++;
    if (open.size > frontierMax) frontierMax = open.size;

    if (key === posKey(goal)) {
      return {
        path: reconstructPath(node),
        nodesExpanded,
        frontierMax,
        timeMs: performance.now() - t0,
        totalCost: node.g,
        found: true,
      };
    }

    for (const d of DIRS) {
      const next: Position = { x: node.pos.x + d.x, y: node.pos.y + d.y };
      if (next.x < 0 || next.y < 0 || next.x >= gridSize || next.y >= gridSize) continue;
      const knownNext = knownCells[posKey(next)];
      if (knownNext?.cell.type === 'obstacle') continue;

      const nextKey = posKey(next);
      if (closed.has(nextKey)) continue;

      const tentativeG = node.g + stepCost(next, knownCells);
      if (tentativeG >= (gScore[nextKey] ?? Infinity)) continue;

      gScore[nextKey] = tentativeG;
      open.push({
        pos: next,
        g: tentativeG,
        f: tentativeG + heuristic(next, goal, beliefs),
        parent: node,
      });
    }
  }

  return {
    path: [],
    nodesExpanded,
    frontierMax,
    timeMs: performance.now() - t0,
    totalCost: 0,
    found: false,
  };
}

function reconstructPath(node: AStarNode): Position[] {
  const path: Position[] = [];
  let cur: AStarNode | null = node;
  while (cur !== null) {
    path.unshift(cur.pos);
    cur = cur.parent;
  }
  return path;
}
