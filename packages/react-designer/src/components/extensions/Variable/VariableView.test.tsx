import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { VariableView } from "./VariableView";
import type { NodeViewProps } from "@tiptap/core";

const mockAtomValues = new Map();

// Mock jotai
vi.mock("jotai", async () => {
  const actual = await vi.importActual("jotai");
  return {
    ...actual,
    useAtomValue: vi.fn((atom) => {
      return mockAtomValues.get(atom) ?? {};
    }),
  };
});

vi.mock("../../TemplateEditor/store", async () => {
  const actual = await vi.importActual("../../TemplateEditor/store");
  const variableValuesAtomMock = Symbol("variableValuesAtom");

  return {
    ...actual,
    variableValuesAtom: variableValuesAtomMock,
  };
});

// Mock the VariableIcon
vi.mock("./VariableIcon", () => ({
  VariableIcon: ({ color }: { color?: string }) => (
    <span data-testid="variable-icon" data-color={color}>
      icon
    </span>
  ),
}));

// Mock validateVariableName
vi.mock("../../utils/validateVariableName", () => ({
  isValidVariableName: (name: string) => {
    // Simple validation: alphanumeric, underscores, dots, no spaces
    const trimmed = name.trim();
    if (!trimmed) return false;
    if (trimmed.startsWith(".") || trimmed.endsWith(".")) return false;
    if (trimmed.includes("..")) return false;
    if (trimmed.includes(" ")) return false;
    return /^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(trimmed);
  },
}));

// Create mock editor
const createMockEditor = (variableViewMode: "show-variables" | "wysiwyg" = "show-variables") => ({
  state: {
    doc: {
      resolve: vi.fn(() => ({
        parent: { type: { name: "paragraph" } },
      })),
    },
  },
  storage: {
    variable: {
      variableViewMode,
    },
  },
  isEditable: true,
  on: vi.fn(),
  off: vi.fn(),
  chain: vi.fn(() => ({
    focus: vi.fn(() => ({
      deleteRange: vi.fn(() => ({
        run: vi.fn(),
      })),
    })),
  })),
});

// Create mock node
const createMockNode = (attrs: { id?: string; isInvalid?: boolean } = {}) => ({
  attrs: {
    id: attrs.id ?? "",
    isInvalid: attrs.isInvalid ?? false,
  },
  nodeSize: 1,
});

// Create mock props
const createMockProps = (
  nodeAttrs: { id?: string; isInvalid?: boolean } = {},
  overrides: Partial<NodeViewProps> = {}
): NodeViewProps => {
  const mockEditor = overrides.editor || createMockEditor();
  return {
    node: createMockNode(nodeAttrs),
    editor: mockEditor,
    getPos: vi.fn(() => 0),
    updateAttributes: vi.fn(),
    deleteNode: vi.fn(),
    selected: false,
    extension: {} as any,
    HTMLAttributes: {},
    decorations: [],
    ...overrides,
  } as unknown as NodeViewProps;
};

// Helper to simulate typing in contentEditable
const typeInContentEditable = (element: HTMLElement, text: string) => {
  element.textContent = text;
  fireEvent.input(element);
};

// Helper to clear contentEditable
const clearContentEditable = (element: HTMLElement) => {
  element.textContent = "";
  fireEvent.input(element);
};

