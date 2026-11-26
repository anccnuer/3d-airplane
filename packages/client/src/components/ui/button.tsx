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
    'bg-cyan-400 text-slate-950 shadow-glow hover:bg-cyan-300 active:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-400 disabled:shadow-none',
  secondary:
    'border border-white/15 bg-white/[0.06] text-slate-100 hover:border-cyan-300/50 hover:bg-white/10 active:bg-white/[0.04]',
  ghost: 'text-slate-300 hover:bg-white/10 hover:text-white active:bg-white/[0.04]',
  danger: 'border border-rose-400/30 bg-rose-500/15 text-rose-200 hover:bg-rose-500/25'
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
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1220]',
        'disabled:cursor-not-allowed disabled:opacity-60',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    />
  )
);

Button.displayName = 'Button';
