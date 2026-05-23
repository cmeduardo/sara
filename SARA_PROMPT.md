# PROMPT PARA CLAUDE CODE — SARA

> **SARA** = Sistema de Agentes de Rescate Autónomo
> Proyecto Final · Inteligencia Artificial · UMG Antigua · Entrega: domingo 24 mayo 2026
> Desarrollador único: Eduardo José Corado Moreira

Este documento contiene **dos partes**:
1. **`CLAUDE.md`** — Archivo que va en la raíz del proyecto. Claude Code lo lee en cada sesión.
2. **Prompt de arranque por fases** — Lo que pegás en la primera sesión de Claude Code después de inicializar el repo.

---

# PARTE 1 — Contenido de `CLAUDE.md`

Guardá este bloque tal cual como `~/proyectos/sara/CLAUDE.md` antes de iniciar Claude Code.

```markdown
# SARA — Instrucciones del Proyecto

## Qué es SARA
SARA (Sistema de Agentes de Rescate Autónomo) es una aplicación web que
simula un agente inteligente de rescate operando en una ciudad
representada como cuadrícula. El agente debe localizar y rescatar
víctimas, esquivar obstáculos, gestionar energía y salud, y razonar bajo
incertidumbre en un entorno parcialmente observable y dinámico.

Es un proyecto final académico para el curso de Inteligencia Artificial
de la Universidad Mariano Gálvez de Guatemala. La rúbrica exige integrar:
agente racional, búsqueda informada e informada, representación del
conocimiento con lógica, planificación STRIPS, manejo de incertidumbre
probabilístico, toma de decisiones por utilidad, y aprendizaje automático
(Q-learning).

## Stack técnico (no negociable)
- **Framework**: Next.js 14+ con App Router
- **Lenguaje**: TypeScript estricto (`strict: true`, prohibido `any`)
- **Estilos**: Tailwind CSS + shadcn/ui (sin tema oscuro genérico — ver
  sección "Estética" más abajo)
- **Estado global**: Zustand (un store por dominio: world, simulation,
  analytics, ui)
- **Render del mapa**: Canvas 2D nativo (NO SVG — performance importa
  con grids grandes y modo turbo)
- **Animaciones de UI**: Framer Motion (paneles, transiciones, no la
  grid)
- **Gráficos analíticos**: Recharts
- **Persistencia**: localStorage (Q-table, runs históricos, mapas
  guardados, configuración). NO Supabase, NO backend.
- **Deploy**: Vercel (estático, todo client-side)

## Reglas de código
- TypeScript estricto. Prohibido `any`. Usar `unknown` + type guards si
  hace falta.
- Comentarios en **español**. Los nombres de variables/funciones en
  inglés (estándar de la industria), pero los comentarios explicativos
  van en español porque este es un proyecto académico que va a ser
  revisado y documentado en español.
- Componentes funcionales con hooks. Cero clases.
- Un componente por archivo. PascalCase para componentes, camelCase para
  utils, hooks empiezan con `use`.
- Imports absolutos con alias `@/` apuntando a `src/`.
- Server Components donde sea posible; `'use client'` solo cuando se
  necesite estado, efectos o eventos del browser.
- Manejo defensivo de errores. Nunca dejar promesas sin `.catch` o
  try/catch.
- Validar entrada con Zod cuando se carguen mapas desde JSON o
  localStorage.

## Estilo de comunicación
- Eduardo trabaja paso a paso y revisa contra el código fuente. Cuando
  termines una tarea importante, hace un resumen corto de qué cambió y
  por qué.
- Si hay decisiones de diseño no obvias, escribilas en
  `SARA_NOTES.md` para que después se incorporen al documento técnico.
- No hardcodees valores sensibles (no aplica aquí, no hay secretos pero
  es buena práctica). Todos los parámetros de simulación van en un
  archivo `src/config/defaults.ts` y son ajustables por la UI.

## Estructura de carpetas
```
src/
  app/
    page.tsx                  # Pantalla principal de simulación
    comparativa/page.tsx      # Modo comparativa / benchmarking
    editor/page.tsx           # Editor manual de mapas
  components/
    grid/                     # Canvas, render layers, overlays
    panels/                   # Panels laterales (control, brain, analysis)
    editor/                   # Herramientas del editor de mapas
    common/                   # Botones, tabs, sliders custom
  lib/
    environment/              # Grid, celdas, dinamismo, sensores
    agent/                    # Loop perceive-think-act, observabilidad parcial
    search/                   # BFS, A*, comparador, métricas
    knowledge/                # Lógica proposicional, forward chaining
    planning/                 # STRIPS actions, planner, replanning
    uncertainty/              # Belief state, Bayes update, sensores ruidosos
    utility/                  # Función de utilidad, MEU
    learning/                 # Q-learning, abstracción de estados
    procedural/               # Generador procedural de mapas
    persistence/              # localStorage helpers, schemas Zod
  store/                      # Zustand stores
  config/                     # Defaults, constantes, presets
  types/                      # Tipos TS compartidos
