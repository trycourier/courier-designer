import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import type { ElementalContent, ElementalNode } from "@/types/elemental.types";

// Radix Switch uses ResizeObserver internally
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

// ---------------------------------------------------------------------------
// Mock editor – simulates TipTap editor used by the SideBar
// ---------------------------------------------------------------------------

type DescendantsCb = (
  node: { type: { name: string }; attrs: Record<string, unknown> },
  pos: number
) => boolean | void;

let editorNodes: Array<{
  type: { name: string };
  attrs: Record<string, unknown>;
  pos: number;
}> = [];
const updateListeners: Array<() => void> = [];

const mockEditor = {
  state: {
    get doc() {
      return {
        descendants: (cb: DescendantsCb) => {
          for (const n of editorNodes) {
            const result = cb(n, n.pos);
            if (result === false) break;
          }
        },
        nodeAt: (pos: number) => {
          const found = editorNodes.find((n) => n.pos === pos);
          return found ?? null;
        },
      };
    },
  },
  commands: {
    setContent: vi.fn(),
    command: vi.fn((fn: (args: { tr: { setNodeMarkup: Mock } }) => boolean) => {
      fn({ tr: { setNodeMarkup: vi.fn() } });
      return true;
    }),
  },
  on: vi.fn((event: string, handler: () => void) => {
    if (event === "update") updateListeners.push(handler);
  }),
  off: vi.fn((event: string, handler: () => void) => {
    if (event === "update") {
      const idx = updateListeners.indexOf(handler);
      if (idx !== -1) updateListeners.splice(idx, 1);
    }
  }),
};

const fireEditorUpdate = () => {
  for (const listener of updateListeners) listener();
};

// ---------------------------------------------------------------------------
// Mock atoms – Jotai
// ---------------------------------------------------------------------------

let mockTemplateEditorContent: ElementalContent | null = null;
const mockSetTemplateEditorContent = vi.fn();
const mockSetPendingAutoSave = vi.fn();
let mockEditorAtom: typeof mockEditor | null = mockEditor;

vi.mock("@/components/TemplateEditor/store", () => ({
  templateEditorAtom: "templateEditorAtom",
  templateEditorContentAtom: "templateEditorContentAtom",
  pendingAutoSaveAtom: "pendingAutoSaveAtom",
  flushFunctionsAtom: "flushFunctionsAtom",
}));

vi.mock("jotai", async () => {
  const actual = await vi.importActual("jotai");
  return {
    ...actual,
    useAtom: vi.fn((atom: unknown) => {
      if (atom === "templateEditorContentAtom") {
        return [mockTemplateEditorContent, mockSetTemplateEditorContent];
      }
      return [null, vi.fn()];
    }),
    useAtomValue: vi.fn((atom: unknown) => {
      if (atom === "templateEditorAtom") return mockEditorAtom;
      if (atom === "templateEditorContentAtom") return mockTemplateEditorContent;
      return null;
    }),
    useSetAtom: vi.fn((atom: unknown) => {
      if (atom === "pendingAutoSaveAtom") return mockSetPendingAutoSave;
      if (atom === "flushFunctionsAtom") return vi.fn();
      return vi.fn();
    }),
  };
});

// ---------------------------------------------------------------------------
// Mock utils
// ---------------------------------------------------------------------------

const mockConvertElementalToTiptap = vi.fn(() => ({ type: "doc", content: [] }));

vi.mock("@/lib/utils", () => ({
  convertElementalToTiptap: (...args: unknown[]) => mockConvertElementalToTiptap(...args),
  cn: vi.fn((...classes: unknown[]) => classes.filter(Boolean).join(" ")),
}));

// ---------------------------------------------------------------------------
// Import component under test (after mocks)
// ---------------------------------------------------------------------------

import { SideBar } from "./SideBar";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const inboxContent = (actions: ElementalNode[]): ElementalContent => ({
  version: "2022-01-01",
  elements: [
    {
      type: "channel",
      channel: "inbox",
      elements: [
        { type: "text", content: "\n", text_style: "h2" },
        { type: "text", content: "\n" },
        ...actions,
      ],
    },
  ],
});

const oneButtonContent = () =>
  inboxContent([{ type: "action", content: "Register", href: "http://example.com", align: "left" }]);

const twoButtonContent = () =>
  inboxContent([
    { type: "action", content: "Register", href: "http://example.com", align: "left" },
    { type: "action", content: "Learn more", href: "http://other.com", align: "left" },
  ]);

const noButtonContent = () => inboxContent([]);

const setSingleButtonEditor = () => {
  editorNodes = [
    {
      type: { name: "button" },
      attrs: { label: "Register", link: "http://example.com" },
      pos: 0,
    },
  ];
};

