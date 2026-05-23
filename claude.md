markdown
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