docs/
  SARA_NOTES.md              # Notas técnicas para el documento final
```

## Estética visual — Blueprint Técnico
SARA NO debe parecerse a una típica GUI de IA con neón, glassmorphism o
gradientes saturados. Estética inspirada en planos técnicos de ingeniería
y terminales financieras tipo Bloomberg sobrias.

**Paleta exacta** (definirla en `tailwind.config.ts` como `colors.blueprint`):
- `bg`: `#0E1A26` — fondo principal, azul tinta mate, NO negro puro
- `bg-elevated`: `#142433` — paneles, cards
- `grid-line`: `#2A3A4A` — líneas del mapa, divisores
- `border`: `#1E2E3E` — bordes finos de paneles
- `text`: `#D4DDE3` — texto principal, blanco hueso
- `text-muted`: `#8A9BA8` — texto secundario, labels
- `text-dim`: `#5A6B78` — texto terciario, hints
- `accent-data`: `#E8C547` — mostaza apagado, datos numéricos críticos
- `accent-info`: `#6FA8B5` — cian apagado mate, información
- `accent-danger`: `#C46B5C` — terracota mate, peligro/error
- `accent-success`: `#7FA572` — verde oliva apagado, éxito
- `agent`: `#E8C547` — color del agente en la grid
- `victim`: `#C46B5C` — color de las víctimas
- `danger-zone`: rgba(196, 107, 92, 0.25) — peligro con transparencia
- `station`: `#6FA8B5` — estación de recarga

**Tipografía**:
- `font-mono`: JetBrains Mono — para TODO dato numérico, KB, STRIPS,
  Q-values, métricas, coordenadas
- `font-sans`: IBM Plex Sans — solo títulos y prosa explicativa

**Reglas estéticas**:
- Bordes de 1px (`border-blueprint-border`). NUNCA bordes gruesos o
  redondeados grandes — máximo `rounded-sm` (2px).
- CERO sombras (`shadow-none` siempre). Si necesitás separar capas,
  usá fondo distinto.
- CERO gradientes. Color sólido siempre.
- CERO glows / blur / backdrop-filter.
- Layout asimétrico permitido. Densidad de información alta.
- Iconos: lucide-react con `strokeWidth={1.25}` (líneas finas).
- Animaciones sutiles: solo fade y desplazamiento ligero (≤200ms). Cero
  bounce, cero spring agresivo.

## Comandos
- `pnpm dev` — desarrollo
- `pnpm build` — build producción
- `pnpm lint` — eslint
- `pnpm typecheck` — tsc --noEmit

## Definiciones canónicas

### Tipos centrales (en `src/types/world.ts`)
```typescript
export type CellType =
  | 'empty'
  | 'obstacle'
  | 'victim'
  | 'danger'
  | 'station';

export interface Cell {
  type: CellType;
  /** Probabilidad de daño si type === 'danger'. 0..1 */
  dangerProb?: number;
  /** Daño esperado si entra (0..100 HP) */
  dangerDamage?: number;
}

export interface Position { x: number; y: number; }

export interface AgentState {
  pos: Position;
  energy: number;     // 0..100
  hp: number;         // 0..100
  rescued: number;
  steps: number;
  alive: boolean;
}

export type Action =
  | { kind: 'move'; dir: 'N' | 'S' | 'E' | 'W' }
  | { kind: 'rescue' }
  | { kind: 'recharge' }
  | { kind: 'wait' };
```

## Reglas del documento técnico
Cada vez que tomes una decisión de diseño no obvia (elección de
heurística, valor de un parámetro, simplificación de un algoritmo,
trade-off), **agregá una entrada a `docs/SARA_NOTES.md`** con:
- Fecha
- Decisión
- Alternativas consideradas
- Justificación
- Referencia bibliográfica si aplica (Russell & Norvig, etc.)

