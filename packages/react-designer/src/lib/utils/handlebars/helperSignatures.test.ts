import { describe, expect, it } from "vitest";
import { UNIVERSAL_HELPERS } from "./helperRegistry";
import {
  HELPER_SIGNATURES,
  activeParamIndex,
  formatSignature,
  getHelperSignature,
} from "./helperSignatures";

describe("helper signatures", () => {
  it("only describes helpers the renderer actually registers", () => {
    const known = new Set<string>([
      ...UNIVERSAL_HELPERS,
      "if",
      "unless",
      "each",
      "with",
      "lookup",
      "log",
    ]);
    for (const name of Object.keys(HELPER_SIGNATURES)) {
      expect(known.has(name), `${name} is not a registered helper`).toBe(true);
    }
  });

  it("formats a signature for display", () => {
    // Space-separated: handlebars arguments are written with spaces, and
    // parentheses in the hint led authors to type them.
    expect(formatSignature("truncate", HELPER_SIGNATURES.truncate)).toBe(
      "truncate string limit suffix?"
    );
    expect(formatSignature("condition", HELPER_SIGNATURES.condition)).toBe(
      "condition operand1 conditional operand2"
    );
    expect(formatSignature("and", HELPER_SIGNATURES.and)).toBe("and ...values");
    expect(formatSignature("line-break", HELPER_SIGNATURES["line-break"])).toBe("line-break");
  });

  it("marks the block helpers as blocks", () => {
    expect(getHelperSignature("if")?.block).toBe(true);
    expect(getHelperSignature("each")?.block).toBe(true);
    expect(getHelperSignature("truncate")?.block).toBeFalsy();
  });

  it("has no signature for a helper whose arguments were not verified", () => {
    expect(getHelperSignature("definitely-not-a-helper")).toBeUndefined();
  });
});

describe("activeParamIndex", () => {
  it("is -1 while the caret is still on the name", () => {
    expect(activeParamIndex("truncate", "truncate")).toBe(-1);
  });

  it("advances to the first parameter once a space is typed", () => {
    expect(activeParamIndex("truncate ", "truncate")).toBe(0);
  });

  it("stays on a parameter while it is being typed", () => {
    expect(activeParamIndex("truncate data.bo", "truncate")).toBe(0);
  });

  it("advances through each parameter", () => {
    expect(activeParamIndex("truncate data.body ", "truncate")).toBe(1);
    expect(activeParamIndex("truncate data.body 10", "truncate")).toBe(1);
    expect(activeParamIndex("truncate data.body 10 ", "truncate")).toBe(2);
  });

  it("treats a quoted string with spaces as one parameter", () => {
    expect(activeParamIndex('translate "hello there"', "translate")).toBe(0);
    expect(activeParamIndex('translate "hello there" ', "translate")).toBe(1);
  });

  it("treats a sub-expression as one parameter", () => {
    expect(activeParamIndex("if (condition data.a", "if")).toBe(0);
    expect(activeParamIndex('if (condition data.a "==" data.b)', "if")).toBe(0);
    expect(activeParamIndex('if (condition data.a "==" data.b) ', "if")).toBe(1);
  });

  it("looks through a block sigil", () => {
    expect(activeParamIndex("#if data.vip", "if")).toBe(0);
  });

  it("is -1 when the text does not start with the helper", () => {
    expect(activeParamIndex("data.name", "truncate")).toBe(-1);
  });
});
