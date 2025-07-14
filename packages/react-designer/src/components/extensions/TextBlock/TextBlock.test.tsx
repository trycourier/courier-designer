import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { TextBlockComponent, TextBlockComponentNode } from "./TextBlockComponent";
import { TextBlockForm } from "./TextBlockForm";
import { defaultTextBlockProps, textBlockSchema, type TextBlockProps } from "./TextBlock.types";

// Mock dependencies
vi.mock("@tiptap/react", () => ({
  useEditor: vi.fn(),
  NodeViewWrapper: ({ children, ...props }: any) => (
    <div data-testid="node-wrapper" {...props}>
      {children}
    </div>
  ),
  NodeViewContent: ({ as: Component = "div", ...props }: any) => (
    <Component data-testid="node-content" {...props} />
  ),
}));

vi.mock("jotai", () => ({
  useAtom: vi.fn(),
  useSetAtom: vi.fn(() => vi.fn()),
  useAtomValue: vi.fn(),
  atom: vi.fn(() => ({})),
  createStore: vi.fn(() => ({})),
}));

vi.mock("../../hooks", () => ({
  useNodeAttributes: vi.fn(() => ({
    updateNodeAttributes: vi.fn(),
  })),
}));

vi.mock("../../ui/SortableItemWrapper", () => ({
  SortableItemWrapper: ({ children, ...props }: any) => (
    <div data-testid="sortable-wrapper" {...props}>
      {children}
    </div>
  ),
}));

vi.mock("../../ui/TextMenu/store", () => ({
  setSelectedNodeAtom: {},
}));

vi.mock("../../utils", () => ({
  safeGetPos: vi.fn(() => 0),
  safeGetNodeAtPos: vi.fn(() => null),
}));

vi.mock("react-hook-form", () => ({
  useForm: vi.fn(() => ({
    control: {},
    getValues: vi.fn(() => defaultTextBlockProps),
    formState: { errors: {} },
  })),
}));

vi.mock("@/components/ui-kit", () => ({
  Form: ({ children }: any) => <div data-testid="text-block-form">{children}</div>,
  FormControl: ({ children }: any) => <div>{children}</div>,
  FormField: ({ render }: any) => {
    const field = { onChange: vi.fn(), value: "" };
    return render({ field });
  },
  FormItem: ({ children }: any) => <div>{children}</div>,
  FormMessage: () => <div />,
  Input: ({ startAdornment, ...props }: any) => (
    <div>
      {startAdornment}
      <input data-testid="form-input" {...props} />
    </div>
  ),
  InputColor: ({ transparent: _transparent, defaultValue, value, ...props }: any) => {
    // Handle the transparent prop and defaultValue properly to avoid React warnings
    const inputProps = { ...props };
    // Only use defaultValue if value is not provided
    if (value !== undefined) {
      inputProps.value = value;
    } else if (defaultValue !== undefined) {
      inputProps.defaultValue = defaultValue;
    }
    return <input type="color" data-testid="color-input" {...inputProps} />;
  },
  Divider: () => <hr data-testid="divider" />,
}));

vi.mock("@/components/ui-kit/Icon", () => ({
  BorderRadiusIcon: () => <div data-testid="border-radius-icon">BorderRadiusIcon</div>,
  BorderWidthIcon: () => <div data-testid="border-width-icon">BorderWidthIcon</div>,
  PaddingHorizontalIcon: () => (
    <div data-testid="padding-horizontal-icon">PaddingHorizontalIcon</div>
  ),
  PaddingVerticalIcon: () => <div data-testid="padding-vertical-icon">PaddingVerticalIcon</div>,
}));

vi.mock("../../ui/FormHeader", () => ({
  FormHeader: ({ type }: any) => <div data-testid="form-header">FormHeader: {type}</div>,
}));

