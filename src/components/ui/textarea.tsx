import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, style, onFocus, onBlur, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded border px-3 py-2 text-xs placeholder:text-[#B3B3B3] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 resize-none',
          className
        )}
        style={{
          borderColor: '#EBEBEB',
          backgroundColor: '#ffffff',
          color: '#333333',
          ...style,
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = '#4762D5';
          e.currentTarget.style.boxShadow = '0 0 0 1px rgba(255,122,89,0.25)';
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
Textarea.displayName = 'Textarea';

export { Textarea };
