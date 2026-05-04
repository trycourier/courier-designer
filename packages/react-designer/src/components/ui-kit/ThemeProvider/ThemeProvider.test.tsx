import React from "react";
import { describe, it, expect } from "vitest";
import { render, renderHook, screen } from "@testing-library/react";
import { ThemeProvider, useTheme } from "./ThemeProvider";
import { defaultTheme, lightTheme, darkTheme } from "./ThemeProvider.types";
import type { Theme } from "./ThemeProvider.types";

// Helper: read every CSS custom property declared on `element.style` into a
// plain { '--name': value } map. Uses CSSStyleDeclaration directly because
// `el.style[varName]` and `el.style.getPropertyValue(varName)` are the
// supported APIs in JSDOM.
function readCssVars(element: HTMLElement): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < element.style.length; i++) {
    const name = element.style.item(i);
    if (name.startsWith("--")) {
      out[name] = element.style.getPropertyValue(name).trim();
    }
  }
  return out;
}

// Helper: render a probe child that exposes the value returned by useTheme()
// so we can assert it from the parent test.
function ThemeProbe({ onTheme }: { onTheme: (theme: Theme) => void }) {
  const theme = useTheme();
  onTheme(theme);
  return null;
}

describe("ThemeProvider", () => {
  describe("rendering", () => {
    it("renders children", () => {
      render(
        <ThemeProvider>
          <span>hello</span>
        </ThemeProvider>
      );
      expect(screen.getByText("hello")).toBeInTheDocument();
    });

    it("applies the theme-container class and base layout classes", () => {
      const { container } = render(
        <ThemeProvider>
          <span>x</span>
        </ThemeProvider>
      );
      const root = container.firstElementChild as HTMLElement;
      expect(root).toHaveClass("theme-container");
      expect(root).toHaveClass("courier-flex");
      expect(root).toHaveClass("courier-flex-col");
      expect(root).toHaveClass("courier-relative");
    });

    it("does not add dark classes when colorScheme is unset", () => {
      const { container } = render(
        <ThemeProvider>
          <span>x</span>
        </ThemeProvider>
      );
      const root = container.firstElementChild as HTMLElement;
      expect(root).not.toHaveClass("dark");
      expect(root).not.toHaveClass("courier-dark");
    });

    it("forwards className to the root element", () => {
      const { container } = render(
        <ThemeProvider className="custom-host">
          <span>x</span>
        </ThemeProvider>
      );
      expect(container.firstElementChild).toHaveClass("custom-host");
    });

    it("forwards ref to the root div", () => {
      const ref = React.createRef<HTMLDivElement>();
      render(
        <ThemeProvider ref={ref}>
          <span>x</span>
        </ThemeProvider>
      );
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
      expect(ref.current).toHaveClass("theme-container");
    });
  });

  describe("light colorScheme (default)", () => {
    it("writes lightTheme values as kebab-case CSS custom properties", () => {
      const { container } = render(
        <ThemeProvider>
          <span>x</span>
        </ThemeProvider>
      );
      const root = container.firstElementChild as HTMLElement;
      const vars = readCssVars(root);

      // Spot-check a few representative keys to confirm both naming and value.
      expect(vars["--background"]).toBe(lightTheme.background);
      expect(vars["--muted-foreground"]).toBe(lightTheme.mutedForeground);
      expect(vars["--primary-foreground"]).toBe(lightTheme.primaryForeground);
      expect(vars["--color-scheme"]).toBe("light");
      expect(vars["--radius"]).toBe(lightTheme.radius);

      // Every key in lightTheme should be present as a CSS variable.
      const expectedNames = Object.keys(lightTheme).map(
        (k) => `--${k.replace(/[A-Z]/g, (l) => `-${l.toLowerCase()}`)}`
      );
      for (const name of expectedNames) {
        expect(vars).toHaveProperty(name);
      }
    });

    it("exposes lightTheme via useTheme()", () => {
      let captured: Theme | undefined;
      render(
        <ThemeProvider>
          <ThemeProbe onTheme={(t) => (captured = t)} />
        </ThemeProvider>
      );
      expect(captured).toEqual(lightTheme);
    });
  });

  describe("dark colorScheme", () => {
    it("adds the `dark` and `courier-dark` classes", () => {
      const { container } = render(
        <ThemeProvider colorScheme="dark">
          <span>x</span>
        </ThemeProvider>
      );
      const root = container.firstElementChild as HTMLElement;
      expect(root).toHaveClass("dark");
      expect(root).toHaveClass("courier-dark");
      expect(root).toHaveClass("theme-container");
    });

    it("writes darkTheme values as CSS custom properties", () => {
      const { container } = render(
        <ThemeProvider colorScheme="dark">
          <span>x</span>
        </ThemeProvider>
      );
      const vars = readCssVars(container.firstElementChild as HTMLElement);
      expect(vars["--background"]).toBe(darkTheme.background);
      expect(vars["--foreground"]).toBe(darkTheme.foreground);
      expect(vars["--color-scheme"]).toBe("dark");
      expect(vars["--accent"]).toBe(darkTheme.accent);
    });

    it("exposes darkTheme via useTheme()", () => {
      let captured: Theme | undefined;
      render(
        <ThemeProvider colorScheme="dark">
          <ThemeProbe onTheme={(t) => (captured = t)} />
        </ThemeProvider>
      );
      expect(captured).toEqual(darkTheme);
    });
  });

  describe("theme prop (object)", () => {
    it("merges overrides on top of the light base when colorScheme is light", () => {
      const overrides: Theme = { background: "#ff00ff", radius: "12px" };
      const { container } = render(
        <ThemeProvider theme={overrides}>
          <span>x</span>
        </ThemeProvider>
      );
      const vars = readCssVars(container.firstElementChild as HTMLElement);

      expect(vars["--background"]).toBe("#ff00ff");
      expect(vars["--radius"]).toBe("12px");
      // Untouched keys still come from lightTheme.
      expect(vars["--foreground"]).toBe(lightTheme.foreground);
      expect(vars["--primary-foreground"]).toBe(lightTheme.primaryForeground);
    });

    it("merges overrides on top of the dark base when colorScheme is dark", () => {
      const overrides: Theme = { primary: "#abcdef" };
      const { container } = render(
        <ThemeProvider colorScheme="dark" theme={overrides}>
          <span>x</span>
        </ThemeProvider>
      );
      const vars = readCssVars(container.firstElementChild as HTMLElement);

      expect(vars["--primary"]).toBe("#abcdef");
      expect(vars["--background"]).toBe(darkTheme.background);
      expect(vars["--foreground"]).toBe(darkTheme.foreground);
    });

    it("exposes the merged object via useTheme()", () => {
      const overrides: Theme = { background: "#ff00ff" };
      let captured: Theme | undefined;
      render(
        <ThemeProvider theme={overrides}>
          <ThemeProbe onTheme={(t) => (captured = t)} />
        </ThemeProvider>
      );
      expect(captured).toEqual({ ...lightTheme, ...overrides });
    });
  });

  describe("theme prop (string)", () => {
    it("applies the string as a className on the root", () => {
      const { container } = render(
        <ThemeProvider theme="custom-theme-class">
          <span>x</span>
        </ThemeProvider>
      );
      expect(container.firstElementChild).toHaveClass("custom-theme-class");
    });

    it("does not write any CSS custom properties to the inline style", () => {
      const { container } = render(
        <ThemeProvider theme="custom-theme-class">
          <span>x</span>
        </ThemeProvider>
      );
      const vars = readCssVars(container.firstElementChild as HTMLElement);
      expect(vars).toEqual({});
    });

    it("exposes an empty theme via useTheme()", () => {
      let captured: Theme | undefined;
      render(
        <ThemeProvider theme="custom-theme-class">
          <ThemeProbe onTheme={(t) => (captured = t)} />
        </ThemeProvider>
      );
      expect(captured).toEqual({});
    });
  });
});

describe("useTheme", () => {
  it("returns defaultTheme when used outside a ThemeProvider", () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current).toEqual(defaultTheme);
  });

  it("returns the merged provider value when used inside a ThemeProvider", () => {
    const overrides: Theme = { background: "#123456" };
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider theme={overrides}>{children}</ThemeProvider>,
    });
    expect(result.current).toEqual({ ...lightTheme, ...overrides });
  });
});
