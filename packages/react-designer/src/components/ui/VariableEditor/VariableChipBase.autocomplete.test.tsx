import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { VariableChipBase } from "./VariableChipBase";
import { Provider, createStore } from "jotai";
import {
  variableValidationAtom,
  availableVariablesAtom,
} from "@/components/TemplateEditor/store";
import React from "react";

Element.prototype.scrollIntoView = vi.fn();

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

function createTestStore(variables?: Record<string, unknown>) {
  const store = createStore();
  if (variables) {
    store.set(availableVariablesAtom, variables);
  }
  return store;
}

function TestWrapper({
  children,
  variables,
}: {
  children: React.ReactNode;
  variables?: Record<string, unknown>;
}) {
  const store = createTestStore(variables);
  return <Provider store={store}>{children}</Provider>;
}

describe("VariableChipBase autocomplete selection", () => {
  const baseProps = {
    variableId: "",
    isInvalid: false,
    onUpdateAttributes: vi.fn(),
    onDelete: vi.fn(),
    onCommit: vi.fn(),
    icon: <span data-testid="icon" />,
    isInsideLoop: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("$.item special case", () => {
    it("should keep edit mode open and append a dot when $.item is selected", async () => {
      const onUpdateAttributes = vi.fn();
      const onCommit = vi.fn();

      render(
        <TestWrapper>
          <VariableChipBase
            {...baseProps}
            onUpdateAttributes={onUpdateAttributes}
            onCommit={onCommit}
          />
        </TestWrapper>
      );

      const editableSpan = screen.getByRole("textbox");
      expect(editableSpan.getAttribute("contenteditable")).toBe("true");

      // The autocomplete should show $.item and $.index when isInsideLoop
      const itemButton = await screen.findByText("$.item");
      expect(itemButton).toBeInTheDocument();

      // Click $.item
      fireEvent.click(itemButton);

      // Should NOT commit or update attributes (chip stays in edit mode)
      expect(onCommit).not.toHaveBeenCalled();
      expect(onUpdateAttributes).not.toHaveBeenCalled();

      // The editable span should contain "$.item."
      await waitFor(() => {
        expect(editableSpan.textContent).toBe("$.item.");
      });
    });

    it("should not trigger the special case for $.index", async () => {
      const onUpdateAttributes = vi.fn();
      const onCommit = vi.fn();

      render(
        <TestWrapper>
          <VariableChipBase
            {...baseProps}
            onUpdateAttributes={onUpdateAttributes}
            onCommit={onCommit}
          />
        </TestWrapper>
      );

      const indexButton = await screen.findByText("$.index");
      fireEvent.click(indexButton);

      await waitFor(() => {
        expect(onUpdateAttributes).toHaveBeenCalledWith({
          id: "$.index",
          isInvalid: false,
        });
        expect(onCommit).toHaveBeenCalled();
      });
    });

    it("should not trigger the special case for regular variables", async () => {
      const onUpdateAttributes = vi.fn();
      const onCommit = vi.fn();

      render(
        <TestWrapper variables={{ user: { name: "John" } }}>
          <VariableChipBase
            {...baseProps}
            onUpdateAttributes={onUpdateAttributes}
            onCommit={onCommit}
          />
        </TestWrapper>
      );

      const userButton = await screen.findByText("user.name");
      fireEvent.click(userButton);

      await waitFor(() => {
        expect(onUpdateAttributes).toHaveBeenCalledWith({
          id: "user.name",
          isInvalid: false,
        });
        expect(onCommit).toHaveBeenCalled();
      });
    });

    it("should keep the editable span focused after $.item selection", async () => {
      render(
        <TestWrapper>
          <VariableChipBase {...baseProps} />
        </TestWrapper>
      );

      const editableSpan = screen.getByRole("textbox");
      const itemButton = await screen.findByText("$.item");

      fireEvent.click(itemButton);

      // Let requestAnimationFrame fire
      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(editableSpan.getAttribute("contenteditable")).toBe("true");
    });

    it("should handle keyboard Enter to select $.item and keep editing", async () => {
      const onUpdateAttributes = vi.fn();
      const onCommit = vi.fn();

      render(
        <TestWrapper>
          <VariableChipBase
            {...baseProps}
            onUpdateAttributes={onUpdateAttributes}
            onCommit={onCommit}
          />
        </TestWrapper>
      );

      const editableSpan = screen.getByRole("textbox");

      // $.item is the first suggestion (selectedIndex defaults to 0), press Enter
      fireEvent.keyDown(editableSpan, { key: "Enter" });

      // Should NOT commit (same as click)
      expect(onCommit).not.toHaveBeenCalled();
      expect(onUpdateAttributes).not.toHaveBeenCalled();

      await waitFor(() => {
        expect(editableSpan.textContent).toBe("$.item.");
      });
    });

    it("should handle keyboard Tab to select $.item and keep editing", async () => {
      const onUpdateAttributes = vi.fn();
      const onCommit = vi.fn();

      render(
        <TestWrapper>
          <VariableChipBase
            {...baseProps}
            onUpdateAttributes={onUpdateAttributes}
            onCommit={onCommit}
          />
        </TestWrapper>
      );

      const editableSpan = screen.getByRole("textbox");

      fireEvent.keyDown(editableSpan, { key: "Tab" });

      expect(onCommit).not.toHaveBeenCalled();
      expect(onUpdateAttributes).not.toHaveBeenCalled();

      await waitFor(() => {
        expect(editableSpan.textContent).toBe("$.item.");
      });
    });
  });
});
