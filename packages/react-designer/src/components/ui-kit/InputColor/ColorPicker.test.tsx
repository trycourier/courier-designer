import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Provider, createStore } from "jotai";
import { ColorPicker } from "./ColorPicker";
import {
  templateDataAtom,
  recentColorsAtom,
  addRecentColorAtom,
  type TenantData,
} from "@/components/Providers/store";

function renderColorPicker(
  props: Partial<React.ComponentProps<typeof ColorPicker>> = {},
  options: { templateData?: TenantData | null; recentColors?: string[] } = {}
) {
  const store = createStore();
  if (options.templateData) {
    store.set(templateDataAtom, options.templateData);
  }
  if (options.recentColors) {
    store.set(recentColorsAtom, options.recentColors);
  }

  const defaultProps = {
    color: "#000000",
    onChange: vi.fn(),
  };

  return {
    ...render(
      <Provider store={store}>
        <ColorPicker {...defaultProps} {...props} />
      </Provider>
    ),
    store,
    onChange: (props.onChange as ReturnType<typeof vi.fn>) ?? defaultProps.onChange,
  };
}

const makeTenantData = (colors: {
  primary?: string;
  secondary?: string;
  tertiary?: string;
}): TenantData => ({
  data: {
    tenant: {
      brand: {
        settings: {
          colors,
        },
      },
    },
  },
});

describe("ColorPicker", () => {
  beforeEach(() => {
    localStorage.removeItem("courier-recent-colors");
  });

  describe("brand colors", () => {
    it("should not render brand colors section when no brand data", () => {
      renderColorPicker();

      expect(screen.queryByText("Brand colors")).not.toBeInTheDocument();
    });

    it("should render brand colors section when brand data is present", () => {
      renderColorPicker({}, {
        templateData: makeTenantData({
          primary: "#8b5cf6",
          secondary: "#9CA3AF",
          tertiary: "#737373",
        }),
      });

      expect(screen.getByText("Brand colors")).toBeInTheDocument();
    });

    it("should render correct number of brand color swatches", () => {
      renderColorPicker({}, {
        templateData: makeTenantData({
          primary: "#8b5cf6",
          secondary: "#9CA3AF",
          tertiary: "#737373",
        }),
      });

      const brandSection = screen.getByText("Brand colors").nextElementSibling!;
      const buttons = brandSection.querySelectorAll("button");
      expect(buttons).toHaveLength(3);
    });

    it("should render brand swatches with correct background colors", () => {
      renderColorPicker({}, {
        templateData: makeTenantData({
          primary: "#8b5cf6",
          secondary: "#9CA3AF",
        }),
      });

      const brandSection = screen.getByText("Brand colors").nextElementSibling!;
      const buttons = brandSection.querySelectorAll("button");

      expect(buttons[0]).toHaveStyle({ backgroundColor: "#8b5cf6" });
      expect(buttons[1]).toHaveStyle({ backgroundColor: "#9CA3AF" });
    });

    it("should call onChange when a brand color is clicked", () => {
      const onChange = vi.fn();
      renderColorPicker({ onChange }, {
        templateData: makeTenantData({
          primary: "#8b5cf6",
        }),
      });

      const brandSection = screen.getByText("Brand colors").nextElementSibling!;
      const button = brandSection.querySelector("button")!;
      fireEvent.click(button);

      expect(onChange).toHaveBeenCalledWith("#8b5cf6");
    });

    it("should not render brand section when all colors are invalid", () => {
      renderColorPicker({}, {
        templateData: makeTenantData({
          primary: "invalid",
          secondary: "rgb(0,0,0)",
          tertiary: "",
        }),
      });

      expect(screen.queryByText("Brand colors")).not.toBeInTheDocument();
    });
  });

  describe("recent colors", () => {
    it("should not render recent colors section when no colors have been selected", () => {
      renderColorPicker();

      expect(screen.queryByText("Recent colors")).not.toBeInTheDocument();
    });

    it("should render recent colors section when recent colors exist", () => {
      renderColorPicker({}, { recentColors: ["#ff0000", "#00ff00"] });

      expect(screen.getByText("Recent colors")).toBeInTheDocument();
    });

    it("should render correct number of recent color swatches", () => {
      renderColorPicker({}, { recentColors: ["#ff0000", "#00ff00", "#0000ff"] });

      const recentSection = screen.getByText("Recent colors").nextElementSibling!;
      const buttons = recentSection.querySelectorAll("button");
      expect(buttons).toHaveLength(3);
    });

    it("should call onChange when a recent color is clicked", () => {
      const onChange = vi.fn();
      renderColorPicker({ onChange }, { recentColors: ["#ff0000"] });

      const recentSection = screen.getByText("Recent colors").nextElementSibling!;
      const button = recentSection.querySelector("button")!;
      fireEvent.click(button);

      expect(onChange).toHaveBeenCalledWith("#ff0000");
    });
  });

  describe("hex input editing", () => {
    it("should not produce NaN when initialized with a 3-char hex", () => {
      renderColorPicker({ color: "#aaa" });

      const input = screen.getByPlaceholderText("#000000") as HTMLInputElement;
      expect(input.value).toBe("#aaa");
      expect(input.value).not.toContain("NaN");
    });

    it("should not overwrite input value while the user is typing", () => {
      const onChange = vi.fn();
      renderColorPicker({ color: "#aaaaee", onChange });

      const input = screen.getByPlaceholderText("#000000") as HTMLInputElement;
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: "#aaa" } });

      expect(input.value).toBe("#aaa");
    });

    it("should normalize input value to canonical color on blur", () => {
      const onChange = vi.fn();
      renderColorPicker({ color: "#ff0000", onChange });

      const input = screen.getByPlaceholderText("#000000") as HTMLInputElement;
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: "#f00" } });
      expect(input.value).toBe("#f00");

      fireEvent.blur(input);
      expect(input.value).toBe("#ff0000");
    });
  });
});

