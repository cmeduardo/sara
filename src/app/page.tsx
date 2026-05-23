/* Pantalla principal de simulación */

import { GridCanvas } from '@/components/grid/GridCanvas';
import { LayerToggles } from '@/components/panels/LayerToggles';

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
        <a
          href="/editor"
          className="ml-auto text-blueprint-text-dim hover:text-blueprint-accent-info text-xs font-mono transition-colors"
        >
          editor →
        </a>
      </header>

      {/* Cuerpo: canvas + panel de capas */}
      <div className="flex-1 flex min-h-0">
        {/* Canvas principal */}
        <div className="flex-1 p-3 min-w-0 min-h-0">
          <GridCanvas />
        </div>

        {/* Panel lateral con toggles */}
        <aside className="w-44 border-l border-blueprint-border p-3 shrink-0 flex flex-col gap-3">
          <LayerToggles />

          {/* Leyenda */}
          <div className="border border-blueprint-border bg-blueprint-bg-elevated p-3 rounded-sm flex flex-col gap-1.5">
            <p className="text-blueprint-text-dim text-xs font-mono uppercase tracking-widest mb-1">
              Leyenda
            </p>
            {[
              { color: 'bg-blueprint-agent', label: 'Agente' },
              { color: 'bg-blueprint-victim', label: 'Víctima' },
              { color: 'bg-blueprint-station', label: 'Estación' },
              { color: 'bg-blueprint-text-muted', label: 'Obstáculo' },
              { color: 'bg-blueprint-accent-danger opacity-50', label: 'Peligro' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-sm shrink-0 ${color}`} />
                <span className="text-blueprint-text-dim text-xs font-mono">{label}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
