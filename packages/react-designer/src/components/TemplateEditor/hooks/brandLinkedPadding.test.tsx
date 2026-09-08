/**
 * A template's Frame can follow the brand on the HORIZONTAL axis: `padding`
 * holds a literal vertical next to `{brand.email.padding.horizontal}`, which
 * the renderer resolves per token (20px when the brand sets none). The brand
 * padding exists to align the body gutter with the header/footer chrome, so the
 * vertical inset stays the template's own and is always editable.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import type { ReactNode } from "react";
import { resolveEmailDocumentStyles, useEmailDocumentStyles } from "./useEmailDocumentStyles";
import { templateDataAtom } from "@/components/Providers/store";
import {
  templateEditorContentAtom,
  EMAIL_DEFAULT_PADDING_HORIZONTAL,
  EMAIL_DEFAULT_PADDING_VERTICAL,
} from "../store";
import {
  formatPaddingWithBrandHorizontal,
  isBrandLinkedPadding,
  resolveBrandPaddingVH,
  resolvePaddingVH,
} from "@/lib/utils/cssValues";

/** What a linked Frame stores: the template's vertical + the brand's horizontal. */
const LINKED = formatPaddingWithBrandHorizontal(20);
import type { ElementalContent } from "@/types/elemental.types";

const BRAND_VH = { vertical: 24, horizontal: 40 };

function emailContent(padding?: string): ElementalContent {
  return {
    version: "2022-01-01",
    elements: [
      {
        type: "channel",
        channel: "email",
        ...(padding !== undefined && { padding }),
        elements: [{ type: "text", content: "hello" }],
      },
    ],
  };
}

const brandWithPadding = (padding?: string) => ({
  data: {
    tenant: {
      // `brandId` is what marks a brand as actually attached, and so what gates
      // the link affordance — mirroring the brand-linked colour fields.
      brand: { brandId: "bnd_1", settings: { email: { ...(padding && { padding }) } } },
    },
  },
});

const noBrand = { data: { tenant: {} } };

describe("isBrandLinkedPadding", () => {
  it("is about the horizontal token only", () => {
    expect(isBrandLinkedPadding(LINKED)).toBe(true);
    expect(isBrandLinkedPadding("16px {brand.email.padding.horizontal}")).toBe(true);
    // A vertical ref is not something this UI writes, and does not count as linked.
    expect(isBrandLinkedPadding("{brand.email.padding.vertical} 40px")).toBe(false);
  });

  it("rejects plain literals", () => {
    expect(isBrandLinkedPadding("24px 40px")).toBe(false);
    expect(isBrandLinkedPadding(undefined)).toBe(false);
  });
});

describe("formatPaddingWithBrandHorizontal", () => {
  it("keeps the vertical literal and refs only the horizontal", () => {
    expect(formatPaddingWithBrandHorizontal(24)).toBe("24px {brand.email.padding.horizontal}");
  });
});

describe("resolvePaddingVH", () => {
  it("resolves the horizontal ref off the brand, keeping the literal vertical", () => {
    expect(resolvePaddingVH(formatPaddingWithBrandHorizontal(16), BRAND_VH)).toEqual({
      vertical: 16,
      horizontal: 40,
    });
  });

  it("resolves each token independently, so a literal/ref mix still displays", () => {
    expect(resolvePaddingVH("16px {brand.email.padding.horizontal}", BRAND_VH)).toEqual({
      vertical: 16,
      horizontal: 40,
    });
  });

  it("reads plain literals and the 1-value form", () => {
    expect(resolvePaddingVH("12px 40px", BRAND_VH)).toEqual({ vertical: 12, horizontal: 40 });
    expect(resolvePaddingVH("0", BRAND_VH)).toEqual({ vertical: 0, horizontal: 0 });
  });

  it("returns undefined for an unresolvable ref, which the renderer drops", () => {
    expect(resolvePaddingVH("{brand.email.padding.nope} 40px", BRAND_VH)).toBeUndefined();
    expect(resolvePaddingVH("10% 20px", BRAND_VH)).toBeUndefined();
    expect(resolvePaddingVH("", BRAND_VH)).toBeUndefined();
  });
});

