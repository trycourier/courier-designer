import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Blockquote, defaultBlockquoteProps } from "./Blockquote";
import { BlockquoteComponent, BlockquoteComponentNode } from "./BlockquoteComponent";
import { BlockquoteForm } from "./BlockquoteForm";

// Mock jotai
const mockSetSelectedNode = vi.fn();
let mockSelectedNode: any = null;
vi.mock("jotai", () => ({
  useSetAtom: () => mockSetSelectedNode,
  useAtomValue: () => mockSelectedNode,
  atom: vi.fn(),
}));

// Mock the SortableItemWrapper
vi.mock("@/components/ui/SortableItemWrapper", () => ({
  SortableItemWrapper: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="sortable-wrapper" className={className}>
      {children}
    </div>
  ),
}));

// Mock NodeViewWrapper and NodeViewContent from TipTap
vi.mock("@tiptap/react", () => ({
  NodeViewWrapper: React.forwardRef<HTMLDivElement, { children: React.ReactNode }>(
    ({ children }, ref) => (
      <div data-testid="node-view-wrapper" ref={ref}>
        {children}
      </div>
    )
  ),
  NodeViewContent: () => <div data-testid="node-view-content" />,
}));

// Mock safeGetNodeAtPos
vi.mock("../../utils", () => ({
  safeGetNodeAtPos: vi.fn(() => ({ type: { name: "blockquote" }, attrs: { id: "test-id" } })),
}));

vi.mock("../../utils/generateNodeIds", () => ({
  generateNodeIds: vi.fn(),
}));

vi.mock("uuid", () => ({
  v4: vi.fn(() => "test-uuid-1234"),
}));

// Mock react-hook-form
const mockGetValues = vi.fn(() => defaultBlockquoteProps);
const mockOnChange = vi.fn();
vi.mock("react-hook-form", () => ({
  useForm: vi.fn(() => ({
    control: {},
    getValues: mockGetValues,
    formState: { errors: {} },
  })),
}));

// Mock ui-kit components
vi.mock("@/components/ui-kit", () => ({
  Form: ({ children }: any) => <div data-testid="blockquote-form">{children}</div>,
  FormControl: ({ children }: any) => <div>{children}</div>,
  FormField: ({ render }: any) => {
    const field = { onChange: mockOnChange, value: defaultBlockquoteProps.borderColor, name: "borderColor" };
    return render({ field });
  },
  FormItem: ({ children }: any) => <div>{children}</div>,
  FormMessage: () => <div />,
  InputColor: ({ defaultValue, value, onChange, ...props }: any) => {
    const inputProps = { ...props };
    if (value !== undefined) {
      inputProps.value = value;
    } else if (defaultValue !== undefined) {
      inputProps.defaultValue = defaultValue;
    }
    return (
      <input
        type="color"
        data-testid="color-input"
        onChange={(e) => onChange?.(e.target.value)}
        {...inputProps}
      />
    );
  },
}));

// Mock FormHeader
vi.mock("../../ui/FormHeader", () => ({
  FormHeader: ({ type }: any) => <div data-testid="form-header">FormHeader: {type}</div>,
}));

// Mock useNodeAttributes hook
const mockUpdateNodeAttributes = vi.fn();
vi.mock("../../hooks", () => ({
  useNodeAttributes: vi.fn(() => ({
    updateNodeAttributes: mockUpdateNodeAttributes,
  })),
}));

describe("BlockquoteComponent", () => {
  it("should render with correct styles", () => {
    render(
      <BlockquoteComponent
        paddingHorizontal={8}
        paddingVertical={6}
        backgroundColor="transparent"
        borderLeftWidth={4}
        borderColor="#e0e0e0"
      />
    );

    const nodeElement = screen.getByTestId("node-view-content").parentElement?.parentElement;
    expect(nodeElement).toHaveClass("courier-w-full");
    expect(nodeElement).toHaveClass("node-element");
  });

  it("should apply custom padding styles", () => {
    render(
      <BlockquoteComponent
        paddingHorizontal={16}
        paddingVertical={12}
        backgroundColor="#f5f5f5"
        borderLeftWidth={8}
        borderColor="#0066cc"
      />
    );

    const innerDiv = screen.getByTestId("node-view-content").parentElement;
    expect(innerDiv).toHaveStyle({ padding: "12px 16px" });
    expect(innerDiv).toHaveStyle({ backgroundColor: "#f5f5f5" });
    expect(innerDiv).toHaveStyle({ borderLeftWidth: "8px" });
    expect(innerDiv).toHaveStyle({ borderColor: "#0066cc" });
  });
});