describe("addRecentColorAtom", () => {
  beforeEach(() => {
    localStorage.removeItem("courier-recent-colors");
  });

  it("should add a valid hex color", () => {
    const store = createStore();
    store.set(addRecentColorAtom, "#ff0000");
    expect(store.get(recentColorsAtom)).toEqual(["#ff0000"]);
  });

  it("should prepend new colors (most recent first)", () => {
    const store = createStore();
    store.set(addRecentColorAtom, "#ff0000");
    store.set(addRecentColorAtom, "#00ff00");
    expect(store.get(recentColorsAtom)).toEqual(["#00ff00", "#ff0000"]);
  });

  it("should deduplicate case-insensitively", () => {
    const store = createStore();
    store.set(addRecentColorAtom, "#aaaaaa");
    store.set(addRecentColorAtom, "#AAAAAA");
    expect(store.get(recentColorsAtom)).toEqual(["#AAAAAA"]);
  });

  it("should cap the list at 16 entries", () => {
    const store = createStore();
    for (let i = 0; i < 20; i++) {
      const hex = `#${i.toString(16).padStart(6, "0")}`;
      store.set(addRecentColorAtom, hex);
    }
    expect(store.get(recentColorsAtom)).toHaveLength(16);
  });

  it("should reject transparent", () => {
    const store = createStore();
    store.set(addRecentColorAtom, "transparent");
    expect(store.get(recentColorsAtom)).toEqual([]);
  });

  it("should reject invalid color values", () => {
    const store = createStore();
    store.set(addRecentColorAtom, "red");
    store.set(addRecentColorAtom, "rgb(0,0,0)");
    store.set(addRecentColorAtom, "");
    store.set(addRecentColorAtom, "invalid");
    expect(store.get(recentColorsAtom)).toEqual([]);
  });

  it("should move a duplicate to the front", () => {
    const store = createStore();
    store.set(addRecentColorAtom, "#ff0000");
    store.set(addRecentColorAtom, "#00ff00");
    store.set(addRecentColorAtom, "#0000ff");
    store.set(addRecentColorAtom, "#ff0000");
    expect(store.get(recentColorsAtom)).toEqual(["#ff0000", "#0000ff", "#00ff00"]);
  });
});
