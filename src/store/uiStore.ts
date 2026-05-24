/* Store de estado de la UI — toggles de capas, velocidad, modo paso a paso */

import { create } from 'zustand';

interface UIStore {
  showVisibility: boolean;
  showBeliefs: boolean;
  showPlan: boolean;
  /** true = intervalo de auto-ejecución pausado; los agentes esperan el trigger manual */
  stepMode: boolean;
  /** Incrementar para disparar un único tick en ambos PlanController */
  stepRequest: number;

  toggleVisibility: () => void;
  toggleBeliefs: () => void;
  togglePlan: () => void;
  setStepMode: (v: boolean) => void;
  incrementStep: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  showVisibility: true,
  showBeliefs: false,
  showPlan: false,
  stepMode: false,
  stepRequest: 0,

  toggleVisibility: () => set((s) => ({ showVisibility: !s.showVisibility })),
  toggleBeliefs: () => set((s) => ({ showBeliefs: !s.showBeliefs })),
  togglePlan: () => set((s) => ({ showPlan: !s.showPlan })),
  setStepMode: (v) => set({ stepMode: v }),
  incrementStep: () => set((s) => ({ stepRequest: s.stepRequest + 1 })),
}));