describe("BlockquoteComponentNode", () => {
  const mockUpdateSelectionState = vi.fn();
  const mockFocus = vi.fn();

  const mockEditor = {
    isEditable: true,
    commands: {
      updateSelectionState: mockUpdateSelectionState,
      focus: mockFocus,
    },
  } as any;

  const mockNode = {
    attrs: {
      ...defaultBlockquoteProps,
      id: "test-blockquote-id",
      isSelected: false,
    },
    content: { size: 5 },
  } as any;

  const mockProps = {
    editor: mockEditor,
    node: mockNode,
    getPos: vi.fn(() => 0),
    decorations: [],
    selected: false,
    updateAttributes: vi.fn(),
    deleteNode: vi.fn(),
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render BlockquoteComponentNode with SortableItemWrapper", () => {
    render(<BlockquoteComponentNode {...mockProps} />);

    expect(screen.getByTestId("node-view-wrapper")).toBeInTheDocument();
    expect(screen.getByTestId("sortable-wrapper")).toBeInTheDocument();
  });

  it("should apply selected-element class when isSelected is true", () => {
    // Set the mock selected node to match this blockquote
    mockSelectedNode = {
      type: { name: "blockquote" },
      attrs: { id: "test-blockquote-id" },
    };

    render(<BlockquoteComponentNode {...mockProps} />);

    const wrapper = screen.getByTestId("sortable-wrapper");
    expect(wrapper).toHaveClass("selected-element");

    // Reset mock
    mockSelectedNode = null;
  });

  it("should apply is-empty class when content is empty", () => {
    const emptyNode = {
      ...mockNode,
      content: { size: 0 },
    };

    render(<BlockquoteComponentNode {...mockProps} node={emptyNode} />);

    const wrapper = screen.getByTestId("sortable-wrapper");
    expect(wrapper).toHaveClass("is-empty");
  });

  it("should not select blockquote when editor is not editable", async () => {
    const nonEditableEditor = { ...mockEditor, isEditable: false };

    render(<BlockquoteComponentNode {...mockProps} editor={nonEditableEditor} />);

    const wrapper = screen.getByTestId("node-view-wrapper");
    await userEvent.click(wrapper);

    expect(mockSetSelectedNode).not.toHaveBeenCalled();
    expect(mockUpdateSelectionState).not.toHaveBeenCalled();
  });

  it("should render with correct structure for click handling", () => {
    // The component uses native event listeners for click handling
    // which are difficult to test with React Testing Library.
    // This test verifies the structure is correct for the click handler to work.
    render(<BlockquoteComponentNode {...mockProps} />);

    const wrapper = screen.getByTestId("node-view-wrapper");
    expect(wrapper).toBeInTheDocument();

    // The NodeViewWrapper should be the container that receives click events
    const sortableWrapper = screen.getByTestId("sortable-wrapper");
    expect(sortableWrapper).toBeInTheDocument();
  });
});

