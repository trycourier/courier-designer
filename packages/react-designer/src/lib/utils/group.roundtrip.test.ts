import { Editor } from "@tiptap/core";
import { describe, expect, it } from "vitest";
import { ExtensionKit } from "@/components/extensions/extension-kit";
import { convertElementalToTiptap } from "./convertElementalToTiptap/convertElementalToTiptap";
import { convertTiptapToElemental } from "./convertTiptapToElemental/convertTiptapToElemental";
import type { ElementalContent, ElementalNode, TiptapDoc } from "@/types";
import { renderElementalPreview } from "./handlebars/renderElementalPreview";
import { createOrDuplicateNode } from "@/components/utils/createOrDuplicateNode";

const inEmail = (elements: ElementalNode[]): ElementalContent => ({
  version: "2022-01-01",
  elements: [{ type: "channel", channel: "email", elements }],
});

// The SUP-781 payload: a looped group of five blocks.
const loopedGroup = {
  type: "group",
  loop: "data.products",
  elements: [
    { type: "text", content: "{{$.item.name}}", text_style: "h2" },
    { type: "text", content: "Description: {{$.item.description}}" },
    { type: "text", content: "Price: ${{$.item.price}}" },
    {
      type: "action",
      content: "View Product",
      href: "https://example.com/products/{{$.item.id}}",
    },
    { type: "divider" },
  ],
} as unknown as ElementalNode;

/** Load into a real editor and save what it holds, as Studio does. */
const openAndSave = (elements: ElementalNode[]) => {
  const doc = convertElementalToTiptap(inEmail(elements), { channel: "email" });
  const editor = new Editor({ extensions: ExtensionKit(), content: doc });
  const json = editor.getJSON();
  editor.destroy();
  return { json, saved: convertTiptapToElemental(json as TiptapDoc) };
};

/** A text element's text, whether stored as `content` or as string parts. */
const textOf = (node: unknown): string => {
  const { content, elements } = node as {
    content?: string;
    elements?: Array<{ content?: string }>;
  };
  return content ?? (elements ?? []).map((part) => part.content ?? "").join("");
};

const pick = (node: unknown, keys: string[]) =>
  Object.fromEntries(keys.filter((k) => k in (node as object)).map((k) => [k, (node as never)[k]]));

describe("elemental group", () => {
  it("opens as one group holding its blocks in order, not as columns", () => {
    const { json } = openAndSave([loopedGroup]);
    expect(json.content).toHaveLength(1);
    expect(json.content?.[0].type).toBe("group");
    expect(json.content?.[0].attrs?.loop).toBe("data.products");
    expect(json.content?.[0].content?.map((n) => n.type)).toEqual([
      "heading",
      "paragraph",
      "paragraph",
      "button",
      "divider",
    ]);
  });

  it("keeps the loop and every child through an open and save", () => {
    const { saved } = openAndSave([loopedGroup]);
    expect(saved).toHaveLength(1);
    const [group] = saved as Array<{ type: string; loop?: string; elements: ElementalNode[] }>;
    expect(group.type).toBe("group");
    expect(group.loop).toBe("data.products");
    expect(group.elements.map((e) => e.type)).toEqual([
      "text",
      "text",
      "text",
      "action",
      "divider",
    ]);
    expect(group.elements.map(textOf)).toEqual([
      "{{$.item.name}}",
      "Description: {{$.item.description}}",
      "Price: ${{$.item.price}}",
      "View Product",
      "",
    ]);
    expect((group.elements[3] as { href?: string }).href).toBe(
      "https://example.com/products/{{$.item.id}}"
    );
  });

  it("keeps fields the editor has no control for", () => {
    const group = {
      type: "group",
      if: "data.show",
      padding: "10px 20px",
      background_color: "#f0f0f0",
      border: { color: "#ff0000", enabled: true, size: "2px", radius: 8 },
      channels: ["email"],
      elements: [{ type: "text", content: "Hi" }],
    } as unknown as ElementalNode;
    const [saved] = openAndSave([group]).saved;
    expect(pick(saved, ["if", "padding", "background_color", "border", "channels"])).toEqual(
      pick(group, ["if", "padding", "background_color", "border", "channels"])
    );
  });

  it("keeps a group nested in a group, and one inside a column", () => {
    const nested = {
      type: "group",
      elements: [{ ...loopedGroup }, { type: "text", content: "after" }],
    } as unknown as ElementalNode;
    const columns = {
      type: "columns",
      elements: [
        { type: "column", width: "50%", elements: [{ ...loopedGroup }] },
        { type: "column", width: "50%", elements: [{ type: "text", content: "right" }] },
      ],
    } as unknown as ElementalNode;

    const [outer, cols] = openAndSave([nested, columns]).saved as Array<{
      type: string;
      elements: Array<{ type: string; loop?: string; elements?: Array<{ type: string }> }>;
    }>;
    expect(outer.type).toBe("group");
    expect(outer.elements[0]).toMatchObject({ type: "group", loop: "data.products" });
    expect(cols.type).toBe("columns");
    expect(cols.elements[0].elements?.[0]).toMatchObject({ type: "group", loop: "data.products" });
  });
});

