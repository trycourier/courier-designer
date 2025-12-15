import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import type { ReactNode } from "react";
import { useBlockConfig } from "./useBlockConfig";
import {
  visibleBlocksAtom,
  blockDefaultsAtom,
  blockPresetsAtom,
  DEFAULT_VISIBLE_BLOCKS,
  templateEditorAtom,
} from "../TemplateEditor/store";
import { selectedNodeAtom } from "../ui/TextMenu/store";

// Mock createOrDuplicateNode
vi.mock("../utils/createOrDuplicateNode", () => ({
  createOrDuplicateNode: vi.fn(),
}));

import { createOrDuplicateNode } from "../utils/createOrDuplicateNode";

const mockCreateOrDuplicateNode = vi.mocked(createOrDuplicateNode);

describe("useBlockConfig", () => {
  let store: ReturnType<typeof createStore>;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );

  beforeEach(() => {
    store = createStore();
    // Reset atoms to default state
    store.set(visibleBlocksAtom, DEFAULT_VISIBLE_BLOCKS);
    store.set(blockDefaultsAtom, {});
    store.set(blockPresetsAtom, []);
    store.set(templateEditorAtom, null);
    store.set(selectedNodeAtom, null);
    vi.clearAllMocks();
  });

  describe("Visibility & Order", () => {
    it("should return default visible blocks initially", () => {
      const { result } = renderHook(() => useBlockConfig(), { wrapper });

      expect(result.current.visibleBlocks).toEqual(DEFAULT_VISIBLE_BLOCKS);
      expect(result.current.defaultVisibleBlocks).toEqual(DEFAULT_VISIBLE_BLOCKS);
    });

    it("should set visible blocks", () => {
      const { result } = renderHook(() => useBlockConfig(), { wrapper });

      act(() => {
        result.current.setVisibleBlocks(["text", "button", "image"]);
      });

      expect(result.current.visibleBlocks).toEqual(["text", "button", "image"]);
    });

    it("should set visible blocks with preset references", () => {
      const { result } = renderHook(() => useBlockConfig(), { wrapper });

      const blocksWithPresets = [
        "text",
        { type: "button" as const, preset: "portal" },
        "image",
        "button",
      ];

      act(() => {
        result.current.setVisibleBlocks(blocksWithPresets);
      });

      expect(result.current.visibleBlocks).toEqual(blocksWithPresets);
    });

    it("should reset visible blocks to defaults", () => {
      const { result } = renderHook(() => useBlockConfig(), { wrapper });

      // First change the blocks
      act(() => {
        result.current.setVisibleBlocks(["text"]);
      });

      expect(result.current.visibleBlocks).toEqual(["text"]);

      // Then reset
      act(() => {
        result.current.resetVisibleBlocks();
      });

      expect(result.current.visibleBlocks).toEqual(DEFAULT_VISIBLE_BLOCKS);
    });

    it("should allow empty visible blocks list", () => {
      const { result } = renderHook(() => useBlockConfig(), { wrapper });

      act(() => {
        result.current.setVisibleBlocks([]);
      });

      expect(result.current.visibleBlocks).toEqual([]);
    });

    it("should allow reordering blocks", () => {
      const { result } = renderHook(() => useBlockConfig(), { wrapper });

      // Reverse the default order
      const reversed = [...DEFAULT_VISIBLE_BLOCKS].reverse();

      act(() => {
        result.current.setVisibleBlocks(reversed);
      });

      expect(result.current.visibleBlocks).toEqual(reversed);
    });
  });

  describe("Block Defaults", () => {
    it("should return undefined for unset defaults", () => {
      const { result } = renderHook(() => useBlockConfig(), { wrapper });

      expect(result.current.getDefaults("button")).toBeUndefined();
      expect(result.current.getDefaults("text")).toBeUndefined();
    });

    it("should set defaults for a block type", () => {
      const { result } = renderHook(() => useBlockConfig(), { wrapper });

      act(() => {
        result.current.setDefaults("button", { borderRadius: "4px" });
      });

      expect(result.current.getDefaults("button")).toEqual({ borderRadius: "4px" });
    });

    it("should merge defaults when called multiple times", () => {
      const { result } = renderHook(() => useBlockConfig(), { wrapper });

      act(() => {
        result.current.setDefaults("button", { borderRadius: "4px" });
      });

      act(() => {
        result.current.setDefaults("button", { backgroundColor: "#007bff" });
      });

      expect(result.current.getDefaults("button")).toEqual({
        borderRadius: "4px",
        backgroundColor: "#007bff",
      });
    });

    it("should override existing values when setting defaults", () => {
      const { result } = renderHook(() => useBlockConfig(), { wrapper });

      act(() => {
        result.current.setDefaults("button", { borderRadius: "4px" });
      });

      act(() => {
        result.current.setDefaults("button", { borderRadius: "8px" });
      });

      expect(result.current.getDefaults("button")).toEqual({ borderRadius: "8px" });
    });

    it("should set defaults for multiple block types independently", () => {
      const { result } = renderHook(() => useBlockConfig(), { wrapper });

      act(() => {
        result.current.setDefaults("button", { borderRadius: "4px" });
        result.current.setDefaults("image", { width: 600 });
        result.current.setDefaults("text", { color: "#333" });
      });

      expect(result.current.getDefaults("button")).toEqual({ borderRadius: "4px" });
      expect(result.current.getDefaults("image")).toEqual({ width: 600 });
      expect(result.current.getDefaults("text")).toEqual({ color: "#333" });
    });

    it("should clear defaults for a block type", () => {
      const { result } = renderHook(() => useBlockConfig(), { wrapper });

      act(() => {
        result.current.setDefaults("button", { borderRadius: "4px" });
      });

      expect(result.current.getDefaults("button")).toEqual({ borderRadius: "4px" });

      act(() => {
        result.current.clearDefaults("button");
      });

      expect(result.current.getDefaults("button")).toBeUndefined();
    });

    it("should not affect other block types when clearing defaults", () => {
      const { result } = renderHook(() => useBlockConfig(), { wrapper });

      act(() => {
        result.current.setDefaults("button", { borderRadius: "4px" });
        result.current.setDefaults("image", { width: 600 });
      });

      act(() => {
        result.current.clearDefaults("button");
      });

      expect(result.current.getDefaults("button")).toBeUndefined();
      expect(result.current.getDefaults("image")).toEqual({ width: 600 });
    });
  });

  describe("Presets", () => {
    it("should return empty presets initially", () => {
      const { result } = renderHook(() => useBlockConfig(), { wrapper });

      expect(result.current.presets).toEqual([]);
    });

    it("should register a preset", () => {
      const { result } = renderHook(() => useBlockConfig(), { wrapper });

      const preset = {
        type: "button" as const,
        key: "portal",
        label: "Go to Portal",
        attributes: { href: "https://portal.example.com" },
      };

      act(() => {
        result.current.registerPreset(preset);
      });

      expect(result.current.presets).toHaveLength(1);
      expect(result.current.presets[0]).toEqual(preset);
    });

    it("should register multiple presets", () => {
      const { result } = renderHook(() => useBlockConfig(), { wrapper });

      const preset1 = {
        type: "button" as const,
        key: "portal",
        label: "Go to Portal",
        attributes: { href: "https://portal.example.com" },
      };

      const preset2 = {
        type: "button" as const,
        key: "survey",
        label: "Take Survey",
        attributes: { href: "https://survey.example.com" },
      };

      act(() => {
        result.current.registerPreset(preset1);
        result.current.registerPreset(preset2);
      });

      expect(result.current.presets).toHaveLength(2);
    });

    it("should replace preset with same type and key", () => {
      const { result } = renderHook(() => useBlockConfig(), { wrapper });

      const preset1 = {
        type: "button" as const,
        key: "portal",
        label: "Go to Portal",
        attributes: { href: "https://portal.example.com" },
      };

      const preset2 = {
        type: "button" as const,
        key: "portal",
        label: "Updated Portal",
        attributes: { href: "https://updated-portal.example.com" },
      };

      act(() => {
        result.current.registerPreset(preset1);
      });

      act(() => {
        result.current.registerPreset(preset2);
      });

      expect(result.current.presets).toHaveLength(1);
      expect(result.current.presets[0].label).toBe("Updated Portal");
      expect(result.current.presets[0].attributes.href).toBe("https://updated-portal.example.com");
    });

    it("should unregister a preset", () => {
      const { result } = renderHook(() => useBlockConfig(), { wrapper });

      const preset = {
        type: "button" as const,
        key: "portal",
        label: "Go to Portal",
        attributes: { href: "https://portal.example.com" },
      };

      act(() => {
        result.current.registerPreset(preset);
      });

      expect(result.current.presets).toHaveLength(1);

      act(() => {
        result.current.unregisterPreset("button", "portal");
      });

      expect(result.current.presets).toHaveLength(0);
    });

    it("should not affect other presets when unregistering", () => {
      const { result } = renderHook(() => useBlockConfig(), { wrapper });

      act(() => {
        result.current.registerPreset({
          type: "button",
          key: "portal",
          label: "Go to Portal",
          attributes: { href: "https://portal.example.com" },
        });
        result.current.registerPreset({
          type: "button",
          key: "survey",
          label: "Take Survey",
          attributes: { href: "https://survey.example.com" },
        });
      });

      act(() => {
        result.current.unregisterPreset("button", "portal");
      });

      expect(result.current.presets).toHaveLength(1);
      expect(result.current.presets[0].key).toBe("survey");
    });

    it("should get presets for a specific type", () => {
      const { result } = renderHook(() => useBlockConfig(), { wrapper });

      act(() => {
        result.current.registerPreset({
          type: "button",
          key: "portal",
          label: "Go to Portal",
          attributes: { href: "https://portal.example.com" },
        });
        result.current.registerPreset({
          type: "button",
          key: "survey",
          label: "Take Survey",
          attributes: { href: "https://survey.example.com" },
        });
        result.current.registerPreset({
          type: "image",
          key: "logo",
          label: "Company Logo",
          attributes: { src: "https://example.com/logo.png" },
        });
      });

      const buttonPresets = result.current.getPresetsForType("button");
      const imagePresets = result.current.getPresetsForType("image");
      const textPresets = result.current.getPresetsForType("text");

      expect(buttonPresets).toHaveLength(2);
      expect(imagePresets).toHaveLength(1);
      expect(textPresets).toHaveLength(0);
    });

    it("should register preset with custom icon", () => {
      const { result } = renderHook(() => useBlockConfig(), { wrapper });

      const customIcon = <span data-testid="custom-icon">🔗</span>;

      act(() => {
        result.current.registerPreset({
          type: "button",
          key: "link",
          label: "Link Button",
          icon: customIcon,
          attributes: { href: "https://example.com" },
        });
      });

      expect(result.current.presets[0].icon).toBe(customIcon);
    });
  });

  describe("insertBlock", () => {
    it("should warn when editor is not available", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const { result } = renderHook(() => useBlockConfig(), { wrapper });

      act(() => {
        result.current.insertBlock("button");
      });

      expect(warnSpy).toHaveBeenCalledWith(
        "[useBlockConfig] Cannot insert block: editor not available"
      );
      expect(mockCreateOrDuplicateNode).not.toHaveBeenCalled();

      warnSpy.mockRestore();
    });

    it("should insert a block when editor is available", () => {
      const mockEditor = {
        state: {
          doc: {
            content: {
              size: 100,
            },
          },
        },
      };

      store.set(templateEditorAtom, mockEditor as unknown as null);

      const { result } = renderHook(() => useBlockConfig(), { wrapper });

      act(() => {
        result.current.insertBlock("button");
      });

      expect(mockCreateOrDuplicateNode).toHaveBeenCalledWith(
        mockEditor,
        "button",
        100,
        {},
        expect.any(Function)
      );
    });

    it("should insert a block with defaults", () => {
      const mockEditor = {
        state: {
          doc: {
            content: {
              size: 50,
            },
          },
        },
      };

      store.set(templateEditorAtom, mockEditor as unknown as null);

      const { result } = renderHook(() => useBlockConfig(), { wrapper });

      act(() => {
        result.current.setDefaults("button", { borderRadius: "4px" });
      });

      act(() => {
        result.current.insertBlock("button");
      });

      expect(mockCreateOrDuplicateNode).toHaveBeenCalledWith(
        mockEditor,
        "button",
        50,
        { borderRadius: "4px" },
        expect.any(Function)
      );
    });

    it("should insert a block with preset attributes", () => {
      const mockEditor = {
        state: {
          doc: {
            content: {
              size: 0,
            },
          },
        },
      };

      store.set(templateEditorAtom, mockEditor as unknown as null);

      const { result } = renderHook(() => useBlockConfig(), { wrapper });

      act(() => {
        result.current.registerPreset({
          type: "button",
          key: "portal",
          label: "Go to Portal",
          attributes: { href: "https://portal.example.com", backgroundColor: "#007bff" },
        });
      });

      act(() => {
        result.current.insertBlock("button", "portal");
      });

      expect(mockCreateOrDuplicateNode).toHaveBeenCalledWith(
        mockEditor,
        "button",
        0,
        { href: "https://portal.example.com", backgroundColor: "#007bff" },
        expect.any(Function)
      );
    });

    it("should merge defaults and preset attributes when inserting", () => {
      const mockEditor = {
        state: {
          doc: {
            content: {
              size: 0,
            },
          },
        },
      };

      store.set(templateEditorAtom, mockEditor as unknown as null);

      const { result } = renderHook(() => useBlockConfig(), { wrapper });

      act(() => {
        result.current.setDefaults("button", { borderRadius: "4px", color: "#fff" });
        result.current.registerPreset({
          type: "button",
          key: "portal",
          label: "Go to Portal",
          attributes: { href: "https://portal.example.com", backgroundColor: "#007bff" },
        });
      });

      act(() => {
        result.current.insertBlock("button", "portal");
      });

      // Preset attributes should be merged with defaults
      expect(mockCreateOrDuplicateNode).toHaveBeenCalledWith(
        mockEditor,
        "button",
        0,
        {
          borderRadius: "4px",
          color: "#fff",
          href: "https://portal.example.com",
          backgroundColor: "#007bff",
        },
        expect.any(Function)
      );
    });

    it("should warn when preset is not found", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const mockEditor = {
        state: {
          doc: {
            content: {
              size: 0,
            },
          },
        },
      };

      store.set(templateEditorAtom, mockEditor as unknown as null);

      const { result } = renderHook(() => useBlockConfig(), { wrapper });

      act(() => {
        result.current.insertBlock("button", "nonexistent");
      });

      expect(warnSpy).toHaveBeenCalledWith(
        '[useBlockConfig] Preset "nonexistent" not found for type "button"'
      );

      // Should still insert the block, just without preset attributes
      expect(mockCreateOrDuplicateNode).toHaveBeenCalled();

      warnSpy.mockRestore();
    });

    it("should map block types to correct node types", () => {
      const mockEditor = {
        state: {
          doc: {
            content: {
              size: 0,
            },
          },
        },
      };

      store.set(templateEditorAtom, mockEditor as unknown as null);

      const { result } = renderHook(() => useBlockConfig(), { wrapper });

      // Test imageBlock mapping
      act(() => {
        result.current.insertBlock("image");
      });

      expect(mockCreateOrDuplicateNode).toHaveBeenCalledWith(
        mockEditor,
        "imageBlock",
        0,
        {},
        expect.any(Function)
      );
    });

    it("should map spacer block to divider node type with spacer attributes", () => {
      const mockEditor = {
        state: {
          doc: {
            content: {
              size: 0,
            },
          },
        },
      };

      store.set(templateEditorAtom, mockEditor as unknown as null);

      const { result } = renderHook(() => useBlockConfig(), { wrapper });

      act(() => {
        result.current.insertBlock("spacer");
      });

      // Spacer should use "divider" node type with spacer-specific attributes
      expect(mockCreateOrDuplicateNode).toHaveBeenCalledWith(
        mockEditor,
        "divider", // Uses divider node type, not "spacer"
        0,
        expect.objectContaining({
          variant: "spacer",
          color: "transparent",
          padding: 24,
        }),
        expect.any(Function)
      );
    });

    it("should allow overriding spacer defaults with user-configured defaults", () => {
      const mockEditor = {
        state: {
          doc: {
            content: {
              size: 0,
            },
          },
        },
      };

      store.set(templateEditorAtom, mockEditor as unknown as null);

      const { result } = renderHook(() => useBlockConfig(), { wrapper });

      // Set custom defaults for spacer
      act(() => {
        result.current.setDefaults("spacer", { padding: 48 });
      });

      act(() => {
        result.current.insertBlock("spacer");
      });

      // User defaults should override built-in spacer defaults
      expect(mockCreateOrDuplicateNode).toHaveBeenCalledWith(
        mockEditor,
        "divider",
        0,
        expect.objectContaining({
          variant: "spacer",
          color: "transparent",
          padding: 48, // Overridden by user default
        }),
        expect.any(Function)
      );
    });
  });

  describe("Type exports", () => {
    it("should export all necessary types", () => {
      // This is a compile-time check - if the types weren't exported, this would fail
      const { result } = renderHook(() => useBlockConfig(), { wrapper });

      // Verify the shape of the returned object matches the interface
      expect(result.current).toHaveProperty("visibleBlocks");
      expect(result.current).toHaveProperty("setVisibleBlocks");
      expect(result.current).toHaveProperty("resetVisibleBlocks");
      expect(result.current).toHaveProperty("defaultVisibleBlocks");
      expect(result.current).toHaveProperty("setDefaults");
      expect(result.current).toHaveProperty("getDefaults");
      expect(result.current).toHaveProperty("clearDefaults");
      expect(result.current).toHaveProperty("registerPreset");
      expect(result.current).toHaveProperty("unregisterPreset");
      expect(result.current).toHaveProperty("presets");
      expect(result.current).toHaveProperty("getPresetsForType");
      expect(result.current).toHaveProperty("insertBlock");
    });
  });
});
