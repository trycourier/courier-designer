import { describe, it, expect } from "vitest";
import { getOrCreateInboxElement } from "./Inbox";
import type { ElementalContent, ElementalNode } from "@/types/elemental.types";

/**
 * Older saved versions do not store the inbox title where the current editor
 * puts it. `getSubjectStorageFormat` recognises two formats — `channel.raw.title`
 * and a `meta` element — and versions predating both kept the title as the first
 * h2 text element. The canvas read path only understood `meta`, so selecting an
 * older version in version history rendered an empty title, promoted the title
 * into the body slot, and dropped the real body.
 */
const inbox = (channel: Record<string, unknown>): ElementalContent =>
  ({
    version: "2022-01-01",
    elements: [{ type: "channel", channel: "inbox", ...channel }],
  }) as ElementalContent;

const read = (content: ElementalContent) => {
  const el = getOrCreateInboxElement(content) as ElementalNode & { elements: ElementalNode[] };
  const [header, body] = el.elements;
  const text = (n: ElementalNode) => ("content" in n ? String(n.content).trim() : "");
  return { title: text(header), body: text(body) };
};

describe("inbox legacy title formats (C-19931)", () => {
  it("reads the current meta format", () => {
    expect(
      read(
        inbox({
          elements: [
            { type: "meta", title: "The title" },
            { type: "text", content: "The body" },
          ],
        })
      )
    ).toEqual({ title: "The title", body: "The body" });
  });

  it("reads a title stored on channel.raw", () => {
    expect(
      read(
        inbox({
          raw: { title: "The title" },
          elements: [{ type: "text", content: "The body" }],
        })
      )
    ).toEqual({ title: "The title", body: "The body" });
  });

  it("reads a title stored as the leading h2 text element", () => {
    expect(
      read(
        inbox({
          elements: [
            { type: "text", content: "The title", text_style: "h2" },
            { type: "text", content: "The body" },
          ],
        })
      )
    ).toEqual({ title: "The title", body: "The body" });
  });

  it("keeps action buttons in every format", () => {
    const el = getOrCreateInboxElement(
      inbox({
        raw: { title: "T" },
        elements: [
          { type: "text", content: "B" },
          { type: "action", content: "Go", href: "", align: "left" },
        ],
      })
    ) as ElementalNode & { elements: ElementalNode[] };
    expect(el.elements.filter((n) => n.type === "action")).toHaveLength(1);
  });
});
