import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface SectionHeaderProps {
  /** 等宽索引，例如 SEC 01 */
  index?: string;
  label: string;
  title?: ReactNode;
  right?: ReactNode;
  className?: string;
}

/** 区块标题：等宽索引 + 小标签 + 标题，右侧可放遥测。 */
export function SectionHeader({ index, label, title, right, className }: SectionHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      <div className="flex min-w-0 items-center gap-3">
        {index ? (
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-dim">{index}</span>
        ) : null}
        <span className="label-caps !text-sky">{label}</span>
        {title ? <h2 className="font-title truncate text-lg font-semibold text-ink">{title}</h2> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}
