/* Store cognitivo del agente — memoria, creencias, lecturas de sensores, plan */

import { create } from 'zustand';
import type { PerceivedCell, KnownCell, SensorReading, LoopPhase } from '@/types/agent';
import type { Position } from '@/types/world';
import type { Plan } from '@/lib/planning/strips';
import { EMPTY_PLAN } from '@/lib/planning/strips';

export type KnownCellRecord = Record<string, KnownCell>;
type BeliefRecord = Record<string, number>;

/** Máximo de lecturas de sensor guardadas en historial */
const MAX_SENSOR_HISTORY = 30;

interface AgentStore {
  /** Celdas que el agente ha observado directamente */
  knownCells: KnownCellRecord;
  /** Creencias probabilísticas sobre celdas no observadas: "x,y" → P(danger) */
  beliefs: BeliefRecord;
  /** Celdas percibidas en el turno actual */
  lastPerceived: PerceivedCell[];
  /** Historial de lecturas de sensores (más reciente primero) */
  sensorReadings: SensorReading[];
  /** Fase actual del ciclo cognitivo */
  loopPhase: LoopPhase;
  /** Hechos actuales de la KB (claves serializadas, ej. "Safe(3,4)") */
  kbFacts: string[];
  /** Hechos nuevos del último turno — para resaltado en UI */
  kbNewFacts: string[];
  /** Plan STRIPS activo (Fase 6) */
  plan: Plan;

  /** Actualiza la memoria con las percepciones del turno */
  updateMemory: (perceived: PerceivedCell[], step: number) => void;
  /** Agrega una lectura de sensor al historial */
  addSensorReading: (reading: SensorReading) => void;
  /** Actualiza la creencia de una celda */
  setBelief: (pos: Position, dangerProb: number) => void;
  /** Reemplaza el mapa de creencias completo */
  setBeliefs: (beliefs: BeliefRecord) => void;
  setLoopPhase: (phase: LoopPhase) => void;
  /** Reemplaza la KB con los hechos nuevos del turno */
  setKB: (facts: string[], newFacts: string[]) => void;
  setPlan: (plan: Plan) => void;
  reset: () => void;
}

export const useAgentStore = create<AgentStore>((set) => ({
  knownCells: {},
  beliefs: {},
  lastPerceived: [],
  sensorReadings: [],
  loopPhase: 'idle',
  kbFacts: [],
  kbNewFacts: [],
  plan: EMPTY_PLAN,

  updateMemory: (perceived, step) =>
    set((state) => {
      const updated = { ...state.knownCells };
      for (const { pos, cell } of perceived) {
        updated[`${pos.x},${pos.y}`] = { cell: { ...cell }, lastSeenStep: step };
      }
      return { knownCells: updated, lastPerceived: perceived };
    }),

  addSensorReading: (reading) =>
    set((state) => ({
      sensorReadings: [reading, ...state.sensorReadings].slice(0, MAX_SENSOR_HISTORY),
    })),

  setBelief: (pos, dangerProb) =>
    set((state) => ({
      beliefs: { ...state.beliefs, [`${pos.x},${pos.y}`]: dangerProb },
    })),

  setBeliefs: (beliefs) => set({ beliefs }),

  setLoopPhase: (loopPhase) => set({ loopPhase }),

  setKB: (kbFacts, kbNewFacts) => set({ kbFacts, kbNewFacts }),

  setPlan: (plan) => set({ plan }),

  reset: () =>
    set({
      knownCells: {},
      beliefs: {},
      lastPerceived: [],
      sensorReadings: [],
      loopPhase: 'idle',
      kbFacts: [],
      kbNewFacts: [],
      plan: EMPTY_PLAN,
    }),
}));
