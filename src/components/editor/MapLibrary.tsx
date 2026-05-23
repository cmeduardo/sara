'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useEditorStore } from '@/store/editorStore';
import { useWorldStore } from '@/store/worldStore';
import { useAgentStore } from '@/store/agentStore';
import {
  saveMap,
  deleteMap,
  downloadMapJSON,
  importMapFromJSON,
} from '@/lib/persistence/maps';
import type { SavedMap } from '@/types/persistence';
import type { Grid } from '@/types/world';

export function MapLibrary() {
  const router = useRouter();
  const [saveName, setSaveName] = useState('');
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    grid, gridSize, agentStart, currentMapId,
    savedMaps, loadSavedMap, refreshSavedMaps,
  } = useEditorStore();

  const { loadGrid, setPlan: setWorldPlan } = useWorldStore();
  const { reset: resetAgent } = useAgentStore();

  // Cargar lista al montar
  useEffect(() => {
    refreshSavedMaps();
  }, [refreshSavedMaps]);

  // ─── Guardar ────────────────────────────────────────────────────────────────

  function handleSave() {
    const name = saveName.trim() || `Mapa ${new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}`;
    try {
      saveMap({ name, size: gridSize, cells: grid, agentStart });
      setSaveName('');
      refreshSavedMaps();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al guardar');
    }
  }

  // ─── Cargar en editor ───────────────────────────────────────────────────────

  function handleLoad(map: SavedMap) {
    loadSavedMap(map);
  }

  // ─── Cargar en simulación (worldStore) y navegar ────────────────────────────

  function handleLoadToSim(map: SavedMap) {
    loadGrid(map.cells as Grid, map.size, map.agentStart);
    setWorldPlan([]);
    resetAgent();
    router.push('/');
  }

  // ─── Eliminar ───────────────────────────────────────────────────────────────

  function handleDelete(id: string) {
    deleteMap(id);
    refreshSavedMaps();
  }

  // ─── Exportar ───────────────────────────────────────────────────────────────

  function handleExport(map: SavedMap) {
    downloadMapJSON(map);
  }

  function handleExportCurrent() {
    const name = saveName.trim() || 'mapa_actual';
    const tempMap: SavedMap = {
      id: 'temp',
      name,
      createdAt: Date.now(),
      size: gridSize,
      cells: grid,
      agentStart,
    };
    downloadMapJSON(tempMap);
  }

  // ─── Importar ───────────────────────────────────────────────────────────────

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    setImportError('');
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text !== 'string') return;
      const map = importMapFromJSON(text);
      if (!map) {
        setImportError('JSON inválido o esquema incorrecto');
        return;
      }
      loadSavedMap(map);
    };
    reader.readAsText(file);
    // Resetear el input para permitir cargar el mismo archivo de nuevo
    e.target.value = '';
  }

  const dateLabel = (ts: number) =>
    new Date(ts).toLocaleDateString('es', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex flex-col gap-3 h-full overflow-hidden">
      {/* Guardar mapa actual */}
      <div className="border border-blueprint-border bg-blueprint-bg-elevated p-3 rounded-sm shrink-0">
        <p className="text-blueprint-text-dim text-xs font-mono uppercase tracking-widest mb-2">
          Guardar
        </p>
        
        {/* Input y botón en columna para evitar desbordamiento */}
        <div className="flex flex-col gap-1">
          <input
            type="text"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="nombre del mapa"
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            className="w-full bg-blueprint-bg border border-blueprint-border text-blueprint-text text-xs font-mono px-2 py-1 rounded-sm outline-none focus:border-blueprint-text-dim placeholder:text-blueprint-text-dim"
          />
          <button
            onClick={handleSave}
            className="w-full py-1 text-xs font-mono border border-blueprint-accent-success text-blueprint-accent-success hover:bg-blueprint-accent-success hover:text-blueprint-bg rounded-sm transition-colors"
          >
            Guardar
          </button>
        </div>

        <div className="flex gap-1 mt-2">
          <button
            onClick={handleExportCurrent}
            className="flex-1 py-1 text-xs font-mono border border-blueprint-border text-blueprint-text-dim hover:text-blueprint-text hover:border-blueprint-text-dim rounded-sm transition-colors"
          >
            Exportar JSON
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 py-1 text-xs font-mono border border-blueprint-border text-blueprint-text-dim hover:text-blueprint-text hover:border-blueprint-text-dim rounded-sm transition-colors"
          >
            Importar JSON
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImportFile}
        />

        {importError && (
          <p className="text-blueprint-accent-danger text-xs font-mono mt-1">{importError}</p>
        )}
      </div>

      {/* Lista de mapas guardados — min-h-0 es crítico para que overflow-y-auto funcione en flex */}
      <div className="border border-blueprint-border bg-blueprint-bg-elevated p-3 rounded-sm flex flex-col gap-2 flex-1 min-h-0">
        <p className="text-blueprint-text-dim text-xs font-mono uppercase tracking-widest shrink-0">
          Mapas ({savedMaps.length})
        </p>

        {savedMaps.length === 0 && (
          <p className="text-blueprint-text-dim text-xs font-mono italic">
            Sin mapas guardados
          </p>
        )}

        {/* min-h-0 en el scroll container para que el padre flex lo limite */}
        <div className="flex flex-col gap-1 overflow-y-auto min-h-0">
          {savedMaps.map((map) => (
            <div
              key={map.id}
              className={`border rounded-sm p-2 ${
                currentMapId === map.id
                  ? 'border-blueprint-accent-data bg-blueprint-bg'
                  : 'border-blueprint-border hover:border-blueprint-text-dim'
              }`}
            >
              {/* Nombre + tamaño en una línea */}
              <div className="flex items-baseline justify-between gap-1 mb-0.5">
                <span className="text-blueprint-text text-xs font-mono truncate leading-tight min-w-0">
                  {map.name}
                </span>
                <span className="text-blueprint-text-dim text-xs font-mono shrink-0">
                  {map.size}²
                </span>
              </div>

              {/* Fecha compacta */}
              <p className="text-blueprint-text-dim text-xs font-mono mb-1.5">
                {dateLabel(map.createdAt)}
              </p>

              {/* Botones en 2 filas de 2 — evita desbordamiento horizontal */}
              <div className="grid grid-cols-2 gap-1">
                <button
                  onClick={() => handleLoad(map)}
                  className="py-0.5 text-xs font-mono border border-blueprint-accent-info text-blueprint-accent-info hover:bg-blueprint-accent-info hover:text-blueprint-bg rounded-sm transition-colors"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleLoadToSim(map)}
                  className="py-0.5 text-xs font-mono border border-blueprint-accent-data text-blueprint-accent-data hover:bg-blueprint-accent-data hover:text-blueprint-bg rounded-sm transition-colors"
                >
                  Simular
                </button>
                <button
                  onClick={() => handleExport(map)}
                  className="py-0.5 text-xs font-mono border border-blueprint-border text-blueprint-text-dim hover:text-blueprint-text rounded-sm transition-colors"
                >
                  JSON
                </button>
                <button
                  onClick={() => handleDelete(map.id)}
                  className="py-0.5 text-xs font-mono border border-blueprint-accent-danger text-blueprint-accent-danger hover:bg-blueprint-accent-danger hover:text-blueprint-bg rounded-sm transition-colors"
                >
                  Borrar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}