import { fireEvent, render, waitFor } from "@testing-library/react";
import type { NodeViewProps } from "@tiptap/react";
import { Provider, createStore } from "jotai";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { availableVariablesAtom } from "@/components/TemplateEditor/store";
import { HandlebarsExpressionView } from "./HandlebarsExpressionView";

Element.prototype.scrollIntoView = vi.fn();

type Listener = (payload: { transaction: { getMeta: () => undefined } }) => void;

/** Keeps attributes the way TipTap does — a merge that re-renders the view. */
const Harness: React.FC<{
  raw: string;
  autoEdit: boolean;
  editor: NodeViewProps["editor"];
  onUpdate: (attrs: Record<string, unknown>) => void;
  deleteNode: () => void;
}> = ({ raw, autoEdit, editor, onUpdate, deleteNode }) => {
  const [attrs, setAttrs] = React.useState<Record<string, unknown>>({
    raw,
    kind: "helperCall",
    name: "capitalize",
    isInvalid: false,
    autoEdit,
  });

  const nodeStub = { attrs, nodeSize: 1 };
  // The view reads only these props; the rest of NodeViewProps is never touched.
  const restProps = Object.create(null) as NodeViewProps;

  return (
    <HandlebarsExpressionView
      node={nodeStub as unknown as NodeViewProps["node"]}
      editor={editor}
      getPos={() => 0}
      updateAttributes={(next: Record<string, unknown>) => {
        onUpdate(next);
        setAttrs((current) => ({ ...current, ...next }));
      }}
      deleteNode={deleteNode}
      {...restProps}
    />
  );
};

function renderChip(
  raw: string,
  autoEdit = true,
  variables: Record<string, unknown> = { data: { name: "Geraldo" } }
) {
  const listeners: Record<string, Listener[]> = {};
  const updateAttributes = vi.fn();
  const deleteNode = vi.fn();

  const editorStub = {
    isEditable: true,
    // Every consumer of the doc here is wrapped in try/catch: this test is
    // about the chip's own editing state, not about its place in a document.
    state: {
      doc: {
        resolve: () => {
          throw new Error("no document in this harness");
        },
      },
      // A caret elsewhere in the document — what clicking the canvas leaves behind.
      selection: { from: 5, to: 5, empty: true },
    },
    storage: {},
    commands: { focus: vi.fn() },
    on: (event: string, fn: Listener) => {
      (listeners[event] ??= []).push(fn);
    },
    off: (event: string, fn: Listener) => {
      listeners[event] = (listeners[event] ?? []).filter((l) => l !== fn);
    },
  };
  const editor = editorStub as unknown as NodeViewProps["editor"];

  const store = createStore();
  store.set(availableVariablesAtom, variables);

  const utils = render(
    <Provider store={store}>
      <Harness
        raw={raw}
        autoEdit={autoEdit}
        editor={editor}
        onUpdate={updateAttributes}
        deleteNode={deleteNode}
      />
    </Provider>
  );

  const editable = () => utils.container.querySelector('[contenteditable="true"]') as HTMLElement;
  const fire = (event: string) =>
    (listeners[event] ?? []).forEach((fn) => fn({ transaction: { getMeta: () => undefined } }));
  return { ...utils, editable, updateAttributes, deleteNode, fire };
}

/**
 * An open chip's text lives only in its contenteditable until it commits, so
 * `}}` has to close it here the way it closes a variable chip. Without this the
 * braces were typed into the expression itself and the draft stored
 * `{{capitalize data.name}}}}` — Handlebars the send cannot parse.
 */
