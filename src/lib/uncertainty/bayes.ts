/* Actualización bayesiana de creencias sobre peligro en celdas no observadas */

import type { Position } from '@/types/world';
import type { KnownCellRecord } from '@/lib/agent/memory';

interface SensorNoise {
  breezeFalsePositive: number;
  breezeFalseNegative: number;
}

/** Probabilidad a priori de peligro para celdas no observadas */
export const DANGER_PRIOR = 0.15;

// ── Actualización Bayesiana (una sola observación) ────────────────────────────

/**
 * Aplica la regla de Bayes para el sensor de brisa.
 *
 * Si breezeDetected = true:
 *   P(D|B) = P(B|D)·P(D) / [P(B|D)·P(D) + P(B|¬D)·P(¬D)]
 *
 * Si breezeDetected = false:
 *   P(D|¬B) = P(¬B|D)·P(D) / [P(¬B|D)·P(D) + P(¬B|¬D)·P(¬D)]
 */
export function bayesUpdate(
  prior: number,
  breezeDetected: boolean,
  noise: SensorNoise,
): number {
  const { breezeFalsePositive: FP, breezeFalseNegative: FN } = noise;

  if (breezeDetected) {
    const pBGivenD  = 1 - FN;  // P(brisa | peligro)
    const pBGivenND = FP;       // P(brisa | sin peligro)
    const pB = pBGivenD * prior + pBGivenND * (1 - prior);
    return pB === 0 ? prior : (pBGivenD * prior) / pB;
  } else {
    const pNBGivenD  = FN;      // P(sin brisa | peligro)
    const pNBGivenND = 1 - FP;  // P(sin brisa | sin peligro)
    const pNB = pNBGivenD * prior + pNBGivenND * (1 - prior);
    return pNB === 0 ? prior : (pNBGivenD * prior) / pNB;
  }
}

// ── Actualización completa del mapa de creencias ─────────────────────────────

/**
 * Actualiza el mapa de creencias P(danger) a partir de la lectura del sensor
 * de brisa en la posición actual del agente.
 *
 * Reglas:
 * 1. Vecinos ortogonales no observados → actualización bayesiana por la brisa.
 * 2. Vecinos ya observados directamente → creencia exacta según lo percibido.
 * 3. Hechos KB Safe → 0, ConfirmedDanger → 1 (overrides globales).
 */
export function updateBeliefs(
  currentBeliefs: Record<string, number>,
  agentPos: Position,
  breezeDetected: boolean,
  knownCells: KnownCellRecord,
  kbFacts: string[],
  gridSize: number,
  noise: SensorNoise,
): Record<string, number> {
  const updated = { ...currentBeliefs };

  // Vecinos ortogonales (distancia Manhattan = 1)
  const ortho: Position[] = [
    { x: agentPos.x + 1, y: agentPos.y },
    { x: agentPos.x - 1, y: agentPos.y },
    { x: agentPos.x,     y: agentPos.y + 1 },
    { x: agentPos.x,     y: agentPos.y - 1 },
  ].filter(({ x, y }) => x >= 0 && y >= 0 && x < gridSize && y < gridSize);

  for (const pos of ortho) {
    const key = `${pos.x},${pos.y}`;
    const known = knownCells[key];

    if (known) {
      // Observado directamente — creencia exacta
      updated[key] = known.cell.type === 'danger'
        ? (known.cell.dangerProb ?? 0.5)
        : 0;
    } else {
      // No observado — actualización bayesiana
      const prior = updated[key] ?? DANGER_PRIOR;
      updated[key] = bayesUpdate(prior, breezeDetected, noise);
    }
  }

  // Overrides del KB (más fuertes que la percepción local)
  for (const fact of kbFacts) {
    const mSafe = fact.match(/^Safe\((\d+),(\d+)\)$/);
    if (mSafe) {
      updated[`${mSafe[1]},${mSafe[2]}`] = 0;
      continue;
    }
    const mConf = fact.match(/^ConfirmedDanger\((\d+),(\d+)\)$/);
    if (mConf) {
      updated[`${mConf[1]},${mConf[2]}`] = 1;
    }
  }

  return updated;
}
