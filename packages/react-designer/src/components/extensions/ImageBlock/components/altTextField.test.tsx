import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The send delivers an image's alt text exactly as written — verified with real
 * sends, `alt="Picture for {{data.name}}"` arrives with the braces intact. A
 * chip there promised a substitution that never happens, and the `{{`
 * autocomplete invited the author to add more of them.
 */
describe("the Alt text field", () => {
  const source = readFileSync(join(__dirname, "ImageBlockForm.tsx"), "utf8");

  const altField = () => {
    const start = source.indexOf('name="alt"');
    expect(start, "an alt field").toBeGreaterThan(-1);
    return source.slice(start, source.indexOf("</FormItem>", start));
  };

  it("is a plain text input, with no chips and no autocomplete", () => {
    expect(altField()).not.toContain("VariableTextarea");
    expect(altField()).toContain("TextInput");
  });

  it("writes the value straight back to the node", () => {
    expect(altField()).toContain("alt: value");
  });
});