describe("typing }} inside an open expression chip", () => {
  it("commits the expression and strips the closing braces", async () => {
    const { editable, updateAttributes } = renderChip("{{capitalize }}");

    const el = editable();
    expect(el).toBeTruthy();
    el.textContent = "capitalize data.name}}";
    fireEvent.input(el);

    await waitFor(() =>
      expect(updateAttributes).toHaveBeenCalledWith(
        expect.objectContaining({ raw: "{{capitalize data.name}}" })
      )
    );
  });

  it("collapses the space the helper pick leaves behind", async () => {
    // The pick inserts `{{capitalize }}` so the caret sits where the argument
    // goes; an author who types their own space produced `capitalize  data.x`.
    const { editable, updateAttributes } = renderChip("{{capitalize }}");

    const el = editable();
    el.textContent = "capitalize  data.name}}";
    fireEvent.input(el);

    await waitFor(() =>
      expect(updateAttributes).toHaveBeenCalledWith(
        expect.objectContaining({ raw: "{{capitalize data.name}}" })
      )
    );
  });

  it("leaves the chip open while the expression is still being typed", () => {
    const { editable, updateAttributes } = renderChip("{{capitalize }}");

    const el = editable();
    el.textContent = "capitalize data.na";
    fireEvent.input(el);

    expect(updateAttributes).not.toHaveBeenCalledWith(
      expect.objectContaining({ raw: expect.anything() })
    );
    expect(editable()).toBeTruthy();
  });
});

/**
 * The signature hint is tied to edit mode, so a chip that never leaves edit
 * mode leaves its hint on screen over the canvas.
 */
describe("the signature hint after a helper pick", () => {
  it("is showing while the chip is open", () => {
    const { container } = renderChip("{{capitalize }}");
    expect(container.ownerDocument.querySelector(".courier-signature-hint")).toBeTruthy();
  });

  it("goes away when the chip loses focus", async () => {
    const { editable, container } = renderChip("{{capitalize }}");

    fireEvent.blur(editable());

    await waitFor(() =>
      expect(container.ownerDocument.querySelector(".courier-signature-hint")).toBeNull()
    );
  });

  it("goes away when the selection moves elsewhere in the document", async () => {
    // Clicking the canvas does not always blur the chip's contenteditable, and
    // the hint sat over the canvas until the page was reloaded.
    const { container, fire } = renderChip("{{capitalize }}");
    expect(container.ownerDocument.querySelector(".courier-signature-hint")).toBeTruthy();

    fire("selectionUpdate");

    await waitFor(() =>
      expect(container.ownerDocument.querySelector(".courier-signature-hint")).toBeNull()
    );
  });
});

/**
 * A chip opened by picking a helper reopened itself after every commit: the
 * node still carried `autoEdit`, so `useAutoEdit` put it straight back into
 * edit mode and the next letter typed landed inside the chip.
 *
 * `updateAttributes` merges into the attributes the node view captured, which
 * is the copy from before `useAutoEdit` cleared the flag — so commit has to
 * clear it itself rather than rely on that earlier write.
 */
describe("a chip that was opened by a pick", () => {
  it("clears autoEdit when it commits, so it stays closed", async () => {
    const { editable, updateAttributes } = renderChip("{{capitalize }}");

    const el = editable();
    el.textContent = "capitalize data.name}}";
    fireEvent.input(el);

    await waitFor(() => expect(updateAttributes).toHaveBeenCalled());
    const committed = updateAttributes.mock.calls
      .map(([attrs]) => attrs)
      .find((attrs) => attrs.raw === "{{capitalize data.name}}");
    expect(committed).toMatchObject({ autoEdit: false });
  });

  it("clears it on a commit caused by the selection moving away too", async () => {
    const { fire, updateAttributes } = renderChip("{{capitalize }}");

    fire("selectionUpdate");

    await waitFor(() =>
      expect(
        updateAttributes.mock.calls.some(([attrs]) => attrs.raw && attrs.autoEdit === false)
      ).toBe(true)
    );
  });

  it("stays closed after committing", async () => {
    const { editable, updateAttributes } = renderChip("{{capitalize }}");

    const el = editable();
    el.textContent = "capitalize data.name}}";
    fireEvent.input(el);

    await waitFor(() => expect(updateAttributes).toHaveBeenCalled());
    expect(editable()).toBeNull();
  });
});

