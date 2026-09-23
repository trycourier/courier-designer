import { describe, expect, it } from "vitest";
import {
  classifyVariableReference,
  isAcceptedVariable,
  isRejectedVariable,
  variableArguments,
  nameDefinedBySet,
} from "./variableRules";
import { classifyExpression } from "./classifyExpression";
import { segmentText } from "./segmentText";
import { variableReferencesIn } from "./variableReferences";

const available = ["data.user.name", "data.order.id", "data.items.0.name", "profile.email"];

describe("classifyVariableReference", () => {
  it("accepts a published leaf path", () => {
    expect(classifyVariableReference("data.user.name", { available })).toBe("known");
  });

  it("accepts an object node, which blocks take as their subject", () => {
    // `{{#with data.order}}` / `{{#each data.items}}` — the flattened list only
    // carries leaves, so a prefix of a known path has to count.
    expect(classifyVariableReference("data.order", { available })).toBe("known");
    expect(classifyVariableReference("data", { available })).toBe("known");
  });

  it("rejects a path the host does not publish", () => {
    expect(classifyVariableReference("data.user.middleName", { available })).toBe("unknown");
  });

  it("accepts block references only inside a block", () => {
    expect(classifyVariableReference("this.name", { available, inBlockScope: true })).toBe(
      "block-scoped"
    );
    expect(classifyVariableReference("@index", { available, inBlockScope: true })).toBe(
      "block-scoped"
    );
    expect(classifyVariableReference("this.name", { available })).toBe("malformed");
    expect(classifyVariableReference("@index", { available })).toBe("malformed");
  });

  it("accepts a rebased bare name inside a block", () => {
    // `{{#with data.order}}{{id}}{{/with}}` — the host list cannot confirm `id`.
    expect(classifyVariableReference("id", { available, inBlockScope: true })).toBe("block-scoped");
  });

  it("accepts loop references only inside a loop", () => {
    expect(classifyVariableReference("$.item.name", { available, inLoop: true })).toBe("loop");
    expect(classifyVariableReference("$.item.name", { available })).toBe("unknown");
  });

  it("requires only shape when the host publishes nothing", () => {
    expect(classifyVariableReference("anything.at.all", { available: [] })).toBe("known");
  });

  it("rejects a malformed path", () => {
    expect(classifyVariableReference("user..name", { available })).toBe("malformed");
    expect(classifyVariableReference("", { available })).toBe("malformed");
  });

  it("drives the same verdict for chips and helper arguments", () => {
    const ctx = { available };
    expect(isRejectedVariable("data.user.name", ctx)).toBe(false);
    expect(isRejectedVariable("data.user.middleName", ctx)).toBe(true);
  });
});

describe("variableArguments", () => {
  it("keeps paths and drops literals, hashes and sub-expressions", () => {
    expect(
      variableArguments(["data.body", "10", '"..."', 'separator="-"', "(condition a b c)", "true"])
    ).toEqual(["data.body"]);
  });
});

describe("isAcceptedVariable", () => {
  const hostRequiresNamespace = (name: string) =>
    ["data.", "profile.", "tenant."].some((p) => name.startsWith(p) && name.length > p.length);

  it("never asks the host about a block-scoped reference", () => {
    // `@index`/`@last`/`this.qty` are supplied by the enclosing block. A host
    // rule that requires a `data.` prefix rejects every one of them, which
    // flagged valid loop cases as errors.
    const ctx = { available: [], inBlockScope: true };
    for (const ref of ["@index", "@last", "@first", "this.qty", "this"]) {
      expect(isAcceptedVariable(ref, ctx, hostRequiresNamespace)).toBe(true);
    }
  });

  it("never asks the host about a loop reference", () => {
    const ctx = { available: [], inLoop: true };
    expect(isAcceptedVariable("$.item.sku", ctx, hostRequiresNamespace)).toBe(true);
  });

  it("still rejects a block-scoped reference used outside a block", () => {
    expect(isAcceptedVariable("@index", { available: [] }, hostRequiresNamespace)).toBe(false);
  });

  it("defers a real path to the host, which knows the payload and the list does not", () => {
    const ctx = { available: ["data.known"] };
    expect(isAcceptedVariable("data.never.published", ctx, hostRequiresNamespace)).toBe(true);
    expect(isAcceptedVariable("nope.field", ctx, hostRequiresNamespace)).toBe(false);
  });

  it("falls back to the published list when the host supplies no validator", () => {
    const ctx = { available: ["data.known"] };
    expect(isAcceptedVariable("data.known", ctx)).toBe(true);
    expect(isAcceptedVariable("data.unknown", ctx)).toBe(false);
  });
});

