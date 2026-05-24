'use client';

/* Página de comparativa: BFS vs A* sobre el WorldModel del agente */

import { useState } from 'react';
import Link from 'next/link';
import { useWorldStore } from '@/store/worldStore';
import { useAgentStore } from '@/store/agentStore'; // beliefs only
import { SearchCanvas } from '@/components/comparativa/SearchCanvas';
import { compareSearches, type CompareResult } from '@/lib/search/compare';
import type { Position } from '@/types/world';
import type { KnownCellRecord } from '@/lib/agent/memory';

// ── Fila de la tabla de comparativa ──────────────────────────────────────────

interface RowProps {
  label: string;
  bfsVal: string | number;
  astarVal: string | number;
  /** Si true, el valor menor es el "ganador" */
  lowerIsBetter?: boolean;
}

function MetricRow({ label, bfsVal, astarVal, lowerIsBetter = true }: RowProps) {
  const b = parseFloat(String(bfsVal));
  const a = parseFloat(String(astarVal));
  const bfsWins = !isNaN(b) && !isNaN(a) && (lowerIsBetter ? b <= a : b >= a);
  const aWins   = !isNaN(b) && !isNaN(a) && (lowerIsBetter ? a <= b : a >= b);

  return (
    <tr className="border-t border-blueprint-border">
      <td className="py-1 pr-3 text-blueprint-text-muted font-mono text-xs">{label}</td>
      <td className={`py-1 pr-3 text-right font-mono text-xs ${bfsWins ? 'text-blueprint-accent-data' : 'text-blueprint-text-dim'}`}>
        {bfsVal}
      </td>
      <td className={`py-1 text-right font-mono text-xs ${aWins ? 'text-blueprint-accent-success' : 'text-blueprint-text-dim'}`}>
        {astarVal}
      </td>
    </tr>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function ComparativaPage() {
  const { grid, gridSize, agentState, agentLastDir } = useWorldStore();
  const { beliefs } = useAgentStore();

  const [goalPos, setGoalPos] = useState<Position | null>(null);
  const [results, setResults] = useState<CompareResult | null>(null);

  // Build a complete WorldModel from the actual grid so both algorithms
  // correctly avoid obstacles and A* can penalize known danger cells.
  const fullKnownCells: KnownCellRecord = {};
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const cell = grid[y]?.[x];
      if (cell) fullKnownCells[`${x},${y}`] = { cell, lastSeenStep: 0 };
    }
  }

  function handleRun() {
    if (!goalPos) return;
    setResults(
      compareSearches({ start: agentState.pos, goal: goalPos, knownCells: fullKnownCells, beliefs, gridSize })
    );
  }

  const totalCells = gridSize * gridSize;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="h-10 border-b border-blueprint-border flex items-center px-4 gap-4 shrink-0">
        <span className="font-sans text-blueprint-accent-data text-sm tracking-widest uppercase">
          SARA
        </span>
        <span className="text-blueprint-text-dim text-xs font-mono">
          Comparativa — BFS vs A*
        </span>
        <Link
          href="/"
          className="ml-auto text-blueprint-text-dim hover:text-blueprint-accent-info text-xs font-mono transition-colors"
        >
          ← simulación
        </Link>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* Canvas central */}
        <div className="flex-1 p-3 min-w-0 min-h-0">
          <SearchCanvas
            grid={grid}
            gridSize={gridSize}
            agentState={agentState}
            agentLastDir={agentLastDir}
            knownCells={fullKnownCells}
            goalPos={goalPos}
            bfsPath={results?.bfs.path ?? []}
            astarPath={results?.astar.path ?? []}
            onCellClick={(pos) => { setGoalPos(pos); setResults(null); }}
          />
        </div>

        {/* Panel de control y resultados */}
        <aside className="w-80 border-l border-blueprint-border flex flex-col overflow-hidden shrink-0">
          {/* Controles */}
          <div className="p-3 border-b border-blueprint-border flex flex-col gap-3 shrink-0">
            <p className="text-blueprint-text-dim text-[10px] font-mono uppercase tracking-widest">
              Búsqueda
            </p>

            {/* Inicio / objetivo */}
            <div className="border border-blueprint-border bg-blueprint-bg-elevated p-2 rounded-sm flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-blueprint-text-muted text-[10px] font-mono">Inicio</span>
                <span className="text-blueprint-accent-data text-[10px] font-mono">
                  ({agentState.pos.x},{agentState.pos.y})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-blueprint-text-muted text-[10px] font-mono">Objetivo</span>
                <span className={`text-[10px] font-mono ${goalPos ? 'text-blueprint-accent-data' : 'text-blueprint-text-dim'}`}>
                  {goalPos ? `(${goalPos.x},${goalPos.y})` : 'clic en el mapa →'}
                </span>
              </div>
            </div>

            {/* WorldModel info */}
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-blueprint-text-muted">WorldModel</span>
              <span className="text-blueprint-text-dim">
                <span className="text-blueprint-accent-data">{totalCells}</span>
                /{totalCells} celdas (mapa completo)
              </span>
            </div>

            {/* Leyenda de colores */}
            <div className="flex gap-4 text-[10px] font-mono text-blueprint-text-dim">
              <span className="flex items-center gap-1.5">
                <span className="w-5 h-0.5 bg-blueprint-accent-data inline-block shrink-0" />
                BFS
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-5 h-0.5 bg-blueprint-accent-success inline-block shrink-0" />
                A*
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 border border-blueprint-accent-data rounded-sm inline-block shrink-0 opacity-60" />
                Objetivo
              </span>
            </div>

            <button
              onClick={handleRun}
              disabled={!goalPos}
              className="border border-blueprint-border text-blueprint-text text-xs font-mono py-1.5 rounded-sm hover:border-blueprint-accent-data hover:text-blueprint-accent-data transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              Ejecutar búsquedas
            </button>
          </div>

          {/* Resultados */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3">
            {!results ? (
              <div className="flex flex-col gap-2">
                <p className="text-blueprint-text-dim text-[10px] font-mono leading-relaxed">
                  1. Haz clic en una celda del mapa para marcar el objetivo.
                </p>
                <p className="text-blueprint-text-dim text-[10px] font-mono leading-relaxed">
                  2. Pulsa "Ejecutar búsquedas" para comparar.
                </p>
                <p className="text-blueprint-text-dim text-[10px] font-mono leading-relaxed">
                  El mapa completo es visible — BFS elige el camino más corto (ignora riesgo); A* evita celdas peligrosas minimizando costo esperado.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {/* Tabla */}
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left text-blueprint-text-dim pb-2 font-normal text-[10px] font-mono">
                        Métrica
                      </th>
                      <th className="text-right text-blueprint-accent-data pb-2 font-normal text-[10px] font-mono">
                        BFS
                      </th>
                      <th className="text-right text-blueprint-accent-success pb-2 font-normal text-[10px] font-mono">
                        A*
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-blueprint-border">
                      <td className="py-1 pr-3 text-blueprint-text-muted font-mono text-xs">
                        Encontrado
                      </td>
                      <td className={`py-1 pr-3 text-right font-mono text-xs ${results.bfs.found ? 'text-blueprint-accent-success' : 'text-blueprint-accent-danger'}`}>
                        {results.bfs.found ? 'sí' : 'no'}
                      </td>
                      <td className={`py-1 text-right font-mono text-xs ${results.astar.found ? 'text-blueprint-accent-success' : 'text-blueprint-accent-danger'}`}>
                        {results.astar.found ? 'sí' : 'no'}
                      </td>
                    </tr>
                    <MetricRow
                      label="Nodos expandidos"
                      bfsVal={results.bfs.nodesExpanded}
                      astarVal={results.astar.nodesExpanded}
                    />
                    <MetricRow
                      label="Longitud plan"
                      bfsVal={results.bfs.path.length}
                      astarVal={results.astar.path.length}
                    />
                    <MetricRow
                      label="Costo total"
                      bfsVal={results.bfs.totalCost.toFixed(1)}
                      astarVal={results.astar.totalCost.toFixed(1)}
                    />
                    <MetricRow
                      label="Frontera máx"
                      bfsVal={results.bfs.frontierMax}
                      astarVal={results.astar.frontierMax}
                    />
                    <MetricRow
                      label="Tiempo (ms)"
                      bfsVal={results.bfs.timeMs.toFixed(2)}
                      astarVal={results.astar.timeMs.toFixed(2)}
                    />
                  </tbody>
                </table>

                {/* Nota de contexto */}
                <div className="border border-blueprint-border bg-blueprint-bg-elevated p-2 rounded-sm">
                  <p className="text-blueprint-text-dim text-[10px] font-mono leading-relaxed">
                    BFS garantiza el camino de menos pasos ignorando el peligro. A* minimiza
                    el costo esperado (1 por paso + daño × prob en celdas peligrosas) y
                    rodea las zonas de riesgo usando h(n) = Manhattan + riesgo estimado.
                  </p>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
