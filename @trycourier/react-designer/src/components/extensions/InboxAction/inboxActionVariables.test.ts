import { describe, it, expect } from "vitest";
import { convertElementalToTiptap } from "@/lib/utils/convertElementalToTiptap/convertElementalToTiptap";
import { convertTiptapToElemental } from "@/lib/utils/convertTiptapToElemental/convertTiptapToElemental";
import type { ElementalContent } from "@/types/elemental.types";

/**
 * Variables in an Inbox action, both in the label and in the URL.
 *
 * The label is TipTap content rather than a plain attribute, so a variable has to survive being
 * parsed into a `variable` node on the way in and flattened back to `{{...}}` on the way out. A
 * regression here is silent: the chip simply stops appearing and the braces come back as text.
 */
const inbox = (action: Record<string, unknown>) =>
  ({
    version: "2022-01-01",
    elements: [
      {
        type: "channel",
        channel: "inbox",
        elements: [{ type: "action", content: "Go", href: "https://a.com", ...action }],
      },
    ],
  }) as unknown as ElementalContent;

const open = (action: Record<string, unknown>) =>
  convertElementalToTiptap(inbox(action), { channel: "inbox" });

const save = (action: Record<string, unknown>) =>
  convertTiptapToElemental(open(action)) as Array<Record<string, unknown>>;

const nodes = (doc: { content?: unknown[] }): Record<string, any>[] => {
  const out: Record<string, any>[] = [];
  const walk = (n: any) => {
    if (!n || typeof n !== "object") return;
    out.push(n);
    (n.content ?? []).forEach(walk);
  };
  (doc.content ?? []).forEach(walk);
  return out;
};

describe("variables in an Inbox action label", () => {
  it("becomes a variable node on the canvas, not literal braces", () => {
    const variable = nodes(open({ content: "Hi {{user.name}}" })).find((n) => n.type === "variable");
    expect(variable?.attrs?.id).toBe("user.name");
  });

  it("keeps the text around it", () => {
    const texts = nodes(open({ content: "Hi {{user.name}}, welcome" }))
      .filter((n) => n.type === "text")
      .map((n) => n.text);
    expect(texts.join("")).toContain("Hi ");
    expect(texts.join("")).toContain(", welcome");
  });

  it("survives a save unchanged", () => {
    expect(save({ content: "Hi {{user.name}}" })[0].content).toBe("Hi {{user.name}}");
  });

  it("handles more than one", () => {
    expect(save({ content: "{{greeting}} {{user.name}}" })[0].content).toBe(
      "{{greeting}} {{user.name}}"
    );
  });

  it.each(["button", "secondary", "tertiary", "link"])("works for the %s style", (style) => {
    expect(save({ content: "Hi {{user.name}}", style })[0].content).toBe("Hi {{user.name}}");
  });
});

describe("variables in an Inbox action URL", () => {
  it("survives a save unchanged", () => {
    expect(save({ href: "https://a.com/{{id}}" })[0].href).toBe("https://a.com/{{id}}");
  });

  it("survives a URL that is nothing but a variable", () => {
    expect(save({ href: "{{deep_link}}" })[0].href).toBe("{{deep_link}}");
  });
});

describe("variables in a paired Inbox row", () => {
  const pair = {
    version: "2022-01-01",
    elements: [
      {
        type: "channel",
        channel: "inbox",
        elements: [
          { type: "action", content: "Yes {{a}}", href: "https://a.com/{{id}}", style: "button" },
          { type: "action", content: "No {{b}}", href: "https://b.com", style: "secondary" },
        ],
      },
    ],
  } as unknown as ElementalContent;

  it("keeps both labels and the URL", () => {
    const saved = convertTiptapToElemental(
      convertElementalToTiptap(pair, { channel: "inbox" })
    ) as Array<Record<string, unknown>>;

    expect(saved.map((a) => a.content)).toEqual(["Yes {{a}}", "No {{b}}"]);
    expect(saved[0].href).toBe("https://a.com/{{id}}");
  });
});
