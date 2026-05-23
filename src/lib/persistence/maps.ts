/* CRUD de mapas guardados en localStorage con validación Zod */

import { SavedMapSchema } from '@/types/persistence';
import type { SavedMap } from '@/types/persistence';
import type { Grid, GridSize, Position } from '@/types/world';

const STORAGE_KEY = 'sara:maps';

// ─── Lectura ──────────────────────────────────────────────────────────────────

/** Devuelve todos los mapas guardados; filtra silenciosamente los que no pasen validación */
export function getMaps(): SavedMap[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      const result = SavedMapSchema.safeParse(item);
      return result.success ? [result.data] : [];
    });
  } catch {
    return [];
  }
}

/** Persiste el arreglo completo de mapas */
function persistMaps(maps: SavedMap[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(maps));
  } catch (err) {
    // Puede fallar si el localStorage está lleno
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`No se pudo guardar: ${message}`);
  }
}

// ─── Escritura ────────────────────────────────────────────────────────────────

/** Guarda un nuevo mapa y devuelve el objeto completo con id y timestamp */
export function saveMap(data: {
  name: string;
  size: GridSize;
  cells: Grid;
  agentStart: Position;
}): SavedMap {
  const newMap: SavedMap = {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    name: data.name.trim() || 'Sin nombre',
    size: data.size,
    cells: data.cells,
    agentStart: data.agentStart,
  };
  const maps = getMaps();
  maps.push(newMap);
  persistMaps(maps);
  return newMap;
}

/** Sobreescribe los datos de un mapa existente (misma id) */
export function updateMap(
  id: string,
  updates: Partial<Omit<SavedMap, 'id' | 'createdAt'>>
): void {
  const maps = getMaps();
  const idx = maps.findIndex((m) => m.id === id);
  if (idx === -1) return;
  maps[idx] = { ...maps[idx]!, ...updates };
  persistMaps(maps);
}

/** Elimina un mapa por id */
export function deleteMap(id: string): void {
  persistMaps(getMaps().filter((m) => m.id !== id));
}

// ─── Import / Export ──────────────────────────────────────────────────────────

/** Intenta parsear y validar un JSON externo como SavedMap; null si falla */
export function importMapFromJSON(json: string): SavedMap | null {
  try {
    const parsed: unknown = JSON.parse(json);
    const result = SavedMapSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

/** Serializa un SavedMap a JSON indentado para exportar */
export function exportMapToJSON(map: SavedMap): string {
  return JSON.stringify(map, null, 2);
}

/** Dispara la descarga de un archivo JSON en el browser */
export function downloadMapJSON(map: SavedMap): void {
  const blob = new Blob([exportMapToJSON(map)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${map.name.replace(/\s+/g, '_')}.sara.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
