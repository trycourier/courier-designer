import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import type { ReactNode } from "react";
import { emailFormattingEnabledAtom } from "./store";
import {
  EmailBaseTypographyFields,
  EmailFramePaddingFields,
} from "./Channels/Email/EmailDocumentStyleFields";
import { TypographyFields } from "@/components/extensions/shared/TypographyFields";
import { FontSizeButton } from "@/components/ui/TextMenu/components/FontSizeButton";

/**
 * Every surface that authors one of the new Elemental formatting properties has
 * to disappear together — a control left behind writes a value the renderer
 * silently drops. Covered here in one place so a new surface is an obvious
 * omission rather than something to notice in review.
 */
describe("emailFormattingEnabled gate", () => {
  const documentStyles = {
    emailPaddingVertical: 20,
    emailPaddingHorizontal: 30,
    hasPaddingOverride: false,
    handlePaddingChange: vi.fn(),
    resetPadding: vi.fn(),
    emailFontSize: null,
    handleFontSizeChange: vi.fn(),
    emailLineHeight: null,
    handleLineHeightChange: vi.fn(),
    emailFontSizeValue: 14,
    emailLineHeightValue: 18,
    hasTypographyOverride: false,
    resetTypography: vi.fn(),
    documentStyleVars: {},
  } as unknown as Parameters<typeof EmailFramePaddingFields>[0]["documentStyles"];

  const renderWith = (enabled: boolean, ui: ReactNode) => {
    const store = createStore();
    store.set(emailFormattingEnabledAtom, enabled);
    render(<Provider store={store}>{ui}</Provider>);
  };

  const surfaces: Array<[string, ReactNode, string]> = [
    [
      "document Frame padding",
      <EmailFramePaddingFields documentStyles={documentStyles} />,
      "email-frame-padding-horizontal",
    ],
    [
      "document base typography",
      <EmailBaseTypographyFields documentStyles={documentStyles} />,
      "email-document-font-size",
    ],
    [
      "per-block typography",
      <TypographyFields
        fontSize={null}
        lineHeight={null}
        onFontSizeChange={vi.fn()}
        onLineHeightChange={vi.fn()}
      />,
      "typography-font-size",
    ],
  ];

  for (const [name, ui, testId] of surfaces) {
    it(`renders the ${name} control when enabled`, () => {
      renderWith(true, ui);
      expect(screen.getByTestId(testId)).toBeInTheDocument();
    });

    it(`hides the ${name} control when disabled`, () => {
      renderWith(false, ui);
      expect(screen.queryByTestId(testId)).not.toBeInTheDocument();
    });
  }

  it("renders the inline font-size button when enabled", () => {
    renderWith(true, <FontSizeButton onChange={vi.fn()} />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("hides the inline font-size button when disabled", () => {
    renderWith(false, <FontSizeButton onChange={vi.fn()} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("defaults to enabled, so the gate is opt-out for hosts", () => {
    const store = createStore();
    expect(store.get(emailFormattingEnabledAtom)).toBe(true);
  });
});
