/* Función de utilidad — evalúa y ordena las acciones disponibles del agente */

import type { Position } from '@/types/world';
import type { KnownCellRecord } from '@/lib/agent/memory';
import type { ActionEvaluation } from '@/types/agent';
import { knownVictimPositions } from '@/lib/planning/strips';
import { DEFAULTS } from '@/config/defaults';

export type { ActionEvaluation };

const AVG_DANGER_DAMAGE = 12.5;

function manhattan(a: Position, b: Position): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/** Estima el costo esperado de peligro a lo largo del camino Manhattan en L */
function dangerAlongLPath(
  from: Position,
  to: Position,
  beliefs: Record<string, number>,
): number {
  let risk = 0;
  const dx = from.x <= to.x ? 1 : -1;
  for (let x = from.x; x !== to.x; x += dx) {
    risk += (beliefs[`${x},${from.y}`] ?? 0) * AVG_DANGER_DAMAGE;
  }
  const dy = from.y <= to.y ? 1 : -1;
  for (let y = from.y; y !== to.y; y += dy) {
    risk += (beliefs[`${to.x},${y}`] ?? 0) * AVG_DANGER_DAMAGE;
  }
  return risk;
}

/**
 * Urgencia de recarga: cúbica para que sea poco relevante a energía alta
 * y domine claramente por debajo del 25%.
 *
 *   urgency(1.0) = 0.0   → estación irrelevante a energía llena
 *   urgency(0.5) = 0.125 → algo de interés
 *   urgency(0.25)= 0.42  → prioridad alta
 *   urgency(0.15)= 0.61  → urgencia crítica
 */
function energyUrgency(energy: number, maxEnergy: number): number {
  const ratio = Math.max(0, energy / maxEnergy);
  return (1 - ratio) ** 3;
}

/** Valor de explorar: decrece a medida que el mapa se conoce más */
function explorationBaseReward(knownCells: KnownCellRecord, gridSize: number): number {
  const total = gridSize * gridSize;
  const known = Object.keys(knownCells).length;
  const unexploredFraction = Math.max(0, 1 - known / total);
  return DEFAULTS.rewardWeights.explore * unexploredFraction * 20;
}

/**
 * Evalúa todas las acciones disponibles para el agente y las devuelve
 * ordenadas por utilidad descendente.
 */
export function evaluateActions(input: {
  agentPos: Position;
  agentEnergy: number;
  kbFacts: string[];
  knownCells: KnownCellRecord;
  beliefs: Record<string, number>;
  gridSize: number;
}): ActionEvaluation[] {
  const { agentPos, agentEnergy, kbFacts, knownCells, beliefs, gridSize } = input;
  const maxEnergy = DEFAULTS.initialEnergy;
  const results: ActionEvaluation[] = [];

  // ── Acción RESCUE ─────────────────────────────────────────────────────────
  for (const victim of knownVictimPositions(kbFacts)) {
    const dist = manhattan(agentPos, victim);
    const travelCost = dist * DEFAULTS.moveCost;
    const dangerCost = dangerAlongLPath(agentPos, victim, beliefs);
    const baseReward = DEFAULTS.rewardWeights.victim;
    results.push({
      type: 'rescue',
      goal: victim,
      utility: baseReward - travelCost - dangerCost,
      breakdown: { baseReward, travelCost, dangerCost },
    });
  }

  // ── Acción EXPLORE ────────────────────────────────────────────────────────
  let nearestFrontier: Position | null = null;
  let nearestFrontierDist = Infinity;
  for (const key of Object.keys(knownCells)) {
    const [x, y] = key.split(',').map(Number) as [number, number];
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]] as [number,number][]) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < gridSize && ny < gridSize && !knownCells[`${nx},${ny}`]) {
        const d = manhattan(agentPos, { x: nx, y: ny });
        if (d < nearestFrontierDist) {
          nearestFrontierDist = d;
          nearestFrontier = { x: nx, y: ny };
        }
      }
    }
  }
  if (nearestFrontier) {
    const travelCost = nearestFrontierDist * DEFAULTS.moveCost;
    const dangerCost = dangerAlongLPath(agentPos, nearestFrontier, beliefs);
    const baseReward = explorationBaseReward(knownCells, gridSize);
    results.push({
      type: 'explore',
      goal: nearestFrontier,
      utility: baseReward - travelCost - dangerCost,
      breakdown: { baseReward, travelCost, dangerCost },
    });
  }

  // ── Acción RECHARGE ───────────────────────────────────────────────────────
  for (const [key, known] of Object.entries(knownCells)) {
    if (known.cell.type !== 'station') continue;
    const [x, y] = key.split(',').map(Number) as [number, number];
    const stationPos: Position = { x, y };
    const dist = manhattan(agentPos, stationPos);
    const ratio = Math.max(0, agentEnergy / maxEnergy);

    // No ofrecer recarga si ya está en la estación con energía ≥ 90% — no hay beneficio
    if (dist === 0 && ratio >= 0.9) break;

    const travelCost = dist * DEFAULTS.moveCost;
    const dangerCost = dangerAlongLPath(agentPos, stationPos, beliefs);
    const urgency = energyUrgency(agentEnergy, maxEnergy);
    // Escalar recompensa por deficiencia de energía: irrelevante a energía llena
    const deficiency = 1 - ratio;
    const baseReward = DEFAULTS.rewardWeights.rechargeLow * (deficiency + urgency * 10) * 2;
    results.push({
      type: 'recharge',
      goal: stationPos,
      utility: baseReward - travelCost - dangerCost,
      breakdown: { baseReward, travelCost, dangerCost },
    });
    break; // solo una estación
  }

  return results.sort((a, b) => b.utility - a.utility);
}
