import { cn } from '../../lib/utils';

export type SignalStatus = 'connected' | 'connecting' | 'disconnected';

interface SignalMeterProps {
  status: SignalStatus;
  label?: string;
}

const SEGMENTS = 5;

const statusText: Record<SignalStatus, string> = {
  connected: '信号正常',
  connecting: '正在同步',
  disconnected: '未连接'
};

/** 服务器连接状态：分段竖条仪表，附文字标签（不靠颜色单独表意）。 */
export function SignalMeter({ status, label = 'SERVER' }: SignalMeterProps) {
  const filled = status === 'connected' ? SEGMENTS : status === 'connecting' ? 3 : 0;
  const tone = status === 'connected' ? 'text-success' : status === 'connecting' ? 'text-accent' : 'text-ink-dim';

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-7 items-end gap-1" role="img" aria-label={statusText[status]}>
        {Array.from({ length: SEGMENTS }, (_, index) => {
          const active = index < filled;
          return (
            <span
              key={index}
              className={cn(
                'w-1.5 rounded-sm transition-all duration-300',
                active
                  ? status === 'connected'
                    ? 'h-7 bg-success'
                    : 'h-5 bg-accent animate-pulse-soft'
                  : 'h-1.5 bg-surface-inset'
              )}
            />
          );
        })}
      </div>
      <span className={cn('font-mono text-xs', tone)}>{statusText[status]}</span>
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-dim">{label}</span>
    </div>
  );
}
