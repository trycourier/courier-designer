import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { VariableChipBase } from "./VariableChipBase";
import { Provider, createStore } from "jotai";
import { variableValidationAtom } from "@/components/TemplateEditor/store";
import type { VariableValidationConfig } from "@/types/validation.types";
import React from "react";

// Mock sonner toast
const mockToastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    error: (message: string) => mockToastError(message),
  },
}));

// Helper to create a store with validation config
function createTestStore(config?: VariableValidationConfig) {
  const store = createStore();
  store.set(variableValidationAtom, config);
  return store;
}

// Helper wrapper component
function TestWrapper({
  children,
  config,
}: {
  children: React.ReactNode;
  config?: VariableValidationConfig;
}) {
  const store = createTestStore(config);
  return <Provider store={store}>{children}</Provider>;
}

describe("VariableChipBase", () => {
  const defaultProps = {
    variableId: "user.name",
    isInvalid: false,
    onUpdateAttributes: vi.fn(),
    onDelete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Without custom validation", () => {
    it("should render the variable chip with value", () => {
      render(
        <TestWrapper>
          <VariableChipBase {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText("user.name")).toBeInTheDocument();
    });

    it("should show invalid styling when isInvalid is true", () => {
      const { container } = render(
        <TestWrapper>
          <VariableChipBase {...defaultProps} isInvalid={true} />
        </TestWrapper>
      );

      // Find the outer chip span with the invalid class
      const chip = container.querySelector(".courier-variable-chip-invalid");
      expect(chip).toBeInTheDocument();
    });

    it("should call onUpdateAttributes with isInvalid=false for valid format", async () => {
      const onUpdateAttributes = vi.fn();
      render(
        <TestWrapper>
          <VariableChipBase
            {...defaultProps}
            variableId=""
            onUpdateAttributes={onUpdateAttributes}
          />
        </TestWrapper>
      );

      // Find the editable span and type a valid variable name
      const editableSpan = screen.getByRole("textbox");
      fireEvent.focus(editableSpan);
      editableSpan.textContent = "valid.variable";
      fireEvent.blur(editableSpan);

      await waitFor(() => {
        expect(onUpdateAttributes).toHaveBeenCalledWith({
          id: "valid.variable",
          isInvalid: false,
        });
      });
    });

    it("should call onUpdateAttributes with isInvalid=true for invalid format", async () => {
      const onUpdateAttributes = vi.fn();
      render(
        <TestWrapper>
          <VariableChipBase
            {...defaultProps}
            variableId=""
            onUpdateAttributes={onUpdateAttributes}
          />
        </TestWrapper>
      );

      // Find the editable span and type an invalid variable name (with space)
      const editableSpan = screen.getByRole("textbox");
      fireEvent.focus(editableSpan);
      editableSpan.textContent = "invalid name";
      fireEvent.blur(editableSpan);

      await waitFor(() => {
        expect(onUpdateAttributes).toHaveBeenCalledWith({
          id: "invalid name",
          isInvalid: true,
        });
      });
    });
  });

  describe("With custom validation - mark behavior (default)", () => {
    const allowedVariables = ["user.firstName", "user.lastName", "user.email"];
    const validationConfig: VariableValidationConfig = {
      validate: (name) => allowedVariables.includes(name),
      onInvalid: "mark",
    };

    it("should mark allowed variable as valid", async () => {
      const onUpdateAttributes = vi.fn();
      render(
        <TestWrapper config={validationConfig}>
          <VariableChipBase
            {...defaultProps}
            variableId=""
            onUpdateAttributes={onUpdateAttributes}
          />
        </TestWrapper>
      );

      const editableSpan = screen.getByRole("textbox");
      fireEvent.focus(editableSpan);
      editableSpan.textContent = "user.firstName";
      fireEvent.blur(editableSpan);

      await waitFor(() => {
        expect(onUpdateAttributes).toHaveBeenCalledWith({
          id: "user.firstName",
          isInvalid: false,
        });
      });
    });

    it("should mark disallowed variable as invalid", async () => {
      const onUpdateAttributes = vi.fn();
      render(
        <TestWrapper config={validationConfig}>
          <VariableChipBase
            {...defaultProps}
            variableId=""
            onUpdateAttributes={onUpdateAttributes}
          />
        </TestWrapper>
      );

      const editableSpan = screen.getByRole("textbox");
      fireEvent.focus(editableSpan);
      editableSpan.textContent = "user.notAllowed";
      fireEvent.blur(editableSpan);

      await waitFor(() => {
        expect(onUpdateAttributes).toHaveBeenCalledWith({
          id: "user.notAllowed",
          isInvalid: true,
        });
      });
    });
  });

  describe("With custom validation - remove behavior", () => {
    const allowedVariables = ["user.firstName", "user.lastName"];
    const validationConfig: VariableValidationConfig = {
      validate: (name) => allowedVariables.includes(name),
      onInvalid: "remove",
    };

    it("should call onDelete for disallowed variable", async () => {
      const onDelete = vi.fn();
      render(
        <TestWrapper config={validationConfig}>
          <VariableChipBase {...defaultProps} value="" onDelete={onDelete} />
        </TestWrapper>
      );

      const editableSpan = screen.getByRole("textbox");
      fireEvent.focus(editableSpan);
      editableSpan.textContent = "user.notAllowed";
      fireEvent.blur(editableSpan);

      await waitFor(() => {
        expect(onDelete).toHaveBeenCalled();
      });
    });

    it("should NOT call onDelete for allowed variable", async () => {
      const onDelete = vi.fn();
      const onUpdateAttributes = vi.fn();
      render(
        <TestWrapper config={validationConfig}>
          <VariableChipBase
            {...defaultProps}
            variableId=""
            onDelete={onDelete}
            onUpdateAttributes={onUpdateAttributes}
          />
        </TestWrapper>
      );

      const editableSpan = screen.getByRole("textbox");
      fireEvent.focus(editableSpan);
      editableSpan.textContent = "user.firstName";
      fireEvent.blur(editableSpan);

      await waitFor(() => {
        expect(onDelete).not.toHaveBeenCalled();
        expect(onUpdateAttributes).toHaveBeenCalledWith({
          id: "user.firstName",
          isInvalid: false,
        });
      });
    });
  });

  describe("With invalidMessage - toast notifications", () => {
    it("should show toast with static string message", async () => {
      const validationConfig: VariableValidationConfig = {
        validate: () => false,
        invalidMessage: "Variable not allowed!",
      };

      render(
        <TestWrapper config={validationConfig}>
          <VariableChipBase {...defaultProps} value="" />
        </TestWrapper>
      );

      const editableSpan = screen.getByRole("textbox");
      fireEvent.focus(editableSpan);
      editableSpan.textContent = "some.variable";
      fireEvent.blur(editableSpan);

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith("Variable not allowed!");
      });
    });

    it("should show toast with dynamic function message", async () => {
      const validationConfig: VariableValidationConfig = {
        validate: () => false,
        invalidMessage: (name) => `"${name}" is not in the allowed list`,
      };

      render(
        <TestWrapper config={validationConfig}>
          <VariableChipBase {...defaultProps} value="" />
        </TestWrapper>
      );

      const editableSpan = screen.getByRole("textbox");
      fireEvent.focus(editableSpan);
      editableSpan.textContent = "custom.var";
      fireEvent.blur(editableSpan);

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith(
          '"custom.var" is not in the allowed list'
        );
      });
    });

    it("should NOT show toast when validation passes", async () => {
      const validationConfig: VariableValidationConfig = {
        validate: () => true,
        invalidMessage: "Should not see this",
      };

      render(
        <TestWrapper config={validationConfig}>
          <VariableChipBase {...defaultProps} value="" />
        </TestWrapper>
      );

      const editableSpan = screen.getByRole("textbox");
      fireEvent.focus(editableSpan);
      editableSpan.textContent = "valid.var";
      fireEvent.blur(editableSpan);

      await waitFor(() => {
        expect(mockToastError).not.toHaveBeenCalled();
      });
    });
  });

  describe("With overrideFormatValidation", () => {
    it("should skip format validation when overrideFormatValidation is true", async () => {
      const onUpdateAttributes = vi.fn();
      // This allows "invalid name" even though it has a space
      const validationConfig: VariableValidationConfig = {
        validate: () => true,
        overrideFormatValidation: true,
      };

      render(
        <TestWrapper config={validationConfig}>
          <VariableChipBase
            {...defaultProps}
            variableId=""
            onUpdateAttributes={onUpdateAttributes}
          />
        </TestWrapper>
      );

      const editableSpan = screen.getByRole("textbox");
      fireEvent.focus(editableSpan);
      // This would normally be invalid due to space
      editableSpan.textContent = "invalid name";
      fireEvent.blur(editableSpan);

      await waitFor(() => {
        // With overrideFormatValidation, the custom validator (returns true) wins
        expect(onUpdateAttributes).toHaveBeenCalledWith({
          id: "invalid name",
          isInvalid: false,
        });
      });
    });

    it("should apply format validation first when overrideFormatValidation is false", async () => {
      const onUpdateAttributes = vi.fn();
      // Custom validator returns true, but format validation should fail first
      const validationConfig: VariableValidationConfig = {
        validate: () => true,
        overrideFormatValidation: false,
      };

      render(
        <TestWrapper config={validationConfig}>
          <VariableChipBase
            {...defaultProps}
            variableId=""
            onUpdateAttributes={onUpdateAttributes}
          />
        </TestWrapper>
      );

      const editableSpan = screen.getByRole("textbox");
      fireEvent.focus(editableSpan);
      // This would fail format validation due to space
      editableSpan.textContent = "invalid name";
      fireEvent.blur(editableSpan);

      await waitFor(() => {
        // Format validation fails first, custom validator is not even called
        expect(onUpdateAttributes).toHaveBeenCalledWith({
          id: "invalid name",
          isInvalid: true,
        });
      });
    });
  });

  describe("Edge cases", () => {
    it("should delete chip when value is empty on blur", async () => {
      const onDelete = vi.fn();
      render(
        <TestWrapper>
          <VariableChipBase {...defaultProps} value="" onDelete={onDelete} />
        </TestWrapper>
      );

      const editableSpan = screen.getByRole("textbox");
      fireEvent.focus(editableSpan);
      editableSpan.textContent = "";
      fireEvent.blur(editableSpan);

      await waitFor(() => {
        expect(onDelete).toHaveBeenCalled();
      });
    });

    it("should handle validation config without validate function", async () => {
      const onUpdateAttributes = vi.fn();
      // Config without validate function - only built-in format validation
      const validationConfig: VariableValidationConfig = {
        onInvalid: "mark",
      };

      render(
        <TestWrapper config={validationConfig}>
          <VariableChipBase
            {...defaultProps}
            variableId=""
            onUpdateAttributes={onUpdateAttributes}
          />
        </TestWrapper>
      );

      const editableSpan = screen.getByRole("textbox");
      fireEvent.focus(editableSpan);
      editableSpan.textContent = "valid.variable";
      fireEvent.blur(editableSpan);

      await waitFor(() => {
        expect(onUpdateAttributes).toHaveBeenCalledWith({
          id: "valid.variable",
          isInvalid: false,
        });
      });
    });
  });
});

