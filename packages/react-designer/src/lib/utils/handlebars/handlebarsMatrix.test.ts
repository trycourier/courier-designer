import { beforeEach, describe, expect, it } from "vitest";
import { INVALID, SAMPLE_DATA, VALID } from "./handlebarsMatrix.fixture";
import { renderHandlebarsPreview, resetPreviewEnv } from "./renderPreview";
import { hasHandlebarsErrors } from "./validateHandlebars";
import { segmentText } from "./segmentText";

describe("handlebars matrix — preview output", () => {
  beforeEach(() => resetPreviewEnv());

  it.each(VALID.map((c) => [c.id, c] as const))("%s", (_id, c) => {
    const result = renderHandlebarsPreview(c.template, SAMPLE_DATA);
    expect(result.ok, `${c.id} failed to compile: ${result.error}`).toBe(true);
    expect(result.text).toBe(c.expected);
  });
});

describe("handlebars matrix — every valid case is accepted by validation", () => {
  it.each(VALID.map((c) => [c.id, c] as const))("%s", (_id, c) => {
    expect(hasHandlebarsErrors(c.template), `${c.id} was wrongly flagged invalid`).toBe(false);
  });
});

describe("handlebars matrix — every invalid case is flagged", () => {
  it.each(INVALID.map((c) => [c.id, c] as const))("%s", (_id, c) => {
    expect(hasHandlebarsErrors(c.template), `${c.id} was not flagged`).toBe(true);
  });
});

describe("handlebars matrix — every valid case round-trips through segmentText", () => {
  it.each(VALID.map((c) => [c.id, c] as const))("%s", (_id, c) => {
    const rebuilt = segmentText(c.template)
      .map((s) => (s.type === "text" ? s.text : s.type === "variable" ? `{{${s.name}}}` : s.raw))
      .join("");
    expect(rebuilt).toBe(c.template);
  });
});
