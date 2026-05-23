/* Tipos del sistema cognitivo del agente */

import type { Cell, Position } from '@/types/world';

/** Una celda observada directamente por el agente en el turno actual */
export interface PerceivedCell {
  pos: Position;
  cell: Cell;
}

/** Celda que el agente recuerda haber visto, con su timestamp */
export interface KnownCell {
  cell: Cell;
  /** Paso de simulación en que se observó por última vez */
  lastSeenStep: number;
}

/** Lectura de los sensores ruidosos en un turno dado */
export interface SensorReading {
  step: number;
  /** Sensor de víctimas: salida con ruido */
  victimDetected: boolean;
  victimEstimatedDistance: number | null;
  /** Brisa estilo Wumpus: salida con ruido */
  breezeDetected: boolean;
  /** Valor real (para debug — el agente no lo conoce directamente) */
  actualVictimNearby: boolean;
  actualBreezeNearby: boolean;
}

/** Resultado de evaluar una acción con la función de utilidad (Fase 8) */
export interface ActionEvaluation {
  type: 'rescue' | 'explore' | 'recharge';
  goal: Position;
  utility: number;
  breakdown: { baseReward: number; travelCost: number; dangerCost: number };
}

/** Fase actual del ciclo cognitivo del agente */
export type LoopPhase =
  | 'idle'
  | 'perceiving'
  | 'updating_beliefs'
  | 'reasoning'
  | 'planning'
  | 'deciding'
  | 'acting';
