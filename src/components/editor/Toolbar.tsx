'use client';

import { useEditorStore, type EditorTool } from '@/store/editorStore';
import { generateMap } from '@/lib/procedural/generator';
import { DEFAULTS } from '@/config/defaults';
import type { GridSize } from '@/types/world';

const GRID_SIZES: GridSize[] = [9, 12, 15, 18, 20];

const TOOLS: { id: EditorTool; label: string; color: string }[] = [
  { id: 'empty',       label: 'Vacío',     color: 'border-blueprint-grid-line' },
  { id: 'obstacle',    label: 'Obstáculo', color: 'bg-blueprint-text-muted' },
  { id: 'victim',      label: 'Víctima',   color: 'bg-blueprint-victim' },
  { id: 'danger',      label: 'Peligro',   color: 'bg-blueprint-accent-danger' },
  { id: 'station',     label: 'Estación',  color: 'bg-blueprint-station' },
  { id: 'agent_start', label: 'Inicio',    color: 'bg-blueprint-accent-data' },
];

export function Toolbar() {
  const {
    tool, setTool,
    dangerProb, setDangerProb,
    dangerDamage, setDangerDamage,
    gridSize, setGridSize,
    newEmpty, setGrid, refreshSavedMaps,
  } = useEditorStore();

  function handleNewEmpty() {
    newEmpty(gridSize);
  }

  function handleGenerate() {
    const result = generateMap({
      size: gridSize,
      seed: Date.now(),
      obstacleRatio: DEFAULTS.mapDensity.obstacleRatio,
      dangerRatio: DEFAULTS.mapDensity.dangerRatio,
      victimCount: DEFAULTS.mapDensity.victimCount,
      stationCount: DEFAULTS.mapDensity.stationCount,
    });
    if (result) {
      setGrid(result.grid);
      useEditorStore.setState({
        agentStart: result.agentStart,
        gridSize: gridSize,
        currentMapId: null,
      });
    } else {
      alert('No se pudo generar un mapa conectado. Intentá de nuevo.');
    }
    refreshSavedMaps();
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Selector de tamaño */}
      <div className="border border-blueprint-border bg-blueprint-bg-elevated p-3 rounded-sm">
        <p className="text-blueprint-text-dim text-xs font-mono uppercase tracking-widest mb-2">
          Tamaño
        </p>
        <div className="flex flex-wrap gap-1">
          {GRID_SIZES.map((s) => (
            <button
              key={s}
              onClick={() => setGridSize(s)}
              className={`px-2 py-0.5 text-xs font-mono rounded-sm border transition-colors ${
                gridSize === s
                  ? 'border-blueprint-accent-data text-blueprint-accent-data bg-transparent'
                  : 'border-blueprint-border text-blueprint-text-dim hover:border-blueprint-text-dim'
              }`}
            >
              {s}×{s}
            </button>
          ))}
        </div>
      </div>

      {/* Paleta de herramientas */}
      <div className="border border-blueprint-border bg-blueprint-bg-elevated p-3 rounded-sm">
        <p className="text-blueprint-text-dim text-xs font-mono uppercase tracking-widest mb-2">
          Herramienta
        </p>
        <div className="flex flex-col gap-1">
          {TOOLS.map(({ id, label, color }) => (
            <button
              key={id}
              onClick={() => setTool(id)}
              className={`flex items-center gap-2 text-xs font-mono px-2 py-1 rounded-sm border transition-colors ${
                tool === id
                  ? 'border-blueprint-accent-data text-blueprint-text'
                  : 'border-transparent text-blueprint-text-dim hover:text-blueprint-text'
              }`}
            >
              <span className={`w-3 h-3 rounded-sm border border-blueprint-grid-line shrink-0 ${color}`} />
              {label}
            </button>
          ))}
        </div>

        {/* Slider de probabilidad — visible solo con herramienta 'danger' */}
        {tool === 'danger' && (
          <div className="mt-3 border-t border-blueprint-border pt-3 flex flex-col gap-2">
            <div className="flex justify-between text-xs font-mono text-blueprint-text-dim">
              <span>P(daño)</span>
              <span className="text-blueprint-accent-danger">
                {Math.round(dangerProb * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0.1}
              max={0.9}
              step={0.05}
              value={dangerProb}
              onChange={(e) => setDangerProb(parseFloat(e.target.value))}
              className="w-full accent-blueprint-accent-danger h-1"
            />
            <div className="flex justify-between text-xs font-mono text-blueprint-text-dim mt-1">
              <span>Daño HP</span>
              <span className="text-blueprint-accent-danger">{dangerDamage}</span>
            </div>
            <input
              type="range"
              min={1}
              max={40}
              step={1}
              value={dangerDamage}
              onChange={(e) => setDangerDamage(parseInt(e.target.value, 10))}
              className="w-full accent-blueprint-accent-danger h-1"
            />
          </div>
        )}
      </div>

      {/* Acciones rápidas */}
      <div className="flex flex-col gap-1">
        <button
          onClick={handleNewEmpty}
          className="w-full text-xs font-mono py-1.5 border border-blueprint-border text-blueprint-text-muted hover:text-blueprint-text hover:border-blueprint-text-dim rounded-sm transition-colors"
        >
          Nuevo vacío
        </button>
        <button
          onClick={handleGenerate}
          className="w-full text-xs font-mono py-1.5 border border-blueprint-accent-info text-blueprint-accent-info hover:bg-blueprint-accent-info hover:text-blueprint-bg rounded-sm transition-colors"
        >
          Generar procedural
        </button>
      </div>

      <p className="text-blueprint-text-dim text-xs font-mono">
        Click = pintar · Click derecho = borrar
      </p>
    </div>
  );
}
