import { describe, expect, it } from "vitest";
import { severityOfIssue } from "../templateIssues";
import { validateHandlebars } from "../validateHandlebars";

const codes = (text: string) => validateHandlebars(text).map((issue) => issue.code);

/**
 * The backend helper is `sprintf(fmt, ...(Array.isArray(input) ? input : [input]))`,
 * so it reads ONE value argument and ignores every extra positional. Measured on
 * dev, `[{{format "%s%.2f" data.cur data.total}}]` fails the whole send: the
 * second placeholder has nothing to fill it and sprintf throws.
 */
describe("format called with more values than it reads", () => {
  it.each([
    ["two placeholders, two values", '[{{format "%s%.2f" data.cur data.total}}]'],
    ["three placeholders", '[{{format "%s %s %s" data.a data.b data.c}}]'],
  ])("blocks %s", (_label, text) => {
    const issue = validateHandlebars(text).find((i) => i.code === "helper-arity");
    expect(issue, `${text} → ${codes(text)}`).toBeDefined();
    expect(severityOfIssue(issue!)).toBe("blocking");
  });

  it("blocks a literal format that one literal value cannot fill", () => {
    expect(codes('[{{format "%s-%s" "only"}}]')).toContain("helper-arity");
  });

  it("leaves the calls that send alone", () => {
    for (const text of [
      // One placeholder, one value.
      '[{{format "%.2f" data.total}}]',
      '[{{format "%s" data.cur}}]',
      // An ARRAY fills one placeholder per item, which is the documented shape.
      '[{{format "%s-%s" (split data.s ",")}}]',
      // No placeholder at all is a constant string.
      '[{{format "plain" data.x}}]',
      // A format taken from the data is unknowable from the template.
      "[{{format data.fmt data.a}}]",
      // A path may hold a list at send, which fills one placeholder per item.
      '[{{format "%s-%s" data.pair}}]',
    ]) {
      expect(codes(text), text).not.toContain("helper-arity");
    }
  });
});
