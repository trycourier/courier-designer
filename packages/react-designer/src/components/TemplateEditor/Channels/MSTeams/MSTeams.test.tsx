import React, { forwardRef } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { convertTiptapToElemental, convertElementalToTiptap } from "@/lib/utils";
import { ExtensionKit } from "@/components/extensions/extension-kit";

// Mock TipTap useCurrentEditor hook
const mockEditor = {
  getText: vi.fn(() => "Test MSTeams message"),
  getJSON: vi.fn(() => ({
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: "Test MSTeams message" }] }],
  })),
  commands: {
    blur: vi.fn(),
    setContent: vi.fn(),
    updateSelectionState: vi.fn(),
    removeDragPlaceholder: vi.fn(),
    setDragPlaceholder: vi.fn(),
  },
  isFocused: false,
  isDestroyed: false,
  setEditable: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  state: {
    doc: {
      content: {
        size: 100,
      },
      childCount: 3,
      child: vi.fn((_i: number) => ({
        nodeSize: 10,
      })),
    },
  },
  view: {
    dom: {
      querySelectorAll: vi.fn(() => []),
    },
    dispatch: vi.fn(),
  },
};

vi.mock("@tiptap/react", () => ({
  useCurrentEditor: vi.fn(() => ({ editor: mockEditor })),
}));

// Mock Jotai atoms
const mockTemplateEditorContent = {
  version: "2022-01-01" as const,
  elements: [
    {
      type: "channel" as const,
      channel: "msteams" as const,
      elements: [{ type: "text" as const, content: "Hello MSTeams" }],
    },
  ],
};

let mockTemplateEditorAtom = vi.fn();
const mockSetTemplateEditorContent = vi.fn();
const mockSetSelectedNode = vi.fn();
let mockSelectedNode: any = null;

// Mock the store atoms directly
vi.mock("@/components/TemplateEditor/store", () => ({
  brandEditorAtom: "brandEditorAtom",
  templateEditorAtom: "templateEditorAtom",
  templateEditorContentAtom: "templateEditorContentAtom",
  isTemplateTransitioningAtom: "isTemplateTransitioningAtom",
}));

vi.mock("@/components/Providers/store", () => ({
  isTemplateLoadingAtom: "isTemplateLoadingAtom",
}));

vi.mock("@/components/ui/TextMenu/store", () => ({
  selectedNodeAtom: "selectedNodeAtom",
}));

vi.mock("jotai", () => ({
  useAtom: vi.fn((atom: unknown) => {
    if (atom === "templateEditorContentAtom") {
      return [mockTemplateEditorContent, mockSetTemplateEditorContent];
    }
    if (atom === "selectedNodeAtom") {
      return [mockSelectedNode, mockSetSelectedNode];
    }
    return [null, vi.fn()];
  }),
  useAtomValue: vi.fn((atom: unknown) => {
    if (atom === "isTemplateLoadingAtom") {
      return false;
    }
    if (atom === "templateEditorAtom") {
      return mockEditor;
    }
    if (atom === "templateEditorContentAtom") {
      return mockTemplateEditorContent;
    }
    if (atom === "isTemplateTransitioningAtom") {
      return false;
    }
    if (atom === "selectedNodeAtom") {
      return mockSelectedNode;
    }
    return null;
  }),
  useSetAtom: vi.fn((atom: unknown) => {
    if (atom === "templateEditorAtom") {
      return mockTemplateEditorAtom;
    }
    if (atom === "selectedNodeAtom") {
      return mockSetSelectedNode;
    }
    return vi.fn();
  }),
  createStore: vi.fn(() => ({})),
  atom: vi.fn(() => ({})),
}));

// Mock extension kit
vi.mock("@/components/extensions/extension-kit", () => ({
  ExtensionKit: vi.fn(() => [
    {
      name: "testExtension",
      type: "extension",
    },
  ]),
}));

// Get reference to mocked ExtensionKit
const mockExtensionKit = vi.mocked(ExtensionKit);

// Mock conversion utilities
const mockElementalData = [{ type: "text", content: "Converted content" }];
const mockTiptapData = {
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: "TipTap content" }] }],
};

vi.mock("@/lib/utils", () => ({
  convertTiptapToElemental: vi.fn(() => mockElementalData),
  convertElementalToTiptap: vi.fn(() => mockTiptapData),
  updateElemental: vi.fn((content, update) => ({
    ...content,
    elements: content.elements.map((el: unknown) =>
      el && typeof el === "object" && "channel" in el && el.channel === update.channel
        ? { ...el, elements: update.elements }
        : el
    ),
  })),
  cn: vi.fn((...classes) => classes.filter(Boolean).join(" ")),
}));

