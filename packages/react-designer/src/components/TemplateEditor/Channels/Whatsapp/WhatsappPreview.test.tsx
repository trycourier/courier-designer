import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import React from "react";
import type { ElementalNode } from "@/types/elemental.types";
import { WhatsappPreview } from "./WhatsappPreview";

const received: Array<Record<string, unknown>> = [];

vi.mock("./WhatsappEditor", () => ({
  WhatsappEditor: (props: Record<string, unknown>) => {
    received.push(props);
    return <div data-testid="whatsapp-editor" />;
  },
}));

const lastProps = () => received[received.length - 1];

/** Text of the editor document's blocks, in order. */
const blockTexts = (doc: unknown): string[] =>
  ((doc as { content?: Array<{ content?: Array<{ text?: string }> }> }).content ?? []).map(
    (block) => (block.content ?? []).map((inline) => inline.text ?? "").join("")
  );

describe("WhatsappPreview", () => {
  it("draws the message read-only: the title as the first line, the body after it, buttons under the bubble", () => {
    const elements: ElementalNode[] = [
      { type: "meta", title: "Order 42 update" },
      { type: "text", content: "Hi Ada, order 42 shipped." },
      { type: "action", content: "Track", href: "https://x.com/orders/42" },
    ];

    render(<WhatsappPreview elements={elements} />);

    const props = lastProps();
    expect(props.readOnly).toBe(true);
    expect(props.editable).toBe(false);
    expect(props.header).toEqual({ type: "text", content: "Order 42 update" });
    expect(props.actions).toEqual([
      { type: "action", content: "Track", href: "https://x.com/orders/42" },
    ]);
    expect(blockTexts(props.content)).toEqual(["Order 42 update", "Hi Ada, order 42 shipped."]);
  });

  it("draws an image header in the bubble", () => {
    render(
      <WhatsappPreview
        elements={[
          { type: "meta", image: "https://x.com/p.png" },
          { type: "text", content: "Hi" },
        ]}
      />
    );

    expect(lastProps().header).toEqual({ type: "image", src: "https://x.com/p.png" });
  });

  it("takes the host's colour scheme, as the editor does", () => {
    const { container } = render(
      <WhatsappPreview elements={[{ type: "text", content: "Hi" }]} colorScheme="dark" />
    );

    expect(container.querySelector(".theme-container")).toHaveClass("dark");
  });
});
