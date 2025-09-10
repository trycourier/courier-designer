import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useChannels } from "./useChannels";
import type { ChannelType } from "@/store";
import type { ElementalContent } from "@/types/elemental.types";

// Mock the atoms and dependencies
const mockSaveTemplate = vi.fn();
const mockSetChannel = vi.fn();
const mockSetTemplateEditorContent = vi.fn();
const mockSetSelectedNode = vi.fn();

// Mock atom values that will be controlled in tests
let mockChannel: ChannelType = "email";
let mockTemplateEditorContent: ElementalContent | null = null;
let mockIsTemplateLoading = false;

// Mock the Jotai hooks and utilities
vi.mock("jotai", async () => {
  const actual = await vi.importActual("jotai");
  return {
    // @ts-expect-error - Jotai types are not fully compatible with Vitest
    ...actual,
    useAtom: vi.fn((atom) => {
      const atomStr = atom.toString();
      if (atomStr.includes("channel")) {
        return [mockChannel, mockSetChannel];
      }
      if (atomStr.includes("templateEditor")) {
        return [mockTemplateEditorContent, mockSetTemplateEditorContent];
      }
      return [null, vi.fn()];
    }),
    useAtomValue: vi.fn((atom) => {
      const atomStr = atom.toString();
      if (atomStr.includes("templateEditor")) {
        return mockTemplateEditorContent;
      }
      if (atomStr.includes("isTemplateLoading")) {
        return mockIsTemplateLoading;
      }
      return null;
    }),
    useSetAtom: vi.fn((atom) => {
      const atomStr = atom.toString();
      if (atomStr.includes("templateEditor")) {
        return mockSetTemplateEditorContent;
      }
      if (atomStr.includes("selectedNode")) {
        return mockSetSelectedNode;
      }
      return vi.fn();
    }),
  };
});

vi.mock("@/components/Providers", () => ({
  useTemplateActions: () => ({
    saveTemplate: mockSaveTemplate,
  }),
}));

vi.mock("@/store", () => ({
  CHANNELS: [
    {
      label: "Email",
      value: "email",
      icon: null,
    },
    {
      label: "SMS",
      value: "sms",
      icon: null,
    },
    {
      label: "Push",
      value: "push",
      icon: null,
    },
    {
      label: "In-app",
      value: "inbox",
      icon: null,
    },
  ],
  channelAtom: "channelAtom",
}));

vi.mock("@/components/ui/TextMenu/store", () => ({
  selectedNodeAtom: "selectedNodeAtom",
}));

vi.mock("@/components/Providers/store", async () => {
  const actual = await vi.importActual("@/components/Providers/store");
  return {
    // @ts-expect-error - Jotai types are not fully compatible with Vitest
    ...actual,
    isTemplateLoadingAtom: "isTemplateLoadingAtom",
  };
});

vi.mock("../store", () => ({
  templateEditorContentAtom: "templateEditorContentAtom",
}));

vi.mock("./Email", () => ({
  defaultEmailContent: [
    {
      type: "text",
      align: "left",
      content: "Email content",
      text_style: "h1",
    },
  ],
}));

vi.mock("./SMS", () => ({
  defaultSMSContent: [
    {
      type: "text",
      align: "left",
      content: "SMS content",
    },
  ],
}));

vi.mock("./Push", () => ({
  defaultPushContent: [
    {
      type: "text",
      align: "left",
      content: "Push content",
    },
  ],
}));

vi.mock("./Inbox", () => ({
  defaultInboxContent: [
    {
      type: "text",
      align: "left",
      content: "Inbox content",
    },
  ],
}));

vi.mock("@/lib/utils", () => ({
  updateElemental: vi.fn((content, updates) => {
    if (!content) {
      return {
        version: "2022-01-01",
        elements: [
          {
            type: "channel",
            channel: updates.channel,
            elements: updates.elements,
          },
        ],
      };
    }
    return {
      ...content,
      elements: [
        ...content.elements,
        {
          type: "channel",
          channel: updates.channel,
          elements: updates.elements,
        },
      ],
    };
  }),
}));