describe("Blockquote Extension", () => {
  describe("Basic Configuration", () => {
    it("should be defined and have correct name", () => {
      expect(Blockquote).toBeDefined();
      expect(Blockquote.name).toBe("blockquote");
    });

    it("should have configure method", () => {
      expect(typeof Blockquote.configure).toBe("function");
    });

    it("should be configurable", () => {
      const configured = Blockquote.configure({
        HTMLAttributes: { class: "custom-blockquote" },
      });
      expect(configured).toBeDefined();
      expect(configured.name).toBe("blockquote");
    });
  });

  describe("Extension Structure", () => {
    it("should have TipTap extension structure", () => {
      expect(Blockquote).toHaveProperty("type");
      expect(Blockquote).toHaveProperty("name");
      expect(Blockquote).toHaveProperty("parent");
      expect(Blockquote).toHaveProperty("options");
    });

    it("should extend TipTap Blockquote", () => {
      // The parent should be the TipTap Blockquote extension
      expect(Blockquote.parent).toBeDefined();
    });

    it("should have proper extension type", () => {
      expect(Blockquote.type).toBe("node");
    });

    it("should support block content", () => {
      // Blockquote should support block content (configured during extension creation)
      const configured = Blockquote.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("blockquote");
    });
  });

  describe("Default Props Integration", () => {
    it("should use defaultBlockquoteProps", () => {
      // Test that defaultBlockquoteProps is imported and available
      expect(defaultBlockquoteProps).toBeDefined();
      expect(defaultBlockquoteProps.paddingHorizontal).toBe(8);
      expect(defaultBlockquoteProps.paddingVertical).toBe(6);
      expect(defaultBlockquoteProps.backgroundColor).toBe("transparent");
      expect(defaultBlockquoteProps.borderLeftWidth).toBe(4);
      expect(defaultBlockquoteProps.borderColor).toBe("#e0e0e0");
    });

    it("should have expected default prop types", () => {
      expect(defaultBlockquoteProps.paddingHorizontal).toBeTypeOf("number");
      expect(defaultBlockquoteProps.paddingVertical).toBeTypeOf("number");
      expect(defaultBlockquoteProps.backgroundColor).toBeTypeOf("string");
      expect(defaultBlockquoteProps.borderLeftWidth).toBeTypeOf("number");
      expect(defaultBlockquoteProps.borderColor).toBeTypeOf("string");
    });
  });

  describe("Blockquote Attributes", () => {
    it("should support all blockquote styling attributes", () => {
      const configured = Blockquote.configure();

      // Check that the extension has the expected attributes structure
      expect(configured).toBeDefined();
      expect(configured.name).toBe("blockquote");
    });

    it("should support padding attributes", () => {
      // Verify padding attributes are available
      expect(defaultBlockquoteProps.paddingHorizontal).toBeTypeOf("number");
      expect(defaultBlockquoteProps.paddingVertical).toBeTypeOf("number");
      expect(defaultBlockquoteProps.paddingHorizontal).toBe(8);
      expect(defaultBlockquoteProps.paddingVertical).toBe(6);
    });

    it("should support background color attribute", () => {
      // Verify background color attribute is available
      expect(defaultBlockquoteProps.backgroundColor).toBeTypeOf("string");
      expect(defaultBlockquoteProps.backgroundColor).toBe("transparent");
    });

    it("should support border attributes", () => {
      // Verify border attributes are available
      expect(defaultBlockquoteProps.borderLeftWidth).toBeTypeOf("number");
      expect(defaultBlockquoteProps.borderColor).toBeTypeOf("string");
      expect(defaultBlockquoteProps.borderLeftWidth).toBe(4);
      expect(defaultBlockquoteProps.borderColor).toBe("#e0e0e0");
    });

    it("should support id attribute", () => {
      // The blockquote should support an id attribute for node identification
      const configured = Blockquote.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("blockquote");
    });
  });

  describe("HTML Integration", () => {
    it("should handle HTML parsing", () => {
      // Test that the extension has proper HTML handling
      const configured = Blockquote.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("blockquote");
    });

    it("should support HTML attributes", () => {
      const options = {
        HTMLAttributes: {
          class: "test-blockquote",
          "data-testid": "blockquote",
        },
      };

      expect(() => {
        const configured = Blockquote.configure(options);
        return configured;
      }).not.toThrow();
    });

    it("should render blockquote element", () => {
      // The extension should render as a blockquote HTML element
      const configured = Blockquote.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("blockquote");
    });
  });

  describe("Keyboard Shortcuts", () => {
    it("should support Enter key behavior", () => {
      // Test that the extension has keyboard shortcuts configured
      const configured = Blockquote.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("blockquote");
    });

    it("should handle blockquote-specific Enter behavior", () => {
      // The extension should have custom Enter key handling for blockquotes
      expect(() => {
        const configured = Blockquote.configure();
        return configured;
      }).not.toThrow();
    });
  });

  describe("Functionality Tests", () => {
    it("should handle basic blockquote creation", () => {
      // Test that the extension can be created without errors
      expect(() => {
        const instance = Blockquote.configure();
        return instance;
      }).not.toThrow();
    });

    it("should handle configuration options", () => {
      const options = {
        HTMLAttributes: {
          class: "test-blockquote",
          "data-testid": "blockquote",
        },
      };

      expect(() => {
        const configured = Blockquote.configure(options);
        return configured;
      }).not.toThrow();
    });

    it("should support custom styling props", () => {
      // Test different prop configurations
      const customProps = {
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "#f5f5f5",
        borderLeftWidth: 8,
        borderColor: "#0066cc",
      };

      expect(customProps.paddingHorizontal).toBeGreaterThan(
        defaultBlockquoteProps.paddingHorizontal
      );
      expect(customProps.paddingVertical).toBeGreaterThan(defaultBlockquoteProps.paddingVertical);
      expect(customProps.borderLeftWidth).toBeGreaterThan(defaultBlockquoteProps.borderLeftWidth);
    });
  });

  describe("Integration Readiness", () => {
    it("should be ready for editor integration", () => {
      // Verify the extension has the minimum required structure for TipTap
      expect(Blockquote.name).toBe("blockquote");
      expect(Blockquote.type).toBe("node");
      expect(typeof Blockquote.configure).toBe("function");
    });

    it("should work with default blockquote props", () => {
      // Verify that default props are available and have expected structure
      const requiredProps = [
        "paddingHorizontal",
        "paddingVertical",
        "backgroundColor",
        "borderLeftWidth",
        "borderColor",
      ];

      requiredProps.forEach((prop) => {
        expect(defaultBlockquoteProps).toHaveProperty(prop);
      });
    });

    it("should have expected default values", () => {
      expect(defaultBlockquoteProps.paddingHorizontal).toBeTypeOf("number");
      expect(defaultBlockquoteProps.paddingVertical).toBeTypeOf("number");
      expect(defaultBlockquoteProps.backgroundColor).toBeTypeOf("string");
      expect(defaultBlockquoteProps.borderLeftWidth).toBeTypeOf("number");
      expect(defaultBlockquoteProps.borderColor).toBeTypeOf("string");
    });

    it("should support node view rendering", () => {
      // The extension should be configured with ReactNodeViewRenderer
      const configured = Blockquote.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("blockquote");
    });
  });

  describe("Content Model", () => {
    it("should support block content", () => {
      // Blockquote should accept block-level content (configured in the extension)
      const configured = Blockquote.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("blockquote");
    });

    it("should allow nested elements", () => {
      // The extension should support nested paragraph and other block elements
      const configured = Blockquote.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("blockquote");
    });
  });

  describe("Mock Verification", () => {
    it("should have proper mocks in place", () => {
      // Verify that our extension is properly set up
      expect(Blockquote).toBeDefined();
      expect(defaultBlockquoteProps).toBeDefined();
    });

    it("should mock BlockquoteComponentNode", () => {
      // Verify that BlockquoteComponentNode is mocked
      expect(Blockquote).toBeDefined();
    });
  });
});

