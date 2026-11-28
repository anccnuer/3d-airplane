import { cn } from '../../lib/utils';

interface CodeChipProps {
  code: string;
  label?: string;
  className?: string;
}

/** 房间码纸票：虚线边 + 纸底 + 等宽前缀标签。 */
export function CodeChip({ code, label = 'CODE', className }: CodeChipProps) {
  return (
    <span className={cn('code-chip inline-flex items-center gap-2 px-3 py-1.5', className)}>
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">{label}</span>
      <span className="font-mono text-sm font-semibold tracking-[0.14em] text-ink">{code}</span>
    </span>
  );
}
