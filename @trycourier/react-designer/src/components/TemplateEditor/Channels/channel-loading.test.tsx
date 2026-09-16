/**
 * The channel bar must not guess.
 *
 * Before this, `useChannels` asked `isTemplateLoadingAtom` whether to wait, and
 * that atom is null until the GET actually starts. In that window the hook saw
 * no content and no load in progress, concluded the template was new, and
 * offered every routed channel — which then collapsed to the real ones a moment
 * later. These tests pin the three states apart.
 */
import { renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { Provider, createStore, type Store } from "@/lib/store";
import {
  apiUrlAtom,
  isTemplateLoadingAtom,
  isTemplatePendingAtom,
  templateErrorAtom,
  templateIdAtom,
  tenantIdAtom,
  tokenAtom,
} from "@/components/Providers/store";
import { templateEditorContentAtom } from "@/components/TemplateEditor/store";
import type { ElementalContent } from "@/types/elemental.types";
import { useChannels } from "./useChannels";

const ROUTED = ["email", "sms", "push"] as const;

/** A provider that has been given somewhere to fetch from. */
const configured = (store: Store) => {
  store.set(apiUrlAtom, "https://api.courier.com/q");
  store.set(tokenAtom, "token");
  store.set(tenantIdAtom, "tenant");
  store.set(templateIdAtom, "template");
};

const emailOnly: ElementalContent = {
  version: "2022-01-01",
  elements: [{ type: "channel", channel: "email", elements: [] }],
} as ElementalContent;

const renderChannels = (seed: (store: Store) => void) => {
  const store = createStore();
  seed(store);
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(Provider, { store }, children);
  const view = renderHook(
    () => useChannels({ routing: { method: "single", channels: [...ROUTED] } }),
    { wrapper }
  );
  return { store, view };
};

const values = (view: ReturnType<typeof renderChannels>["view"]) =>
  view.result.current.enabledChannels.map((c) => c.value);

describe("channel bar while the template loads", () => {
  it("offers nothing before the fetch has started", () => {
    // isTemplateLoadingAtom is still null here: the effect that calls
    // getTemplate has not run yet. This is the frame that used to show all of
    // them.
    const { view } = renderChannels(configured);
    expect(values(view)).toEqual([]);
  });

  it("offers nothing while the fetch is in flight", () => {
    const { view } = renderChannels((store) => {
      configured(store);
      store.set(isTemplateLoadingAtom, true);
    });
    expect(values(view)).toEqual([]);
  });

  it("offers only the channels the loaded template has", () => {
    const { view } = renderChannels((store) => {
      configured(store);
      store.set(templateEditorContentAtom, emailOnly);
      store.set(isTemplateLoadingAtom, false);
    });
    expect(values(view)).toEqual(["email"]);
  });

  it("offers every routed channel once a load settles with no content", () => {
    // A genuinely new template: the fetch finished and there is nothing in it,
    // so every routed channel really is on offer.
    const { view } = renderChannels((store) => {
      configured(store);
      store.set(isTemplateLoadingAtom, false);
    });
    expect(values(view)).toEqual([...ROUTED]);
  });

  it("does not wait when there is no template to fetch", () => {
    // A host driving the editor purely through the `value` prop never triggers
    // a GET, so isTemplateLoadingAtom stays null forever. Waiting on that would
    // hang the editor behind a skeleton that never resolves.
    const { view } = renderChannels(() => {});
    expect(values(view)).toEqual([...ROUTED]);
  });

  it("offers nothing when the load failed", () => {
    // A failed fetch is not evidence that the template is new. Falling through
    // to "offer every routed channel" here is what left all the channels on
    // screen whenever the API rejected the request.
    const { view } = renderChannels((store) => {
      configured(store);
      store.set(templateErrorAtom, { message: "Authentication failed" });
    });
    expect(values(view)).toEqual([]);
  });

  it("still offers every routed channel for a genuinely new template", () => {
    // The distinction that matters: settled, no error, no content.
    const { view } = renderChannels((store) => {
      configured(store);
      store.set(isTemplateLoadingAtom, false);
      store.set(templateErrorAtom, null);
    });
    expect(values(view)).toEqual([...ROUTED]);
  });
});

describe("isTemplatePendingAtom", () => {
  it("is true from mount until the load settles", () => {
    const store = createStore();
    configured(store);
    expect(store.get(isTemplatePendingAtom)).toBe(true);

    store.set(isTemplateLoadingAtom, true);
    expect(store.get(isTemplatePendingAtom)).toBe(true);

    store.set(isTemplateLoadingAtom, false);
    expect(store.get(isTemplatePendingAtom)).toBe(false);
  });

  it("is false when no fetch is possible", () => {
    const store = createStore();
    expect(store.get(isTemplatePendingAtom)).toBe(false);

    // Partially configured is still not fetchable.
    store.set(tenantIdAtom, "tenant");
    store.set(templateIdAtom, "template");
    expect(store.get(isTemplatePendingAtom)).toBe(false);
  });
});
