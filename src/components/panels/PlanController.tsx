'use client';

/* Ejecuta el plan STRIPS automáticamente — un paso por tick */

import { useEffect, useRef } from 'react';
import { useWorldStore } from '@/store/worldStore';
import { useAgentStore } from '@/store/agentStore';
import { DEFAULTS } from '@/config/defaults';
import { runAgentCycle, applyMoveAction } from '@/lib/agent/loop';
import { maybeReplan } from '@/lib/planning/replan';
import { buildPlan, EMPTY_PLAN, planRemainingPath, buildExplorationPlan } from '@/lib/planning/strips';
import { getCell, setCell } from '@/lib/environment/grid';
import { tickDynamism } from '@/lib/environment/dynamism';
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
  const { knownCells, kbFacts, beliefs, plan, updateMemory, addSensorReading, setKB, setBeliefs, setLoopPhase, setPlan } =
    useAgentStore.getState();

  if (!agentState.alive) return;
  if (plan.status !== 'executing') return;

  // ── Dinamismo del entorno cada N pasos ────────────────────────────────────
  if (
    DEFAULTS.dynamism.enabled &&
    agentState.steps > 0 &&
    agentState.steps % DEFAULTS.dynamism.tickEveryNSteps === 0
  ) {
    const dynGrid = tickDynamism(grid, DEFAULTS.dynamism);
    if (dynGrid !== grid) setGrid(dynGrid);
  }

  // ── Ciclo cognitivo ────────────────────────────────────────────────────────
  setLoopPhase('perceiving');
  const result = runAgentCycle(grid, agentState, knownCells, kbFacts, DEFAULTS, beliefs);
  updateMemory(result.perceived, agentState.steps);
  addSensorReading(result.sensorReading);
  setLoopPhase('updating_beliefs');
  setBeliefs(result.updatedBeliefs);

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
    beliefs: result.updatedBeliefs,
    gridSize: grid.length,
  });

  setKB(freshKBFacts, result.kbNewFacts);

  // Plan fallido → intentar explorar antes de rendirse
  if (validPlan.status === 'failed') {
    const planInput = {
      agentPos: agentState.pos,
      kbFacts: freshKBFacts,
      knownCells: freshKnownCells,
      beliefs: result.updatedBeliefs,
      gridSize: grid.length,
      previousReplans: validPlan.replansCount,
    };
    const recovery = buildPlan(planInput) ?? buildExplorationPlan(planInput);
    // Mantener executing vacío para seguir percibiendo si no hay recuperación
    setPlan(recovery ?? { ...EMPTY_PLAN, status: 'executing' });
    setWorldPlan(recovery ? planRemainingPath(recovery) : []);
    setLoopPhase('idle');
    return;
  }

  const step = validPlan.steps[validPlan.currentIdx];
  if (!step) {
    // Plan exhausto → rescatar, explorar o seguir esperando cambios del entorno
    const planInput = {
      agentPos: agentState.pos,
      kbFacts: freshKBFacts,
      knownCells: freshKnownCells,
      beliefs: result.updatedBeliefs,
      gridSize: grid.length,
      previousReplans: validPlan.replansCount,
    };
    const nextPlan = buildPlan(planInput) ?? buildExplorationPlan(planInput);
    // Si no hay nada que hacer, mantener 'executing' con pasos vacíos para
    // seguir percibiendo cambios dinámicos del entorno
    setPlan(nextPlan ?? { ...EMPTY_PLAN, status: 'executing' });
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
      } else {
        // Camino bloqueado (obstáculo descubierto) — replanificar
        const planInput = {
          agentPos: agentState.pos,
          kbFacts: freshKBFacts,
          knownCells: freshKnownCells,
          beliefs: result.updatedBeliefs,
          gridSize: grid.length,
          previousReplans: validPlan.replansCount + 1,
        };
        const replan = buildPlan(planInput) ?? buildExplorationPlan(planInput);
        setPlan(replan ?? { ...EMPTY_PLAN, status: 'executing' });
        setWorldPlan(replan ? planRemainingPath(replan) : []);
        setLoopPhase('idle');
        return;
      }
    }
    const advanced = { ...validPlan, currentIdx: validPlan.currentIdx + 1 };
    setPlan(advanced);
    setWorldPlan(planRemainingPath(advanced));
  } else {
    // ── Ejecutar rescate ─────────────────────────────────────────────────────
    const { x, y } = step.to;
    const targetCell = getCell(grid, { x, y });

    // Si la víctima ya no está (se movió por dinamismo), retractar y replanear
    if (targetCell?.type !== 'victim') {
      const factsWithout = freshKBFacts.filter((f) => f !== `VictimAt(${x},${y})`);
      setKB(factsWithout, []);
      const planInput = {
        agentPos: agentState.pos,
        kbFacts: factsWithout,
        knownCells: freshKnownCells,
        beliefs: result.updatedBeliefs,
        gridSize: grid.length,
        previousReplans: validPlan.replansCount + 1,
      };
      const replan = buildPlan(planInput) ?? buildExplorationPlan(planInput);
      setPlan(replan ?? { ...EMPTY_PLAN, status: 'executing' });
      setWorldPlan(replan ? planRemainingPath(replan) : []);
      setLoopPhase('idle');
      return;
    }

    // Eliminar víctima del grid + retractar VictimAt de la KB
    const updatedGrid = setCell(grid, { x, y }, { type: 'empty' });
    setGrid(updatedGrid);
    const factsAfterRescue = freshKBFacts.filter((f) => f !== `VictimAt(${x},${y})`);
    setKB(factsAfterRescue, []);
    updateAgentState({ rescued: agentState.rescued + 1 });

    // Rescatar siguiente víctima o explorar más
    const planInput = {
      agentPos: agentState.pos,
      kbFacts: factsAfterRescue,
      knownCells: freshKnownCells,
      beliefs: result.updatedBeliefs,
      gridSize: grid.length,
      previousReplans: validPlan.replansCount,
    };
    const nextPlan = buildPlan(planInput) ?? buildExplorationPlan(planInput);
    setPlan(nextPlan ?? { ...EMPTY_PLAN, status: 'executing' });
    setWorldPlan(nextPlan ? planRemainingPath(nextPlan) : []);
  }

  setLoopPhase('idle');
}

export function PlanController() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { plan } = useAgentStore();
  const { agentState } = useWorldStore();

  const shouldRun = agentState.alive && plan.status === 'executing';

  useEffect(() => {
    if (shouldRun) {
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
  }, [shouldRun]);

  return null;
}
