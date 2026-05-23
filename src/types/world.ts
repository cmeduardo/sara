/* Tipos canónicos del dominio SARA */

export type CellType =
  | 'empty'
  | 'obstacle'
  | 'victim'
  | 'danger'
  | 'station';

export interface Cell {
  type: CellType;
  /** Probabilidad de que la celda cause daño al entrar (0..1). Solo relevante si type === 'danger'. */
  dangerProb?: number;
  /** Daño máximo esperado al pisar la celda (0..100 HP). */
  dangerDamage?: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface AgentState {
  pos: Position;
  /** Energía actual del agente. Rango: 0..100. Al llegar a 0, muere. */
  energy: number;
  /** Puntos de vida del agente. Rango: 0..100. Al llegar a 0, muere. */
  hp: number;
  /** Cantidad de víctimas rescatadas en esta corrida. */
  rescued: number;
  /** Número de pasos ejecutados desde el inicio. */
  steps: number;
  /** Indica si el agente sigue activo. */
  alive: boolean;
}

export type Direction = 'N' | 'S' | 'E' | 'W';

export type Action =
  | { kind: 'move'; dir: Direction }
  | { kind: 'rescue' }
  | { kind: 'recharge' }
  | { kind: 'wait' };

/** Tamaños de cuadrícula soportados */
export type GridSize = 9 | 12 | 15 | 18 | 20;

/** Representación completa de la cuadrícula */
export type Grid = Cell[][];

/** Configuración de densidad para el generador procedural */
export interface MapDensityConfig {
  obstacleRatio: number;   // fracción de celdas con obstáculo
  dangerRatio: number;     // fracción de celdas con peligro
  victimCount: number;     // cantidad fija de víctimas
  stationCount: number;    // cantidad fija de estaciones
}
