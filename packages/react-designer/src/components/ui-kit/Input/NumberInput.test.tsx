import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { NumberInput } from "./NumberInput";

/**
 * A host that behaves like the real callers: it stores the committed override
 * and falls back to a default when there is none, so an empty field feeds the
 * default straight back into `value`. That round trip is what used to make the
 * field impossible to clear.
 */
const Host = ({
  fallback = 13,
  commitEmpty,
  onCommit = vi.fn(),
}: {
  fallback?: number;
  commitEmpty?: boolean;
  onCommit?: (value: number | null) => void;
}) => {
  const [stored, setStored] = useState<number | null>(null);
  return (
    <NumberInput
      aria-label="Size"
      data-testid="size"
      commitEmpty={commitEmpty}
      value={stored ?? fallback}
      onValueChange={(value) => {
        setStored(value);
        onCommit(value);
      }}
    />
  );
};

const input = () => screen.getByTestId("size") as HTMLInputElement;

describe("NumberInput", () => {
  it("shows the value it is given while it is not being edited", () => {
    render(<Host />);

    expect(input().value).toBe("13");
  });

  it("stays empty when the author clears it, and commits the empty as unset", () => {
    const onCommit = vi.fn();
    render(<Host onCommit={onCommit} />);

    fireEvent.change(input(), { target: { value: "" } });

    expect(input().value).toBe("");
    expect(onCommit).toHaveBeenCalledWith(null);
  });

  it("lets the author retype a smaller number over the seeded one", () => {
    const onCommit = vi.fn();
    render(<Host onCommit={onCommit} />);

    // Backspacing 13 away, then typing 2 — the entry that used to be impossible
    // because the field snapped back to 13 the moment it went empty.
    fireEvent.change(input(), { target: { value: "1" } });
    fireEvent.change(input(), { target: { value: "" } });
    fireEvent.change(input(), { target: { value: "2" } });
    fireEvent.change(input(), { target: { value: "23" } });

    expect(input().value).toBe("23");
    expect(onCommit).toHaveBeenLastCalledWith(23);
  });

  it("commits every keystroke so the canvas tracks the field live", () => {
    const onCommit = vi.fn();
    render(<Host onCommit={onCommit} />);

    fireEvent.change(input(), { target: { value: "2" } });
    fireEvent.change(input(), { target: { value: "23" } });

    expect(onCommit.mock.calls).toEqual([[2], [23]]);
  });

  it("restores the value on blur, so the field is never left empty", () => {
    render(<Host />);

    fireEvent.change(input(), { target: { value: "" } });
    fireEvent.blur(input());

    expect(input().value).toBe("13");
  });

  it("keeps the stored value when empty cannot be committed", () => {
    const onCommit = vi.fn();
    render(<Host commitEmpty={false} onCommit={onCommit} />);

    fireEvent.change(input(), { target: { value: "20" } });
    fireEvent.change(input(), { target: { value: "" } });

    expect(input().value).toBe("");
    expect(onCommit.mock.calls).toEqual([[20]]);

    fireEvent.blur(input());
    expect(input().value).toBe("20");
  });

  it("still calls the caller's own blur handler", () => {
    const onBlur = vi.fn();
    render(
      <NumberInput
        aria-label="Size"
        data-testid="size"
        value={13}
        onValueChange={vi.fn()}
        onBlur={onBlur}
      />
    );

    fireEvent.blur(input());

    expect(onBlur).toHaveBeenCalled();
  });
});
