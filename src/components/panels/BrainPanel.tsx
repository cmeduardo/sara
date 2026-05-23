'use client';

/* Panel cognitivo: estado interno del agente — memoria, sensores, KB y plan */

import { useState } from 'react';
import { useAgentStore } from '@/store/agentStore';
import { useWorldStore } from '@/store/worldStore';
import { DEFAULTS } from '@/config/defaults';
import { recentKnownCells, memorySummary } from '@/lib/agent/memory';
import { parsePredicateKey, PREDICATE_KINDS, type PredicateKind } from '@/lib/knowledge/predicates';
import { EMPTY_PLAN, knownVictimPositions } from '@/lib/planning/strips';
import { useUIStore } from '@/store/uiStore';
import type { ActionEvaluation } from '@/types/agent';

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

export function BrainPanel() {
  const { knownCells, beliefs, lastPerceived, sensorReadings, loopPhase, kbFacts, kbNewFacts, plan, setPlan, actionUtilities } =
    useAgentStore();
  const { agentState, agentStart, initialGrid, setPlan: setWorldPlan, updateAgentState, setGrid } = useWorldStore();
  const { showPlan, togglePlan } = useUIStore();

  const [kbFilter, setKbFilter] = useState<PredicateKind | null>(null);

  const isRescueMission = plan.goalPos !== null
    && kbFacts.includes(`VictimAt(${plan.goalPos.x},${plan.goalPos.y})`);
  const planMode = actionUtilities[0]?.type ?? (isRescueMission ? 'rescue' : 'explore');

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

        {/* Botones de control */}
        <div className="flex gap-1.5 mt-0.5">
          <button
            onClick={() => {
              setPlan({ ...EMPTY_PLAN, status: 'executing' });
              setWorldPlan([]);
              if (!showPlan) togglePlan();
            }}
            disabled={plan.status === 'executing'}
            className="flex-1 text-[10px] font-mono px-2 py-1 border rounded-sm transition-colors
              border-blueprint-accent-info text-blueprint-accent-info
              hover:bg-blueprint-accent-info hover:text-blueprint-bg
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Iniciar
          </button>
          <button
            onClick={() => {
              setPlan(EMPTY_PLAN);
              setWorldPlan([]);
              if (showPlan) togglePlan();
            }}
            disabled={plan.status === 'idle'}
            className="flex-1 text-[10px] font-mono px-2 py-1 border rounded-sm transition-colors
              border-blueprint-border text-blueprint-text-dim
              hover:border-blueprint-text-muted hover:text-blueprint-text
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Detener
          </button>
        </div>

        {/* Reiniciar: restaura mapa y agente, conserva conocimiento */}
        <button
          onClick={() => {
            setPlan(EMPTY_PLAN);
            setWorldPlan([]);
            if (showPlan) togglePlan();
            setGrid(initialGrid);
            updateAgentState({
              pos: agentStart,
              energy: DEFAULTS.initialEnergy,
              hp: DEFAULTS.initialHP,
              steps: 0,
              rescued: 0,
              alive: true,
            });
          }}
          className="w-full text-[10px] font-mono px-2 py-1 border rounded-sm transition-colors
            border-blueprint-accent-warning text-blueprint-accent-warning
            hover:bg-blueprint-accent-warning hover:text-blueprint-bg"
        >
          Reiniciar (conservar conocimiento)
        </button>
      </section>

      {/* ── Utilidad de acciones (Fase 8) ───────────────────────────────── */}
      {actionUtilities.length > 0 && (
        <section className="border border-blueprint-border bg-blueprint-bg-elevated p-2 rounded-sm flex flex-col gap-1.5">
          <p className="text-blueprint-text-dim uppercase tracking-widest text-[10px]">Utilidad</p>
          {actionUtilities.map((ev: ActionEvaluation, i) => {
            const isTop = i === 0;
            const typeColor: Record<string, string> = {
              rescue:   'text-blueprint-victim',
              explore:  'text-blueprint-accent-info',
              recharge: 'text-blueprint-accent-success',
            };
            // rango aprox −150 a +100 para barra relativa
            const maxU = Math.max(...actionUtilities.map((e) => Math.abs(e.utility)), 1);
            const pct = Math.round(Math.abs(ev.utility) / maxU * 100);
            return (
              <div key={`${ev.type}-${ev.goal.x}-${ev.goal.y}`}
                className={`flex flex-col gap-0.5 ${isTop ? '' : 'opacity-60'}`}
              >
                <div className="flex items-center gap-1.5">
                  {isTop && <span className="text-[8px] text-blueprint-accent-data">▶</span>}
                  <span className={`${typeColor[ev.type] ?? 'text-blueprint-text'} text-[10px]`}>
                    {ev.type}
                  </span>
                  <span className="text-blueprint-text-dim text-[10px]">
                    ({ev.goal.x},{ev.goal.y})
                  </span>
                  <span className={`ml-auto text-[10px] ${ev.utility >= 0 ? 'text-blueprint-accent-success' : 'text-blueprint-accent-danger'}`}>
                    {ev.utility >= 0 ? '+' : ''}{ev.utility.toFixed(1)}
                  </span>
                </div>
                <div className="h-0.5 bg-blueprint-border rounded-sm overflow-hidden">
                  <div
                    className={`h-full ${ev.utility >= 0 ? 'bg-blueprint-accent-success' : 'bg-blueprint-accent-danger'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Sensores — última lectura */}
      {lastSensor && (
        <section className="border border-blueprint-border bg-blueprint-bg-elevated p-2 rounded-sm">
          <p className="text-blueprint-text-dim uppercase tracking-widest text-[10px] mb-1.5">
            Sensores — paso {lastSensor.step}
          </p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
            <span className="text-blueprint-text-muted">Víctima</span>
            <span className={lastSensor.victimDetected ? 'text-blueprint-accent-success' : 'text-blueprint-text-dim'}>
              {lastSensor.victimDetected ? `sí (d≈${lastSensor.victimEstimatedDistance ?? '?'})` : 'no'}
            </span>
            <span className="text-blueprint-text-muted">Brisa</span>
            <span className={lastSensor.breezeDetected ? 'text-blueprint-accent-danger' : 'text-blueprint-text-dim'}>
              {lastSensor.breezeDetected ? 'detectada' : 'no'}
            </span>
            <span className="text-blueprint-text-muted">Real víct.</span>
            <span className="text-blueprint-text-dim">{lastSensor.actualVictimNearby ? 'sí' : 'no'}</span>
            <span className="text-blueprint-text-muted">Real brisa</span>
            <span className="text-blueprint-text-dim">{lastSensor.actualBreezeNearby ? 'sí' : 'no'}</span>
          </div>
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