/**
 * Picking a suggestion answered the question the list was asking, so leaving it
 * open on the name just picked means the next keystroke can replace it by
 * accident.
 */
describe("the suggestion list after a pick", () => {
  const option = (name: string) =>
    [...document.querySelectorAll("button")].find((b) => b.textContent === name);

  it("closes until something else is typed", async () => {
    const { editable } = renderChip("{{capitalize }}");

    const el = editable();
    el.textContent = "capitalize data.n";
    fireEvent.input(el);
    fireEvent.keyUp(el);
    await waitFor(() => expect(option("data.name")).toBeTruthy());

    fireEvent.click(option("data.name") as HTMLElement);
    fireEvent.mouseUp(el);

    await waitFor(() => expect(option("data.name")).toBeUndefined());
  });
});

describe("an expression chip whose node view has been removed", () => {
  it("does not write on the blur it fires on its way out", () => {
    const { editable, updateAttributes } = renderChip("{{capitalize }}");

    const el = editable();
    updateAttributes.mockClear();
    Object.defineProperty(el, "isConnected", { value: false, configurable: true });
    fireEvent.blur(el);

    expect(updateAttributes).not.toHaveBeenCalled();
  });
});

describe("closing a chip with }} and then leaving it alone", () => {
  it("writes the expression there and then, not on a later blur", () => {
    const { editable, updateAttributes } = renderChip("{{#}}");

    const el = editable();
    el.textContent = "#if data.vip}}";
    fireEvent.input(el);

    // No blur, no further typing: the node already holds it.
    expect(updateAttributes).toHaveBeenCalledWith(
      expect.objectContaining({ raw: "{{#if data.vip}}", kind: "blockOpen" })
    );
  });

  it("does the same for a closer, a helper call and a subexpression", () => {
    for (const [typed, raw] of [
      ["/if}}", "{{/if}}"],
      ["uppercase d.x}}", "{{uppercase d.x}}"],
      [
        '#if (condition data.user.name "==" "Geraldo")}}',
        '{{#if (condition data.user.name "==" "Geraldo")}}',
      ],
    ] as const) {
      const { editable, updateAttributes } = renderChip("{{#}}");
      const el = editable();
      el.textContent = typed;
      fireEvent.input(el);
      expect(updateAttributes, typed).toHaveBeenCalledWith(expect.objectContaining({ raw }));
    }
  });

  it("does not take a blur event for the chip's text", () => {
    const { editable, updateAttributes } = renderChip("{{capitalize data.name}}");
    const el = editable();
    updateAttributes.mockClear();
    fireEvent.blur(el);

    // The handler is called with the event; treating it as text wrote garbage.
    for (const [attrs] of updateAttributes.mock.calls) {
      expect(typeof attrs.raw === "string" || attrs.raw === undefined).toBe(true);
      if (attrs.raw) expect(attrs.raw).toBe("{{capitalize data.name}}");
    }
  });
});

/**
 * Red says "this will not send", and the issues list already calls a helper
 * that renders empty a warning. Drawing both the same left the author unable to
 * tell which chips stop a send.
 */
describe("how a chip shows what is wrong with it", () => {
  const chipClasses = (raw: string) => {
    const { container } = renderChip(raw, false);
    return (container.querySelector("[data-handlebars-kind]") as HTMLElement).className;
  };

  it("is red for handlebars the send cannot compile", () => {
    expect(chipClasses("{{frobnicate data.x}}")).toContain("courier-handlebars-chip-invalid");
  });

  // Amber now comes only from the field pass — a lazy path is judged by the
  // blocks around it — and every issue an occurrence carries alone is blocking.
  // `condition` short of an operand sat here until it was re-measured on dev,
  // where it kills the send.
  it("is neither for a lazy path, which the field pass judges", () => {
    const classes = chipClasses('{{path "name"}}');
    expect(classes).not.toContain("courier-handlebars-chip-warning");
    expect(classes).not.toContain("courier-handlebars-chip-invalid");
  });

  it("is neither for a clean expression", () => {
    const classes = chipClasses("{{capitalize data.name}}");
    expect(classes).not.toContain("courier-handlebars-chip-invalid");
    expect(classes).not.toContain("courier-handlebars-chip-warning");
  });
});

