import { forwardRef } from "react";
import { DropdownButton } from "../../ui/Dropdown";
import { Surface } from "../../ui/Surface";
import type { Command, MenuListProps } from "./SlashMenu.types";

export const MenuList = forwardRef<HTMLDivElement, MenuListProps>((props, ref) => {
  const items = props.items as Command[];

  if (!items.length) {
    return null;
  }

  return (
    <Surface
      ref={ref}
      className="courier-text-foreground courier-max-h-[min(80vh,24rem)] courier-overflow-auto courier-flex-wrap courier-mb-8 courier-p-2"
    >
      <div className="courier-grid courier-grid-cols-1 courier-gap-0.5">
        {items.map((item, index) => (
          <DropdownButton
            key={item.label}
            isActive={index === props.selected}
            onClick={() => props.command?.(item)}
            className="courier-flex courier-gap-2 courier-p-2 hover:courier-bg-neutral-100 courier-items-center"
          >
            <div className="courier-w-8 courier-h-8 courier-flex courier-items-center courier-justify-center courier-text-neutral-400">
              {item.icon}
            </div>
            <div className="courier-flex courier-flex-col">
              <span className="courier-text-sm courier-text-neutral-900">{item.label}</span>
              <span className="courier-text-sm courier-text-neutral-500">{item.description}</span>
            </div>
          </DropdownButton>
        ))}
      </div>
    </Surface>
  );
});

MenuList.displayName = "MenuList";