// Mock MainLayout
vi.mock("../../../ui/MainLayout", () => ({
  MainLayout: forwardRef<
    HTMLDivElement,
    {
      theme?: unknown;
      isLoading?: boolean;
      Header?: React.ReactNode;
      children?: React.ReactNode;
    }
  >(({ theme, isLoading, Header, children }, ref) => (
    <div
      ref={ref}
      data-testid="main-layout"
      data-theme={theme ? "custom" : "default"}
      data-loading={isLoading}
    >
      {Header && <div data-testid="header">{Header}</div>}
      <div data-testid="content">{children}</div>
    </div>
  )),
}));

// Mock Channels component
vi.mock("../Channels", () => ({
  Channels: ({
    hidePublish,
    channels: _channels,
    routing: _routing,
  }: {
    hidePublish?: boolean;
    channels?: unknown[];
    routing: unknown;
  }) => (
    <div data-testid="channels" data-hide-publish={hidePublish}>
      Channels Component
    </div>
  ),
}));

// Mock DndKit
vi.mock("@dnd-kit/core", () => ({
  DndContext: ({
    children,
  }: {
    children: React.ReactNode;
    sensors?: unknown;
    collisionDetection?: unknown;
    measuring?: unknown;
    onDragStart?: unknown;
    onDragMove?: unknown;
    onDragEnd?: unknown;
    onDragCancel?: unknown;
  }) => <div data-testid="dnd-context">{children}</div>,
  DragOverlay: ({ children }: { children: React.ReactNode; dropAnimation?: unknown }) => (
    <div data-testid="drag-overlay">{children}</div>
  ),
  useSensor: vi.fn((sensor) => sensor),
  useSensors: vi.fn((...sensors) => sensors),
  MouseSensor: vi.fn(),
  TouchSensor: vi.fn(),
  KeyboardSensor: vi.fn(),
  closestCenter: vi.fn(() => []),
  pointerWithin: vi.fn(() => []),
  rectIntersection: vi.fn(() => []),
  getFirstCollision: vi.fn(() => null),
  MeasuringStrategy: {
    Always: "always",
  },
}));

vi.mock("@dnd-kit/sortable", () => ({
  arrayMove: vi.fn((arr, from, to) => {
    const newArr = [...arr];
    const [item] = newArr.splice(from, 1);
    newArr.splice(to, 0, item);
    return newArr;
  }),
}));

// Mock Block components
vi.mock("@/components/ui/Blocks/TextBlock", () => ({
  TextBlock: ({ draggable }: { draggable?: boolean }) => (
    <div data-testid="text-block" data-draggable={draggable}>
      Text Block
    </div>
  ),
}));

vi.mock("@/components/ui/Blocks/DividerBlock", () => ({
  DividerBlock: ({ draggable }: { draggable?: boolean }) => (
    <div data-testid="divider-block" data-draggable={draggable}>
      Divider Block
    </div>
  ),
}));

vi.mock("@/components/ui/Blocks/ButtonBlock", () => ({
  ButtonBlock: ({ draggable }: { draggable?: boolean }) => (
    <div data-testid="button-block" data-draggable={draggable}>
      Button Block
    </div>
  ),
}));

// Mock utils
vi.mock("@/components/utils", () => ({
  createOrDuplicateNode: vi.fn(),
  coordinateGetter: vi.fn(),
}));

// Import component after mocks
import { MSTeams, defaultMSTeamsContent, MSTeamsConfig } from "./MSTeams";
import type { MSTeamsProps } from "./MSTeams";

// Test data
const mockRouting = { method: "single" as const, channels: ["msteams"] };
const mockChannels: ("email" | "sms" | "push" | "inbox" | "msteams")[] = ["msteams"];
const mockVariables = { userName: "John", userEmail: "john@example.com" };

const defaultProps: MSTeamsProps = {
  routing: mockRouting,
  readOnly: false,
  variables: mockVariables,
  channels: mockChannels,
  hidePublish: false,
};

