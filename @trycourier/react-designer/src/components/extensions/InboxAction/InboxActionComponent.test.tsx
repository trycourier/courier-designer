import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { InboxActionComponent } from "./InboxActionComponent";

/**
 * The Inbox lays its actions out in a left-aligned flex row and offers no way to move them, so
 * the canvas must not offer a position the Inbox cannot reproduce. An action carried `align`
 * from the Elemental it was built from and turned it into auto-margins, which is how a lone
 * action ended up centered in the preview while the real Inbox would have drawn it hard left.
 */
describe("InboxActionComponent alignment", () => {
  const CENTERING = ["courier-mx-auto", "courier-ml-auto"];

  it.each(["left", "center", "right"] as const)("stays left when the node says %s", (align) => {
    const { container } = render(
      <InboxActionComponent actionStyle="button" align={align}>
        Track package
      </InboxActionComponent>
    );

    expect(container.querySelector(".courier-inbox-actions")).toBeInTheDocument();
    for (const cls of [...CENTERING, "courier-mr-auto"]) {
      expect(container.querySelector(`.${cls}`)).toBeNull();
    }
  });

  it("stays left in preview mode too, where the link wrapper also carried it", () => {
    const { container } = render(
      <InboxActionComponent
        actionStyle="button"
        align="center"
        link="https://example.com"
        isPreviewMode
      >
        Track package
      </InboxActionComponent>
    );

    expect(container.querySelector("a.button-link-wrapper")).toBeInTheDocument();
    for (const cls of CENTERING) {
      expect(container.querySelector(`.${cls}`)).toBeNull();
    }
  });
});
