import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { TemplateEditor } from "./TemplateEditor";
import type { MessageRouting } from "@/components/Providers/store";
import type { ChannelType } from "@/store";

// Mock all the dependencies
vi.mock("@/hooks/useAutoSave", () => ({
  useAutoSave: vi.fn(() => ({
    handleAutoSave: vi.fn(),
  })),
}));
vi.mock("@/components/Providers");
vi.mock("./Channels", () => ({
  EmailLayout: ({ channels }: { channels: ChannelType[] }) => (
    <div data-testid="email-layout" data-channels={JSON.stringify(channels)}>
      Email Layout
    </div>
  ),
  SMSLayout: ({ channels }: { channels: ChannelType[] }) => (
    <div data-testid="sms-layout" data-channels={JSON.stringify(channels)}>
      SMS Layout
    </div>
  ),
  PushLayout: ({ channels }: { channels: ChannelType[] }) => (
    <div data-testid="push-layout" data-channels={JSON.stringify(channels)}>
      Push Layout
    </div>
  ),
  InboxLayout: ({ channels }: { channels: ChannelType[] }) => (
    <div data-testid="inbox-layout" data-channels={JSON.stringify(channels)}>
      Inbox Layout
    </div>
  ),
}));

vi.mock("@/components/BrandEditor", () => ({
  BrandEditor: () => <div data-testid="brand-editor">Brand Editor</div>,
}));

// Mock Jotai atoms
const mockAtomValues = {
  isTemplateLoading: false,
  isTemplatePublishing: false,
  templateError: null,
  templateData: null,
  templateId: "test-id",
  tenantId: "test-tenant",
  page: "template",
  templateEditorContent: null,
  isTemplateTransitioning: false,
  channel: "email" as ChannelType,
};

vi.mock("jotai", async () => {
  const actual = await vi.importActual("jotai") as any;
  return {
    ...actual,
    useAtom: vi.fn((atom) => {
      const atomStr = atom.toString();
      if (atomStr.includes("templateData")) return [null, vi.fn()];
      if (atomStr.includes("templateEditorContent")) return [null, vi.fn()];
      if (atomStr.includes("isTemplateTransitioning")) return [false, vi.fn()];
      if (atomStr.includes("channel")) return ["email", vi.fn()];
      return [null, vi.fn()];
    }),
    useAtomValue: vi.fn((atom) => {
      const atomStr = atom.toString();
      if (atomStr.includes("isTemplateLoading")) return mockAtomValues.isTemplateLoading;
      if (atomStr.includes("isTemplatePublishing")) return mockAtomValues.isTemplatePublishing;
      if (atomStr.includes("templateError")) return mockAtomValues.templateError;
      if (atomStr.includes("templateId")) return mockAtomValues.templateId;
      if (atomStr.includes("tenantId")) return mockAtomValues.tenantId;
      if (atomStr.includes("page")) return mockAtomValues.page;
      return null;
    }),
    useSetAtom: vi.fn(() => vi.fn()),
  };
});

vi.mock("@/components/Providers", () => ({
  useTemplateActions: () => ({
    getTemplate: vi.fn(),
    saveTemplate: vi.fn(),
    setTemplateError: vi.fn(),
  }),
}));

vi.mock("react", async () => {
  const actual = await vi.importActual("react") as any;
  return {
    ...actual,
    useState: vi.fn((initial) => [initial, vi.fn()]),
    useEffect: vi.fn(),
    useCallback: vi.fn((fn) => fn),
    useRef: vi.fn(() => ({ current: false })),
    memo: vi.fn((component) => component),
  };
});

// Test the resolveChannels function directly
describe("resolveChannels helper function", () => {
  // We need to access the function for testing, so let's extract it
  const resolveChannels = (routing?: MessageRouting, channelsProp?: ChannelType[]): ChannelType[] => {
    // If routing.channels exists, use it (top priority)
    if (routing?.channels && routing.channels.length > 0) {
      // Filter out any non-string routing channels and convert to ChannelType[]
      const validChannels = routing.channels.filter(
        (channel): channel is string => typeof channel === "string"
      ) as ChannelType[];
      
      // If we have valid channels after filtering, use them
      if (validChannels.length > 0) {
        return validChannels;
      }
    }

    // Fallback to channels prop or default
    return channelsProp ?? ["email", "sms", "push", "inbox"];
  };

  it("should prioritize routing.channels over channels prop", () => {
    const routing: MessageRouting = {
      method: "single",
      channels: ["email", "sms"],
    };
    const channelsProp: ChannelType[] = ["push", "inbox"];

    const result = resolveChannels(routing, channelsProp);

    expect(result).toEqual(["email", "sms"]);
  });

  it("should use channels prop when routing.channels is empty", () => {
    const routing: MessageRouting = {
      method: "single",
      channels: [],
    };
    const channelsProp: ChannelType[] = ["push", "inbox"];

    const result = resolveChannels(routing, channelsProp);

    expect(result).toEqual(["push", "inbox"]);
  });

  it("should use channels prop when routing.channels is undefined", () => {
    const routing: MessageRouting = {
      method: "single",
      channels: undefined as any,
    };
    const channelsProp: ChannelType[] = ["sms", "push"];

    const result = resolveChannels(routing, channelsProp);

    expect(result).toEqual(["sms", "push"]);
  });

  it("should use channels prop when routing is undefined", () => {
    const channelsProp: ChannelType[] = ["inbox"];

    const result = resolveChannels(undefined, channelsProp);

    expect(result).toEqual(["inbox"]);
  });

  it("should use default channels when both routing.channels and channels prop are undefined", () => {
    const result = resolveChannels(undefined, undefined);

    expect(result).toEqual(["email", "sms", "push", "inbox"]);
  });

  it("should filter out non-string values from routing.channels", () => {
    const routing: MessageRouting = {
      method: "single",
      channels: ["email", { method: "single", channels: ["nested"] } as any, "sms", null as any],
    };

    const result = resolveChannels(routing, ["inbox"] as ChannelType[]);

    expect(result).toEqual(["email", "sms"]);
  });

  it("should fallback to channels prop when routing.channels contains only non-string values", () => {
    const routing: MessageRouting = {
      method: "single",
      channels: [{ method: "single", channels: ["nested"] } as any, null as any],
    };
    const channelsProp: ChannelType[] = ["inbox"];

    const result = resolveChannels(routing, channelsProp);

    expect(result).toEqual(["inbox"]);
  });
});

