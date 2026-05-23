/* Pantalla principal de simulación */

import Link from 'next/link';
import { GridCanvas } from '@/components/grid/GridCanvas';
import { LayerToggles } from '@/components/panels/LayerToggles';
import { BrainPanel } from '@/components/panels/BrainPanel';
import { KeyboardController } from '@/components/panels/KeyboardController';
import { PlanController } from '@/components/panels/PlanController';

export default function HomePage() {
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

      {/* Cuerpo: canvas + panel lateral */}
      <div className="flex-1 flex min-h-0">
        {/* Canvas principal */}
        <div className="flex-1 p-3 min-w-0 min-h-0">
          <GridCanvas />
        </div>

        {/* Panel lateral */}
        <aside className="w-72 border-l border-blueprint-border flex flex-col overflow-hidden shrink-0">

          {/* Controles de capas y leyenda */}
          <div className="p-3 border-b border-blueprint-border flex flex-col gap-3 shrink-0">
            <LayerToggles />

            {/* Leyenda */}
            <div className="border border-blueprint-border bg-blueprint-bg-elevated p-2 rounded-sm flex flex-col gap-1">
              <p className="text-blueprint-text-dim text-[10px] font-mono uppercase tracking-widest mb-0.5">
                Leyenda
              </p>
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

            {/* Hint teclado */}
            <p className="text-blueprint-text-dim text-[10px] font-mono">
              ↑ ↓ ← → exploración manual (inactivo en simulación)
            </p>
          </div>

          {/* Panel cerebro — scroll independiente */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3">
            <p className="text-blueprint-text-dim text-[10px] font-mono uppercase tracking-widest mb-2">
              Cerebro
            </p>
            <BrainPanel />
          </div>
        </aside>
      </div>

      {/* Controladores invisibles */}
      <KeyboardController />
      <PlanController />
    </div>
  );
}
