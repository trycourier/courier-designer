import { describe, expect, it } from "vitest";
import { normaliseExpressionSpacing } from "./normaliseExpression";

describe("normaliseExpressionSpacing", () => {
  it("collapses the space a helper pick leaves in front of the argument", () => {
    expect(normaliseExpressionSpacing("capitalize  data.name")).toBe("capitalize data.name");
    expect(normaliseExpressionSpacing("capitalize ")).toBe("capitalize");
  });

  it("leaves a quoted string exactly as typed", () => {
    expect(normaliseExpressionSpacing('t  "two  spaces"')).toBe('t "two  spaces"');
    expect(normaliseExpressionSpacing('#if (condition data.a  "=="  "b")')).toBe(
      '#if (condition data.a "==" "b")'
    );
  });

  it("leaves a comment's own spacing alone", () => {
    expect(normaliseExpressionSpacing("! a  note ")).toBe("! a  note");
  });

  it("leaves an already-tidy expression untouched", () => {
    for (const inner of ["#each data.items", "data.name", '#if (condition data.a ">" 2)']) {
      expect(normaliseExpressionSpacing(inner)).toBe(inner);
    }
  });
});
