import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { isTemplateLoadingAtom, templateErrorAtom } from "@/components/Providers/store";
import { brandEditorAtom } from "@/components/TemplateEditor/store";
import { defaultBrandEditorFormValues } from "../BrandEditor.types";
import { BrandEditorContentAtom, BrandEditorFormAtom } from "../store";
import { Editor } from "./Editor";

vi.mock("@/components/Providers", () => ({
  useBrandActions: () => ({ publishBrand: vi.fn() }),
}));
vi.mock("./BrandFooter", () => ({ BrandFooter: () => <div data-testid="footer-editor" /> }));
vi.mock("./SideBar", () => ({ SideBar: () => <div data-testid="sidebar-form" /> }));
vi.mock("./LogoUploader", () => ({ LogoUploader: () => <div data-testid="logo-uploader" /> }));

describe("BrandEditor Editor pending state", () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
    store.set(brandEditorAtom, {} as never);
  });

  const renderEditor = () =>
    render(
      <Provider store={store}>
        <Editor />
      </Provider>
    );

  it("shows loaders and no inputs until the form is seeded", () => {
    store.set(isTemplateLoadingAtom, true);
    const { container } = renderEditor();

    expect(container.querySelectorAll("[aria-busy]")).toHaveLength(3);
    expect(screen.queryByTestId("footer-editor")).toBeNull();
    expect(screen.queryByTestId("sidebar-form")).toBeNull();
    expect(screen.queryByTestId("logo-uploader")).toBeNull();
  });

  it("says the brand couldn't load instead of spinning forever", () => {
    store.set(isTemplateLoadingAtom, false);
    store.set(templateErrorAtom, { message: "boom" });
    renderEditor();

    expect(screen.getAllByText("Couldn't load the brand.")).toHaveLength(3);
  });

  it("mounts the inputs once the form is seeded", () => {
    store.set(isTemplateLoadingAtom, false);
    store.set(BrandEditorFormAtom, defaultBrandEditorFormValues);
    store.set(BrandEditorContentAtom, "");
    const { container } = renderEditor();

    expect(container.querySelectorAll("[aria-busy]")).toHaveLength(0);
    expect(screen.getByTestId("footer-editor")).toBeTruthy();
    expect(screen.getByTestId("sidebar-form")).toBeTruthy();
    expect(screen.getByTestId("logo-uploader")).toBeTruthy();
  });
});
