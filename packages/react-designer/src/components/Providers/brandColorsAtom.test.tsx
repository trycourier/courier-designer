import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useAtomValue, useSetAtom } from "jotai";
import { TemplateProvider } from "./TemplateProvider";
import { brandColorsAtom, brandColorMapAtom, templateDataAtom, type TenantData } from "./store";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <TemplateProvider templateId="test" tenantId="tenant" token="token">
    {children}
  </TemplateProvider>
);

function useBrandColorsWithSetter() {
  const brandColors = useAtomValue(brandColorsAtom);
  const setTemplateData = useSetAtom(templateDataAtom);
  return { brandColors, setTemplateData };
}

const makeTenantData = (colors: {
  primary?: string;
  secondary?: string;
  tertiary?: string;
}): TenantData => ({
  data: {
    tenant: {
      brand: {
        settings: {
          colors,
        },
      },
    },
  },
});

describe("brandColorsAtom", () => {
  it("should return empty array when templateDataAtom is null", () => {
    const { result } = renderHook(() => useAtomValue(brandColorsAtom), { wrapper });
    expect(result.current).toEqual([]);
  });

  it("should extract all three brand colors with key, hex, and ref", () => {
    const { result } = renderHook(() => useBrandColorsWithSetter(), { wrapper });

    act(() => {
      result.current.setTemplateData(
        makeTenantData({
          primary: "#8b5cf6",
          secondary: "#9CA3AF",
          tertiary: "#737373",
        })
      );
    });

    expect(result.current.brandColors).toEqual([
      { key: "primary", hex: "#8b5cf6", ref: "{brand.colors.primary}" },
      { key: "secondary", hex: "#9CA3AF", ref: "{brand.colors.secondary}" },
      { key: "tertiary", hex: "#737373", ref: "{brand.colors.tertiary}" },
    ]);
  });

  it("should filter out empty/undefined colors", () => {
    const { result } = renderHook(() => useBrandColorsWithSetter(), { wrapper });

    act(() => {
      result.current.setTemplateData(
        makeTenantData({
          primary: "#8b5cf6",
          secondary: undefined,
          tertiary: "#737373",
        })
      );
    });

    expect(result.current.brandColors).toEqual([
      { key: "primary", hex: "#8b5cf6", ref: "{brand.colors.primary}" },
      { key: "tertiary", hex: "#737373", ref: "{brand.colors.tertiary}" },
    ]);
  });

  it("should filter out invalid hex values", () => {
    const { result } = renderHook(() => useBrandColorsWithSetter(), { wrapper });

    act(() => {
      result.current.setTemplateData(
        makeTenantData({
          primary: "#8b5cf6",
          secondary: "not-a-color",
          tertiary: "rgb(0,0,0)",
        })
      );
    });

    expect(result.current.brandColors).toEqual([
      { key: "primary", hex: "#8b5cf6", ref: "{brand.colors.primary}" },
    ]);
  });

  it("should accept shorthand hex colors", () => {
    const { result } = renderHook(() => useBrandColorsWithSetter(), { wrapper });

    act(() => {
      result.current.setTemplateData(
        makeTenantData({
          primary: "#fff",
          secondary: "#000",
        })
      );
    });

    expect(result.current.brandColors).toEqual([
      { key: "primary", hex: "#fff", ref: "{brand.colors.primary}" },
      { key: "secondary", hex: "#000", ref: "{brand.colors.secondary}" },
    ]);
  });

  it("should return empty array when brand has no colors", () => {
    const { result } = renderHook(() => useBrandColorsWithSetter(), { wrapper });

    act(() => {
      result.current.setTemplateData({
        data: { tenant: { brand: { settings: {} } } },
      });
    });

    expect(result.current.brandColors).toEqual([]);
  });

  it("should return empty array when tenant has no brand", () => {
    const { result } = renderHook(() => useBrandColorsWithSetter(), { wrapper });

    act(() => {
      result.current.setTemplateData({ data: { tenant: {} } });
    });

    expect(result.current.brandColors).toEqual([]);
  });

  it("should filter out empty string colors", () => {
    const { result } = renderHook(() => useBrandColorsWithSetter(), { wrapper });

    act(() => {
      result.current.setTemplateData(
        makeTenantData({
          primary: "",
          secondary: "#9CA3AF",
          tertiary: "",
        })
      );
    });

    expect(result.current.brandColors).toEqual([
      { key: "secondary", hex: "#9CA3AF", ref: "{brand.colors.secondary}" },
    ]);
  });

  it("should update when templateDataAtom changes", () => {
    const { result } = renderHook(() => useBrandColorsWithSetter(), { wrapper });

    expect(result.current.brandColors).toEqual([]);

    act(() => {
      result.current.setTemplateData(
        makeTenantData({ primary: "#ff0000" })
      );
    });

    expect(result.current.brandColors).toEqual([
      { key: "primary", hex: "#ff0000", ref: "{brand.colors.primary}" },
    ]);

    act(() => {
      result.current.setTemplateData(
        makeTenantData({ primary: "#00ff00", secondary: "#0000ff" })
      );
    });

    expect(result.current.brandColors).toEqual([
      { key: "primary", hex: "#00ff00", ref: "{brand.colors.primary}" },
      { key: "secondary", hex: "#0000ff", ref: "{brand.colors.secondary}" },
    ]);
  });
});

describe("brandColorMapAtom", () => {
  it("should return empty map when no brand colors", () => {
    const { result } = renderHook(() => useAtomValue(brandColorMapAtom), { wrapper });
    expect(result.current).toEqual({});
  });

  it("should map brand refs to hex values", () => {
    const { result } = renderHook(
      () => {
        const map = useAtomValue(brandColorMapAtom);
        const setTemplateData = useSetAtom(templateDataAtom);
        return { map, setTemplateData };
      },
      { wrapper }
    );

    act(() => {
      result.current.setTemplateData(
        makeTenantData({
          primary: "#8b5cf6",
          secondary: "#9CA3AF",
        })
      );
    });

    expect(result.current.map).toEqual({
      "{brand.colors.primary}": "#8b5cf6",
      "{brand.colors.secondary}": "#9CA3AF",
    });
  });
});
