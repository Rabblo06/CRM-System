import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-sm text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'text-white shadow-sm',
        destructive: 'bg-[#D45353] text-white hover:bg-[#C04040]',
        outline: 'border border-[#EBEBEB] bg-white text-[#333333] hover:bg-[#F1F1F1] hover:border-[#D6D6D6]',
        secondary: 'bg-[#F1F1F1] text-[#333333] hover:bg-[#EBEBEB]',
        ghost: 'text-[#666666] hover:bg-[#F1F1F1] hover:text-[#333333]',
        link: 'text-[#4762D5] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-8 px-3 py-1.5',
        sm: 'h-7 px-2.5',
        lg: 'h-9 px-5 text-sm',
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
    const defaultStyle = isDefault ? { backgroundColor: '#4762D5', ...style } : style;
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        style={defaultStyle}
        onMouseEnter={(e) => {
          if (isDefault) (e.currentTarget as HTMLElement).style.backgroundColor = '#3A52C0';
          props.onMouseEnter?.(e as React.MouseEvent<HTMLButtonElement>);
        }}
        onMouseLeave={(e) => {
          if (isDefault) (e.currentTarget as HTMLElement).style.backgroundColor = '#4762D5';
          props.onMouseLeave?.(e as React.MouseEvent<HTMLButtonElement>);
        }}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
