import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAutoEdit } from "./chipEditing";

/**
 * Clearing the flag dispatches a ProseMirror transaction. Done straight inside
 * the effect, TipTap flushes it synchronously from a React lifecycle method,
 * which React warns about ("flushSync was called from inside a lifecycle
 * method") and which can drop the render in progress.
 */
describe("useAutoEdit", () => {
  it("opens the chip in the effect and clears the flag after it", async () => {
    const open = vi.fn();
    const clear = vi.fn();

    renderHook(() => useAutoEdit({ autoEdit: true, isEditing: false, open, clear }));

    expect(open).toHaveBeenCalled();
    expect(clear).not.toHaveBeenCalled();

    await Promise.resolve();
    expect(clear).toHaveBeenCalled();
  });

  it("does nothing for a chip that is not asking to open", () => {
    const open = vi.fn();
    const clear = vi.fn();
    renderHook(() => useAutoEdit({ autoEdit: false, isEditing: false, open, clear }));
    expect(open).not.toHaveBeenCalled();
    expect(clear).not.toHaveBeenCalled();
  });
});
