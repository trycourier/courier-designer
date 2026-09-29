import { act, render, screen } from "@testing-library/react";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { describe, expect, it, vi } from "vitest";

type ValidationErrorsHandler = (errors: string[], meta: { edited: boolean }) => void;
let reportValidationErrors: ValidationErrorsHandler | undefined;

vi.mock("./MonacoCodeEditor", () => ({
  MonacoCodeEditor: (props: { onValidationErrors?: ValidationErrorsHandler }) => {
    reportValidationErrors = props.onValidationErrors;
    return <div data-testid="mock-monaco-editor" />;
  },
}));

vi.mock("../../hooks", () => ({
  useNodeAttributes: () => ({ updateNodeAttributes: vi.fn() }),
}));

vi.mock("../../ui/FormHeader", () => ({
  FormHeader: () => null,
}));

vi.mock("../../ui/Conditions", () => ({
  ConditionsSection: () => null,
}));

import { HTMLForm } from "./HTMLForm";

const element = {
  attrs: { id: "node-1", code: "<!-- Add your HTML code here -->" },
} as unknown as ProseMirrorNode;

const mso = "Outlook conditional comments (<!--[if mso]> … <![endif]-->) aren't supported.";

describe("HTMLForm validation errors (SUP-779)", () => {
  it("shows nothing while the code is valid", () => {
    render(<HTMLForm element={element} editor={null} />);

    act(() => reportValidationErrors?.([], { edited: false }));

    expect(screen.queryByTestId("html-validation-errors")).toBeNull();
  });

  it("says an edit was not saved, with the reasons", () => {
    render(<HTMLForm element={element} editor={null} />);

    act(() => reportValidationErrors?.([mso], { edited: true }));

    const alert = screen.getByTestId("html-validation-errors");
    expect(alert.textContent).toContain("Changes not saved. The block keeps its last valid HTML.");
    expect(alert.textContent).toContain(mso);
  });

  it("does not claim an unsaved change when the loaded code is already invalid", () => {
    render(<HTMLForm element={element} editor={null} />);

    act(() => reportValidationErrors?.([mso], { edited: false }));

    const alert = screen.getByTestId("html-validation-errors");
    expect(alert.textContent).toContain("This HTML isn't supported.");
    expect(alert.textContent).not.toContain("Changes not saved");
  });

  it("clears the alert once the code is valid again", () => {
    render(<HTMLForm element={element} editor={null} />);

    act(() => reportValidationErrors?.([mso], { edited: true }));
    act(() => reportValidationErrors?.([], { edited: true }));

    expect(screen.queryByTestId("html-validation-errors")).toBeNull();
  });
});
