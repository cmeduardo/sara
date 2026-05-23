# SARA — Notas Técnicas

> Insumo para el documento técnico final.
> Proyecto Final · Inteligencia Artificial · UMG Antigua
> Desarrollador: Eduardo José Corado Moreira
> Entrega: 24 mayo 2026

---

## Decisiones de diseño

---

### 2026-05-22 — Fase 0: Setup

**Decisión:** Usar Next.js 16 + Tailwind CSS 4 en lugar de Next.js 14 + Tailwind 3.

- **Alternativas consideradas:**
  - Next.js 14 + Tailwind 3 (versión mencionada en el prompt).
  - Next.js 16 + Tailwind 4 (versión más reciente disponible vía `create-next-app`).

- **Justificación:** `create-next-app` instala automáticamente la versión más reciente. Next.js 16 es retrocompatible con 14 en todo lo que SARA usa (App Router, Server Components, `next/font`). Tailwind 4 cambia la configuración de `tailwind.config.ts` a directivas CSS (`@theme inline` en `globals.css`), lo cual es más limpio para un proyecto que define una paleta custom. No hay costo de migración porque SARA se diseñó desde cero con este stack.

- **Impacto:** La paleta `blueprint` se define en `globals.css` usando `@theme inline` en lugar de `tailwind.config.ts`. Las clases generadas son idénticas (`bg-blueprint-bg`, `text-blueprint-accent-data`, etc.).

---

### 2026-05-22 — Fase 0: Parámetros de ruido de sensores

**Decisión:** Valores iniciales de ruido: `victimFalsePositive=0.10`, `victimFalseNegative=0.15`, `breezeFalsePositive=0.05`, `breezeFalseNegative=0.10`.

- **Alternativas consideradas:**
  - Ruido uniforme (mismo valor para todos los sensores).
  - Ruido diferenciado por tipo de sensor (elegido).

- **Justificación:** El sensor de brisa (tipo Wumpus) es más confiable que el sensor de víctimas a distancia porque la brisa es un efecto físico local, mientras que detectar víctimas a distancia está sujeto a más interferencias. Los valores son conservadores para que el agente aún pueda razonar con cierta confianza, pero suficientemente ruidosos para que la actualización bayesiana sea visible en la UI.

- **Referencia:** Russell & Norvig, AIMA 4ª ed., cap. 4 (agentes bajo incertidumbre), cap. 13 (probabilidad en IA).

---

### 2026-05-22 — Fase 0: Pesos de recompensa (Q-learning)

**Decisión:** `victim=+100, death=-50, step=-1, danger=-5, hpLoss=-2, rechargeLow=+20, invalid=-10, explore=+5`.

- **Justificación:** La escala está balanceada para que rescatar una víctima (el objetivo principal) domine claramente sobre moverse (+100 vs. -1 por paso → el agente tolera hasta 100 pasos de búsqueda por víctima). La penalización por muerte (-50) es menor que rescatar (+100) para que el agente prefiera arriesgarse si la probabilidad de éxito es alta. El bonus de exploración (+5) decae con el tiempo para forzar explotación en episodios avanzados.

- **Referencia:** Sutton & Barto, "Reinforcement Learning: An Introduction", 2ª ed., cap. 3 (reward shaping).

---

### 2026-05-22 — Fase 1: Render en Canvas 2D, no SVG

**Decisión:** Usar Canvas 2D nativo para todas las capas del mapa.

- **Alternativas consideradas:**
  - SVG: más fácil de estilizar con CSS, pero con performance degradada en grids >15×15 con animación (cada celda es un nodo DOM).
  - Canvas 2D (elegido): una sola superficie de dibujo, redraw completo en cada frame, O(n) donde n = celdas visibles.
  - WebGL: exceso de complejidad para el scope del proyecto.

- **Justificación:** El modo turbo (Fase 9) corre hasta 2000 episodios sin renderizar. Cuando se activa la animación, la grid puede ser 20×20 = 400 celdas actualizando a 50x (≈16ms/frame). Canvas 2D maneja esto sin problema; SVG con 400 elementos animados sí tiene problemas de layout/reflow.

- **Impacto:** Las capas no son nodos DOM sino funciones de dibujo que se ejecutan en orden sobre el mismo contexto 2D. Los colores blueprint se definen en `src/config/colors.ts` como constantes hex, no como clases Tailwind.

- **Referencia:** MDN Canvas API; Flanagan, "JavaScript: The Definitive Guide", cap. Canvas.

