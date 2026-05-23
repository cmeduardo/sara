/* Q-Learning: tabla Q, extracción de estado, actualización y selección de acción */

import type { KnownCellRecord } from '@/lib/agent/memory';
import type { ActionEvaluation } from '@/types/agent';
import { DEFAULTS } from '@/config/defaults';

export type QAction = 'rescue' | 'explore' | 'recharge';
export type QState  = string; // "hasVictim_energyBucket_exploredBucket"
export type QTable  = Record<string, Record<QAction, number>>;

const Q_ACTIONS: QAction[] = ['rescue', 'explore', 'recharge'];

/** Peso de Q-values sobre la utilidad calculada en selección de acción */
const Q_WEIGHT = 0.5;

function energyBucket(energy: number): 0 | 1 | 2 {
  const ratio = energy / DEFAULTS.initialEnergy;
  if (ratio < 0.3) return 0;
  if (ratio < 0.7) return 1;
  return 2;
}

function explorationBucket(knownCells: KnownCellRecord, gridSize: number): 0 | 1 | 2 {
  const ratio = Object.keys(knownCells).length / (gridSize * gridSize);
  if (ratio < 0.33) return 0;
  if (ratio < 0.66) return 1;
  return 2;
}

/** Extrae el estado Q discretizado: 18 estados posibles (2 × 3 × 3) */
export function extractState(input: {
  kbFacts: string[];
  energy: number;
  knownCells: KnownCellRecord;
  gridSize: number;
}): QState {
  const hasVictim = input.kbFacts.some((f) => f.startsWith('VictimAt(')) ? 1 : 0;
  const e = energyBucket(input.energy);
  const x = explorationBucket(input.knownCells, input.gridSize);
  return `${hasVictim}_${e}_${x}`;
}

/** Devuelve los Q-values para un estado (0 si el estado no existe aún) */
export function getQValues(table: QTable, state: QState): Record<QAction, number> {
  return table[state] ?? { rescue: 0, explore: 0, recharge: 0 };
}

/** Actualiza Q(s,a) con la ecuación de Bellman y devuelve tabla nueva (inmutable) */
export function updateQ(
  table: QTable,
  state: QState,
  action: QAction,
  reward: number,
  nextState: QState,
  alpha: number,
  gamma: number,
): QTable {
  const current = getQValues(table, state);
  const next    = getQValues(table, nextState);
  const maxNext = Math.max(...Q_ACTIONS.map((a) => next[a]));
  const updated = current[action] + alpha * (reward + gamma * maxNext - current[action]);
  return { ...table, [state]: { ...current, [action]: updated } };
}

/**
 * Selecciona la acción óptima usando ε-greedy sobre score combinado:
 *   score(a) = utility(a) + Q_WEIGHT × Q(s, a)
 * Con probabilidad ε elige una acción aleatoria de las disponibles.
 */
export function selectAction(
  table: QTable,
  state: QState,
  evals: ActionEvaluation[],
  epsilon: number,
): ActionEvaluation | null {
  if (evals.length === 0) return null;
  const qVals = getQValues(table, state);

  if (Math.random() < epsilon) {
    return evals[Math.floor(Math.random() * evals.length)]!;
  }

  return evals.reduce((best, ev) => {
    const scoreEv   = ev.utility   + Q_WEIGHT * (qVals[ev.type]   ?? 0);
    const scoreBest = best.utility + Q_WEIGHT * (qVals[best.type] ?? 0);
    return scoreEv > scoreBest ? ev : best;
  });
}
