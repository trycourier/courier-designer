import { describe, it, expect } from "vitest";
import { resolveEmptySpaceClick } from "./VariableInput";

describe("resolveEmptySpaceClick", () => {
  // Example document structure for "Your order #{{orderNumber}} is confirmed":
  //   doc(0) > paragraph(0) > text "Your order #"(1-12) | variable(13) | text " is confirmed"(14-27)
  //   paragraphContentSize = 26, paragraphEnd = 27

  describe("Case 1: Click at doc level (depth 0) — posAtCoords returned {inside: -1}", () => {
    it("should place caret at end when click position is past paragraph end", () => {
      // Click far right in empty space: pos=28, past paragraphEnd=27
      const result = resolveEmptySpaceClick(0, 28, 26, 700, 430);
      expect(result).toEqual({ targetPos: 27, bias: -1 });
    });

    it("should place caret at end when click position equals paragraph end", () => {
      // Click position exactly at paragraphEnd
      const result = resolveEmptySpaceClick(0, 27, 26, 700, 430);
      expect(result).toEqual({ targetPos: 27, bias: -1 });
    });

    it("should place caret at start when click position is before paragraph end", () => {
      // Click at doc level but before paragraph end (e.g., click to the left of content)
      const result = resolveEmptySpaceClick(0, 0, 26, 50, 430);
      expect(result).toEqual({ targetPos: 1, bias: 1 });
    });

    it("should handle single-character content", () => {
      // Document with just one character: paragraphContentSize=1, paragraphEnd=2
      const result = resolveEmptySpaceClick(0, 2, 1, 700, 150);
      expect(result).toEqual({ targetPos: 2, bias: -1 });
    });

    it("should handle empty paragraph", () => {
      // Empty paragraph: paragraphContentSize=0, paragraphEnd=1
      const result = resolveEmptySpaceClick(0, 1, 0, 700, 145);
      expect(result).toEqual({ targetPos: 1, bias: -1 });
    });

    it("should ignore endCoordsRight value (uses pos comparison only)", () => {
      // Even if endCoordsRight is null, Case 1 still works based on pos vs paragraphEnd
      const result = resolveEmptySpaceClick(0, 28, 26, 700, null);
      expect(result).toEqual({ targetPos: 27, bias: -1 });
    });
  });

  describe("Case 2: Click inside paragraph (depth > 0) but past visible content", () => {
    it("should place caret at end when clickX is past content right edge", () => {
      // Click coordinates past visible content: clickX=687 > endCoordsRight=483
      // This happens when content ends with a variable chip and user clicks in the gap
      const result = resolveEmptySpaceClick(1, 13, 28, 687, 483);
      expect(result).toEqual({ targetPos: 29, bias: -1 });
    });

    it("should return null when clickX is within content bounds", () => {
      // Click within the visible content area: clickX=300 < endCoordsRight=430
      const result = resolveEmptySpaceClick(1, 13, 26, 300, 430);
      expect(result).toBeNull();
    });

    it("should return null when clickX exactly equals endCoordsRight", () => {
      // Click exactly at the content edge — not past it, no correction needed
      const result = resolveEmptySpaceClick(1, 13, 26, 430, 430);
      expect(result).toBeNull();
    });

    it("should return null when endCoordsRight is unavailable", () => {
      // coordsAtPos threw an error, endCoordsRight is null — can't determine, skip
      const result = resolveEmptySpaceClick(1, 13, 26, 700, null);
      expect(result).toBeNull();
    });
  });

  describe("No correction needed", () => {
    it("should return null for normal click inside paragraph content", () => {
      // Normal click at depth 1, within visible content
      const result = resolveEmptySpaceClick(1, 5, 26, 200, 430);
      expect(result).toBeNull();
    });

    it("should return null for click on a variable node inside paragraph", () => {
      // Click directly on a variable chip (depth=1, within content bounds)
      const result = resolveEmptySpaceClick(1, 13, 26, 350, 430);
      expect(result).toBeNull();
    });

    it("should return null at deeper depth levels within content", () => {
      // Depth > 1 (e.g., nested node), within content bounds
      const result = resolveEmptySpaceClick(2, 5, 26, 200, 430);
      expect(result).toBeNull();
    });
  });

  describe("Edge cases with variable-only content", () => {
    it("should handle content that is a single variable", () => {
      // "{{orderNumber}}" → variable(1) + zeroWidthSpace(2)
      // paragraphContentSize=2, paragraphEnd=3
      // Click past content at doc level
      const result = resolveEmptySpaceClick(0, 3, 2, 700, 200);
      expect(result).toEqual({ targetPos: 3, bias: -1 });
    });

    it("should handle content ending with variable (Case 2 scenario)", () => {
      // "Your order #{{orderNumber}}{{status}}" + zeroWidthSpace
      // User clicks in empty space after the last chip
      // paragraphContentSize=16, paragraphEnd=17
      const result = resolveEmptySpaceClick(1, 14, 16, 600, 400);
      expect(result).toEqual({ targetPos: 17, bias: -1 });
    });

    it("should handle multiple adjacent variables", () => {
      // "{{a}}{{b}}{{c}}" + zeroWidthSpace
      // paragraphContentSize=4, paragraphEnd=5
      // Click past content
      const result = resolveEmptySpaceClick(1, 2, 4, 500, 250);
      expect(result).toEqual({ targetPos: 5, bias: -1 });
    });
  });
});
