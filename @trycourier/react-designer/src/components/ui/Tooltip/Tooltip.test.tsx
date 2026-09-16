import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Tooltip, TOOLTIP_SHOW_DELAY_MS } from "./index";

const tippyProps = vi.hoisted(() => ({ current: [] as Record<string, unknown>[] }));

vi.mock("@tippyjs/react", () => ({
  default: (props: Record<string, unknown>) => {
    tippyProps.current.push(props);
    return null;
  },
}));

const lastTippyProps = () => tippyProps.current[tippyProps.current.length - 1];

describe("Tooltip", () => {
  beforeEach(() => {
    tippyProps.current = [];
  });

  it("should render its children", () => {
    render(
      <Tooltip title="Text color">
        <button>Color</button>
      </Tooltip>
    );

    expect(screen.getByRole("button", { name: "Color" })).toBeInTheDocument();
  });

  it("should apply the shared show delay by default", () => {
    render(
      <Tooltip title="Text color">
        <button>Color</button>
      </Tooltip>
    );

    expect(TOOLTIP_SHOW_DELAY_MS).toBe(100);
    expect(lastTippyProps().delay).toEqual([TOOLTIP_SHOW_DELAY_MS, 0]);
  });

  it("should keep the shared show delay when other tippy options are provided", () => {
    render(
      <Tooltip title="Text color" tippyOptions={{ maxWidth: 260, placement: "top" }}>
        <button>Color</button>
      </Tooltip>
    );

    expect(lastTippyProps().delay).toEqual([TOOLTIP_SHOW_DELAY_MS, 0]);
    expect(lastTippyProps().placement).toBe("top");
  });

  it("should let a call site override the show delay explicitly", () => {
    render(
      <Tooltip title="Text color" tippyOptions={{ delay: 900 }}>
        <button>Color</button>
      </Tooltip>
    );

    expect(lastTippyProps().delay).toBe(900);
  });

  it("should not render tippy when disabled", () => {
    render(
      <Tooltip title="Text color" enabled={false}>
        <button>Color</button>
      </Tooltip>
    );

    expect(screen.getByRole("button", { name: "Color" })).toBeInTheDocument();
    expect(tippyProps.current).toHaveLength(0);
  });
});
