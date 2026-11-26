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
            'h-11 w-full rounded-lg border border-white/10 bg-[#0B1220]/80 px-4 text-sm text-slate-100 outline-none transition-colors',
            'placeholder:text-slate-500 hover:border-white/20 focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-400/20',
            className
          )}
          {...props}
        />
        {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
