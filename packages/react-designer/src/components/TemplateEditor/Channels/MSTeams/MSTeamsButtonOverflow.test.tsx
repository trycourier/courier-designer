import { describe, expect, it } from "vitest";
import { useRef } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { Node } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { EditorProvider } from "@tiptap/react";
import { createStore, Provider } from "jotai";
import { selectedNodeAtom } from "@/components/ui/TextMenu/store";
import { MSTeamsButtonOverflow } from "./MSTeamsButtonOverflow";

const ButtonNode = Node.create({
  name: "button",
  group: "block",
  content: "text*",
  addAttributes: () => ({ id: { default: null } }),
  parseHTML: () => [{ tag: "button-node" }],
  renderHTML: ({ HTMLAttributes }) => ["button-node", HTMLAttributes, 0],
});

const content = (labels: string[]) =>
  `<p>Hi</p>${labels.map((l) => `<button-node id="${l}">${l}</button-node>`).join("")}`;

const Harness = ({ labels, readOnly }: { labels: string[]; readOnly?: boolean }) => {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div ref={ref}>
      <EditorProvider
        content={content(labels)}
        extensions={[Document, Paragraph, Text, ButtonNode]}
        immediatelyRender
      >
        <MSTeamsButtonOverflow containerRef={ref} readOnly={readOnly} />
      </EditorProvider>
    </div>
  );
};

const mount = async (labels: string[], readOnly?: boolean) => {
  const store = createStore();
  await act(async () => {
    render(
      <Provider store={store}>
        <Harness labels={labels} readOnly={readOnly} />
      </Provider>
    );
  });
  return store;
};

describe("MSTeamsButtonOverflow", () => {
  it("shows nothing for up to 6 buttons", async () => {
    await mount(["A", "B", "C", "D", "E", "F"]);
    expect(screen.queryByRole("button", { name: /more buttons/ })).toBeNull();
  });

  it("lists the buttons past the 6th and selects the one picked", async () => {
    const store = await mount(["A", "B", "C", "D", "E", "F", "G", "H"]);

    fireEvent.click(screen.getByRole("button", { name: "2 more buttons" }));
    const items = screen.getAllByRole("menuitem").map((i) => i.textContent);
    expect(items).toEqual(["G", "H"]);

    fireEvent.click(screen.getByRole("menuitem", { name: "H" }));
    expect(store.get(selectedNodeAtom)?.attrs.id).toBe("H");
    // It stays open on the selected button, with its duplicate and delete.
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Duplicate" })).toHaveLength(1);
  });

  it("deletes a button from the menu", async () => {
    await mount(["A", "B", "C", "D", "E", "F", "G", "H"]);

    fireEvent.click(screen.getByRole("button", { name: "2 more buttons" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "G" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    });

    expect(screen.getAllByRole("menuitem").map((i) => i.textContent)).toEqual(["H"]);
  });

  it("lists the hidden buttons read-only without selecting or editing them", async () => {
    const store = await mount(["A", "B", "C", "D", "E", "F", "G"], true);

    fireEvent.click(screen.getByRole("button", { name: "1 more buttons" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "G" }));

    expect(store.get(selectedNodeAtom)).toBeFalsy();
    expect(screen.queryByRole("button", { name: "Duplicate" })).toBeNull();
  });
});
