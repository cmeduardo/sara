/* Parámetros centrales de simulación — todos ajustables por la UI */

import type { GridSize } from '@/types/world';

export const DEFAULTS = {
  /* --- Cuadrícula --- */
  gridSize: 12 as GridSize,

  /* --- Agente --- */
  agentVisionRadius: 1,       // radio de Chebyshev para observabilidad parcial
  initialEnergy: 75,
  initialHP: 100,

  /* --- Costos de acción --- */
  moveCost: 1,                // energía por paso
  rescueCost: 2,              // energía por rescate
  waitCost: 0,                // sin costo

  /* --- Peligro --- */
  dangerDamageRange: {
    min: 5,
    max: 25,
  } as const,

  /* --- Ruido de sensores --- */
  sensorNoise: {
    victimFalsePositive: 0.1, // P(detectar víctima | no hay víctima)
    victimFalseNegative: 0.15,// P(no detectar | hay víctima)
    breezeFalsePositive: 0.05,// P(sentir brisa | sin peligro adyacente)
    breezeFalseNegative: 0.1, // P(no sentir brisa | hay peligro adyacente)
  } as const,

  /* --- Dinamismo del entorno --- */
  dynamism: {
    enabled: true,
    tickEveryNSteps: 10,      // cada cuántos pasos se evalúa el dinamismo
    newDangerProb: 0.15,      // probabilidad de aparecer nuevo peligro
    changeDangerProbProb: 0.2,// probabilidad de modificar dangerProb existente
    moveVictimProb: 0.05,     // probabilidad de mover una víctima a celda adyacente
  } as const,

  /* --- Q-learning --- */
  qLearning: {
    alpha: 0.1,               // tasa de aprendizaje
    gamma: 0.9,               // factor de descuento
    epsilon: 0.3,             // exploración inicial (ε-greedy)
    epsilonDecay: 0.995,      // multiplicador de ε por episodio
    alphaDecay: 0.999,        // multiplicador de α por episodio
    minEpsilon: 0.01,
    minAlpha: 0.01,
  } as const,

  /* --- Pesos de recompensa --- */
  rewardWeights: {
    victim: 100,              // rescatar una víctima
    death: -50,               // morir
    step: -1,                 // costo por paso (incentiva eficiencia)
    danger: -5,               // pisar celda de peligro
    hpLoss: -2,               // por cada punto de HP perdido
    rechargeLow: 20,          // recargar con energía < 30%
    invalid: -10,             // intentar acción inválida (ej. moverse a obstáculo)
    explore: 5,               // visitar celda no vista antes (decae con el tiempo)
  } as const,

  /* --- Densidad procedural por defecto --- */
  mapDensity: {
    obstacleRatio: 0.12,
    dangerRatio: 0.06,
    victimCount: 4,
    stationCount: 1,
  } as const,

  /* --- Simulación --- */
  maxStepsPerEpisode: 500,
  simulationSpeedMs: 300,     // ms entre pasos en modo normal (1x)

  /* --- Entrenamiento turbo --- */
  turboEpisodes: {
    options: [100, 500, 2000] as const,
    default: 500,
  },
} as const;

export type SimulationConfig = typeof DEFAULTS;