Este archivo es el insumo del documento técnico final.
```

---

# PARTE 2 — Prompt de arranque por fases

Pegá esto en Claude Code después de tener `CLAUDE.md` y el proyecto Next.js inicializado. Claude Code va a trabajar fase por fase, esperando tu confirmación para avanzar.

---

## Prompt inicial

```
Vamos a construir SARA (Sistema de Agentes de Rescate Autónomo). Ya leíste
CLAUDE.md y conocés el stack, la estética y las reglas.

Antes de empezar, leé este documento completo. Vamos a trabajar por
FASES numeradas. NO avances a la siguiente fase sin que yo te diga
explícitamente "siguiente fase". Al terminar cada fase, dame un resumen
corto de qué hiciste, qué archivos creaste/modificaste, y qué quedaría
para la próxima.

Antes de la fase 1, creá `docs/SARA_NOTES.md` con un encabezado y la
sección "Decisiones de diseño" vacía. A partir de ahí, cada decisión no
trivial va ahí.

============================================================
RESUMEN DEL DOMINIO (para que mantengas el norte)
============================================================

SARA simula un agente que rescata víctimas en una ciudad-cuadrícula.
- Tamaños soportados: 9x9, 12x12, 15x15, 18x18, 20x20.
- Celdas: empty, obstacle, victim, danger (con probabilidad), station.
- Agente: posición, energía (0-100), HP (0-100), víctimas rescatadas,
  pasos, alive.
- Acciones: move N/S/E/O (costo 1 energía), rescue (sobre víctima, costo
  2), recharge (sobre estación, repone energía), wait (costo 0).
- Observabilidad parcial: el agente solo ve celdas dentro de un radio
  configurable (default 3). Más allá, mantiene CREENCIAS probabilísticas.
- Sensores ruidosos:
  - Sensor de víctimas a distancia: detecta víctimas en radio R con
    p_false_pos y p_false_neg.
  - Sensor de peligro local: al pisar celda adyacente a peligro,
    recibe "brisa" estilo Wumpus, también con ruido.
- Dinamismo: cada N pasos puede aparecer un nuevo peligro o moverse
  una víctima (configurable).

============================================================
FASES DEL PROYECTO
============================================================

------------------------------------------------------------
FASE 0 — Setup
------------------------------------------------------------
1. Verificá que el proyecto Next.js 14 esté inicializado con TS estricto,
   Tailwind, App Router, alias @/.
2. Instalá dependencias: zustand, framer-motion, recharts, lucide-react,
   zod, clsx, tailwind-merge, shadcn/ui (init).
3. Configurá tailwind.config.ts con la paleta `blueprint` exacta del
   CLAUDE.md. Configurá las fuentes JetBrains Mono e IBM Plex Sans
   (next/font o link).
4. Creá la estructura de carpetas según CLAUDE.md.
5. Creá `src/types/world.ts` con los tipos canónicos.
6. Creá `src/config/defaults.ts` con TODOS los parámetros de simulación:
   gridSize, agentVisionRadius, initialEnergy, initialHP, moveCost,
   rescueCost, dangerDamageRange, sensorNoise, dynamism, qLearning
   (alpha, gamma, epsilon, decay), rewardWeights (los valores que te di:
   victim=+100, death=-50, step=-1, danger=-5, hpLoss=-2,
   rechargeLow=+20, invalid=-10, explore=+5).
7. Globals.css con fondo blueprint-bg y tipografía base.
8. Layout base con la página principal mostrando un placeholder.

Criterio de aceptación: `pnpm dev` levanta sin errores, fondo azul tinta
mate visible, tipografía monoespaciada correcta, sin neón ni sombras.

------------------------------------------------------------
FASE 1 — Entorno y render de la grid
------------------------------------------------------------
1. `lib/environment/grid.ts`: clase/módulo Grid con métodos createEmpty,
   getCell, setCell, isInBounds, neighbors, clone.
2. `lib/environment/dynamism.ts`: función tickDynamism(grid, config) que
   con probabilidad p:
   - Agrega un peligro en celda empty aleatoria.
   - Cambia la dangerProb de un peligro existente.
   - Mueve una víctima a celda empty adyacente (raro).
