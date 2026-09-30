import { describe, expect, it } from "vitest";
import { extractVariablesFromContent } from "@/components/utils/extractVariablesFromContent";
import type { ElementalNode } from "@/types";
import { variableReferencesIn } from "../variableReferences";

/**
 * `var`/`inline-var` take their path as a QUOTED STRING and resolve it the way
 * a legacy single-brace variable resolves: the backend does
 * `variableHandler.replace("{" + path + "}")`.
 *
 * Measured on dev with strict scope, `context.tenant_id` = `acme-c20904`:
 * `{{var "tenant.name"}}` renders `Acme C-20904`, and with no tenant it leaves
 * the literal `{tenant.name}` — which is what drops a subject. Thirteen of
 * Float's production templates use it, and neither Preview & Test's manual
 * inputs nor the test-event scaffold offered the path, because a quoted
 * argument was skipped as a literal.
 */
describe("the path a var call reads", () => {
  it.each([
    ['{{var "tenant.name"}}', "tenant.name"],
    ['{{inline-var "data.x"}}', "data.x"],
    ["{{var 'profile.email'}}", "profile.email"],
    ['[{{var "tenant.name"}}] Pay Co', "tenant.name"],
  ])("%s contributes %s", (text, path) => {
    expect(variableReferencesIn(text)).toContain(path);
  });

  it("contributes it from inside a block and a sub-expression", () => {
    expect(variableReferencesIn('{{#if (var "tenant.name")}}Y{{/if}}')).toContain("tenant.name");
  });

  it("leaves an unquoted argument as the runtime lookup it is", () => {
    // `{{var data.key}}` looks a path name up at send; `data.key` is the
    // reference, and there is no literal path to add.
    expect(variableReferencesIn("{{var data.key}}")).toEqual(["data.key"]);
  });

  it("adds nothing for a call with no argument", () => {
    expect(variableReferencesIn("{{var}}")).toEqual([]);
  });
});

/**
 * Studio builds its Manual-mode inputs and its test-event scaffold from the
 * walk over a channel's elements, so the path has to survive that too — a
 * reference `variableReferencesIn` knows about but the walk drops is still not
 * offered to the author.
 */
describe("a var path in a template's elements", () => {
  it("reaches the list a host builds its inputs from", () => {
    const elements = [
      { type: "meta", title: '[{{var "tenant.name"}}] Pay Co' },
      { type: "text", content: 'Hi {{var "profile.first_name"}}' },
    ] as unknown as ElementalNode[];

    expect(extractVariablesFromContent(elements)).toEqual(
      expect.arrayContaining(["tenant.name", "profile.first_name"])
    );
  });
});
