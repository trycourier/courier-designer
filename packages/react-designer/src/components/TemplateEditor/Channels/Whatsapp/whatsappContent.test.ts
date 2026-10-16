import { describe, expect, it } from "vitest";
import type { ElementalContent, ElementalNode } from "@/types/elemental.types";
import {
  getWhatsappActions,
  getWhatsappElements,
  getWhatsappHeader,
  setWhatsappActions,
  setWhatsappHeader,
  toEditorElements,
  toWhatsappElements,
  toWhatsappHeader,
  withoutActions,
} from "./whatsappContent";

const IMAGE = "https://cdn.example.com/order.jpg";

const body: ElementalNode = { type: "text", content: "Your order shipped." };
const track: ElementalNode = { type: "action", content: "Track", href: "https://example.com/t" };

const whatsapp = (...elements: ElementalNode[]): ElementalContent => ({
  version: "2022-01-01",
  elements: [{ type: "channel", channel: "whatsapp", elements }],
});

const titleLine = (content: string): ElementalNode => ({
  type: "text",
  content,
  text_style: "h2",
});

const noChannel: ElementalContent = { version: "2022-01-01", elements: [] };

/** A WhatsApp block with the block-level `header` saved before D-045, which the types no longer have. */
const staleBlock = {
  type: "channel",
  channel: "whatsapp",
  header: { type: "image", src: IMAGE },
  elements: [body],
};

const channelOf = (content: ElementalContent) =>
  content.elements.find((el) => el.type === "channel" && el.channel === "whatsapp") as unknown as {
    elements: ElementalNode[];
    [key: string]: unknown;
  };

describe("getWhatsappHeader", () => {
  it("reads a text header from meta.title", () => {
    expect(getWhatsappHeader(whatsapp({ type: "meta", title: "Order update" }, body))).toEqual({
      type: "text",
      content: "Order update",
    });
  });

  it("reads an image header from meta.image", () => {
    expect(getWhatsappHeader(whatsapp({ type: "meta", image: IMAGE }, body))).toEqual({
      type: "image",
      src: IMAGE,
    });
  });

  // Image picked before an upload stays Image across a reload.
  it("keeps Image picked while the image is blank and there is no title", () => {
    expect(getWhatsappHeader(whatsapp({ type: "meta", image: "" }, body))).toEqual({
      type: "image",
      src: "",
    });
  });

  it("is Text once a title is there, even beside a blank image", () => {
    expect(getWhatsappHeader(whatsapp({ type: "meta", title: "", image: "" }, body))).toEqual({
      type: "text",
      content: "",
    });
  });

  it.each([
    ["no content", null],
    ["no WhatsApp channel", noChannel],
    ["no meta", whatsapp(body)],
  ])("is an empty text header with %s", (_, content) => {
    expect(getWhatsappHeader(content)).toEqual({ type: "text", content: "" });
  });
});

describe("setWhatsappHeader", () => {
  const metaOf = (content: ElementalContent) =>
    channelOf(content).elements.find((el) => el.type === "meta");

  it("Text → Image writes the image and removes the title", () => {
    const next = setWhatsappHeader(whatsapp({ type: "meta", title: "Order update" }, body), {
      type: "image",
      src: "",
    });

    expect(metaOf(next)).toEqual({ type: "meta", image: "" });
  });

  it("Image → Text writes the title and blanks the image", () => {
    const next = setWhatsappHeader(whatsapp({ type: "meta", image: IMAGE }, body), {
      type: "text",
      content: "Order update",
    });

    expect(metaOf(next)).toEqual({ type: "meta", title: "Order update", image: "" });
  });

  it("adds no image to a template that never had one", () => {
    const next = setWhatsappHeader(whatsapp({ type: "meta", title: "Old" }, body), {
      type: "text",
      content: "New",
    });

    expect(metaOf(next)).toEqual({ type: "meta", title: "New" });
  });

  it("keeps the meta's other fields", () => {
    // Saved content carries the element ids the API stamps, which the types leave out
    const savedMeta = {
      type: "meta",
      id: "elem_1",
      title: "Old",
      locales: { fr: { title: "Vieux" } },
    };
    const next = setWhatsappHeader(whatsapp(savedMeta as unknown as ElementalNode, body), {
      type: "image",
      src: IMAGE,
    });

    expect(metaOf(next)).toEqual({
      type: "meta",
      id: "elem_1",
      locales: { fr: { title: "Vieux" } },
      image: IMAGE,
    });
  });

  it("keeps the body and buttons, with one meta first", () => {
    const next = setWhatsappHeader(whatsapp(body, { type: "meta", title: "Old" }, track), {
      type: "text",
      content: "New",
    });

    expect(channelOf(next).elements).toEqual([{ type: "meta", title: "New" }, body, track]);
  });

  // The API refuses a block-level `header` (D-045), so a save sheds one written before.
  it("drops a block-level header saved before D-045", () => {
    const stale: ElementalContent = {
      version: "2022-01-01",
      elements: [staleBlock as unknown as ElementalNode],
    };

    expect(channelOf(setWhatsappHeader(stale, { type: "image", src: IMAGE }))).not.toHaveProperty(
      "header"
    );
  });

  it("leaves another channel untouched", () => {
    const email = {
      type: "channel" as const,
      channel: "email",
      elements: [{ type: "meta" as const, title: "Subject" }],
    };
    const content: ElementalContent = {
      version: "2022-01-01",
      elements: [email, ...whatsapp(body).elements],
    };

    expect(setWhatsappHeader(content, { type: "image", src: IMAGE }).elements[0]).toEqual(email);
  });
});