3. `components/grid/GridCanvas.tsx`: componente Canvas 2D que renderiza:
   - Capa 0: fondo y líneas de grid en `grid-line`.
   - Capa 1: celdas (obstáculo = bloque sólido `text-muted`, peligro =
     patrón de líneas diagonales en `danger-zone`, estación = símbolo
     ⚡ minimalista, víctima = silueta humana minimalista).
   - Capa 2: agente como rombo orientado a su última dirección.
   - Capa 3: overlay de visibilidad — celdas fuera del radio del
     agente se renderizan con opacity 0.35 y un patrón sutil de
     puntos pequeños que indica "no observado actualmente".
   - Capa 4 (toggle): heatmap de creencias (gris) — más oscuro =
     mayor probabilidad de peligro inferida.
   - Capa 5 (toggle): plan del agente — flechas finas conectando las
     celdas del plan actual en `accent-info`.
4. Las coordenadas van con (0,0) en la esquina superior izquierda. Mostrar
   números de fila/columna en los bordes con `text-dim` y JetBrains Mono.
5. El canvas debe ser responsive (recalcular tamaño de celda en resize)
   pero mantener aspect ratio cuadrado.

Criterio de aceptación: renderizar una grid 12x12 hardcodeada con
obstáculos, víctimas, peligros, estación, agente. Sin animación todavía.
Las capas toggleables se controlan con un panel mínimo en la página.

------------------------------------------------------------
FASE 2 — Generador procedural + Editor manual
------------------------------------------------------------
1. `lib/procedural/generator.ts`: función generateMap(config) que toma:
   size, density (obstacles 5-20%, dangers 3-10%, victims 2-6, stations
   0-2), seed. Garantiza:
   - Conectividad: todas las víctimas son alcanzables desde la posición
     inicial del agente (usar BFS para verificar; si falla, regenerar).
   - Distribución razonable (no todos los peligros pegados).
   - Asigna dangerProb aleatorio en [0.2, 0.8] a cada peligro.
2. Página `/editor` con UI:
   - Selector de tamaño (9/12/15/18/20).
   - Paleta de herramientas: empty, obstacle, victim, danger (con slider
     de probabilidad), station, agent start.
   - Click en celda aplica la herramienta. Click derecho borra.
   - Botones: nuevo vacío, generar procedural, guardar (a localStorage
     con nombre), cargar (lista de mapas guardados), exportar JSON,
     importar JSON.
3. `lib/persistence/maps.ts`: CRUD de mapas en localStorage con Zod
   validando esquema al cargar.

Criterio de aceptación: puedo generar un mapa procedural, editarlo a
mano, guardarlo, cerrar el navegador, volver a abrir y cargarlo. El
mapa renderiza correctamente en el GridCanvas.

------------------------------------------------------------
FASE 3 — Agente, percepción y observabilidad parcial
------------------------------------------------------------
1. `lib/agent/perception.ts`: función perceive(world, agentPos, radius)
   que devuelve PerceivedCells: { pos, cell }[] solo de celdas dentro
   del radio Chebyshev. Más sensores:
   - victimSensor(world, agentPos, sensorRadius, noise): devuelve {
     detected: boolean, estimatedDistance: number | null } con falsos
     positivos y negativos según noise.
   - dangerBreezeSensor(world, agentPos, noise): devuelve true/false
     con ruido — true si alguna celda adyacente es peligro.
2. `lib/agent/memory.ts`: WorldModel del agente — guarda lo que ha visto
   con timestamp (porque el entorno es dinámico, info vieja decae). Mapa
   interno con: known cells, last-seen-step, belief probability para
   celdas no observadas.
3. `lib/agent/loop.ts`: estructura del ciclo perceive → updateBeliefs →
   reason → plan → decide → act. De momento solo deja el esqueleto y
   conecta perceive y memory.

Criterio de aceptación: el agente ve un radio limitado. El panel "Cerebro
del agente" (creálo básico) muestra qué celdas conoce y desde hace
cuántos pasos. Mostrar también las lecturas crudas de los sensores
ruidosos cada turno.

------------------------------------------------------------
FASE 4 — Representación del conocimiento (KB lógica)
------------------------------------------------------------
1. `lib/knowledge/predicates.ts`: definir predicados como literales tipo
   `Safe(x,y)`, `Visited(x,y)`, `VictimAt(x,y)`, `MaybeDanger(x,y)`,
   `BreezeAt(x,y)`, `ConfirmedDanger(x,y)`.
