import { describe, expect, it } from "vitest";
import { segmentText } from "./segmentText";
import { collectTemplateIssues, severityOfIssue } from "./templateIssues";
import { validateHandlebars } from "./validateHandlebars";

/**
 * Under `scope: "strict"` — what Studio writes — the send's variable handler is
 * rooted above `data`, so a bare path is undefined on every send whatever the
 * payload. Verified on dev against real `/send` runs; see the F-013 rows in
 * `sendParity.test.ts` for the same facts at the renderer level.
 */

const unscoped = (text: string) =>
  validateHandlebars(text).filter((issue) => issue.code === "unscoped-path");

const one = (text: string) => {
  const found = unscoped(text);
  expect(found, `expected exactly one unscoped-path in ${text}`).toHaveLength(1);
  return found[0];
};

describe("unscoped-path", () => {
  describe("fires on a bare path the strict root cannot resolve", () => {
    it.each([
      ['{{path "name"}}', "name"],
      ['{{get-list-items "items"}}', "items"],
      ['{{#if (filter "data" "name" "EQUALS" "x")}}y{{/if}}', "name"],
      ['{{default (path "nickname") "fb"}}', "nickname"],
      ['{{path "order.total"}}', "order.total"],
      ["{{path 'name'}}", "name"],
    ])("%s", (text, path) => {
      expect(one(text).message).toBe(`\`${path}\` is not in scope — use \`data.${path}\`.`);
    });
  });

  describe("stays quiet where the path already resolves", () => {
    it.each([
      // Every namespace the strict root exposes, not just the six the picker shows:
      // `courier.environment` renders "production" and `datetime.year` the year.
      '{{path "data.name"}}',
      '{{path "profile.email"}}',
      '{{path "courier.environment"}}',
      '{{path "datetime.year"}}',
      '{{path "messageId"}}',
      '{{path "tenant.name"}}',
      '{{path "urls.unsubscribe"}}',
      '{{path "brand.colors.primary"}}',
      '{{path "event"}}',
      '{{path "recipient"}}',
      '{{path "template"}}',
      '{{path "translations.greeting"}}',
      // Explicitly anchored paths never take the root lookup.
      '{{path "$.data.name"}}',
      '{{path "@.name"}}',
      // `filter "profile"` is scoped to the profile by the backend.
      '{{#if (filter "profile" "email" "CONTAINS" "@courier.com")}}y{{/if}}',
      // `var` leaves `{name}` behind and a later data-scoped pass fills it in.
      '{{var "name"}}',
      '{{inline-var "name"}}',
      // Not a literal, so there is no path to judge.
      "{{path somePath}}",
      // A bare variable is a different check entirely.
      "{{name}}",
    ])("%s", (text) => {
      expect(unscoped(text)).toEqual([]);
    });
  });

  describe("severity tracks what the renderer does with the undefined", () => {
    it.each([
      ['{{#if (filter "data" "name" "CONTAINS" "x")}}y{{/if}}', "blocking"],
      ['{{#if (filter "data" "name" "NOT_CONTAINS" "x")}}y{{/if}}', "blocking"],
      ['{{add (path "qty") 1}}', "blocking"],
      ['{{subtract (path "qty") 1}}', "blocking"],
      ['{{inc (path "qty")}}', "blocking"],
      ['{{round (path "qty")}}', "blocking"],
      // These evaluate false (or, for IS_EMPTY, true) and the send delivers.
      ['{{#if (filter "data" "nickname" "IS_EMPTY")}}y{{/if}}', "warning"],
      ['{{#if (filter "data" "nickname" "NOT_EMPTY")}}y{{/if}}', "warning"],
      ['{{#if (filter "data" "name" "EQUALS" "x")}}y{{/if}}', "warning"],
      // Renders empty.
      ['{{path "name"}}', "warning"],
      ['{{default (path "nickname") "fb"}}', "warning"],
      ['{{get-list-items "items"}}', "warning"],
    ])("%s is %s", (text, severity) => {
      expect(severityOfIssue(one(text))).toBe(severity);
    });

    it("a nested math call still blocks", () => {
      expect(severityOfIssue(one('{{#if (add (path "qty") 1)}}y{{/if}}'))).toBe("blocking");
    });
  });

  describe("an each/with body resolves against the block context first", () => {
    it.each([
      '{{#each data.items}}{{path "n"}}{{/each}}',
      '{{#with data.order}}{{path "total"}}{{/with}}',
      '{{#each data.items}}{{#if (filter "data" "n" "CONTAINS" "x")}}y{{/if}}{{/each}}',
      // Still inside the each after an inner if closes.
      '{{#each data.items}}{{#if data.x}}{{/if}}{{path "n"}}{{/each}}',
    ])("%s", (text) => {
      expect(unscoped(text)).toEqual([]);
    });

    it("fires again once the block has closed", () => {
      expect(unscoped('{{#each data.items}}{{path "n"}}{{/each}}{{path "n"}}')).toHaveLength(1);
    });

    it("fires on the each's own argument, which resolves outside it", () => {
      expect(one('{{#each (get-list-items "items")}}x{{/each}}').message).toContain("`items`");
    });

    it("an if alone does not rebase the context", () => {
      expect(unscoped('{{#if data.vip}}{{path "n"}}{{/if}}')).toHaveLength(1);
    });
  });

  describe("surfaces", () => {
    it("marks the expression segment, blocking or warning", () => {
      const blocking = segmentText('{{#if (filter "data" "name" "CONTAINS" "x")}}y{{/if}}').find(
        (s) => s.type === "expression"
      );
      expect(blocking).toMatchObject({ severity: "blocking" });

      const warning = segmentText('{{path "name"}}').find((s) => s.type === "expression");
      expect(warning).toMatchObject({ severity: "warning" });
    });

    it("leaves an each body unmarked", () => {
      const segments = segmentText('{{#each data.items}}{{path "n"}}{{/each}}');
      expect(segments.filter((s) => s.type === "expression" && s.severity)).toEqual([]);
    });

    it("reports through collectTemplateIssues with the right severity", () => {
      const issues = collectTemplateIssues({
        version: "2022-01-01",
        elements: [
          {
            type: "channel",
            channel: "email",
            elements: [
              { type: "text", content: '{{#if (filter "data" "name" "CONTAINS" "x")}}y{{/if}}' },
              { type: "text", content: '{{path "nickname"}}' },
            ],
          },
        ],
      } as never);

      const found = issues.filter((i) => i.code === "unscoped-path");
      expect(found.map((i) => i.severity)).toEqual(["blocking", "warning"]);
      expect(found[1].message).toBe("`nickname` is not in scope — use `data.nickname`.");
      expect(found[0].channel).toBe("email");
      expect(found[0].field).toBe("content");
    });
  });
});
