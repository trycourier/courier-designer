import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { ReactNode } from "react";
import { pendingLinkAtom } from "@/components/ui/TextMenu/store";
import { useMSTeamsSidebarHasDetails } from "./MSTeamsSideBarItemDetails";

const node = (name: string) => ({ type: { name }, marks: [] }) as unknown as ProseMirrorNode;

const hasDetails = (element: ProseMirrorNode | null, store = createStore()) => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  return renderHook(() => useMSTeamsSidebarHasDetails(element), { wrapper }).result.current;
};

describe("useMSTeamsSidebarHasDetails", () => {
  it("keeps the sidebar closed for blocks without a form", () => {
    expect(hasDetails(null)).toBe(false);
    expect(hasDetails(node("paragraph"))).toBe(false);
    expect(hasDetails(node("divider"))).toBe(false);
  });

  it("opens it for blocks with a form", () => {
    expect(hasDetails(node("button"))).toBe(true);
    expect(hasDetails(node("jsonnet"))).toBe(true);
    expect(hasDetails(node("list"))).toBe(true);
  });

  it("opens it on a paragraph while a link is being added", () => {
    const store = createStore();
    store.set(pendingLinkAtom, { link: { from: 0, to: 4 } } as never);

    expect(hasDetails(node("paragraph"), store)).toBe(true);
  });
});
