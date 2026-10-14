import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import type { ReactNode } from "react";
import { isTemplateLoadingAtom, templateDataAtom, tenantIdAtom } from "../Providers/store";
import { BrandEditor } from "./BrandEditor";
import { BrandEditorContentAtom, BrandEditorFormAtom } from "./store";

vi.mock("@/hooks/useAutoSave", () => ({
  useAutoSave: () => ({ handleAutoSave: vi.fn() }),
}));
const getTemplate = vi.hoisted(() => vi.fn());
vi.mock("../Providers", () => ({
  useBrandActions: () => ({ getTemplate, saveBrand: vi.fn() }),
}));
vi.mock("./Editor", () => ({ Editor: () => null }));
vi.mock("../ui/MainLayout", () => ({
  MainLayout: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

const FOOTER = "Acme Co · [Unsubscribe]({$.urls.unsubscribe})";

const tenantResponse = (tenantId: string) => ({
  data: {
    tenant: {
      tenantId,
      brand: {
        settings: {
          colors: { primary: "#E4572E" },
          email: {
            header: { barColor: "#E4572E", logo: { image: "https://x/logo.png" } },
            footer: { markdown: FOOTER, social: { twitter: { url: "https://x.com/acme" } } },
          },
        },
      },
    },
  },
});

describe("BrandEditor seeding (C-21459)", () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    getTemplate.mockClear();
    store = createStore();
    store.set(tenantIdAtom, "t1");
    store.set(isTemplateLoadingAtom, true);
  });

  const renderEditor = () =>
    render(
      <Provider store={store}>
        <BrandEditor />
      </Provider>
    );

  it("waits for the brand to load, then seeds the form and footer from it", () => {
    renderEditor();
    expect(store.get(BrandEditorFormAtom)).toBeNull();
    expect(store.get(BrandEditorContentAtom)).toBeNull();

    act(() => {
      store.set(templateDataAtom, tenantResponse("t1") as never);
      store.set(isTemplateLoadingAtom, false);
    });

    expect(store.get(BrandEditorFormAtom)).toMatchObject({
      brandColor: "#E4572E",
      headerStyle: "border",
      logo: "https://x/logo.png",
      xLink: "https://x.com/acme",
    });
    expect(store.get(BrandEditorContentAtom)).toBe(FOOTER);
  });

  it("does not seed from another tenant's data", () => {
    store.set(templateDataAtom, tenantResponse("other") as never);
    store.set(isTemplateLoadingAtom, false);
    renderEditor();

    expect(store.get(BrandEditorFormAtom)).toBeNull();
  });

  it("does not refetch in a loop after a failed load", () => {
    store.set(isTemplateLoadingAtom, false);
    renderEditor();
    expect(getTemplate).toHaveBeenCalledTimes(1);

    // The failed load leaves templateData empty.
    act(() => store.set(isTemplateLoadingAtom, true));
    act(() => store.set(isTemplateLoadingAtom, false));

    expect(getTemplate).toHaveBeenCalledTimes(1);
  });
});
