import { forwardRef } from "react";
import { DropdownButton } from "../../components/Dropdown";
import { Surface } from "../../components/Surface";
import type { Command, MenuListProps } from "./SlashMenu.types";

export const MenuList = forwardRef<HTMLDivElement, MenuListProps>((props, ref) => {
  const items = props.items as Command[];

  if (!items.length) {
    return null;
  }

  return (
    <Surface ref={ref} className="text-foreground max-h-[min(80vh,24rem)] overflow-auto flex-wrap mb-8 p-2">
      <div className="grid grid-cols-1 gap-0.5">
        {items.map((item, index) => (
          <DropdownButton
            key={item.label}
            isActive={index === props.selected}
            onClick={() => props.command?.(item)}
            className="flex gap-2 p-2 hover:bg-neutral-100 items-center"
          >
            <div className="w-8 h-8 flex items-center justify-center text-neutral-400">
              {item.icon}
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-neutral-900">{item.label}</span>
              <span className="text-sm text-neutral-500">{item.description}</span>
            </div>
          </DropdownButton>
        ))}
      </div>
    </Surface>
  );
});

MenuList.displayName = "MenuList";
