/* Operaciones primitivas sobre la Base de Conocimiento */

import { predicateKey, type Predicate } from './predicates';

/** Tell: inserta un hecho en la KB mutable; devuelve true si era nuevo */
export function kbTell(kb: Set<string>, pred: Predicate): boolean {
  const key = predicateKey(pred);
  if (kb.has(key)) return false;
  kb.add(key);
  return true;
}

/** Ask: consulta si un hecho existe en la KB */
export function kbAsk(kb: ReadonlySet<string>, pred: Predicate): boolean {
  return kb.has(predicateKey(pred));
}

/** Retract: elimina un hecho de la KB mutable; devuelve true si existía */
export function kbRetract(kb: Set<string>, pred: Predicate): boolean {
  return kb.delete(predicateKey(pred));
}
