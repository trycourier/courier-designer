import { afterEach, describe, expect, it } from "vitest";
import { Editor, Node } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { MSTeamsButtonLabelLock, MSTeamsButtonLabelLockPluginKey } from "./msteamsButtonLabelLock";

let editor: Editor | undefined;
afterEach(() => {
  editor?.destroy();
  editor = undefined;
});

const ButtonNode = Node.create({
  name: "button",
  group: "block",
  content: "text*",
  parseHTML: () => [{ tag: "button-node" }],
  renderHTML: () => ["button-node", 0],
});

const make = () => {
  editor = new Editor({
    extensions: [StarterKit, ButtonNode, MSTeamsButtonLabelLock],
    content: "<p>Hi</p><button-node>Approve</button-node>",
  });
  return editor;
};

const insideButton = (e: Editor) => e.state.doc.child(0).nodeSize + 2;

const texts = (e: Editor) => {
  const out: string[] = [];
  e.state.doc.forEach((node) => out.push(`${node.type.name}:${node.textContent}`));
  return out;
};

// The lock's own props, so other plugins' handlers (StarterKit's Enter) don't answer.
const lock = (e: Editor) => {
  const plugin = MSTeamsButtonLabelLockPluginKey.get(e.state);
  if (!plugin) throw new Error("lock plugin missing");
  const props = plugin.props as {
    handleTextInput: (view: Editor["view"]) => boolean;
    handleKeyDown: (view: Editor["view"], event: KeyboardEvent) => boolean;
    handlePaste: (view: Editor["view"]) => boolean;
  };
  return {
    typed: props.handleTextInput(e.view),
    keys: ["Enter", "Backspace", "Delete"].map((key) =>
      props.handleKeyDown(e.view, new KeyboardEvent("keydown", { key }))
    ),
    pasted: props.handlePaste(e.view),
  };
};

describe("MSTeamsButtonLabelLock", () => {
  it("ignores typing, Enter, deleting and paste with the caret in a button label", () => {
    const e = make();
    e.commands.setTextSelection(insideButton(e));

    expect(lock(e)).toEqual({ typed: true, keys: [true, true, true], pasted: true });
    expect(texts(e)).toEqual(["paragraph:Hi", "button:Approve"]);
  });

  it("leaves text blocks alone", () => {
    const e = make();
    e.commands.setTextSelection(2);

    expect(lock(e)).toEqual({ typed: false, keys: [false, false, false], pasted: false });
  });
});
