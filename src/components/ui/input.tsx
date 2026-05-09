import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, style, onFocus, onBlur, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-8 w-full rounded-sm border px-3 py-1 text-xs transition-colors file:border-0 file:bg-transparent file:text-xs file:font-medium placeholder:text-[#B3B3B3] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        style={{
          borderColor: '#EBEBEB',
          backgroundColor: '#FFFFFF',
          color: '#333333',
          ...style,
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = '#4762D5';
          e.currentTarget.style.boxShadow = '0 0 0 2px rgba(71,98,213,0.12)';
          onFocus?.(e);
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = '#EBEBEB';
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
