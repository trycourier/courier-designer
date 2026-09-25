import { describe, expect, it } from "vitest";
import { contextDepthOf } from "./blockContext";

/**
 * How many enclosing blocks have rebased the context, which is how far `../`
 * can reach. `#each` and `#with` rebase; `#if` and `#unless` do not — they run
 * their body in the same context, so counting them made `{{../x}}` look like it
 * reached a level that does not exist.
 */
describe("contextDepthOf", () => {
  const open = (name: string) => ({ kind: "blockOpen", name });
  const close = () => ({ kind: "blockClose", name: "" });

  it("counts each and with", () => {
    expect(contextDepthOf([open("each")])).toBe(1);
    expect(contextDepthOf([open("each"), open("with")])).toBe(2);
    expect(contextDepthOf([open("each"), open("each")])).toBe(2);
  });

  it("does not count if or unless", () => {
    expect(contextDepthOf([open("if")])).toBe(0);
    expect(contextDepthOf([open("unless"), open("if")])).toBe(0);
    expect(contextDepthOf([open("if"), open("each")])).toBe(1);
  });

  it("pops the block that was actually opened", () => {
    // `{{#each}}{{#if}}{{/if}}` leaves the each open: a close that popped
    // blindly would take the each off and report depth 0 inside it.
    expect(contextDepthOf([open("each"), open("if"), close()])).toBe(1);
    expect(contextDepthOf([open("if"), open("each"), close()])).toBe(0);
    expect(contextDepthOf([open("each"), open("each"), close()])).toBe(1);
  });

  it("counts an inverse section as its opener does", () => {
    expect(contextDepthOf([{ kind: "blockInverseOpen", name: "each" }])).toBe(1);
  });

  it("ignores a close with nothing open", () => {
    expect(contextDepthOf([close(), close()])).toBe(0);
    expect(contextDepthOf([])).toBe(0);
  });
});
