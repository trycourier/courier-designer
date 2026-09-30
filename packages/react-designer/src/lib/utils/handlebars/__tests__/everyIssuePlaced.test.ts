import { describe, expect, it } from "vitest";
import type { ElementalContent } from "../../../../types";
import {
  canvasBlockIndexByElement,
  canvasIssueKey,
  canvasIssuesByBlock,
  issuesNotPlacedOnCanvas,
} from "../canvasIssues";
import { collectTemplateIssues } from "../templateIssues";

const CHANNELS = ["sms", "push", "inbox", "slack", "msteams"] as const;

/**
 * The shape measured in Studio on dev template
 * `nt_01m3q201d2ecstwwm2mcwq5bvh`: a title with an unclosed `{{#if}}`, then
 * seven blocks of which four carry errors and one a warning. Every one of them
 * has to reach a pill — the host shows no "not marked on the canvas" list, so
 * anything left unplaced is shown nowhere.
 */
const template = (): ElementalContent =>
  ({
    version: "2022-01-01",
    elements: [...CHANNELS, "email"].map((channel) => ({
      type: "channel",
      channel,
      elements: [
        { type: "meta", title: "X {{#if data.s.t}}T" },
        { type: "text", content: "X1 ok {{data.s.name}}" },
        { type: "text", content: "X2 {{#if data.s.t}}unclosed" },
        { type: "text", content: "X3 {{frobnicate data.s.name}}" },
        { type: "text", content: "X4 ok" },
        { type: "text", content: 'X5 {{#if (condition data.s.n "==")}}Y{{/if}}' },
        { type: "text", content: "X6 {{round}}" },
        { type: "text", content: "X7 {{markdown data.s.name}}" },
      ],
    })),
  }) as unknown as ElementalContent;

describe("every issue on a channel reaches a pill", () => {
  const content = template();
  const issues = collectTemplateIssues(content);

  it.each(CHANNELS)("leaves nothing unplaced on %s", (channel) => {
    const map = canvasBlockIndexByElement(content, channel);
    const blocks = canvasIssuesByBlock(issues, channel, map);
    const placed = new Set(blocks.flatMap((block) => block.issues.map(canvasIssueKey)));
    const mine = issues.filter((issue) => issue.channel === channel);

    expect(mine.length, `${channel} has issues to place`).toBeGreaterThan(0);
    expect(issuesNotPlacedOnCanvas(mine, channel, placed)).toEqual([]);
  });

  it("places the title on the title block where the canvas draws one", () => {
    for (const channel of ["push", "inbox"]) {
      const map = canvasBlockIndexByElement(content, channel);
      const blocks = canvasIssuesByBlock(issues, channel, map);
      const titleBlock = blocks.find((block) => block.blockIndex === 0);
      expect(
        titleBlock?.issues.some((issue) => issue.field === "title"),
        channel
      ).toBe(true);
    }
  });

  it("still leaves the email title to the host's subject bar", () => {
    const map = canvasBlockIndexByElement(content, "email");
    const blocks = canvasIssuesByBlock(issues, "email", map);
    expect(blocks.flatMap((b) => b.issues).some((issue) => issue.field === "title")).toBe(false);
  });

  // `handlebars/template/slack.ts` registers `markdown`, but for the channel's
  // own BLOCK TEMPLATE — not for the text an author writes inside it. Measured
  // on dev, Slack `{{markdown data.s}}` is `Missing helper: "markdown"`, so it
  // is reported on every channel, Slack included.
  it("reports markdown on every channel, as every send fails on it", () => {
    const flagged = issues.filter((issue) => issue.message.includes("`markdown`"));
    expect(new Set(flagged.map((issue) => issue.channel))).toEqual(
      new Set(["email", "sms", "push", "inbox", "msteams", "slack"])
    );
  });
});
