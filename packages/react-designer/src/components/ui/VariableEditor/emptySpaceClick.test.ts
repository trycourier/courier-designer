import { describe, expect, it, vi } from "vitest";
import { emptySpaceClickHandler } from "./emptySpaceClick";

/**
 * The sidebar's Label field had no empty-space click handling, and chips are
 * selectable: clicking past a trailing chip selected it, so the next character
 * typed replaced the chip instead of being added after it.
 */
describe("clicking past the end of a single-line editor", () => {
  const paragraph = { content: { size: 12 } };

  function viewWith(pos: number, depth: number) {
    const dispatch = vi.fn();
    const view = {
      state: {
        doc: {
          firstChild: paragraph,
          resolve: () => ({ depth, pos, parent: paragraph }),
        },
        tr: { setSelection: (selection: unknown) => ({ selection }) },
      },
      coordsAtPos: () => ({ right: 200 }),
      dispatch,
      focus: vi.fn(),
    };
    return { view, dispatch };
  }

  it("puts the caret at the end rather than letting the chip be selected", () => {
    const { view, dispatch } = viewWith(20, 0);
    const near = vi.fn(() => "selection-at-end");

    const handled = emptySpaceClickHandler({ near })(view as never, 20, {
      clientX: 700,
    } as MouseEvent);

    expect(handled).toBe(true);
    expect(dispatch).toHaveBeenCalled();
    expect(near).toHaveBeenCalled();
  });

  it("leaves a click on the content alone", () => {
    const { view, dispatch } = viewWith(5, 1);

    const handled = emptySpaceClickHandler()(view as never, 5, { clientX: 50 } as MouseEvent);

    expect(handled).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("does nothing in an empty editor with no paragraph", () => {
    const view = {
      state: { doc: { firstChild: null, resolve: () => ({ depth: 0 }) } },
      coordsAtPos: () => ({ right: 0 }),
      dispatch: vi.fn(),
      focus: vi.fn(),
    };
    expect(emptySpaceClickHandler()(view as never, 0, { clientX: 0 } as MouseEvent)).toBe(false);
  });
});
