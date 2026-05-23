'use client';

/* Ejecuta el plan STRIPS automáticamente — un paso por tick */

import { useEffect, useRef } from 'react';
import { useWorldStore } from '@/store/worldStore';
import { useAgentStore } from '@/store/agentStore';
import { DEFAULTS } from '@/config/defaults';
import { runAgentCycle, applyMoveAction } from '@/lib/agent/loop';
import { maybeReplan } from '@/lib/planning/replan';
import { buildPlan, EMPTY_PLAN, planRemainingPath } from '@/lib/planning/strips';
import { setCell } from '@/lib/environment/grid';
import type { Direction } from '@/types/world';

const STEP_INTERVAL_MS = 450;

/** Convierte dos posiciones adyacentes en una dirección cardinal */
function dirBetween(from: { x: number; y: number }, to: { x: number; y: number }): Direction | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx === 1  && dy === 0) return 'E';
  if (dx === -1 && dy === 0) return 'W';
  if (dx === 0  && dy === 1) return 'S';
  if (dx === 0  && dy === -1) return 'N';
  return null;
}

/** Ejecuta un ciclo cognitivo + acción del plan */
function executePlanStep() {
  const { grid, agentState, setAgentLastDir, updateAgentState, setPlan: setWorldPlan, setGrid } =
    useWorldStore.getState();
  const { knownCells, kbFacts, plan, updateMemory, addSensorReading, setKB, setLoopPhase, setPlan } =
    useAgentStore.getState();

  if (!agentState.alive) return;
  if (plan.status !== 'executing') return;

  // ── Ciclo cognitivo ────────────────────────────────────────────────────────
  setLoopPhase('perceiving');
  const result = runAgentCycle(grid, agentState, knownCells, kbFacts, DEFAULTS);
  updateMemory(result.perceived, agentState.steps);
  addSensorReading(result.sensorReading);

  // ── Replanificación si el próximo paso quedó inválido ──────────────────────
  setLoopPhase('planning');
  const freshKBFacts = result.kbFacts;
  const freshKnownCells = { ...knownCells, ...Object.fromEntries(
    result.perceived.map(({ pos, cell }) => [`${pos.x},${pos.y}`, { cell, lastSeenStep: agentState.steps }])
  )};

  const validPlan = maybeReplan(plan, {
    agentPos: agentState.pos,
    kbFacts: freshKBFacts,
    knownCells: freshKnownCells,
    beliefs: {},
    gridSize: grid.length,
  });

  setKB(freshKBFacts, result.kbNewFacts);

  if (validPlan.status === 'failed') {
    setPlan({ ...validPlan, status: 'failed' });
    setWorldPlan([]);
    setLoopPhase('idle');
    return;
  }

  const step = validPlan.steps[validPlan.currentIdx];
  if (!step) {
    // Plan vacío o exhausto → buscar siguiente víctima
    const nextPlan = buildPlan({
      agentPos: agentState.pos,
      kbFacts: freshKBFacts,
      knownCells: freshKnownCells,
      beliefs: {},
      gridSize: grid.length,
      previousReplans: validPlan.replansCount,
    });
    setPlan(nextPlan ?? { ...EMPTY_PLAN, status: 'complete' });
    setWorldPlan(nextPlan ? planRemainingPath(nextPlan) : []);
    setLoopPhase('idle');
    return;
  }

  setLoopPhase('acting');

  if (step.kind === 'MOVE') {
    // ── Ejecutar movimiento ──────────────────────────────────────────────────
    const dir = dirBetween(agentState.pos, step.to);
    if (dir) {
      const newState = applyMoveAction(grid, agentState, dir);
      if (newState) {
        setAgentLastDir(dir);
        updateAgentState(newState);
      }
    }
    const advanced = { ...validPlan, currentIdx: validPlan.currentIdx + 1 };
    setPlan(advanced);
    setWorldPlan(planRemainingPath(advanced));
  } else {
    // ── Ejecutar rescate ─────────────────────────────────────────────────────
    const { x, y } = step.to;
    // Efecto: eliminar víctima del grid real + retractar VictimAt de la KB
    const updatedGrid = setCell(grid, { x, y }, { type: 'empty' });
    setGrid(updatedGrid);
    const factsAfterRescue = freshKBFacts.filter((f) => f !== `VictimAt(${x},${y})`);
    setKB(factsAfterRescue, []);
    updateAgentState({ rescued: agentState.rescued + 1 });

    // Avanzar paso y buscar siguiente víctima
    const afterRescue = { ...validPlan, currentIdx: validPlan.currentIdx + 1 };
    const nextPlan = buildPlan({
      agentPos: agentState.pos,
      kbFacts: factsAfterRescue,
      knownCells: freshKnownCells,
      beliefs: {},
      gridSize: grid.length,
      previousReplans: validPlan.replansCount,
    });
    setPlan(nextPlan ?? { ...afterRescue, status: 'complete' });
    setWorldPlan(nextPlan ? planRemainingPath(nextPlan) : []);
  }

  setLoopPhase('idle');
}

export function PlanController() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { plan } = useAgentStore();

  useEffect(() => {
    if (plan.status === 'executing') {
      if (!intervalRef.current) {
        intervalRef.current = setInterval(executePlanStep, STEP_INTERVAL_MS);
      }
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [plan.status]);

  return null;
}
