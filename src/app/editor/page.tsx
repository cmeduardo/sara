/* Editor manual de mapas — Fase 2 */

import Link from 'next/link';
import { EditorCanvas } from '@/components/editor/EditorCanvas';
import { Toolbar } from '@/components/editor/Toolbar';
import { MapLibrary } from '@/components/editor/MapLibrary';

export default function EditorPage() {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="h-10 border-b border-blueprint-border flex items-center px-4 gap-4 shrink-0">
        <Link
          href="/"
          className="text-blueprint-text-dim hover:text-blueprint-text text-xs font-mono transition-colors"
        >
          ← simulación
        </Link>
        <span className="text-blueprint-border">|</span>
        <span className="font-sans text-blueprint-accent-data text-sm tracking-widest uppercase">
          SARA
        </span>
        <span className="text-blueprint-text-dim text-xs font-mono">
          Editor de mapas
        </span>
        <span className="ml-auto text-blueprint-text-dim text-xs font-mono">
          Click = pintar · Click derecho = borrar · Botón «Simular» carga en la simulación
        </span>
      </header>

      {/* Cuerpo: toolbar | canvas | biblioteca */}
      <div className="flex-1 flex min-h-0">
        {/* Panel izquierdo — herramientas */}
        <aside className="w-44 border-r border-blueprint-border p-3 shrink-0 overflow-y-auto">
          <Toolbar />
        </aside>

        {/* Canvas central */}
        <div className="flex-1 p-3 min-w-0 min-h-0">
          <EditorCanvas />
        </div>

        {/* Panel derecho — biblioteca */}
        <aside className="w-56 border-l border-blueprint-border p-3 shrink-0 flex flex-col overflow-hidden">
          <MapLibrary />
        </aside>
      </div>
    </div>
  );
}
