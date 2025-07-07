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
let mockIsTenantLoading = false;

// Mock the Jotai hooks
vi.mock("jotai", () => ({
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
    if (atomStr.includes("isTenantLoading")) {
      return mockIsTenantLoading;
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
}));

vi.mock("@/components/Providers/TemplateProvider", () => ({
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

vi.mock("@/components/Providers/store", () => ({
  isTenantLoadingAtom: "isTenantLoadingAtom",
}));

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
  isTenantLoading?: boolean;
}) => {
  if (state.channel !== undefined) mockChannel = state.channel;
  if (state.templateContent !== undefined) mockTemplateEditorContent = state.templateContent;
  if (state.isTenantLoading !== undefined) mockIsTenantLoading = state.isTenantLoading;
};

const resetMockState = () => {
  mockChannel = "email";
  mockTemplateEditorContent = null;
  mockIsTenantLoading = false;
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
        isTenantLoading: false,
      });

      const { result } = renderHook(() => useChannels({ channels: ["email", "sms"] }));

      expect(result.current.enabledChannels).toHaveLength(1);
      expect(result.current.enabledChannels[0].value).toBe("email");
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
        isTenantLoading: false,
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
        isTenantLoading: false,
      });

      const { result } = renderHook(() => useChannels({ channels: ["email", "sms"] }));

      expect(result.current.enabledChannels).toHaveLength(2);
      expect(result.current.enabledChannels.map((c) => c.value)).toEqual(
        expect.arrayContaining(["email", "sms"])
      );
      expect(result.current.enabledChannels.map((c) => c.value)).not.toContain("push");
    });

    it("should not update when tenant is loading", () => {
      setMockState({
        templateContent: null,
        channel: "email",
        isTenantLoading: true,
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
        isTenantLoading: false,
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
        isTenantLoading: false,
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
        isTenantLoading: false,
      });

      const { result } = renderHook(() => useChannels({ channels: ["email", "sms"] }));

      await act(async () => {
        result.current.addChannel("sms");
      });

      const { updateElemental } = await import("@/lib/utils");
      expect(updateElemental).toHaveBeenCalledWith(templateContent, {
        elements: expect.arrayContaining([
          expect.objectContaining({
            type: "text",
            content: "SMS content",
          }),
        ]),
        channel: "sms",
      });
    });

    it("should create initial template when no content exists", async () => {
      setMockState({
        templateContent: null,
        channel: "email",
        isTenantLoading: false,
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
        isTenantLoading: false,
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
          elements: expect.any(Array),
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
        isTenantLoading: false,
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
        isTenantLoading: false,
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
        method: "POST",
        channels: ["email"],
      } as any;

      setMockState({
        templateContent,
        channel: "email",
        isTenantLoading: false,
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
        method: "POST",
        channels: ["email"],
      } as any;
      mockSaveTemplate.mockRejectedValueOnce(new Error("Save failed"));

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      setMockState({
        templateContent,
        channel: "email",
        isTenantLoading: false,
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
        isTenantLoading: false,
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
        isTenantLoading: false,
      });

      const { result } = renderHook(() => useChannels({ channels: [] }));

      expect(result.current.enabledChannels).toHaveLength(0);
      expect(result.current.disabledChannels).toHaveLength(0);
    });

    it("should handle undefined channels prop", () => {
      setMockState({
        templateContent: null,
        channel: "email",
        isTenantLoading: false,
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
            channel: "invalid" as any,
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
        isTenantLoading: false,
      });

      const { result } = renderHook(() => useChannels({ channels: ["email", "sms"] }));

      expect(result.current.enabledChannels).toHaveLength(1);
      expect(result.current.enabledChannels[0].value).toBe("email");
    });

    it("should handle template content without elements array", () => {
      const templateContent: ElementalContent = {
        version: "2022-01-01",
        elements: undefined as any,
      };

      setMockState({
        templateContent,
        channel: "email",
        isTenantLoading: false,
      });

      const { result } = renderHook(() => useChannels({ channels: ["email", "sms"] }));

      expect(result.current.enabledChannels).toHaveLength(1);
      expect(result.current.enabledChannels[0].value).toBe("email");
    });
  });

  describe("return value structure", () => {
    it("should return all expected properties", () => {
      setMockState({
        templateContent: null,
        channel: "email",
        isTenantLoading: false,
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

    it("should maintain stable function references", () => {
      setMockState({
        templateContent: null,
        channel: "email",
        isTenantLoading: false,
      });

      const { result, rerender } = renderHook(() => useChannels({ channels: ["email"] }));

      const firstRender = result.current;

      rerender();

      const secondRender = result.current;

      // Functions should be stable (useCallback)
      expect(secondRender.addChannel).toBe(firstRender.addChannel);
      expect(secondRender.removeChannel).toBe(firstRender.removeChannel);
    });
  });
});
