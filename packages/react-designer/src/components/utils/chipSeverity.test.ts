import { describe, expect, it } from "vitest";
import { renderVariablesInHtmlString, renderVariablesInTextString } from "./htmlBlockVariables";

/**
 * Red says "this will not send". A helper the send renders as an empty string
 * is a warning, and the issues list already called it one — drawing every
 * problem red left the author unable to tell which chips actually stop a send.
 */
describe("chips in the read-only renderers", () => {
  it("draws handlebars the send cannot compile red", () => {
    expect(renderVariablesInHtmlString("<p>{{/if}}</p>")).toContain(
      "courier-handlebars-chip-invalid"
    );
  });

  it("draws a helper the send renders empty as a warning", () => {
    const out = renderVariablesInHtmlString('<p>{{#if (condition data.a "==")}}x{{/if}}</p>');
    expect(out).toContain("courier-handlebars-chip-warning");
    expect(out).not.toContain("courier-handlebars-chip-invalid");
  });

  it("does the same in a plain-text field", () => {
    expect(renderVariablesInTextString('{{#if (condition data.a "==")}}x{{/if}}')).toContain(
      "courier-handlebars-chip-warning"
    );
    expect(renderVariablesInTextString("{{/if}}")).toContain("courier-handlebars-chip-invalid");
  });

  it("marks a clean expression neither way", () => {
    const out = renderVariablesInTextString("{{#if data.x}}y{{/if}}");
    expect(out).not.toContain("courier-handlebars-chip-invalid");
    expect(out).not.toContain("courier-handlebars-chip-warning");
  });
});
