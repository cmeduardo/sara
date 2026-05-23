/* Pantalla principal de SARA — placeholder para Fase 0 */

export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center h-full gap-4">
      <div className="border border-blueprint-border bg-blueprint-bg-elevated px-8 py-6 rounded-sm">
        <h1 className="font-sans text-blueprint-accent-data text-xl tracking-widest uppercase mb-1">
          SARA
        </h1>
        <p className="text-blueprint-text-muted text-sm font-mono">
          Sistema de Agentes de Rescate Autónomo
        </p>
        <p className="text-blueprint-text-dim text-xs font-mono mt-3">
          Fase 0 — Setup completado · Inteligencia Artificial · UMG
        </p>
      </div>

      <div className="font-mono text-blueprint-text-dim text-xs">
        <span className="text-blueprint-accent-success">●</span>{' '}
        paleta blueprint activa · JetBrains Mono · IBM Plex Sans
      </div>
    </main>
  );
}
