'use client';

/* Ejecuta el plan STRIPS automáticamente — un paso por tick */

import { useEffect, useRef } from 'react';
import { useWorldStore } from '@/store/worldStore';
import { useAgentStore } from '@/store/agentStore';
import { useLearningStore } from '@/store/learningStore';
import { useWorldStoreBFS } from '@/store/worldStoreBFS';
import { useAgentStoreBFS } from '@/store/agentStoreBFS';
import { useLearningStoreBFS } from '@/store/learningStoreBFS';
import { DEFAULTS } from '@/config/defaults';
import { useUIStore } from '@/store/uiStore';
import { runAgentCycle, applyMoveAction } from '@/lib/agent/loop';
import { maybeReplan } from '@/lib/planning/replan';
import { buildPlan, EMPTY_PLAN, planRemainingPath, buildExplorationPlan, buildMovePlan } from '@/lib/planning/strips';
import { getCell, setCell } from '@/lib/environment/grid';
import { tickDynamism } from '@/lib/environment/dynamism';
import { evaluateActions } from '@/lib/utility/utility';
import { extractState, selectAction } from '@/lib/learning/qlearning';
import type { Direction, AgentState } from '@/types/world';
import type { Plan, PlanInput } from '@/lib/planning/strips';
import type { KnownCellRecord } from '@/lib/agent/memory';

const STEP_INTERVAL_MS = 450;

function dirBetween(from: { x: number; y: number }, to: { x: number; y: number }): Direction | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx === 1  && dy === 0) return 'E';
  if (dx === -1 && dy === 0) return 'W';
  if (dx === 0  && dy === 1) return 'S';
  if (dx === 0  && dy === -1) return 'N';
  return null;
}

function computeReward(deltaRescued: number, deltaExplored: number, deltaSteps: number): number {
  return (
    deltaRescued * DEFAULTS.rewardWeights.victim +
    deltaExplored * DEFAULTS.rewardWeights.explore +
    deltaSteps * DEFAULTS.rewardWeights.step
  );
}

/**
 * Fábrica que crea un PlanController ligado a instancias específicas de stores.
 * Permite correr dos agentes independientes (BFS y A*) en paralelo.
 */