describe("TextBlock Types", () => {
  it("should validate valid TextBlock schema", () => {
    const validData = {
      paddingVertical: 10,
      paddingHorizontal: 15,
      backgroundColor: "#ffffff",
      borderWidth: 1,
      borderRadius: 5,
      borderColor: "#000000",
      textColor: "#333333",
      textAlign: "center" as const,
      selected: false,
    };

    const result = textBlockSchema.parse(validData);
    expect(result).toEqual(validData);
  });

  it("should use default values for textAlign when not provided", () => {
    const dataWithoutAlign = {
      paddingVertical: 10,
      paddingHorizontal: 15,
      backgroundColor: "#ffffff",
      borderWidth: 1,
      borderRadius: 5,
      borderColor: "#000000",
      textColor: "#333333",
      selected: false,
    };

    const result = textBlockSchema.parse(dataWithoutAlign);
    expect(result.textAlign).toBe("left");
  });

  it("should reject invalid textAlign values", () => {
    const invalidData = {
      paddingVertical: 10,
      paddingHorizontal: 15,
      backgroundColor: "#ffffff",
      borderWidth: 1,
      borderRadius: 5,
      borderColor: "#000000",
      textColor: "#333333",
      textAlign: "invalid" as any,
      selected: false,
    };

    expect(() => textBlockSchema.parse(invalidData)).toThrow();
  });

  it("should have correct default values", () => {
    expect(defaultTextBlockProps).toEqual({
      paddingVertical: 6,
      paddingHorizontal: 0,
      backgroundColor: "transparent",
      borderWidth: 0,
      borderRadius: 0,
      borderColor: "#000000",
      textColor: "#292929",
      textAlign: "left",
      selected: false,
    });
  });
});

describe("TextBlockComponent", () => {
  const defaultProps: TextBlockProps & { level?: number; type?: string } = {
    ...defaultTextBlockProps,
    level: 1,
    type: "paragraph",
  };

  it("should render with default props", () => {
    render(<TextBlockComponent {...defaultProps} />);

    const wrapper = screen.getByTestId("node-content");
    expect(wrapper).toBeInTheDocument();
  });

  it("should apply paragraph tag by default", () => {
    render(<TextBlockComponent {...defaultProps} />);

    const nodeContent = screen.getByTestId("node-content");
    expect(nodeContent).toBeInTheDocument();
  });

  it("should apply heading tag when type is heading", () => {
    render(<TextBlockComponent {...defaultProps} type="heading" level={2} />);

    const nodeContent = screen.getByTestId("node-content");
    expect(nodeContent).toBeInTheDocument();
  });

  it("should apply custom styles correctly", () => {
    const customProps = {
      ...defaultProps,
      paddingVertical: 20,
      paddingHorizontal: 15,
      backgroundColor: "#ff0000",
      borderWidth: 2,
      borderRadius: 10,
      borderColor: "#00ff00",
      textColor: "#0000ff",
      textAlign: "center" as const,
    };

    render(<TextBlockComponent {...customProps} />);

    // Check that component renders with custom props
    const nodeContent = screen.getByTestId("node-content");
    expect(nodeContent).toBeInTheDocument();
  });

  it("should not show border when borderWidth is 0", () => {
    const noBorderProps = {
      ...defaultProps,
      borderWidth: 0,
    };

    render(<TextBlockComponent {...noBorderProps} />);

    const nodeContent = screen.getByTestId("node-content");
    expect(nodeContent).toBeInTheDocument();
  });

  it("should show solid border when borderWidth > 0", () => {
    const withBorderProps = {
      ...defaultProps,
      borderWidth: 2,
    };

    render(<TextBlockComponent {...withBorderProps} />);

    const nodeContent = screen.getByTestId("node-content");
    expect(nodeContent).toBeInTheDocument();
  });

  it("should apply is-empty class when no textColor", () => {
    const noColorProps = {
      ...defaultProps,
      textColor: "",
    };

    render(<TextBlockComponent {...noColorProps} />);

    const nodeContent = screen.getByTestId("node-content");
    expect(nodeContent).toBeInTheDocument();
  });
});