const setButtonRowEditor = () => {
  editorNodes = [
    {
      type: { name: "buttonRow" },
      attrs: {
        button1Label: "Register",
        button1Link: "http://example.com",
        button1BackgroundColor: "#000",
        button1TextColor: "#fff",
        button2Label: "Learn more",
        button2Link: "http://other.com",
        button2BackgroundColor: "#000",
        button2TextColor: "#fff",
      },
      pos: 0,
    },
  ];
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Inbox SideBar", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.clearAllMocks();
    editorNodes = [];
    updateListeners.length = 0;
    mockEditorAtom = mockEditor;
    mockTemplateEditorContent = oneButtonContent();
    mockConvertElementalToTiptap.mockReturnValue({ type: "doc", content: [] });
    setSingleButtonEditor();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------

  describe("Rendering", () => {
    it("should render Enable button toggle", () => {
      render(<SideBar />);
      expect(screen.getByText("Enable button")).toBeInTheDocument();
    });

    it("should render Enable secondary button toggle", () => {
      render(<SideBar />);
      expect(screen.getByText("Enable secondary button")).toBeInTheDocument();
    });

    it("should show Action URL field when button is enabled", async () => {
      render(<SideBar />);

      await act(async () => {
        vi.advanceTimersByTime(10);
      });

      const labels = screen.getAllByText("Action URL");
      expect(labels.length).toBeGreaterThanOrEqual(1);
    });

    it("should hide Action URL fields when buttons are disabled", () => {
      mockTemplateEditorContent = noButtonContent();
      editorNodes = [];

      render(<SideBar />);

      act(() => {
        vi.advanceTimersByTime(10);
      });

      expect(screen.queryByPlaceholderText("https://example.com")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Bug fix: Switch toggle must trigger update (was relying on native change)
  // -------------------------------------------------------------------------

  describe("Switch toggle triggers update (Bug fix: Radix Switch + form.watch)", () => {
    it("should call setTemplateEditorContent when secondary button is toggled ON", async () => {
      mockTemplateEditorContent = oneButtonContent();
      setSingleButtonEditor();

      render(<SideBar />);

      await act(async () => {
        vi.advanceTimersByTime(10);
      });

      mockSetTemplateEditorContent.mockClear();
      mockSetPendingAutoSave.mockClear();

      const switches = screen.getAllByRole("switch");
      const secondarySwitch = switches[1];

      await act(async () => {
        fireEvent.click(secondarySwitch);
        vi.advanceTimersByTime(10);
      });

      expect(mockSetTemplateEditorContent).toHaveBeenCalled();

      const calledWith = mockSetTemplateEditorContent.mock.calls[0][0] as ElementalContent;
      const inboxChannel = calledWith.elements.find(
        (el: ElementalNode) => el.type === "channel" && el.channel === "inbox"
      );
      const actions = inboxChannel?.elements?.filter(
        (el: ElementalNode) => el.type === "action"
      );
      expect(actions).toHaveLength(2);
    });

    it("should call setTemplateEditorContent when secondary button is toggled OFF", async () => {
      mockTemplateEditorContent = twoButtonContent();
      setButtonRowEditor();

      render(<SideBar />);

      await act(async () => {
        vi.advanceTimersByTime(10);
      });

      mockSetTemplateEditorContent.mockClear();
      mockSetPendingAutoSave.mockClear();

      const switches = screen.getAllByRole("switch");
      const secondarySwitch = switches[1];

      await act(async () => {
        fireEvent.click(secondarySwitch);
        vi.advanceTimersByTime(10);
      });

      expect(mockSetTemplateEditorContent).toHaveBeenCalled();

      const calledWith = mockSetTemplateEditorContent.mock.calls[0][0] as ElementalContent;
      const inboxChannel = calledWith.elements.find(
        (el: ElementalNode) => el.type === "channel" && el.channel === "inbox"
      );
      const actions = inboxChannel?.elements?.filter(
        (el: ElementalNode) => el.type === "action"
      );
      expect(actions).toHaveLength(1);
    });

    it("should call setTemplateEditorContent when primary button is toggled OFF", async () => {
      mockTemplateEditorContent = oneButtonContent();
      setSingleButtonEditor();

      render(<SideBar />);

      await act(async () => {
        vi.advanceTimersByTime(10);
      });

      mockSetTemplateEditorContent.mockClear();

      const switches = screen.getAllByRole("switch");
      const primarySwitch = switches[0];

      await act(async () => {
        fireEvent.click(primarySwitch);
        vi.advanceTimersByTime(10);
      });

      expect(mockSetTemplateEditorContent).toHaveBeenCalled();

      const calledWith = mockSetTemplateEditorContent.mock.calls[0][0] as ElementalContent;
      const inboxChannel = calledWith.elements.find(
        (el: ElementalNode) => el.type === "channel" && el.channel === "inbox"
      );
      const actions = inboxChannel?.elements?.filter(
        (el: ElementalNode) => el.type === "action"
      );
      expect(actions).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // Bug fix: Editor is updated directly on structural changes
  // -------------------------------------------------------------------------

  describe("Editor updated directly on structural change (Bug fix: sidebar focus guard bypass)", () => {
    it("should call editor.commands.setContent when secondary button is toggled ON", async () => {
      mockTemplateEditorContent = oneButtonContent();
      setSingleButtonEditor();

      render(<SideBar />);

      await act(async () => {
        vi.advanceTimersByTime(10);
      });

      mockEditor.commands.setContent.mockClear();

      const switches = screen.getAllByRole("switch");
      const secondarySwitch = switches[1];

      await act(async () => {
        fireEvent.click(secondarySwitch);
        vi.advanceTimersByTime(10);
      });

      expect(mockEditor.commands.setContent).toHaveBeenCalled();
      expect(mockConvertElementalToTiptap).toHaveBeenCalledWith(
        expect.objectContaining({
          version: "2022-01-01",
          elements: expect.arrayContaining([
            expect.objectContaining({ type: "channel", channel: "inbox" }),
          ]),
        }),
        { channel: "inbox" }
      );
    });

    it("should call editor.commands.setContent when primary button is toggled OFF", async () => {
      mockTemplateEditorContent = oneButtonContent();
      setSingleButtonEditor();

      render(<SideBar />);

      await act(async () => {
        vi.advanceTimersByTime(10);
      });

      mockEditor.commands.setContent.mockClear();

      const switches = screen.getAllByRole("switch");
      const primarySwitch = switches[0];

      await act(async () => {
        fireEvent.click(primarySwitch);
        vi.advanceTimersByTime(10);
      });

      expect(mockEditor.commands.setContent).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Bug fix: URL changes must NOT toggle off the secondary button
  // -------------------------------------------------------------------------

  describe("URL change does not affect secondary button toggle (Bug fix)", () => {
    it("should not disable secondary button when primary URL is changed", async () => {
      mockTemplateEditorContent = twoButtonContent();
      setButtonRowEditor();

      render(<SideBar />);

      await act(async () => {
        vi.advanceTimersByTime(10);
      });

      const enableSecondarySwitch = screen.getAllByRole("switch")[1];
      expect(enableSecondarySwitch).toHaveAttribute("data-state", "checked");

      const urlInputs = screen.getAllByPlaceholderText("https://example.com");
      const primaryUrlInput = urlInputs[0];

      await act(async () => {
        fireEvent.change(primaryUrlInput, { target: { value: "http://google.com/" } });
        vi.advanceTimersByTime(600);
      });

      expect(enableSecondarySwitch).toHaveAttribute("data-state", "checked");
    });
  });

  // -------------------------------------------------------------------------
  // syncFromEditor – form syncs from editor state
  // -------------------------------------------------------------------------

  describe("syncFromEditor", () => {
    it("should sync form when editor has a buttonRow node", () => {
      setButtonRowEditor();
      render(<SideBar />);

      act(() => {
        vi.advanceTimersByTime(10);
      });

      const switches = screen.getAllByRole("switch");
      expect(switches[0]).toHaveAttribute("data-state", "checked");
      expect(switches[1]).toHaveAttribute("data-state", "checked");
    });

    it("should sync form when editor has a single button node", () => {
      setSingleButtonEditor();
      render(<SideBar />);

      act(() => {
        vi.advanceTimersByTime(10);
      });

      const switches = screen.getAllByRole("switch");
      expect(switches[0]).toHaveAttribute("data-state", "checked");
      expect(switches[1]).toHaveAttribute("data-state", "unchecked");
    });

    it("should sync form when editor has no buttons", () => {
      editorNodes = [];
      mockTemplateEditorContent = noButtonContent();
      render(<SideBar />);

      act(() => {
        vi.advanceTimersByTime(10);
      });

      const switches = screen.getAllByRole("switch");
      expect(switches[0]).toHaveAttribute("data-state", "unchecked");
      expect(switches[1]).toHaveAttribute("data-state", "unchecked");
    });

    it("should update form when editor update event fires with new state", () => {
      setSingleButtonEditor();
      render(<SideBar />);

      act(() => {
        vi.advanceTimersByTime(10);
      });

      const switches = screen.getAllByRole("switch");
      expect(switches[1]).toHaveAttribute("data-state", "unchecked");

      setButtonRowEditor();

      act(() => {
        fireEditorUpdate();
        vi.advanceTimersByTime(10);
      });

      expect(switches[1]).toHaveAttribute("data-state", "checked");
    });
  });

  // -------------------------------------------------------------------------
  // Initialization from templateEditorContent (no editor)
  // -------------------------------------------------------------------------

  describe("Initialization from templateEditorContent", () => {
    it("should initialize form from elemental content when editor is not available", () => {
      mockEditorAtom = null;
      mockTemplateEditorContent = twoButtonContent();

      render(<SideBar />);

      act(() => {
        vi.advanceTimersByTime(10);
      });

      const switches = screen.getAllByRole("switch");
      expect(switches[0]).toHaveAttribute("data-state", "checked");
      expect(switches[1]).toHaveAttribute("data-state", "checked");
    });

    it("should disable both buttons when no actions in content and no editor", () => {
      mockEditorAtom = null;
      mockTemplateEditorContent = noButtonContent();

      render(<SideBar />);

      act(() => {
        vi.advanceTimersByTime(10);
      });

      const switches = screen.getAllByRole("switch");
      expect(switches[0]).toHaveAttribute("data-state", "unchecked");
      expect(switches[1]).toHaveAttribute("data-state", "unchecked");
    });
  });

  // -------------------------------------------------------------------------
  // Debounced URL updates
  // -------------------------------------------------------------------------

  describe("Debounced URL updates", () => {
    it("should process URL changes after debounce", async () => {
      mockTemplateEditorContent = oneButtonContent();
      setSingleButtonEditor();

      render(<SideBar />);

      await act(async () => {
        vi.advanceTimersByTime(10);
      });

      mockSetTemplateEditorContent.mockClear();
      mockEditor.commands.command.mockClear();

      const urlInput = screen.getAllByPlaceholderText("https://example.com")[0];

      await act(async () => {
        fireEvent.change(urlInput, { target: { value: "http://new-url.com" } });
        vi.advanceTimersByTime(600);
      });

      // After debounce, the editor should have been updated via command or setContent
      expect(
        mockEditor.commands.command.mock.calls.length > 0 ||
          mockSetTemplateEditorContent.mock.calls.length > 0
      ).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Structural change creates correct elemental actions
  // -------------------------------------------------------------------------

  describe("Elemental action structure", () => {
    it("should create action with correct properties when enabling secondary button", async () => {
      mockTemplateEditorContent = oneButtonContent();
      setSingleButtonEditor();

      render(<SideBar />);

      await act(async () => {
        vi.advanceTimersByTime(10);
      });

      mockSetTemplateEditorContent.mockClear();

      const switches = screen.getAllByRole("switch");
      const secondarySwitch = switches[1];

      await act(async () => {
        fireEvent.click(secondarySwitch);
        vi.advanceTimersByTime(10);
      });

      expect(mockSetTemplateEditorContent).toHaveBeenCalled();
      const calledWith = mockSetTemplateEditorContent.mock.calls[0][0] as ElementalContent;
      const inboxChannel = calledWith.elements.find(
        (el: ElementalNode) => el.type === "channel" && el.channel === "inbox"
      );
      const actions = inboxChannel?.elements?.filter(
        (el: ElementalNode) => el.type === "action"
      ) as ElementalNode[];

      expect(actions[0]).toMatchObject({
        type: "action",
        content: expect.any(String),
        href: expect.any(String),
        align: "left",
      });
      expect(actions[1]).toMatchObject({
        type: "action",
        content: "Learn more",
        href: "",
        align: "left",
      });
    });

    it("should preserve non-action elements when toggling buttons", async () => {
      mockTemplateEditorContent = oneButtonContent();
      setSingleButtonEditor();

      render(<SideBar />);

      await act(async () => {
        vi.advanceTimersByTime(10);
      });

      mockSetTemplateEditorContent.mockClear();

      const switches = screen.getAllByRole("switch");

      await act(async () => {
        fireEvent.click(switches[1]);
        vi.advanceTimersByTime(10);
      });

      const calledWith = mockSetTemplateEditorContent.mock.calls[0][0] as ElementalContent;
      const inboxChannel = calledWith.elements.find(
        (el: ElementalNode) => el.type === "channel" && el.channel === "inbox"
      );
      const textElements = inboxChannel?.elements?.filter(
        (el: ElementalNode) => el.type === "text"
      );
      expect(textElements).toHaveLength(2);
    });
  });

  // -------------------------------------------------------------------------
  // Auto-save integration
  // -------------------------------------------------------------------------

  describe("Auto-save integration", () => {
    it("should set pendingAutoSave when structural change occurs", async () => {
      mockTemplateEditorContent = oneButtonContent();
      setSingleButtonEditor();

      render(<SideBar />);

      await act(async () => {
        vi.advanceTimersByTime(10);
      });

      mockSetPendingAutoSave.mockClear();

      const switches = screen.getAllByRole("switch");

      await act(async () => {
        fireEvent.click(switches[1]);
        vi.advanceTimersByTime(10);
      });

      expect(mockSetPendingAutoSave).toHaveBeenCalled();
    });
  });
});
