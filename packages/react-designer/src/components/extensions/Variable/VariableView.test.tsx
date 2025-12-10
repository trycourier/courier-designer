import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VariableView } from "./VariableView";
import type { NodeViewProps } from "@tiptap/core";

// Mock jotai
vi.mock("jotai", async () => {
  const actual = await vi.importActual("jotai");
  return {
    ...actual,
    useAtomValue: vi.fn(() => ({})),
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
const createMockEditor = () => ({
  state: {
    doc: {
      resolve: vi.fn(() => ({
        parent: { type: { name: "paragraph" } },
      })),
    },
  },
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
  const mockEditor = createMockEditor();
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

describe("VariableView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render variable with id", () => {
      const props = createMockProps({ id: "user.name" });
      render(<VariableView {...props} />);

      expect(screen.getByText("user.name")).toBeInTheDocument();
      expect(screen.getByTestId("variable-icon")).toBeInTheDocument();
    });

    it("should render empty variable in editing mode", () => {
      const props = createMockProps({ id: "" });
      render(<VariableView {...props} />);

      // Should show input for empty variables
      const input = screen.getByRole("textbox");
      expect(input).toBeInTheDocument();
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
    it("should truncate long variable names", () => {
      const longName = "this_is_a_very_long_variable_name_that_exceeds_limit";
      const props = createMockProps({ id: longName });
      render(<VariableView {...props} />);

      // Should show truncated name with ellipsis
      expect(screen.getByText(/this_is_a_very_long_vari…/)).toBeInTheDocument();
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
        expect(screen.getByRole("textbox")).toBeInTheDocument();
      });
    });

    it("should auto-enter edit mode for empty variables", () => {
      const props = createMockProps({ id: "" });
      render(<VariableView {...props} />);

      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    it("should update attributes on blur with valid name", async () => {
      const updateAttributes = vi.fn();
      const props = createMockProps({ id: "" }, { updateAttributes });
      render(<VariableView {...props} />);

      const input = screen.getByRole("textbox");
      await userEvent.type(input, "valid_name");
      fireEvent.blur(input);

      expect(updateAttributes).toHaveBeenCalledWith({
        id: "valid_name",
        isInvalid: false,
      });
    });

    it("should mark as invalid on blur with invalid name", async () => {
      const updateAttributes = vi.fn();
      const props = createMockProps({ id: "" }, { updateAttributes });
      render(<VariableView {...props} />);

      const input = screen.getByRole("textbox");
      await userEvent.type(input, "invalid name");
      fireEvent.blur(input);

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
        expect(screen.getByRole("textbox")).toBeInTheDocument();
      });

      // Clear input and blur
      const input = screen.getByRole("textbox");
      await userEvent.clear(input);
      fireEvent.blur(input);

      expect(mockEditor.chain).toHaveBeenCalled();
    });

    it("should confirm edit on Enter key", async () => {
      const updateAttributes = vi.fn();
      const props = createMockProps({ id: "" }, { updateAttributes });
      render(<VariableView {...props} />);

      const input = screen.getByRole("textbox");
      await userEvent.type(input, "test_name{Enter}");

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

      const input = screen.getByRole("textbox");
      await userEvent.clear(input);
      await userEvent.type(input, "new_name{Escape}");

      // Should revert to original and exit edit mode
      await waitFor(() => {
        expect(screen.getByText("original_name")).toBeInTheDocument();
      });
    });
  });

  describe("Max Length", () => {
    it("should limit input to MAX_VARIABLE_LENGTH characters", async () => {
      const props = createMockProps({ id: "" });
      render(<VariableView {...props} />);

      const input = screen.getByRole("textbox") as HTMLInputElement;
      expect(input).toHaveAttribute("maxLength", "50");
    });

    it("should truncate pasted content to MAX_VARIABLE_LENGTH", async () => {
      const updateAttributes = vi.fn();
      const props = createMockProps({ id: "" }, { updateAttributes });
      render(<VariableView {...props} />);

      const input = screen.getByRole("textbox");
      const longValue = "a".repeat(100);

      // Simulate typing a long value (should be truncated by onChange handler)
      fireEvent.change(input, { target: { value: longValue } });
      fireEvent.blur(input);

      // Should be truncated to 50 characters
      expect(updateAttributes).toHaveBeenCalledWith({
        id: "a".repeat(50),
        isInvalid: false,
      });
    });
  });

  describe("Validation", () => {
    it("should mark valid names correctly", async () => {
      const updateAttributes = vi.fn();
      const props = createMockProps({ id: "" }, { updateAttributes });
      render(<VariableView {...props} />);

      const input = screen.getByRole("textbox");
      await userEvent.type(input, "user.firstName");
      fireEvent.blur(input);

      expect(updateAttributes).toHaveBeenCalledWith({
        id: "user.firstName",
        isInvalid: false,
      });
    });

    it("should mark names with spaces as invalid", async () => {
      const updateAttributes = vi.fn();
      const props = createMockProps({ id: "" }, { updateAttributes });
      render(<VariableView {...props} />);

      const input = screen.getByRole("textbox");
      await userEvent.type(input, "invalid name");
      fireEvent.blur(input);

      expect(updateAttributes).toHaveBeenCalledWith({
        id: "invalid name",
        isInvalid: true,
      });
    });

    it("should mark names starting with dot as invalid", async () => {
      const updateAttributes = vi.fn();
      const props = createMockProps({ id: "" }, { updateAttributes });
      render(<VariableView {...props} />);

      const input = screen.getByRole("textbox");
      await userEvent.type(input, ".invalid");
      fireEvent.blur(input);

      expect(updateAttributes).toHaveBeenCalledWith({
        id: ".invalid",
        isInvalid: true,
      });
    });

    it("should mark names with double dots as invalid", async () => {
      const updateAttributes = vi.fn();
      const props = createMockProps({ id: "" }, { updateAttributes });
      render(<VariableView {...props} />);

      const input = screen.getByRole("textbox");
      await userEvent.type(input, "user..name");
      fireEvent.blur(input);

      expect(updateAttributes).toHaveBeenCalledWith({
        id: "user..name",
        isInvalid: true,
      });
    });
  });
});
