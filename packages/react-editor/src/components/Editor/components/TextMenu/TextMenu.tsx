import { Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, AlignJustify, Quote, Link, Braces } from "lucide-react";
import { Editor } from "@tiptap/react";
import { memo, useRef } from "react";
import { Toolbar } from "../Toolbar";
import { ContentTypePicker } from './components/ContentTypePicker';
import { useTextmenuCommands } from "./hooks/useTextmenuCommands";
import { useTextmenuContentTypes } from "./hooks/useTextmenuContentTypes";
import { useTextmenuStates } from "./hooks/useTextmenuStates";

// We memorize the button so each button is not rerendered
// on every editor state change
const MemoButton = memo(Toolbar.Button);
const MemoContentTypePicker = memo(ContentTypePicker)

export type TextMenuProps = {
  editor: Editor;
};

export const TextMenu = ({ editor }: TextMenuProps) => {
  const commands = useTextmenuCommands(editor);
  const states = useTextmenuStates(editor);
  const blockOptions = useTextmenuContentTypes(editor)
  const toolbarRef = useRef<HTMLDivElement>(null)

  const handleLinkToggle = () => {
    const { selection } = editor.state;
    if (selection.empty) return;

    if (states.isLink) {
      editor.chain().focus().unsetLink().run();
    } else {
      // Just store the selection and show the form
      const tr = editor.state.tr.setMeta('showLinkForm', {
        from: selection.from,
        to: selection.to
      });
      editor.view.dispatch(tr);
    }
  };

  return (
    <div className="z-30 w-full">
      <Toolbar.Wrapper ref={toolbarRef} className="w-full border-t-0 border-l-0 border-r-0 border-b rounded-b-none rounded-t-sm shadow-none justify-center">
        <MemoContentTypePicker options={blockOptions} containerRef={toolbarRef} />
        <Toolbar.Divider />
        <MemoButton
          tooltip="Bold"
          tooltipShortcut={["Mod", "B"]}
          onClick={commands.onBold}
          active={states.isBold}
        >
          <Bold strokeWidth={1.25} className="w-5 h-5" />
        </MemoButton>
        <MemoButton
          tooltip="Italic"
          tooltipShortcut={["Mod", "I"]}
          onClick={commands.onItalic}
          active={states.isItalic}
        >
          <Italic strokeWidth={1.25} className="w-5 h-5" />
        </MemoButton>
        <MemoButton
          tooltip="Underline"
          tooltipShortcut={["Mod", "U"]}
          onClick={commands.onUnderline}
          active={states.isUnderline}
        >
          <Underline strokeWidth={1.25} className="w-5 h-5" />
        </MemoButton>
        <MemoButton
          tooltip="Strikethrough"
          tooltipShortcut={["Mod", "Shift", "S"]}
          onClick={commands.onStrike}
          active={states.isStrike}
        >
          <Strikethrough strokeWidth={1.25} className="w-5 h-5" />
        </MemoButton>
        <Toolbar.Divider />
        <MemoButton
          tooltip="Align left"
          tooltipShortcut={["Shift", "Mod", "L"]}
          onClick={commands.onAlignLeft}
          active={states.isAlignLeft}
        >
          <AlignLeft strokeWidth={1.25} className="w-5 h-5" />
        </MemoButton>
        <MemoButton
          tooltip="Align center"
          tooltipShortcut={["Shift", "Mod", "E"]}
          onClick={commands.onAlignCenter}
          active={states.isAlignCenter}
        >
          <AlignCenter strokeWidth={1.25} className="w-5 h-5" />
        </MemoButton>
        <MemoButton
          tooltip="Align right"
          tooltipShortcut={["Shift", "Mod", "R"]}
          onClick={commands.onAlignRight}
          active={states.isAlignRight}
        >
          <AlignRight strokeWidth={1.25} className="w-5 h-5" />
        </MemoButton>
        <MemoButton
          tooltip="Justify"
          tooltipShortcut={["Shift", "Mod", "J"]}
          onClick={commands.onAlignJustify}
          active={states.isAlignJustify}
        >
          <AlignJustify strokeWidth={1.25} className="w-5 h-5" />
        </MemoButton>
        <Toolbar.Divider />
        <MemoButton
          tooltip="Quote"
          tooltipShortcut={["Mod", "Shift", "B"]}
          onClick={commands.onQuote}
          active={states.isQuote}
        >
          <Quote strokeWidth={1.25} className="w-5 h-5" />
        </MemoButton>
        <Toolbar.Divider />
        <MemoButton
          tooltip="Link"
          tooltipShortcut={["Mod", "K"]}
          onClick={handleLinkToggle}
          active={states.isLink}
        >
          <Link strokeWidth={1.25} className="w-5 h-5" />
        </MemoButton>
        <MemoButton
          tooltip="Variable"
          tooltipShortcut={["Mod", "V"]}
          onClick={() => {
            const { state, dispatch } = editor.view;
            const { tr } = state;
            tr.insertText("{{");
            dispatch(tr);
            editor.commands.focus();
          }}
        >
          <Braces strokeWidth={1.25} className="w-5 h-5" />
        </MemoButton>
      </Toolbar.Wrapper>
    </div>
  );
};
