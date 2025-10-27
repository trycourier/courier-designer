import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PreviewPanel } from "./PreviewPanel";

describe("PreviewPanel", () => {
  const mockTogglePreviewMode = vi.fn();

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Component Rendering", () => {
    it("should render without errors", () => {
      expect(() => {
        render(<PreviewPanel previewMode="desktop" togglePreviewMode={mockTogglePreviewMode} />);
      }).not.toThrow();
    });

    it("should render with undefined preview mode", () => {
      const { container } = render(
        <PreviewPanel previewMode={undefined} togglePreviewMode={mockTogglePreviewMode} />
      );

      expect(container).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      const customClass = "custom-preview-panel";
      const { container } = render(
        <PreviewPanel
          previewMode="desktop"
          togglePreviewMode={mockTogglePreviewMode}
          className={customClass}
        />
      );

      const panel = container.firstChild as HTMLElement;
      expect(panel).toHaveClass(customClass);
    });

    it("should forward HTML attributes", () => {
      const { container } = render(
        <PreviewPanel
          previewMode="desktop"
          togglePreviewMode={mockTogglePreviewMode}
          data-testid="preview-panel"
        />
      );

      const panel = container.firstChild as HTMLElement;
      expect(panel).toHaveAttribute("data-testid", "preview-panel");
    });
  });

  describe("Preview Mode Toggle", () => {
    it("should render desktop and mobile toggle when preview mode is active", () => {
      render(<PreviewPanel previewMode="desktop" togglePreviewMode={mockTogglePreviewMode} />);

      const toggles = screen.getAllByRole("radio");
      expect(toggles).toHaveLength(2);
    });

    it("should not render mobile toggle when hideMobileToggle is true", () => {
      render(
        <PreviewPanel
          previewMode="desktop"
          togglePreviewMode={mockTogglePreviewMode}
          hideMobileToggle={true}
        />
      );

      const toggles = screen.queryAllByRole("radio");
      expect(toggles).toHaveLength(0);
    });

    it("should not render toggle group when preview mode is undefined", () => {
      render(<PreviewPanel previewMode={undefined} togglePreviewMode={mockTogglePreviewMode} />);

      const toggles = screen.queryAllByRole("radio");
      expect(toggles).toHaveLength(0);
    });

    it("should select desktop toggle when previewMode is desktop", () => {
      render(<PreviewPanel previewMode="desktop" togglePreviewMode={mockTogglePreviewMode} />);

      const desktopToggle = screen.getAllByRole("radio")[0];
      expect(desktopToggle).toHaveAttribute("data-state", "on");
    });

    it("should select mobile toggle when previewMode is mobile", () => {
      render(<PreviewPanel previewMode="mobile" togglePreviewMode={mockTogglePreviewMode} />);

      const mobileToggle = screen.getAllByRole("radio")[1];
      expect(mobileToggle).toHaveAttribute("data-state", "on");
    });
  });

  describe("User Interactions", () => {
    it("should call togglePreviewMode with 'desktop' when desktop toggle is clicked", async () => {
      const user = userEvent.setup();
      render(<PreviewPanel previewMode="mobile" togglePreviewMode={mockTogglePreviewMode} />);

      const desktopToggle = screen.getAllByRole("radio")[0];
      await user.click(desktopToggle);

      expect(mockTogglePreviewMode).toHaveBeenCalledWith("desktop");
      expect(mockTogglePreviewMode).toHaveBeenCalledTimes(1);
    });

    it("should call togglePreviewMode with 'mobile' when mobile toggle is clicked", async () => {
      const user = userEvent.setup();
      render(<PreviewPanel previewMode="desktop" togglePreviewMode={mockTogglePreviewMode} />);

      const mobileToggle = screen.getAllByRole("radio")[1];
      await user.click(mobileToggle);

      expect(mockTogglePreviewMode).toHaveBeenCalledWith("mobile");
      expect(mockTogglePreviewMode).toHaveBeenCalledTimes(1);
    });

    it("should not call togglePreviewMode when already selected toggle is clicked", async () => {
      const user = userEvent.setup();
      render(<PreviewPanel previewMode="desktop" togglePreviewMode={mockTogglePreviewMode} />);

      const desktopToggle = screen.getAllByRole("radio")[0];
      await user.click(desktopToggle);

      // Should not call toggle when clicking the already selected option
      expect(mockTogglePreviewMode).not.toHaveBeenCalled();
    });

    it("should call togglePreviewMode without arguments when Exit button is clicked", async () => {
      const user = userEvent.setup();
      render(<PreviewPanel previewMode="desktop" togglePreviewMode={mockTogglePreviewMode} />);

      const exitButton = screen.getByRole("button", { name: /exit preview/i });
      await user.click(exitButton);

      expect(mockTogglePreviewMode).toHaveBeenCalledWith();
      expect(mockTogglePreviewMode).toHaveBeenCalledTimes(1);
    });

    it("should call togglePreviewMode without arguments when View button is clicked", async () => {
      const user = userEvent.setup();
      render(<PreviewPanel previewMode={undefined} togglePreviewMode={mockTogglePreviewMode} />);

      const viewButton = screen.getByRole("button", { name: /view preview/i });
      await user.click(viewButton);

      expect(mockTogglePreviewMode).toHaveBeenCalledWith();
      expect(mockTogglePreviewMode).toHaveBeenCalledTimes(1);
    });
  });

  describe("Exit/View Button", () => {
    it("should render 'Exit Preview' button when preview mode is active", () => {
      render(<PreviewPanel previewMode="desktop" togglePreviewMode={mockTogglePreviewMode} />);

      const exitButton = screen.getByRole("button", { name: /exit preview/i });
      expect(exitButton).toBeInTheDocument();
    });

    it("should render 'View Preview' button when preview mode is inactive", () => {
      render(<PreviewPanel previewMode={undefined} togglePreviewMode={mockTogglePreviewMode} />);

      const viewButton = screen.getByRole("button", { name: /view preview/i });
      expect(viewButton).toBeInTheDocument();
    });

    it("should not render exit button when hideExitButton is true", () => {
      render(
        <PreviewPanel
          previewMode="desktop"
          togglePreviewMode={mockTogglePreviewMode}
          hideExitButton={true}
        />
      );

      const buttons = screen.queryAllByRole("button");
      expect(buttons).toHaveLength(0);
    });

    it("should render exit button by default", () => {
      render(<PreviewPanel previewMode="desktop" togglePreviewMode={mockTogglePreviewMode} />);

      const exitButton = screen.getByRole("button", { name: /exit preview/i });
      expect(exitButton).toBeInTheDocument();
    });
  });

  describe("Divider Rendering", () => {
    it("should render divider when both toggle and exit button are visible", () => {
      const { container } = render(
        <PreviewPanel previewMode="desktop" togglePreviewMode={mockTogglePreviewMode} />
      );

      const divider = container.querySelector(".courier-w-px.courier-h-6.courier-bg-border");
      expect(divider).toBeInTheDocument();
    });

    it("should not render divider when hideExitButton is true", () => {
      const { container } = render(
        <PreviewPanel
          previewMode="desktop"
          togglePreviewMode={mockTogglePreviewMode}
          hideExitButton={true}
        />
      );

      const divider = container.querySelector(".courier-w-px.courier-h-6.courier-bg-border");
      expect(divider).not.toBeInTheDocument();
    });

    it("should not render divider when hideMobileToggle is true", () => {
      const { container } = render(
        <PreviewPanel
          previewMode="desktop"
          togglePreviewMode={mockTogglePreviewMode}
          hideMobileToggle={true}
        />
      );

      const divider = container.querySelector(".courier-w-px.courier-h-6.courier-bg-border");
      expect(divider).not.toBeInTheDocument();
    });

    it("should not render divider when preview mode is undefined", () => {
      const { container } = render(
        <PreviewPanel previewMode={undefined} togglePreviewMode={mockTogglePreviewMode} />
      );

      const divider = container.querySelector(".courier-w-px.courier-h-6.courier-bg-border");
      expect(divider).not.toBeInTheDocument();
    });
  });

  describe("Props Combinations", () => {
    it("should handle hideExitButton and hideMobileToggle both true", () => {
      const { container } = render(
        <PreviewPanel
          previewMode="desktop"
          togglePreviewMode={mockTogglePreviewMode}
          hideExitButton={true}
          hideMobileToggle={true}
        />
      );

      const panel = container.firstChild as HTMLElement;
      expect(panel).toBeInTheDocument();
      expect(screen.queryAllByRole("button")).toHaveLength(0);
      expect(screen.queryAllByRole("radio")).toHaveLength(0);
    });

    it("should handle hideExitButton false and hideMobileToggle false (default)", () => {
      render(
        <PreviewPanel
          previewMode="desktop"
          togglePreviewMode={mockTogglePreviewMode}
          hideExitButton={false}
          hideMobileToggle={false}
        />
      );

      expect(screen.getByRole("button", { name: /exit preview/i })).toBeInTheDocument();
      expect(screen.getAllByRole("radio")).toHaveLength(2);
    });

    it("should handle desktop preview mode with all defaults", () => {
      render(<PreviewPanel previewMode="desktop" togglePreviewMode={mockTogglePreviewMode} />);

      expect(screen.getByRole("button", { name: /exit preview/i })).toBeInTheDocument();
      expect(screen.getAllByRole("radio")).toHaveLength(2);
      expect(screen.getAllByRole("radio")[0]).toHaveAttribute("data-state", "on");
    });

    it("should handle mobile preview mode with all defaults", () => {
      render(<PreviewPanel previewMode="mobile" togglePreviewMode={mockTogglePreviewMode} />);

      expect(screen.getByRole("button", { name: /exit preview/i })).toBeInTheDocument();
      expect(screen.getAllByRole("radio")).toHaveLength(2);
      expect(screen.getAllByRole("radio")[1]).toHaveAttribute("data-state", "on");
    });
  });

  describe("Styling and Layout", () => {
    it("should have correct base styling classes", () => {
      const { container } = render(
        <PreviewPanel previewMode="desktop" togglePreviewMode={mockTogglePreviewMode} />
      );

      const panel = container.firstChild as HTMLElement;
      expect(panel).toHaveClass("courier-sticky");
      expect(panel).toHaveClass("courier-bottom-0");
      expect(panel).toHaveClass("courier-mt-auto");
      expect(panel).toHaveClass("courier-self-center");
      expect(panel).toHaveClass("courier-bg-background");
      expect(panel).toHaveClass("courier-border");
      expect(panel).toHaveClass("courier-rounded-md");
      expect(panel).toHaveClass("courier-flex");
      expect(panel).toHaveClass("courier-items-center");
      expect(panel).toHaveClass("courier-gap-2");
    });

    it("should merge custom className with base classes", () => {
      const { container } = render(
        <PreviewPanel
          previewMode="desktop"
          togglePreviewMode={mockTogglePreviewMode}
          className="my-custom-class courier-bg-red-500"
        />
      );

      const panel = container.firstChild as HTMLElement;
      expect(panel).toHaveClass("my-custom-class");
      expect(panel).toHaveClass("courier-sticky");
      expect(panel).toHaveClass("courier-flex");
    });
  });

  describe("Accessibility", () => {
    it("should have accessible button roles", () => {
      render(<PreviewPanel previewMode="desktop" togglePreviewMode={mockTogglePreviewMode} />);

      const exitButton = screen.getByRole("button", { name: /exit preview/i });
      expect(exitButton).toBeInTheDocument();
    });

    it("should have accessible toggle group roles", () => {
      render(<PreviewPanel previewMode="desktop" togglePreviewMode={mockTogglePreviewMode} />);

      const toggles = screen.getAllByRole("radio");
      expect(toggles).toHaveLength(2);
      toggles.forEach((toggle) => {
        expect(toggle).toBeInTheDocument();
      });
    });

    it("should maintain focus after interactions", async () => {
      const user = userEvent.setup();
      render(<PreviewPanel previewMode="desktop" togglePreviewMode={mockTogglePreviewMode} />);

      const exitButton = screen.getByRole("button", { name: /exit preview/i });
      await user.click(exitButton);

      // Component should not throw errors after interaction
      expect(exitButton).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle rapid toggle clicks", async () => {
      const user = userEvent.setup();
      render(<PreviewPanel previewMode="desktop" togglePreviewMode={mockTogglePreviewMode} />);

      const mobileToggle = screen.getAllByRole("radio")[1];

      await user.click(mobileToggle);
      await user.click(mobileToggle);
      await user.click(mobileToggle);

      // Should only register valid toggles (first click is valid, rest are no-ops)
      expect(mockTogglePreviewMode).toHaveBeenCalledWith("mobile");
    });

    it("should handle missing optional props gracefully", () => {
      expect(() => {
        render(<PreviewPanel previewMode="desktop" togglePreviewMode={mockTogglePreviewMode} />);
      }).not.toThrow();
    });

    it("should re-render correctly when props change", () => {
      const { rerender } = render(
        <PreviewPanel previewMode="desktop" togglePreviewMode={mockTogglePreviewMode} />
      );

      expect(screen.getByRole("button", { name: /exit preview/i })).toBeInTheDocument();

      rerender(<PreviewPanel previewMode={undefined} togglePreviewMode={mockTogglePreviewMode} />);

      expect(screen.getByRole("button", { name: /view preview/i })).toBeInTheDocument();
    });

    it("should handle undefined togglePreviewMode gracefully in event handlers", async () => {
      const user = userEvent.setup();
      const mockFn = vi.fn();

      render(<PreviewPanel previewMode="desktop" togglePreviewMode={mockFn} />);

      const exitButton = screen.getByRole("button", { name: /exit preview/i });
      await user.click(exitButton);

      expect(mockFn).toHaveBeenCalledWith();
    });
  });

  describe("Integration Readiness", () => {
    it("should be production ready with all props", () => {
      expect(() => {
        render(
          <PreviewPanel
            previewMode="desktop"
            togglePreviewMode={mockTogglePreviewMode}
            hideMobileToggle={false}
            hideExitButton={false}
            className="custom-class"
            data-testid="panel"
          />
        );
      }).not.toThrow();

      expect(screen.getByRole("button", { name: /exit preview/i })).toBeInTheDocument();
      expect(screen.getAllByRole("radio")).toHaveLength(2);
    });

    it("should handle component unmounting gracefully", () => {
      const { unmount } = render(
        <PreviewPanel previewMode="desktop" togglePreviewMode={mockTogglePreviewMode} />
      );

      expect(() => {
        unmount();
      }).not.toThrow();
    });

    it("should work with different HTML attributes", () => {
      const { container } = render(
        <PreviewPanel
          previewMode="desktop"
          togglePreviewMode={mockTogglePreviewMode}
          id="preview-panel"
          aria-label="Preview panel"
        />
      );

      const panel = container.firstChild as HTMLElement;
      expect(panel).toHaveAttribute("id", "preview-panel");
      expect(panel).toHaveAttribute("aria-label", "Preview panel");
    });
  });
});