describe("variableArguments and hash arguments", () => {
  it("takes a hash argument's value, which is a reference like any other", () => {
    // `{{helper key=data.v}}` uses `data.v` exactly as `{{helper data.v}}`
    // does; skipping the token hid it from Preview & Test.
    expect(variableArguments(["key=data.v"])).toEqual(["data.v"]);
    expect(variableArguments(['separator="-"'])).toEqual([]);
    expect(variableArguments(["limit=20"])).toEqual([]);
  });

  it("still reads a plain argument beside a hash one", () => {
    expect(variableArguments(["data.plain", "key=data.v", '"lit"'])).toEqual([
      "data.plain",
      "data.v",
    ]);
  });
});

describe("parent-path and sub-expression references", () => {
  const ctx = { available: ["data.statement.currency"], inBlockScope: true };

  it("resolves `../` against the enclosing context", () => {
    // `{{#each items}}{{../data.statement.currency}}{{/each}}` reaches out of
    // the loop. Comparing the literal string to the flat list made it red.
    expect(classifyVariableReference("../data.statement.currency", ctx)).toBe("known");
    expect(isRejectedVariable("../data.statement.currency", ctx)).toBe(false);
  });

  it("resolves several hops", () => {
    expect(classifyVariableReference("../../data.statement.currency", ctx)).toBe("known");
  });

  it("rejects a parent reference outside any block, where there is no parent", () => {
    expect(classifyVariableReference("../data.statement.currency", { available: [] })).toBe(
      "malformed"
    );
  });

  it("still judges the resolved path, so a bad one stays bad", () => {
    expect(classifyVariableReference("../data.nope", ctx)).toBe("unknown");
  });

  it("does not split a comparison operator inside a sub-expression", () => {
    // `variableArguments` saw the `==` as a hash separator and offered
    // `=" "premier")` as a variable name.
    expect(variableArguments(['(condition data.customer.tier "==" "premier")'])).toEqual([]);
    expect(variableArguments(['(condition data.x "<=" 3)'])).toEqual([]);
  });
});

describe("a parent path put to a host validator", () => {
  // Studio's rule, verbatim: a known prefix plus a field.
  const host = (name: string) =>
    ["profile.", "data.", "tenant."].some((p) => name.startsWith(p) && name.length > p.length);

  it("asks about the resolved path, not the traversal syntax", () => {
    // The classifier resolved `../` but the delegation did not, so every host
    // prefix rule rejected it and the chip stayed red on a valid reference.
    const ctx = { available: ["data.statement.currency"], inBlockScope: true };
    expect(isAcceptedVariable("../data.statement.currency", ctx, host)).toBe(true);
  });

  it("still rejects a parent path the host does not recognise", () => {
    const ctx = { available: [], inBlockScope: true };
    expect(isAcceptedVariable("../nope.field", ctx, host)).toBe(false);
  });

  it("leaves an ordinary path untouched on its way to the host", () => {
    const ctx = { available: [] };
    expect(isAcceptedVariable("data.known", ctx, host)).toBe(true);
    expect(isAcceptedVariable("nope", ctx, host)).toBe(false);
  });
});

// F-014: three expressions the send renders that the editor flagged invalid.
describe("valid expressions the editor used to flag", () => {
  it("reads a bare name the renderer registers as a helper call", () => {
    expect(classifyExpression("line-break")).toMatchObject({
      kind: "helperCall",
      name: "line-break",
    });
    expect(segmentText("a{{line-break}}b")[1]).toMatchObject({
      type: "expression",
      isInvalid: false,
    });
    expect(variableReferencesIn("a{{line-break}}b")).toEqual([]);
  });

  it("still reads a bare name no helper claims as a variable", () => {
    expect(classifyExpression("greet")).toMatchObject({ kind: "variable" });
  });

  it("does not treat a literal hash value as a variable", () => {
    expect(variableArguments(["data.url", "disableLinkTracking=true"])).toEqual(["data.url"]);
    expect(variableArguments(["n=null", "k=false", "m=undefined"])).toEqual([]);
  });

  it("names what a set defines", () => {
    expect(nameDefinedBySet('{{set "greet" "hey"}}')).toBe("greet");
    expect(nameDefinedBySet("{{set 'greet' data.v}}")).toBe("greet");
    expect(nameDefinedBySet("{{set greet=data.v}}")).toBeUndefined();
    expect(nameDefinedBySet('{{default "greet" "hey"}}')).toBeUndefined();
  });
});
