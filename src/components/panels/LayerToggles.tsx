'use client';

import { useUIStore } from '@/store/uiStore';

interface ToggleRowProps {
  label: string;
  active: boolean;
  onToggle: () => void;
  color?: string;
}

function ToggleRow({ label, active, onToggle, color = 'bg-blueprint-accent-data' }: ToggleRowProps) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-2 w-full text-left text-xs font-mono cursor-pointer group"
    >
      <span
        className={`w-3 h-3 rounded-sm border shrink-0 transition-colors ${
          active
            ? `${color} border-transparent`
            : 'bg-transparent border-blueprint-text-dim'
        }`}
      />
      <span className={active ? 'text-blueprint-text' : 'text-blueprint-text-dim'}>
        {label}
      </span>
    </button>
  );
}

export function LayerToggles() {
  const { showVisibility, showBeliefs, showPlan, toggleVisibility, toggleBeliefs, togglePlan } =
    useUIStore();

  return (
    <div className="border border-blueprint-border bg-blueprint-bg-elevated p-3 rounded-sm flex flex-col gap-1">
      <p className="text-blueprint-text-dim text-xs font-mono uppercase tracking-widest mb-2">
        Capas
      </p>

      <ToggleRow
        label="Visibilidad"
        active={showVisibility}
        onToggle={toggleVisibility}
        color="bg-blueprint-accent-info"
      />
      <ToggleRow
        label="Creencias"
        active={showBeliefs}
        onToggle={toggleBeliefs}
        color="bg-blueprint-accent-danger"
      />
      <ToggleRow
        label="Plan"
        active={showPlan}
        onToggle={togglePlan}
        color="bg-blueprint-accent-info"
      />
    </div>
  );
}
