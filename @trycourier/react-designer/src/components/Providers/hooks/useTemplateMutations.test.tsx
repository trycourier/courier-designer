/**
 * Routing precedence on save — the other half of what
 * `api/saveTemplateRouting.test.tsx` covered. The rule is unchanged: an
 * explicit `options.routing` wins, otherwise the routing synced from
 * TemplateEditor's prop is used.
 */
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Provider, createStore, type Store } from "@/lib/store";
import {
  apiUrlAtom,
  routingAtom,
  templateIdAtom,
  tenantIdAtom,
  tokenAtom,
} from "@/components/Providers/store";
import { templateEditorContentAtom } from "@/components/TemplateEditor/store";
import type { ElementalContent } from "@/types";
import { useTemplateMutations } from "./useTemplateMutations";

const content = {
  version: "2022-01-01",
  elements: [{ type: "channel", channel: "email", elements: [] }],
} as ElementalContent;

let fetchMock: ReturnType<typeof vi.fn>;

const mount = (seed: (store: Store) => void) => {
  const store = createStore();
  store.set(apiUrlAtom, "https://api.courier.com/q");
  store.set(tokenAtom, "token");
  store.set(tenantIdAtom, "tenant-1");
  store.set(templateIdAtom, "template-1");
  store.set(templateEditorContentAtom, content);
  seed(store);

  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(Provider, { store }, children);

  return renderHook(() => useTemplateMutations(), { wrapper });
};

const routingSent = () => JSON.parse(fetchMock.mock.calls[0][1].body).variables.input.data.routing;

beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({
      data: { tenant: { notification: { save: { success: true, version: "2" } } } },
    }),
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("saving routing", () => {
  it("uses the routing synced from the editor's prop when none is passed", async () => {
    const synced = { method: "single" as const, channels: ["email"] };
    const { result } = mount((store) => store.set(routingAtom, synced));

    await result.current.save.mutateAsync(undefined);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(routingSent()).toEqual(synced);
  });

  it("prefers routing passed to the call", async () => {
    const synced = { method: "single" as const, channels: ["email"] };
    const explicit = { method: "all" as const, channels: ["email", "sms"] };
    const { result } = mount((store) => store.set(routingAtom, synced));

    await result.current.save.mutateAsync({ routing: explicit });

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(routingSent()).toEqual(explicit);
  });

  it("saves the content passed to the call over the editor's", async () => {
    const override = {
      version: "2022-01-01",
      elements: [{ type: "channel", channel: "sms", elements: [] }],
    } as ElementalContent;
    const { result } = mount(() => {});

    await result.current.save.mutateAsync({ content: override });

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body).variables.input.data.content;
    expect(sent.elements[0].channel).toBe("sms");
  });

  it("does not call the API when there is nothing to save", async () => {
    const { result } = mount((store) => store.set(templateEditorContentAtom, null));

    await result.current.save.mutateAsync(undefined);

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
