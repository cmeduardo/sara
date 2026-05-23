/* Store de estado del mundo — cuadrícula, agente, creencias, plan */

import { create } from 'zustand';
import type { Grid, AgentState, GridSize, Position, Direction } from '@/types/world';
import { createEmpty, setCell } from '@/lib/environment/grid';
import { DEFAULTS } from '@/config/defaults';

/** Creencias del agente: clave "x,y" → P(danger) estimada para esa celda */
type BeliefRecord = Record<string, number>;

interface WorldStore {
  grid: Grid;
  gridSize: GridSize;
  agentState: AgentState;
  agentLastDir: Direction;
  /** Secuencia de posiciones que componen el plan actual */
  plan: Position[];
  beliefs: BeliefRecord;

  setGrid: (grid: Grid) => void;
  setGridSize: (size: GridSize) => void;
  updateAgentState: (partial: Partial<AgentState>) => void;
  setAgentLastDir: (dir: Direction) => void;
  setPlan: (plan: Position[]) => void;
  setBelief: (pos: Position, dangerProb: number) => void;
  resetBeliefs: () => void;
  initHardcoded: () => void;
}

function buildHardcodedGrid(): Grid {
  let grid = createEmpty(12 as GridSize);

  // Obstáculos distribuidos para no bloquear el mapa
  const obstacles: [number, number][] = [
    [3, 0], [7, 1], [4, 2],
    [0, 3], [10, 3],
    [2, 5],
    [6, 7],
    [2, 9],
    [10, 10],
  ];
  for (const [x, y] of obstacles) {
    grid = setCell(grid, { x, y }, { type: 'obstacle' });
  }

  // Tres víctimas distribuidas por el mapa
  grid = setCell(grid, { x: 9, y: 2 }, { type: 'victim' });
  grid = setCell(grid, { x: 4, y: 6 }, { type: 'victim' });
  grid = setCell(grid, { x: 5, y: 10 }, { type: 'victim' });

  // Zonas de peligro con distintas probabilidades de daño
  grid = setCell(grid, { x: 6, y: 3 }, { type: 'danger', dangerProb: 0.7, dangerDamage: 20 });
  grid = setCell(grid, { x: 9, y: 5 }, { type: 'danger', dangerProb: 0.4, dangerDamage: 10 });
  grid = setCell(grid, { x: 8, y: 8 }, { type: 'danger', dangerProb: 0.6, dangerDamage: 15 });
  // Peligro dentro del radio de visión del agente (r=3 desde (1,1) cubre hasta (4,4))
  grid = setCell(grid, { x: 3, y: 3 }, { type: 'danger', dangerProb: 0.3, dangerDamage: 8 });

  // Estación de recarga en esquina inferior
  grid = setCell(grid, { x: 9, y: 11 }, { type: 'station' });

  return grid;
}

const initialAgentState: AgentState = {
  pos: { x: 1, y: 1 },
  energy: DEFAULTS.initialEnergy,
  hp: DEFAULTS.initialHP,
  rescued: 0,
  steps: 0,
  alive: true,
};

export const useWorldStore = create<WorldStore>((set) => ({
  grid: buildHardcodedGrid(),
  gridSize: 12,
  agentState: initialAgentState,
  agentLastDir: 'N',
  plan: [],
  beliefs: {},

  setGrid: (grid) => set({ grid }),
  setGridSize: (size) => set({ gridSize: size }),
  updateAgentState: (partial) =>
    set((state) => ({ agentState: { ...state.agentState, ...partial } })),
  setAgentLastDir: (dir) => set({ agentLastDir: dir }),
  setPlan: (plan) => set({ plan }),
  setBelief: (pos, dangerProb) =>
    set((state) => ({
      beliefs: { ...state.beliefs, [`${pos.x},${pos.y}`]: dangerProb },
    })),
  resetBeliefs: () => set({ beliefs: {} }),
  initHardcoded: () =>
    set({
      grid: buildHardcodedGrid(),
      gridSize: 12,
      agentState: initialAgentState,
      agentLastDir: 'N',
      plan: [],
      beliefs: {},
    }),
}));
