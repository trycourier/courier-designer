import { Button } from "@/components/ui-kit";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui-kit/DropdownMenu";
import { ChevronDown } from "lucide-react";
import type { RefObject } from "react";
import { useMemo } from "react";

export interface ContentTypePickerOption {
  label: string;
  id: string;
  type: "option";
  disabled: () => boolean;
  isActive: () => boolean;
  onClick: () => void;
  icon?: keyof typeof ChevronDown;
}

export interface ContentTypePickerCategory {
  label: string;
  id: string;
  type: "category";
}

export type ContentPickerOptions = Array<ContentTypePickerOption | ContentTypePickerCategory>;

export interface ContentTypePickerProps {
  options: ContentPickerOptions;
  containerRef?: RefObject<HTMLDivElement>;
}

const isOption = (
  option: ContentTypePickerOption | ContentTypePickerCategory
): option is ContentTypePickerOption => option.type === "option";

export const ContentTypePicker = ({ options, containerRef }: ContentTypePickerProps) => {
  const activeItem = useMemo(
    () => options.find((option) => option.type === "option" && option.isActive()),
    [options]
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="courier-flex courier-items-center courier-justify-center courier-font-normal"
        >
          {activeItem?.label || "Normal text"}
          <ChevronDown className="courier-w-3 courier-h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent portalProps={{ container: containerRef?.current || undefined }}>
        {options.map((option) => {
          if (isOption(option)) {
            return (
              <DropdownMenuItem
                key={option.id}
                onClick={option.onClick}
                className={option.isActive() ? "courier-bg-accent courier-text-foreground" : ""}
              >
                {option.id.startsWith("heading") ? (
                  <>
                    {option.id === "heading1" ? (
                      <h1 className="courier-text-2xl courier-font-bold">{option.label}</h1>
                    ) : option.id === "heading2" ? (
                      <h2 className="courier-text-xl courier-font-bold">{option.label}</h2>
                    ) : option.id === "heading3" ? (
                      <h3 className="courier-text-lg courier-font-bold">{option.label}</h3>
                    ) : (
                      option.label
                    )}
                  </>
                ) : (
                  option.label
                )}
              </DropdownMenuItem>
            );
          }
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
