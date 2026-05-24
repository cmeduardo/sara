/* STRIPS planner — selecciona víctimas como metas y planifica con A* */

import type { Position } from '@/types/world';
import type { KnownCellRecord } from '@/lib/agent/memory';
import { astar } from '@/lib/search/astar';
import { bfs } from '@/lib/search/bfs';

// ── Tipos de acciones STRIPS ──────────────────────────────────────────────────

export type PlanStepKind = 'MOVE' | 'RESCUE';

export interface PlanStep {
  kind: PlanStepKind;
  /** Posición origen — presente en MOVE, omitida en RESCUE */
  from?: Position;
  /** Destino (MOVE) o celda de víctima (RESCUE) */
  to: Position;
}

export type PlanStatus = 'idle' | 'executing' | 'complete' | 'failed';

export interface Plan {
  steps: PlanStep[];
  /** Índice del próximo paso a ejecutar */
  currentIdx: number;
  /** Objetivo actual (posición de la víctima) */
  goalPos: Position | null;
  status: PlanStatus;
  /** Veces que el plan fue invalidado y regenerado en este episodio */
  replansCount: number;
}

export const EMPTY_PLAN: Plan = {
  steps: [],
  currentIdx: 0,
  goalPos: null,
  status: 'idle',
  replansCount: 0,
};

// ── Selección de objetivo ─────────────────────────────────────────────────────

/** Extrae posiciones de víctimas del conjunto de hechos de la KB */
export function knownVictimPositions(kbFacts: string[]): Position[] {
  const victims: Position[] = [];
  for (const fact of kbFacts) {
    const m = fact.match(/^VictimAt\((\d+),(\d+)\)$/);
    if (m) victims.push({ x: parseInt(m[1]!), y: parseInt(m[2]!) });
  }
  return victims;
}

/** Víctima más cercana al agente por distancia Manhattan */
export function selectNearestVictim(
  agentPos: Position,
  kbFacts: string[],
): Position | null {
  const victims = knownVictimPositions(kbFacts);
  if (victims.length === 0) return null;
  return victims.reduce((best, v) => {
    const dBest = Math.abs(best.x - agentPos.x) + Math.abs(best.y - agentPos.y);
    const dV    = Math.abs(v.x  - agentPos.x)   + Math.abs(v.y  - agentPos.y);
    return dV < dBest ? v : best;
  });
}

// ── Construcción del plan ─────────────────────────────────────────────────────

/** Convierte el camino A* en pasos STRIPS: MOVE × (n-1) + RESCUE */
function pathToSteps(path: Position[]): PlanStep[] {
  if (path.length < 2) return [];
  const steps: PlanStep[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    steps.push({ kind: 'MOVE', from: path[i]!, to: path[i + 1]! });
  }
  steps.push({ kind: 'RESCUE', to: path[path.length - 1]! });
  return steps;
}

export interface PlanInput {
  agentPos: Position;
  kbFacts: string[];
  knownCells: KnownCellRecord;
  beliefs: Record<string, number>;
  gridSize: number;
  previousReplans?: number;
  /** Algoritmo de búsqueda a usar. Por defecto A* (informado + consciente de riesgo). */
  algorithm?: 'bfs' | 'astar';
}

/**
 * Genera un plan STRIPS completo.
 * Selecciona la víctima conocida más cercana y construye una secuencia
 * MOVE* · RESCUE usando A* sobre el WorldModel del agente.
 * Devuelve null si no hay víctimas en la KB.
 */
export function buildPlan(input: PlanInput): Plan | null {
  const { agentPos, kbFacts, knownCells, beliefs, gridSize, previousReplans = 0, algorithm = 'astar' } = input;

  const goal = selectNearestVictim(agentPos, kbFacts);
  if (!goal) return null;

  if (goal.x === agentPos.x && goal.y === agentPos.y) {
    return {
      steps: [{ kind: 'RESCUE', to: goal }],
      currentIdx: 0,
      goalPos: goal,
      status: 'executing',
      replansCount: previousReplans,
    };
  }

  const result = algorithm === 'astar'
    ? astar({ start: agentPos, goal, knownCells, beliefs, gridSize })
    : bfs({ start: agentPos, goal, knownCells, beliefs: {}, gridSize });

  if (!result.found || result.path.length < 2) {
    return null;
  }

  return {
    steps: pathToSteps(result.path),
    currentIdx: 0,
    goalPos: goal,
    status: 'executing',
    replansCount: previousReplans,
  };
}

