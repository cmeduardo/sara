/* Motor de encadenamiento hacia adelante + conversión de percepciones a hechos KB */

import type { Position } from '@/types/world';
import type { PerceivedCell } from '@/types/agent';
import { predicateKey, parsePredicateKey, type Predicate } from './predicates';
import { kbTell, kbAsk } from './kb';

/** Devuelve los vecinos ortogonales (N/S/E/W) dentro de los límites de la cuadrícula */
function orthogonalNeighbors(x: number, y: number, size: number): Position[] {
  return (
    [
      { x, y: y - 1 },
      { x, y: y + 1 },
      { x: x - 1, y },
      { x: x + 1, y },
    ] as Position[]
  ).filter((p) => p.x >= 0 && p.y >= 0 && p.x < size && p.y < size);
}

/**
 * Motor de encadenamiento hacia adelante hasta punto fijo.
 * Modifica `kb` en el lugar. Devuelve los hechos recién inferidos.
 *
 * Reglas:
 *   R1 — Visited(x,y) ∧ ¬BreezeAt(x,y) → Safe para todos los vecinos ortogonales
 *   R2 — BreezeAt(x,y) → MaybeDanger para vecinos que no sean Safe ni ConfirmedDanger
 *   R3 — BreezeAt(x,y) ∧ exactamente un vecino inseguro → ConfirmedDanger para ese vecino
 */
function forwardChain(kb: Set<string>, gridSize: number): string[] {
  const inferred: string[] = [];

  function add(p: Predicate): boolean {
    if (!kbTell(kb, p)) return false;
    inferred.push(predicateKey(p));
    return true;
  }

  function has(p: Predicate): boolean {
    return kbAsk(kb, p);
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const key of Array.from(kb)) {
      const pred = parsePredicateKey(key);
      if (!pred) continue;

      // R1: celda visitada sin brisa → vecinos seguros
      if (pred.kind === 'Visited' && !has({ kind: 'BreezeAt', x: pred.x, y: pred.y })) {
        for (const nb of orthogonalNeighbors(pred.x, pred.y, gridSize)) {
          if (add({ kind: 'Safe', x: nb.x, y: nb.y })) changed = true;
        }
      }

      // R2 y R3: brisa → inferir candidatos a peligro
      if (pred.kind === 'BreezeAt') {
        const nbs = orthogonalNeighbors(pred.x, pred.y, gridSize);
        const unsafe = nbs.filter(
          (nb) =>
            !has({ kind: 'Safe', x: nb.x, y: nb.y }) &&
            !has({ kind: 'ConfirmedDanger', x: nb.x, y: nb.y })
        );

        // R2: todos los candidatos son MaybeDanger
        for (const nb of unsafe) {
          if (add({ kind: 'MaybeDanger', x: nb.x, y: nb.y })) changed = true;
        }

        // R3: único candidato → peligro confirmado por eliminación
        if (unsafe.length === 1 && unsafe[0]) {
          if (add({ kind: 'ConfirmedDanger', x: unsafe[0].x, y: unsafe[0].y })) changed = true;
        }
      }
    }
  }

  return inferred;
}

/**
 * Actualiza la KB con las percepciones del turno actual y corre inferencia.
 * Devuelve la KB actualizada y los hechos nuevos de este turno.
 */
export function updateKBFromPerception(
  kbFacts: string[],
  perceived: PerceivedCell[],
  agentPos: Position,
  breezeDetected: boolean,
  gridSize: number,
): { facts: string[]; newFacts: string[] } {
  const kb = new Set(kbFacts);
  const newFacts: string[] = [];

  function addDirect(p: Predicate): void {
    if (kbTell(kb, p)) newFacts.push(predicateKey(p));
  }

  // Hechos directos desde percepciones del turno
  for (const { pos, cell } of perceived) {
    addDirect({ kind: 'Visited', x: pos.x, y: pos.y });
    switch (cell.type) {
      case 'empty':
      case 'station':
        addDirect({ kind: 'Safe', x: pos.x, y: pos.y });
        break;
      case 'victim':
        addDirect({ kind: 'VictimAt', x: pos.x, y: pos.y });
        addDirect({ kind: 'Safe', x: pos.x, y: pos.y });
        break;
      case 'danger':
        addDirect({ kind: 'ConfirmedDanger', x: pos.x, y: pos.y });
        break;
      case 'obstacle':
        // los obstáculos no tienen predicado propio en esta KB
        break;
    }
  }

  // Posición física del agente → Visited
  addDirect({ kind: 'Visited', x: agentPos.x, y: agentPos.y });

  // Lectura del sensor de brisa
  if (breezeDetected) {
    addDirect({ kind: 'BreezeAt', x: agentPos.x, y: agentPos.y });
  }

  // Inferencia hasta punto fijo
  const inferred = forwardChain(kb, gridSize);
  newFacts.push(...inferred);

  return { facts: Array.from(kb), newFacts };
}
