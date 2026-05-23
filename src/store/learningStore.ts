/* Store de aprendizaje — persiste entre episodios, no se limpia con Reiniciar */

import { create } from 'zustand';
import type { QTable, QState, QAction } from '@/lib/learning/qlearning';
import { updateQ } from '@/lib/learning/qlearning';
import { DEFAULTS } from '@/config/defaults';

export interface EpisodeRecord {
  episode: number;
  rescued: number;
  steps: number;
  survived: boolean;
}

interface LearningStore {
  qTable: QTable;
  epsilon: number;
  alpha: number;
  episode: number;
  lastState: QState | null;
  lastAction: QAction | null;
  lastKnownCount: number;
  lastRescued: number;
  lastSteps: number;
  episodeHistory: EpisodeRecord[];

  setLastTransition: (
    state: QState,
    action: QAction,
    knownCount: number,
    rescued: number,
    steps: number,
  ) => void;
  updateQStep: (reward: number, nextState: QState) => void;
  nextEpisode: (rescued: number, steps: number, survived: boolean) => void;
  resetLearning: () => void;

  isRunningTurbo: boolean;
  turboProgress: { current: number; total: number } | null;
  setTurboState: (running: boolean, progress?: { current: number; total: number } | null) => void;
  applyTurboResults: (results: Array<{ rescued: number; steps: number; survived: boolean }>, finalQTable: QTable, finalEpsilon: number, finalAlpha: number) => void;
}

const INIT_EPSILON = DEFAULTS.qLearning.epsilon;
const INIT_ALPHA   = DEFAULTS.qLearning.alpha;

const BASE_STATE = {
  qTable: {} as QTable,
  epsilon: INIT_EPSILON,
  alpha:   INIT_ALPHA,
  episode: 0,
  lastState:      null as QState | null,
  lastAction:     null as QAction | null,
  lastKnownCount: 0,
  lastRescued:    0,
  lastSteps:      0,
  episodeHistory: [] as EpisodeRecord[],
};

/** Crea una instancia independiente del store de aprendizaje */
export function createLearningStore() {
  return create<LearningStore>((set, get) => ({
    ...BASE_STATE,

    setLastTransition: (state, action, knownCount, rescued, steps) =>
      set({ lastState: state, lastAction: action, lastKnownCount: knownCount, lastRescued: rescued, lastSteps: steps }),

    updateQStep: (reward, nextState) => {
      const { qTable, lastState, lastAction, alpha } = get();
      if (!lastState || !lastAction) return;
      set({ qTable: updateQ(qTable, lastState, lastAction, reward, nextState, alpha, DEFAULTS.qLearning.gamma) });
    },

    nextEpisode: (rescued, steps, survived) =>
      set((s) => ({
        epsilon: Math.max(s.epsilon * DEFAULTS.qLearning.epsilonDecay, DEFAULTS.qLearning.minEpsilon),
        alpha:   Math.max(s.alpha   * DEFAULTS.qLearning.alphaDecay,   DEFAULTS.qLearning.minAlpha),
        episode: s.episode + 1,
        lastState: null, lastAction: null,
        episodeHistory: [
          ...s.episodeHistory,
          { episode: s.episode + 1, rescued, steps, survived },
        ].slice(-20),
      })),

    resetLearning: () =>
      set({
        ...BASE_STATE,
        isRunningTurbo: false,
        turboProgress: null,
      }),

    isRunningTurbo: false,
    turboProgress: null,

    setTurboState: (running, progress = null) =>
      set({ isRunningTurbo: running, turboProgress: running ? progress : null }),

    applyTurboResults: (results, finalQTable, finalEpsilon, finalAlpha) =>
      set((s) => {
        let ep = s.episode;
        const newRecords: EpisodeRecord[] = results.map((r) => ({
          episode: ++ep,
          rescued: r.rescued,
          steps:   r.steps,
          survived: r.survived,
        }));
        return {
          qTable:   finalQTable,
          epsilon:  finalEpsilon,
          alpha:    finalAlpha,
          episode:  ep,
          lastState: null, lastAction: null,
          episodeHistory: [...s.episodeHistory, ...newRecords].slice(-200),
          isRunningTurbo: false,
          turboProgress: null,
        };
      }),
  }));
}

/** Instancia principal (agente A*) */
export const useLearningStore = createLearningStore();
