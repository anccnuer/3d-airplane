import React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, hint, id, ...props }, ref) => {
    const inputId = id ?? label;

    return (
      <div className="flex w-full flex-col gap-2">
        {label ? (
          <label htmlFor={inputId} className="label-caps">
            {label}
          </label>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'h-11 w-full rounded-[10px_8px_11px_7px] border border-line-strong bg-surface-raised px-4 text-sm text-ink outline-none transition-colors',
            'placeholder:text-ink-dim hover:border-accent/60 focus:border-accent focus:ring-2 focus:ring-accent/25',
            className
          )}
          {...props}
        />
        {hint ? <p className="text-xs text-ink-dim">{hint}</p> : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
