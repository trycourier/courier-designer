import { describe, expect, it } from "vitest";
import {
  HIDDEN_FROM_SUGGESTIONS,
  isKnownHelper,
  isSuggestableHelper,
} from "./helperRegistry";

describe("helpers hidden from suggestions", () => {
  it("stays valid, so a template using one is not flagged", () => {
    for (const name of HIDDEN_FROM_SUGGESTIONS) {
      expect(isKnownHelper(name), name).toBe(true);
    }
  });

  it("is not offered to an author", () => {
    for (const name of HIDDEN_FROM_SUGGESTIONS) {
      expect(isSuggestableHelper(name), name).toBe(false);
    }
  });

  it("leaves every other helper suggestable", () => {
    for (const name of ["capitalize", "condition", "if", "each", "truncate"]) {
      expect(isSuggestableHelper(name), name).toBe(true);
    }
  });
});