---

### 2026-05-22 — Fase 1: Radio de Chebyshev para observabilidad parcial

**Decisión:** Usar distancia de Chebyshev (max(|Δx|, |Δy|)) para definir el radio de visión del agente.

- **Alternativas consideradas:**
  - Distancia Manhattan: produce un rombo de visión, poco natural para un agente con visión periférica.
  - Distancia Euclidiana: produce un círculo, más realista pero más costoso de calcular y de renderizar con píxeles.
  - Chebyshev (elegido): produce un cuadrado de visión, natural para una cuadrícula y alineado con el estilo Wumpus World del problema.

- **Justificación:** El estilo Wumpus World (Russell & Norvig, AIMA cap. 7) usa radio cuadrado. La visión cuadrada es más fácil de razonar en términos de coordenadas de cuadrícula y más eficiente de verificar (max vs raíz cuadrada).

- **Referencia:** Russell & Norvig, AIMA 4ª ed., cap. 7 (Agentes lógicos, Wumpus World).

---

### 2026-05-22 — Fase 2: PRNG Mulberry32 para generación reproducible

**Decisión:** Usar el algoritmo Mulberry32 como PRNG para el generador procedural.

- **Alternativas consideradas:**
  - `Math.random()`: no reproducible, no sirve para seeds.
  - LCG (Linear Congruential Generator): rápido y simple, pero mala calidad estadística (baja period, correlación).
  - Mulberry32 (elegido): 32-bit, una sola operación de actualización, excelente distribución, output entre 0 y 1, implementación de ~5 líneas, diseñado para juegos/simulaciones.
  - Xoshiro/Xoroshiro: mejor calidad pero más líneas de código innecesario para este scope.

- **Justificación:** El generador necesita reproducibilidad (mismo seed → mismo mapa) para que el usuario pueda compartir o registrar seeds interesantes. Mulberry32 es suficiente para grids de hasta 20×20 (≤400 celdas). Referencia de implementación: Tommy Ettinger (2021).

---

### 2026-05-22 — Fase 2: BFS para verificación de conectividad

**Decisión:** Verificar que todas las víctimas sean alcanzables desde el inicio del agente usando BFS; si alguna es inaccesible, reintentar la generación.

- **Alternativas consideradas:**
  - No verificar: el agente podría quedar atascado con víctimas inalcanzables, haciendo la simulación inútil.
  - Union-Find (Disjoint Set): más eficiente para consultas repetidas, pero innecesariamente complejo para una verificación por episodio.
  - BFS (elegido): O(n) donde n = celdas, simple de implementar, suficientemente rápido para grids de hasta 20×20.

- **Justificación:** La rúbrica exige "búsqueda no informada" (BFS). Reutilizar BFS aquí sirve como introducción natural al algoritmo antes de implementarlo formalmente en Fase 5. Los obstáculos bloquean el paso; peligros y estaciones son transitables (el agente puede arriesgarse a cruzarlos).

- **Referencia:** Russell & Norvig, AIMA 4ª ed., cap. 3 (Búsqueda no informada).

---

### 2026-05-22 — Fase 2: Distancia mínima entre peligros en el generador

**Decisión:** Aplicar una distancia mínima Manhattan de `max(2, floor(size/5))` entre celdas de peligro al generarlas.

- **Justificación:** Sin esta restricción, el generador tiende a agrupar todos los peligros en el mismo sector del mapa (ya que se toman de una lista aleatoria continua). La separación garantiza que el agente enfrente peligros distribuidos, haciendo la simulación más interesante y el entrenamiento de Q-learning más diverso. El valor `size/5` escala con el tamaño del mapa (4 en 20×20, 2 en 9×9).

---

### 2026-05-22 — Fase 4: Representación de hechos como claves serializadas

**Decisión:** Representar los hechos de la KB como strings en formato `"Predicado(x,y)"` (ej. `"Safe(3,4)"`) almacenados en un `Set<string>` en memoria y como `string[]` en el store de Zustand.

- **Alternativas consideradas:**
  - Objetos `{ kind, x, y }` en un `Set` de objetos: imposible en JS (los objetos se comparan por referencia, no por valor), requeriría serialización custom para comparar igualdad.
  - `Map<string, Predicate>` con clave string: equivalente a la solución elegida pero con indirección innecesaria.
  - String serializado (elegido): lookup O(1) en Set, serializable a JSON sin transformación, legible en el panel de UI sin parsing.

