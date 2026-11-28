import { cn } from '../../lib/utils';

export type StatTone = 'sky' | 'violet' | 'success' | 'accent';

interface StatBarProps {
  label: string;
  /** 0–1 之间的完成度 */
  value: number;
  tone?: StatTone;
  /** 右侧等宽读数，缺省显示百分比 */
  display?: string;
}

const toneClasses: Record<StatTone, string> = {
  sky: 'bg-sky',
  violet: 'bg-[#8b74a8]',
  success: 'bg-success',
  accent: 'bg-accent'
};

/** 纸面属性条：按统计项着色，方格纸轨道 + 等宽读数。 */
export function StatBar({ label, value, tone = 'sky', display }: StatBarProps) {
  const ratio = Math.min(1, Math.max(0, value));

  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-xs text-ink-muted">{label}</span>
      <div className="instrument-grid h-2 flex-1 overflow-hidden rounded-[5px_4px_6px_3px] border border-line">
        <div
          className={cn('h-full rounded-[4px_3px_5px_2px] transition-all duration-300', toneClasses[tone])}
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>
      <span className="w-10 shrink-0 text-right font-mono text-xs font-semibold text-ink">
        {display ?? String(Math.round(ratio * 100))}
      </span>
    </div>
  );
}
