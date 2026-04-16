import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'text-white shadow-sm',
        destructive: 'bg-[#F2545B] text-white hover:bg-[#D94048]',
        outline: 'border border-[#CBD6E2] bg-white text-[#2D3E50] hover:bg-[#F6F9FC] hover:border-[#99ACC2]',
        secondary: 'bg-[#F0F3F7] text-[#2D3E50] hover:bg-[#DFE3EB]',
        ghost: 'text-[#516F90] hover:bg-[#F0F3F7] hover:text-[#2D3E50]',
        link: 'text-[#0091AE] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-8 px-4 py-1.5 text-xs',
        sm: 'h-7 rounded px-3 text-xs',
        lg: 'h-9 rounded-md px-6 text-sm',
        icon: 'h-8 w-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, style, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    const isDefault = !variant || variant === 'default';
    const defaultStyle = isDefault
      ? { backgroundColor: '#FF7A59', ...style }
      : style;
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        style={defaultStyle}
        onMouseEnter={(e) => {
          if (isDefault) {
            (e.currentTarget as HTMLElement).style.backgroundColor = '#E8674A';
          }
          props.onMouseEnter?.(e as React.MouseEvent<HTMLButtonElement>);
        }}
        onMouseLeave={(e) => {
          if (isDefault) {
            (e.currentTarget as HTMLElement).style.backgroundColor = '#FF7A59';
          }
          props.onMouseLeave?.(e as React.MouseEvent<HTMLButtonElement>);
        }}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
