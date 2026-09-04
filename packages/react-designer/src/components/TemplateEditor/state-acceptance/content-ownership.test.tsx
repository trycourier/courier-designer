/**
 * C-20386 acceptance — criteria 1 and 2.
 *
 * 1. What I typed last wins. No re-sync from a prop, an API response or a
 *    sibling channel ever replaces text I just entered.
 * 2. Switching channels, then back, shows exactly what I left — no loss of the
 *    last keystroke, no reverted paste.
 *
 * See `harness.tsx` for why these mount a real TipTap editor.
 */
import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clearTestEditors } from "@/lib/testHelpers";
import { templateEditorContentAtom } from "../store";
import {
  blurEditor,
  emailContent,
  EmailHarness,
  inboxContent,
  InboxHarness,
  makeStore,
  mountChannel,
  storeContentText,
  typeAtEnd,
  waitForEditor,
  type TestStore,
} from "./harness";

// tippy.js positions against a real layout engine, which jsdom does not have.
// Not what these tests are about, so it is stubbed at the component boundary.
vi.mock("@/components/ui/TextMenu/BubbleTextMenu", () => ({
  BubbleTextMenu: () => null,
}));

describe("C-20386 criterion 1 — what I typed last wins", () => {
  let store: TestStore;

  beforeEach(() => {
    store = makeStore(inboxContent("Welcome", "Original body"));
  });

  afterEach(() => {
    clearTestEditors();
    vi.clearAllMocks();
  });

  /**
   * WHY IT FAILS TODAY: `TemplateEditor.tsx:478` writes the API response into
   * `templateEditorContentAtom`. Every channel's restoration effect watches that
   * atom and calls `editor.commands.setContent(...)` — guarded only by
   * `editor.isFocused`. A response that lands after the author has typed and
   * then clicked away therefore overwrites their edit. Focus is standing in for
   * "is this edit mine", and it is the wrong question.
   */
  it("keeps typed text when a late API response re-syncs the pre-edit document", async () => {
    mountChannel(store, <InboxHarness />);
    const editor = await waitForEditor("inbox", "Original body");

    await typeAtEnd(editor, " EDITED-BY-AUTHOR");
    expect(editor.getText()).toContain("EDITED-BY-AUTHOR");

    // The author clicks into a sidebar field; the canvas loses focus.
    await blurEditor(editor);

    // The in-flight GET, issued before the edit, now resolves. This is exactly
    // what `TemplateEditor.tsx:478` does on an API response.
    await act(async () => {
      store.set(templateEditorContentAtom, inboxContent("Welcome", "Original body"));
    });

    // Give the restoration effect's `setTimeout(..., 1)` room to run.
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(editor.getText()).toContain("EDITED-BY-AUTHOR");
  });

  /**
   * WHY IT FAILS TODAY: same mechanism, but this is the version an author
   * actually reports — they never left the canvas. The blur comes from the
   * editor being re-created, not from a click.
   */
  it("keeps typed text when the store is re-seeded while the author is still typing", async () => {
    mountChannel(store, <InboxHarness />);
    const editor = await waitForEditor("inbox", "Original body");

    await typeAtEnd(editor, " FIRST");
    await act(async () => {
      store.set(templateEditorContentAtom, inboxContent("Welcome", "Original body"));
    });
    await typeAtEnd(editor, " SECOND");

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Both edits are the author's. Neither may be lost.
    expect(editor.getText()).toContain("FIRST");
    expect(editor.getText()).toContain("SECOND");
  });
});

describe("C-20386 criterion 2 — channel switch round-trip", () => {
  afterEach(() => {
    clearTestEditors();
    vi.clearAllMocks();
  });

  /**
   * WHY IT FAILS TODAY: Email is the only debounced channel — `onUpdate`
   * buffers into `pendingUpdateRef` and commits after 200 ms
   * (`EmailEditor.tsx:532-554`). A channel switch unmounts the whole layout
   * (`TemplateEditor.tsx:585-682`) well inside that window, so the last
   * keystrokes never reach the store and are gone on the way back.
   *
   * The flush registry exists to paper over this. Criterion 5 says it should
   * not need to.
   */
  it("Email: keeps the last keystrokes when the channel is switched immediately", async () => {
    const store = makeStore(emailContent("Draft body"));
    const first = mountChannel(store, <EmailHarness />);
    const editor = await waitForEditor("email", "Draft body");

    await typeAtEnd(editor, " LAST-KEYSTROKES");
    expect(editor.getText()).toContain("LAST-KEYSTROKES");

    // The author switches channel straight away — no pause for the debounce.
    first.unmount();
    // Unmount does not clear the registry, so drop it explicitly: otherwise
    // `waitForEditor` below matches the torn-down instance and the assertion
    // passes against an editor that is no longer on screen.
    clearTestEditors();

    // Coming back.
    mountChannel(store, <EmailHarness />);
    const returned = await waitForEditor("email", "Draft body");

    expect(returned.getText()).toContain("LAST-KEYSTROKES");
    expect(storeContentText(store)).toContain("LAST-KEYSTROKES");
  });

  /**
   * The Inbox control case. Inbox commits synchronously, so this one documents
   * behaviour that should already hold — it is here so a regression in the
   * rebuild is caught, not because it is expected to fail now.
   */
  it("Inbox: keeps typed text across a switch away and back", async () => {
    const store = makeStore(inboxContent("Welcome", "Original body"));
    const first = mountChannel(store, <InboxHarness />);
    const editor = await waitForEditor("inbox", "Original body");

    await typeAtEnd(editor, " ROUND-TRIP");
    first.unmount();
    clearTestEditors();

    mountChannel(store, <InboxHarness />);
    const returned = await waitForEditor("inbox", "Original body");

    expect(returned.getText()).toContain("ROUND-TRIP");
  });
});
