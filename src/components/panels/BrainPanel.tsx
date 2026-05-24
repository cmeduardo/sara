'use client';

/* Panel cognitivo: estado interno del agente — memoria, sensores, KB y plan */

import { useState, useRef, useCallback } from 'react';
import { useAgentStore } from '@/store/agentStore';
import { useWorldStore } from '@/store/worldStore';
import { useWorldStoreBFS } from '@/store/worldStoreBFS';
import { useAgentStoreBFS } from '@/store/agentStoreBFS';
import { useLearningStoreBFS } from '@/store/learningStoreBFS';
import { DEFAULTS } from '@/config/defaults';
import { recentKnownCells, memorySummary } from '@/lib/agent/memory';
import { parsePredicateKey, PREDICATE_KINDS, type PredicateKind } from '@/lib/knowledge/predicates';
import { EMPTY_PLAN, knownVictimPositions } from '@/lib/planning/strips';
import { useUIStore } from '@/store/uiStore';
import { useLearningStore } from '@/store/learningStore';
import { extractState, getQValues } from '@/lib/learning/qlearning';
import { runTurboEpisode } from '@/lib/agent/turbo';
import type { ActionEvaluation } from '@/types/agent';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

function CellTypeBadge({ type }: { type: string }) {
  const colorMap: Record<string, string> = {
    empty:    'text-blueprint-text-dim',
    obstacle: 'text-blueprint-text-muted',
    victim:   'text-blueprint-victim',
    danger:   'text-blueprint-accent-danger',
    station:  'text-blueprint-station',
  };
  return (
    <span className={`font-mono text-xs ${colorMap[type] ?? 'text-blueprint-text'}`}>
      {type}
    </span>
  );
}

/** Color de acento por tipo de predicado */
const KIND_COLOR: Record<PredicateKind, string> = {
  Safe:            'text-blueprint-accent-success',
  Visited:         'text-blueprint-text-dim',
  VictimAt:        'text-blueprint-victim',
  MaybeDanger:     'text-blueprint-accent-warning',
  BreezeAt:        'text-blueprint-accent-info',
  ConfirmedDanger: 'text-blueprint-accent-danger',
};

