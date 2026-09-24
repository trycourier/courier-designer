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

function renderChip(raw: string, autoEdit = true) {
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
  store.set(availableVariablesAtom, { data: { name: "Geraldo" } });

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
