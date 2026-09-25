import { describe, expect, it } from "vitest";
import { isParseableJs, jsExpressionSupported } from "./jsExpression";

/**
 * An element's `if` and a list's `loop` are JavaScript, run by the send in a
 * vm2 sandbox (`filter-conditionals.ts` runs `vm.run(ifValue)` and requires a
 * boolean back). Invalid JavaScript raised nothing in the editor, so Publish
 * and Send test stayed enabled for a template where every send fails.
 */
describe("isParseableJs", () => {
  it("accepts the expressions authors actually write", () => {
    for (const expression of [
      "data.vip",
      "data.count > 2",
      "refs.item.id === data.id",
      "!data.hidden && profile.email",
      "data.items.length",
      "data.list.filter(i => i.on)",
    ]) {
      expect(isParseableJs(expression), expression).toBe(true);
    }
  });

  it("rejects what will not parse", () => {
    for (const expression of ["data.vip >", "data.(x)", "if data.x", "data.x ===", "){"]) {
      expect(isParseableJs(expression), expression).toBe(false);
    }
  });

  it("treats an empty expression as nothing to check", () => {
    expect(isParseableJs("")).toBe(true);
    expect(isParseableJs("   ")).toBe(true);
  });

  it("does not run the expression it is checking", () => {
    // Parsing only: a side effect here would run in the author's browser.
    const canary = "globalThis.__courier_js_check_canary__ = 1";
    isParseableJs(canary);
    expect((globalThis as Record<string, unknown>).__courier_js_check_canary__).toBeUndefined();
  });

  it("reports whether the check can run at all, for a host that forbids it", () => {
    expect(typeof jsExpressionSupported()).toBe("boolean");
  });
});
