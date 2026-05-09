import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default:     'bg-[#EEF0FB] text-[#4762D5]',
        secondary:   'bg-[#F1F1F1] text-[#666666]',
        destructive: 'bg-[#FDEAEA] text-[#D45353]',
        success:     'bg-[#E8F7F2] text-[#4CAF8E]',
        warning:     'bg-[#FEF3E7] text-[#E8882A]',
        outline:     'border border-[#EBEBEB] text-[#666666]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
