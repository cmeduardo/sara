'use client';

/* Pantalla principal de simulación — dual agente: A* vs BFS */

import { useState } from 'react';
import Link from 'next/link';
import { GridCanvas } from '@/components/grid/GridCanvas';
import { LayerToggles } from '@/components/panels/LayerToggles';
import { BrainPanel } from '@/components/panels/BrainPanel';
import { KeyboardController } from '@/components/panels/KeyboardController';
import { PlanController, PlanControllerBFS } from '@/components/panels/PlanController';
import { useWorldStore } from '@/store/worldStore';
import { useAgentStore } from '@/store/agentStore';
import { useWorldStoreBFS } from '@/store/worldStoreBFS';
import { useAgentStoreBFS } from '@/store/agentStoreBFS';
import { useUIStore } from '@/store/uiStore';
import type { AgentState } from '@/types/world';

function AgentStatsBar({ state }: { state: AgentState }) {
  return (
    <div className="ml-auto flex items-center gap-3 text-[10px] font-mono">
      <span className="text-blueprint-text-muted">
        HP <span className={state.hp <= 30 ? 'text-blueprint-accent-danger' : 'text-blueprint-text'}>{state.hp}</span>
      </span>
      <span className="text-blueprint-text-muted">
        E <span className={state.energy <= 20 ? 'text-blueprint-accent-danger' : 'text-blueprint-accent-info'}>{state.energy}</span>
      </span>
      <span className="text-blueprint-text-muted">
        ✓ <span className="text-blueprint-accent-success">{state.rescued}</span>
      </span>
      <span className="text-blueprint-text-muted">
        p <span className="text-blueprint-text">{state.steps}</span>
      </span>
      {!state.alive && (
        <span className="text-blueprint-accent-danger uppercase tracking-widest text-[9px] border border-blueprint-accent-danger px-1 rounded-sm">
          muerto
        </span>
      )}
    </div>
  );
}

export default function HomePage() {
  const { grid, agentState, agentLastDir, plan } = useWorldStore();
  const { beliefs } = useAgentStore();
  const { showVisibility, showBeliefs, showPlan } = useUIStore();

  const { grid: gridBFS, agentState: agentStateBFS, agentLastDir: agentLastDirBFS, plan: planBFS } = useWorldStoreBFS();
  const { beliefs: beliefsBFS } = useAgentStoreBFS();

  const [brainTab, setBrainTab] = useState<'astar' | 'bfs'>('astar');

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="h-10 border-b border-blueprint-border flex items-center px-4 gap-4 shrink-0">
        <span className="font-sans text-blueprint-accent-data text-sm tracking-widest uppercase">
          SARA
        </span>
        <span className="text-blueprint-text-dim text-xs font-mono">
          Sistema de Agentes de Rescate Autónomo
        </span>
        <Link
          href="/comparativa"
          className="ml-auto text-blueprint-text-dim hover:text-blueprint-accent-info text-xs font-mono transition-colors"
        >
          comparativa →
        </Link>
        <Link
          href="/editor"
          className="text-blueprint-text-dim hover:text-blueprint-accent-info text-xs font-mono transition-colors"
        >
          editor →
        </Link>
      </header>

      {/* Cuerpo: canvases + panel lateral */}
      <div className="flex-1 flex min-h-0">

        {/* ── Canvas A* ────────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0 border-r border-blueprint-border">
          <div className="h-8 border-b border-blueprint-border flex items-center px-3 gap-2 shrink-0">
            <span className="text-blueprint-accent-success text-[11px] font-mono font-bold tracking-widest">
              A*
            </span>
            <span className="text-blueprint-text-dim text-[10px] font-mono">informado · consciente del riesgo</span>
            <AgentStatsBar state={agentState} />
          </div>
          <div className="flex-1 p-2 min-h-0">
            <GridCanvas
              grid={grid}
              gridSize={grid.length as import('@/types/world').GridSize}
              agentState={agentState}
              agentLastDir={agentLastDir}
              plan={plan}
              beliefs={beliefs}
              showVisibility={showVisibility}
              showBeliefs={showBeliefs}
              showPlan={showPlan}
            />
          </div>
        </div>

        {/* ── Canvas BFS ───────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0 border-r border-blueprint-border">
          <div className="h-8 border-b border-blueprint-border flex items-center px-3 gap-2 shrink-0">
            <span className="text-blueprint-accent-data text-[11px] font-mono font-bold tracking-widest">
              BFS
            </span>
            <span className="text-blueprint-text-dim text-[10px] font-mono">no informado · mínimos pasos</span>
            <AgentStatsBar state={agentStateBFS} />
          </div>
          <div className="flex-1 p-2 min-h-0">
            <GridCanvas
              grid={gridBFS}
              gridSize={gridBFS.length as import('@/types/world').GridSize}
              agentState={agentStateBFS}
              agentLastDir={agentLastDirBFS}
              plan={planBFS}
              beliefs={beliefsBFS}
              showVisibility={showVisibility}
              showBeliefs={showBeliefs}
              showPlan={showPlan}
            />
          </div>
        </div>

        {/* ── Panel lateral ─────────────────────────────────────────────────── */}
        <aside className="w-72 border-l border-blueprint-border flex flex-col overflow-hidden shrink-0">

          {/* Controles de capas */}
          <div className="p-3 border-b border-blueprint-border flex flex-col gap-2 shrink-0">
            <LayerToggles />
            <div className="border border-blueprint-border bg-blueprint-bg-elevated p-2 rounded-sm flex flex-col gap-1">
              <p className="text-blueprint-text-dim text-[10px] font-mono uppercase tracking-widest mb-0.5">Leyenda</p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                {[
                  { color: 'bg-blueprint-agent',         label: 'Agente' },
                  { color: 'bg-blueprint-victim',        label: 'Víctima' },
                  { color: 'bg-blueprint-station',       label: 'Estación' },
                  { color: 'bg-blueprint-text-muted',    label: 'Obstáculo' },
                  { color: 'bg-blueprint-accent-danger opacity-50', label: 'Peligro' },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-sm shrink-0 ${color}`} />
                    <span className="text-blueprint-text-dim text-[10px] font-mono">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tabs cerebro */}
          <div className="flex border-b border-blueprint-border shrink-0">
            <button
              onClick={() => setBrainTab('astar')}
              className={`flex-1 py-1.5 text-[11px] font-mono font-bold tracking-widest transition-colors ${
                brainTab === 'astar'
                  ? 'text-blueprint-accent-success border-b-2 border-blueprint-accent-success'
                  : 'text-blueprint-text-dim hover:text-blueprint-text'
              }`}
            >
              A* cerebro
            </button>
            <button
              onClick={() => setBrainTab('bfs')}
              className={`flex-1 py-1.5 text-[11px] font-mono font-bold tracking-widest transition-colors ${
                brainTab === 'bfs'
                  ? 'text-blueprint-accent-data border-b-2 border-blueprint-accent-data'
                  : 'text-blueprint-text-dim hover:text-blueprint-text'
              }`}
            >
              BFS cerebro
            </button>
          </div>

          {/* Panel cerebro con scroll independiente */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3">
            <BrainPanel mode={brainTab} />
          </div>
        </aside>
      </div>

      {/* Controladores invisibles */}
      <KeyboardController />
      <PlanController />
      <PlanControllerBFS />
    </div>
  );
}
