/* Ejecuta BFS y A* sobre el mismo problema y devuelve métricas lado a lado */

import type { SearchProblem, SearchResult } from './types';
import { bfs } from './bfs';
import { astar } from './astar';

export interface CompareResult {
  bfs: SearchResult;
  astar: SearchResult;
}

export function compareSearches(problem: SearchProblem): CompareResult {
  return {
    bfs: bfs(problem),
    astar: astar(problem),
  };
}
