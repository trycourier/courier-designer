import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Slice } from "@tiptap/pm/model";
import { MessagingChannelPaste, type MessagingChannelPasteOptions } from "./MessagingChannelPaste";

let editor: Editor | undefined;

afterEach(() => {
  editor?.destroy();
  editor = undefined;
});

const paste = (options: Partial<MessagingChannelPasteOptions>, html: string) => {
  editor = new Editor({
    extensions: [StarterKit, MessagingChannelPaste.configure(options)],
    content: html,
  });
  const plugin = editor.state.plugins.find((p) => p.props.transformPasted)!;
  const slice = new Slice(editor.state.doc.content, 0, 0);
  const out = plugin.props.transformPasted!.call(plugin, slice, editor.view);
  const names: string[] = [];
  out.content.forEach((n) => names.push(n.type.name));
  return names;
};

describe("MessagingChannelPaste unwrapNodeTypes", () => {
  it("keeps a pasted quote by default", () => {
    expect(paste({}, "<blockquote><p>Quoted</p></blockquote><p>After</p>")).toEqual([
      "blockquote",
      "paragraph",
    ]);
  });

  it("pastes an unwrapped quote's text as plain paragraphs", () => {
    expect(
      paste(
        { unwrapNodeTypes: ["blockquote"] },
        "<blockquote><p>One</p><p>Two</p></blockquote><p>After</p>"
      )
    ).toEqual(["paragraph", "paragraph", "paragraph"]);
  });

  it("unwraps a quote inside an unwrapped quote", () => {
    expect(
      paste(
        { unwrapNodeTypes: ["blockquote"] },
        "<blockquote><p>Before</p><blockquote><p>Quoted</p></blockquote><p>After</p></blockquote>"
      )
    ).toEqual(["paragraph", "paragraph", "paragraph"]);
  });
});
