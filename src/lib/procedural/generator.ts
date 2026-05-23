/* Generador procedural de mapas con garantía de conectividad */

import type { Grid, GridSize, Position } from '@/types/world';
import { createEmpty, setCell, getCell, isInBounds, neighbors } from '@/lib/environment/grid';

export interface GeneratorConfig {
  size: GridSize;
  seed?: number;
  obstacleRatio: number;   // 0.05 – 0.20
  dangerRatio: number;     // 0.03 – 0.10
  victimCount: number;     // 2 – 6
  stationCount: number;    // 0 – 2
}

export interface GeneratedMap {
  grid: Grid;
  agentStart: Position;
  seed: number;
}

/**
 * PRNG Mulberry32 — genera números pseudoaleatorios reproducibles dado un seed.
 * Referencia: https://gist.github.com/tommyettinger/46a874533244883189143505d203312c
 */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates shuffle con PRNG inyectado para reproducibilidad */
function shuffle<T>(arr: T[], rng: () => number): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

/**
 * BFS desde `start` para verificar que todas las celdas `targets` son alcanzables.
 * Los obstáculos bloquean el paso; peligros y estaciones son transitables.
 */
function isConnected(grid: Grid, start: Position, targets: Position[]): boolean {
  if (targets.length === 0) return true;

  const targetKeys = new Set(targets.map((t) => `${t.x},${t.y}`));
  const visited = new Set<string>();
  const queue: Position[] = [start];
  visited.add(`${start.x},${start.y}`);

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const n of neighbors(grid, current)) {
      const key = `${n.x},${n.y}`;
      if (visited.has(key)) continue;
      const cell = getCell(grid, n);
      if (cell?.type === 'obstacle') continue;
      visited.add(key);
      queue.push(n);
    }
  }

  for (const key of targetKeys) {
    if (!visited.has(key)) return false;
  }
  return true;
}

/** Intento único de generación; devuelve null si la conectividad falla */
function tryGenerate(config: GeneratorConfig, rng: () => number): GeneratedMap | null {
  const { size, victimCount, stationCount } = config;
  let grid = createEmpty(size);

  // El agente siempre empieza en (1,1) para dejar espacio de maniobra inicial
  const agentStart: Position = { x: 1, y: 1 };

  // Reservar la posición del agente y sus vecinos inmediatos
  const agentZone = new Set<string>();
  agentZone.add('1,1');
  for (const n of neighbors(grid, agentStart)) {
    agentZone.add(`${n.x},${n.y}`);
  }

  // Pool de celdas disponibles para colocar entidades
  const pool: Position[] = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!agentZone.has(`${x},${y}`)) pool.push({ x, y });
    }
  }

  const shuffled = shuffle(pool, rng);
  let cursor = 0;

  function take(n: number): Position[] {
    const taken = shuffled.slice(cursor, cursor + n);
    cursor += n;
    return taken;
  }

  const total = shuffled.length;
  const obstacleCount = Math.min(
    Math.floor(config.obstacleRatio * size * size),
    total - victimCount - stationCount - 1
  );
  const dangerCount = Math.min(
    Math.floor(config.dangerRatio * size * size),
    total - obstacleCount - victimCount - stationCount
  );

  // Colocar obstáculos
  for (const pos of take(obstacleCount)) {
    grid = setCell(grid, pos, { type: 'obstacle' });
  }

  // Colocar peligros con distancia mínima entre ellos para distribución razonable
  const minDangerDist = Math.max(2, Math.floor(size / 5));
  const placedDangers: Position[] = [];
  for (const pos of take(dangerCount)) {
    if (!isInBounds(grid, pos)) continue;
    const cell = getCell(grid, pos);
    if (cell?.type !== 'empty') continue;

    const tooClose = placedDangers.some(
      (d) => Math.abs(d.x - pos.x) + Math.abs(d.y - pos.y) < minDangerDist
    );
    if (tooClose) continue;

    placedDangers.push(pos);
    grid = setCell(grid, pos, {
      type: 'danger',
      dangerProb: 0.2 + rng() * 0.6,
      dangerDamage: 5 + Math.floor(rng() * 20),
    });
  }

  // Colocar estaciones
  for (const pos of take(stationCount)) {
    const cell = getCell(grid, pos);
    if (cell?.type === 'empty') {
      grid = setCell(grid, pos, { type: 'station' });
    }
  }

  // Colocar víctimas (al final para que el BFS las verifique)
  const victimPositions: Position[] = [];
  const victimCandidates = take(victimCount * 3); // tomar más candidatos por si algunos caen en celdas ocupadas
  for (const pos of victimCandidates) {
    if (victimPositions.length >= victimCount) break;
    const cell = getCell(grid, pos);
    if (cell?.type === 'empty') {
      victimPositions.push(pos);
      grid = setCell(grid, pos, { type: 'victim' });
    }
  }

  if (victimPositions.length < victimCount) return null;

  // Verificar que todas las víctimas son alcanzables desde el inicio del agente
  if (!isConnected(grid, agentStart, victimPositions)) return null;

  return { grid, agentStart, seed: config.seed ?? 0 };
}

/**
 * Genera un mapa procedural con garantía de conectividad.
 * Reintenta hasta `maxRetries` veces si la conectividad falla.
 * Devuelve null si ningún intento tiene éxito (muy improbable con configs razonables).
 */
export function generateMap(
  config: GeneratorConfig,
  maxRetries = 50
): GeneratedMap | null {
  const seed = config.seed ?? Date.now();
  const rng = mulberry32(seed);

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const result = tryGenerate({ ...config, seed }, rng);
    if (result) return result;
  }

  return null;
}
