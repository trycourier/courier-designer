import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "courier-inline-flex courier-h-9 courier-items-center courier-justify-center courier-rounded-md courier-border courier-border-border courier-bg-background courier-p-[3px] courier-text-muted-foreground",
      className
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "courier-inline-flex courier-items-center courier-justify-center courier-whitespace-nowrap courier-rounded-sm courier-px-3 courier-py-1 courier-text-sm courier-font-medium courier-ring-offset-background courier-transition-all focus-visible:courier-outline-none disabled:courier-pointer-events-none disabled:courier-opacity-50 data-[state=active]:courier-bg-accent data-[state=active]:courier-text-accent-foreground",
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "courier-mt-2 courier-ring-offset-background focus-visible:courier-outline-none focus-visible:courier-ring-2 focus-visible:courier-ring-ring focus-visible:courier-ring-offset-2",
      className
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
