import { fireEvent, render } from "@testing-library/react";
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
  sourcePath: "",
};

const gif = new File(["x"], "order.gif", { type: "image/gif" });
const png = new File(["x"], "order.png", { type: "image/png" });

const drop = (target: Element, ...files: File[]) =>
  fireEvent.drop(target, { dataTransfer: { files, types: ["Files"], items: [] } });

describe("the image block's file types", () => {
  it("offers PNG, JPEG, GIF and WebP by default, and takes a dropped GIF", () => {
    const onFileSelect = vi.fn();
    const { container } = render(<ImageBlockComponent {...props} onFileSelect={onFileSelect} />);

    expect(container.querySelector("input[type=file]")?.getAttribute("accept")).toBe(
      "image/png, image/jpeg, image/gif, image/webp"
    );

    drop(container.querySelector(".courier-empty-image")!, gif);

    expect(onFileSelect).toHaveBeenCalledWith(gif);
  });

  it("offers only the types it is given", () => {
    const { container } = render(
      <ImageBlockComponent
        {...props}
        onFileSelect={vi.fn()}
        allowedTypes={["image/jpeg", "image/png"]}
      />
    );

    expect(container.querySelector("input[type=file]")?.getAttribute("accept")).toBe(
      "image/jpeg, image/png"
    );
  });

  it("reports a dropped file of another type instead of ignoring it", () => {
    const onFileSelect = vi.fn();
    const onFileRejected = vi.fn();
    const { container } = render(
      <ImageBlockComponent
        {...props}
        onFileSelect={onFileSelect}
        onFileRejected={onFileRejected}
        allowedTypes={["image/jpeg", "image/png"]}
      />
    );

    drop(container.querySelector(".courier-empty-image")!, gif);

    expect(onFileSelect).not.toHaveBeenCalled();
    expect(onFileRejected).toHaveBeenCalledTimes(1);
  });

  it("takes an allowed file from a drop that also holds another type", () => {
    const onFileSelect = vi.fn();
    const onFileRejected = vi.fn();
    const { container } = render(
      <ImageBlockComponent
        {...props}
        onFileSelect={onFileSelect}
        onFileRejected={onFileRejected}
        allowedTypes={["image/jpeg", "image/png"]}
      />
    );

    drop(container.querySelector(".courier-empty-image")!, gif, png);

    expect(onFileSelect).toHaveBeenCalledWith(png);
    expect(onFileRejected).not.toHaveBeenCalled();
  });
});