2. `lib/knowledge/kb.ts`: KnowledgeBase con:
   - tell(fact): agrega hecho.
   - ask(query): consulta.
   - facts(): lista de hechos actuales.
   - tellAll(facts[]): bulk.
3. `lib/knowledge/inference.ts`: motor de forward chaining con reglas:
   - Si Visited(x,y) y sin daño recibido → Safe(x,y).
   - Si BreezeAt(x,y) → alguna celda adyacente es MaybeDanger.
   - Si BreezeAt(x,y) y todas las adyacentes son Safe excepto una → esa
     una es ConfirmedDanger.
   - Si !BreezeAt(x,y) → todas las adyacentes son Safe.
   - Si VictimAt(x,y) y agente está en (x,y) → puede ejecutar rescue.
4. Integración: cada turno, después de perceive, llamar a updateKB que
   convierte las percepciones en hechos, luego correr inference hasta
   punto fijo.
5. Panel "Cerebro" debe mostrar:
   - Lista de hechos actuales (filtrable por predicado).
   - Hechos NUEVOS inferidos en este turno (resaltados con un acento
     `accent-data` durante 1 turno).

Criterio de aceptación: caminar al agente manualmente (con flechas del
teclado, modo debug) por un mapa con peligros conocidos y ver cómo se
acumulan hechos en la KB y aparecen inferencias.

------------------------------------------------------------
FASE 5 — Búsqueda no informada e informada
------------------------------------------------------------
1. `lib/search/types.ts`: SearchProblem genérico { initialState,
   isGoal, successors, stepCost }, SearchResult { plan: Action[],
   nodesExpanded, frontierMax, timeMs, totalCost }.
2. `lib/search/bfs.ts`: BFS estándar.
3. `lib/search/astar.ts`: A* con heurística Manhattan + penalización
   por riesgo esperado: h(n) = manhattan(n, goal) + λ * sum(beliefDanger
   * expectedDamage) en celdas cerca del path.
4. `lib/search/compare.ts`: función compareSearches(problem) que corre
   ambos y devuelve métricas lado a lado.
5. Las búsquedas operan sobre el WorldModel del agente (no sobre el
   mundo real) — esto es CRÍTICO porque demuestra observabilidad
   parcial. Las celdas no observadas se asumen transitables con una
   penalización de incertidumbre.

Criterio de aceptación: en `/comparativa` hay un panel donde elijo un
mapa y un objetivo, corro BFS y A*, y veo una tabla con: nodos
expandidos, longitud del plan, costo, tiempo. Visualizá ambos paths
en el canvas con colores distintos.

------------------------------------------------------------
FASE 6 — Planificación STRIPS + replanning
------------------------------------------------------------
1. `lib/planning/actions.ts`: definir acciones STRIPS con
   precondiciones y efectos explícitos:
   - Move(from, to): pre={At(from), Adjacent(from,to), !Obstacle(to),
     Energy >= 1}; eff={At(to), !At(from), Energy -= 1}.
   - Rescue(pos): pre={At(pos), VictimAt(pos), Energy >= 2};
     eff={!VictimAt(pos), Rescued += 1, Energy -= 2}.
   - Recharge(pos): pre={At(pos), StationAt(pos)};
     eff={Energy = MaxEnergy}.
2. `lib/planning/planner.ts`: planificador multi-objetivo. Estrategia:
   - Ordenar víctimas conocidas por costo estimado (A* hacia cada una).
   - Construir plan greedy: ir a la víctima de menor costo, rescatar,
     repetir. Si Energy < umbral, insertar Recharge(estación más
     cercana) antes.
   - Resultado: PlanStep[] = secuencia de acciones STRIPS concretas.
3. `lib/planning/replanning.ts`: detector de invalidación de plan.
   Después de cada step, verificar:
   - ¿Próxima acción sigue teniendo precondiciones válidas?
   - ¿El WorldModel cambió de forma que afecta el plan (nueva víctima,
     nuevo peligro descubierto en el path, peligro confirmado)?
   - Si invalidación → marcar como `replanning_triggered` con motivo
     y regenerar.
4. **EXPOSICIÓN MÁXIMA EN UI** (este es el diferenciador):
   Panel "Cerebro" debe mostrar EN CADA PASO:
   - El plan completo vigente como lista numerada de acciones STRIPS.
   - La acción actual con SUS PRECONDICIONES (cada una con ✓ si
     cumple, ✗ si no — debería siempre cumplir porque si no, replan).
   - Los EFECTOS que se acaban de aplicar al estado.
   - Si hubo replanning en este turno, animar la razón del replan
     (qué precondición falló, qué cambió) durante ~2 segundos.

