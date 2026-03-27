import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "../Popover";
import type { FontEntry } from "@/types/font.types";

const PREVIEW_LINK_PREFIX = "courier-font-preview-";

function extractPrimaryName(fontFamily: string): string {
  return fontFamily.split(",")[0].trim().replace(/'/g, "");
}

export interface FontSelectProps {
  fonts: FontEntry[];
  value: string;
  defaultValue: string;
  onChange: (fontFamily: string) => void;
  className?: string;
}

export function FontSelect({ fonts, value, defaultValue, onChange, className }: FontSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLButtonElement>(null);

  const primaryName = extractPrimaryName(value);
  const selectedFont = fonts.find((f) => f.name === primaryName);
  const displayName = selectedFont?.name ?? (primaryName || value);

  const getThemeContainer = () => {
    return (
      (containerRef.current?.closest(".theme-container") as HTMLElement) ??
      (document.querySelector(".theme-container") as HTMLElement) ??
      document.body
    );
  };

  // Load lightweight preview stylesheets for all Google Fonts so
  // each dropdown item renders in its actual typeface.
  useEffect(() => {
    const linkIds: string[] = [];
    for (const font of fonts) {
      if (!font.previewUrl) continue;
      const linkId = PREVIEW_LINK_PREFIX + font.name.replace(/\s/g, "-");
      if (document.getElementById(linkId)) continue;
      const link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      link.href = font.previewUrl;
      document.head.appendChild(link);
      linkIds.push(linkId);
    }
    return () => {
      for (const id of linkIds) {
        document.getElementById(id)?.remove();
      }
    };
  }, [fonts]);

  const sortedFonts = [...fonts].sort((a, b) => a.name.localeCompare(b.name));

  const handleSelect = (fontFamily: string) => {
    onChange(fontFamily);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          ref={containerRef}
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "courier-flex courier-w-full courier-items-center courier-justify-between courier-rounded-md courier-border-none courier-bg-secondary courier-text-secondary-foreground courier-p-1.5 courier-text-sm courier-cursor-pointer hover:courier-bg-accent focus-visible:courier-outline-none",
            className
          )}
        >
          <span
            className="courier-truncate"
            style={{ fontFamily: selectedFont?.fontFamily ?? value || defaultValue }}
          >
            {displayName}
          </span>
          <ChevronDown className="courier-h-4 courier-w-4 courier-shrink-0 courier-opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        portalProps={{
          container: typeof window !== "undefined" ? getThemeContainer() : undefined,
        }}
        className="courier-w-[var(--radix-popover-trigger-width)] courier-p-1 courier-max-h-[300px] courier-overflow-y-auto"
        align="start"
      >
        {sortedFonts.map((font) => (
          <FontSelectItem
            key={font.fontFamily}
            name={font.name}
            fontFamily={font.fontFamily}
            isSelected={font.name === primaryName}
            onSelect={() => handleSelect(font.fontFamily)}
          />
        ))}
      </PopoverContent>
    </Popover>
  );
}

function FontSelectItem({
  name,
  fontFamily,
  isSelected,
  onSelect,
}: {
  name: string;
  fontFamily: string;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "courier-relative courier-flex courier-w-full courier-cursor-default courier-select-none courier-items-center courier-rounded-sm courier-px-2 courier-py-1.5 courier-text-sm courier-outline-none hover:courier-bg-accent hover:courier-text-foreground",
        isSelected && "courier-bg-accent"
      )}
      onClick={onSelect}
    >
      <span className="courier-flex courier-items-center courier-gap-2 courier-w-full">
        <span className="courier-w-4 courier-flex courier-items-center courier-justify-center courier-shrink-0">
          {isSelected && <Check className="courier-h-4 courier-w-4" />}
        </span>
        <span className="courier-truncate" style={{ fontFamily }}>
          {name}
        </span>
      </span>
    </button>
  );
}
