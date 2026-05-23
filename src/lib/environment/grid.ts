/* Módulo de cuadrícula: operaciones puras sobre Grid */

import type { Cell, Grid, GridSize, Position } from '@/types/world';

/** Crea una cuadrícula n×n con todas las celdas vacías */
export function createEmpty(size: GridSize): Grid {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, (): Cell => ({ type: 'empty' }))
  );
}

/** Devuelve la celda en (pos.x, pos.y) o undefined si está fuera de límites */
export function getCell(grid: Grid, pos: Position): Cell | undefined {
  return grid[pos.y]?.[pos.x];
}

/** Devuelve una nueva cuadrícula con la celda en pos reemplazada; no muta el original */
export function setCell(grid: Grid, pos: Position, cell: Cell): Grid {
  if (!isInBounds(grid, pos)) return grid;
  const next = grid.map((row) => [...row]);
  next[pos.y][pos.x] = { ...cell };
  return next;
}

/** Verifica que (pos.x, pos.y) esté dentro de los límites */
export function isInBounds(grid: Grid, pos: Position): boolean {
  const rows = grid.length;
  if (rows === 0) return false;
  const cols = grid[0].length;
  return pos.x >= 0 && pos.x < cols && pos.y >= 0 && pos.y < rows;
}

/** Devuelve los vecinos ortogonales (N, S, E, W) que estén dentro de límites */
export function neighbors(grid: Grid, pos: Position): Position[] {
  return [
    { x: pos.x, y: pos.y - 1 }, // N
    { x: pos.x, y: pos.y + 1 }, // S
    { x: pos.x + 1, y: pos.y }, // E
    { x: pos.x - 1, y: pos.y }, // W
  ].filter((p) => isInBounds(grid, p));
}

/** Clon profundo de la cuadrícula */
export function clone(grid: Grid): Grid {
  return grid.map((row) => row.map((cell) => ({ ...cell })));
}

/** Devuelve el tamaño (asume cuadrícula cuadrada) */
export function gridSize(grid: Grid): number {
  return grid.length;
}
