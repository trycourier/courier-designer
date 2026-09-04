/**
 * Shared harness for the C-20386 acceptance suite.
 *
 * The point of this suite is to state the ticket's eight criteria as executable
 * expectations, against a REAL TipTap editor. The existing
 * `*.content-stability.test.tsx` files mock `ExtensionKit` to `[]`, so no editor
 * is ever created — which is why they pass while the bugs this ticket describes
 * are live. Nothing here mocks the editor.
 *
 * These tests are expected to FAIL on the current state model. Each one carries
 * a `WHY IT FAILS TODAY` note naming the specific mechanism. When the rebuild
 * lands they go green with no change to the assertions.
 */
import { act, render, waitFor } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import type { ReactElement } from "react";
import { expect } from "vitest";

import { isTemplateLoadingAtom } from "../../Providers/store";
import { EmailLayout } from "../Channels/Email/EmailLayout";
import { Inbox } from "../Channels/Inbox/Inbox";
import { InboxEditor } from "../Channels/Inbox/InboxEditor";
import { isTemplateTransitioningAtom, templateEditorContentAtom } from "../store";
import { getTestEditorByChannel } from "@/lib/testHelpers";
import type { ElementalContent } from "@/types/elemental.types";

export type TestStore = ReturnType<typeof createStore>;

/** An Inbox document: an h2 title plus a body paragraph. */
export const inboxContent = (title: string, body: string): ElementalContent => ({
  version: "2022-01-01",
  elements: [
    {
      type: "channel",
      channel: "inbox",
      elements: [
        { type: "text", content: title, text_style: "h2" },
        { type: "text", content: body },
      ],
    },
  ],
});

/** An Email document: a single body paragraph. */
export const emailContent = (body: string): ElementalContent => ({
  version: "2022-01-01",
  elements: [
    {
      type: "channel",
      channel: "email",
      elements: [{ type: "text", content: body }],
    },
  ],
});

/**
 * A store seeded the way a loaded template leaves it: not loading, not
 * transitioning, content present.
 */
export const makeStore = (content: ElementalContent): TestStore => {
  const store = createStore();
  store.set(isTemplateLoadingAtom, false);
  store.set(isTemplateTransitioningAtom, false);
  store.set(templateEditorContentAtom, content);
  return store;
};

export const InboxHarness = (): ReactElement => (
  <Inbox
    routing={{ method: "single", channels: ["inbox"] }}
    render={(props) => <InboxEditor {...props} />}
  />
);

/**
 * Email mounts through its real layout rather than a hand-rolled render prop:
 * `EmailLayout` is what reads `templateEditorContentAtom` and passes it down as
 * `value` (`EmailLayout.tsx:92`). Composing it by hand produced an editor with
 * an empty document, which would have made the test pass or fail for reasons
 * that have nothing to do with the state model.
 */
export const EmailHarness = (): ReactElement => (
  <EmailLayout routing={{ method: "single", channels: ["email"] }} />
);

/** Mount a channel harness against a store. Returns RTL's result. */
export const mountChannel = (store: TestStore, harness: ReactElement) =>
  render(<Provider store={store}>{harness}</Provider>);

/**
 * Wait until the channel's editor has registered itself and actually has a
 * document. Registration alone is not enough — the editor registers before
 * content lands, and asserting too early makes a test pass for the wrong reason.
 */
export const waitForEditor = async (channel: "inbox" | "email", expectedText: string) => {
  let found: NonNullable<ReturnType<typeof getTestEditorByChannel>> | null = null;
  await waitFor(
    () => {
      const editor = getTestEditorByChannel(channel);
      expect(editor).toBeTruthy();
      expect(editor?.getText()).toContain(expectedText);
      // Capture inside the callback: the registry can be nulled again on the
      // next tick (an editor remounts on a `key` change), and re-reading it
      // after `waitFor` resolves has come back null.
      found = editor!;
    },
    { timeout: 5000 }
  );
  return found!;
};

/**
 * Type at the end of the document, the way a person would: focus, put the caret
 * at the end, insert. Goes through the real `onUpdate` path.
 *
 * `scrollIntoView: false` because ProseMirror's scroll uses `getClientRects`,
 * which jsdom does not implement. It affects only where the viewport lands, not
 * the document or the update path these tests observe.
 */
export const typeAtEnd = async (
  editor: ReturnType<typeof getTestEditorByChannel>,
  text: string
) => {
  await act(async () => {
    editor!.commands.focus("end", { scrollIntoView: false });
    editor!.commands.insertContent(text);
  });
};

/** Blur the editor, as clicking a sidebar field would. */
export const blurEditor = async (editor: ReturnType<typeof getTestEditorByChannel>) => {
  await act(async () => {
    editor!.commands.blur();
  });
};

/** The document as the store currently holds it, serialized for containment checks. */
export const storeContentText = (store: TestStore): string =>
  JSON.stringify(store.get(templateEditorContentAtom));
