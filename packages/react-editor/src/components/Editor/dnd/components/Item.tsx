import React, { useEffect } from 'react';
import type { DraggableSyntheticListeners } from '@dnd-kit/core';
import type { Transform } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from "class-variance-authority";
import { Handle } from './Handle';
import { Remove } from './Remove';

// const itemWrapperVariants = cva(
//   "flex box-border touch-manipulation origin-[0_0]",
//   {
//     variants: {
//       isDragOverlay: {
//         true: "z-[999] [--scale:1.05] [--box-shadow-picked-up:0_0_0_calc(1px/var(--scale-x,1))_rgba(63,63,68,0.05),-1px_0_15px_0_rgba(34,33,81,0.01),0px_15px_15px_0_rgba(34,33,81,0.25)]",
//       },
//       isFadeIn: {
//         true: "animate-fadeIn",
//       }
//     }
//   }
// );

const itemVariants = cva(
  // "relative flex flex-grow items-center px-5 py-[18px] bg-background shadow-[0_0_0_calc(1px/var(--scale-x,1))_rgba(63,63,68,0.05),0_1px_calc(3px/var(--scale-x,1))_0_rgba(34,33,81,0.15)] outline-none rounded-[calc(4px/var(--scale-x,1))] box-border list-none origin-center touch-transparent text-foreground font-normal text-base whitespace-nowrap transition-shadow duration-200 ease-[cubic-bezier(0.18,0.67,0.6,1.22)]",
  "relative flex flex-grow items-center px-5 py-[18px] bg-background shadow-[0_0_0_calc(1px/var(--scale-x,1))_rgba(63,63,68,0.05),0_1px_calc(3px/var(--scale-x,1))_0_rgba(34,33,81,0.15)] outline-none rounded-[calc(4px/var(--scale-x,1))] box-border list-none origin-center text-foreground font-normal text-base whitespace-nowrap",
  // {
  //   variants: {
  //     withHandle: {
  //       true: "",
  //       false: "touch-manipulation cursor-grab"
  //     },
  //     isDragging: {
  //       true: "opacity-50 z-0"
  //     },
  //     isDisabled: {
  //       true: "text-neutral-500 bg-neutral-100 cursor-not-allowed"
  //     },
  //     isDragOverlay: {
  //       true: "cursor-inherit animate-pop [transform:scale(var(--scale))] [box-shadow:var(--box-shadow-picked-up)] opacity-100"
  //     },
  //     hasColor: {
  //       true: "before:content-[''] before:absolute before:top-1/2 before:-translate-y-1/2 before:left-0 before:h-full before:w-[3px] before:block before:rounded-l-[3px] before:[background-color:var(--color)]"
  //     }
  //   },
  //   compoundVariants: [
  //     {
  //       isDragging: true,
  //       isDragOverlay: false,
  //       class: "focus:shadow-[0_0_0_calc(1px/var(--scale-x,1))_rgba(63,63,68,0.05),0_1px_calc(3px/var(--scale-x,1))_0_rgba(34,33,81,0.15)]"
  //     },
  //     {
  //       isDisabled: true,
  //       class: "focus:shadow-[0_0px_4px_1px_rgba(0,0,0,0.1),0_0_0_calc(1px/var(--scale-x,1))_rgba(63,63,68,0.05),0_1px_calc(3px/var(--scale-x,1))_0_rgba(34,33,81,0.15)]"
  //     }
  //   ]
  // }
);

const actionsVariants = cva(
  "flex self-start -mt-3 ml-auto -mb-[15px] -mr-[10px]",
  {
    variants: {
      variant: {
        default: ""
      }
    }
  }
);

export interface ItemProps extends VariantProps<typeof itemVariants> {
  dragOverlay?: boolean;
  color?: string;
  disabled?: boolean;
  dragging?: boolean;
  handle?: boolean;
  handleProps?: any;
  height?: number;
  index?: number;
  fadeIn?: boolean;
  transform?: Transform | null;
  listeners?: DraggableSyntheticListeners;
  sorting?: boolean;
  style?: React.CSSProperties;
  transition?: string | null;
  wrapperStyle?: React.CSSProperties;
  value: React.ReactNode;
  onRemove?(): void;
}

export const Item = React.memo(
  React.forwardRef<HTMLDivElement, ItemProps>(
    (
      {
        color,
        dragOverlay,
        // dragging,
        // disabled,
        // fadeIn,
        handle,
        handleProps,
        // height,
        index,
        listeners,
        onRemove,
        // sorting,
        // style,
        transition,
        transform,
        value,
        // wrapperStyle,
        // ...props
      },
      ref
    ) => {
      useEffect(() => {
        if (!dragOverlay) {
          return;
        }

        document.body.style.cursor = 'grabbing';

        return () => {
          document.body.style.cursor = '';
        };
      }, [dragOverlay]);

      return (
        <div className="outer">
          <div
            // className={cn(
            //   itemWrapperVariants({
            //     isDragOverlay: dragOverlay,
            //     isFadeIn: fadeIn
            //   })
            // )}
            style={
              {
                // ...wrapperStyle,
                // transition: [transition, wrapperStyle?.transition]
                transition: [transition]
                  .filter(Boolean)
                  .join(', '),
                '--translate-x': transform
                  ? `${Math.round(transform.x)}px`
                  : undefined,
                '--translate-y': transform
                  ? `${Math.round(transform.y)}px`
                  : undefined,
                '--scale-x': transform?.scaleX
                  ? `${transform.scaleX}`
                  : undefined,
                '--scale-y': transform?.scaleY
                  ? `${transform.scaleY}`
                  : undefined,
                '--index': index,
                '--color': color,
                transform: `translate3d(var(--translate-x, 0), var(--translate-y, 0), 0) scaleX(var(--scale-x, 1)) scaleY(var(--scale-y, 1))`
              } as React.CSSProperties
            }
            ref={ref}
          >
            <div
              className={cn(
                itemVariants({
                  // withHandle: handle,
                  // isDragging: dragging,
                  // isDisabled: disabled,
                  // isDragOverlay: dragOverlay,
                  // hasColor: Boolean(color)
                })
              )}
              // style={style}
              data-cypress="draggable-item"
            // {...(!handle ? listeners : undefined)}
            // {...props}
            // tabIndex={!handle ? 0 : undefined}
            >
              {value}
              <span className={cn(actionsVariants())}>
                {onRemove && (
                  <Remove
                    onClick={onRemove}
                    className="invisible group-hover:visible"
                  />
                )}
                {handle && handleProps && (
                  <Handle {...handleProps} {...listeners} />
                )}
              </span>
            </div>
          </div>
        </div>
      );
    }
  )
);

Item.displayName = "Item";