describe("VariableView", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockAtomValues.clear();

    const store = await import("../../TemplateEditor/store");
    mockAtomValues.set(store.variableValuesAtom, {});
  });

  describe("Rendering", () => {
    it("should render variable with id", () => {
      const props = createMockProps({ id: "user.name" });
      render(<VariableView {...props} />);

      const editable = screen.getByRole("textbox");
      expect(editable.textContent).toBe("user.name");
      expect(screen.getByTestId("variable-icon")).toBeInTheDocument();
    });

    it("should render empty variable in editing mode", () => {
      const props = createMockProps({ id: "" });
      render(<VariableView {...props} />);

      // Should show editable for empty variables
      const editable = screen.getByRole("textbox");
      expect(editable).toBeInTheDocument();
    });

    it("should render with invalid styling when isInvalid is true", () => {
      const props = createMockProps({ id: "invalid name", isInvalid: true });
      render(<VariableView {...props} />);

      // Check that red color is applied to icon
      const icon = screen.getByTestId("variable-icon");
      expect(icon).toHaveAttribute("data-color", "#DC2626");
    });

    it("should render with normal styling when isInvalid is false", () => {
      const props = createMockProps({ id: "valid_name", isInvalid: false });
      render(<VariableView {...props} />);

      // Check that warning color is applied (no value set)
      const icon = screen.getByTestId("variable-icon");
      expect(icon).toHaveAttribute("data-color", "#B45309");
    });
  });

  describe("Truncation", () => {
    it("should limit display width for long variable names", () => {
      const longName = "this_is_a_very_long_variable_name_that_exceeds_limit";
      const truncatedName = "this_is_a_very_long_vari…"; // MAX_DISPLAY_LENGTH (24) chars + ellipsis
      const props = createMockProps({ id: longName });
      render(<VariableView {...props} />);

      // Editable shows truncated text (JS truncation) with maxWidth CSS limit
      const editable = screen.getByRole("textbox");
      expect(editable.textContent).toBe(truncatedName);
      // Max width should be limited to MAX_DISPLAY_LENGTH (24ch)
      expect(editable.style.maxWidth).toBe("24ch");
    });

    it("should show full name in title for truncated variables", () => {
      const longName = "this_is_a_very_long_variable_name_that_exceeds_limit";
      const props = createMockProps({ id: longName });
      render(<VariableView {...props} />);

      // Should have title attribute with full name
      const chip = document.querySelector(".courier-variable-node");
      expect(chip).toHaveAttribute("title", longName);
    });

    it("should not show title for short variable names", () => {
      const shortName = "user.name";
      const props = createMockProps({ id: shortName });
      render(<VariableView {...props} />);

      // Should not have title attribute
      const chip = document.querySelector(".courier-variable-node");
      expect(chip).not.toHaveAttribute("title");
    });
  });

  describe("Editing", () => {
    it("should enter edit mode on double click", async () => {
      const props = createMockProps({ id: "user.name" });
      render(<VariableView {...props} />);

      const chip = document.querySelector(".courier-variable-node");
      fireEvent.doubleClick(chip!);

      await waitFor(() => {
        const editable = screen.getByRole("textbox");
        expect(editable).toHaveAttribute("contenteditable", "true");
      });
    });

    it("should auto-enter edit mode for empty variables", () => {
      const props = createMockProps({ id: "" });
      render(<VariableView {...props} />);

      const editable = screen.getByRole("textbox");
      expect(editable).toHaveAttribute("contenteditable", "true");
    });

    it("should update attributes on blur with valid name", async () => {
      const updateAttributes = vi.fn();
      const props = createMockProps({ id: "" }, { updateAttributes });
      render(<VariableView {...props} />);

      const editable = screen.getByRole("textbox");
      typeInContentEditable(editable, "valid_name");
      fireEvent.blur(editable);

      expect(updateAttributes).toHaveBeenCalledWith({
        id: "valid_name",
        isInvalid: false,
      });
    });

    it("should mark as invalid on blur with invalid name", async () => {
      const updateAttributes = vi.fn();
      const props = createMockProps({ id: "" }, { updateAttributes });
      render(<VariableView {...props} />);

      const editable = screen.getByRole("textbox");
      typeInContentEditable(editable, "invalid name");
      fireEvent.blur(editable);

      expect(updateAttributes).toHaveBeenCalledWith({
        id: "invalid name",
        isInvalid: true,
      });
    });

    it("should delete variable on blur when empty", async () => {
      const mockEditor = createMockEditor();
      const deleteRangeMock = vi.fn(() => ({ run: vi.fn() }));
      mockEditor.chain = vi.fn(() => ({
        focus: vi.fn(() => ({
          deleteRange: deleteRangeMock,
        })),
      }));

      const props = createMockProps({ id: "test" }, { editor: mockEditor as any });
      render(<VariableView {...props} />);

      // Double click to edit
      const chip = document.querySelector(".courier-variable-node");
      fireEvent.doubleClick(chip!);

      await waitFor(() => {
        const editable = screen.getByRole("textbox");
        expect(editable).toHaveAttribute("contenteditable", "true");
      });

      // Clear and blur
      const editable = screen.getByRole("textbox");
      clearContentEditable(editable);
      fireEvent.blur(editable);

      expect(mockEditor.chain).toHaveBeenCalled();
    });

    it("should confirm edit on Enter key", async () => {
      const updateAttributes = vi.fn();
      const props = createMockProps({ id: "" }, { updateAttributes });
      render(<VariableView {...props} />);

      const editable = screen.getByRole("textbox");
      typeInContentEditable(editable, "test_name");
      fireEvent.keyDown(editable, { key: "Enter" });

      expect(updateAttributes).toHaveBeenCalledWith({
        id: "test_name",
        isInvalid: false,
      });
    });

    it("should cancel edit on Escape key", async () => {
      const props = createMockProps({ id: "original_name" });
      render(<VariableView {...props} />);

      // Double click to edit
      const chip = document.querySelector(".courier-variable-node");
      fireEvent.doubleClick(chip!);

      await waitFor(() => {
        const editable = screen.getByRole("textbox");
        expect(editable).toHaveAttribute("contenteditable", "true");
      });

      const editable = screen.getByRole("textbox");
      typeInContentEditable(editable, "new_name");
      fireEvent.keyDown(editable, { key: "Escape" });

      // Should revert to original and exit edit mode
      await waitFor(() => {
        expect(editable.textContent).toBe("original_name");
      });
    });
  });

  describe("Max Length", () => {
    it("should enforce max length on input", async () => {
      const updateAttributes = vi.fn();
      const props = createMockProps({ id: "" }, { updateAttributes });
      render(<VariableView {...props} />);

      const editable = screen.getByRole("textbox");
      const longValue = "a".repeat(100);

      // Type a long value (should be truncated by input handler)
      typeInContentEditable(editable, longValue);
      fireEvent.blur(editable);

      // Should be truncated to 50 characters
      expect(updateAttributes).toHaveBeenCalledWith({
        id: "a".repeat(50),
        isInvalid: false,
      });
    });
  });

  describe("View Mode", () => {
    it("should render as chip component in show-variables mode", async () => {
      const store = await import("../../TemplateEditor/store");
      mockAtomValues.set(store.variableValuesAtom, {});

      const props = createMockProps({ id: "user.name" });
      render(<VariableView {...props} />);

      expect(screen.getByRole("textbox")).toBeInTheDocument();
      expect(screen.getByTestId("variable-icon")).toBeInTheDocument();
    });

    it("should render variable value as plain text in wysiwyg mode", async () => {
      const store = await import("../../TemplateEditor/store");
      mockAtomValues.set(store.variableValuesAtom, { "user.name": "John Doe" });

      const mockEditor = createMockEditor("wysiwyg");
      const props = createMockProps({ id: "user.name" }, { editor: mockEditor as any });
      render(<VariableView {...props} />);

      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      expect(screen.queryByTestId("variable-icon")).not.toBeInTheDocument();
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    it("should render empty string when no value in wysiwyg mode", async () => {
      const store = await import("../../TemplateEditor/store");
      mockAtomValues.set(store.variableValuesAtom, {});

      const mockEditor = createMockEditor("wysiwyg");
      const props = createMockProps({ id: "user.name" }, { editor: mockEditor as any });
      const { container } = render(<VariableView {...props} />);

      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      expect(screen.queryByTestId("variable-icon")).not.toBeInTheDocument();
      const span = container.querySelector("span");
      expect(span?.textContent).toBe("");
    });
  });

  describe("Validation", () => {
    it("should mark valid names correctly", async () => {
      const updateAttributes = vi.fn();
      const props = createMockProps({ id: "" }, { updateAttributes });
      render(<VariableView {...props} />);

      const editable = screen.getByRole("textbox");
      typeInContentEditable(editable, "user.firstName");
      fireEvent.blur(editable);

      expect(updateAttributes).toHaveBeenCalledWith({
        id: "user.firstName",
        isInvalid: false,
      });
    });

    it("should mark names with spaces as invalid", async () => {
      const updateAttributes = vi.fn();
      const props = createMockProps({ id: "" }, { updateAttributes });
      render(<VariableView {...props} />);

      const editable = screen.getByRole("textbox");
      typeInContentEditable(editable, "invalid name");
      fireEvent.blur(editable);

      expect(updateAttributes).toHaveBeenCalledWith({
        id: "invalid name",
        isInvalid: true,
      });
    });

    it("should mark names starting with dot as invalid", async () => {
      const updateAttributes = vi.fn();
      const props = createMockProps({ id: "" }, { updateAttributes });
      render(<VariableView {...props} />);

      const editable = screen.getByRole("textbox");
      typeInContentEditable(editable, ".invalid");
      fireEvent.blur(editable);

      expect(updateAttributes).toHaveBeenCalledWith({
        id: ".invalid",
        isInvalid: true,
      });
    });

    it("should mark names with double dots as invalid", async () => {
      const updateAttributes = vi.fn();
      const props = createMockProps({ id: "" }, { updateAttributes });
      render(<VariableView {...props} />);

      const editable = screen.getByRole("textbox");
      typeInContentEditable(editable, "user..name");
      fireEvent.blur(editable);

      expect(updateAttributes).toHaveBeenCalledWith({
        id: "user..name",
        isInvalid: true,
      });
    });
  });
});
