import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { Select, type SelectOption } from "./Select";

const OPTIONS: SelectOption<"a" | "b" | "c">[] = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Bravo" },
  { value: "c", label: "Charlie" },
];

const openMenu = async (trigger: HTMLElement) => {
  await act(async () => {
    fireEvent.keyDown(trigger, { key: "Enter" });
  });
};

describe("Select", () => {
  it("shows the selected option's label in the trigger", () => {
    render(<Select value="b" onValueChange={vi.fn()} options={OPTIONS} />);
    expect(screen.getByRole("button")).toHaveTextContent("Bravo");
  });

  it("shows the placeholder when the value matches no option", () => {
    render(
      <Select value={undefined} onValueChange={vi.fn()} options={OPTIONS} placeholder="Pick one" />
    );
    expect(screen.getByRole("button")).toHaveTextContent("Pick one");
  });

  it("lists every option in order and checks only the current one", async () => {
    render(<Select value="b" onValueChange={vi.fn()} options={OPTIONS} />);
    await openMenu(screen.getByRole("button"));

    const items = screen.getAllByRole("menuitem");
    expect(items.map((item) => item.textContent)).toEqual(["Alpha", "Bravo", "Charlie"]);
    expect(items.map((item) => item.querySelector("svg") !== null)).toEqual([false, true, false]);
  });

  it("reports the chosen option's value", async () => {
    const onValueChange = vi.fn();
    render(<Select value="a" onValueChange={onValueChange} options={OPTIONS} />);
    await openMenu(screen.getByRole("button"));

    await act(async () => {
      fireEvent.click(screen.getByRole("menuitem", { name: "Charlie" }));
    });

    expect(onValueChange).toHaveBeenCalledWith("c");
  });

  it("passes id and aria props to the trigger so a form label can name it", () => {
    render(
      <>
        <label htmlFor="style-field">Button style</label>
        <Select
          id="style-field"
          aria-invalid={false}
          value="a"
          onValueChange={vi.fn()}
          options={OPTIONS}
        />
      </>
    );
    expect(screen.getByRole("button", { name: "Button style" })).toHaveTextContent("Alpha");
  });
});
