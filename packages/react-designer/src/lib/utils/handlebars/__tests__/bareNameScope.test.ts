import { describe, expect, it } from "vitest";
import { classifyVariableReference, isAcceptedVariable } from "../variableRules";

const rejectsEverything = () => false;
// A host that publishes something, so an unknown name can be told from a
// template the host knows nothing about (where shape is all we can require).
const host = { available: ["data.name"] };

/**
 * A bare `{{name}}` went un-red on the canvas: an unclosed `{{#if}}` in an
 * EARLIER block left the scope counter above zero for every chip after it, and
 * a chip that believes it is inside a block is never put to the host's
 * validator. Two rules were wrong — what counts as a block, and how far one
 * block's opener reaches.
 */
describe("a bare name and the blocks around it", () => {
  const inside = (contextDepth: number, inBlockScope = contextDepth > 0) => ({
    ...host,
    inBlockScope,
    contextDepth,
  });

  it("is the host's to judge at top level", () => {
    expect(classifyVariableReference("name", inside(0))).toBe("unknown");
    expect(isAcceptedVariable("name", inside(0), rejectsEverything)).toBe(false);
  });

  it("is still the host's inside an if, which rebases nothing", () => {
    // `{{#if data.x}}{{name}}{{/if}}` reads `name` at the ROOT.
    const inIf = { ...host, inBlockScope: true, contextDepth: 0 };
    expect(classifyVariableReference("name", inIf)).toBe("unknown");
    expect(isAcceptedVariable("name", inIf, rejectsEverything)).toBe(false);
  });

  it("belongs to the block inside each and with, which do rebase", () => {
    expect(classifyVariableReference("name", inside(1))).toBe("block-scoped");
    expect(isAcceptedVariable("name", inside(1), rejectsEverything)).toBe(true);
    expect(isAcceptedVariable("id", inside(1), rejectsEverything)).toBe(true);
  });

  it("keeps this, @index and ../ working inside an if", () => {
    const inIf = { ...host, inBlockScope: true, contextDepth: 0 };
    for (const name of ["this", "this.qty", "@index", "@first"]) {
      expect(isAcceptedVariable(name, inIf, rejectsEverything), name).toBe(true);
    }
    expect(
      classifyVariableReference("../name", { ...host, inBlockScope: true, contextDepth: 1 })
    ).not.toBe("malformed");
  });

  it("does not let a resolved hop keep the block's scope", () => {
    // One hop out of one block lands at the top level, where the host judges.
    expect(classifyVariableReference("../name", inside(1))).toBe("unknown");
  });
});
