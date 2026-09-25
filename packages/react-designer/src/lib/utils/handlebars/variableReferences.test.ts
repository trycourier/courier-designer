import { describe, expect, it } from "vitest";
import { variableReferencesIn } from "./variableReferences";

describe("variableReferencesIn", () => {
  it("reads a plain variable", () => {
    expect(variableReferencesIn("Hi {{data.user.name}}")).toEqual(["data.user.name"]);
  });

  it("reads the operand of a helper call, which the old regex dropped entirely", () => {
    expect(variableReferencesIn("{{capitalize data.user.name}}")).toEqual(["data.user.name"]);
  });

  it("keeps literals and the helper name out", () => {
    expect(variableReferencesIn('{{truncate data.message 20 "..."}}')).toEqual(["data.message"]);
  });

  it("reads the subject of a block open", () => {
    expect(variableReferencesIn("{{#if data.user.isAdmin}}Admin{{/if}}")).toEqual([
      "data.user.isAdmin",
    ]);
    expect(variableReferencesIn("{{#each data.items}}x{{/each}}")).toEqual(["data.items"]);
  });

  it("walks nested sub-expressions", () => {
    const text = '{{#if (and (condition data.score ">=" 80) (not data.order.discount))}}x{{/if}}';
    expect(variableReferencesIn(text).sort()).toEqual(["data.order.discount", "data.score"]);
  });

  it("reads an else-if subject", () => {
    expect(variableReferencesIn("{{else if data.user.isGuest}}")).toEqual(["data.user.isGuest"]);
  });

  it("leaves block-scoped and loop references out — the block supplies them", () => {
    expect(variableReferencesIn("{{#each data.items}}{{this.name}} {{@index}}{{/each}}")).toEqual([
      "data.items",
    ]);
    expect(variableReferencesIn("{{$.item.name}}")).toEqual([]);
  });

  it("ignores closers, comments and partials", () => {
    expect(variableReferencesIn("{{/if}}{{!-- data.secret --}}{{> myPartial}}")).toEqual([]);
  });

  it("collects across several occurrences without duplicates", () => {
    const text = "{{data.a}} and {{capitalize data.a}} and {{truncate data.b 5}}";
    expect(variableReferencesIn(text).sort()).toEqual(["data.a", "data.b"]);
  });

  it("can exclude triple-staches, which an HTML block cannot reproduce", () => {
    expect(variableReferencesIn("{{{data.html}}}")).toEqual(["data.html"]);
    expect(variableReferencesIn("{{{data.html}}}", { includeTriple: false })).toEqual([]);
  });

  it("returns nothing for text without handlebars", () => {
    expect(variableReferencesIn("just words")).toEqual([]);
  });

  it("reads a hash argument's value, so a helper's named options are listed too", () => {
    expect(variableReferencesIn("{{helper key=data.v}}")).toEqual(["data.v"]);
    expect(variableReferencesIn('{{helper key=data.v other="lit" n=3}}')).toEqual(["data.v"]);
  });

  it("requires a helper argument to be namespaced, and a standalone one not to be", () => {
    // Deliberate asymmetry. `{{ not a variable }}` parses as the `not` helper,
    // and without this `a` and `variable` would be offered as fillable fields.
    // A standalone `{{amount}}` is untouched, so a host with a flat variable
    // tree keeps working.
    expect(variableReferencesIn("{{truncate name 10}}")).toEqual([]);
    expect(variableReferencesIn("{{truncate data.name 10}}")).toEqual(["data.name"]);
    expect(variableReferencesIn("{{amount}}")).toEqual(["amount"]);
    expect(variableReferencesIn("{{ not a variable }}")).toEqual([]);
  });
});

/**
 * `filter` takes its path as a quoted string, so the literal skip meant a
 * template built entirely out of `(filter …)` reported no variables at all and
 * Preview & Test offered nothing to fill in.
 *
 * Verified against the backend (`handlebars/helpers/universal/filter.ts`): a
 * source of `profile` resolves the property inside the profile scope, anything
 * else resolves it at the root — so the property is the path as written.
 */
describe("filter's quoted path", () => {
  it("counts the property as written for a data source", () => {
    expect(variableReferencesIn('{{#if (filter "data" "data.v" "EQUALS" "1")}}Y{{/if}}')).toEqual([
      "data.v",
    ]);
  });

  it("scopes it to the profile for a profile source", () => {
    expect(variableReferencesIn('{{#if (filter "profile" "email" "EQUALS" "x")}}Y{{/if}}')).toEqual(
      ["profile.email"]
    );
  });

  it("counts a standalone filter call too", () => {
    expect(variableReferencesIn('{{filter "data" "data.score" "GREATER_THAN" "80"}}')).toEqual([
      "data.score",
    ]);
  });

  it("takes nothing from the operator or the value", () => {
    const refs = variableReferencesIn('{{#if (filter "data" "data.v" "EQUALS" "data.other")}}Y{{/if}}');
    expect(refs).toEqual(["data.v"]);
  });

  it("ignores a property that is not a path", () => {
    expect(variableReferencesIn('{{#if (filter "data" "" "IS_EMPTY")}}Y{{/if}}')).toEqual([]);
    expect(variableReferencesIn('{{#if (filter "data" "not a path" "EQUALS" "1")}}Y{{/if}}')).toEqual(
      []
    );
  });
});

/**
 * Inside `{{#each}}`/`{{#with}}` a name resolves against the block's context,
 * not the payload: `{{#with data.address}}{{city}}{{/with}}` reads
 * `data.address.city`. Offering `city` as a manual input in Preview & Test gave
 * the author a field the send never reads.
 */
describe("names inside a block", () => {
  it("takes the block's own source, not the names inside it", () => {
    expect(
      variableReferencesIn("{{#with data.address}}{{city}}{{/with}}")
    ).toEqual(["data.address"]);
    expect(variableReferencesIn("{{#each data.items}}{{name}}{{/each}}")).toEqual(["data.items"]);
  });

  it("counts names again once the block has closed", () => {
    expect(
      variableReferencesIn("{{#each data.items}}{{name}}{{/each}}{{data.total}}")
    ).toEqual(["data.items", "data.total"]);
  });

  it("still counts names inside an if, which does not rebase the context", () => {
    expect(variableReferencesIn("{{#if data.vip}}{{data.name}}{{/if}}")).toEqual([
      "data.vip",
      "data.name",
    ]);
  });

  it("takes a nested block's source only when it is not itself relative", () => {
    // `this.tags` belongs to the outer item, so there is nothing to ask for.
    expect(
      variableReferencesIn("{{#each data.items}}{{#each this.tags}}{{name}}{{/each}}{{/each}}")
    ).toEqual(["data.items"]);
  });
});
