import { Plane } from 'lucide-react';
import type { PlaneConfig } from '@classroom-arena/shared';
import { cn } from '../../lib/utils';

interface PlaneCardProps {
  plane: PlaneConfig;
  active: boolean;
  onSelect: () => void;
}

/** 机型纸卡：色板 + 机型剪影 + 名称与定位，选中态为赭色描边贴纸。 */
export function PlaneCard({ plane, active, onSelect }: PlaneCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        'group flex w-full items-start gap-3 rounded-[13px_9px_14px_8px] border p-4 text-left transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70',
        active
          ? 'border-accent bg-accent-soft shadow-[0_3px_0_var(--paper-edge),0_8px_18px_var(--paper-shadow)]'
          : 'border-line bg-surface-raised hover:border-accent/70 hover:bg-surface'
      )}
    >
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[9px_7px_10px_6px] border-2"
        style={{ borderColor: plane.color, backgroundColor: `${plane.color}22`, color: plane.color }}
      >
        <Plane size={20} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 font-title text-base font-semibold text-ink">
          {plane.name}
          {active ? (
            <span className="rounded-[6px_4px_7px_5px] bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-[#fff6e6]">
              已选
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 block text-xs text-ink-muted">{plane.role}</span>
        <span className="mt-2 block text-[11px] leading-5 text-ink-muted">{plane.description}</span>
      </span>
    </button>
  );
}
