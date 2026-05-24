/* Store del editor de mapas — separado del worldStore de simulación */

import { create } from 'zustand';
import type { Grid, GridSize, Position, Cell } from '@/types/world';
import type { SavedMap } from '@/types/persistence';
import { createEmpty, setCell, isInBounds } from '@/lib/environment/grid';
import { getMaps } from '@/lib/persistence/maps';
import { DEFAULTS } from '@/config/defaults';

export type EditorTool =
  | 'empty'
  | 'obstacle'
  | 'victim'
  | 'danger'
  | 'station'
  | 'agent_start';

interface EditorStore {
  tool: EditorTool;
  dangerProb: number;      // prob configurada para la herramienta de peligro
  dangerDamage: number;    // daño configurado para la herramienta de peligro
  grid: Grid;
  gridSize: GridSize;
  agentStart: Position;
  savedMaps: SavedMap[];
  currentMapId: string | null; // id del mapa cargado actualmente (si existe)

  setTool: (tool: EditorTool) => void;
  setDangerProb: (prob: number) => void;
  setDangerDamage: (damage: number) => void;
  setGridSize: (size: GridSize) => void;

  /** Aplica la herramienta activa en `pos`; si erase=true coloca celda vacía */
  applyTool: (pos: Position, erase: boolean) => void;

  /** Reemplaza la cuadrícula completa */
  setGrid: (grid: Grid) => void;

  /** Inicializa una cuadrícula vacía del tamaño indicado */
  newEmpty: (size: GridSize) => void;

  /** Carga un SavedMap en el editor */
  loadSavedMap: (map: SavedMap) => void;

  /** Refresca la lista de mapas desde localStorage */
  refreshSavedMaps: () => void;
}

const DEFAULT_SIZE: GridSize = DEFAULTS.gridSize;

export const useEditorStore = create<EditorStore>((set) => ({
  tool: 'obstacle',
  dangerProb: 0.5,
  dangerDamage: 10,
  grid: createEmpty(DEFAULT_SIZE),
  gridSize: DEFAULT_SIZE,
  agentStart: { x: 1, y: 1 },
  savedMaps: [],
  currentMapId: null,

  setTool: (tool) => set({ tool }),
  setDangerProb: (dangerProb) => set({ dangerProb }),
  setDangerDamage: (dangerDamage) => set({ dangerDamage }),
  setGridSize: (size) => set((state) => {
    // Resize grid: copy cells that fit in the new size, fill rest with empty
    const newGrid = createEmpty(size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const cell = state.grid[y]?.[x];
        if (cell) (newGrid[y] as typeof newGrid[number])[x] = cell;
      }
    }
    const agentStart = {
      x: Math.min(state.agentStart.x, size - 1),
      y: Math.min(state.agentStart.y, size - 1),
    };
    return { gridSize: size, grid: newGrid, agentStart };
  }),

  applyTool: (pos, erase) =>
    set((state) => {
      if (!isInBounds(state.grid, pos)) return {};

      if (state.tool === 'agent_start' && !erase) {
        return { agentStart: pos };
      }

      let cell: Cell;
      if (erase || state.tool === 'empty') {
        cell = { type: 'empty' };
      } else {
        switch (state.tool) {
          case 'obstacle': cell = { type: 'obstacle' }; break;
          case 'victim':   cell = { type: 'victim' }; break;
          case 'station':  cell = { type: 'station' }; break;
          case 'danger':
            cell = {
              type: 'danger',
              dangerProb: state.dangerProb,
              dangerDamage: state.dangerDamage,
            };
            break;
          default: return {};
        }
      }

      return { grid: setCell(state.grid, pos, cell) };
    }),

  setGrid: (grid) => set({ grid }),

  newEmpty: (size) =>
    set({
      grid: createEmpty(size),
      gridSize: size,
      agentStart: { x: 1, y: 1 },
      currentMapId: null,
    }),

  loadSavedMap: (map) =>
    set({
      grid: map.cells as Grid,
      gridSize: map.size,
      agentStart: map.agentStart,
      currentMapId: map.id,
    }),

  refreshSavedMaps: () => set({ savedMaps: getMaps() }),
}));
