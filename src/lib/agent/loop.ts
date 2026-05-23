/* Ciclo cognitivo del agente: perceive → updateBeliefs → reason → plan → decide → act */

import type { Grid, AgentState, Action, Direction } from '@/types/world';
import type { PerceivedCell, SensorReading, LoopPhase } from '@/types/agent';
import type { KnownCellRecord } from '@/lib/agent/memory';
import { DEFAULTS } from '@/config/defaults';
import { perceive, victimSensor, dangerBreezeSensor } from './perception';
import { updateKnownCells } from './memory';
import { updateKBFromPerception } from '@/lib/knowledge/inference';
import { getCell, isInBounds } from '@/lib/environment/grid';

export interface LoopResult {
  phase: LoopPhase;
  perceived: PerceivedCell[];
  updatedKnownCells: KnownCellRecord;
  sensorReading: SensorReading;
  /** KB actualizada con hechos del turno */
  kbFacts: string[];
  /** Hechos nuevos del turno (percepción + inferidos) para resaltado en UI */
  kbNewFacts: string[];
  /** Acción decidida. Null hasta Fase 8 (utilidad) / Fase 9 (Q-learning). */
  decidedAction: Action | null;
}

/**
 * Ejecuta un ciclo completo del agente sobre el estado actual del mundo.
 * Fases implementadas: percepción (3), memoria (3), KB + inferencia (4).
 * Fases 5-9 se implementarán en sus respectivas fases.
 */
export function runAgentCycle(
  grid: Grid,
  agentState: AgentState,
  knownCells: KnownCellRecord,
  kbFacts: string[],
  config: typeof DEFAULTS
): LoopResult {
  // ── 1. Percibir ─────────────────────────────────────────────────────────────
  const perceived = perceive(grid, agentState.pos, config.agentVisionRadius);

  // ── 2. Leer sensores ruidosos ────────────────────────────────────────────────
  const victimReading = victimSensor(
    grid,
    agentState.pos,
    config.agentVisionRadius + 2,
    config.sensorNoise,
    agentState.steps
  );
  const breezeReading = dangerBreezeSensor(grid, agentState.pos, config.sensorNoise);

  const sensorReading: SensorReading = {
    step: agentState.steps,
    ...victimReading,
    ...breezeReading,
  };

  // ── 3. Actualizar memoria ────────────────────────────────────────────────────
  const updatedKnownCells = updateKnownCells(knownCells, perceived, agentState.steps);

  // ── 4. Actualizar KB + encadenamiento hacia adelante ─────────────────────────
  const { facts: updatedKBFacts, newFacts: kbNewFacts } = updateKBFromPerception(
    kbFacts,
    perceived,
    agentState.pos,
    sensorReading.breezeDetected,
    grid.length,
  );

  // ── 5. Planificar (STRIPS) — Fase 6 ─────────────────────────────────────────
  // ── 6. Decidir (utilidad / Q-learning) — Fases 8-9 ──────────────────────────
  // ── 7. Actuar — el llamador aplica la acción al mundo ───────────────────────

  return {
    phase: 'perceiving',
    perceived,
    updatedKnownCells,
    sensorReading,
    kbFacts: updatedKBFacts,
    kbNewFacts,
    decidedAction: null,
  };
}

// ─── Vectores de dirección ────────────────────────────────────────────────────

const DIR_VECTORS: Record<Direction, { x: number; y: number }> = {
  N: { x: 0, y: -1 },
  S: { x: 0, y: 1 },
  E: { x: 1, y: 0 },
  W: { x: -1, y: 0 },
};

/**
 * Calcula el nuevo estado del agente tras ejecutar un movimiento.
 * Devuelve null si el movimiento es inválido (obstáculo, fuera de límites, sin energía).
 * Los peligros aplican daño probabilístico.
 */
export function applyMoveAction(
  grid: Grid,
  agentState: AgentState,
  dir: Direction
): Partial<AgentState> | null {
  const delta = DIR_VECTORS[dir];
  const newPos = { x: agentState.pos.x + delta.x, y: agentState.pos.y + delta.y };

  if (!isInBounds(grid, newPos)) return null;

  const targetCell = getCell(grid, newPos);
  if (targetCell?.type === 'obstacle') return null;

  const newEnergy = agentState.energy - DEFAULTS.moveCost;
  if (newEnergy < 0) return null;

  // Posible daño al pisar celda de peligro
  let hpLoss = 0;
  if (targetCell?.type === 'danger') {
    const prob = targetCell.dangerProb ?? 0.5;
    if (Math.random() < prob) {
      hpLoss = targetCell.dangerDamage ?? DEFAULTS.dangerDamageRange.min;
    }
  }

  const newHp = Math.max(0, agentState.hp - hpLoss);
  const alive = newHp > 0 && newEnergy > 0;

  return {
    pos: newPos,
    energy: newEnergy,
    hp: newHp,
    steps: agentState.steps + 1,
    alive,
  };
}
