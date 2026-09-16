/**
 * C-20386 acceptance — criterion 8.
 *
 * 8. If the editor cannot render what it was handed, it says so. Content it
 *    fails to parse shows an error — never a blank canvas that looks like an
 *    empty template.
 *
 * Why this matters more than it sounds: a blank canvas and "this template has
 * no content" are the same picture. The author's first move is to start typing
 * over content that is still there, and the next save destroys it.
 *
 * The assertions below are deliberately implementation-agnostic. They do not
 * name a component or a test id, only the two things a person can observe:
 * an editable canvas that is silently empty is not acceptable, and some error
 * affordance must be present.
 */
import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { clearTestEditors, getTestEditorByChannel } from "@/lib/testHelpers";
import type { ElementalContent } from "@/types/elemental.types";
import { InboxHarness, makeStore, mountChannel } from "./harness";

vi.mock("@/components/ui/TextMenu/BubbleTextMenu", () => ({
  BubbleTextMenu: () => null,
}));

/** Anything that reads as "we could not open this", however it ends up worded. */
const errorAffordance = () =>
  screen.queryByRole("alert") ??
  screen.queryByText(/(could ?n[o']t|cannot|unable to|failed to)\s+(open|render|display|load)/i);

describe("C-20386 criterion 8 — an unrenderable template says so", () => {
  afterEach(() => {
    clearTestEditors();
    vi.clearAllMocks();
  });

  /**
   * WHY IT FAILS TODAY: `convertElementalToTiptap`'s `convertNode` switch ends
   * in `default: return []` (`convertElementalToTiptap.ts:1538`). Every node of
   * a type it does not know is dropped without a signal, so a document with
   * real content converts to an empty doc and renders as a blank canvas.
   *
   * `convertElementalToTiptap.test.tsx:1342` currently asserts this silent drop
   * as correct behaviour — that expectation has to change with this criterion.
   */
  it("surfaces an error when every node is of a type the converter drops", async () => {
    const undroppable = {
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "inbox",
          elements: [
            { type: "widget-from-the-future", content: "Real content, unknown shape" },
            { type: "another-unknown", content: "More real content" },
          ],
        },
      ],
    } as unknown as ElementalContent;

    mountChannel(makeStore(undroppable), <InboxHarness />);

    await waitFor(() => expect(getTestEditorByChannel("inbox")).toBeTruthy(), {
      timeout: 5000,
    });

    const editor = getTestEditorByChannel("inbox")!;
    const canvasIsSilentlyEmpty = editor.getText().trim() === "" && errorAffordance() === null;

    expect(
      canvasIsSilentlyEmpty,
      "input had content the converter could not render, but the author is shown an " +
        "empty editable canvas indistinguishable from an empty template"
    ).toBe(false);
  });

  /**
   * WHY IT FAILS TODAY: the converter assumes `content` is a string and calls
   * `node.content.trim()` (`convertElementalToTiptap.ts:636`) behind only a
   * `"content" in node` key check. Called directly on this document it throws
   * `Cannot read properties of null (reading 'trim')` — verified.
   *
   * On the Inbox path it does not even get that far. `getOrCreateInboxElement`
   * reshapes the document into its fixed header/body/actions form first, which
   * absorbs the malformed node into an empty header: the canvas renders
   * "\n\nBody that does exist" — the title is simply gone, with no error and
   * nothing to distinguish it from a template whose title was never set.
   *
   * Both halves are criterion 8 failures, and the second is the worse one: the
   * author saves over a title that was really there. Note also that the package
   * exports an `ErrorBoundary` (`ui-kit/ErrorBoundary`) which is never rendered
   * anywhere in its own tree, so the throwing half has nothing to catch it.
   */
  it("surfaces an error when a malformed node cannot be rendered", async () => {
    const malformed = {
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "inbox",
          elements: [
            { type: "text", content: null, text_style: "h2" },
            { type: "text", content: "Body that does exist" },
          ],
        },
      ],
    } as unknown as ElementalContent;

    // Must not take the host down. Today this throws inside React's render.
    expect(() => mountChannel(makeStore(malformed), <InboxHarness />)).not.toThrow();

    await waitFor(
      () => {
        expect(errorAffordance()).not.toBeNull();
      },
      { timeout: 5000 }
    );
  });
});
