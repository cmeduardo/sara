/* Store de estado de la UI — toggles de capas, velocidad, etc. */

import { create } from 'zustand';

interface UIStore {
  showVisibility: boolean;
  showBeliefs: boolean;
  showPlan: boolean;

  toggleVisibility: () => void;
  toggleBeliefs: () => void;
  togglePlan: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  showVisibility: true,
  showBeliefs: false,
  showPlan: false,

  toggleVisibility: () => set((s) => ({ showVisibility: !s.showVisibility })),
  toggleBeliefs: () => set((s) => ({ showBeliefs: !s.showBeliefs })),
  togglePlan: () => set((s) => ({ showPlan: !s.showPlan })),
}));
