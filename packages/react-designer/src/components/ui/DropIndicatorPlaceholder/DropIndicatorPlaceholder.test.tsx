import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import type { ReactNode } from "react";
import { DropIndicatorPlaceholder } from "./DropIndicatorPlaceholder";
import { blockPresetsAtom } from "@/components/TemplateEditor/store";

describe("DropIndicatorPlaceholder", () => {
  let store: ReturnType<typeof createStore>;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );

  beforeEach(() => {
    store = createStore();
    store.set(blockPresetsAtom, []);
  });

  describe("Built-in block types", () => {
    it("should display 'Drop here' when type is null", () => {
      render(<DropIndicatorPlaceholder type={null} />, { wrapper });

      expect(screen.getByText("Drop here")).toBeInTheDocument();
    });

    it("should display 'Drop here' when type is undefined", () => {
      render(<DropIndicatorPlaceholder type={undefined} />, { wrapper });

      expect(screen.getByText("Drop here")).toBeInTheDocument();
    });

    it("should display 'Text' for text type", () => {
      render(<DropIndicatorPlaceholder type="text" />, { wrapper });

      expect(screen.getByText("Text")).toBeInTheDocument();
    });

    it("should display 'Heading' for heading type", () => {
      render(<DropIndicatorPlaceholder type="heading" />, { wrapper });

      expect(screen.getByText("Heading")).toBeInTheDocument();
    });

    it("should display 'Spacer' for spacer type", () => {
      render(<DropIndicatorPlaceholder type="spacer" />, { wrapper });

      expect(screen.getByText("Spacer")).toBeInTheDocument();
    });

    it("should display 'Divider' for divider type", () => {
      render(<DropIndicatorPlaceholder type="divider" />, { wrapper });

      expect(screen.getByText("Divider")).toBeInTheDocument();
    });

    it("should display 'Button' for button type", () => {
      render(<DropIndicatorPlaceholder type="button" />, { wrapper });

      expect(screen.getByText("Button")).toBeInTheDocument();
    });

    it("should display 'Image' for image type", () => {
      render(<DropIndicatorPlaceholder type="image" />, { wrapper });

      expect(screen.getByText("Image")).toBeInTheDocument();
    });

    it("should display 'Custom code' for customCode type", () => {
      render(<DropIndicatorPlaceholder type="customCode" />, { wrapper });

      expect(screen.getByText("Custom code")).toBeInTheDocument();
    });

    it("should display 'Column layout' for column type", () => {
      render(<DropIndicatorPlaceholder type="column" />, { wrapper });

      expect(screen.getByText("Column layout")).toBeInTheDocument();
    });

    it("should display 'Blockquote' for blockquote type", () => {
      render(<DropIndicatorPlaceholder type="blockquote" />, { wrapper });

      expect(screen.getByText("Blockquote")).toBeInTheDocument();
    });

    it("should display 'Drop here' for unknown type", () => {
      render(<DropIndicatorPlaceholder type="unknown" />, { wrapper });

      expect(screen.getByText("Drop here")).toBeInTheDocument();
    });
  });

  describe("Preset references", () => {
    it("should display preset label when preset exists", () => {
      store.set(blockPresetsAtom, [
        {
          type: "button",
          key: "portal",
          label: "Go to Portal",
          attributes: { href: "https://portal.example.com" },
        },
      ]);

      render(<DropIndicatorPlaceholder type="button:portal" />, { wrapper });

      expect(screen.getByText("Go to Portal")).toBeInTheDocument();
    });

    it("should display preset label for different presets", () => {
      store.set(blockPresetsAtom, [
        {
          type: "button",
          key: "survey",
          label: "Take Survey",
          attributes: { href: "https://survey.example.com" },
        },
      ]);

      render(<DropIndicatorPlaceholder type="button:survey" />, { wrapper });

      expect(screen.getByText("Take Survey")).toBeInTheDocument();
    });

    it("should display correct preset when multiple presets exist", () => {
      store.set(blockPresetsAtom, [
        {
          type: "button",
          key: "portal",
          label: "Go to Portal",
          attributes: { href: "https://portal.example.com" },
        },
        {
          type: "button",
          key: "survey",
          label: "Take Survey",
          attributes: { href: "https://survey.example.com" },
        },
        {
          type: "image",
          key: "logo",
          label: "Company Logo",
          attributes: { src: "https://example.com/logo.png" },
        },
      ]);

      const { rerender } = render(<DropIndicatorPlaceholder type="button:portal" />, { wrapper });
      expect(screen.getByText("Go to Portal")).toBeInTheDocument();

      rerender(
        <Provider store={store}>
          <DropIndicatorPlaceholder type="button:survey" />
        </Provider>
      );
      expect(screen.getByText("Take Survey")).toBeInTheDocument();

      rerender(
        <Provider store={store}>
          <DropIndicatorPlaceholder type="image:logo" />
        </Provider>
      );
      expect(screen.getByText("Company Logo")).toBeInTheDocument();
    });

    it("should fallback to block type label when preset not found", () => {
      store.set(blockPresetsAtom, []);

      render(<DropIndicatorPlaceholder type="button:nonexistent" />, { wrapper });

      // Should fallback to "Button" since button is a known block type
      expect(screen.getByText("Button")).toBeInTheDocument();
    });

    it("should fallback to 'Drop here' when preset not found and block type unknown", () => {
      store.set(blockPresetsAtom, []);

      render(<DropIndicatorPlaceholder type="unknown:preset" />, { wrapper });

      expect(screen.getByText("Drop here")).toBeInTheDocument();
    });

    it("should handle preset type string with extra colons", () => {
      // If there are more than 2 parts, parsePresetType returns null
      store.set(blockPresetsAtom, []);

      render(<DropIndicatorPlaceholder type="button:preset:extra" />, { wrapper });

      // This should not find a valid preset (parsePresetType returns null for >2 parts)
      // It will try to use the block type label as fallback
      expect(screen.getByText("Button")).toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("should render with correct container classes", () => {
      const { container } = render(<DropIndicatorPlaceholder type="text" />, { wrapper });

      const outerDiv = container.firstChild as HTMLElement;
      expect(outerDiv).toHaveClass("courier-flex");
      expect(outerDiv).toHaveClass("courier-w-full");
      expect(outerDiv).toHaveClass("courier-pointer-events-none");
    });

    it("should render with dashed border styling", () => {
      const { container } = render(<DropIndicatorPlaceholder type="text" />, { wrapper });

      const innerDiv = (container.firstChild as HTMLElement).firstChild as HTMLElement;
      expect(innerDiv).toHaveClass("courier-border-dashed");
      expect(innerDiv).toHaveClass("courier-border-2");
    });
  });
});
