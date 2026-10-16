import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { pendingAutoSaveAtom, templateEditorContentAtom } from "@/components/TemplateEditor/store";
import { templateErrorAtom } from "@/components/Providers/store";
import type { ElementalContent, ElementalNode } from "@/types/elemental.types";
import { WhatsappHeaderImage } from "./WhatsappHeaderImage";

const uploadImage = vi.fn();
let onFileSelect: ((file: File) => Promise<void>) | undefined;
let lastProps: Record<string, unknown> = {};

vi.mock("@/components/Providers/useImageUpload", () => ({
  useImageUpload: () => ({ uploadImage }),
}));

vi.mock("@/components/extensions/ImageBlock", () => ({
  ImageBlockComponent: (props: Record<string, unknown>) => {
    lastProps = props;
    onFileSelect = props.onFileSelect as typeof onFileSelect;
    return <div data-testid="image-block" />;
  },
}));

const IMAGE = "https://cdn.example.com/order.jpg";
const file = new File(["x"], "order.jpg", { type: "image/jpeg" });

const whatsapp = (...elements: ElementalNode[]): ElementalContent => ({
  version: "2022-01-01",
  elements: [{ type: "channel", channel: "whatsapp", elements }],
});

describe("WhatsappHeaderImage", () => {
  let store: ReturnType<typeof createStore>;

  const mount = (src: string, editable = true) =>
    render(
      <Provider store={store}>
        <WhatsappHeaderImage src={src} editable={editable} />
      </Provider>
    );

  beforeEach(() => {
    store = createStore();
    uploadImage.mockReset();
    onFileSelect = undefined;
    store.set(pendingAutoSaveAtom, null);
    store.set(templateEditorContentAtom, whatsapp({ type: "meta", image: "" }));
  });

  it("shows the saved image", () => {
    mount(IMAGE);

    expect(lastProps.sourcePath).toBe(IMAGE);
  });

  it("saves an uploaded image as meta.image", async () => {
    uploadImage.mockResolvedValue({ url: IMAGE });
    mount("");

    await act(() => onFileSelect!(file));

    const saved = store.get(pendingAutoSaveAtom) as ElementalContent;
    expect((saved.elements[0] as { elements: ElementalNode[] }).elements[0]).toEqual({
      type: "meta",
      image: IMAGE,
    });
  });

  it("reports a failed upload with a generic message and saves nothing", async () => {
    uploadImage.mockRejectedValue(new Error("network down"));
    mount("");

    await act(() => onFileSelect!(file));

    expect(store.get(pendingAutoSaveAtom)).toBeNull();
    expect(store.get(templateErrorAtom)).toEqual({ message: "The image could not be uploaded." });
  });

  it("offers no upload while read-only", () => {
    mount(IMAGE, false);

    expect(onFileSelect).toBeUndefined();
  });
});