// ── Plan de movimiento genérico (sin acción final) ───────────────────────────

/**
 * Construye un plan de solo MOVE hacia `goal`.
 * Usado para recargar o para moverse a cualquier destino sin efecto final.
 * Devuelve null si no hay camino o si el agente ya está en el destino.
 */
export function buildMovePlan(goal: Position, input: PlanInput): Plan | null {
  const { agentPos, knownCells, beliefs, gridSize, previousReplans = 0, algorithm = 'astar' } = input;
  if (goal.x === agentPos.x && goal.y === agentPos.y) return null;

  const result = algorithm === 'astar'
    ? astar({ start: agentPos, goal, knownCells, beliefs, gridSize })
    : bfs({ start: agentPos, goal, knownCells, beliefs: {}, gridSize });
  if (!result.found || result.path.length < 2) return null;

  const steps: PlanStep[] = [];
  for (let i = 0; i < result.path.length - 1; i++) {
    steps.push({ kind: 'MOVE', from: result.path[i]!, to: result.path[i + 1]! });
  }
  return {
    steps,
    currentIdx: 0,
    goalPos: goal,
    status: 'executing',
    replansCount: previousReplans,
  };
}

// ── Plan de exploración ───────────────────────────────────────────────────────

/**
 * Plan de exploración frontera usando BFS (algoritmo no informado).
 * BFS garantiza el camino con mínimos pasos hacia la celda frontera más cercana.
 * "Frontera" = celdas adyacentes a celdas conocidas que aún no han sido visitadas.
 * A* se usa para rescate (informado + consciente del riesgo); BFS para exploración.
 * Devuelve null si toda la cuadrícula está explorada o no hay frontera alcanzable.
 */
export function buildExplorationPlan(input: PlanInput): Plan | null {
  const { agentPos, knownCells, beliefs, gridSize, previousReplans = 0, algorithm = 'astar' } = input;

  const frontierSet = new Set<string>();

  if (Object.keys(knownCells).length === 0) {
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]] as [number,number][]) {
      const nx = agentPos.x + dx, ny = agentPos.y + dy;
      if (nx >= 0 && ny >= 0 && nx < gridSize && ny < gridSize) {
        frontierSet.add(`${nx},${ny}`);
      }
    }
  } else {
    for (const key of Object.keys(knownCells)) {
      const [x, y] = key.split(',').map(Number) as [number, number];
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]] as [number,number][]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= gridSize || ny >= gridSize) continue;
        const nk = `${nx},${ny}`;
        if (!knownCells[nk]) frontierSet.add(nk);
      }
    }
  }

  if (frontierSet.size === 0) return null;

  const candidates = [...frontierSet]
    .map((k) => {
      const [x, y] = k.split(',').map(Number) as [number, number];
      return { pos: { x, y }, dist: Math.abs(x - agentPos.x) + Math.abs(y - agentPos.y) };
    })
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 10);

  for (const { pos: target } of candidates) {
    const result = algorithm === 'astar'
      ? astar({ start: agentPos, goal: target, knownCells, beliefs, gridSize })
      : bfs({ start: agentPos, goal: target, knownCells, beliefs: {}, gridSize });
    if (result.found && result.path.length >= 2) {
      const steps: PlanStep[] = [];
      for (let i = 0; i < result.path.length - 1; i++) {
        steps.push({ kind: 'MOVE', from: result.path[i]!, to: result.path[i + 1]! });
      }
      return {
        steps,
        currentIdx: 0,
        goalPos: target,
        status: 'executing',
        replansCount: previousReplans,
      };
    }
  }

  return null;
}

/** Extrae las posiciones del camino restante para visualización en canvas (incluye origen) */
export function planRemainingPath(plan: Plan): Position[] {
  const remaining = plan.steps
    .slice(plan.currentIdx)
    .filter((s): s is PlanStep & { kind: 'MOVE' } => s.kind === 'MOVE');
  if (remaining.length === 0) return [];
  const result: Position[] = [];
  if (remaining[0]?.from) result.push(remaining[0].from);
  for (const s of remaining) result.push(s.to);
  return result;
}