export function BrainPanel({ mode = 'astar' }: { mode?: 'astar' | 'bfs' }) {
  // Siempre llamar todos los hooks (regla de React), luego seleccionar por modo
  const agentA = useAgentStore();
  const worldA = useWorldStore();
  const learnA = useLearningStore();
  const agentB = useAgentStoreBFS();
  const worldB = useWorldStoreBFS();
  const learnB = useLearningStoreBFS();

  const isBFS = mode === 'bfs';
  const { knownCells, beliefs, lastPerceived, sensorReadings, loopPhase, kbFacts, kbNewFacts, plan, setPlan, actionUtilities } =
    isBFS ? agentB : agentA;
  const { agentState, agentStart, initialGrid, gridSize, setPlan: setWorldPlan, updateAgentState, setGrid } =
    isBFS ? worldB : worldA;
  const {
    qTable, epsilon, alpha, episode, episodeHistory, nextEpisode,
    isRunningTurbo, turboProgress, setTurboState, applyTurboResults,
  } = isBFS ? learnB : learnA;
  const { showPlan, togglePlan, stepMode, setStepMode, incrementStep, simSpeed, setSimSpeed } = useUIStore();

  const [kbFilter, setKbFilter] = useState<PredicateKind | null>(null);
  const turboAbortRef = useRef(false);

  // ── Coordinador turbo: corre N episodios en lotes de 10 con yields ────────
  const handleRunTurbo = useCallback(async (totalEps: number) => {
    const { initialGrid, agentStart } = useWorldStore.getState();
    turboAbortRef.current = false;

    let { qTable: qt, epsilon: eps, alpha: alp } = useLearningStore.getState();
    const batchSize = 10;
    const results: Array<{ rescued: number; steps: number; survived: boolean }> = [];

    setTurboState(true, { current: 0, total: totalEps });

    for (let i = 0; i < totalEps; i += batchSize) {
      if (turboAbortRef.current) break;
      const batchEnd = Math.min(i + batchSize, totalEps);

      for (let j = i; j < batchEnd; j++) {
        const res = runTurboEpisode({ initialGrid, agentStart, qTable: qt, epsilon: eps, alpha: alp });
        qt  = res.qTable;
        eps = Math.max(eps * DEFAULTS.qLearning.epsilonDecay, DEFAULTS.qLearning.minEpsilon);
        alp = Math.max(alp * DEFAULTS.qLearning.alphaDecay,   DEFAULTS.qLearning.minAlpha);
        results.push({ rescued: res.rescued, steps: res.steps, survived: res.survived });
      }

      setTurboState(true, { current: Math.min(batchEnd, totalEps), total: totalEps });
      // Yield al browser para que actualice la UI
      await new Promise<void>((r) => setTimeout(r, 0));
    }

    applyTurboResults(results, qt, eps, alp);
  }, [setTurboState, applyTurboResults]);

  const isRescueMission = plan.goalPos !== null
    && kbFacts.includes(`VictimAt(${plan.goalPos.x},${plan.goalPos.y})`);
  const planMode = actionUtilities[0]?.type ?? (isRescueMission ? 'rescue' : 'explore');

  // Q-learning: estado actual y Q-values
  const currentQState = extractState({ kbFacts, energy: agentState.energy, knownCells, gridSize });
  const currentQVals  = getQValues(qTable, currentQState);
  const qTableSize    = Object.keys(qTable).length;

  const recent = recentKnownCells(knownCells, agentState.steps, 15);
  const summary = memorySummary(knownCells);
  const lastSensor = sensorReadings[0];
  const newFactsSet = new Set(kbNewFacts);

  // Hechos filtrados por predicado seleccionado
  const visibleFacts = kbFilter
    ? kbFacts.filter((k) => k.startsWith(kbFilter + '('))
    : kbFacts;

  // Conteo de hechos por tipo para las etiquetas del filtro
  const kbCounts: Partial<Record<PredicateKind, number>> = {};
  for (const k of kbFacts) {
    const pred = parsePredicateKey(k);
    if (pred) kbCounts[pred.kind] = (kbCounts[pred.kind] ?? 0) + 1;
  }

  return (
    <div className="flex flex-col gap-2 text-xs font-mono overflow-y-auto min-h-0">

      {/* Fase del ciclo */}
      <section className="border border-blueprint-border bg-blueprint-bg-elevated p-2 rounded-sm">
        <p className="text-blueprint-text-dim uppercase tracking-widest text-[10px] mb-1">Fase</p>
        <p className="text-blueprint-accent-data">{loopPhase}</p>
      </section>

      {/* Estado del agente */}
      <section className={`border p-2 rounded-sm ${!agentState.alive ? 'border-blueprint-accent-danger bg-blueprint-accent-danger/10' : 'border-blueprint-border bg-blueprint-bg-elevated'}`}>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-blueprint-text-dim uppercase tracking-widest text-[10px]">Agente</p>
          {!agentState.alive && (
            <span className="text-blueprint-accent-danger text-[10px] font-mono uppercase tracking-widest">
              ✗ muerto
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
          <span className="text-blueprint-text-muted">Pos</span>
          <span className="text-blueprint-text">({agentState.pos.x},{agentState.pos.y})</span>
          <span className="text-blueprint-text-muted">HP</span>
          <span className="text-blueprint-accent-danger">{agentState.hp}</span>
          <span className="text-blueprint-text-muted">Energía</span>
          <span className="text-blueprint-accent-info">{agentState.energy}</span>
          <span className="text-blueprint-text-muted">Paso</span>
          <span className="text-blueprint-text">{agentState.steps}</span>
          <span className="text-blueprint-text-muted">Rescatados</span>
          <span className="text-blueprint-accent-success">{agentState.rescued}</span>
        </div>
      </section>

      {/* ── Planificación STRIPS ────────────────────────────────────────── */}
      <section className="border border-blueprint-border bg-blueprint-bg-elevated p-2 rounded-sm flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <p className="text-blueprint-text-dim uppercase tracking-widest text-[10px]">Plan STRIPS</p>
          {plan.replansCount > 0 && (
            <span className="text-blueprint-accent-warning text-[10px]">
              {plan.replansCount} replan{plan.replansCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Estado y métricas */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
          <span className="text-blueprint-text-muted">Estado</span>
          <span className={
            plan.status === 'executing' ? 'text-blueprint-accent-info' :
            plan.status === 'complete'  ? 'text-blueprint-accent-success' :
            plan.status === 'failed'    ? 'text-blueprint-accent-danger' :
                                          'text-blueprint-text-dim'
          }>
            {plan.status}
          </span>
          {plan.status === 'executing' && (
            <>
              <span className="text-blueprint-text-muted">Modo</span>
              <span className={
                planMode === 'rescue'   ? 'text-blueprint-victim' :
                planMode === 'recharge' ? 'text-blueprint-accent-success' :
                                          'text-blueprint-accent-info'
              }>
                {planMode === 'rescue' ? 'rescatar' : planMode === 'recharge' ? 'recargar' : 'explorar'}
                <span className="text-blueprint-text-dim ml-1 text-[9px]">
                  {planMode === 'explore' ? '(BFS)' : '(A*)'}
                </span>
              </span>
            </>
          )}
          {plan.goalPos && (
            <>
              <span className="text-blueprint-text-muted">Objetivo</span>
              <span className="text-blueprint-text">
                ({plan.goalPos.x},{plan.goalPos.y})
              </span>
            </>
          )}
          {plan.status === 'executing' && (
            <>
              <span className="text-blueprint-text-muted">Pasos rest.</span>
              <span className="text-blueprint-text">
                {plan.steps.length - plan.currentIdx}
              </span>
            </>
          )}
          <span className="text-blueprint-text-muted">Víctimas KB</span>
          <span className="text-blueprint-victim">
            {knownVictimPositions(kbFacts).length}
          </span>
        </div>

        {/* Botones de control — controlan ambos agentes */}
        <div className="flex gap-1.5 mt-0.5">
          <button
            onClick={() => {
              setStepMode(false);
              useAgentStore.getState().setPlan({ ...EMPTY_PLAN, status: 'executing' });
              useWorldStore.getState().setPlan([]);
              useAgentStoreBFS.getState().setPlan({ ...EMPTY_PLAN, status: 'executing' });
              useWorldStoreBFS.getState().setPlan([]);
              if (!showPlan) togglePlan();
            }}
            disabled={!stepMode && agentA.plan.status === 'executing' && agentB.plan.status === 'executing'}
            className="flex-1 text-[10px] font-mono px-2 py-1 border rounded-sm transition-colors
              border-blueprint-accent-info text-blueprint-accent-info
              hover:bg-blueprint-accent-info hover:text-blueprint-bg
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ▶ Iniciar
          </button>
          <button
            onClick={() => {
              useAgentStore.getState().setPlan(EMPTY_PLAN);
              useWorldStore.getState().setPlan([]);
              useAgentStoreBFS.getState().setPlan(EMPTY_PLAN);
              useWorldStoreBFS.getState().setPlan([]);
              setStepMode(false);
              if (showPlan) togglePlan();
            }}
            disabled={agentA.plan.status === 'idle' && agentB.plan.status === 'idle' && !stepMode}
            className="flex-1 text-[10px] font-mono px-2 py-1 border rounded-sm transition-colors
              border-blueprint-border text-blueprint-text-dim
              hover:border-blueprint-text-muted hover:text-blueprint-text
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ■ Detener
          </button>
          <button
            onClick={() => {
              // Activar modo paso a paso y asegurar planes en ejecución
              setStepMode(true);
              if (useAgentStore.getState().plan.status !== 'executing') {
                useAgentStore.getState().setPlan({ ...EMPTY_PLAN, status: 'executing' });
                useWorldStore.getState().setPlan([]);
              }
              if (useAgentStoreBFS.getState().plan.status !== 'executing') {
                useAgentStoreBFS.getState().setPlan({ ...EMPTY_PLAN, status: 'executing' });
                useWorldStoreBFS.getState().setPlan([]);
              }
              incrementStep();
            }}
            className={`flex-1 text-[10px] font-mono px-2 py-1 border rounded-sm transition-colors
              ${stepMode
                ? 'border-blueprint-accent-warning text-blueprint-accent-warning bg-blueprint-accent-warning/10'
                : 'border-blueprint-accent-warning text-blueprint-accent-warning hover:bg-blueprint-accent-warning/10'
              }`}
          >
            → Paso
          </button>
        </div>

        {/* Velocidad de simulación */}
        <div className="flex flex-col gap-1 pt-0.5">
          <div className="flex items-center justify-between">
            <span className="text-blueprint-text-dim uppercase tracking-widest text-[10px]">Velocidad</span>
            <span className="text-blueprint-accent-data font-mono text-[10px]">
              {simSpeed < 100
                ? `${Math.round(1000 / simSpeed)} pasos/s`
                : simSpeed <= 500
                ? `${(1000 / simSpeed).toFixed(1)} pasos/s`
                : `${simSpeed} ms/paso`}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-blueprint-text-muted text-[9px]">lento</span>
            <input
              type="range"
              min={50}
              max={1500}
              step={25}
              value={1550 - simSpeed}
              onChange={(e) => setSimSpeed(1550 - Number(e.target.value))}
              className="flex-1 h-1 appearance-none rounded-full cursor-pointer
                bg-blueprint-border accent-blueprint-accent-info"
            />
            <span className="text-blueprint-text-muted text-[9px]">rápido</span>
          </div>
        </div>

        {/* Reiniciar: restaura mapa y agente, conserva conocimiento */}
        <button
          onClick={() => {
            // ── A* ──────────────────────────────────────────────────────────
            const wA  = useWorldStore.getState();
            const agA = useAgentStore.getState();

            // Guardar conocimiento acumulado
            const knownA   = agA.knownCells;
            const beliefsA = agA.beliefs;

            // Sincronizar knownCells con initialGrid (restaura tipo real de cada celda)
            const syncedKnownA: typeof knownA = {};
            for (const [key, known] of Object.entries(knownA)) {
              const [x, y] = key.split(',').map(Number) as [number, number];
              const actualCell = wA.initialGrid[y]?.[x];
              syncedKnownA[key] = { cell: actualCell ?? known.cell, lastSeenStep: known.lastSeenStep };
            }
            const newKBFactsA = Object.entries(syncedKnownA)
              .filter(([, k]) => k.cell.type === 'victim')
              .map(([key]) => `VictimAt(${key})`);

            useLearningStore.getState().nextEpisode(wA.agentState.rescued, wA.agentState.steps, wA.agentState.alive);
            agA.reset();
            useAgentStore.setState({ knownCells: syncedKnownA, beliefs: beliefsA });
            useAgentStore.getState().setKB(newKBFactsA, newKBFactsA);
            useAgentStore.getState().setPlan({ ...EMPTY_PLAN, status: 'executing' });
            wA.setPlan([]);
            wA.setGrid(wA.initialGrid);
            wA.updateAgentState({ pos: wA.agentStart, energy: DEFAULTS.initialEnergy, hp: DEFAULTS.initialHP, steps: 0, rescued: 0, alive: true });

            // ── BFS ─────────────────────────────────────────────────────────
            const wB  = useWorldStoreBFS.getState();
            const agB = useAgentStoreBFS.getState();

            const knownB   = agB.knownCells;
            const beliefsB = agB.beliefs;

            const syncedKnownB: typeof knownB = {};
            for (const [key, known] of Object.entries(knownB)) {
              const [x, y] = key.split(',').map(Number) as [number, number];
              const actualCell = wB.initialGrid[y]?.[x];
              syncedKnownB[key] = { cell: actualCell ?? known.cell, lastSeenStep: known.lastSeenStep };
            }
            const newKBFactsB = Object.entries(syncedKnownB)
              .filter(([, k]) => k.cell.type === 'victim')
              .map(([key]) => `VictimAt(${key})`);

            useLearningStoreBFS.getState().nextEpisode(wB.agentState.rescued, wB.agentState.steps, wB.agentState.alive);
            agB.reset();
            useAgentStoreBFS.setState({ knownCells: syncedKnownB, beliefs: beliefsB });
            useAgentStoreBFS.getState().setKB(newKBFactsB, newKBFactsB);
            useAgentStoreBFS.getState().setPlan({ ...EMPTY_PLAN, status: 'executing' });
            wB.setPlan([]);
            wB.setGrid(wB.initialGrid);
            wB.updateAgentState({ pos: wB.agentStart, energy: DEFAULTS.initialEnergy, hp: DEFAULTS.initialHP, steps: 0, rescued: 0, alive: true });

            if (showPlan) togglePlan();
          }}
          className="w-full text-[10px] font-mono px-2 py-1 border rounded-sm transition-colors
            border-blueprint-accent-warning text-blueprint-accent-warning
            hover:bg-blueprint-accent-warning hover:text-blueprint-bg"
        >
          Reiniciar ambos (conservar conocimiento)
        </button>
      </section>

      {/* ── Utilidad de acciones (Fase 8) ───────────────────────────────── */}
      {actionUtilities.length > 0 && (
        <section className="border border-blueprint-border bg-blueprint-bg-elevated p-2 rounded-sm flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <p className="text-blueprint-text-dim uppercase tracking-widest text-[10px]">Utilidad</p>
            <span className="text-blueprint-text-dim text-[9px]">base − viaje − peligro</span>
          </div>
          {(['rescue', 'explore', 'recharge'] as const).map((actionType) => {
            const ev = actionUtilities.find((e) => e.type === actionType);
            const isTop = ev !== undefined && actionUtilities[0]?.type === actionType;
            const typeColor: Record<string, string> = {
              rescue:   'text-blueprint-victim',
              explore:  'text-blueprint-accent-info',
              recharge: 'text-blueprint-accent-success',
            };
            const algoLabel: Record<string, string> = isBFS
              ? { rescue: 'BFS', explore: 'BFS', recharge: 'BFS' }
              : { rescue: 'A*',  explore: 'A*',  recharge: 'A*'  };
            if (!ev) {
              return (
                <div key={actionType} className="flex items-center gap-1.5 opacity-30">
                  <span className={`${typeColor[actionType]} text-[10px] w-14 shrink-0`}>{actionType}</span>
                  <span className="text-blueprint-text-dim text-[9px] ml-1">{algoLabel[actionType]}</span>
                  <span className="ml-auto text-blueprint-text-dim text-[10px]">N/A</span>
                </div>
              );
            }
            const maxU = Math.max(...actionUtilities.map((e) => Math.abs(e.utility)), 1);
            const pct = Math.round(Math.abs(ev.utility) / maxU * 100);
            return (
              <div key={actionType} className={`flex flex-col gap-0.5 ${isTop ? '' : 'opacity-60'}`}>
                <div className="flex items-center gap-1.5">
                  {isTop && <span className="text-[8px] text-blueprint-accent-data">▶</span>}
                  <span className={`${typeColor[actionType]} text-[10px]`}>{actionType}</span>
                  <span className="text-blueprint-text-dim text-[9px] ml-0.5">{algoLabel[actionType]}</span>
                  <span className="text-blueprint-text-dim text-[10px] ml-1">
                    ({ev.goal.x},{ev.goal.y})
                  </span>
                  <span className={`ml-auto text-[10px] ${ev.utility >= 0 ? 'text-blueprint-accent-success' : 'text-blueprint-accent-danger'}`}>
                    {ev.utility >= 0 ? '+' : ''}{ev.utility.toFixed(1)}
                  </span>
                </div>
                <div className="h-0.5 bg-blueprint-border rounded-sm overflow-hidden">
                  <div className={`h-full ${ev.utility >= 0 ? 'bg-blueprint-accent-success' : 'bg-blueprint-accent-danger'}`}
                    style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* ── Q-Learning (Fase 9) ───────────────────────────────────────── */}
      <section className="border border-blueprint-border bg-blueprint-bg-elevated p-2 rounded-sm flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between">
          <p className="text-blueprint-text-dim uppercase tracking-widest text-[10px]">Q-Learning</p>
          <span className="text-blueprint-accent-data text-[10px]">ep {episode}</span>
        </div>

        {/* Parámetros actuales */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
          <span className="text-blueprint-text-muted">ε (explorar)</span>
          <span className="text-blueprint-accent-warning">{epsilon.toFixed(3)}</span>
          <span className="text-blueprint-text-muted">α (aprender)</span>
          <span className="text-blueprint-accent-info">{alpha.toFixed(3)}</span>
          <span className="text-blueprint-text-muted">Estado Q</span>
          <span className="text-blueprint-text font-mono text-[9px]">{currentQState}</span>
          <span className="text-blueprint-text-muted">Estados</span>
          <span className="text-blueprint-text">{qTableSize} / 18</span>
        </div>

        {/* Q-values del estado actual */}
        <div className="flex flex-col gap-0.5 mt-0.5">
          <p className="text-blueprint-text-dim text-[9px] uppercase tracking-widest">Q(s,·)</p>
          {(['rescue', 'explore', 'recharge'] as const).map((a) => {
            const qv = currentQVals[a];
            const typeColor: Record<string, string> = {
              rescue: 'text-blueprint-victim', explore: 'text-blueprint-accent-info', recharge: 'text-blueprint-accent-success',
            };
            const maxAbs = Math.max(Math.abs(currentQVals.rescue), Math.abs(currentQVals.explore), Math.abs(currentQVals.recharge), 1);
            const pct = Math.round(Math.abs(qv) / maxAbs * 100);
            return (
              <div key={a} className="flex items-center gap-1.5">
                <span className={`${typeColor[a]} text-[10px] w-14 shrink-0`}>{a}</span>
                <div className="flex-1 h-0.5 bg-blueprint-border rounded-sm overflow-hidden">
                  <div className={`h-full ${qv >= 0 ? 'bg-blueprint-accent-success' : 'bg-blueprint-accent-danger'}`}
                    style={{ width: `${pct}%` }} />
                </div>
                <span className={`text-[10px] w-12 text-right ${qv >= 0 ? 'text-blueprint-accent-success' : 'text-blueprint-accent-danger'}`}>
                  {qv >= 0 ? '+' : ''}{qv.toFixed(1)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Historial de episodios */}
        {episodeHistory.length > 0 && (
          <div className="flex flex-col gap-0.5 mt-0.5">
            <p className="text-blueprint-text-dim text-[9px] uppercase tracking-widest">Historial</p>
            <div className="flex flex-col gap-0.5 max-h-20 overflow-y-auto">
              {[...episodeHistory].reverse().slice(0, 10).map((rec) => (
                <div key={rec.episode} className="flex items-center gap-2 text-[10px]">
                  <span className="text-blueprint-text-dim w-6">#{rec.episode}</span>
                  <span className="text-blueprint-victim">{rec.rescued}✓</span>
                  <span className="text-blueprint-text-dim">{rec.steps}p</span>
                  <span className={`ml-auto ${rec.survived ? 'text-blueprint-accent-success' : 'text-blueprint-accent-danger'}`}>
                    {rec.survived ? 'vivo' : 'muerto'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Turbo training (Fase 10) — solo agente A* ────────────── */}
        {!isBFS && <div className="flex flex-col gap-1.5 mt-1 border-t border-blueprint-border pt-1.5">
          <p className="text-blueprint-text-dim text-[9px] uppercase tracking-widest">Entrenamiento Turbo</p>

          {isRunningTurbo ? (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-blueprint-accent-data">
                  {turboProgress?.current ?? 0} / {turboProgress?.total ?? 0} ep
                </span>
                <button
                  onClick={() => { turboAbortRef.current = true; }}
                  className="text-[10px] px-2 py-0.5 border border-blueprint-accent-danger text-blueprint-accent-danger rounded-sm hover:bg-blueprint-accent-danger hover:text-blueprint-bg"
                >
                  Detener
                </button>
              </div>
              <div className="h-1 bg-blueprint-border rounded-sm overflow-hidden">
                <div
                  className="h-full bg-blueprint-accent-data transition-all"
                  style={{ width: `${Math.round((turboProgress?.current ?? 0) / (turboProgress?.total ?? 1) * 100)}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex gap-1">
              {([50, 100, 500] as const).map((n) => (
                <button
                  key={n}
                  onClick={() => handleRunTurbo(n)}
                  disabled={!agentState.alive === false && plan.status === 'executing'}
                  className="flex-1 text-[10px] font-mono px-1.5 py-1 border rounded-sm transition-colors
                    border-blueprint-accent-data text-blueprint-accent-data
                    hover:bg-blueprint-accent-data hover:text-blueprint-bg
                    disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {n} ep
                </button>
              ))}
            </div>
          )}
        </div>}
      </section>

      {/* ── Gráficas de convergencia (Fase 10) ───────────────────────────── */}
      {episodeHistory.length > 1 && (
        <section className="border border-blueprint-border bg-blueprint-bg-elevated p-2 rounded-sm flex flex-col gap-2">
          <p className="text-blueprint-text-dim uppercase tracking-widest text-[10px]">Convergencia Q-Learning</p>

          {/* Víctimas rescatadas por episodio */}
          <div className="flex flex-col gap-0.5">
            <p className="text-blueprint-text-dim text-[9px]">Rescatados / episodio</p>
            <ResponsiveContainer width="100%" height={80}>
              <LineChart data={episodeHistory} margin={{ top: 2, right: 4, left: -28, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="var(--color-blueprint-border)" />
                <XAxis dataKey="episode" tick={{ fontSize: 8, fill: 'var(--color-blueprint-text-dim)' }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 8, fill: 'var(--color-blueprint-text-dim)' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--color-blueprint-bg-elevated)', border: '1px solid var(--color-blueprint-border)', fontSize: 10 }}
                  labelStyle={{ color: 'var(--color-blueprint-text-dim)' }}
                  itemStyle={{ color: 'var(--color-blueprint-victim)' }}
                />
                <Line type="monotone" dataKey="rescued" stroke="var(--color-blueprint-victim)" dot={false} strokeWidth={1.5} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Pasos por episodio */}
          <div className="flex flex-col gap-0.5">
            <p className="text-blueprint-text-dim text-[9px]">Pasos / episodio</p>
            <ResponsiveContainer width="100%" height={80}>
              <LineChart data={episodeHistory} margin={{ top: 2, right: 4, left: -28, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="var(--color-blueprint-border)" />
                <XAxis dataKey="episode" tick={{ fontSize: 8, fill: 'var(--color-blueprint-text-dim)' }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 8, fill: 'var(--color-blueprint-text-dim)' }} />
                <Tooltip
                  contentStyle={{ background: 'var(--color-blueprint-bg-elevated)', border: '1px solid var(--color-blueprint-border)', fontSize: 10 }}
                  labelStyle={{ color: 'var(--color-blueprint-text-dim)' }}
                  itemStyle={{ color: 'var(--color-blueprint-accent-info)' }}
                />
                <Line type="monotone" dataKey="steps" stroke="var(--color-blueprint-accent-info)" dot={false} strokeWidth={1.5} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Sensores — última lectura */}
      {lastSensor && (
        <section className="border border-blueprint-border bg-blueprint-bg-elevated p-2 rounded-sm">
          <div className="flex items-baseline justify-between mb-1.5">
            <p className="text-blueprint-text-dim uppercase tracking-widest text-[10px]">
              Sensores — paso {lastSensor.step}
            </p>
            <span className="text-blueprint-text-dim text-[9px]">con ruido</span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
            <span className="text-blueprint-text-muted">Sensor víctima</span>
            <span className={lastSensor.victimDetected ? 'text-blueprint-accent-success' : 'text-blueprint-text-dim'}>
              {lastSensor.victimDetected ? `sí (d≈${lastSensor.victimEstimatedDistance ?? '?'})` : 'no'}
            </span>
            <span className="text-blueprint-text-muted">Sensor brisa</span>
            <span className={lastSensor.breezeDetected ? 'text-blueprint-accent-danger' : 'text-blueprint-text-dim'}>
              {lastSensor.breezeDetected ? 'detectada' : 'no'}
            </span>
            <span className="text-blueprint-text-dim text-[9px]">— real —</span>
            <span className="text-blueprint-text-dim text-[9px]">(debug)</span>
            <span className="text-blueprint-text-muted">Víctima cerca</span>
            <span className={lastSensor.actualVictimNearby ? 'text-blueprint-accent-success opacity-50' : 'text-blueprint-text-dim'}>
              {lastSensor.actualVictimNearby ? 'sí' : 'no'}
            </span>
            <span className="text-blueprint-text-muted">Brisa cerca</span>
            <span className={lastSensor.actualBreezeNearby ? 'text-blueprint-accent-danger opacity-50' : 'text-blueprint-text-dim'}>
              {lastSensor.actualBreezeNearby ? 'sí' : 'no'}
            </span>
          </div>
          {/* Discrepancia sensor vs realidad = ruido en acción */}
          {(lastSensor.victimDetected !== lastSensor.actualVictimNearby ||
            lastSensor.breezeDetected !== lastSensor.actualBreezeNearby) && (
            <p className="text-blueprint-accent-warning text-[9px] mt-1">⚠ discrepancia sensor/real</p>
          )}
        </section>
      )}

      {/* ── Base de Conocimiento ─────────────────────────────────────── */}
      <section className="border border-blueprint-border bg-blueprint-bg-elevated p-2 rounded-sm flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <p className="text-blueprint-text-dim uppercase tracking-widest text-[10px]">
            KB — {kbFacts.length} hechos
          </p>
          {kbNewFacts.length > 0 && (
            <span className="text-blueprint-accent-data text-[10px]">
              +{kbNewFacts.length} nuevos
            </span>
          )}
        </div>

        {/* Filtros por predicado */}
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setKbFilter(null)}
            className={`text-[10px] px-1.5 py-0.5 border rounded-sm transition-colors ${
              kbFilter === null
                ? 'border-blueprint-accent-data text-blueprint-accent-data'
                : 'border-blueprint-border text-blueprint-text-dim hover:border-blueprint-text-muted'
            }`}
          >
            Todos ({kbFacts.length})
          </button>
          {PREDICATE_KINDS.map((kind) => {
            const count = kbCounts[kind] ?? 0;
            if (count === 0) return null;
            return (
              <button
                key={kind}
                onClick={() => setKbFilter(kbFilter === kind ? null : kind)}
                className={`text-[10px] px-1.5 py-0.5 border rounded-sm transition-colors ${
                  kbFilter === kind
                    ? `border-current ${KIND_COLOR[kind]}`
                    : 'border-blueprint-border text-blueprint-text-dim hover:border-blueprint-text-muted'
                }`}
              >
                {kind} ({count})
              </button>
            );
          })}
        </div>

        {/* Lista de hechos */}
        <div className="flex flex-col gap-0.5 max-h-40 overflow-y-auto">
          {visibleFacts.length === 0 ? (
            <span className="text-blueprint-text-dim text-[10px]">sin hechos</span>
          ) : (
            // Hechos nuevos primero, luego el resto
            [...visibleFacts]
              .sort((a, b) => {
                const aNew = newFactsSet.has(a) ? 0 : 1;
                const bNew = newFactsSet.has(b) ? 0 : 1;
                return aNew - bNew;
              })
              .map((key) => {
                const pred = parsePredicateKey(key);
                const isNew = newFactsSet.has(key);
                return (
                  <div
                    key={key}
                    className={`flex items-center gap-1.5 ${isNew ? 'text-blueprint-accent-data' : 'text-blueprint-text-dim'}`}
                  >
                    {isNew && <span className="text-[8px]">▶</span>}
                    <span className={pred ? KIND_COLOR[pred.kind] : ''}>
                      {pred ? pred.kind : '?'}
                    </span>
                    <span className="text-blueprint-text-dim">
                      ({pred?.x},{pred?.y})
                    </span>
                  </div>
                );
              })
          )}
        </div>
      </section>

      {/* Percepción del turno actual */}
      <section className="border border-blueprint-border bg-blueprint-bg-elevated p-2 rounded-sm">
        <p className="text-blueprint-text-dim uppercase tracking-widest text-[10px] mb-1">
          Percibidas ({lastPerceived.length})
        </p>
        <div className="flex flex-wrap gap-1 max-h-12 overflow-y-auto">
          {lastPerceived.map(({ pos, cell }) => (
            <span
              key={`${pos.x},${pos.y}`}
              className="text-[10px] text-blueprint-text-dim border border-blueprint-border px-1 rounded-sm"
            >
              {pos.x},{pos.y}:{cell.type[0]}
            </span>
          ))}
        </div>
      </section>

      {/* Resumen de memoria */}
      <section className="border border-blueprint-border bg-blueprint-bg-elevated p-2 rounded-sm">
        <p className="text-blueprint-text-dim uppercase tracking-widest text-[10px] mb-1.5">
          Memoria ({Object.keys(knownCells).length} celdas)
        </p>
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
          {Object.entries(summary).map(([type, count]) => (
            <span key={type} className="contents">
              <CellTypeBadge type={type} />
              <span className="text-blueprint-text">{count}</span>
            </span>
          ))}
        </div>
      </section>

      {/* Últimas celdas observadas */}
      <section className="border border-blueprint-border bg-blueprint-bg-elevated p-2 rounded-sm">
        <p className="text-blueprint-text-dim uppercase tracking-widest text-[10px] mb-1.5">
          Recientes
        </p>
        <div className="flex flex-col gap-0.5 max-h-28 overflow-y-auto">
          {recent.map(({ pos, cell, age }) => (
            <div key={`${pos.x},${pos.y}`} className="flex items-center gap-2">
              <span className="text-blueprint-text-dim w-10 shrink-0">{pos.x},{pos.y}</span>
              <CellTypeBadge type={cell.type} />
              <span className="ml-auto text-blueprint-text-dim text-[10px]">+{age}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Creencias probabilísticas (top 8) */}
      {Object.keys(beliefs).length > 0 && (
        <section className="border border-blueprint-border bg-blueprint-bg-elevated p-2 rounded-sm">
          <p className="text-blueprint-text-dim uppercase tracking-widest text-[10px] mb-1.5">
            Creencias peligro
          </p>
          <div className="flex flex-col gap-0.5 max-h-24 overflow-y-auto">
            {Object.entries(beliefs)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 8)
              .map(([key, prob]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-blueprint-text-dim w-10 shrink-0">{key}</span>
                  <div className="flex-1 h-1 bg-blueprint-border rounded-sm overflow-hidden">
                    <div
                      className="h-full bg-blueprint-accent-danger"
                      style={{ width: `${Math.round(prob * 100)}%` }}
                    />
                  </div>
                  <span className="text-blueprint-accent-danger text-[10px] w-8 text-right">
                    {Math.round(prob * 100)}%
                  </span>
                </div>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}
