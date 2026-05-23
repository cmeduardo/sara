/* Tipos genéricos para los algoritmos de búsqueda */

import type { Position } from '@/types/world';
import type { KnownCellRecord } from '@/lib/agent/memory';

/** Problema de búsqueda sobre el WorldModel del agente */
export interface SearchProblem {
  start: Position;
  goal: Position;
  /** Mapa de celdas conocidas — las búsquedas operan sobre esto, no sobre el mundo real */
  knownCells: KnownCellRecord;
  /** Creencias probabilísticas: "x,y" → P(danger) — usadas por la heurística de A* */
  beliefs: Record<string, number>;
  gridSize: number;
}

/** Resultado de una búsqueda */
export interface SearchResult {
  /** Secuencia de posiciones desde inicio hasta objetivo (incluye ambos) */
  path: Position[];
  nodesExpanded: number;
  /** Tamaño máximo que alcanzó la frontera durante la búsqueda */
  frontierMax: number;
  timeMs: number;
  /** Costo total acumulado del camino */
  totalCost: number;
  found: boolean;
}