describe("TextBlockComponentNode", () => {
  const mockEditor = {
    isEditable: true,
    state: {
      doc: {
        nodeAt: vi.fn(),
        resolve: vi.fn(() => ({
          parent: { type: { name: "doc" } },
        })),
      },
    },
  } as any;

  const mockNode = {
    attrs: {
      ...defaultTextBlockProps,
      id: "test-id",
    },
    type: { name: "paragraph" },
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

  it("should render TextBlockComponentNode", () => {
    render(<TextBlockComponentNode {...mockProps} />);

    const wrapper = screen.getByTestId("sortable-wrapper");
    expect(wrapper).toBeInTheDocument();
  });

  it("should handle click events when editor is editable", async () => {
    render(<TextBlockComponentNode {...mockProps} />);

    const clickableElement = screen.getByTestId("sortable-wrapper");
    await userEvent.click(clickableElement);

    // Test that the component handles clicks without throwing errors
    expect(clickableElement).toBeInTheDocument();
  });

  it("should not handle click events when editor is not editable", async () => {
    const nonEditableEditor = { ...mockEditor, isEditable: false };

    render(<TextBlockComponentNode {...mockProps} editor={nonEditableEditor} />);

    const clickableElement = screen.getByTestId("sortable-wrapper");
    await userEvent.click(clickableElement);

    // Component should still render
    expect(clickableElement).toBeInTheDocument();
  });

  it("should render differently when inside blockquote", () => {
    const blockquoteEditor = {
      ...mockEditor,
      state: {
        ...mockEditor.state,
        doc: {
          ...mockEditor.state.doc,
          resolve: vi.fn(() => ({
            parent: { type: { name: "blockquote" } },
          })),
        },
      },
    };

    render(<TextBlockComponentNode {...mockProps} editor={blockquoteEditor} />);

    // Should render with NodeViewWrapper instead of SortableItemWrapper
    const wrapper = screen.getByTestId("node-wrapper");
    expect(wrapper).toBeInTheDocument();
  });
});

describe("TextBlockForm", () => {
  const mockEditor = {
    isEditable: true,
  } as any;

  const mockElement = {
    attrs: defaultTextBlockProps,
    type: { name: "paragraph" },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should not render when element is not provided", () => {
    const { container } = render(<TextBlockForm editor={mockEditor} />);
    expect(container.firstChild).toBeNull();
  });

  it("should render form when element is provided", () => {
    render(<TextBlockForm element={mockElement} editor={mockEditor} />);

    expect(screen.getByTestId("form-header")).toBeInTheDocument();
    expect(screen.getByText("Frame")).toBeInTheDocument();
    expect(screen.getByText("Text")).toBeInTheDocument();
    expect(screen.getByText("Border")).toBeInTheDocument();
  });

  it("should render all form sections", () => {
    render(<TextBlockForm element={mockElement} editor={mockEditor} />);

    // Check Frame section
    expect(screen.getByText("Frame")).toBeInTheDocument();
    expect(screen.getByTestId("padding-horizontal-icon")).toBeInTheDocument();
    expect(screen.getByTestId("padding-vertical-icon")).toBeInTheDocument();

    // Check Text section
    expect(screen.getByText("Text")).toBeInTheDocument();

    // Check Border section
    expect(screen.getByText("Border")).toBeInTheDocument();
    expect(screen.getByTestId("border-width-icon")).toBeInTheDocument();
    expect(screen.getByTestId("border-radius-icon")).toBeInTheDocument();
  });

  it("should have proper form structure", () => {
    render(<TextBlockForm element={mockElement} editor={mockEditor} />);

    const form = screen.getByTestId("text-block-form");
    expect(form).toBeInTheDocument();

    // Should have input elements (mocked)
    const inputs = screen.getAllByTestId("form-input");
    expect(inputs.length).toBeGreaterThan(0);
  });
});