describe("toEditorElements", () => {
  it("puts the title line first, then the body, without meta or buttons", () => {
    const elements = [{ type: "meta" as const, title: "Order update" }, body, track];

    expect(toEditorElements(elements, { type: "text", content: "Order update" })).toEqual([
      titleLine("Order update"),
      body,
    ]);
  });

  it.each([
    ["an empty title", { type: "text" as const, content: "" }],
    ["an image header", { type: "image" as const, src: IMAGE }],
    ["no header", undefined],
  ])("shows an empty title line for %s", (_, header) => {
    expect(toEditorElements([body], header)[0]).toEqual(titleLine("\n"));
  });

  it("flags the title line in a preview", () => {
    const [title] = toEditorElements([body], { type: "text", content: "Hi" }, { preview: true });

    expect(Object.values(title)).toContain(true);
    expect(toEditorElements([body], { type: "text", content: "Hi" })[0]).toEqual(titleLine("Hi"));
  });
});

describe("toWhatsappElements", () => {
  it("saves the title line as meta.title, then the body, then the saved buttons", () => {
    const existing = whatsapp({ type: "meta", title: "Old" }, body, track);
    const edited: ElementalNode = { type: "text", content: "Your order is on its way." };

    expect(toWhatsappElements(existing, [titleLine(" Order update "), edited])).toEqual([
      { type: "meta", title: "Order update" },
      edited,
      track,
    ]);
  });

  it("saves an empty title as a blank meta.title", () => {
    expect(toWhatsappElements(null, [titleLine("\n"), body])).toEqual([
      { type: "meta", title: "" },
      body,
    ]);
  });

  // The title line is hidden while Image is picked; it never overwrites the image.
  it("keeps an image header whatever the title line holds", () => {
    const existing = whatsapp({ type: "meta", image: IMAGE }, body);

    expect(toWhatsappElements(existing, [titleLine("Typed while hidden"), body])).toEqual([
      { type: "meta", image: IMAGE },
      body,
    ]);
  });

  it("keeps body formatting as authored", () => {
    const formatted: ElementalNode = {
      type: "text",
      elements: [{ type: "string", content: "Shipped", bold: true }],
    };

    expect(toWhatsappElements(null, [titleLine("\n"), formatted])[1]).toEqual(formatted);
  });

  it("treats the whole editor as body when it has no title line", () => {
    expect(toWhatsappElements(null, [body])).toEqual([{ type: "meta", title: "" }, body]);
  });

  it("drops buttons and meta that reach the editor", () => {
    const existing = whatsapp(track);

    expect(
      toWhatsappElements(existing, [titleLine("\n"), body, track, { type: "meta", title: "x" }])
    ).toEqual([{ type: "meta", title: "" }, body, track]);
  });
});

describe("toWhatsappHeader", () => {
  it("reads the title line, trimmed", () => {
    expect(toWhatsappHeader(null, [titleLine("  Hello  ")])).toEqual({
      type: "text",
      content: "Hello",
    });
  });

  it("is blank without a title line", () => {
    expect(toWhatsappHeader(null, [body])).toEqual({ type: "text", content: "" });
  });
});

describe("buttons", () => {
  it("reads the channel's elements and its buttons", () => {
    const content = whatsapp(body, track);

    expect(getWhatsappElements(content)).toEqual([body, track]);
    expect(getWhatsappActions(content)).toEqual([track]);
    expect(withoutActions([body, track])).toEqual([body]);
  });

  it("replaces the buttons and keeps the rest", () => {
    const help: ElementalNode = { type: "action", content: "Help", href: "https://example.com/h" };
    const next = setWhatsappActions(whatsapp({ type: "meta", title: "Hi" }, body, track), [
      help as never,
    ]);

    expect(channelOf(next).elements).toEqual([{ type: "meta", title: "Hi" }, body, help]);
  });
});