Criterio de aceptación: pongo 3 víctimas en un mapa, presiono "Play", y
veo en el panel cómo el agente arma un plan tipo
  1. Move(2,3 → 3,3)
  2. Move(3,3 → 3,4)
  3. Rescue(3,4)
  4. Move(3,4 → 3,5) ...
Cada turno una acción se ejecuta y se ven sus pre/eff explícitos.

------------------------------------------------------------
FASE 7 — Manejo de incertidumbre
------------------------------------------------------------
1. `lib/uncertainty/beliefs.ts`: BeliefState — distribución de
   probabilidad sobre celdas no observadas. Para cada celda guarda
   P(danger), P(victim), P(empty). Default uniforme a priori que se
   actualiza con observaciones.
2. `lib/uncertainty/bayes.ts`: actualización bayesiana cuando llega una
   percepción nueva o una lectura ruidosa. Las lecturas de los sensores
   se interpretan con likelihoods conocidos:
   - P(breeze=true | danger_adjacent=true) = 1 - p_false_neg
   - P(breeze=true | danger_adjacent=false) = p_false_pos
3. `lib/uncertainty/expected.ts`: expectedDamage(beliefState, pos) y
   expectedReward(beliefState, plan).
4. Integración: A* usa expectedDamage para penalizar paths. La
   función de utilidad (próxima fase) integra sobre creencias.

Criterio de aceptación: con el toggle de "heatmap de creencias", se ve
en la grid cómo el agente va estimando peligro en celdas no observadas
y cómo esas estimaciones se actualizan con cada lectura del sensor.

------------------------------------------------------------
FASE 8 — Función de utilidad y toma de decisiones
------------------------------------------------------------
1. `lib/utility/function.ts`:
   U(state) = w1*rescued - w2*hp_lost - w3*energy_used - w4*steps -
   w5*(1 if dead else 0)
   donde w son los rewardWeights de defaults.ts pero positivos cuando
   suman utilidad.
2. `lib/utility/decision.ts`: chooseAction(state, beliefs, plan, qTable):
   - Si hay plan vigente con próxima acción válida: ejecutarla.
   - Si no, expected utility de cada acción aplicable, elegir argmax.
   - Si Q-learning está activo: blendear con Q-values
     (α*plan_action + (1-α)*q_best_action) — α configurable.
3. Panel "Cerebro" muestra:
   - La utilidad esperada de cada acción aplicable en este turno
     como mini barchart.
   - La acción elegida y por qué (texto: "máxima utilidad esperada",
     "siguiendo plan", "Q-value alto").

Criterio de aceptación: con plan desactivado, el agente se mueve por
pura maximización de utilidad esperada. El panel muestra las utilidades
de cada acción candidata.

------------------------------------------------------------
FASE 9 — Q-learning
------------------------------------------------------------
1. `lib/learning/abstraction.ts`: abstractState(world, agent) → string
   key con:
   - distVictim: cerca(0-3) / media(4-7) / lejos(8+) / desconocido
   - energy: alta(>70) / media(40-70) / baja(15-40) / crítica(<15)
   - hp: alta(>70) / media(40-70) / baja(15-40) / crítica(<15)
   - avgRisk: bajo / medio / alto / crítico
   - knowsStation: sí / no
   - obstacleN/S/E/W: 4 bits
   Resultado: ~8000 estados posibles.
2. `lib/learning/qtable.ts`: QTable con get(state, action), set, decay.
   Persiste en localStorage.
