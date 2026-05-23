/* Predicados lógicos del agente — base del sistema de conocimiento */

export type PredicateKind =
  | 'Safe'
  | 'Visited'
  | 'VictimAt'
  | 'MaybeDanger'
  | 'BreezeAt'
  | 'ConfirmedDanger';

export interface Predicate {
  kind: PredicateKind;
  x: number;
  y: number;
}

export const PREDICATE_KINDS: PredicateKind[] = [
  'Safe', 'Visited', 'VictimAt', 'MaybeDanger', 'BreezeAt', 'ConfirmedDanger',
];

const VALID_KINDS = new Set<string>(PREDICATE_KINDS);

/** Serializa un predicado como clave de texto, ej. "Safe(3,4)" */
export function predicateKey(p: Predicate): string {
  return `${p.kind}(${p.x},${p.y})`;
}

/** Parsea una clave de texto de vuelta a Predicate; null si el formato es inválido */
export function parsePredicateKey(key: string): Predicate | null {
  const m = /^(\w+)\((-?\d+),(-?\d+)\)$/.exec(key);
  if (!m || !m[1] || !m[2] || !m[3]) return null;
  if (!VALID_KINDS.has(m[1])) return null;
  return {
    kind: m[1] as PredicateKind,
    x: parseInt(m[2], 10),
    y: parseInt(m[3], 10),
  };
}
