import React from 'react';
import { cn } from '../../lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'border border-[#8f4d2a] bg-accent text-[#fff6e6] shadow-glow hover:brightness-105 active:brightness-95 disabled:border-line disabled:bg-surface-solid disabled:text-ink-muted disabled:shadow-none',
  secondary:
    'border border-line-strong bg-surface-raised text-ink shadow-[0_2px_0_var(--paper-edge)] hover:border-accent hover:bg-surface active:bg-surface-inset',
  ghost: 'text-ink-muted hover:bg-surface-raised hover:text-ink active:bg-surface-inset',
  danger: 'border border-danger/50 bg-[#f6e4dc] text-danger hover:bg-[#f1d6ca]'
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-9 px-3 text-xs',
  md: 'h-11 px-5 text-sm',
  lg: 'h-[52px] px-7 text-base'
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex cursor-pointer items-center justify-center gap-2 rounded-[10px_8px_11px_7px] font-semibold transition-all duration-200',
        'hover:-translate-y-0.5 active:translate-y-0',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-solid',
        'disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    />
  )
);

Button.displayName = 'Button';
