import { linkTrackingEnabledAtom } from "@/components/TemplateEditor/store";
import { pendingLinkAtom } from "@/components/ui/TextMenu/store";
import { fireEvent, render, screen } from "@testing-library/react";
import { Document } from "@tiptap/extension-document";
import { Paragraph } from "@tiptap/extension-paragraph";
import { Text } from "@tiptap/extension-text";
import { TextStyle } from "@tiptap/extension-text-style";
import { Editor } from "@tiptap/react";
import { Provider, createStore } from "jotai";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Color } from "../Color/Color";
import { Link } from "./Link";
import { LinkBubble } from "./LinkBubble";

let editor: Editor;

vi.mock("@tiptap/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tiptap/react")>();
  return { ...actual, useCurrentEditor: () => ({ editor }) };
});

/**
 * End-to-end cover, against a real editor, for the colour handling on link
 * creation: a link made inside an already-coloured run must become its own
 * textStyle run with no colour so it renders in the link's default colour,
 * while the surrounding text keeps the colour the user chose. A colour picked
 * from the toolbar afterwards still overrides the link.
 */
describe("Link colour inheritance", () => {
  let host: HTMLDivElement;

  beforeEach(() => {
    // LinkBubble positions itself against the email-editor container.
    host = document.createElement("div");
    host.setAttribute("data-testid", "email-editor");
    document.body.appendChild(host);

    editor = new Editor({
      element: host,
      extensions: [Document, Paragraph, Text, TextStyle, Color, Link],
      content: "<p>Click here now</p>",
    });

    // jsdom has no layout, so ProseMirror cannot measure the selection the
    // bubble anchors to. Any finite rect is enough for it to render.
    vi.spyOn(editor.view, "coordsAtPos").mockReturnValue({
      top: 0,
      bottom: 10,
      left: 0,
      right: 10,
    });
  });

  afterEach(() => {
    editor.destroy();
    host.remove();
  });

  /** Colour of the textStyle mark covering `pos`, or null when uncoloured. */
  const colorAt = (pos: number) => {
    const marks = editor.state.doc.resolve(pos).marks();
    return marks.find((mark) => mark.type.name === "textStyle")?.attrs.color ?? null;
  };

  const hasLinkAt = (pos: number) =>
    editor.state.doc
      .resolve(pos)
      .marks()
      .some((mark) => mark.type.name === "link");

  const markAt = (pos: number) =>
    editor.state.doc
      .resolve(pos)
      .marks()
      .find((mark) => mark.type.name === "link");

  /** Render the bubble over `range`, type `url` and save it. */
  const addLinkVia = (range: { from: number; to: number }, url: string) => {
    const store = createStore();
    store.set(pendingLinkAtom, { link: range, mark: markAt(range.from + 1) });
    store.set(linkTrackingEnabledAtom, true);

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(Provider, { store }, children);
    const view = render(createElement(LinkBubble), { wrapper });

    const input = screen.getByPlaceholderText("Paste a link...");
    fireEvent.change(input, { target: { value: url } });
    fireEvent.keyDown(input, { key: "Enter" });

    view.unmount();
  };

  it("splits a coloured run so the linked sub-string has no colour of its own", () => {
    editor.chain().setTextSelection({ from: 1, to: 15 }).setColor("#ff0000").run();
    expect(colorAt(2)).toBe("#ff0000");

    // Link only "here", a sub-part of the coloured run.
    addLinkVia({ from: 7, to: 11 }, "https://example.com");

    expect(hasLinkAt(8)).toBe(true);
    expect(colorAt(8)).toBeNull();
    // Text on either side keeps the user's colour.
    expect(colorAt(2)).toBe("#ff0000");
    expect(colorAt(13)).toBe("#ff0000");
    expect(hasLinkAt(2)).toBe(false);
  });

  it("drops the colour when the whole coloured block becomes the link", () => {
    editor.chain().setTextSelection({ from: 1, to: 15 }).setColor("#123456").run();

    addLinkVia({ from: 1, to: 15 }, "https://example.com");

    expect(hasLinkAt(2)).toBe(true);
    expect(colorAt(2)).toBeNull();
  });

  it("lets a colour applied after the link override the link's colour", () => {
    editor.chain().setTextSelection({ from: 1, to: 15 }).setColor("#ff0000").run();
    addLinkVia({ from: 7, to: 11 }, "https://example.com");

    // Toolbar override on the link range, done after the link exists.
    editor.chain().setTextSelection({ from: 7, to: 11 }).setColor("#00ff00").run();

    expect(hasLinkAt(8)).toBe(true);
    expect(colorAt(8)).toBe("#00ff00");
    expect(colorAt(2)).toBe("#ff0000");
  });

  it("keeps a toolbar colour override when the link's URL is later edited", () => {
    editor.chain().setTextSelection({ from: 1, to: 15 }).setColor("#ff0000").run();
    addLinkVia({ from: 7, to: 11 }, "https://example.com");
    editor.chain().setTextSelection({ from: 7, to: 11 }).setColor("#00ff00").run();

    // Re-opening an existing link and changing the URL must not reset the colour.
    addLinkVia({ from: 7, to: 11 }, "https://updated.com");

    expect(markAt(8)?.attrs.href).toBe("https://updated.com");
    expect(colorAt(8)).toBe("#00ff00");
  });
});