describe("elemental group in preview", () => {
  const products = [
    { id: "1", name: "Foobarious", price: "400" },
    { id: "2", name: "Boofarious", price: "450" },
  ];

  it("repeats a looped group once per item, as the send does", () => {
    const { content } = renderElementalPreview([loopedGroup], { data: { products } });
    const groups = content as Array<{ type: string; loop?: string; elements: unknown[] }>;
    expect(groups).toHaveLength(2);
    expect(groups.every((g) => g.type === "group" && g.loop === undefined)).toBe(true);
    expect(groups.map((g) => textOf(g.elements[0]))).toEqual(["Foobarious", "Boofarious"]);
    expect(groups.map((g) => textOf(g.elements[2]))).toEqual(["Price: $400", "Price: $450"]);
    expect(groups.map((g) => (g.elements[3] as { href: string }).href)).toEqual([
      "https://example.com/products/1",
      "https://example.com/products/2",
    ]);
  });

  it("renders nothing for an empty array, as the send does", () => {
    const { content } = renderElementalPreview([loopedGroup], { data: { products: [] } });
    expect(content).toEqual([]);
  });

  it("keeps one copy when the sample data has nothing to loop over", () => {
    const { content } = renderElementalPreview([loopedGroup], { data: {} });
    expect(content).toHaveLength(1);
    expect((content as Array<{ loop?: string }>)[0].loop).toBe("data.products");
  });
});

describe("creating and duplicating a group", () => {
  const ids = (node: { attrs?: Record<string, unknown>; content?: unknown[] }): unknown[] => [
    node.attrs?.id,
    ...((node.content ?? []) as (typeof node)[]).flatMap(ids),
  ];

  it("gives a duplicate its loop and children under new ids", () => {
    const doc = convertElementalToTiptap(inEmail([loopedGroup]), { channel: "email" });
    const editor = new Editor({ extensions: ExtensionKit(), content: doc });
    const original = editor.state.doc.firstChild!;
    createOrDuplicateNode(
      editor,
      "group",
      original.nodeSize,
      original.attrs,
      undefined,
      original.content
    );
    const [a, b] = editor.getJSON().content!;
    editor.destroy();

    expect(b.type).toBe("group");
    expect(b.attrs?.loop).toBe("data.products");
    expect(b.content?.map((n) => n.type)).toEqual(a.content?.map((n) => n.type));
    const shared = ids(a).filter((id) => id && ids(b).includes(id));
    expect(shared).toEqual([]);
  });

  it("starts a new group with one paragraph to type into", () => {
    const editor = new Editor({
      extensions: ExtensionKit(),
      content: { type: "doc", content: [] },
    });
    createOrDuplicateNode(editor, "group", 0);
    const group = editor.getJSON().content?.find((n) => n.type === "group");
    editor.destroy();
    expect(group?.content?.map((n) => n.type)).toEqual(["paragraph"]);
  });
});
