import { describe, expect, it } from "vitest";
import {
  columnStripsAllowed,
  resolveColumnDropZone,
  type ResolveColumnDropZoneArgs,
} from "./resolveColumnDropZone";

const band = { top: 100, bottom: 300 };

const base: ResolveColumnDropZoneArgs = {
  isRootColumn: true,
  columnIndex: 1,
  siblingCount: 3,
  prevIsColumn: false,
  nextIsColumn: false,
  mouseY: 200,
  cellBand: band,
};

describe("columnStripsAllowed", () => {
  it("allows top strip for the first column", () => {
    const result = columnStripsAllowed({
      isRootColumn: true,
      columnIndex: 0,
      siblingCount: 3,
      prevIsColumn: false,
      nextIsColumn: false,
    });
    expect(result.allowTopStrip).toBe(true);
    expect(result.allowBottomStrip).toBe(false);
  });

  it("allows bottom strip for the last column", () => {
    const result = columnStripsAllowed({
      isRootColumn: true,
      columnIndex: 2,
      siblingCount: 3,
      prevIsColumn: false,
      nextIsColumn: false,
    });
    expect(result.allowTopStrip).toBe(false);
    expect(result.allowBottomStrip).toBe(true);
  });

  it("allows both strips for a single column (first and last)", () => {
    const result = columnStripsAllowed({
      isRootColumn: true,
      columnIndex: 0,
      siblingCount: 1,
      prevIsColumn: false,
      nextIsColumn: false,
    });
    expect(result.allowTopStrip).toBe(true);
    expect(result.allowBottomStrip).toBe(true);
  });

  it("allows top strip when the previous sibling is a column", () => {
    const result = columnStripsAllowed({
      isRootColumn: true,
      columnIndex: 1,
      siblingCount: 3,
      prevIsColumn: true,
      nextIsColumn: false,
    });
    expect(result.allowTopStrip).toBe(true);
  });

  it("allows bottom strip when the next sibling is a column", () => {
    const result = columnStripsAllowed({
      isRootColumn: true,
      columnIndex: 1,
      siblingCount: 3,
      prevIsColumn: false,
      nextIsColumn: true,
    });
    expect(result.allowBottomStrip).toBe(true);
  });

  it("never allows strips for a non-root column", () => {
    const result = columnStripsAllowed({
      isRootColumn: false,
      columnIndex: 0,
      siblingCount: 1,
      prevIsColumn: true,
      nextIsColumn: true,
    });
    expect(result.allowTopStrip).toBe(false);
    expect(result.allowBottomStrip).toBe(false);
  });
});

describe("resolveColumnDropZone", () => {
  describe("middle column between non-columns", () => {
    it("routes into cells regardless of cursor position", () => {
      expect(resolveColumnDropZone({ ...base, mouseY: 0 })).toBe("into-cells");
      expect(resolveColumnDropZone({ ...base, mouseY: 200 })).toBe("into-cells");
      expect(resolveColumnDropZone({ ...base, mouseY: 1000 })).toBe("into-cells");
    });

    it("routes into cells even when the band is unknown", () => {
      expect(resolveColumnDropZone({ ...base, cellBand: null })).toBe("into-cells");
    });
  });

  describe("first column", () => {
    const first: ResolveColumnDropZoneArgs = {
      ...base,
      columnIndex: 0,
      siblingCount: 3,
    };

    it("drops before when above the cell band", () => {
      expect(resolveColumnDropZone({ ...first, mouseY: band.top - 5 })).toBe("before");
    });

    it("routes into cells when over the band", () => {
      expect(resolveColumnDropZone({ ...first, mouseY: 200 })).toBe("into-cells");
    });

    it("routes into cells below the band (bottom strip not allowed)", () => {
      expect(resolveColumnDropZone({ ...first, mouseY: band.bottom + 5 })).toBe("into-cells");
    });
  });

  describe("last column", () => {
    const last: ResolveColumnDropZoneArgs = {
      ...base,
      columnIndex: 2,
      siblingCount: 3,
    };

    it("drops after when below the cell band", () => {
      expect(resolveColumnDropZone({ ...last, mouseY: band.bottom + 5 })).toBe("after");
    });

    it("routes into cells when over the band", () => {
      expect(resolveColumnDropZone({ ...last, mouseY: 200 })).toBe("into-cells");
    });

    it("routes into cells above the band (top strip not allowed)", () => {
      expect(resolveColumnDropZone({ ...last, mouseY: band.top - 5 })).toBe("into-cells");
    });
  });

  describe("single column (first and last)", () => {
    const single: ResolveColumnDropZoneArgs = {
      ...base,
      columnIndex: 0,
      siblingCount: 1,
    };

    it("drops before above the band", () => {
      expect(resolveColumnDropZone({ ...single, mouseY: band.top - 5 })).toBe("before");
    });

    it("drops after below the band", () => {
      expect(resolveColumnDropZone({ ...single, mouseY: band.bottom + 5 })).toBe("after");
    });

    it("routes into cells over the band", () => {
      expect(resolveColumnDropZone({ ...single, mouseY: 200 })).toBe("into-cells");
    });
  });

  describe("between two stacked columns", () => {
    it("offers before for the lower column (prevIsColumn) above its band", () => {
      const lower: ResolveColumnDropZoneArgs = {
        ...base,
        columnIndex: 1,
        siblingCount: 3,
        prevIsColumn: true,
      };
      expect(resolveColumnDropZone({ ...lower, mouseY: band.top - 2 })).toBe("before");
    });

    it("offers after for the upper column (nextIsColumn) below its band", () => {
      const upper: ResolveColumnDropZoneArgs = {
        ...base,
        columnIndex: 1,
        siblingCount: 3,
        nextIsColumn: true,
      };
      expect(resolveColumnDropZone({ ...upper, mouseY: band.bottom + 2 })).toBe("after");
    });
  });

  describe("band not yet measured", () => {
    it("falls through when a strip is allowed but the band is null", () => {
      expect(
        resolveColumnDropZone({ ...base, columnIndex: 0, siblingCount: 3, cellBand: null })
      ).toBe("fallthrough");
    });
  });
});