describe("MSTeams Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTemplateEditorAtom = vi.fn();
    mockSelectedNode = null;
    mockEditor.isFocused = false;
    mockEditor.isDestroyed = false;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Default Content & Configuration", () => {
    it("should export defaultMSTeamsContent with correct structure", () => {
      expect(defaultMSTeamsContent).toEqual([{ type: "text", content: "\n" }]);
    });

    it("should export MSTeamsConfig with formatting enabled", () => {
      expect(MSTeamsConfig.bold?.state).toBe("enabled");
      expect(MSTeamsConfig.italic?.state).toBe("enabled");
      expect(MSTeamsConfig.underline?.state).toBe("enabled");
      expect(MSTeamsConfig.strike?.state).toBe("enabled");
      expect(MSTeamsConfig.quote?.state).toBe("enabled");
      expect(MSTeamsConfig.variable?.state).toBe("enabled");
      expect(MSTeamsConfig.alignLeft?.state).toBe("hidden");
      expect(MSTeamsConfig.alignCenter?.state).toBe("hidden");
    });
  });

  describe("Component Rendering", () => {
    it("should render with header and custom render function", () => {
      const headerRenderer = vi.fn(() => <div data-testid="custom-header">Custom Header</div>);
      const customRender = vi.fn(() => (
        <div data-testid="custom-render">Custom MSTeams Editor</div>
      ));

      render(<MSTeams {...defaultProps} headerRenderer={headerRenderer} render={customRender} />);

      expect(screen.getByTestId("custom-header")).toBeInTheDocument();
      expect(headerRenderer).toHaveBeenCalledWith(
        expect.objectContaining({
          routing: mockRouting,
          hidePublish: false,
        })
      );
      expect(screen.getByTestId("custom-render")).toBeInTheDocument();
      expect(customRender).toHaveBeenCalledWith(
        expect.objectContaining({
          editable: true,
          autofocus: true,
          items: expect.objectContaining({
            Sidebar: ["text", "divider"],
          }),
        })
      );
    });

    it("should render DndContext with drag handlers", () => {
      render(<MSTeams {...defaultProps} />);

      const dndContext = screen.getByTestId("dnd-context");
      expect(dndContext).toBeInTheDocument();
      expect(screen.getByTestId("drag-overlay")).toBeInTheDocument();
    });
  });

  describe("Component Props", () => {
    it("should handle readOnly prop", () => {
      const mockRender = vi.fn(() => <div>MSTeams Editor</div>);
      render(<MSTeams {...defaultProps} readOnly={true} render={mockRender} />);

      expect(mockRender).toHaveBeenCalledWith(
        expect.objectContaining({
          editable: false,
          autofocus: false,
        })
      );
    });

    it("should handle variables prop", () => {
      const customVariables = { customVar: "value" };
      render(<MSTeams {...defaultProps} variables={customVariables} />);

      const callArgs = mockExtensionKit.mock.calls[0]?.[0];
      expect((callArgs as any).variables.customVar).toBe("value");
    });

    it("should handle all supported props", () => {
      render(
        <MSTeams
          {...defaultProps}
          hidePublish={true}
          theme="dark"
          channels={["email", "msteams"]}
        />
      );

      expect(screen.getByTestId("channels")).toHaveAttribute("data-hide-publish", "true");
      expect(screen.getByTestId("main-layout")).toHaveAttribute("data-theme", "custom");
    });
  });

  describe("Content Management", () => {
    it("should provide content from template editor", () => {
      const msteamsContent = {
        version: "2022-01-01" as const,
        elements: [
          {
            type: "channel" as const,
            channel: "msteams" as const,
            elements: [{ type: "text" as const, content: "Hello MSTeams" }],
          },
        ],
      };

      render(<MSTeams {...defaultProps} value={msteamsContent} />);

      expect(convertElementalToTiptap).toHaveBeenCalled();
    });

    it("should create default MSTeams element if not present", () => {
      const emptyContent = {
        version: "2022-01-01" as const,
        elements: [],
      };

      render(<MSTeams {...defaultProps} value={emptyContent} />);

      expect(convertElementalToTiptap).toHaveBeenCalledWith(
        expect.objectContaining({
          elements: expect.arrayContaining([
            expect.objectContaining({
              type: "channel",
              channel: "msteams",
            }),
          ]),
        }),
        expect.any(Object)
      );
    });

    it("should handle onUpdate with content changes", () => {
      const mockRender = vi.fn(({ onUpdate }) => {
        if (onUpdate) onUpdate({ editor: mockEditor });
        return <div>MSTeams Editor</div>;
      });

      render(<MSTeams {...defaultProps} render={mockRender} />);

      expect(convertTiptapToElemental).toHaveBeenCalled();
    });
  });

  describe("Drag and Drop Functionality", () => {
    it("should provide items state for sidebar and editor", () => {
      const mockRender = vi.fn(() => <div>MSTeams Editor</div>);
      render(<MSTeams {...defaultProps} render={mockRender} />);

      expect(mockRender).toHaveBeenCalledWith(
        expect.objectContaining({
          items: expect.objectContaining({
            Sidebar: ["text", "divider"],
            Editor: expect.any(Array),
          }),
        })
      );
    });
  });

  describe("Editor Integration", () => {
    it("should provide editor reference to render function", () => {
      const mockRender = vi.fn(() => <div>MSTeams Editor</div>);
      render(<MSTeams {...defaultProps} render={mockRender} />);

      expect(mockRender).toHaveBeenCalledWith(
        expect.objectContaining({
          msteamsEditor: mockEditor,
        })
      );
    });

    it("should provide selected node to render function", () => {
      mockSelectedNode = { type: "text" } as any;
      const mockRender = vi.fn(() => <div>MSTeams Editor</div>);

      render(<MSTeams {...defaultProps} render={mockRender} />);

      expect(mockRender).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedNode: mockSelectedNode,
        })
      );
    });
  });
});
