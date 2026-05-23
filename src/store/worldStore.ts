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
  // Peligro dentro del radio de visión del agente (r=3 desde (1,1) → cubre hasta x/y=4)
  grid = setCell(grid, { x: 3, y: 3 }, { type: 'danger', dangerProb: 0.3, dangerDamage: 8 });

  // Estación de recarga
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

const _hardcoded = buildHardcodedGrid();

export const useWorldStore = create<WorldStore>((set) => ({
  grid: _hardcoded,
  initialGrid: _hardcoded,
  gridSize: 12,
  agentState: initialAgentState,
  agentLastDir: 'N',
  agentStart: initialAgentState.pos,
  plan: [],

  setGrid: (grid) => set({ grid }),
  loadGrid: (grid, size, agentStart) =>
    set({
      grid,
      initialGrid: grid,
      gridSize: size,
      agentState: { ...initialAgentState, pos: agentStart },
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
      grid: _hardcoded,
      initialGrid: _hardcoded,
      gridSize: 12,
      agentState: initialAgentState,
      agentLastDir: 'N',
      agentStart: initialAgentState.pos,
      plan: [],
    }),
}));
