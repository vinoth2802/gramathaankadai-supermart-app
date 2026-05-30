import React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { cn } from '@lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-slate-900 text-white hover:bg-slate-800',
        secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
        outline: 'border border-slate-200 bg-white text-slate-900 hover:bg-slate-50',
        ghost: 'text-slate-900 hover:bg-slate-100',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, type = 'button', ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
      ref={ref}
      type={asChild ? undefined : type}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
      />
    );
  },
);
Button.displayName = 'Button';
export { buttonVariants };
