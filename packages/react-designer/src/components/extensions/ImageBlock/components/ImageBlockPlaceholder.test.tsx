import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ImageBlockComponent } from "./ImageBlockView";

vi.mock("@/lib/utils/brandColors", () => ({
  useBrandColorResolver: () => (color?: string) => color,
}));

const props = {
  alt: "",
  alignment: "center" as const,
  borderWidth: 0,
  borderColor: "#000000",
  isUploading: false,
  width: 100,
};

/**
 * An image whose src is a handlebars expression cannot load in the editor — the
 * value only exists at send. The broken `<img>` collapsed to zero height, so
 * the block was invisible and unclickable: the author could neither see it nor
 * select it to fix or delete it.
 */
describe("an image whose source cannot load here", () => {
  it("keeps a visible block for a handlebars source and shows the source", () => {
    render(<ImageBlockComponent {...props} sourcePath="{{data.hero_image}}" />);

    const placeholder = screen.getByTestId("image-unresolved");
    expect(placeholder).toBeTruthy();
    expect(placeholder.textContent).toContain("{{data.hero_image}}");
    expect(placeholder.className).toContain("courier-h-[160px]");
  });

  it("does the same once a real URL fails to load", () => {
    const { container } = render(
      <ImageBlockComponent {...props} sourcePath="https://example.com/gone.png" />
    );

    // Before the failure it is an ordinary image.
    const img = container.querySelector("img") as HTMLImageElement;
    expect(img.getAttribute("src")).toBe("https://example.com/gone.png");

    fireEvent.error(img);

    const placeholder = screen.getByTestId("image-unresolved");
    expect(placeholder.textContent).toContain("https://example.com/gone.png");
  });

  it("leaves the stored source untouched, so the send still gets it", () => {
    const { container } = render(<ImageBlockComponent {...props} sourcePath="{{data.hero}}" />);
    expect(container.textContent).toContain("{{data.hero}}");
  });

  it("still shows the drop target for a blank source", () => {
    render(<ImageBlockComponent {...props} sourcePath="" />);
    expect(screen.queryByTestId("image-unresolved")).toBeNull();
    expect(screen.getByText("Browse")).toBeTruthy();
  });
});

/**
 * The placeholder drew full width whatever the block's width, so an image set
 * to 50% looked full width on the canvas while the sidebar and the stored value
 * both said 50%.
 */
describe("the placeholder's width", () => {
  it("follows the width the block carries", () => {
    render(<ImageBlockComponent {...props} width={50} sourcePath="{{data.hero}}" />);
    expect(screen.getByTestId("image-unresolved").style.maxWidth).toBe("50%");
  });

  it("is full width when the block is", () => {
    render(<ImageBlockComponent {...props} width={100} sourcePath="{{data.hero}}" />);
    expect(screen.getByTestId("image-unresolved").style.maxWidth).toBe("100%");
  });
});
