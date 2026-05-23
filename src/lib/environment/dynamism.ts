/* Dinamismo del entorno: cada N pasos el mundo puede cambiar */

import type { Grid, Position } from '@/types/world';
import { getCell, setCell, neighbors, clone } from './grid';

export interface DynamismConfig {
  newDangerProb: number;       // P(aparecer nuevo peligro)
  changeDangerProbProb: number;// P(modificar dangerProb de peligro existente)
  moveVictimProb: number;      // P(mover víctima a celda adyacente)
}

function collectByType(grid: Grid, type: string): Position[] {
  const result: Position[] = [];
  for (let y = 0; y < grid.length; y++) {
    const row = grid[y];
    if (!row) continue;
    for (let x = 0; x < row.length; x++) {
      if (row[x]?.type === type) result.push({ x, y });
    }
  }
  return result;
}

function pickRandom<T>(arr: T[]): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Aplica un tick de dinamismo al entorno.
 * Retorna una nueva cuadrícula (no muta la original).
 */
export function tickDynamism(grid: Grid, config: DynamismConfig): Grid {
  let next = clone(grid);

  // Posible aparición de nuevo peligro en celda vacía
  if (Math.random() < config.newDangerProb) {
    const emptyCells = collectByType(next, 'empty');
    const target = pickRandom(emptyCells);
    if (target) {
      next = setCell(next, target, {
        type: 'danger',
        dangerProb: 0.2 + Math.random() * 0.6,
        dangerDamage: 5 + Math.floor(Math.random() * 20),
      });
    }
  }

  // Posible cambio de intensidad de un peligro existente
  if (Math.random() < config.changeDangerProbProb) {
    const dangers = collectByType(next, 'danger');
    const target = pickRandom(dangers);
    if (target) {
      const cell = getCell(next, target);
      if (cell) {
        const current = cell.dangerProb ?? 0.5;
        const delta = (Math.random() - 0.5) * 0.2;
        next = setCell(next, target, {
          ...cell,
          dangerProb: Math.max(0.1, Math.min(0.9, current + delta)),
        });
      }
    }
  }

  // Posible movimiento de una víctima a celda vacía adyacente
  if (Math.random() < config.moveVictimProb) {
    const victims = collectByType(next, 'victim');
    const victim = pickRandom(victims);
    if (victim) {
      const emptyNeighbors = neighbors(next, victim).filter(
        (p) => getCell(next, p)?.type === 'empty'
      );
      const dest = pickRandom(emptyNeighbors);
      if (dest) {
        next = setCell(next, dest, { type: 'victim' });
        next = setCell(next, victim, { type: 'empty' });
      }
    }
  }

  return next;
}
