import * as React from "react"
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
import { Check, ChevronRight, Circle } from "lucide-react"

import { cn } from "@/lib/utils"

const DropdownMenu = DropdownMenuPrimitive.Root

const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger

const DropdownMenuGroup = DropdownMenuPrimitive.Group

const DropdownMenuPortal = DropdownMenuPrimitive.Portal

const DropdownMenuSub = DropdownMenuPrimitive.Sub

const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup

const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
    inset?: boolean
  }
>(({ className, inset, children, ...props }, ref) => (
  <DropdownMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      "courier-flex courier-cursor-default courier-gap-2 courier-select-none courier-items-center courier-rounded-sm courier-px-2 courier-py-1.5 courier-text-sm courier-outline-none focus:courier-bg-accent data-[state=open]:courier-bg-accent [&_svg]:courier-pointer-events-none [&_svg]:courier-size-4 [&_svg]:courier-shrink-0",
      inset && "courier-pl-8",
      className
    )}
    {...props}
  >
    {children}
    <ChevronRight className="courier-ml-auto" />
  </DropdownMenuPrimitive.SubTrigger>
))
DropdownMenuSubTrigger.displayName =
  DropdownMenuPrimitive.SubTrigger.displayName

const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.SubContent
    ref={ref}
    className={cn(
      "courier-z-50 courier-min-w-[8rem] courier-overflow-hidden courier-rounded-md courier-border courier-bg-popover courier-p-1 courier-text-popover-foreground courier-shadow-lg data-[state=open]:courier-animate-in data-[state=closed]:courier-animate-out data-[state=closed]:courier-fade-out-0 data-[state=open]:courier-fade-in-0 data-[state=closed]:courier-zoom-out-95 data-[state=open]:courier-zoom-in-95 data-[side=bottom]:courier-slide-in-from-top-2 data-[side=left]:courier-slide-in-from-right-2 data-[side=right]:courier-slide-in-from-left-2 data-[side=top]:courier-slide-in-from-bottom-2",
      className
    )}
    {...props}
  />
))
DropdownMenuSubContent.displayName =
  DropdownMenuPrimitive.SubContent.displayName

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content> & {
    portalProps?: React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Portal>
  }
>(({ className, sideOffset = 4, portalProps, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal {...portalProps}>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "courier-z-50 courier-min-w-[8rem] courier-overflow-hidden courier-rounded-md courier-border courier-bg-popover courier-p-1 courier-text-popover-foreground courier-shadow-md",
        "data-[state=open]:courier-animate-in data-[state=closed]:courier-animate-out data-[state=closed]:courier-fade-out-0 data-[state=open]:courier-fade-in-0 data-[state=closed]:courier-zoom-out-95 data-[state=open]:courier-zoom-in-95 data-[side=bottom]:courier-slide-in-from-top-2 data-[side=left]:courier-slide-in-from-right-2 data-[side=right]:courier-slide-in-from-left-2 data-[side=top]:courier-slide-in-from-bottom-2",
        className
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
))
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      "courier-relative courier-flex courier-cursor-default courier-select-none courier-items-center courier-gap-2 courier-rounded-sm courier-px-2 courier-py-1.5 courier-text-sm courier-outline-none focus:courier-bg-accent focus:courier-text-foreground data-[disabled]:courier-pointer-events-none data-[disabled]:courier-opacity-50 [&>svg]:courier-size-4 [&>svg]:courier-shrink-0",
      inset && "courier-pl-8",
      className
    )}
    {...props}
  />
))
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName

const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      "courier-relative courier-flex courier-cursor-default courier-select-none courier-items-center courier-rounded-sm courier-py-1.5 courier-pl-8 courier-pr-2 courier-text-sm courier-outline-none focus:courier-bg-accent focus:courier-text-accent-foreground data-[disabled]:courier-pointer-events-none data-[disabled]:courier-opacity-50",
      className
    )}
    checked={checked}
    {...props}
  >
    <span className="courier-absolute courier-left-2 courier-flex courier-h-3.5 courier-w-3.5 courier-items-center courier-justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Check className="courier-h-4 courier-w-4" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.CheckboxItem>
))
DropdownMenuCheckboxItem.displayName =
  DropdownMenuPrimitive.CheckboxItem.displayName

const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      "courier-relative courier-flex courier-cursor-default courier-select-none courier-items-center courier-rounded-sm courier-py-1.5 courier-pl-8 courier-pr-2 courier-text-sm courier-outline-none focus:courier-bg-accent focus:courier-text-accent-foreground data-[disabled]:courier-pointer-events-none data-[disabled]:courier-opacity-50",
      className
    )}
    {...props}
  >
    <span className="courier-absolute courier-left-2 courier-flex courier-h-3.5 courier-w-3.5 courier-items-center courier-justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Circle className="courier-h-2 courier-w-2 courier-fill-current" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.RadioItem>
))
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName

const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
    inset?: boolean
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn(
      "courier-px-2 courier-py-1.5 courier-text-sm courier-font-semibold",
      inset && "courier-pl-8",
      className
    )}
    {...props}
  />
))
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn("courier-mx-1 courier-my-1 courier-h-px courier-bg-muted", className)}
    {...props}
  />
))
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName

const DropdownMenuShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn("courier-ml-auto courier-text-xs courier-tracking-widest courier-opacity-60", className)}
      {...props}
    />
  )
}
DropdownMenuShortcut.displayName = "DropdownMenuShortcut"

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
}
