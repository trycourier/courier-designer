import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Provider, createStore } from "jotai";
import { InputColor } from "./InputColor";
import { recentColorsAtom } from "@/components/Providers/store";

function renderInputColor(
  props: Partial<React.ComponentProps<typeof InputColor>> = {}
) {
  const store = createStore();

  const defaultProps = {
    value: "#ff0000",
    onChange: vi.fn(),
  };

  const merged = { ...defaultProps, ...props };

  return {
    ...render(
      <Provider store={store}>
        <InputColor {...merged} />
      </Provider>
    ),
    store,
    onChange: merged.onChange as ReturnType<typeof vi.fn>,
  };
}

describe("InputColor", () => {
  beforeEach(() => {
    localStorage.removeItem("courier-recent-colors");
  });

  describe("record on close", () => {
    it("should add color to recent when popover closes after a change", async () => {
      let currentValue = "#ff0000";
      const onChange = vi.fn((newValue: string) => {
        currentValue = newValue;
      });

      const store = createStore();
      const { rerender } = render(
        <Provider store={store}>
          <InputColor value={currentValue} onChange={onChange} />
        </Provider>
      );

      const trigger = screen.getByDisplayValue("#ff0000");
      await act(async () => {
        fireEvent.click(trigger);
      });

      currentValue = "#00ff00";
      rerender(
        <Provider store={store}>
          <InputColor value={currentValue} onChange={onChange} />
        </Provider>
      );

      await act(async () => {
        fireEvent.keyDown(document.activeElement || document.body, { key: "Escape" });
      });

      expect(store.get(recentColorsAtom)).toContain("#00ff00");
    });

    it("should not add color to recent when popover closes without a change", async () => {
      const store = createStore();
      render(
        <Provider store={store}>
          <InputColor value="#ff0000" onChange={vi.fn()} />
        </Provider>
      );

      const trigger = screen.getByDisplayValue("#ff0000");
      await act(async () => {
        fireEvent.click(trigger);
      });

      await act(async () => {
        fireEvent.keyDown(document.activeElement || document.body, { key: "Escape" });
      });

      expect(store.get(recentColorsAtom)).toEqual([]);
    });
  });
});
