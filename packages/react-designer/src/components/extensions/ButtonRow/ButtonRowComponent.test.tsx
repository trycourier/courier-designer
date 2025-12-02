import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ButtonRowComponent } from "./ButtonRowComponent";
import { Provider } from "jotai";
import { variableValuesAtom } from "../../TemplateEditor/store";
import { createStore } from "jotai";

// Mock dependencies
vi.mock("@/lib", () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(" "),
}));

vi.mock("../../ui/SortableItemWrapper", () => ({
  SortableItemWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("../Variable/VariableIcon", () => ({
  VariableIcon: () => <span data-testid="variable-icon">icon</span>,
}));

vi.mock("../../utils", () => ({
  isValidVariableName: (name: string) => /^[a-zA-Z0-9_.]+$/.test(name),
}));

describe("ButtonRowComponent", () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
    store.set(variableValuesAtom, { "user.name": "John Doe" });
  });

  const defaultProps = {
    button1Label: "Button 1",
    button1Link: "",
    button1BackgroundColor: "#000000",
    button1TextColor: "#ffffff",
    button2Label: "Button 2",
    button2Link: "",
    button2BackgroundColor: "#ffffff",
    button2TextColor: "#000000",
    padding: 6,
    editable: true,
    onButton1LabelChange: vi.fn(),
    onButton2LabelChange: vi.fn(),
  };

  const renderComponent = (props = {}) => {
    return render(
      <Provider store={store}>
        <ButtonRowComponent {...defaultProps} {...props} />
      </Provider>
    );
  };

  it("renders two buttons with correct labels", () => {
    renderComponent();
    expect(screen.getByText("Button 1")).toBeDefined();
    expect(screen.getByText("Button 2")).toBeDefined();
  });

  it("renders variable chips when label contains variables", () => {
    renderComponent({
      button1Label: "Hello {{user.name}}",
    });

    // Should find the text parts
    expect(screen.getByText("Hello")).toBeDefined();
    // Should find the variable chip content
    expect(screen.getByText('user.name="John Doe"')).toBeDefined();
  });

  it("renders raw text when editing a button with variables (click to edit)", async () => {
    renderComponent({
      button1Label: "Hello {{user.name}}",
    });

    // Initially shows chips
    expect(screen.getAllByTestId("variable-icon").length).toBeGreaterThan(0);

    // Find the container div for the first button
    // It initially has contentEditable=false
    const buttonText = screen.getByText("Hello");
    const buttonContainer = buttonText.closest("div");
    expect(buttonContainer).toBeDefined();
    expect(buttonContainer?.getAttribute("contenteditable")).toBe("false");

    // Simulate click to focus (Raw Edit Mode)
    fireEvent.click(buttonContainer!);
    // We also need to fire focus because the real component does .focus() in setTimeout
    // But for the test, triggering the click handler (which sets isFocused=true via focus event or state) 
    // Wait... handleClick just stops propagation. 
    // handlePointerDown calls .focus() in setTimeout.
    
    // Let's simulate the sequence:
    // 1. Pointer down (triggers logic to focus)
    fireEvent.pointerDown(buttonContainer!);
    
    // Since there is a setTimeout(..., 0) in handlePointerDown, we need to wait or manually fire focus
    // But handleFocus sets the state.
    act(() => {
        buttonContainer!.focus();
    });

    // Now it should be editable
    expect(buttonContainer?.getAttribute("contenteditable")).toBe("true");
    
    // Verify raw text is present and chips are gone
    expect(screen.queryByTestId("variable-icon")).toBeNull();
    expect(buttonContainer?.textContent).toBe("Hello {{user.name}}");
  });

  it("switches back to chips on blur", () => {
    renderComponent({
      button1Label: "Hello {{user.name}}",
    });

    const buttonText = screen.getByText("Hello");
    const buttonContainer = buttonText.closest("div");

    // Enter edit mode
    act(() => {
        buttonContainer!.focus();
    });
    expect(screen.queryByTestId("variable-icon")).toBeNull();

    // Blur (Chip Mode)
    fireEvent.blur(buttonContainer!);
    
    // Chips should return
    expect(screen.getAllByTestId("variable-icon").length).toBeGreaterThan(0);
  });

  it("stops propagation on click when variables are present to prevent parent selection issues", () => {
    const handleParentClick = vi.fn();
    render(
      <div onClick={handleParentClick}>
        <Provider store={store}>
          <ButtonRowComponent {...defaultProps} button1Label="Var {{user.name}}" />
        </Provider>
      </div>
    );

    // Find button with variable
    const button1 = screen.getByText("Var").closest("div");
    
    // Verify it has contenteditable=false (chip mode)
    expect(button1?.getAttribute("contenteditable")).toBe("false");

    // Click should stop propagation because it triggers mode switch
    fireEvent.click(button1!);

    expect(handleParentClick).not.toHaveBeenCalled();
  });

  it("allows propagation on click when no variables are present", () => {
    const handleParentClick = vi.fn();
    render(
      <div onClick={handleParentClick}>
        <Provider store={store}>
          <ButtonRowComponent {...defaultProps} button1Label="No Var" />
        </Provider>
      </div>
    );

    const button1 = screen.getByText("No Var").closest("div");
    fireEvent.click(button1!);

    expect(handleParentClick).toHaveBeenCalled();
  });

  it("handles input changes correctly", () => {
    const onButton1LabelChange = vi.fn();
    renderComponent({ onButton1LabelChange });

    const button1 = screen.getByText("Button 1").closest("div");
    
    // Simulate user typing
    if (button1) {
        button1.textContent = "New Label";
        fireEvent.input(button1);
    }

    // Should call callback
    expect(onButton1LabelChange).toHaveBeenCalledWith("New Label");
  });

  it("is read-only when editable prop is false", () => {
    renderComponent({ editable: false });
    
    const button1 = screen.getByText("Button 1").closest("div");
    expect(button1?.getAttribute("contenteditable")).toBe("false");
  });
  
  it("renders keys correctly for buttons (implicit test via rendering)", () => {
    // This verifies that re-renders don't crash or duplicate due to key issues
    const { rerender } = renderComponent();
    rerender(
      <Provider store={store}>
        <ButtonRowComponent {...defaultProps} button1Label="Updated" />
      </Provider>
    );
    expect(screen.getByText("Updated")).toBeDefined();
  });
});

