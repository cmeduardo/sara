/* Percepción del agente: visión directa y sensores ruidosos */

import type { Grid, Position } from '@/types/world';
import type { PerceivedCell, SensorReading } from '@/types/agent';
import { getCell, neighbors } from '@/lib/environment/grid';

interface SensorNoise {
  victimFalsePositive: number;
  victimFalseNegative: number;
  breezeFalsePositive: number;
  breezeFalseNegative: number;
}

/**
 * Devuelve todas las celdas dentro del radio de Chebyshev del agente.
 * Estas celdas son observadas directamente (verdad absoluta, sin ruido).
 */
export function perceive(
  grid: Grid,
  agentPos: Position,
  radius: number
): PerceivedCell[] {
  const result: PerceivedCell[] = [];
  const size = grid.length;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (Math.max(Math.abs(x - agentPos.x), Math.abs(y - agentPos.y)) > radius) continue;
      const cell = getCell(grid, { x, y });
      if (cell) result.push({ pos: { x, y }, cell });
    }
  }

  return result;
}

/**
 * Sensor de víctimas a distancia — devuelve una lectura ruidosa.
 * Puede detectar víctimas fuera del radio de observación directa
 * pero con probabilidades de falso positivo y falso negativo.
 */
export function victimSensor(
  grid: Grid,
  agentPos: Position,
  sensorRadius: number,
  noise: SensorNoise,
  step: number
): Pick<SensorReading, 'victimDetected' | 'victimEstimatedDistance' | 'actualVictimNearby'> {
  const size = grid.length;
  let nearestManhattan: number | null = null;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (Math.max(Math.abs(x - agentPos.x), Math.abs(y - agentPos.y)) > sensorRadius) continue;
      if (getCell(grid, { x, y })?.type === 'victim') {
        const d = Math.abs(x - agentPos.x) + Math.abs(y - agentPos.y);
        if (nearestManhattan === null || d < nearestManhattan) nearestManhattan = d;
      }
    }
  }

  // step no influye en la lógica pero se reserva para decay futuro
  void step;

  const actualVictimNearby = nearestManhattan !== null;
  const detected = actualVictimNearby
    ? Math.random() > noise.victimFalseNegative  // puede perderse la víctima
    : Math.random() < noise.victimFalsePositive;  // puede alucinar una

  // Estimar distancia con pequeño ruido gaussiano
  const victimEstimatedDistance: number | null = detected
    ? nearestManhattan !== null
      ? Math.max(1, nearestManhattan + Math.round((Math.random() - 0.5) * 2))
      : Math.floor(Math.random() * sensorRadius) + 1  // falso positivo: distancia ficticia
    : null;

  return { victimDetected: detected, victimEstimatedDistance, actualVictimNearby };
}

/**
 * Sensor de brisa — estilo Wumpus World.
 * Devuelve true si alguna celda ortogonal es de peligro, con ruido añadido.
 */
export function dangerBreezeSensor(
  grid: Grid,
  agentPos: Position,
  noise: SensorNoise
): Pick<SensorReading, 'breezeDetected' | 'actualBreezeNearby'> {
  const actualBreezeNearby = neighbors(grid, agentPos).some(
    (p) => getCell(grid, p)?.type === 'danger'
  );

  const breezeDetected = actualBreezeNearby
    ? Math.random() > noise.breezeFalseNegative
    : Math.random() < noise.breezeFalsePositive;

  return { breezeDetected, actualBreezeNearby };
}
