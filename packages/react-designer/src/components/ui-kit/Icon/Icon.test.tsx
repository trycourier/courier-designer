import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Icon, Path, TYPOGRAPHY_LETTER_PATH, TYPOGRAPHY_RULES_PATH } from "./Icon";
import { FontSizeIcon } from "./FontSizeIcon";
import { LineHeightIcon } from "./LineHeightIcon";
import { MoreMenuIcon } from "./MoreMenuIcon";

/**
 * `Icon` sets `fill="none"` on the `<svg>`, so every path must end up with
 * either a fill/stroke class or an explicit attribute. A path with neither
 * inherits `none` and the icon renders as blank space — which is exactly how
 * FontSizeIcon shipped before: it passed `colorProp="fill"` together with a
 * `color`, and `Path` only applied its theme class when `color` was absent.
 */
const pathOf = (container: HTMLElement) => container.querySelector("path");

const isVisible = (path: Element | null) =>
  Boolean(
    path &&
      (path.getAttribute("fill") ||
        path.getAttribute("stroke") ||
        /courier-(fill|stroke)-/.test(path.getAttribute("class") ?? ""))
  );

describe("Path", () => {
  it("applies the theme fill class when no color is given", () => {
    const { container } = render(
      <Icon>
        <Path d="M0 0h1v1H0z" colorProp="fill" />
      </Icon>
    );

    expect(pathOf(container)?.getAttribute("class")).toContain("courier-fill-ring");
    expect(isVisible(pathOf(container))).toBe(true);
  });

  it("applies the explicit color as a fill attribute", () => {
    const { container } = render(
      <Icon>
        <Path d="M0 0h1v1H0z" colorProp="fill" color="#ff0000" />
      </Icon>
    );

    expect(pathOf(container)?.getAttribute("fill")).toBe("#ff0000");
  });

  it("applies the explicit color as a stroke attribute", () => {
    const { container } = render(
      <Icon>
        <Path d="M0 0h1v1H0z" colorProp="stroke" color="#00ff00" />
      </Icon>
    );

    expect(pathOf(container)?.getAttribute("stroke")).toBe("#00ff00");
  });

  it("lets an explicitly passed attribute win over the color prop", () => {
    const { container } = render(
      <Icon>
        <Path d="M0 0h1v1H0z" colorProp="fill" color="#ff0000" fill="#0000ff" />
      </Icon>
    );

    expect(pathOf(container)?.getAttribute("fill")).toBe("#0000ff");
  });
});

describe("typography icons", () => {
  it("renders a visible FontSizeIcon by default", () => {
    const { container } = render(<FontSizeIcon />);
    expect(isVisible(pathOf(container))).toBe(true);
  });

  it("renders a visible LineHeightIcon by default", () => {
    const { container } = render(<LineHeightIcon />);
    expect(isVisible(pathOf(container))).toBe(true);
  });

  it("colors FontSizeIcon from the theme so it works in dark mode", () => {
    const { container } = render(<FontSizeIcon />);
    expect(pathOf(container)?.getAttribute("class")).toContain("courier-fill-ring");
  });

  it("still honors an explicit color on FontSizeIcon", () => {
    const { container } = render(<FontSizeIcon color="#123456" />);
    expect(pathOf(container)?.getAttribute("fill")).toBe("#123456");
  });

  it("forwards className so callers can scale the 28-unit glyph", () => {
    const { container } = render(<FontSizeIcon className="courier-w-4 courier-h-4" />);
    expect(container.querySelector("svg")?.getAttribute("class")).toContain("courier-w-4");
  });

  it("draws FontSizeIcon as the shared 'A' letterform, not a numeral", () => {
    const { container } = render(<FontSizeIcon />);
    const paths = [...container.querySelectorAll("path")];

    expect(paths).toHaveLength(1);
    expect(paths[0].getAttribute("d")).toBe(TYPOGRAPHY_LETTER_PATH);
    // Scaled about the centre so the bare letter matches LineHeightIcon's weight
    expect(paths[0].getAttribute("transform")).toContain("scale(1.7)");
  });

  it("draws LineHeightIcon as the same letterform plus the rules", () => {
    const { container } = render(<LineHeightIcon />);
    const ds = [...container.querySelectorAll("path")].map((p) => p.getAttribute("d"));

    expect(ds).toEqual([TYPOGRAPHY_LETTER_PATH, TYPOGRAPHY_RULES_PATH]);
  });

  it("shares one letterform between the two typography icons", () => {
    const { container: fontSize } = render(<FontSizeIcon />);
    const { container: lineHeight } = render(<LineHeightIcon />);

    expect(fontSize.querySelector("path")?.getAttribute("d")).toBe(
      lineHeight.querySelector("path")?.getAttribute("d")
    );
  });
});

describe("MoreMenuIcon", () => {
  /**
   * The Inbox preview's overflow menu has to look like the Inbox's own, which draws it in
   * `black[500]` on light and `white[500]` on dark. Painting a fixed gray instead left the
   * preview's header disagreeing with the thing it is previewing in one mode or the other.
   */
  it("follows the mode the way the Inbox SDK's overflow icon does", () => {
    const { container } = render(<MoreMenuIcon />);
    const svg = container.querySelector("svg");

    // The two colors live in styles.css, keyed off `.dark`, next to the action looks they
    // belong with — Tailwind's arbitrary-color utilities are not picked up by this package's
    // scanner, only the sizes are.
    expect(svg).toHaveClass("courier-inbox-overflow-icon");
    // The fill defers to that color rather than naming one of its own.
    expect(pathOf(container)).toHaveAttribute("fill", "currentColor");
  });

  it("still lets a caller name its own color", () => {
    const { container } = render(<MoreMenuIcon color="#FF0000" />);

    expect(pathOf(container)).toHaveAttribute("fill", "#FF0000");
  });
});
