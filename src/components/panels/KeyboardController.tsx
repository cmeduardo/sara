'use client';

/* Controlador de teclado: permite mover el agente con flechas y ejecutar el ciclo cognitivo */

import { useEffect } from 'react';
import { useWorldStore } from '@/store/worldStore';
import { useAgentStore } from '@/store/agentStore';
import { DEFAULTS } from '@/config/defaults';
import { runAgentCycle, applyMoveAction } from '@/lib/agent/loop';
import type { Direction } from '@/types/world';

const KEY_TO_DIR: Record<string, Direction> = {
  ArrowUp:    'N',
  ArrowDown:  'S',
  ArrowRight: 'E',
  ArrowLeft:  'W',
};

/** Ejecuta el ciclo cognitivo completo y aplica el movimiento indicado */
function step(dir: Direction) {
  const { grid, agentState, setAgentLastDir, updateAgentState } = useWorldStore.getState();
  const { knownCells, kbFacts, beliefs, plan, updateMemory, addSensorReading, setKB, setBeliefs, setLoopPhase } = useAgentStore.getState();

  if (!agentState.alive) return;
  if (plan.status === 'executing') return;

  // ── Ciclo cognitivo (fases 3-4-7) ────────────────────────────────────────
  setLoopPhase('perceiving');
  const result = runAgentCycle(grid, agentState, knownCells, kbFacts, DEFAULTS, beliefs);
  updateMemory(result.perceived, agentState.steps);
  addSensorReading(result.sensorReading);
  setLoopPhase('updating_beliefs');
  setBeliefs(result.updatedBeliefs);
  setKB(result.kbFacts, result.kbNewFacts);
  setLoopPhase('acting');

  // ── Aplicar movimiento ────────────────────────────────────────────────────
  const newState = applyMoveAction(grid, agentState, dir);
  if (newState) {
    setAgentLastDir(dir);
    updateAgentState(newState);
  }

  setLoopPhase('idle');
}

export function KeyboardController() {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const dir = KEY_TO_DIR[e.key];
      if (!dir) return;
      e.preventDefault();
      step(dir);
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Componente invisible — solo maneja eventos
  return null;
}