- **Justificación:** La KB crece monótonamente (solo se añaden hechos, no se retractan excepto `MaybeDanger→ConfirmedDanger`). El closed-world assumption simplifica la inferencia: un hecho no presente en la KB se trata como falso. Esta representación permite usar el panel "Cerebro" para mostrar los hechos directamente como texto sin deserialización.

- **Referencia:** Russell & Norvig, AIMA 4ª ed., cap. 7 (Agentes basados en conocimiento, lógica proposicional).

---

### 2026-05-22 — Fase 4: Closed World Assumption y monotónica acumulación de hechos

**Decisión:** La KB es monotónica (solo crece). No se retractan hechos cuando el mundo cambia (dinamismo). La excepción práctica: `MaybeDanger(x,y)` no se retracta cuando `Safe(x,y)` llega, pero ambos coexisten en la KB.

- **Alternativas consideradas:**
  - Truth Maintenance System (TMS): retracta automáticamente hechos derivados cuando se retracta un soporte. Correcto pero costoso de implementar para un proyecto académico.
  - Retracción manual en eventos específicos (ej. víctima rescatada → retractar VictimAt): se implementará en Fase 6 (planificación STRIPS) cuando se modelen los efectos de las acciones.
  - CWA sin retracción (elegido): simple, suficiente para demostrar forward chaining en un entorno casi-estático.

- **Justificación:** El dinamismo del mapa es bajo (configurable, default 15% de probabilidad cada 10 pasos). La KB puede quedar desactualizada en escenarios de alto dinamismo, pero esto es exactamente la motivación para el módulo de incertidumbre bayesiana (Fase 7), que trabaja sobre las CREENCIAS probabilísticas y no sobre la KB lógica.

- **Referencia:** Russell & Norvig, AIMA 4ª ed., cap. 7.5 (Wumpus World), cap. 12.6 (Gestión de creencias temporales).

---

### 2026-05-22 — Fase 4: Tres reglas de encadenamiento hacia adelante

**Decisión:** Implementar exactamente tres reglas en el motor de forward chaining:
- R1: `Visited(x,y) ∧ ¬BreezeAt(x,y) → Safe(nx,ny)` para todos los vecinos ortogonales.
- R2: `BreezeAt(x,y) → MaybeDanger(nx,ny)` para vecinos que no sean `Safe` ni `ConfirmedDanger`.
- R3: `BreezeAt(x,y) ∧ |vecinos_inseguros| = 1 → ConfirmedDanger(nx,ny)`.

- **Alternativas consideradas:**
  - Añadir regla de resolución (PL-Resolution) para inferencias más profundas: justificado académicamente pero implica representar la KB en forma clausal, lo que complica el panel de UI.
  - Solo R1 y R2, sin R3: el agente nunca podría confirmar un peligro por eliminación, lo que haría la KB menos interesante como demostración académica.
  - Reglas para `ConfirmedVictim` por sensor: descartado porque el sensor de víctimas ya trabaja sobre el mundo real (el agente puede verlas directamente en el radio de visión).

- **Justificación:** Las tres reglas son directamente derivadas del Wumpus World clásico adaptado a SARA. R3 es la más didáctica porque demuestra razonamiento por eliminación — una inferencia no obvia que el agente realiza sin ver el peligro directamente.

- **Referencia:** Russell & Norvig, AIMA 4ª ed., cap. 7.2 (Wumpus World), cap. 7.5 (Forward chaining).

---

### 2026-05-22 — Fase 5: BFS estándar (pasos) vs UCS (costo)

**Decisión:** Implementar BFS estándar que minimiza número de pasos, no Uniform Cost Search (UCS) que minimizaría el costo total.

- **Alternativas consideradas:**
  - UCS: encuentra el camino de menor costo (incluyendo penalizaciones por peligro). Correcto para comparar costos, pero sus nodos expandidos son difíciles de interpretar en paralelo con A*.
  - BFS (elegido): minimiza pasos. La diferencia con A* en la tabla de comparativa es más intuitiva: BFS puede elegir pasar por celdas peligrosas si están en el camino más corto en pasos, mientras A* las evita porque tiene mayor costo.

- **Justificación:** El contraste didáctico principal es: BFS ignora riesgos (solo cuenta pasos), A* los considera. Esto ilustra claramente la ventaja del conocimiento heurístico. Si ambos optimizaran costo, la comparativa sería menos clara.