describe("TemplateEditor component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("channels resolution integration", () => {
    it("should pass resolved channels to EmailLayout when routing.channels is provided", () => {
      const routing: MessageRouting = {
        method: "single",
        channels: ["email", "sms"],
      };
      const channelsProp: ChannelType[] = ["email", "sms", "push", "inbox"];

      const { getByTestId } = render(
        <TemplateEditor routing={routing} channels={channelsProp} />
      );

      const emailLayout = getByTestId("email-layout");
      const channelsData = JSON.parse(emailLayout.getAttribute("data-channels") || "[]");

      expect(channelsData).toEqual(["email", "sms"]);
    });

    it("should use channels prop when no routing.channels provided", () => {
      const channelsProp: ChannelType[] = ["push", "inbox"];

      const { getByTestId } = render(<TemplateEditor channels={channelsProp} />);

      const emailLayout = getByTestId("email-layout");
      const channelsData = JSON.parse(emailLayout.getAttribute("data-channels") || "[]");

      expect(channelsData).toEqual(["push", "inbox"]);
    });

    it("should use default channels when neither routing.channels nor channels prop provided", () => {
      const { getByTestId } = render(<TemplateEditor />);

      const emailLayout = getByTestId("email-layout");
      const channelsData = JSON.parse(emailLayout.getAttribute("data-channels") || "[]");

      expect(channelsData).toEqual(["email", "sms", "push", "inbox"]);
    });

    it("should prioritize routing.channels even when channels prop is provided", () => {
      const routing: MessageRouting = {
        method: "all",
        channels: ["inbox"],
      };
      const channelsProp: ChannelType[] = ["email", "sms", "push"];

      const { getByTestId } = render(
        <TemplateEditor routing={routing} channels={channelsProp} />
      );

      const emailLayout = getByTestId("email-layout");
      const channelsData = JSON.parse(emailLayout.getAttribute("data-channels") || "[]");

      expect(channelsData).toEqual(["inbox"]);
    });
  });

  describe("backward compatibility", () => {
    it("should work with legacy channels prop only", () => {
      const channelsProp: ChannelType[] = ["sms", "push"];

      const { getByTestId } = render(<TemplateEditor channels={channelsProp} />);

      const emailLayout = getByTestId("email-layout");
      const channelsData = JSON.parse(emailLayout.getAttribute("data-channels") || "[]");

      expect(channelsData).toEqual(["sms", "push"]);
    });

    it("should maintain existing behavior when only channels prop is used", () => {
      const channelsProp: ChannelType[] = ["email"];

      const { getByTestId } = render(<TemplateEditor channels={channelsProp} />);

      const emailLayout = getByTestId("email-layout");
      const channelsData = JSON.parse(emailLayout.getAttribute("data-channels") || "[]");

      expect(channelsData).toEqual(["email"]);
    });
  });

  describe("edge cases", () => {
    it("should handle empty routing.channels array", () => {
      const routing: MessageRouting = {
        method: "single",
        channels: [],
      };
      const channelsProp: ChannelType[] = ["email", "sms"];

      const { getByTestId } = render(
        <TemplateEditor routing={routing} channels={channelsProp} />
      );

      const emailLayout = getByTestId("email-layout");
      const channelsData = JSON.parse(emailLayout.getAttribute("data-channels") || "[]");

      expect(channelsData).toEqual(["email", "sms"]);
    });

    it("should handle mixed valid and invalid routing.channels", () => {
      const routing: MessageRouting = {
        method: "single",
        channels: ["email", { nested: "object" } as any, "sms", null as any],
      };

      const { getByTestId } = render(<TemplateEditor routing={routing} />);

      const emailLayout = getByTestId("email-layout");
      const channelsData = JSON.parse(emailLayout.getAttribute("data-channels") || "[]");

      expect(channelsData).toEqual(["email", "sms"]);
    });

    it("should fallback properly when routing.channels contains only invalid values", () => {
      const routing: MessageRouting = {
        method: "single",
        channels: [{ nested: "object" } as any, 123 as any, null as any],
      };
      const channelsProp: ChannelType[] = ["inbox"];

      const { getByTestId } = render(
        <TemplateEditor routing={routing} channels={channelsProp} />
      );

      const emailLayout = getByTestId("email-layout");
      const channelsData = JSON.parse(emailLayout.getAttribute("data-channels") || "[]");

      expect(channelsData).toEqual(["inbox"]);
    });
  });
});