3. `lib/learning/qlearning.ts`: update bellman estándar:
   Q(s,a) ← Q(s,a) + α [r + γ max_a' Q(s',a') - Q(s,a)]
   con ε-greedy y decay de ε y α.
4. `lib/learning/reward.ts`: computeReward(prevState, action, newState)
   según los weights de defaults.ts (víctima=+100, muerte=-50, paso=-1,
   peligro=-5, hp_loss=-2, recharge_low=+20, invalida=-10,
   explorar=+5_decaying).
5. **Modo turbo**: en `/comparativa` un botón "Entrenar N episodios"
   (N=100/500/2000). Corre sin renderizar la grid (solo barra de
   progreso) hasta N veces. Cada episodio: reset, jugar hasta morir
   o rescatar todas o exceder max_steps. Guardar curve de recompensa
   acumulada por episodio.
6. Persistir la Q-table actual con nombre (ej. "qtable_v1_2000eps") en
   localStorage para reusarla.

Criterio de aceptación: entreno 500 episodios en modo turbo (debería
tardar ≤30s para grid 12x12), veo curva creciente de recompensa, después
puedo cargar esa Q-table y correr el agente en modo normal y se nota
mejor desempeño que sin Q-table.

------------------------------------------------------------
FASE 10 — UI completa y paneles en tiempo real
------------------------------------------------------------
Layout final de `/` (3 zonas):

**Header** (h-12): SARA logo minimal, indicador de step actual,
selector de mapa, botón a /editor, botón a /comparativa.

**Columna izquierda (w-72)** — Control & Estado:
- Controles: play / pause / step / reset / turbo (skip animation) /
  velocidad (slider 1x-50x).
- Estado del agente con números en JetBrains Mono grandes:
  - STEP, ENERGY (con barra fina), HP (con barra fina), RESCUED,
    VICTIMS_LEFT.
- Sliders en vivo: rewardWeights, ε, α, γ, sensorNoise, visionRadius.
- Toggles de capas: visibilidad, creencias, plan.

**Centro (flex-1)**: GridCanvas con coordenadas en los bordes.

**Columna derecha (w-96)** — 3 tabs:
- **Cerebro**: percepciones del turno, lecturas de sensores (con
  ruido), KB (lista filtrable), inferencias nuevas resaltadas, plan
  STRIPS completo con la acción actual destacada y sus pre/eff,
  utilidades de cada acción, acción elegida con justificación.
- **Métricas**: gráfica en vivo de recompensa acumulada, energía
  vs tiempo, HP vs tiempo, víctimas rescatadas.
- **Log**: registro textual de cada turno tipo terminal:
  `[step 42] perceived: 8 cells | breeze: true(noisy) | kb_new: 3
   facts | plan: Move(2,3→3,3) | precond: OK | acted | reward: -1`

Todos los paneles con bordes de 1px, sin sombras, fondo
`bg-elevated`, tipografía mono para datos.

Criterio de aceptación: corriendo en vivo, cada turno actualiza los 3
paneles. Mover el slider de velocidad cambia el tick rate.

------------------------------------------------------------
FASE 11 — Modo comparativa / benchmarking
------------------------------------------------------------
Página `/comparativa` con tabs:

1. **BFS vs A***: elegir mapa y goal, correr ambos, ver:
   - Tabla: nodos expandidos, longitud, costo, tiempo.
   - Visualización side-by-side: dos canvases pequeños mostrando los
     paths.
   - Texto de análisis auto-generado (template) sobre quién ganó.

2. **Agente con Q vs sin Q**: correr el mismo mapa con dos agentes
   (uno usa Q-table cargada, otro no). Métricas finales tabla.

3. **Con KB vs sin KB**: ídem, uno usa inferencia lógica para evitar
   peligros, el otro no.

4. **Con planning vs reactivo**: ídem, uno usa STRIPS, el otro elige
   greedy por utilidad inmediata.

5. **Curva de aprendizaje**: gráfica Recharts de recompensa por
   episodio durante entrenamiento. Smoothing window configurable.

6. **Batch runs**: correr N runs (10/50/100) del mismo escenario con
   seeds distintas, mostrar media y desviación estándar de las
   métricas, error bars en Recharts.

Cada run debe poder exportarse a JSON (descarga) para incluir en el
documento técnico.

Criterio de aceptación: puedo generar los 6 comparativos y exportarlos
para la documentación.

------------------------------------------------------------
FASE 12 — Persistencia y pulido
------------------------------------------------------------
1. `lib/persistence/`: helpers para Q-tables, mapas, runs, config.
2. Pantalla "Biblioteca" en /editor que lista todos los mapas y Q-tables
   guardados, con metadatos (creado, tamaño, episodios entrenados).
3. Botón "Reset todo" con confirmación.
4. Hotkeys: espacio = play/pause, flecha derecha = step, R = reset, M =
   abrir mapa, C = ir a comparativa.
5. Manejo de errores: si localStorage está lleno, alertar y permitir
   limpiar.
6. Comentar todo el código denso en español.
7. Revisar que CERO componente use sombras, gradientes, ni colores fuera
   de la paleta blueprint. Auditoría visual.

------------------------------------------------------------
FASE 13 — Empaquetado para entrega
------------------------------------------------------------
1. README.md en español con:
   - Qué es SARA.
   - Cómo correr en local.
   - Estructura del código.
   - Mapping rubrica → módulo del proyecto.
2. Script de build optimizado.
3. Generar un ZIP con `pnpm pack` o equivalente.
4. Revisar `SARA_NOTES.md`: que tenga todas las decisiones
   importantes documentadas en formato listo para copiar al Word.

============================================================
NOTAS FINALES
============================================================

- Cuando termines cada fase, escribí en SARA_NOTES.md las decisiones
  no triviales que tomaste.
- Si una fase parece muy grande, decímelo y la partimos.
- Si tenés dudas de criterio (ej. qué heurística exacta usar),
  proponé 2 opciones con pros/contras y esperá mi decisión, no asumas.
- Todo en español en comentarios, UI, logs y documentación.
- La paleta blueprint es ley. CUALQUIER tentación de meter color fuera
  de ahí debe pasar por mí.

Empezá por la FASE 0. Cuando termines, esperá mi "siguiente fase".
```

---

# PARTE 3 — Cómo usar este prompt

1. **Inicializá el proyecto**:
   ```bash
   cd ~/proyectos
   pnpm create next-app@latest sara --typescript --tailwind --app --src-dir --import-alias "@/*"
   cd sara
   git init && gh repo create sara --private --source=. --remote=origin
   ```

2. **Creá `CLAUDE.md`** con el contenido de la Parte 1 de este documento.

3. **Iniciá Claude Code**:
   ```bash
   claude
   ```

4. **Pegá el prompt de arranque** (todo el bloque dentro del ``` de la Parte 2).