- **Referencia:** Russell & Norvig, AIMA 4ª ed., cap. 3.4 (Búsqueda en anchura), cap. 3.5 (UCS).

---

### 2026-05-22 — Fase 5: Heurística A* inadmisible pero consciente del riesgo

**Decisión:** `h(n) = manhattan(n, goal) + λ * riesgo_en_L_path(n, goal)` donde λ=0.5. Esta heurística puede sobreestimar el costo real → A* inadmisible (no garantiza camino óptimo).

- **Alternativas consideradas:**
  - h(n) = manhattan puro: admisible, camino óptimo garantizado, pero ignora el riesgo → no diferente al BFS en muchos casos.
  - Penalización en el costo de paso g(n) solo: correctamente modela el riesgo pero la heurística no guía al agente lejos de peligros → convergencia más lenta.
  - h(n) = Manhattan + λ * riesgo (elegido): la heurística activamente dirige la búsqueda lejos de zonas peligrosas, lo que visualmente es más impactante en la UI.

- **Justificación:** Para el proyecto académico, demostrar que el agente evita peligros activamente es más valioso que la garantía de optimalidad. La inadmisibilidad se documenta explícitamente en el panel de comparativa como tradeoff intencional.

- **Referencia:** Russell & Norvig, AIMA 4ª ed., cap. 3.6 (A*), nota sobre heurísticas inadmisibles.

---

### 2026-05-22 — Fase 7: Actualización bayesiana del sensor de brisa

**Decisión:** Usar actualización bayesiana incremental (un paso por posición visitada) sobre los vecinos ortogonales del agente, con overrides del KB al final.

- **Fórmula:** P(D|B) = P(B|D)·P(D) / [P(B|D)·P(D) + P(B|¬D)·P(¬D)] donde P(B|D) = 1 - FN = 0.9, P(B|¬D) = FP = 0.05.
- **Prior:** P(danger) = 0.15 para celdas no observadas.
- **Overrides KB:** `Safe(x,y)` → belief = 0, `ConfirmedDanger(x,y)` → belief = 1 (más fuertes que la actualización bayesiana).
- **Resultado observado:** Con reglas de forward chaining activas, los peligros se confirman rápidamente y las creencias convergen a 0%/100%. Los valores intermedios (0.05–0.95) son visibles antes de que R3 confirme o R1 descarte la celda.

- **Referencia:** Russell & Norvig, AIMA 4ª ed., cap. 13 (Razonamiento probabilístico), cap. 4.4 (Wumpus con incertidumbre).

---

### 2026-05-22 — Fase 5: Celdas desconocidas = transitables con penalización

**Decisión:** Las celdas no en `knownCells` se tratan como transitables con `costo = 1 + UNKNOWN_PENALTY (2)` en A*. BFS las trata como costo 1 (sin penalización adicional).

- **Justificación:** El principio de observabilidad parcial exige que la búsqueda opere sobre lo que el agente SABE, no sobre la realidad. Una celda desconocida podría ser un obstáculo (inaccesible) o libre. Asumir que es libre con penalización implementa el balance entre "no puedo ir por ahí" (pesimismo) y "podría ser libre" (optimismo). La penalización de 2 en A* hace que el agente prefiera rutas por celdas conocidas-seguras cuando existen.

- **Referencia:** Russell & Norvig, AIMA 4ª ed., cap. 4.4 (Búsqueda en espacios parcialmente observables).

---

### 2026-05-23 — Fase 8: Función de utilidad y toma de decisiones

**Decisión:** Función de utilidad multicriterio que evalúa tres tipos de acción: RESCUE, EXPLORE, RECHARGE. El agente elige la acción de mayor utilidad en cada ciclo de decisión.

- **Alternativas consideradas:**
  - Máquina de estados finita (FSM): simple, predecible, pero no escala con múltiples criterios simultáneos.
  - Árbol de comportamiento (BT): más expresivo que FSM, pero requiere diseño manual de prioridades. La función de utilidad las calcula automáticamente.
  - Función de utilidad aditiva: elegida por su transparencia y fácil depuración (cada componente visible en el panel).

- **Fórmula general:** `U(acción) = recompensa_base − costo_viaje − costo_peligro`
  - `costo_viaje = dist_manhattan × moveCost`
  - `costo_peligro = Σ P(danger_i) × daño_promedio` sobre celdas del camino en L
  - `recompensa_base(rescue) = rewardWeights.victim`
  - `recompensa_base(explore) = explore × fracci_desconocida × 20` → decrece conforme se mapea el mundo
  - `recompensa_base(recharge) = rechargeLow × (1 + 10 × urgencia_cúbica)`

