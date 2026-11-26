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
    'bg-accent text-[#1b1206] shadow-glow hover:brightness-110 active:brightness-95 disabled:bg-surface-solid disabled:text-ink-muted disabled:shadow-none',
  secondary:
    'border border-line bg-surface text-ink hover:border-line-strong hover:bg-surface-raised active:bg-surface-inset',
  ghost: 'text-ink-muted hover:bg-surface hover:text-ink active:bg-surface-inset',
  danger: 'border border-danger/40 bg-danger/15 text-danger hover:bg-danger/25'
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
        'inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-200',
        'hover:-translate-y-0.5 active:translate-y-0',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-shell',
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
