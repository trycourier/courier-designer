import { describe, it, expect } from "vitest";
import { convertTiptapToElemental } from "./convertTiptapToElemental";
import type { TiptapDoc } from "@/types/tiptap.types";

/**
 * What an Inbox action is allowed to write back.
 *
 * The style decides the look, and the look belongs to whatever is rendering it — per mode, per
 * theme, with hover and active states a stamped value cannot follow. A color saved here would
 * outrank the integrator's theme forever, which is the whole reason these nodes stopped
 * carrying one.
 *
 * So the contract is a whitelist, not an absence of known-bad keys: anything beyond these is a
 * leak, whether or not anyone has thought of it yet.
 */
const ALLOWED = new Set([
  "type",
  "content",
  "href",
  "align",
  "style",
  // Behavior rather than appearance, and set only when the author asked for them.
  "disable_tracking",
  "locales",
  "if",
]);

const FORBIDDEN = [
  "background_color",
  "color",
  "padding",
  "border_radius",
  "border",
  "border_color",
  "border_size",
  "font_size",
  "text_style",
];

const doc = (content: unknown[]) => ({ type: "doc", content }) as TiptapDoc;

const inboxAction = (attrs: Record<string, unknown>) => ({
  type: "inboxAction",
  attrs: {
    label: "Go",
    link: "https://example.com",
    align: "left",
    id: "node-1",
    ...attrs,
  },
});

describe("an Inbox action writes its style and nothing else", () => {
  // The node still carries the schema's own defaults; the point is that none of them are saved.
  const loaded = {
    backgroundColor: "#0085FF",
    textColor: "#FFFFFF",
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#000000",
  };

  it.each(["button", "secondary", "tertiary", "link"])("saves %s with no styling on it", (style) => {
    const [saved] = convertTiptapToElemental(
      doc([inboxAction({ actionStyle: style, ...loaded })])
    ) as Array<Record<string, unknown>>;

    expect(saved.style).toBe(style);
    for (const key of FORBIDDEN) {
      expect(saved).not.toHaveProperty(key);
    }
  });

  it("writes no key outside the allowed set, whatever the node carries", () => {
    const [saved] = convertTiptapToElemental(
      doc([inboxAction({ actionStyle: "secondary", ...loaded })])
    ) as Array<Record<string, unknown>>;

    expect(Object.keys(saved).filter((k) => !ALLOWED.has(k))).toEqual([]);
  });

  it("defaults to the plain button when the node names no style", () => {
    const [saved] = convertTiptapToElemental(doc([inboxAction({ ...loaded })])) as Array<
      Record<string, unknown>
    >;
    expect(saved.style).toBe("button");
  });

  it("still carries behavior the author set", () => {
    const [saved] = convertTiptapToElemental(
      doc([inboxAction({ actionStyle: "link", disableTracking: true, if: "data.x" })])
    ) as Array<Record<string, unknown>>;
    expect(saved.disable_tracking).toBe(true);
    expect(saved.if).toBe("data.x");
  });
});

describe("a paired Inbox row writes the same way", () => {
  const row = {
    type: "buttonRow",
    attrs: {
      button1Label: "Yes",
      button1Link: "https://a.com",
      button1ActionStyle: "button",
      button2Label: "No",
      button2Link: "https://b.com",
      button2ActionStyle: "secondary",
      // Colors a previous version of the designer may have written onto the node.
      button1BackgroundColor: "#0085FF",
      button1TextColor: "#FFFFFF",
      button2BackgroundColor: "#FFFFFF",
      button2TextColor: "#000000",
      id: "node-2",
    },
  };

  it("saves both actions with a style and no color", () => {
    const saved = convertTiptapToElemental(doc([row])) as Array<Record<string, unknown>>;

    expect(saved).toHaveLength(2);
    expect(saved.map((a) => a.style)).toEqual(["button", "secondary"]);
    for (const action of saved) {
      for (const key of FORBIDDEN) {
        expect(action).not.toHaveProperty(key);
      }
      expect(Object.keys(action).filter((k) => !ALLOWED.has(k))).toEqual([]);
    }
  });
});
