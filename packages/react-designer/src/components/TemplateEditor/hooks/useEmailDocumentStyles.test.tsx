import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { useEmailDocumentStyles } from "./useEmailDocumentStyles";
import {
  templateEditorContentAtom,
  emailPaddingAtom,
  emailFontSizeAtom,
  emailLineHeightAtom,
  pendingAutoSaveAtom,
  EMAIL_DEFAULT_PADDING_HORIZONTAL,
  EMAIL_DEFAULT_PADDING_VERTICAL,
} from "../store";
import type { ElementalChannelNode, ElementalContent } from "@/types/elemental.types";
import type { ReactNode } from "react";

function makeEmailContent(overrides: Record<string, string> = {}): ElementalContent {
  return {
    version: "2022-01-01",
    elements: [
      {
        type: "channel",
        channel: "email",
        ...overrides,
        elements: [{ type: "text", content: "hello" }],
      },
    ],
  };
}

const emailChannelOf = (content: ElementalContent | null | undefined) =>
  content?.elements?.find(
    (el): el is ElementalChannelNode => el.type === "channel" && "channel" in el
  );

describe("useEmailDocumentStyles", () => {
  let store: ReturnType<typeof createStore>;
  let wrapper: ({ children }: { children: ReactNode }) => ReactNode;

  beforeEach(() => {
    store = createStore();
    wrapper = ({ children }: { children: ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
  });

  describe("initial sync from content", () => {
    it("reads padding, font size and line height off the email channel node", () => {
      store.set(
        templateEditorContentAtom,
        makeEmailContent({ padding: "12px 40px", font_size: "18px", line_height: "27px" })
      );

      const { result } = renderHook(() => useEmailDocumentStyles(), { wrapper });

      expect(result.current.emailPaddingVertical).toBe(12);
      expect(result.current.emailPaddingHorizontal).toBe(40);
      expect(result.current.emailFontSize).toBe(18);
      expect(result.current.emailLineHeight).toBe(27);
      expect(result.current.hasPaddingOverride).toBe(true);
    });

    it("falls back to the renderer's default inset when padding is unset", () => {
      store.set(templateEditorContentAtom, makeEmailContent());

      const { result } = renderHook(() => useEmailDocumentStyles(), { wrapper });

      expect(result.current.emailPaddingVertical).toBe(EMAIL_DEFAULT_PADDING_VERTICAL);
      expect(result.current.emailPaddingHorizontal).toBe(EMAIL_DEFAULT_PADDING_HORIZONTAL);
      expect(result.current.hasPaddingOverride).toBe(false);
      expect(result.current.emailFontSize).toBeNull();
      expect(result.current.emailLineHeight).toBeNull();
    });

    it("does NOT write defaults back into the content", () => {
      store.set(templateEditorContentAtom, makeEmailContent());

      renderHook(() => useEmailDocumentStyles(), { wrapper });

      const channel = emailChannelOf(store.get(templateEditorContentAtom));
      expect(channel).not.toHaveProperty("padding");
      expect(channel).not.toHaveProperty("font_size");
      expect(channel).not.toHaveProperty("line_height");
      expect(store.get(pendingAutoSaveAtom)).toBeNull();
    });

    it("resolves a unitless base line height against the base font size", () => {
      store.set(
        templateEditorContentAtom,
        makeEmailContent({ font_size: "20px", line_height: "1.5" })
      );

      const { result } = renderHook(() => useEmailDocumentStyles(), { wrapper });

      expect(result.current.emailLineHeight).toBe(30);
    });

    it("resolves a unitless base line height against the text preset when unsized", () => {
      store.set(templateEditorContentAtom, makeEmailContent({ line_height: "2" }));

      const { result } = renderHook(() => useEmailDocumentStyles(), { wrapper });

      // plain-text preset is 14px
      expect(result.current.emailLineHeight).toBe(28);
    });

    it("re-syncs when content is replaced externally", () => {
      store.set(templateEditorContentAtom, makeEmailContent({ padding: "0px 30px" }));

      const { result, rerender } = renderHook(() => useEmailDocumentStyles(), { wrapper });
      expect(result.current.emailPaddingHorizontal).toBe(30);

      act(() => {
        store.set(templateEditorContentAtom, makeEmailContent({ padding: "0px 0px" }));
      });
      rerender();

      expect(result.current.emailPaddingHorizontal).toBe(0);
    });
  });

  describe("handlePaddingChange", () => {
    it("writes the vertical/horizontal shorthand and keeps the untouched side", () => {
      store.set(templateEditorContentAtom, makeEmailContent({ padding: "8px 30px" }));

      const { result } = renderHook(() => useEmailDocumentStyles(), { wrapper });

      act(() => {
        result.current.handlePaddingChange({ horizontal: 0 });
      });

      expect(store.get(emailPaddingAtom)).toBe("8px 0px");
      expect(emailChannelOf(store.get(templateEditorContentAtom))?.padding).toBe("8px 0px");
    });

    it("seeds from the renderer default when nothing was set yet", () => {
      store.set(templateEditorContentAtom, makeEmailContent());

      const { result } = renderHook(() => useEmailDocumentStyles(), { wrapper });

      act(() => {
        result.current.handlePaddingChange({ vertical: 24 });
      });

      // horizontal keeps the default 30 it was showing
      expect(emailChannelOf(store.get(templateEditorContentAtom))?.padding).toBe("24px 30px");
    });

    it("supports removing the gutter entirely", () => {
      store.set(templateEditorContentAtom, makeEmailContent({ padding: "0px 30px" }));

      const { result } = renderHook(() => useEmailDocumentStyles(), { wrapper });

      act(() => {
        result.current.handlePaddingChange({ vertical: 0, horizontal: 0 });
      });

      expect(emailChannelOf(store.get(templateEditorContentAtom))?.padding).toBe("0px 0px");
    });

    it("queues an autosave", () => {
      store.set(templateEditorContentAtom, makeEmailContent());

      const { result } = renderHook(() => useEmailDocumentStyles(), { wrapper });

      act(() => {
        result.current.handlePaddingChange({ horizontal: 10 });
      });

      expect(store.get(pendingAutoSaveAtom)).not.toBeNull();
    });
  });

  describe("resetPadding", () => {
    it("removes the property so the renderer default applies again", () => {
      store.set(templateEditorContentAtom, makeEmailContent({ padding: "40px 40px" }));

      const { result } = renderHook(() => useEmailDocumentStyles(), { wrapper });
      expect(result.current.hasPaddingOverride).toBe(true);

      act(() => {
        result.current.resetPadding();
      });

      expect(store.get(emailPaddingAtom)).toBeNull();
      expect(emailChannelOf(store.get(templateEditorContentAtom))).not.toHaveProperty("padding");
      expect(result.current.emailPaddingHorizontal).toBe(EMAIL_DEFAULT_PADDING_HORIZONTAL);
      expect(result.current.hasPaddingOverride).toBe(false);
    });
  });

  describe("handleFontSizeChange / handleLineHeightChange", () => {
    it("writes px values to the channel node", () => {
      store.set(templateEditorContentAtom, makeEmailContent());

      const { result } = renderHook(() => useEmailDocumentStyles(), { wrapper });

      act(() => {
        result.current.handleFontSizeChange(18);
      });
      act(() => {
        result.current.handleLineHeightChange(26);
      });

      const channel = emailChannelOf(store.get(templateEditorContentAtom));
      expect(channel?.font_size).toBe("18px");
      expect(channel?.line_height).toBe("26px");
      expect(store.get(emailFontSizeAtom)).toBe(18);
      expect(store.get(emailLineHeightAtom)).toBe(26);
    });

    it("clearing a value removes the property rather than writing zero", () => {
      store.set(
        templateEditorContentAtom,
        makeEmailContent({ font_size: "18px", line_height: "26px" })
      );

      const { result } = renderHook(() => useEmailDocumentStyles(), { wrapper });

      act(() => {
        result.current.handleFontSizeChange(null);
      });
      act(() => {
        result.current.handleLineHeightChange(0);
      });

      const channel = emailChannelOf(store.get(templateEditorContentAtom));
      expect(channel).not.toHaveProperty("font_size");
      expect(channel).not.toHaveProperty("line_height");
    });
  });

  describe("resetTypography", () => {
    it("removes both base text properties in one go", () => {
      store.set(
        templateEditorContentAtom,
        makeEmailContent({ padding: "8px 30px", font_size: "18px", line_height: "26px" })
      );

      const { result } = renderHook(() => useEmailDocumentStyles(), { wrapper });
      expect(result.current.hasTypographyOverride).toBe(true);

      act(() => {
        result.current.resetTypography();
      });

      const channel = emailChannelOf(store.get(templateEditorContentAtom));
      expect(channel).not.toHaveProperty("font_size");
      expect(channel).not.toHaveProperty("line_height");
      // the frame is a separate override and must survive
      expect(channel?.padding).toBe("8px 30px");
      expect(store.get(emailFontSizeAtom)).toBeNull();
      expect(store.get(emailLineHeightAtom)).toBeNull();
      expect(result.current.hasTypographyOverride).toBe(false);
      expect(store.get(pendingAutoSaveAtom)).not.toBeNull();
    });

    it("flags an override when only one of the two is set", () => {
      store.set(templateEditorContentAtom, makeEmailContent({ line_height: "26px" }));

      const { result } = renderHook(() => useEmailDocumentStyles(), { wrapper });

      expect(result.current.hasTypographyOverride).toBe(true);
    });

    it("reports no override when neither is set", () => {
      store.set(templateEditorContentAtom, makeEmailContent({ padding: "8px 30px" }));

      const { result } = renderHook(() => useEmailDocumentStyles(), { wrapper });

      expect(result.current.hasTypographyOverride).toBe(false);
    });
  });

  describe("documentStyleVars", () => {
    it("is empty when nothing is overridden", () => {
      store.set(templateEditorContentAtom, makeEmailContent());

      const { result } = renderHook(() => useEmailDocumentStyles(), { wrapper });

      expect(result.current.documentStyleVars).toEqual({});
    });

    it("applies the base size to body tiers and action labels, not headings", () => {
      store.set(templateEditorContentAtom, makeEmailContent({ font_size: "20px" }));

      const { result } = renderHook(() => useEmailDocumentStyles(), { wrapper });
      const vars = result.current.documentStyleVars;

      expect(vars["--email-editor-p-font-size"]).toBe("20px");
      expect(vars["--email-editor-blockquote-p-font-size"]).toBe("20px");
      expect(vars["--email-editor-action-font-size"]).toBe("20px");
      expect(vars).not.toHaveProperty("--email-editor-h1-font-size");
      // line height follows from the size, as the renderer scales it
      expect(vars["--email-editor-p-line-height"]).toBe("26px");
    });

    it("applies the base line height to every tier", () => {
      store.set(templateEditorContentAtom, makeEmailContent({ line_height: "32px" }));

      const { result } = renderHook(() => useEmailDocumentStyles(), { wrapper });
      const vars = result.current.documentStyleVars;

      for (const tier of ["p", "h1", "h2", "h3"]) {
        expect(vars[`--email-editor-${tier}-line-height`]).toBe("32px");
        expect(vars[`--email-editor-blockquote-${tier}-line-height`]).toBe("32px");
      }
      expect(vars).not.toHaveProperty("--email-editor-p-font-size");
    });

    it("lets an explicit base line height win over the size-derived one", () => {
      store.set(
        templateEditorContentAtom,
        makeEmailContent({ font_size: "20px", line_height: "40px" })
      );

      const { result } = renderHook(() => useEmailDocumentStyles(), { wrapper });

      expect(result.current.documentStyleVars["--email-editor-p-line-height"]).toBe("40px");
    });
  });

  it("is a no-op on content when there is no email channel", () => {
    store.set(templateEditorContentAtom, {
      version: "2022-01-01",
      elements: [{ type: "channel", channel: "sms", elements: [] }],
    });

    const { result } = renderHook(() => useEmailDocumentStyles(), { wrapper });

    act(() => {
      result.current.handleFontSizeChange(18);
    });

    // The atom still tracks the control, but nothing is written
    expect(store.get(emailFontSizeAtom)).toBe(18);
    expect(emailChannelOf(store.get(templateEditorContentAtom))).not.toHaveProperty("font_size");
  });
});
