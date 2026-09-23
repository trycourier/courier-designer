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
