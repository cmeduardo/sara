/* WorldModel del agente: qué ha visto, cuándo, y qué cree sobre lo desconocido */

import type { Cell, Position } from '@/types/world';
import type { PerceivedCell, KnownCell } from '@/types/agent';

/** Mapa de celdas conocidas: clave "x,y" → KnownCell */
export type KnownCellRecord = Record<string, KnownCell>;

/**
 * Actualiza el registro de celdas conocidas con las percepciones del turno actual.
 * Las celdas nuevas se añaden; las ya conocidas actualizan su timestamp.
 * No muta el registro original.
 */
export function updateKnownCells(
  known: KnownCellRecord,
  perceived: PerceivedCell[],
  step: number
): KnownCellRecord {
  const updated = { ...known };
  for (const { pos, cell } of perceived) {
    updated[`${pos.x},${pos.y}`] = { cell: { ...cell }, lastSeenStep: step };
  }
  return updated;
}

/**
 * Devuelve la edad de una celda (pasos desde última observación).
 * Null si la celda nunca fue observada.
 */
export function cellAge(
  known: KnownCellRecord,
  pos: Position,
  currentStep: number
): number | null {
  const entry = known[`${pos.x},${pos.y}`];
  return entry ? currentStep - entry.lastSeenStep : null;
}

/**
 * Devuelve las últimas `limit` celdas conocidas ordenadas de más reciente a más antigua.
 * Útil para mostrar en el panel Cerebro.
 */
export function recentKnownCells(
  known: KnownCellRecord,
  currentStep: number,
  limit = 30
): Array<{ pos: Position; cell: Cell; age: number }> {
  return Object.entries(known)
    .map(([key, { cell, lastSeenStep }]) => {
      const [xs, ys] = key.split(',');
      return {
        pos: { x: parseInt(xs ?? '0', 10), y: parseInt(ys ?? '0', 10) },
        cell,
        age: currentStep - lastSeenStep,
      };
    })
    .sort((a, b) => a.age - b.age)
    .slice(0, limit);
}

/**
 * Devuelve estadísticas de memoria: cuántas celdas de cada tipo se conocen.
 */
export function memorySummary(known: KnownCellRecord): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const { cell } of Object.values(known)) {
    counts[cell.type] = (counts[cell.type] ?? 0) + 1;
  }
  return counts;
}