function makePlanController(
  worldHook: typeof useWorldStore,
  agentHook: typeof useAgentStore,
  learningHook: typeof useLearningStore,
  algorithm: 'bfs' | 'astar',
) {
  /**
   * Cierra el episodio actual con Q-update y reinicia automáticamente el mundo.
   * Preserva el conocimiento acumulado del agente (conservar conocimiento).
   */
  function endAndRestartEpisode(
    agentState: AgentState,
    survived: boolean,
    freshKBFacts: string[],
    freshKnownCells: KnownCellRecord,
    gridSize: number,
  ) {
    const { lastState, lastAction, updateQStep, nextEpisode: recordEpisode } = learningHook.getState();
    const { agentStart, initialGrid } = worldHook.getState();
    const { setPlan, setKB, setLoopPhase, reset: resetAgent } = agentHook.getState();
    const { setGrid, updateAgentState, setPlan: setWorldPlan } = worldHook.getState();

    // Q-update final del episodio
    if (lastState && lastAction) {
      const finalState = extractState({ kbFacts: freshKBFacts, energy: agentState.energy, knownCells: freshKnownCells, gridSize });
      const deathBonus = survived ? 0 : DEFAULTS.rewardWeights.death;
      updateQStep(deathBonus, finalState);
    }

    recordEpisode(agentState.rescued, agentState.steps, survived);

    // Reset del mundo — el agente vuelve al inicio con energía y HP completos
    setGrid(initialGrid);
    updateAgentState({
      pos: agentStart,
      energy: DEFAULTS.initialEnergy,
      hp: DEFAULTS.initialHP,
      steps: 0,
      rescued: 0,
      alive: true,
    });
    setWorldPlan([]);

    // Conservar beliefs; sincronizar knownCells con el grid reiniciado
    const currentBeliefs = agentHook.getState().beliefs;
    const currentKnown   = agentHook.getState().knownCells;

    // Actualiza cada celda conocida con su tipo real en initialGrid (corrige datos obsoletos)
    const syncedKnown: KnownCellRecord = {};
    for (const [key, known] of Object.entries(currentKnown)) {
      const [x, y] = key.split(',').map(Number) as [number, number];
      const actualCell = initialGrid[y]?.[x];
      syncedKnown[key] = { cell: actualCell ?? known.cell, lastSeenStep: known.lastSeenStep };
    }

    // Reconstruir hechos VictimAt desde víctimas visibles en memoria
    const newKBFacts = Object.entries(syncedKnown)
      .filter(([, k]) => k.cell.type === 'victim')
      .map(([key]) => `VictimAt(${key})`);

    resetAgent();
    agentHook.setState({ knownCells: syncedKnown, beliefs: currentBeliefs });
    setKB(newKBFacts, newKBFacts);
    setPlan({ ...EMPTY_PLAN, status: 'executing' });
    setLoopPhase('idle');
  }

  function decideNextPlan(planInput: PlanInput, agentEnergy: number): Plan | null {
    const { agentPos, kbFacts, knownCells, beliefs, gridSize } = planInput;
    const { qTable, epsilon, lastState, lastAction, lastKnownCount, lastRescued, lastSteps, setLastTransition, updateQStep } =
      learningHook.getState();
    const { agentState } = worldHook.getState();

    const currentKnown   = Object.keys(knownCells).length;
    const currentRescued = agentState.rescued;
    const currentSteps   = agentState.steps;

    if (lastState && lastAction) {
      const nextState = extractState({ kbFacts, energy: agentEnergy, knownCells, gridSize });
      const reward = computeReward(
        currentRescued - lastRescued,
        currentKnown   - lastKnownCount,
        currentSteps   - lastSteps,
      );
      updateQStep(reward, nextState);
    }

    const evals = evaluateActions({ agentPos, agentEnergy, kbFacts, knownCells, beliefs, gridSize });

    // Sin acciones disponibles — episodio sin más posibilidades
    if (evals.length === 0) return null;

    const { setActionUtilities, setLoopPhase } = agentHook.getState();
    setActionUtilities(evals);
    setLoopPhase('deciding');

    const qState = extractState({ kbFacts, energy: agentEnergy, knownCells, gridSize });
    const chosen  = selectAction(qTable, qState, evals, epsilon);

    let plan: Plan | null = null;
    if (chosen?.type === 'rescue') {
      plan = buildPlan({ ...planInput, algorithm });
    } else if (chosen?.type === 'recharge') {
      plan = buildMovePlan(chosen.goal, { ...planInput, algorithm });
    } else {
      plan = buildExplorationPlan({ ...planInput, algorithm });
    }

    if (!plan) plan = buildPlan({ ...planInput, algorithm }) ?? buildExplorationPlan({ ...planInput, algorithm });

    const actionType = chosen?.type ?? 'explore';
    setLastTransition(qState, actionType, currentKnown, currentRescued, currentSteps);

    return plan;
  }

  function executePlanStep() {
    const { grid, agentState, setAgentLastDir, updateAgentState, setPlan: setWorldPlan, setGrid } =
      worldHook.getState();
    const { knownCells, kbFacts, beliefs, plan, updateMemory, addSensorReading, setKB, setBeliefs, setLoopPhase, setPlan } =
      agentHook.getState();

    if (!agentState.alive) return;
    if (plan.status !== 'executing') return;

    // Límite de pasos — reinicio automático del episodio
    if (agentState.steps >= DEFAULTS.maxStepsPerEpisode) {
      const freshKnown = knownCells;
      const freshFacts = kbFacts;
      endAndRestartEpisode(agentState, true, freshFacts, freshKnown, grid.length);
      return;
    }

    if (
      DEFAULTS.dynamism.enabled &&
      agentState.steps > 0 &&
      agentState.steps % DEFAULTS.dynamism.tickEveryNSteps === 0
    ) {
      const dynGrid = tickDynamism(grid, DEFAULTS.dynamism);
      if (dynGrid !== grid) setGrid(dynGrid);
    }

    setLoopPhase('perceiving');
    const result = runAgentCycle(grid, agentState, knownCells, kbFacts, DEFAULTS, beliefs);
    updateMemory(result.perceived, agentState.steps);
    addSensorReading(result.sensorReading);
    setLoopPhase('updating_beliefs');
    setBeliefs(result.updatedBeliefs);

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
      algorithm,
    });

    setKB(freshKBFacts, result.kbNewFacts);

    const basePlanInput: PlanInput = {
      agentPos: agentState.pos,
      kbFacts: freshKBFacts,
      knownCells: freshKnownCells,
      beliefs: result.updatedBeliefs,
      gridSize: grid.length,
      previousReplans: validPlan.replansCount,
      algorithm,
    };

    if (validPlan.status === 'failed') {
      const recovery = decideNextPlan(basePlanInput, agentState.energy);
      if (!recovery) {
        endAndRestartEpisode(agentState, true, freshKBFacts, freshKnownCells, grid.length);
        return;
      }
      setPlan(recovery);
      setWorldPlan(planRemainingPath(recovery));
      setLoopPhase('idle');
      return;
    }

    const step = validPlan.steps[validPlan.currentIdx];
    if (!step) {
      const nextPlan = decideNextPlan(basePlanInput, agentState.energy);
      if (!nextPlan) {
        // Sin acciones posibles — reiniciar episodio automáticamente
        endAndRestartEpisode(agentState, true, freshKBFacts, freshKnownCells, grid.length);
        return;
      }
      setPlan(nextPlan);
      setWorldPlan(planRemainingPath(nextPlan));
      setLoopPhase('idle');
      return;
    }

    setLoopPhase('acting');

    if (step.kind === 'MOVE') {
      const dir = dirBetween(agentState.pos, step.to);
      if (dir) {
        const newState = applyMoveAction(grid, agentState, dir);
        if (newState) {
          setAgentLastDir(dir);
          updateAgentState(newState);

          if (!newState.alive) {
            // Agente muerto — reiniciar episodio
            endAndRestartEpisode(
              { ...agentState, steps: agentState.steps + 1, rescued: agentState.rescued },
              false,
              freshKBFacts,
              freshKnownCells,
              grid.length,
            );
            return;
          }
        } else {
          // Camino bloqueado (obstáculo descubierto) — replanificar
          const replan = buildPlan({ ...basePlanInput, previousReplans: validPlan.replansCount + 1 })
            ?? buildExplorationPlan({ ...basePlanInput, previousReplans: validPlan.replansCount + 1 });
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
      const { x, y } = step.to;
      const targetCell = getCell(grid, { x, y });

      if (targetCell?.type !== 'victim') {
        const factsWithout = freshKBFacts.filter((f) => f !== `VictimAt(${x},${y})`);
        setKB(factsWithout, []);
        const replan = buildPlan({ ...basePlanInput, kbFacts: factsWithout, previousReplans: validPlan.replansCount + 1 })
          ?? buildExplorationPlan({ ...basePlanInput, kbFacts: factsWithout, previousReplans: validPlan.replansCount + 1 });
        setPlan(replan ?? { ...EMPTY_PLAN, status: 'executing' });
        setWorldPlan(replan ? planRemainingPath(replan) : []);
        setLoopPhase('idle');
        return;
      }

      const updatedGrid = setCell(grid, { x, y }, { type: 'empty' });
      setGrid(updatedGrid);
      const factsAfterRescue = freshKBFacts.filter((f) => f !== `VictimAt(${x},${y})`);
      setKB(factsAfterRescue, []);
      updateAgentState({ rescued: agentState.rescued + 1 });

      const nextPlan = decideNextPlan(
        { ...basePlanInput, kbFacts: factsAfterRescue },
        agentState.energy,
      );
      if (!nextPlan) {
        endAndRestartEpisode(
          { ...agentState, rescued: agentState.rescued + 1 },
          true,
          factsAfterRescue,
          freshKnownCells,
          grid.length,
        );
        return;
      }
      setPlan(nextPlan);
      setWorldPlan(planRemainingPath(nextPlan));
    }

    setLoopPhase('idle');
  }

  return function PlanControllerInstance() {
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const { plan } = agentHook();
    const { agentState } = worldHook();
    const { stepMode, stepRequest } = useUIStore();

    // Intervalo de auto-ejecución — desactivado en modo paso a paso
    const shouldRun = agentState.alive && plan.status === 'executing' && !stepMode;

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

    // Trigger de paso manual — dispara exactamente un tick por incremento
    const prevStepRef = useRef(stepRequest);
    useEffect(() => {
      if (stepRequest !== prevStepRef.current) {
        prevStepRef.current = stepRequest;
        executePlanStep();
      }
    }, [stepRequest]);

    return null;
  };
}

/** Controlador del agente A* (usa A* para rescate/recarga, BFS para exploración) */
export const PlanController = makePlanController(useWorldStore, useAgentStore, useLearningStore, 'astar');

/** Controlador del agente BFS (usa BFS para todo — no informado) */
export const PlanControllerBFS = makePlanController(useWorldStoreBFS, useAgentStoreBFS, useLearningStoreBFS, 'bfs');
