/* Validación del plan y lógica de replanificación */

import type { KnownCellRecord } from '@/lib/agent/memory';
import type { Plan, PlanInput } from './strips';
import { buildPlan, buildExplorationPlan, EMPTY_PLAN } from './strips';

/**
 * Verifica si el próximo paso MOVE sigue siendo válido:
 * - La celda destino no es un obstáculo conocido
 * - La celda destino no es un ConfirmedDanger en la KB
 */
export function isNextStepValid(
  plan: Plan,
  knownCells: KnownCellRecord,
  kbFacts: string[],
): boolean {
  if (plan.status !== 'executing') return false;
  const step = plan.steps[plan.currentIdx];
  if (!step || step.kind !== 'MOVE') return true;

  const { x, y } = step.to;
  const known = knownCells[`${x},${y}`];
  if (known?.cell.type === 'obstacle') return false;
  if (kbFacts.includes(`ConfirmedDanger(${x},${y})`)) return false;
  return true;
}

/**
 * Comprueba la validez del plan y replana si es necesario.
 * Devuelve el plan (posiblemente nuevo) listo para ejecutar.
 */
export function maybeReplan(plan: Plan, input: PlanInput): Plan {
  if (isNextStepValid(plan, input.knownCells, input.kbFacts)) return plan;

  const replansCount = plan.replansCount + 1;
  const newPlan = buildPlan({ ...input, previousReplans: replansCount })
    ?? buildExplorationPlan({ ...input, previousReplans: replansCount });

  // Si no se encontró alternativa, mantener executing con pasos vacíos
  // para seguir percibiendo cambios dinámicos en vez de detenerse
  return newPlan ?? {
    ...EMPTY_PLAN,
    status: 'executing',
    replansCount,
  };
}
