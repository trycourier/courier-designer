import { describe, expect, it } from "vitest";
import { classifyExpression, tokenizeArgs } from "../classifyExpression";
import { renderHandlebarsPreview, resetPreviewEnv } from "../renderPreview";
import { validateHandlebars } from "../validateHandlebars";

/**
 * `[...]` is handlebars' escape for a path segment that could not be written
 * bare. It runs to the closing bracket, spaces included, so `data.d.[my key]`
 * is one path and one token.
 */
describe("a bracketed path segment", () => {
  it("stays a single token", () => {
    expect(tokenizeArgs("data.d.[my key]")).toEqual(["data.d.[my key]"]);
    expect(tokenizeArgs("default data.s.[first name] 'x'")).toEqual([
      "default",
      "data.s.[first name]",
      "'x'",
    ]);
  });

  it("classifies as the variable it is", () => {
    const expr = classifyExpression("data.d.[my key]");
    expect(expr.kind).toBe("variable");
    expect(expr.name).toBe("data.d.[my key]");
  });

  it("does not block Publish", () => {
    expect(validateHandlebars("[{{data.d.[my key]}}]")).toEqual([]);
    expect(validateHandlebars("[{{data.s.[first name]}}]")).toEqual([]);
  });

  it("renders the value the send renders", () => {
    resetPreviewEnv();
    const result = renderHandlebarsPreview("[{{data.d.[my key]}}]", {
      data: { d: { "my key": "v" } },
    });
    expect(result.ok).toBe(true);
    expect(result.text).toBe("[v]");
  });
});