describe("resolveBrandPaddingVH", () => {
  it("reads the brand's own inset", () => {
    expect(resolveBrandPaddingVH("24px 40px")).toEqual({
      vertical: 24,
      horizontal: 40,
      isSet: true,
    });
  });

  it("falls back to the renderer's 20px per axis when the brand sets none", () => {
    // `isSet: false` is what keeps a new template from linking to a brand that
    // has no padding of its own.
    expect(resolveBrandPaddingVH(undefined)).toEqual({
      vertical: 20,
      horizontal: 20,
      isSet: false,
    });
    expect(resolveBrandPaddingVH("nonsense")).toEqual({
      vertical: 20,
      horizontal: 20,
      isSet: false,
    });
  });
});

describe("resolveEmailDocumentStyles with a brand", () => {
  it("resolves a linked padding against the brand", () => {
    expect(resolveEmailDocumentStyles({ padding: LINKED }, BRAND_VH)).toMatchObject({
      emailPaddingVertical: 20,
      emailPaddingHorizontal: 40,
    });
  });

  it("falls back to the renderer default when no brand is supplied", () => {
    const resolved = resolveEmailDocumentStyles({ padding: LINKED });

    expect(resolved.emailPaddingVertical).toBe(EMAIL_DEFAULT_PADDING_VERTICAL);
    expect(resolved.emailPaddingHorizontal).toBe(EMAIL_DEFAULT_PADDING_HORIZONTAL);
  });
});

