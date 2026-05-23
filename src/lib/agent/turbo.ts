/* Simulación headless de un episodio completo — sin React ni Zustand */

import type { Grid, AgentState, Position, Direction } from '@/types/world';
import type { KnownCellRecord } from '@/lib/agent/memory';
import type { Plan, PlanInput } from '@/lib/planning/strips';
import type { QTable, QAction } from '@/lib/learning/qlearning';
import { runAgentCycle, applyMoveAction } from '@/lib/agent/loop';
import { maybeReplan } from '@/lib/planning/replan';
import { buildPlan, EMPTY_PLAN, buildExplorationPlan, buildMovePlan } from '@/lib/planning/strips';
import { getCell, setCell } from '@/lib/environment/grid';
import { tickDynamism } from '@/lib/environment/dynamism';
import { evaluateActions } from '@/lib/utility/utility';
import { extractState, selectAction, updateQ } from '@/lib/learning/qlearning';
import { DEFAULTS } from '@/config/defaults';

export interface TurboEpisodeInput {
  initialGrid: Grid;
  agentStart: Position;
  qTable: QTable;
  epsilon: number;
  alpha: number;
}

export interface TurboEpisodeResult {
  rescued: number;
  steps: number;
  survived: boolean;
  qTable: QTable;
}

function dirBetween(from: Position, to: Position): Direction | null {
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
    deltaSteps   * DEFAULTS.rewardWeights.step
  );
}

/**
 * Ejecuta un episodio completo de forma síncrona sin actualizar stores de React.
 * Cada episodio empieza con conocimiento vacío; solo la Q-table se hereda.
 * Devuelve la Q-table actualizada y las métricas del episodio.
 */
