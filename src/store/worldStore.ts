/* Store de estado del mundo — cuadrícula, agente y plan */

import { create } from 'zustand';
import type { Grid, AgentState, GridSize, Position, Direction } from '@/types/world';
import { createEmpty, setCell } from '@/lib/environment/grid';
import { DEFAULTS } from '@/config/defaults';

interface WorldStore {
  grid: Grid;
  /** Copia inmutable del grid al inicio del episodio — usada por Reiniciar */
  initialGrid: Grid;
  gridSize: GridSize;
  agentState: AgentState;
  agentLastDir: Direction;
  /** Posición inicial del agente en el episodio actual */
  agentStart: Position;
  /** Secuencia de posiciones del plan actual (poblada en Fase 6) */
  plan: Position[];

  setGrid: (grid: Grid) => void;
  /** Carga un grid nuevo y lo registra como estado inicial del episodio */
  loadGrid: (grid: Grid, size: GridSize, agentStart: Position) => void;
  setGridSize: (size: GridSize) => void;
  updateAgentState: (partial: Partial<AgentState>) => void;
  setAgentLastDir: (dir: Direction) => void;
  setAgentStart: (pos: Position) => void;
  setPlan: (plan: Position[]) => void;
  initHardcoded: () => void;
}

function buildHardcodedGrid(): Grid {
  let grid = createEmpty(12 as GridSize);

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

  grid = setCell(grid, { x: 9, y: 2 }, { type: 'victim' });
  grid = setCell(grid, { x: 4, y: 6 }, { type: 'victim' });
  grid = setCell(grid, { x: 5, y: 10 }, { type: 'victim' });

  grid = setCell(grid, { x: 6, y: 3 }, { type: 'danger', dangerProb: 0.7, dangerDamage: 20 });
  grid = setCell(grid, { x: 9, y: 5 }, { type: 'danger', dangerProb: 0.4, dangerDamage: 10 });
  grid = setCell(grid, { x: 8, y: 8 }, { type: 'danger', dangerProb: 0.6, dangerDamage: 15 });
  grid = setCell(grid, { x: 3, y: 3 }, { type: 'danger', dangerProb: 0.3, dangerDamage: 8 });

  grid = setCell(grid, { x: 9, y: 11 }, { type: 'station' });

  return grid;
}

const BASE_AGENT_STATE: AgentState = {
  pos: { x: 1, y: 1 },
  energy: DEFAULTS.initialEnergy,
  hp: DEFAULTS.initialHP,
  rescued: 0,
  steps: 0,
  alive: true,
};

/** Crea una instancia independiente del store del mundo */
export function createWorldStore() {
  const hardcoded = buildHardcodedGrid();
  return create<WorldStore>((set) => ({
    grid: hardcoded,
    initialGrid: hardcoded,
    gridSize: 12,
    agentState: BASE_AGENT_STATE,
    agentLastDir: 'N',
    agentStart: BASE_AGENT_STATE.pos,
    plan: [],

    setGrid: (grid) => set({ grid }),
    loadGrid: (grid, _size, agentStart) =>
      set({
        grid,
        initialGrid: grid,
        gridSize: grid.length as GridSize,
        agentState: { ...BASE_AGENT_STATE, pos: agentStart },
        agentLastDir: 'N',
        agentStart,
        plan: [],
      }),
    setGridSize: (size) => set({ gridSize: size }),
    updateAgentState: (partial) =>
      set((state) => ({ agentState: { ...state.agentState, ...partial } })),
    setAgentLastDir: (dir) => set({ agentLastDir: dir }),
    setAgentStart: (pos) => set({ agentStart: pos }),
    setPlan: (plan) => set({ plan }),
    initHardcoded: () =>
      set({
        grid: hardcoded,
        initialGrid: hardcoded,
        gridSize: 12,
        agentState: BASE_AGENT_STATE,
        agentLastDir: 'N',
        agentStart: BASE_AGENT_STATE.pos,
        plan: [],
      }),
  }));
}

/** Instancia principal (agente A*) */
export const useWorldStore = createWorldStore();
