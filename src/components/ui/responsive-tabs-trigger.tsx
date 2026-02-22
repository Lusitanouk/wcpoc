import * as React from 'react';
import { TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ResponsiveTabsTriggerProps
  extends React.ComponentPropsWithoutRef<typeof TabsTrigger> {
  icon: React.ReactNode;
  label: string;
  /** Extra content (e.g. Badge) rendered after the label */
  badge?: React.ReactNode;
  /** Breakpoint at which the label text appears. Default: "sm" */
  breakpoint?: 'sm' | 'md' | 'lg';
}

const bpClass: Record<string, string> = {
  sm: 'hidden sm:inline',
  md: 'hidden md:inline',
  lg: 'hidden lg:inline',
};

/**
 * A TabsTrigger that collapses to icon-only with a tooltip below the
 * chosen breakpoint. Above the breakpoint the full label is shown.
 */
const ResponsiveTabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsTrigger>,
  ResponsiveTabsTriggerProps
>(({ icon, label, badge, breakpoint = 'sm', className, ...props }, ref) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <TabsTrigger
        ref={ref}
        className={cn('gap-1.5 text-xs', className)}
        {...props}
      >
        {icon}
        <span className={bpClass[breakpoint]}>{label}</span>
        {badge}
      </TabsTrigger>
    </TooltipTrigger>
    <TooltipContent side="bottom" className="text-xs">
      {label}
    </TooltipContent>
  </Tooltip>
));
ResponsiveTabsTrigger.displayName = 'ResponsiveTabsTrigger';

export { ResponsiveTabsTrigger };
