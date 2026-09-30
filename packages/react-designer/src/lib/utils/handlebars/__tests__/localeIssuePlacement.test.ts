import { describe, expect, it } from "vitest";
import type { ElementalContent } from "../../../../types";
import {
  canvasBlockIndexByElement,
  canvasIssuesByBlock,
  canvasIssueKey,
  issuesNotPlacedOnCanvas,
} from "../canvasIssues";
import { collectTemplateIssues } from "../templateIssues";

/**
 * The top-bar count and the pills have to agree, so every issue the canvas
 * claims must actually be drawn. On T3 of the 2026-09-29 audit the two differed
 * by one per channel, and this is that one: an error inside a `fr` locale
 * override. The canvas draws the BASE content, so the blocks on screen are not
 * the blocks that issue is about, and it cannot have a pill there.
 */
const localised = {
  version: "2022-01-01",
  elements: [
    {
      type: "channel",
      channel: "email",
      elements: [
        { type: "text", content: "Hi {{frobnicate data.x}}" },
        {
          type: "text",
          content: "fine",
          locales: { fr: { content: "{{#if data.s.t}}bonjour" } },
        },
      ],
    },
  ],
} as unknown as ElementalContent;

const pinned = (content: ElementalContent, channel: string, locale?: string) =>
  canvasIssuesByBlock(
    collectTemplateIssues(content),
    channel,
    canvasBlockIndexByElement(content, channel),
    locale
  ).flatMap((block) => block.issues);

describe("an issue inside a locale override", () => {
  it("is counted, and is the only thing the base canvas cannot draw", () => {
    const issues = collectTemplateIssues(localised);
    const drawn = pinned(localised, "email");
    const keys = new Set(drawn.map(canvasIssueKey));
    const left = issuesNotPlacedOnCanvas(issues, "email", keys);

    expect(issues).toHaveLength(2);
    expect(left.map((issue) => issue.locale)).toEqual(["fr"]);
  });

  it("pins instead of the base ones when the canvas draws that locale", () => {
    const drawn = pinned(localised, "email", "fr");

    expect(drawn.map((issue) => issue.locale)).toEqual(["fr"]);
    expect(
      issuesNotPlacedOnCanvas(
        collectTemplateIssues(localised),
        "email",
        new Set(drawn.map(canvasIssueKey)),
        "fr"
      ).map((issue) => issue.locale)
    ).toEqual([undefined]);
  });

  it("leaves nothing else unplaced on the base canvas", () => {
    const issues = collectTemplateIssues(localised);
    const keys = new Set(pinned(localised, "email").map(canvasIssueKey));
    expect(
      issuesNotPlacedOnCanvas(issues, "email", keys).every((issue) => issue.locale !== undefined)
    ).toBe(true);
  });
});
