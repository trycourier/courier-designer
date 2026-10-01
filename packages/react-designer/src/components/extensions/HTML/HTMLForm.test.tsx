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

const reason = "<table> has 1 opening tag but 0 closing tags.";

describe("HTMLForm validation errors (SUP-779)", () => {
  it("shows nothing while the code is valid", () => {
    render(<HTMLForm element={element} editor={null} />);

    act(() => reportValidationErrors?.([], { edited: false }));

    expect(screen.queryByTestId("html-validation-errors")).toBeNull();
  });

  it("says an edit was not saved, with the reasons", () => {
    render(<HTMLForm element={element} editor={null} />);

    act(() => reportValidationErrors?.([reason], { edited: true }));

    const alert = screen.getByTestId("html-validation-errors");
    expect(alert.textContent).toContain("Changes not saved. The block keeps its last valid HTML.");
    expect(alert.textContent).toContain(reason);
  });

  it("does not claim an unsaved change when the loaded code is already invalid", () => {
    render(<HTMLForm element={element} editor={null} />);

    act(() => reportValidationErrors?.([reason], { edited: false }));

    const alert = screen.getByTestId("html-validation-errors");
    expect(alert.textContent).toContain("This HTML isn't supported.");
    expect(alert.textContent).not.toContain("Changes not saved");
  });

  it("clears the alert once the code is valid again", () => {
    render(<HTMLForm element={element} editor={null} />);

    act(() => reportValidationErrors?.([reason], { edited: true }));
    act(() => reportValidationErrors?.([], { edited: true }));

    expect(screen.queryByTestId("html-validation-errors")).toBeNull();
  });

  describe("Outlook conditional comments", () => {
    const render_ = (code: string) =>
      render(
        <HTMLForm
          element={{ attrs: { id: "node-mso", code } } as unknown as ProseMirrorNode}
          editor={null}
        />
      );

    it("warns that they are removed when the email is sent, without blocking", () => {
      render_(`<!--[if mso]><p>Outlook</p><![endif]--><p>everyone</p>`);

      const warning = screen.getByTestId("html-outlook-conditionals-warning");
      expect(warning.textContent).toContain("are removed when this email is sent");
      expect(screen.queryByTestId("html-validation-errors")).toBeNull();
    });

    it("shows nothing for HTML without them", () => {
      render_(`<!-- note --><p>everyone</p>`);

      expect(screen.queryByTestId("html-outlook-conditionals-warning")).toBeNull();
    });
  });
});
