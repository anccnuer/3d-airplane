import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface PanelProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'inset' | 'raised';
  /** 等宽索引铭牌，例如 SEC 01 / ID-7321 */
  index?: string;
  /** 是否渲染四角角标；内凹读数区可关闭 */
  framed?: boolean;
}

const variantClasses: Record<NonNullable<PanelProps['variant']>, string> = {
  default: 'panel-shell',
  inset: 'panel-shell panel-shell--inset',
  raised: 'panel-shell panel-shell--raised'
};

/** 仪表式面板：描边 + 四角角标 + 等宽索引铭牌，替代原来的统一玻璃面板。 */
export function Panel({ children, className, variant = 'default', index, framed = true }: PanelProps) {
  return (
    <section className={cn('relative p-5', variantClasses[variant], className)}>
      {index ? <span className="panel-index">{index}</span> : null}
      {framed ? (
        <>
          <span className="panel-tick panel-tick--tl" aria-hidden="true" />
          <span className="panel-tick panel-tick--tr" aria-hidden="true" />
          <span className="panel-tick panel-tick--bl" aria-hidden="true" />
          <span className="panel-tick panel-tick--br" aria-hidden="true" />
        </>
      ) : null}
      {children}
    </section>
  );
}