- **Urgencia de recarga cúbica:** `urgency = (1 − E/E_max)³`
  - `urgency(100%) = 0.0` → estación irrelevante a energía llena
  - `urgency(25%)  = 0.42` → prioridad alta
  - `urgency(15%)  = 0.61` → urgencia crítica
  - La función cúbica hace que la recarga sea irrelevante a energía alta y dominante a energía crítica, evitando viajes innecesarios a la estación.

- **Integración en PlanController:** `evaluateActions` se llama en dos momentos: plan exhausto (currentIdx fuera de rango) y plan fallido. El resultado se guarda en `agentStore.actionUtilities` para visualización. El plan resultante usa:
  - `best.type === 'rescue'` → `buildPlan` (A* hacia víctima + RESCUE)
  - `best.type === 'recharge'` → `buildMovePlan(best.goal, ...)` (MOVE a estación)
  - `best.type === 'explore'` → `buildExplorationPlan` (frontera BFS)
  - Fallback: si el plan preferido falla (sin camino), intentar rescue o explore alternativamente.

- **Visualización en BrainPanel:** Sección "Utilidad" muestra las tres acciones evaluadas ordenadas por utilidad descendente con barra de progreso relativa. La acción elegida (top) se marca con ▶. El campo "Modo" en Plan STRIPS refleja la acción activa: rescatar / recargar / explorar.

- **Referencia:** Russell & Norvig, AIMA 4ª ed., cap. 16 (Toma de decisiones bajo incertidumbre), cap. 2.4 (Agentes basados en utilidad).

---

### 2026-05-23 — Fase 9: Aprendizaje por refuerzo (Q-Learning)

**Decisión:** Q-Learning tabular para la selección de tipo de acción (rescue/explore/recharge), combinado con la función de utilidad existente. El agente mejora sus decisiones con la experiencia acumulada entre episodios.

- **Alternativas consideradas:**
  - FSM con reglas adaptativas: no aprende, solo cambia estado por umbral fijo.
  - Q-Learning puro (sin utilidad): empieza desde cero, episodios iniciales muy pobres — malo para demo.
  - Redes neuronales (DQN): excesivo para 18 estados; Q-tabla suficiente y más interpretable.
  - **Q-Learning + función de utilidad (elegido):** La utilidad garantiza buen comportamiento desde el episodio 1; el Q refina con experiencia.

- **Espacio de estados:** 18 estados discretizados (2 × 3 × 3):
  - `hasVictim` ∈ {0, 1}: ¿hay VictimAt(·) en la KB?
  - `energyBucket` ∈ {0=low<30%, 1=mid 30-70%, 2=high>70%}
  - `exploredBucket` ∈ {0=low<33%, 1=mid 33-66%, 2=high>66%}
  - Clave de estado: `"${hasVictim}_${energyBucket}_${exploredBucket}"`

- **Selección de acción (ε-greedy combinado):**
  - `score(a) = utility(a) + 0.5 × Q(s, a)`
  - Con probabilidad ε: acción aleatoria (exploración)
  - Con probabilidad 1-ε: `argmax score(a)` (explotación)

- **Función de recompensa (retrasada por período):**
  - `R = ΔRescatados × 100 + ΔExploradas × 5 + ΔPasos × (−1)`
  - Muerte: `R += −50` (bonus negativo único)
  - La recompensa se calcula al inicio de la siguiente decisión, cubriendo todo el período desde la decisión anterior.

- **Actualización Q (ecuación de Bellman):**
  `Q(s,a) ← Q(s,a) + α × [R + γ × max_a'Q(s',a') − Q(s,a)]`
  - `α = 0.1` (decae ×0.999 por episodio → min 0.01)
  - `γ = 0.9`
  - `ε = 0.3` (decae ×0.995 por episodio → min 0.01)

- **Persistencia entre episodios:** `learningStore.ts` no se reinicia con "Reiniciar". El botón Reiniciar llama `nextEpisode(rescued, steps, survived)` que registra el resultado y decae ε y α. La Q-table acumula experiencia indefinidamente.