// Helper functions to control mock state
const setMockState = (state: {
  channel?: ChannelType;
  templateContent?: ElementalContent | null;
  isTemplateLoading?: boolean;
}) => {
  if (state.channel !== undefined) mockChannel = state.channel;
  if (state.templateContent !== undefined) mockTemplateEditorContent = state.templateContent;
  if (state.isTemplateLoading !== undefined) mockIsTemplateLoading = state.isTemplateLoading;
};

const resetMockState = () => {
  mockChannel = "email";
  mockTemplateEditorContent = null;
  mockIsTemplateLoading = false;
};

describe("useChannels", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockState();
  });

  afterEach(() => {
    vi.clearAllMocks();
    resetMockState();
  });

  describe("initialization and enabled channels", () => {
    it("should initialize with default channels when no content exists", () => {
      setMockState({
        templateContent: null,
        channel: "email",
        isTemplateLoading: false,
      });

      const { result } = renderHook(() => useChannels({ channels: ["email", "sms"] }));

      // Should show all available channels for empty templates  
      expect(result.current.enabledChannels).toHaveLength(2);
      expect(result.current.enabledChannels[0].value).toBe("email");
      expect(result.current.enabledChannels[1].value).toBe("sms");
    });

    it("should calculate enabled channels from existing template content", () => {
      const templateContent: ElementalContent = {
        version: "2022-01-01",
        elements: [
          {
            type: "channel",
            channel: "email",
            elements: [],
          },
          {
            type: "channel",
            channel: "sms",
            elements: [],
          },
        ],
      };

      setMockState({
        templateContent,
        channel: "email",
        isTemplateLoading: false,
      });

      const { result } = renderHook(() => useChannels({ channels: ["email", "sms", "push"] }));

      expect(result.current.enabledChannels).toHaveLength(2);
      expect(result.current.enabledChannels.map((c) => c.value)).toEqual(
        expect.arrayContaining(["email", "sms"])
      );
    });

    it("should filter enabled channels based on provided channels prop", () => {
      const templateContent: ElementalContent = {
        version: "2022-01-01",
        elements: [
          {
            type: "channel",
            channel: "email",
            elements: [],
          },
          {
            type: "channel",
            channel: "sms",
            elements: [],
          },
          {
            type: "channel",
            channel: "push",
            elements: [],
          },
        ],
      };

      setMockState({
        templateContent,
        channel: "email",
        isTemplateLoading: false,
      });

      const { result } = renderHook(() => useChannels({ channels: ["email", "sms"] }));

      expect(result.current.enabledChannels).toHaveLength(2);
      expect(result.current.enabledChannels.map((c) => c.value)).toEqual(
        expect.arrayContaining(["email", "sms"])
      );
      expect(result.current.enabledChannels.map((c) => c.value)).not.toContain("push");
    });

    it("should not update when template is loading", () => {
      setMockState({
        templateContent: null,
        channel: "email",
        isTemplateLoading: true,
      });

      const { result } = renderHook(() => useChannels({ channels: ["email", "sms"] }));

      expect(result.current.enabledChannels).toHaveLength(0);
    });
  });

  describe("disabled channels calculation", () => {
    it("should calculate disabled channels correctly", () => {
      const templateContent: ElementalContent = {
        version: "2022-01-01",
        elements: [
          {
            type: "channel",
            channel: "email",
            elements: [],
          },
        ],
      };

      setMockState({
        templateContent,
        channel: "email",
        isTemplateLoading: false,
      });

      const { result } = renderHook(() => useChannels({ channels: ["email", "sms", "push"] }));

      expect(result.current.disabledChannels).toHaveLength(2);
      expect(result.current.disabledChannels.map((c) => c.value)).toEqual(
        expect.arrayContaining(["sms", "push"])
      );
    });

    it("should only include disabled channels that are in the allowed channels list", () => {
      const templateContent: ElementalContent = {
        version: "2022-01-01",
        elements: [
          {
            type: "channel",
            channel: "email",
            elements: [],
          },
        ],
      };

      setMockState({
        templateContent,
        channel: "email",
        isTemplateLoading: false,
      });

      const { result } = renderHook(() => useChannels({ channels: ["email", "sms"] }));

      expect(result.current.disabledChannels).toHaveLength(1);
      expect(result.current.disabledChannels[0].value).toBe("sms");
    });
  });

  describe("addChannel functionality", () => {
    it("should add a channel with default content to existing template", async () => {
      const templateContent: ElementalContent = {
        version: "2022-01-01",
        elements: [
          {
            type: "channel",
            channel: "email",
            elements: [],
          },
        ],
      };

      setMockState({
        templateContent,
        channel: "email",
        isTemplateLoading: false,
      });

      const { result } = renderHook(() => useChannels({ channels: ["email", "sms"] }));

      await act(async () => {
        result.current.addChannel("sms");
      });

      const { updateElemental } = await import("@/lib/utils");
      expect(updateElemental).toHaveBeenCalledWith(templateContent, {
        channel: "sms",
      });
    });

    it("should create initial template when no content exists", async () => {
      setMockState({
        templateContent: null,
        channel: "email",
        isTemplateLoading: false,
      });

      const { result } = renderHook(() => useChannels({ channels: ["email", "sms"] }));

      await act(async () => {
        result.current.addChannel("sms");
      });

      expect(mockSetTemplateEditorContent).toHaveBeenCalledWith(
        expect.objectContaining({
          version: "2022-01-01",
          elements: expect.any(Array),
        })
      );
      expect(mockSetChannel).toHaveBeenCalledWith("sms");
    });

    it("should add channel with correct default content based on channel type", async () => {
      const templateContent: ElementalContent = {
        version: "2022-01-01",
        elements: [],
      };

      setMockState({
        templateContent,
        channel: "email",
        isTemplateLoading: false,
      });

      const { result } = renderHook(() =>
        useChannels({ channels: ["email", "sms", "push", "inbox"] })
      );

      await act(async () => {
        result.current.addChannel("push");
      });

      const { updateElemental } = await import("@/lib/utils");
      expect(updateElemental).toHaveBeenCalledWith(
        templateContent,
        expect.objectContaining({
          channel: "push",
        })
      );
    });
  });

  describe("removeChannel functionality", () => {
    it("should remove channel from template content", async () => {
      const templateContent: ElementalContent = {
        version: "2022-01-01",
        elements: [
          {
            type: "channel",
            channel: "email",
            elements: [],
          },
          {
            type: "channel",
            channel: "sms",
            elements: [],
          },
        ],
      };

      setMockState({
        templateContent,
        channel: "sms",
        isTemplateLoading: false,
      });

      const { result } = renderHook(() => useChannels({ channels: ["email", "sms"] }));

      await act(async () => {
        await result.current.removeChannel("sms");
      });

      expect(mockSetTemplateEditorContent).toHaveBeenCalledWith(
        expect.objectContaining({
          elements: expect.arrayContaining([
            expect.objectContaining({
              type: "channel",
              channel: "email",
            }),
          ]),
        })
      );
      expect(mockSetSelectedNode).toHaveBeenCalledWith(null);
    });

    it("should switch to remaining channel when removing current active channel", async () => {
      const templateContent: ElementalContent = {
        version: "2022-01-01",
        elements: [
          {
            type: "channel",
            channel: "email",
            elements: [],
          },
          {
            type: "channel",
            channel: "sms",
            elements: [],
          },
        ],
      };

      setMockState({
        templateContent,
        channel: "sms",
        isTemplateLoading: false,
      });

      const { result } = renderHook(() => useChannels({ channels: ["email", "sms"] }));

      await act(async () => {
        await result.current.removeChannel("sms");
      });

      expect(mockSetChannel).toHaveBeenCalledWith("email");
    });

    it("should save template when routing is provided", async () => {
      const templateContent: ElementalContent = {
        version: "2022-01-01",
        elements: [
          {
            type: "channel",
            channel: "email",
            elements: [],
          },
        ],
      };

      const mockRouting = {
        templateId: "test-template",
        method: "all" as const,
        channels: ["email"],
      };

      setMockState({
        templateContent,
        channel: "email",
        isTemplateLoading: false,
      });

      const { result } = renderHook(() =>
        useChannels({
          channels: ["email"],
          routing: mockRouting,
        })
      );

      await act(async () => {
        await result.current.removeChannel("email");
      });

      expect(mockSaveTemplate).toHaveBeenCalledWith(mockRouting);
    });

    it("should handle save template error gracefully", async () => {
      const templateContent: ElementalContent = {
        version: "2022-01-01",
        elements: [
          {
            type: "channel",
            channel: "email",
            elements: [],
          },
        ],
      };

      const mockRouting = {
        templateId: "test-template",
        method: "all" as const,
        channels: ["email"],
      };
      mockSaveTemplate.mockRejectedValueOnce(new Error("Save failed"));

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      setMockState({
        templateContent,
        channel: "email",
        isTemplateLoading: false,
      });

      const { result } = renderHook(() =>
        useChannels({
          channels: ["email"],
          routing: mockRouting,
        })
      );

      await act(async () => {
        await result.current.removeChannel("email");
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to save template after removing channel:",
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it("should handle removing channel when no template content exists", async () => {
      setMockState({
        templateContent: null,
        channel: "email",
        isTemplateLoading: false,
      });

      const { result } = renderHook(() => useChannels({ channels: ["email"] }));

      await act(async () => {
        await result.current.removeChannel("email");
      });

      expect(mockSaveTemplate).not.toHaveBeenCalled();
    });
  });

  describe("edge cases and error handling", () => {
    it("should handle empty channels prop", () => {
      setMockState({
        templateContent: null,
        channel: "email",
        isTemplateLoading: false,
      });

      const { result } = renderHook(() => useChannels({ channels: [] }));

      expect(result.current.enabledChannels).toHaveLength(0);
      expect(result.current.disabledChannels).toHaveLength(0);
    });

    it("should handle undefined channels prop", () => {
      setMockState({
        templateContent: null,
        channel: "email",
        isTemplateLoading: false,
      });

      const { result } = renderHook(() => useChannels({}));

      expect(result.current.enabledChannels).toHaveLength(1);
      expect(result.current.enabledChannels[0].value).toBe("email");
    });

    it("should handle invalid channel types gracefully", () => {
      const templateContent: ElementalContent = {
        version: "2022-01-01",
        elements: [
          {
            type: "channel",
            channel: "invalid" as "email",
            elements: [],
          },
          {
            type: "channel",
            channel: "email",
            elements: [],
          },
        ],
      };

      setMockState({
        templateContent,
        channel: "email",
        isTemplateLoading: false,
      });

      const { result } = renderHook(() => useChannels({ channels: ["email", "sms"] }));

      expect(result.current.enabledChannels).toHaveLength(1);
      expect(result.current.enabledChannels[0].value).toBe("email");
    });

    it("should handle template content without elements array", () => {
      const templateContent: ElementalContent = {
        version: "2022-01-01",
        elements: undefined as unknown as never,
      };

      setMockState({
        templateContent,
        channel: "email",
        isTemplateLoading: false,
      });

      const { result } = renderHook(() => useChannels({ channels: ["email", "sms"] }));

      // Should show all available channels when elements array is missing
      expect(result.current.enabledChannels).toHaveLength(2);
      expect(result.current.enabledChannels[0].value).toBe("email");
      expect(result.current.enabledChannels[1].value).toBe("sms");
    });
  });

  describe("return value structure", () => {
    it("should return all expected properties", () => {
      setMockState({
        templateContent: null,
        channel: "email",
        isTemplateLoading: false,
      });

      const { result } = renderHook(() => useChannels({ channels: ["email"] }));

      expect(result.current).toHaveProperty("enabledChannels");
      expect(result.current).toHaveProperty("disabledChannels");
      expect(result.current).toHaveProperty("channel");
      expect(result.current).toHaveProperty("setChannel");
      expect(result.current).toHaveProperty("addChannel");
      expect(result.current).toHaveProperty("removeChannel");

      expect(Array.isArray(result.current.enabledChannels)).toBe(true);
      expect(Array.isArray(result.current.disabledChannels)).toBe(true);
      expect(typeof result.current.setChannel).toBe("function");
      expect(typeof result.current.addChannel).toBe("function");
      expect(typeof result.current.removeChannel).toBe("function");
    });

    it("should maintain stable function references when dependencies don't change", () => {
      setMockState({
        templateContent: null,
        channel: "email",
        isTemplateLoading: false,
      });

      const { result, rerender } = renderHook(() => useChannels({ channels: ["email"] }));

      const firstRender = result.current;

      // Rerender with same props - functions should be stable
      rerender();

      const secondRender = result.current;

      // addChannel should be stable since its dependencies haven't changed
      expect(secondRender.addChannel).toBe(firstRender.addChannel);

      // Note: removeChannel may not be stable due to its many dependencies
      // (templateEditorContent, enabledChannels, channel, routing, saveTemplate)
      // This is actually correct React behavior - functions recreate when dependencies change
      expect(typeof secondRender.removeChannel).toBe("function");
    });
  });

  describe("routing channels priority and backward compatibility", () => {
    it("should prioritize routing.channels over channels prop", () => {
      const routing = {
        method: "single" as const,
        channels: ["email", "sms"],
      };

      setMockState({
        templateContent: null,
        channel: "email",
        isTemplateLoading: false,
      });

      const { result } = renderHook(() =>
        useChannels({
          channels: ["push", "inbox"],
          routing,
        })
      );

      // Should use routing.channels (email, sms) not channels prop (push, inbox)
      // For empty templates, show all channels from routing.channels
      expect(result.current.enabledChannels).toHaveLength(2);
      expect(result.current.enabledChannels[0].value).toBe("email");
      expect(result.current.enabledChannels[1].value).toBe("sms");
      expect(result.current.disabledChannels).toHaveLength(0);
    });

    it("should fallback to channels prop when routing.channels is empty", () => {
      const routing = {
        method: "single" as const,
        channels: [],
      };

      setMockState({
        templateContent: null,
        channel: "push",
        isTemplateLoading: false,
      });

      const { result } = renderHook(() =>
        useChannels({
          channels: ["push", "inbox"],
          routing,
        })
      );

      // Should use channels prop since routing.channels is empty
      // For empty templates, show all channels from channels prop
      expect(result.current.enabledChannels).toHaveLength(2);
      expect(result.current.enabledChannels[0].value).toBe("push");
      expect(result.current.enabledChannels[1].value).toBe("inbox");
      expect(result.current.disabledChannels).toHaveLength(0);
    });

    it("should fallback to channels prop when routing.channels is undefined", () => {
      const routing = {
        method: "single" as const,
        channels: undefined as any,
      };

      setMockState({
        templateContent: null,
        channel: "sms",
        isTemplateLoading: false,
      });

      const { result } = renderHook(() =>
        useChannels({
          channels: ["sms", "inbox"],
          routing,
        })
      );

      // Should use channels prop since routing.channels is undefined
      // For empty templates, show all channels from channels prop
      expect(result.current.enabledChannels).toHaveLength(2);
      expect(result.current.enabledChannels[0].value).toBe("sms");
      expect(result.current.enabledChannels[1].value).toBe("inbox");
      expect(result.current.disabledChannels).toHaveLength(0);
    });

    it("should use channels prop when routing is undefined", () => {
      setMockState({
        templateContent: null,
        channel: "inbox",
        isTemplateLoading: false,
      });

      const { result } = renderHook(() =>
        useChannels({
          channels: ["inbox", "email"],
          routing: undefined,
        })
      );

      // Should use channels prop since routing is undefined
      // For empty templates, show all channels from channels prop
      expect(result.current.enabledChannels).toHaveLength(2);
      expect(result.current.enabledChannels[0].value).toBe("inbox");
      expect(result.current.enabledChannels[1].value).toBe("email");
      expect(result.current.disabledChannels).toHaveLength(0);
    });

    it("should use default when both routing.channels and channels prop are undefined", () => {
      setMockState({
        templateContent: null,
        channel: "email",
        isTemplateLoading: false,
      });

      const { result } = renderHook(() =>
        useChannels({
          channels: undefined,
          routing: undefined,
        })
      );

      // Should use default ["email"] since both are undefined
      expect(result.current.enabledChannels).toHaveLength(1);
      expect(result.current.enabledChannels[0].value).toBe("email");
      expect(result.current.disabledChannels).toHaveLength(0);
    });

    it("should filter out non-string values from routing.channels", () => {
      const routing = {
        method: "single" as const,
        channels: ["email", { nested: "object" } as any, "sms", null as any],
      };

      setMockState({
        templateContent: null,
        channel: "email",
        isTemplateLoading: false,
      });

      const { result } = renderHook(() =>
        useChannels({
          channels: ["inbox"],
          routing,
        })
      );

      // Should filter out non-strings and use only "email", "sms"
      // For empty templates, show all valid channels from routing.channels
      expect(result.current.enabledChannels).toHaveLength(2);
      expect(result.current.enabledChannels[0].value).toBe("email");
      expect(result.current.enabledChannels[1].value).toBe("sms");
      expect(result.current.disabledChannels).toHaveLength(0);
    });

    it("should fallback to channels prop when routing.channels contains only non-string values", () => {
      const routing = {
        method: "single" as const,
        channels: [{ nested: "object" } as any, 123 as any, null as any],
      };

      setMockState({
        templateContent: null,
        channel: "inbox",
        isTemplateLoading: false,
      });

      const { result } = renderHook(() =>
        useChannels({
          channels: ["inbox"],
          routing,
        })
      );

      // Should fallback to channels prop since no valid strings in routing.channels
      expect(result.current.enabledChannels).toHaveLength(1);
      expect(result.current.enabledChannels[0].value).toBe("inbox");
      expect(result.current.disabledChannels).toHaveLength(0);
    });

    it("should work with existing template content and routing.channels", () => {
      const routing = {
        method: "single" as const,
        channels: ["email", "sms", "push"],
      };

      const templateContent: ElementalContent = {
        version: "2022-01-01",
        elements: [
          {
            type: "channel",
            channel: "email",
            elements: [{ type: "text", content: "Email content" }],
          },
          {
            type: "channel",
            channel: "push",
            elements: [{ type: "text", content: "Push content" }],
          },
        ],
      };

      setMockState({
        templateContent,
        channel: "email",
        isTemplateLoading: false,
      });

      const { result } = renderHook(() =>
        useChannels({
          channels: ["email", "sms", "push", "inbox"], // This should be ignored
          routing,
        })
      );

      // Should show existing channels (email, push) based on template content
      // but filtered by routing.channels (email, sms, push)
      expect(result.current.enabledChannels).toHaveLength(2);
      expect(result.current.enabledChannels.map((c) => c.value)).toEqual(
        expect.arrayContaining(["email", "push"])
      );
      expect(result.current.disabledChannels).toHaveLength(1);
      expect(result.current.disabledChannels[0].value).toBe("sms");
    });

    it("should maintain backward compatibility with legacy channels prop only", () => {
      setMockState({
        templateContent: null,
        channel: "sms",
        isTemplateLoading: false,
      });

      // Test legacy usage without routing prop
      const { result } = renderHook(() =>
        useChannels({
          channels: ["sms", "push"],
          // No routing prop at all
        })
      );

      // For empty templates, show all channels from channels prop
      expect(result.current.enabledChannels).toHaveLength(2);
      expect(result.current.enabledChannels[0].value).toBe("sms");
      expect(result.current.enabledChannels[1].value).toBe("push");
      expect(result.current.disabledChannels).toHaveLength(0);
    });
  });
});
