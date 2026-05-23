# SARA — Notas Técnicas

> Insumo para el documento técnico final.
> Proyecto Final · Inteligencia Artificial · UMG Antigua
> Desarrollador: Eduardo José Corado Moreira
> Entrega: 24 mayo 2026

---

## Decisiones de diseño

*(Las decisiones se documentarán aquí a medida que se tomen durante las fases de desarrollo.)*

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
