import { describe, it, expect } from "vitest";
import * as publicApi from "./index";

/**
 * Public API surface snapshot.
 *
 * This test pins the set of named exports from the package root. It exists
 * to catch accidental removals/renames of public symbols — any change to
 * the exported surface should require an explicit update here (and usually
 * a changeset note).
 *
 * If you intentionally add or remove an export, update the snapshot and
 * document the change.
 */
describe("public API surface", () => {
  it("should export a stable set of named symbols from the package root", () => {
    const exportedNames = Object.keys(publicApi).sort();
    expect(exportedNames).toMatchSnapshot();
  });

  it("should continue to export atoms required by downstream consumers", () => {
    // These atoms are consumed by apps that embed the designer. Removing
    // any of them is a breaking change and must be handled with a major
    // version bump + changeset.
    const requiredAtoms = [
      "variableValidationAtom",
      "sampleDataAtom",
      "availableVariablesAtom",
      "variablesEnabledAtom",
      "isSidebarExpandedAtom",
      "emailFontFamilyAtom",
    ];
    for (const name of requiredAtoms) {
      expect(publicApi).toHaveProperty(name);
      expect(typeof (publicApi as Record<string, unknown>)[name]).toBe("object");
    }
  });
});
