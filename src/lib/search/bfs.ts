/* Búsqueda en anchura (BFS) — no informada, minimiza pasos */

import type { Position } from '@/types/world';
import type { KnownCellRecord } from '@/lib/agent/memory';
import type { SearchProblem, SearchResult } from './types';

function posKey(p: Position): string {
  return `${p.x},${p.y}`;
}

/**
 * Devuelve los vecinos ortogonales transitables según el WorldModel del agente.
 * Las celdas no observadas se asumen transitables (con penalización en A*).
 * Los obstáculos conocidos son la única excepción absoluta.
 */
function traversableNeighbors(
  pos: Position,
  knownCells: KnownCellRecord,
  gridSize: number,
): Position[] {
  return (
    [
      { x: pos.x, y: pos.y - 1 },
      { x: pos.x, y: pos.y + 1 },
      { x: pos.x - 1, y: pos.y },
      { x: pos.x + 1, y: pos.y },
    ] as Position[]
  ).filter((n) => {
    if (n.x < 0 || n.y < 0 || n.x >= gridSize || n.y >= gridSize) return false;
    const known = knownCells[posKey(n)];
    return known?.cell.type !== 'obstacle';
  });
}

interface BFSNode {
  pos: Position;
  parent: BFSNode | null;
  steps: number;
}

/** BFS estándar. Costo = número de pasos (uniforme). */
export function bfs(problem: SearchProblem): SearchResult {
  const t0 = performance.now();
  const { start, goal, knownCells, gridSize } = problem;

  const goalKey = posKey(goal);
  const queue: BFSNode[] = [{ pos: start, parent: null, steps: 0 }];
  const visited = new Set<string>([posKey(start)]);
  let nodesExpanded = 0;
  let frontierMax = 1;

  while (queue.length > 0) {
    const node = queue.shift()!;
    nodesExpanded++;

    if (posKey(node.pos) === goalKey) {
      return {
        path: reconstructPath(node),
        nodesExpanded,
        frontierMax,
        timeMs: performance.now() - t0,
        totalCost: node.steps,
        found: true,
      };
    }

    for (const next of traversableNeighbors(node.pos, knownCells, gridSize)) {
      const key = posKey(next);
      if (visited.has(key)) continue;
      visited.add(key);
      queue.push({ pos: next, parent: node, steps: node.steps + 1 });
      if (queue.length > frontierMax) frontierMax = queue.length;
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

function reconstructPath(node: BFSNode): Position[] {
  const path: Position[] = [];
  let cur: BFSNode | null = node;
  while (cur !== null) {
    path.unshift(cur.pos);
    cur = cur.parent;
  }
  return path;
}