- **Puntos de decisión en PlanController:**
  1. Plan exhausto (currentIdx fuera de rango): `decideNextPlan()` actualiza Q y selecciona acción.
  2. Plan fallido (estado 'failed'): ídem.
  3. Post-rescate: después de eliminar una víctima, `decideNextPlan()` elige la siguiente acción.
  4. Muerte por energía: actualiza Q con penalización de muerte y llama `nextEpisode()`.

- **Visualización en BrainPanel:** Sección "Q-Learning" muestra:
  - Parámetros actuales: ε, α, episodio, estados visitados (n/18)
  - Estado Q actual (clave discretizada)
  - Q-values del estado actual con barras relativas por acción
  - Historial de últimos 20 episodios (rescatados, pasos, supervivencia)

- **Referencia:** Russell & Norvig, AIMA 4ª ed., cap. 22 (Aprendizaje por refuerzo), sección 22.3 (Q-learning tabular).

---

### 2026-05-23 — Fase 10: Entrenamiento Turbo + Gráficas de Convergencia

**Decisión:** Modo de entrenamiento headless que ejecuta N episodios completos de forma síncrona (sin React, sin canvas, sin delays) para demostrar la convergencia del Q-Learning en segundos en lugar de minutos.

- **Alternativas consideradas:**
  - Web Worker: aislamiento real de hilos, pero requiere serialización de Q-table y coordinación compleja.
  - `setInterval` con un episodio por tick: demasiado lento, el render del canvas agrega latencia por paso.
  - **Lotes con `setTimeout(0)` (elegido):** El runner headless `runTurboEpisode` es puro (no toca React ni Zustand), se llama sincrónicamente en lotes de 10 episodios dentro de un `async` con `await new Promise(r => setTimeout(r, 0))` entre lotes. Esto cede el control al browser para actualizar la barra de progreso sin bloquear la pestaña.

- **Arquitectura del runner headless (`src/lib/agent/turbo.ts`):**
  - Recibe: `initialGrid`, `agentStart`, `qTable`, `epsilon`, `alpha`
  - Estado cognitivo fresco por episodio (knownCells vacío, kbFacts vacío, beliefs vacío)
  - Espeja exactamente la lógica de `PlanController.tsx` con datos puros
  - Máximo `DEFAULTS.maxStepsPerEpisode` (500) ticks por episodio
  - Retorna: `rescued`, `steps`, `survived`, `qTable` actualizada
  - Importa: `runAgentCycle`, `applyMoveAction`, `maybeReplan`, `buildPlan/ExplorationPlan/MovePlan`, `getCell/setCell`, `tickDynamism`, `evaluateActions`, `extractState/selectAction/updateQ`

- **Estado de turbo en `learningStore`:**
  - `isRunningTurbo: boolean` — activa la barra de progreso y deshabilita botones
  - `turboProgress: { current, total } | null` — actualizado cada lote para el porcentaje
  - `applyTurboResults(results, finalQTable, finalEpsilon, finalAlpha)` — integra todos los resultados al finalizar, guarda hasta 200 registros en historial (vs 20 del modo interactivo)

- **Diferencia turbo vs interactivo (Reiniciar):**
  - Turbo: conocimiento vacío por episodio (estándar RL — el agente aprende independientemente del mapa)
  - Reiniciar interactivo: conserva KB/knownCells (útil para demostrar transferencia de conocimiento)
  - Esto hace que turbo sea más exigente y la convergencia más significativa

- **Gráficas de convergencia (Recharts):**
  - Se renderizan cuando `episodeHistory.length > 1`
  - `LineChart` rescatados/episodio: muestra si el agente mejora su tasa de rescate con el tiempo
  - `LineChart` pasos/episodio: muestra eficiencia (menos pasos = política más directa)
  - Sin dots (dot={false}) para no saturar con 100+ episodios
  - Paleta blueprint: victim color para rescatados, accent-info para pasos, sin gradientes ni sombras

- **Resultado esperado tras 100 episodios turbo:**
  - Q-values explore y recharge dominantes (el mapa se explora antes de encontrar víctimas)
  - ε decaído de 0.300 a ~0.230 (menos exploración aleatoria, más explotación)
  - α decaído de 0.100 a ~0.095 (tasa de aprendizaje más conservadora)
  - 11-18/18 estados visitados según el comportamiento emergente

- **Referencia:** Sutton & Barto, "Reinforcement Learning: An Introduction" 2ª ed., cap. 6 (TD Learning), sección 6.5 (Q-learning: Off-policy TD Control).
