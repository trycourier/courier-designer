import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { pendingAutoSaveAtom, templateEditorContentAtom } from "@/components/TemplateEditor/store";
import { templateErrorAtom } from "@/components/Providers/store";
import type { ElementalContent, ElementalNode } from "@/types/elemental.types";
import { WhatsappHeaderImage } from "./WhatsappHeaderImage";

const uploadImage = vi.fn();
let onFileSelect: ((file: File) => Promise<void>) | undefined;
let onFileRejected: (() => void) | undefined;
let lastProps: Record<string, unknown> = {};

vi.mock("@/components/Providers/useImageUpload", () => ({
  useImageUpload: () => ({ uploadImage }),
}));

vi.mock("@/components/extensions/ImageBlock", () => ({
  ImageBlockComponent: (props: Record<string, unknown>) => {
    lastProps = props;
    onFileSelect = props.onFileSelect as typeof onFileSelect;
    onFileRejected = props.onFileRejected as typeof onFileRejected;
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

  // Meta takes JPEG or PNG only (C-21862).
  it("offers only JPEG and PNG", () => {
    mount("");

    expect(lastProps.allowedTypes).toEqual(["image/jpeg", "image/png"]);
  });

  it.each(["image/gif", "image/webp", ""])(
    "refuses a chosen file of type %p without uploading it",
    async (type) => {
      mount("");

      await act(() => onFileSelect!(new File(["x"], "order", { type })));

      expect(uploadImage).not.toHaveBeenCalled();
      expect(store.get(pendingAutoSaveAtom)).toBeNull();
      expect(store.get(templateErrorAtom)).toEqual({
        message: "WhatsApp header images must be JPEG or PNG.",
      });
    }
  );

  it("says why a dropped file of another type was refused", () => {
    mount("");

    act(() => onFileRejected!());

    expect(store.get(templateErrorAtom)).toEqual({
      message: "WhatsApp header images must be JPEG or PNG.",
    });
  });

  // The error toast fires when the error changes; the same object again is no change, so a second refusal said nothing.
  it("reports every refusal, not only the first", async () => {
    mount("");
    const reported: unknown[] = [];
    store.sub(templateErrorAtom, () => reported.push(store.get(templateErrorAtom)));

    await act(() => onFileSelect!(new File(["x"], "a.gif", { type: "image/gif" })));
    act(() => onFileRejected!());
    act(() => onFileRejected!());

    expect(reported).toHaveLength(3);
    expect(new Set(reported).size).toBe(3);
  });

  it("offers no upload while read-only", () => {
    mount(IMAGE, false);

    expect(onFileSelect).toBeUndefined();
    expect(onFileRejected).toBeUndefined();
  });
});