describe("useEmailDocumentStyles — brand-linked frame", () => {
  let store: ReturnType<typeof createStore>;
  let wrapper: ({ children }: { children: ReactNode }) => ReactNode;

  beforeEach(() => {
    store = createStore();
    wrapper = ({ children }: { children: ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
  });

  it("shows the brand's horizontal inset and its own vertical", () => {
    store.set(templateDataAtom, brandWithPadding("24px 40px"));
    store.set(templateEditorContentAtom, emailContent(formatPaddingWithBrandHorizontal(12)));

    const { result } = renderHook(() => useEmailDocumentStyles(), { wrapper });

    // Vertical is the template's own 12, NOT the brand's 24.
    expect(result.current.emailPaddingVertical).toBe(12);
    expect(result.current.emailPaddingHorizontal).toBe(40);
    expect(result.current.isPaddingLinkedToBrand).toBe(true);
  });

  it("keeps the link when the vertical is edited", () => {
    store.set(templateDataAtom, brandWithPadding("24px 40px"));
    store.set(templateEditorContentAtom, emailContent(LINKED));

    const { result } = renderHook(() => useEmailDocumentStyles(), { wrapper });

    act(() => {
      result.current.handlePaddingChange({ vertical: 32 });
    });

    const channel = store
      .get(templateEditorContentAtom)
      ?.elements?.find((el) => el.type === "channel");
    expect((channel as { padding?: string })?.padding).toBe(
      "32px {brand.email.padding.horizontal}"
    );
    expect(result.current.isPaddingLinkedToBrand).toBe(true);
    expect(result.current.emailPaddingHorizontal).toBe(40);
  });

  it("tracks the brand: a linked frame follows a brand padding change", () => {
    store.set(templateDataAtom, brandWithPadding("24px 40px"));
    store.set(templateEditorContentAtom, emailContent(LINKED));

    const { result, rerender } = renderHook(() => useEmailDocumentStyles(), { wrapper });
    expect(result.current.emailPaddingHorizontal).toBe(40);

    act(() => {
      store.set(templateDataAtom, brandWithPadding("24px 64px"));
    });
    rerender();

    expect(result.current.emailPaddingHorizontal).toBe(64);
    expect(result.current.isPaddingLinkedToBrand).toBe(true);
  });

  it("drops the link when the horizontal is written directly", () => {
    store.set(templateDataAtom, brandWithPadding("24px 40px"));
    store.set(templateEditorContentAtom, emailContent(LINKED));

    const { result } = renderHook(() => useEmailDocumentStyles(), { wrapper });

    act(() => {
      result.current.handlePaddingChange({ horizontal: 48 });
    });

    const channel = store
      .get(templateEditorContentAtom)
      ?.elements?.find((el) => el.type === "channel");
    expect((channel as { padding?: string })?.padding).toBe("20px 48px");
    expect(result.current.isPaddingLinkedToBrand).toBe(false);
  });

  it("offers the link only when a brand is attached", () => {
    store.set(templateDataAtom, noBrand);
    store.set(templateEditorContentAtom, emailContent("12px 30px"));

    const { result } = renderHook(() => useEmailDocumentStyles(), { wrapper });
    expect(result.current.canLinkPaddingToBrand).toBe(false);

    act(() => {
      store.set(templateDataAtom, brandWithPadding("24px 40px"));
    });

    expect(result.current.canLinkPaddingToBrand).toBe(true);
  });

  it("links the horizontal to the brand, leaving the vertical alone", () => {
    store.set(templateDataAtom, brandWithPadding("24px 40px"));
    store.set(templateEditorContentAtom, emailContent("12px 30px"));

    const { result } = renderHook(() => useEmailDocumentStyles(), { wrapper });

    act(() => {
      result.current.linkPaddingToBrand();
    });

    const channel = store
      .get(templateEditorContentAtom)
      ?.elements?.find((el) => el.type === "channel");
    expect((channel as { padding?: string })?.padding).toBe(
      "12px {brand.email.padding.horizontal}"
    );
    expect(result.current.isPaddingLinkedToBrand).toBe(true);
    expect(result.current.emailPaddingVertical).toBe(12);
    expect(result.current.emailPaddingHorizontal).toBe(40);
  });

  it("unlinks by freezing the brand's horizontal as this template's own", () => {
    store.set(templateDataAtom, brandWithPadding("24px 40px"));
    store.set(templateEditorContentAtom, emailContent(formatPaddingWithBrandHorizontal(12)));

    const { result } = renderHook(() => useEmailDocumentStyles(), { wrapper });

    act(() => {
      result.current.unlinkPaddingFromBrand();
    });

    const channel = store
      .get(templateEditorContentAtom)
      ?.elements?.find((el) => el.type === "channel");
    // The value the user was looking at stays put; it just stops tracking.
    expect((channel as { padding?: string })?.padding).toBe("12px 40px");
    expect(result.current.isPaddingLinkedToBrand).toBe(false);
    expect(result.current.emailPaddingHorizontal).toBe(40);
  });

  it("leaves an unlinked template alone when the brand changes", () => {
    store.set(templateDataAtom, brandWithPadding("24px 40px"));
    store.set(templateEditorContentAtom, emailContent("12px 30px"));

    const { result, rerender } = renderHook(() => useEmailDocumentStyles(), { wrapper });

    act(() => {
      store.set(templateDataAtom, brandWithPadding("24px 64px"));
    });
    rerender();

    expect(result.current.emailPaddingVertical).toBe(12);
    expect(result.current.emailPaddingHorizontal).toBe(30);
    expect(result.current.isPaddingLinkedToBrand).toBe(false);
  });

  it("shows the renderer's default for an unresolvable ref, matching the render drop", () => {
    store.set(templateDataAtom, brandWithPadding("24px 40px"));
    store.set(templateEditorContentAtom, emailContent("{brand.email.padding.nope} 40px"));

    const { result } = renderHook(() => useEmailDocumentStyles(), { wrapper });

    expect(result.current.emailPaddingVertical).toBe(EMAIL_DEFAULT_PADDING_VERTICAL);
    expect(result.current.emailPaddingHorizontal).toBe(EMAIL_DEFAULT_PADDING_HORIZONTAL);
    expect(result.current.isPaddingLinkedToBrand).toBe(false);
  });
});
