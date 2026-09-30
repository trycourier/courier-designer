import { describe, expect, it } from "vitest";
import type { ElementalContent } from "../../../../types";
import { collectTemplateIssues } from "../templateIssues";
import { CHANNEL_HELPERS, isKnownHelper, SUGGESTABLE_HELPERS } from "../helperRegistry";
import { validateHandlebars } from "../validateHandlebars";

/**
 * An author's text compiles with universal + elemental helpers on EVERY
 * channel. `handlebars/template/{slack,msteams}.ts` register more, but those
 * belong to the channel's own block template, not to the text inside it — the
 * same trap `helpers/email` set earlier, and the reason this file is written
 * from send errors rather than from the backend's directory names.
 */
describe("helpers the renderer registers for an author's text", () => {
  it("accepts markdown-mark, which was blocking a template that sends", () => {
    expect(validateHandlebars('[{{#markdown-mark "**"}}m{{/markdown-mark}}]')).toEqual([]);
  });

  it("knows the elemental set, whatever the channel", () => {
    for (const channel of ["email", "sms", "push", "inbox", "slack", "msteams"]) {
      for (const name of ["markdown-mark", "elemental-text-block", "elemental-action-block"]) {
        expect(isKnownHelper(name, channel), `${name} on ${channel}`).toBe(true);
      }
    }
  });

  /**
   * Each of these was read from `/messages/{id}/history` on a real dev send.
   * They are the whole reason the per-channel sets are gone: the designer was
   * silent on all of them and Publish was enabled.
   */
  it.each([
    ["slack", "markdown"],
    ["slack", "jsonnet"],
    ["slack", "markdown-quote"],
    ["msteams", "javascript"],
    ["msteams", "markdown-quote"],
    ["email", "markdown-quote"],
  ])("reports `Missing helper` on %s for %s, as the send does", (channel, name) => {
    expect(isKnownHelper(name, channel), `${name} on ${channel}`).toBe(false);
    expect(
      validateHandlebars(`[{{${name} data.s}}]`, { channel }).map((issue) => issue.code)
    ).toContain("unknown-helper");
  });

  it("does not lend a block template's helpers to author text", () => {
    for (const [name, channel] of [
      ["markdown", "email"],
      ["markdown", "sms"],
      ["markdown", "push"],
      ["markdown", "inbox"],
      ["slack-text-block", "slack"],
      ["in-app-text-block", "inbox"],
      ["get-action-id", "slack"],
      ["javascript", "slack"],
    ] as const) {
      expect(isKnownHelper(name, channel), `${name} on ${channel}`).toBe(false);
    }
  });

  it("answers the same with no channel given", () => {
    expect(isKnownHelper("markdown-mark")).toBe(true);
    expect(isKnownHelper("markdown")).toBe(false);
  });

  it("suggests none of the renderer's own building blocks", () => {
    for (const name of CHANNEL_HELPERS) {
      expect(SUGGESTABLE_HELPERS, name).not.toContain(name);
    }
  });

  it("still reports a helper that really is unknown", () => {
    expect(validateHandlebars("[{{frobnicate data.x}}]").map((i) => i.code)).toContain(
      "unknown-helper"
    );
    expect(
      validateHandlebars("[{{#markdown-marks}}m{{/markdown-marks}}]").map((i) => i.code)
    ).toContain("unknown-helper");
  });
});

/** The channel still has to survive the walk from a template down to a field. */
describe("a template carrying the same call on two channels", () => {
  const template = {
    version: "2022-01-01",
    elements: [
      {
        type: "channel",
        channel: "email",
        elements: [{ type: "text", content: "[{{markdown data.h.name}}]" }],
      },
      {
        type: "channel",
        channel: "slack",
        elements: [{ type: "text", content: "[{{markdown data.h.name}}]" }],
      },
    ],
  } as unknown as ElementalContent;

  it("blocks it on both, because the send fails on both", () => {
    const issues = collectTemplateIssues(template);
    expect(issues.map((issue) => [issue.channel, issue.code])).toEqual([
      ["email", "unknown-helper"],
      ["slack", "unknown-helper"],
    ]);
  });
});
