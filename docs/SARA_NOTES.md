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
