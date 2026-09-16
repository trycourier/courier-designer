/**
 * C-20386 acceptance — criteria 4 and 6.
 *
 * 4. Selection survives anything that isn't me clicking somewhere else. Not
 *    drags, not form updates, not autosave.
 * 6. Undo/redo is one history over the document I am editing, not
 *    per-editor-instance history that resets when an effect re-syncs.
 *
 * Both use Email: it is the channel with a real `onSelectionUpdate` handler
 * feeding `selectedNodeAtom`, and the one whose editor is remounted by a `key`
 * on ordinary UI changes.
 */
import { act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { clearTestEditors } from "@/lib/testHelpers";
import { selectedNodeAtom } from "../../ui/TextMenu/store";
import { templateEditorContentAtom } from "../store";
import {
  blurEditor,
  emailContent,
  EmailHarness,
  makeStore,
  mountChannel,
  typeAtEnd,
  waitForEditor,
} from "./harness";

vi.mock("@/components/ui/TextMenu/BubbleTextMenu", () => ({
  BubbleTextMenu: () => null,
}));

describe("C-20386 criterion 4 — selection survives everything but a click elsewhere", () => {
  afterEach(() => {
    clearTestEditors();
    vi.clearAllMocks();
  });

  /**
   * WHY IT FAILS TODAY: `selectedNodeAtom` holds a raw ProseMirror `Node`
   * object (`ui/TextMenu/store.ts:16`). The restoration effect's
   * `editor.commands.setContent(...)` replaces the whole document, so every
   * node identity is new and the held reference points at a node that is no
   * longer in the document. Email papers over the worst of it with a
   * module-level `isRestoringContent` flag (`EmailEditor.tsx:243-248`) that
   * makes the selection handler bail — which preserves the stale object rather
   * than the selection.
   *
   * Node ids cannot rescue this either: ids are minted per conversion
   * (`convertElementalToTiptap.ts:647`) and never serialized into Elemental, so
   * they differ on both sides of a re-sync.
   */
  it("keeps the selected node when the document is re-synced underneath it", async () => {
    const store = makeStore(emailContent("Selectable body"));
    mountChannel(store, <EmailHarness />);
    const editor = await waitForEditor("email", "Selectable body");

    // Wait out the mount-time churn before touching anything. Three separate
    // mechanisms fight over selection in the first second after mount:
    //   - `Email.tsx:429` auto-selects the sole node on a `setTimeout(0)`
    //   - `EmailEditor.tsx:430` clears the selection again 100ms after create
    //   - `useEmailFontFamily`/`useEmailBackgroundColors` hold the global
    //     `formUpdating` counter for 600ms while they sync, and the selection
    //     handler bails outright while it is set (`EmailEditor.tsx:574`)
    //
    // 900ms clears all three. That this is necessary at all is criterion 7's
    // complaint in miniature — but here it is only setup, so the precondition
    // fails for a reason the test is actually about.
    await new Promise((resolve) => setTimeout(resolve, 900));

    // Click into the body text. This must be a *text* selection inside the
    // paragraph: the handler walks up from `$anchor.depth` with `while (depth >
    // 0)` (`EmailEditor.tsx:594`), so a node selection at depth 0 never matches
    // and nothing is recorded. It must also be a genuine move, since
    // `onSelectionUpdate` does not fire when the selection is unchanged.
    await act(async () => {
      editor.commands.focus("end", { scrollIntoView: false });
      editor.commands.setTextSelection(2);
    });
    await new Promise((resolve) => setTimeout(resolve, 200));

    const before = store.get(selectedNodeAtom);
    expect(before, "precondition: a node is selected").not.toBeNull();

    // A re-sync arrives carrying *different* text; the author has not clicked
    // anywhere. Re-syncing identical content would not prove anything: the
    // stale node object would still compare equal.
    await blurEditor(editor);
    await act(async () => {
      store.set(templateEditorContentAtom, emailContent("Selectable body EDITED-ELSEWHERE"));
    });
    await new Promise((resolve) => setTimeout(resolve, 300));

    const after = store.get(selectedNodeAtom);
    expect(after, "selection was dropped by a re-sync the author did not cause").not.toBeNull();

    // The selection must still refer to something in the document that is now
    // on screen. Holding the pre-re-sync node means the sidebar is editing a
    // node that no longer exists — the form writes back into a detached object.
    expect(
      after?.textContent,
      "selection still points at the pre-re-sync node, which is no longer in the document"
    ).toContain("EDITED-ELSEWHERE");
    expect(after?.textContent).not.toBe(before?.textContent);
  });
});

describe("C-20386 criterion 6 — one history over the document", () => {
  afterEach(() => {
    clearTestEditors();
    vi.clearAllMocks();
  });

  /**
   * WHY IT FAILS TODAY: history is a ProseMirror plugin living in the
   * `EditorState`, so the undo stack belongs to the TipTap `Editor` instance and
   * dies with it. A channel switch unmounts the layout
   * (`TemplateEditor.tsx:585-682`); `EmailLayout.tsx:223` additionally remounts
   * the editor via a `key` whenever read-only or autocomplete flips, so merely
   * entering preview mode discards the author's undo stack too.
   */
  it("can undo an edit made before a channel switch", async () => {
    const store = makeStore(emailContent("Base body"));
    const first = mountChannel(store, <EmailHarness />);
    const editor = await waitForEditor("email", "Base body");

    await typeAtEnd(editor, " REGRETTED-EDIT");
    // Let Email's 200ms debounce commit, so the edit is genuinely in the
    // document and this test is about history, not about criterion 2.
    await new Promise((resolve) => setTimeout(resolve, 400));

    first.unmount();
    clearTestEditors();

    mountChannel(store, <EmailHarness />);
    const returned = await waitForEditor("email", "REGRETTED-EDIT");

    await act(async () => {
      returned.commands.undo();
    });
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(
      returned.getText(),
      "undo after a channel switch did nothing — the history died with the editor instance"
    ).not.toContain("REGRETTED-EDIT");
  });

  /**
   * WHY IT FAILS TODAY: the restoration effect calls `setContent` with no
   * `addToHistory: false` (`EmailEditor.tsx:243`), so a re-sync the author never
   * asked for becomes an undoable step. Pressing undo once then walks back past
   * their own edit instead of reverting it.
   */
  it("does not put an automatic re-sync into the author's undo stack", async () => {
    const store = makeStore(emailContent("Base body"));
    mountChannel(store, <EmailHarness />);
    const editor = await waitForEditor("email", "Base body");

    await typeAtEnd(editor, " MY-EDIT");
    await new Promise((resolve) => setTimeout(resolve, 400));

    // An automatic re-sync, not an author action.
    await blurEditor(editor);
    await act(async () => {
      store.set(templateEditorContentAtom, emailContent("Base body"));
    });
    await new Promise((resolve) => setTimeout(resolve, 150));

    // One undo should revert the author's own last action.
    await act(async () => {
      editor.commands.undo();
    });
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(
      editor.getText(),
      "one undo should have reverted the author's edit, not stepped through a re-sync"
    ).not.toContain("MY-EDIT");
  });
});
