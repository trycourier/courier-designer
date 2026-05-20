import { useEffect, useMemo, useRef } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../DropdownMenu";
import type { FontEntry } from "@/types/font.types";

const PREVIEW_LINK_PREFIX = "courier-font-preview-";

function extractPrimaryName(fontFamily: string): string {
  return fontFamily.split(",")[0].trim().replace(/'/g, "");
}

function sortByName(a: FontEntry, b: FontEntry): number {
  return a.name.localeCompare(b.name);
}

export interface FontSelectProps {
  fonts: FontEntry[];
  value: string;
  defaultValue: string;
  onChange: (fontFamily: string) => void;
  className?: string;
}

export function FontSelect({ fonts, value, defaultValue, onChange, className }: FontSelectProps) {
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

  const hasMultipleSourceTypes = useMemo(
    () => new Set(fonts.map((f) => f.sourceType)).size > 1,
    [fonts]
  );

  const systemFonts = useMemo(
    () => fonts.filter((f) => f.sourceType === "system").sort(sortByName),
    [fonts]
  );
  const googleFonts = useMemo(
    () => fonts.filter((f) => f.sourceType === "google").sort(sortByName),
    [fonts]
  );
  const sortedFonts = useMemo(() => [...fonts].sort(sortByName), [fonts]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          ref={containerRef}
          type="button"
          className={cn(
            "courier-flex courier-w-full courier-items-center courier-justify-between courier-rounded-md courier-border-none courier-bg-secondary courier-text-secondary-foreground courier-p-1.5 courier-text-sm courier-cursor-pointer hover:courier-bg-accent focus-visible:courier-outline-none",
            className
          )}
        >
          <span
            className="courier-truncate"
            style={{ fontFamily: selectedFont?.fontFamily ?? (value || defaultValue) }}
          >
            {displayName}
          </span>
          <ChevronDown className="courier-h-4 courier-w-4 courier-shrink-0 courier-opacity-50" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        portalProps={{
          container: typeof window !== "undefined" ? getThemeContainer() : undefined,
        }}
        className="courier-w-[var(--radix-dropdown-menu-trigger-width)] courier-max-h-[300px] courier-overflow-y-auto"
        align="start"
      >
        {hasMultipleSourceTypes ? (
          <>
            <DropdownMenuLabel className="courier-text-xs courier-text-muted-foreground">
              Email Safe Fonts
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              {systemFonts.map((font) => (
                <FontSelectItem
                  key={font.fontFamily}
                  name={font.name}
                  fontFamily={font.fontFamily}
                  isSelected={font.name === primaryName}
                  onSelect={() => onChange(font.fontFamily)}
                />
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="courier-text-xs courier-text-muted-foreground">
              Google Web Fonts
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              {googleFonts.map((font) => (
                <FontSelectItem
                  key={font.fontFamily}
                  name={font.name}
                  fontFamily={font.fontFamily}
                  isSelected={font.name === primaryName}
                  onSelect={() => onChange(font.fontFamily)}
                />
              ))}
            </DropdownMenuGroup>
          </>
        ) : (
          <DropdownMenuGroup>
            {sortedFonts.map((font) => (
              <FontSelectItem
                key={font.fontFamily}
                name={font.name}
                fontFamily={font.fontFamily}
                isSelected={font.name === primaryName}
                onSelect={() => onChange(font.fontFamily)}
              />
            ))}
          </DropdownMenuGroup>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
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
    <DropdownMenuItem
      className={cn("courier-cursor-pointer", isSelected && "courier-bg-accent")}
      onSelect={onSelect}
    >
      <span className="courier-flex courier-items-center courier-gap-2 courier-w-full">
        <span className="courier-w-4 courier-flex courier-items-center courier-justify-center courier-shrink-0">
          {isSelected && <Check className="courier-h-4 courier-w-4" />}
        </span>
        <span className="courier-truncate" style={{ fontFamily }}>
          {name}
        </span>
      </span>
    </DropdownMenuItem>
  );
}