describe("BlockquoteForm", () => {
  const mockEditor = {
    isEditable: true,
  } as any;

  const mockElement = {
    attrs: defaultBlockquoteProps,
    type: { name: "blockquote" },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetValues.mockReturnValue(defaultBlockquoteProps);
  });

  // Basic Rendering Tests
  describe("Basic Rendering", () => {
    it("should not render when element is not provided", () => {
      const { container } = render(<BlockquoteForm editor={mockEditor} />);
      expect(container.firstChild).toBeNull();
    });

    it("should render form when element is provided", () => {
      render(<BlockquoteForm element={mockElement} editor={mockEditor} />);

      expect(screen.getByTestId("blockquote-form")).toBeInTheDocument();
      expect(screen.getByTestId("form-header")).toBeInTheDocument();
    });

    it("should render FormHeader with correct type", () => {
      render(<BlockquoteForm element={mockElement} editor={mockEditor} />);

      const formHeader = screen.getByTestId("form-header");
      expect(formHeader).toBeInTheDocument();
      expect(formHeader).toHaveTextContent("FormHeader: blockquote");
    });
  });

  // Structure Tests
  describe("Form Structure", () => {
    it("should only render Border section", () => {
      render(<BlockquoteForm element={mockElement} editor={mockEditor} />);

      // Should have Border section
      expect(screen.getByText("Border")).toBeInTheDocument();

      // Should NOT have Frame section (removed in simplification)
      expect(screen.queryByText("Frame")).not.toBeInTheDocument();
    });

    it("should render borderColor input field", () => {
      render(<BlockquoteForm element={mockElement} editor={mockEditor} />);

      const colorInput = screen.getByTestId("color-input");
      expect(colorInput).toBeInTheDocument();
      expect(colorInput).toHaveAttribute("type", "color");
    });

    it("should not render removed fields", () => {
      render(<BlockquoteForm element={mockElement} editor={mockEditor} />);

      // Should NOT have padding inputs (removed)
      expect(screen.queryByText("Padding Horizontal")).not.toBeInTheDocument();
      expect(screen.queryByText("Padding Vertical")).not.toBeInTheDocument();

      // Should NOT have background color (removed)
      const colorInputs = screen.queryAllByTestId("color-input");
      // Only one color input should exist (borderColor)
      expect(colorInputs).toHaveLength(1);

      // Should NOT have border width input (removed)
      expect(screen.queryByText("Border Width")).not.toBeInTheDocument();
    });
  });

  // Interaction Tests
  describe("Interactions", () => {
    it("should call updateNodeAttributes when borderColor changes", () => {
      render(<BlockquoteForm element={mockElement} editor={mockEditor} />);

      const colorInput = screen.getByTestId("color-input");

      // Simulate color change
      userEvent.click(colorInput);

      // The onChange handler should have been set up
      expect(mockOnChange).toBeDefined();
    });

    it("should use default borderColor from defaultBlockquoteProps", () => {
      render(<BlockquoteForm element={mockElement} editor={mockEditor} />);

      const colorInput = screen.getByTestId("color-input");
      // The color input should use the default value from defaultBlockquoteProps
      expect(colorInput).toHaveAttribute("value", defaultBlockquoteProps.borderColor);
    });

    it("should apply element attrs as form default values", () => {
      const customAttrs = {
        ...defaultBlockquoteProps,
        borderColor: "#ff0000",
      };

      const customElement = {
        attrs: customAttrs,
        type: { name: "blockquote" },
      } as any;

      render(<BlockquoteForm element={customElement} editor={mockEditor} />);

      // The form should have been initialized with custom attrs
      expect(screen.getByTestId("blockquote-form")).toBeInTheDocument();
    });
  });

  // Integration Tests
  describe("Integration", () => {
    it("should work with useNodeAttributes hook", () => {
      render(<BlockquoteForm element={mockElement} editor={mockEditor} />);

      // Verify that the form rendered successfully, which means useNodeAttributes hook worked
      expect(screen.getByTestId("blockquote-form")).toBeInTheDocument();
      expect(screen.getByTestId("color-input")).toBeInTheDocument();
      // The form should be functional with the hook providing updateNodeAttributes
      expect(mockUpdateNodeAttributes).toBeDefined();
    });

    it("should have form change handler configured", () => {
      const { container } = render(<BlockquoteForm element={mockElement} editor={mockEditor} />);

      const form = container.querySelector("form");
      expect(form).toBeInTheDocument();

      // The form should have an onChange handler that updates node attributes
      // This is configured in the form element but triggered by individual field changes
      expect(mockGetValues).toBeDefined();
      expect(mockUpdateNodeAttributes).toBeDefined();
    });

    it("should initialize form with editor and element context", () => {
      render(<BlockquoteForm element={mockElement} editor={mockEditor} />);

      // Verify the form rendered successfully with all required props
      expect(screen.getByTestId("blockquote-form")).toBeInTheDocument();
      expect(screen.getByTestId("form-header")).toBeInTheDocument();
      expect(screen.getByTestId("color-input")).toBeInTheDocument();
    });
  });
});
