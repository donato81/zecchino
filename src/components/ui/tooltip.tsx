import { ComponentProps } from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const tooltipVariants = cva(
  "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-md px-3 py-1.5 text-xs text-balance font-medium shadow-lg",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        accent: "bg-accent text-accent-foreground",
        muted: "bg-muted text-muted-foreground border border-border",
        banking: "bg-[oklch(0.35_0.08_250)] text-white",
        digital: "bg-[oklch(0.65_0.15_190)] text-[oklch(0.25_0.08_250)]",
        savings: "bg-[oklch(0.75_0.12_85)] text-[oklch(0.25_0.08_250)]",
        investments: "bg-[oklch(0.55_0.18_140)] text-white",
        private: "bg-[oklch(0.55_0.15_25)] text-white",
        income: "bg-income text-income-foreground",
        expense: "bg-expense text-expense-foreground",
        success: "bg-[oklch(0.75_0.12_85)] text-[oklch(0.25_0.08_250)]",
        warning: "bg-[oklch(0.80_0.15_70)] text-[oklch(0.25_0.08_250)]",
        destructive: "bg-destructive text-destructive-foreground"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
)

const tooltipArrowVariants = cva(
  "z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]",
  {
    variants: {
      variant: {
        default: "bg-primary fill-primary",
        secondary: "bg-secondary fill-secondary",
        accent: "bg-accent fill-accent",
        muted: "bg-muted fill-muted",
        banking: "bg-[oklch(0.35_0.08_250)] fill-[oklch(0.35_0.08_250)]",
        digital: "bg-[oklch(0.65_0.15_190)] fill-[oklch(0.65_0.15_190)]",
        savings: "bg-[oklch(0.75_0.12_85)] fill-[oklch(0.75_0.12_85)]",
        investments: "bg-[oklch(0.55_0.18_140)] fill-[oklch(0.55_0.18_140)]",
        private: "bg-[oklch(0.55_0.15_25)] fill-[oklch(0.55_0.15_25)]",
        income: "bg-income fill-income",
        expense: "bg-expense fill-expense",
        success: "bg-[oklch(0.75_0.12_85)] fill-[oklch(0.75_0.12_85)]",
        warning: "bg-[oklch(0.80_0.15_70)] fill-[oklch(0.80_0.15_70)]",
        destructive: "bg-destructive fill-destructive"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
)

function TooltipProvider({
  delayDuration = 200,
  ...props
}: ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  )
}

function Tooltip({
  ...props
}: ComponentProps<typeof TooltipPrimitive.Root>) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  )
}

function TooltipTrigger({
  ...props
}: ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

interface TooltipContentProps 
  extends ComponentProps<typeof TooltipPrimitive.Content>,
    VariantProps<typeof tooltipVariants> {
  hideArrow?: boolean
}

function TooltipContent({
  className,
  sideOffset = 4,
  children,
  variant,
  hideArrow = false,
  ...props
}: TooltipContentProps) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(tooltipVariants({ variant }), className)}
        {...props}
      >
        {children}
        {!hideArrow && (
          <TooltipPrimitive.Arrow 
            className={cn(tooltipArrowVariants({ variant }))} 
          />
        )}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