/**
 * The keyup of an arrow press used to undo what its keydown had just done: the
 * caret sync reset the highlight to the first row every time, so a block chip's
 * list could not be navigated at all. Reported against `{{#if data`, which
 * offers four names and reached none of them.
 */
describe("moving through the suggestion list of a block chip", () => {
  const options = () => [...document.querySelectorAll("button")];

  /** jsdom has no caret of its own, and the query is read from where it sits. */
  const caretToEnd = (el: HTMLElement) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  };

  it("lands on the row the arrows walked to", async () => {
    const { editable } = renderChip("{{#}}", true, {
      data: { alpha: 1, beta: 2, gamma: 3, delta: 4 },
    });

    const el = editable();
    el.textContent = "#if data";
    caretToEnd(el);
    fireEvent.input(el);
    fireEvent.keyUp(el, { key: "a" });
    await waitFor(() => expect(options()).toHaveLength(4));

    const third = options()[2].textContent;

    for (const key of ["ArrowDown", "ArrowDown"]) {
      fireEvent.keyDown(el, { key });
      // The keyup that used to reset the highlight.
      fireEvent.keyUp(el, { key });
    }
    fireEvent.keyDown(el, { key: "Enter" });

    await waitFor(() => expect(el.textContent).toBe(`#if ${third}`));
  });
});

/**
 * The caret was moved to the end of the chip in a `requestAnimationFrame`, so a
 * keystroke landing between the focus and that frame went wherever the browser
 * had left the caret — the start. Typing `{{#if` fast produced `i#f`.
 */
describe("where the caret is when a chip opens", () => {
  it("is at the end before the next frame, not after it", () => {
    const { editable } = renderChip("{{#}}");

    const el = editable();
    const selection = window.getSelection();
    expect(selection?.rangeCount).toBeGreaterThan(0);

    const range = selection?.getRangeAt(0);
    expect(range?.collapsed).toBe(true);
    // Everything before the caret is the whole expression: nothing can be typed
    // ahead of it.
    const before = document.createRange();
    before.selectNodeContents(el);
    before.setEnd(range!.endContainer, range!.endOffset);
    expect(before.toString()).toBe(el.textContent);
  });
});

/**
 * `autoEdit` is not only "open this chip": while it is set, the document-level
 * escape plugin routes keystrokes INTO the chip, which is what covers the gap
 * between a chip opening and its span taking focus.
 *
 * Clearing it as soon as the chip opened — a microtask later, before the span
 * had focus — left that gap unguarded, and in the Inbox sidebar's Label field
 * (whose chips focus more slowly than the canvas's) typing ` {{#if x` one key
 * at a time produced a `{{#}}` chip with `if x` as plain text beside it.
 */
describe("the flag that routes keys into a chip that is still opening", () => {
  it("stays set while the chip is open", async () => {
    const { editable, updateAttributes } = renderChip("{{#if }}");

    await waitFor(() => expect(editable()).toBeTruthy());
    // Nothing may clear it before the author has finished with the chip.
    expect(updateAttributes.mock.calls.some(([attrs]) => attrs.autoEdit === false)).toBe(false);
  });

  it("is cleared by the commit, so the chip does not reopen itself", async () => {
    const { editable, updateAttributes } = renderChip("{{#if }}");

    const el = editable();
    el.textContent = "#if data.x";
    fireEvent.blur(el);

    await waitFor(() => expect(updateAttributes).toHaveBeenCalled());
    expect(updateAttributes.mock.calls.at(-1)?.[0]).toMatchObject({ autoEdit: false });
  });
});
