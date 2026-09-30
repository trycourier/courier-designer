import { isValidVariableName } from "@/components/utils/validateVariableName";
import { describe, expect, it } from "vitest";
import { classifyVariableReference, isAcceptedVariable } from "../variableRules";

const ctx = { available: ["data.d.name", "profile.email"] };

/**
 * The paths the 2026-09-29 audit found carrying a warning while rendering at
 * send. Handlebars' ID grammar takes anything but whitespace and
 * ``!"#%&'()*+,./;<=>@[\]^`{|}~``, with `[…]` literals, numeric segments and
 * `/` as an alternative separator — all of which JSON identifier rules reject.
 */
const RENDERS_AT_SEND = [
  "data.d.my-key",
  "data.d.ünï",
  "data.d.items.0.name",
  "items.0.name",
  "data.d.[a.b]",
  "data/d/name",
  "this.data.d.name",
  "./data.d.name",
  "this",
  "@../index",
  "profile.custom-field",
  "&data.s.v",
  "$.item.name",
  "data.items.[0].name",
  "_private",
  "123user",
];

describe("a path Handlebars can read", () => {
  it.each(RENDERS_AT_SEND)("accepts %s", (name) => {
    expect(isValidVariableName(name)).toBe(true);
  });

  it("is never called malformed by the rules the chips use", () => {
    for (const name of RENDERS_AT_SEND) {
      expect(classifyVariableReference(name, { ...ctx, inBlockScope: true }), name).not.toBe(
        "malformed"
      );
    }
  });

  it("is accepted even by a host validator that knows none of them", () => {
    // A block-scoped or renderer-supplied reference is never put to the host.
    for (const name of ["this", "./data.d.name", "@../index", "this.data.d.name"]) {
      expect(
        isAcceptedVariable(name, { ...ctx, inBlockScope: true }, () => false),
        name
      ).toBe(true);
    }
  });
});

describe("a path that really is malformed", () => {
  it.each([
    ["an empty segment", "data.d..name"],
    ["a trailing dot", "data.d."],
    ["a space", "user. firstName"],
    ["nothing at all", ""],
    ["a bracket that never closes", "data.[a"],
    ["a character the grammar forbids", "user%name"],
  ])("still rejects %s", (_label, name) => {
    expect(isValidVariableName(name)).toBe(false);
  });
});
