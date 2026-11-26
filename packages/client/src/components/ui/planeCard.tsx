import { Plane } from 'lucide-react';
import type { PlaneConfig } from '@classroom-arena/shared';
import { cn } from '../../lib/utils';

interface PlaneCardProps {
  plane: PlaneConfig;
  active: boolean;
  onSelect: () => void;
}

/** 机型卡片：色板 + 机型剪影 + 名称与定位，选中态为强调色描边。 */
export function PlaneCard({ plane, active, onSelect }: PlaneCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        'group flex w-full items-start gap-3 rounded-xl p-4 text-left transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70',
        active
          ? 'border-accent bg-accent-soft shadow-glow'
          : 'border-line bg-surface-raised hover:border-line-strong hover:bg-surface'
      )}
    >
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border"
        style={{ borderColor: plane.color, backgroundColor: `${plane.color}22`, color: plane.color }}
      >
        <Plane size={20} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="font-title text-sm font-semibold text-ink">{plane.name}</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-dim">{plane.model}</span>
        </span>
        <span className="mt-0.5 block text-xs text-ink-muted">{plane.role}</span>
        <span className="mt-2 block text-[11px] leading-5 text-ink-dim">{plane.description}</span>
      </span>
    </button>
  );
}