export function runTurboEpisode(input: TurboEpisodeInput): TurboEpisodeResult {
  let grid = input.initialGrid;
  let { qTable, alpha } = input;
  const gamma = DEFAULTS.qLearning.gamma;

  let agentState: AgentState = {
    pos: input.agentStart,
    hp:      DEFAULTS.initialHP,
    energy:  DEFAULTS.initialEnergy,
    steps:   0,
    rescued: 0,
    alive:   true,
  };

  let knownCells: KnownCellRecord = {};
  let kbFacts: string[] = [];
  let beliefs: Record<string, number> = {};
  let plan: Plan = { ...EMPTY_PLAN, status: 'executing' };

  let lastQState:     string | null = null;
  let lastQAction:    QAction | null = null;
  let lastKnownCount = 0;
  let lastRescued    = 0;
  let lastSteps      = 0;

  for (let tick = 0; tick < DEFAULTS.maxStepsPerEpisode; tick++) {
    if (!agentState.alive || plan.status !== 'executing') break;

    // Dinamismo del entorno
    if (DEFAULTS.dynamism.enabled && agentState.steps > 0 && agentState.steps % DEFAULTS.dynamism.tickEveryNSteps === 0) {
      const next = tickDynamism(grid, DEFAULTS.dynamism);
      if (next !== grid) grid = next;
    }

    // Ciclo cognitivo
    const result = runAgentCycle(grid, agentState, knownCells, kbFacts, DEFAULTS, beliefs);
    const updatedKnown = { ...knownCells };
    for (const { pos, cell } of result.perceived) {
      updatedKnown[`${pos.x},${pos.y}`] = { cell: { ...cell }, lastSeenStep: agentState.steps };
    }
    knownCells = updatedKnown;
    beliefs    = result.updatedBeliefs;
    kbFacts    = result.kbFacts;

    // Validar plan
    const validPlan = maybeReplan(plan, {
      agentPos: agentState.pos,
      kbFacts,
      knownCells,
      beliefs,
      gridSize: grid.length,
    });

    const planInput: PlanInput = {
      agentPos:       agentState.pos,
      kbFacts,
      knownCells,
      beliefs,
      gridSize:       grid.length,
      previousReplans: validPlan.replansCount,
    };

    // ── Punto de decisión (plan exhausto o fallido) ──────────────────────────
    if (validPlan.status === 'failed' || !validPlan.steps[validPlan.currentIdx]) {
      const knownCount = Object.keys(knownCells).length;
      const qState = extractState({ kbFacts, energy: agentState.energy, knownCells, gridSize: grid.length });

      if (lastQState && lastQAction) {
        const reward = computeReward(
          agentState.rescued - lastRescued,
          knownCount         - lastKnownCount,
          agentState.steps   - lastSteps,
        );
        qTable = updateQ(qTable, lastQState, lastQAction, reward, qState, alpha, gamma);
      }

      const evals = evaluateActions({
        agentPos: agentState.pos, agentEnergy: agentState.energy,
        kbFacts, knownCells, beliefs, gridSize: grid.length,
      });
      const chosen = selectAction(qTable, qState, evals, input.epsilon);

      let nextPlan: Plan | null = null;
      if (chosen?.type === 'rescue')   nextPlan = buildPlan(planInput);
      else if (chosen?.type === 'recharge') nextPlan = buildMovePlan(chosen.goal, planInput);
      else                             nextPlan = buildExplorationPlan(planInput);
      if (!nextPlan) nextPlan = buildPlan(planInput) ?? buildExplorationPlan(planInput);

      plan         = nextPlan ?? { ...EMPTY_PLAN, status: 'executing' };
      lastQState   = qState;
      lastQAction  = chosen?.type ?? 'explore';
      lastKnownCount = knownCount;
      lastRescued  = agentState.rescued;
      lastSteps    = agentState.steps;
      continue;
    }

    const step = validPlan.steps[validPlan.currentIdx]!;

    if (step.kind === 'MOVE') {
      // ── Movimiento ──────────────────────────────────────────────────────────
      const dir = dirBetween(agentState.pos, step.to);
      if (dir) {
        const newState = applyMoveAction(grid, agentState, dir);
        if (newState) {
          agentState = { ...agentState, ...newState };
          if (!agentState.alive) {
            // Penalización por muerte
            if (lastQState && lastQAction) {
              const deadQ = extractState({ kbFacts, energy: 0, knownCells, gridSize: grid.length });
              const reward = computeReward(
                agentState.rescued - lastRescued,
                Object.keys(knownCells).length - lastKnownCount,
                agentState.steps - lastSteps,
              ) + DEFAULTS.rewardWeights.death;
              qTable = updateQ(qTable, lastQState, lastQAction, reward, deadQ, alpha, gamma);
            }
            break;
          }
        } else {
          // Obstáculo descubierto — replanificar
          const replan = buildPlan({ ...planInput, previousReplans: validPlan.replansCount + 1 })
            ?? buildExplorationPlan({ ...planInput, previousReplans: validPlan.replansCount + 1 });
          plan = replan ?? { ...EMPTY_PLAN, status: 'executing' };
          continue;
        }
      }
      plan = { ...validPlan, currentIdx: validPlan.currentIdx + 1 };

    } else {
      // ── Rescate ─────────────────────────────────────────────────────────────
      const { x, y } = step.to;
      const targetCell = getCell(grid, { x, y });

      if (targetCell?.type !== 'victim') {
        kbFacts = kbFacts.filter((f) => f !== `VictimAt(${x},${y})`);
        const replan = buildPlan({ ...planInput, kbFacts, previousReplans: validPlan.replansCount + 1 })
          ?? buildExplorationPlan({ ...planInput, kbFacts, previousReplans: validPlan.replansCount + 1 });
        plan = replan ?? { ...EMPTY_PLAN, status: 'executing' };
        continue;
      }

      grid    = setCell(grid, { x, y }, { type: 'empty' });
      kbFacts = kbFacts.filter((f) => f !== `VictimAt(${x},${y})`);
      agentState = { ...agentState, rescued: agentState.rescued + 1 };

      // Q-update post-rescate + nueva decisión
      const knownCount = Object.keys(knownCells).length;
      const qState = extractState({ kbFacts, energy: agentState.energy, knownCells, gridSize: grid.length });

      if (lastQState && lastQAction) {
        const reward = computeReward(
          agentState.rescued - lastRescued,
          knownCount - lastKnownCount,
          agentState.steps - lastSteps,
        );
        qTable = updateQ(qTable, lastQState, lastQAction, reward, qState, alpha, gamma);
      }

      const pi: PlanInput = { ...planInput, kbFacts };
      const evals = evaluateActions({
        agentPos: agentState.pos, agentEnergy: agentState.energy,
        kbFacts, knownCells, beliefs, gridSize: grid.length,
      });
      const chosen = selectAction(qTable, qState, evals, input.epsilon);
      let nextPlan: Plan | null = null;
      if (chosen?.type === 'rescue')        nextPlan = buildPlan(pi);
      else if (chosen?.type === 'recharge') nextPlan = buildMovePlan(chosen.goal, pi);
      else                                  nextPlan = buildExplorationPlan(pi);
      if (!nextPlan) nextPlan = buildPlan(pi) ?? buildExplorationPlan(pi);
      plan = nextPlan ?? { ...EMPTY_PLAN, status: 'executing' };

      lastQState     = qState;
      lastQAction    = chosen?.type ?? 'explore';
      lastKnownCount = knownCount;
      lastRescued    = agentState.rescued;
      lastSteps      = agentState.steps;
    }
  }

  return {
    rescued:  agentState.rescued,
    steps:    agentState.steps,
    survived: agentState.alive,
    qTable,
  };
}
