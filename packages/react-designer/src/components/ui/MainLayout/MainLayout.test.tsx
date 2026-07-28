import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import type { ReactNode } from "react";
import { MainLayout } from "./MainLayout";
import { renderToasterAtom } from "@/components/Providers/store";

describe("MainLayout", () => {
  let store: ReturnType<typeof createStore>;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );

  const loadingOverlay = () => document.querySelector(".courier-editor-loading");

  beforeEach(() => {
    store = createStore();
    // The toaster renders a portal that is irrelevant here.
    store.set(renderToasterAtom, false);
  });

  it("renders no loading overlay when not loading", () => {
    render(<MainLayout>content</MainLayout>, { wrapper });

    expect(loadingOverlay()).toBeNull();
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("keeps children mounted underneath the overlay", () => {
    // The overlay covers the canvas rather than replacing it — hosts relying on
    // `isLoading` to defer mount side effects would be misled.
    render(<MainLayout isLoading>content</MainLayout>, { wrapper });

    expect(loadingOverlay()).not.toBeNull();
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("starts the overlay below the toolbar when a header is rendered", () => {
    // Otherwise the opaque overlay swallows the channel tabs, Publish button
    // and brand selector for as long as the gate is held.
    render(
      <MainLayout isLoading Header={<button>Publish</button>}>
        content
      </MainLayout>,
      { wrapper }
    );

    expect(loadingOverlay()?.className).toContain(
      "courier-editor-loading-below-header"
    );
    expect(screen.getByText("Publish")).toBeInTheDocument();
  });

  it("covers the full area when there is no toolbar to preserve", () => {
    render(<MainLayout isLoading>content</MainLayout>, { wrapper });

    expect(loadingOverlay()?.className).not.toContain(
      "courier-editor-loading-below-header"
    );
  });
});
