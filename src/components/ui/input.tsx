import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, style, onFocus, onBlur, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-8 w-full rounded border px-3 py-1 text-xs transition-colors file:border-0 file:bg-transparent file:text-xs file:font-medium placeholder:text-[#99ACC2] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        style={{
          borderColor: '#CBD6E2',
          backgroundColor: '#ffffff',
          color: '#2D3E50',
          ...style,
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = '#FF7A59';
          e.currentTarget.style.boxShadow = '0 0 0 1px rgba(255,122,89,0.25)';
          onFocus?.(e);
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = '#CBD6E2';
          e.currentTarget.style.boxShadow = '';
          onBlur?.(e);
        }}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
