import { describe, expect, it } from "vitest";
import type { ElementalContent } from "../../../../types";
import { canvasBlockIndexByElement, canvasIssuesByBlock } from "../canvasIssues";
import type { TemplateIssue } from "../templateIssues";

const template = (channel: string): ElementalContent =>
  ({
    version: "2022-01-01",
    elements: [
      {
        type: "channel",
        channel,
        elements: [
          { type: "meta", title: "T {{frobnicate x}}" },
          { type: "text", content: "body" },
          { type: "text", content: "hidden", visible: false },
          { type: "action", content: "go" },
        ],
      },
    ],
  }) as unknown as ElementalContent;

const issue = (elementIndex: number, channel: string): TemplateIssue => ({
  severity: "blocking",
  code: "unknown-helper",
  message: "unknown",
  channel,
  field: "content",
  elementIndex,
  raw: "{{frobnicate x}}",
  occurrence: 0,
});

/**
 * Push maps its `meta` to an H2 on the way in and Inbox lifts `meta.title` into
 * a header block, so on those two the title IS the first block on the canvas.
 * Everywhere else the converter drops `meta`. Counting it the same way
 * everywhere put every pill on those channels one block too far down.
 */
describe("which block an issue sits on, per channel", () => {
  it("skips the meta where the canvas does not draw it", () => {
    for (const channel of ["email", "sms", "slack", "msteams"]) {
      const map = canvasBlockIndexByElement(template(channel), channel);
      expect(map.get(0), channel).toBeUndefined();
      expect(map.get(1), channel).toBe(0);
      expect(map.get(3), channel).toBe(1);
    }
  });

  it("counts the meta where the canvas draws it", () => {
    for (const channel of ["push", "inbox"]) {
      const map = canvasBlockIndexByElement(template(channel), channel);
      expect(map.get(0), channel).toBe(0);
      expect(map.get(1), channel).toBe(1);
      expect(map.get(3), channel).toBe(2);
    }
  });

  it("hides a hidden element on every channel", () => {
    for (const channel of ["email", "sms", "push", "inbox", "slack", "msteams"]) {
      expect(canvasBlockIndexByElement(template(channel), channel).get(2), channel).toBeUndefined();
    }
  });

  it("places a title issue on the header block of push and inbox", () => {
    for (const channel of ["push", "inbox"]) {
      const map = canvasBlockIndexByElement(template(channel), channel);
      const [block] = canvasIssuesByBlock([issue(0, channel)], channel, map);
      expect(block?.blockIndex, channel).toBe(0);
    }
  });

  it("leaves an email title to the host, which marks its own subject bar", () => {
    const map = canvasBlockIndexByElement(template("email"), "email");
    const title = { ...issue(0, "email"), field: "title" };
    expect(canvasIssuesByBlock([title], "email", map)).toEqual([]);
  });

  it("gives every other channel's title a pill", () => {
    for (const channel of ["sms", "push", "inbox", "slack", "msteams"]) {
      const map = canvasBlockIndexByElement(template(channel), channel);
      const title = { ...issue(0, channel), field: "title" };
      expect(canvasIssuesByBlock([title], channel, map), channel).toHaveLength(1);
    }
  });

  // The In-app canvas keeps ONE body paragraph however many the template has,
  // and a channel that does not draw the title has no block at that index —
  // so an issue there is pinned to the nearest block above rather than shown
  // nowhere. A pill on the wrong block still says the send will fail.
  it("pins an issue whose own block is not drawn to the nearest one", () => {
    const map = canvasBlockIndexByElement(template("inbox"), "inbox");
    const [block] = canvasIssuesByBlock([issue(2, "inbox")], "inbox", map);
    expect(block.blockIndex).toBe(1);
  });
});
