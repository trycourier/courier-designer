import { describe, expect, it } from "vitest";
import { segmentText } from "../segmentText";
import { classifyVariableReference, isAcceptedVariable } from "../variableRules";

const ctx = { available: ["data.d.items"], inBlockScope: true };

/**
 * `./name` is handlebars' explicit "this context" prefix, the same reference as
 * `this.name`. Measured on dev (req 1-6aba9c47-aa995932237e9af4771751ea):
 * `{{#each data.d.list}}[{{this}}|{{./this}}]{{/each}}` renders `[a|a][b|b]`.
 */
describe("a path anchored to the current context", () => {
  it("is block-scoped inside a block", () => {
    for (const name of ["./this", "./name", "./item.name"]) {
      expect(classifyVariableReference(name, ctx), name).toBe("block-scoped");
    }
  });

  it("reads the same as the `this.` spelling", () => {
    expect(classifyVariableReference("./name", ctx)).toBe(
      classifyVariableReference("this.name", ctx)
    );
    expect(classifyVariableReference("./name", { available: [] })).toBe(
      classifyVariableReference("this.name", { available: [] })
    );
  });

  it("leaves the chips unmarked in a loop", () => {
    const marked = segmentText(
      "{{#each data.d.items}}[{{name}}|{{this.name}}|{{./name}}]{{/each}}"
    ).filter((segment) => segment.type !== "text" && segment.isInvalid);
    expect(marked).toEqual([]);
  });

  it("is never put to the host's validator, which cannot know it", () => {
    // The same treatment `this.qty` and `@index` already get: the enclosing
    // block supplies the value, so a `data.`/`profile.` prefix rule would
    // reject every one of them.
    expect(isAcceptedVariable("./name", ctx, () => false)).toBe(true);
  });
});
