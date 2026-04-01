import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Provider, createStore } from "jotai";
import { ColorPicker } from "./ColorPicker";
import { templateDataAtom, type TenantData } from "@/components/Providers/store";
import { DEFAULT_PRESET_COLORS } from "./InputColor";

function renderColorPicker(
  props: Partial<React.ComponentProps<typeof ColorPicker>> = {},
  templateData: TenantData | null = null
) {
  const store = createStore();
  if (templateData) {
    store.set(templateDataAtom, templateData);
  }

  const defaultProps = {
    color: "#000000",
    onChange: vi.fn(),
    presetColors: DEFAULT_PRESET_COLORS,
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
  describe("brand colors", () => {
    it("should not render brand colors section when no brand data", () => {
      renderColorPicker();

      expect(screen.queryByText("Brand colors")).not.toBeInTheDocument();
    });

    it("should render brand colors section when brand data is present", () => {
      renderColorPicker({}, makeTenantData({
        primary: "#8b5cf6",
        secondary: "#9CA3AF",
        tertiary: "#737373",
      }));

      expect(screen.getByText("Brand colors")).toBeInTheDocument();
    });

    it("should render correct number of brand color swatches", () => {
      renderColorPicker({}, makeTenantData({
        primary: "#8b5cf6",
        secondary: "#9CA3AF",
        tertiary: "#737373",
      }));

      const brandSection = screen.getByText("Brand colors").nextElementSibling!;
      const buttons = brandSection.querySelectorAll("button");
      expect(buttons).toHaveLength(3);
    });

    it("should render brand swatches with correct background colors", () => {
      renderColorPicker({}, makeTenantData({
        primary: "#8b5cf6",
        secondary: "#9CA3AF",
      }));

      const brandSection = screen.getByText("Brand colors").nextElementSibling!;
      const buttons = brandSection.querySelectorAll("button");

      expect(buttons[0]).toHaveStyle({ backgroundColor: "#8b5cf6" });
      expect(buttons[1]).toHaveStyle({ backgroundColor: "#9CA3AF" });
    });

    it("should call onChange with brand ref when a brand color is clicked", () => {
      const onChange = vi.fn();
      renderColorPicker({ onChange }, makeTenantData({
        primary: "#8b5cf6",
      }));

      const brandSection = screen.getByText("Brand colors").nextElementSibling!;
      const button = brandSection.querySelector("button")!;
      fireEvent.click(button);

      expect(onChange).toHaveBeenCalledWith("{brand.colors.primary}");
    });

    it("should call onChange with correct brand ref for secondary color", () => {
      const onChange = vi.fn();
      renderColorPicker({ onChange }, makeTenantData({
        primary: "#8b5cf6",
        secondary: "#9CA3AF",
      }));

      const brandSection = screen.getByText("Brand colors").nextElementSibling!;
      const buttons = brandSection.querySelectorAll("button");
      fireEvent.click(buttons[1]);

      expect(onChange).toHaveBeenCalledWith("{brand.colors.secondary}");
    });

    it("should show check mark on active brand color swatch", () => {
      renderColorPicker(
        { color: "{brand.colors.primary}" },
        makeTenantData({ primary: "#8b5cf6", secondary: "#9CA3AF" })
      );

      const brandSection = screen.getByText("Brand colors").nextElementSibling!;
      const buttons = brandSection.querySelectorAll("button");
      const primarySvg = buttons[0].querySelector("svg");
      const secondarySvg = buttons[1].querySelector("svg");

      expect(primarySvg).toBeTruthy();
      expect(secondarySvg).toBeFalsy();
    });

    it("should show brand color label in input when brand color is selected", () => {
      renderColorPicker(
        { color: "{brand.colors.primary}" },
        makeTenantData({ primary: "#8b5cf6" })
      );

      const input = screen.getByPlaceholderText("#000000");
      expect(input).toHaveValue("Primary");
    });

    it("should not render brand section when all colors are invalid", () => {
      renderColorPicker({}, makeTenantData({
        primary: "invalid",
        secondary: "rgb(0,0,0)",
        tertiary: "",
      }));

      expect(screen.queryByText("Brand colors")).not.toBeInTheDocument();
    });
  });

  describe("preset colors", () => {
    it("should render all preset color swatches", () => {
      renderColorPicker();

      const allButtons = document.querySelectorAll("button");
      const presetCount = DEFAULT_PRESET_COLORS.length;
      expect(allButtons.length).toBeGreaterThanOrEqual(presetCount);
    });

    it("should render transparent swatch with backgroundImage", () => {
      renderColorPicker({ presetColors: ["transparent"] });

      const buttons = document.querySelectorAll("button");
      const transparentButton = Array.from(buttons).find(
        (btn) => btn.style.backgroundImage?.includes("data:image/svg+xml")
      );
      expect(transparentButton).toBeTruthy();
      expect(transparentButton?.style.backgroundColor).toBeFalsy();
    });

    it("should call onChange with 'transparent' when transparent swatch is clicked", () => {
      const onChange = vi.fn();
      renderColorPicker({ onChange, presetColors: ["#ff0000", "transparent"] });

      const buttons = document.querySelectorAll("button");
      const transparentButton = Array.from(buttons).find(
        (btn) => btn.style.backgroundImage?.includes("data:image/svg+xml")
      );
      fireEvent.click(transparentButton!);

      expect(onChange).toHaveBeenCalledWith("transparent");
    });
  });

  describe("input blur behavior", () => {
    it("should not call onChange when color is transparent and input blurs without edits", () => {
      const onChange = vi.fn();
      renderColorPicker({ color: "transparent", onChange });

      const input = screen.getByPlaceholderText("#000000");
      fireEvent.focus(input);
      fireEvent.blur(input);

      expect(onChange).not.toHaveBeenCalled();
    });

    it("should not call onChange when defaultLabel is shown and input blurs without edits", () => {
      const onChange = vi.fn();
      renderColorPicker({
        color: "transparent",
        onChange,
        defaultValue: "transparent",
        defaultLabel: "Default",
      });

      const input = screen.getByPlaceholderText("#000000");
      expect(input).toHaveValue("Default");

      fireEvent.focus(input);
      fireEvent.blur(input);

      expect(onChange).not.toHaveBeenCalled();
    });

    it("should commit valid hex on blur", () => {
      const onChange = vi.fn();
      renderColorPicker({ color: "#ff0000", onChange });

      const input = screen.getByPlaceholderText("#000000");
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: "#00ff00" } });
      fireEvent.blur(input);

      expect(onChange).toHaveBeenCalledWith("#00ff00");
    });

    it("should revert to current color on blur with invalid input", () => {
      const onChange = vi.fn();
      renderColorPicker({ color: "#ff0000", onChange });

      const input = screen.getByPlaceholderText("#000000");
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: "not-a-color" } });
      fireEvent.blur(input);

      expect(onChange).not.toHaveBeenCalled();
      expect(input).toHaveValue("#ff0000");
    });

    it("should not call onChange on blur when brand color is selected and label shown", () => {
      const onChange = vi.fn();
      renderColorPicker(
        { color: "{brand.colors.primary}", onChange },
        makeTenantData({ primary: "#8b5cf6" })
      );

      const input = screen.getByPlaceholderText("#000000");
      fireEvent.focus(input);
      fireEvent.blur(input);

      expect(onChange).not.toHaveBeenCalled();
    });
  });
});