5. **Avanzá fase por fase**. Después de cada fase, revisá lo que hizo, probalo en `pnpm dev`, y si está bien decile "siguiente fase". Si algo no cuadra, pedile correcciones antes de avanzar.

6. **Sesiones largas**: si te quedás sin contexto en una sesión, abrí una nueva. Claude Code va a leer `CLAUDE.md` automáticamente y vos solo tenés que decirle "estamos en fase X, retomá desde Y". Idealmente que `SARA_NOTES.md` esté actualizado para que tenga el estado.

---

# PARTE 4 — Mapeo rúbrica → entregable

| Item de rúbrica | Dónde se evidencia en SARA |
|---|---|
| Integración de conceptos | Documento técnico + arquitectura modular `src/lib/{agent,search,knowledge,planning,uncertainty,utility,learning}` |
| Implementación de agente | Loop perceive→reason→plan→decide→act en `lib/agent/loop.ts`, observable en panel "Cerebro" |
| Búsqueda | BFS + A*, comparación en `/comparativa` tab 1 |
| Representación del conocimiento | KB proposicional con forward chaining en `lib/knowledge/*`, hechos e inferencias visibles en panel |
| Planificación | STRIPS con pre/eff explícitos en `lib/planning/*`, plan completo + replanning animado en UI |
| Manejo de incertidumbre | BeliefState bayesiano + sensores ruidosos, heatmap de creencias toggleable |
| Toma de decisiones | Función de utilidad + MEU en `lib/utility/*`, utilidades por acción visibles cada turno |
| Aprendizaje | Q-learning tabular con abstracción de estados, modo turbo de entrenamiento, curva de aprendizaje + comparativa con/sin Q |

---

# PARTE 5 — Recordatorios estratégicos

- **El video de 5 min**: el panel "Cerebro" mostrando STRIPS en tiempo real, KB inferiendo hechos, y el replanning animado son el oro para el video. Asegurate que en demo se vea bien.
- **El documento técnico**: `SARA_NOTES.md` es tu primer borrador. Cuando termines la fase 13, en chat me pasás ese archivo y armamos el Word APA 7 con la estructura que ya manejás (problema, modelado, técnicas, resultados, análisis).
- **Tiempo**: hoy es viernes 22 de mayo. Entrega domingo 24. Realista: fases 0–9 hoy y mañana, fases 10–13 sábado-domingo. Si una fase se atora más de 2 horas, partila o simplificala.
- **Backup**: commit por fase, push después de cada fase exitosa. Si Claude Code rompe algo, `git reset --hard HEAD`.
