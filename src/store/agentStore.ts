/* Store cognitivo del agente — memoria, creencias, lecturas de sensores, plan */

import { create } from 'zustand';
import type { PerceivedCell, KnownCell, SensorReading, LoopPhase, ActionEvaluation } from '@/types/agent';
import type { Position } from '@/types/world';
import type { Plan } from '@/lib/planning/strips';
import { EMPTY_PLAN } from '@/lib/planning/strips';

export type KnownCellRecord = Record<string, KnownCell>;
type BeliefRecord = Record<string, number>;

const MAX_SENSOR_HISTORY = 30;

interface AgentStore {
  knownCells: KnownCellRecord;
  beliefs: BeliefRecord;
  lastPerceived: PerceivedCell[];
  sensorReadings: SensorReading[];
  loopPhase: LoopPhase;
  kbFacts: string[];
  kbNewFacts: string[];
  plan: Plan;
  actionUtilities: ActionEvaluation[];

  updateMemory: (perceived: PerceivedCell[], step: number) => void;
  addSensorReading: (reading: SensorReading) => void;
  setBelief: (pos: Position, dangerProb: number) => void;
  setBeliefs: (beliefs: BeliefRecord) => void;
  setLoopPhase: (phase: LoopPhase) => void;
  setKB: (facts: string[], newFacts: string[]) => void;
  setPlan: (plan: Plan) => void;
  setActionUtilities: (evals: ActionEvaluation[]) => void;
  reset: () => void;
}

const INITIAL_STATE = {
  knownCells: {} as KnownCellRecord,
  beliefs: {} as BeliefRecord,
  lastPerceived: [] as PerceivedCell[],
  sensorReadings: [] as SensorReading[],
  loopPhase: 'idle' as LoopPhase,
  kbFacts: [] as string[],
  kbNewFacts: [] as string[],
  plan: EMPTY_PLAN,
  actionUtilities: [] as ActionEvaluation[],
};

/** Crea una instancia independiente del store cognitivo */
export function createAgentStore() {
  return create<AgentStore>((set) => ({
    ...INITIAL_STATE,

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

    setActionUtilities: (actionUtilities) => set({ actionUtilities }),

    reset: () => set(INITIAL_STATE),
  }));
}

/** Instancia principal (agente A*) */
export const useAgentStore = createAgentStore();
