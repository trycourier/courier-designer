import {
  BoldIcon,
  CenterAlignIcon,
  DistributeIcon,
  ItalicIcon,
  LeftAlignIcon,
  LinkIcon,
  RightAlignIcon,
  StrikethroughIcon,
  UnderlineIcon,
  QuoteIcon,
} from "@/components/ui-kit/Icon";
import { Editor } from "@tiptap/react";
import { memo } from "react";
import { Toolbar } from "../Toolbar";
import { useTextmenuCommands } from "./hooks/useTextmenuCommands";
import { useTextmenuStates } from "./hooks/useTextmenuStates";

// We memorize the button so each button is not rerendered
// on every editor state change
const MemoButton = memo(Toolbar.Button);

export type TextMenuProps = {
  editor: Editor;
};

export const TextMenu = ({ editor }: TextMenuProps) => {
  const commands = useTextmenuCommands(editor);
  const states = useTextmenuStates(editor);

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
      <Toolbar.Wrapper className="w-full border-t-0 border-l-0 border-r-0 border-b rounded-b-none rounded-t-sm shadow-none justify-center">
        <MemoButton
          tooltip="Bold"
          tooltipShortcut={["Mod", "B"]}
          onClick={commands.onBold}
          active={states.isBold}
        >
          <BoldIcon active={states.isBold} />
        </MemoButton>
        <MemoButton
          tooltip="Italic"
          tooltipShortcut={["Mod", "I"]}
          onClick={commands.onItalic}
          active={states.isItalic}
        >
          <ItalicIcon active={states.isItalic} />
        </MemoButton>
        <MemoButton
          tooltip="Underline"
          tooltipShortcut={["Mod", "U"]}
          onClick={commands.onUnderline}
          active={states.isUnderline}
        >
          <UnderlineIcon active={states.isUnderline} />
        </MemoButton>
        <MemoButton
          tooltip="Strikehrough"
          tooltipShortcut={["Mod", "Shift", "S"]}
          onClick={commands.onStrike}
          active={states.isStrike}
        >
          <StrikethroughIcon active={states.isStrike} />
        </MemoButton>
        <Toolbar.Divider />
        <MemoButton
          tooltip="Align left"
          tooltipShortcut={["Shift", "Mod", "L"]}
          onClick={commands.onAlignLeft}
          active={states.isAlignLeft}
        >
          <LeftAlignIcon active={states.isAlignLeft} />
        </MemoButton>
        <MemoButton
          tooltip="Align center"
          tooltipShortcut={["Shift", "Mod", "E"]}
          onClick={commands.onAlignCenter}
          active={states.isAlignCenter}
        >
          <CenterAlignIcon active={states.isAlignCenter} />
        </MemoButton>
        <MemoButton
          tooltip="Align right"
          tooltipShortcut={["Shift", "Mod", "R"]}
          onClick={commands.onAlignRight}
          active={states.isAlignRight}
        >
          <RightAlignIcon active={states.isAlignRight} />
        </MemoButton>
        <MemoButton
          tooltip="Justify"
          tooltipShortcut={["Shift", "Mod", "J"]}
          onClick={commands.onAlignJustify}
          active={states.isAlignJustify}
        >
          <DistributeIcon active={states.isAlignJustify} />
        </MemoButton>
        <Toolbar.Divider />
        <MemoButton
          tooltip="Quote"
          tooltipShortcut={["Mod", "Shift", "B"]}
          onClick={commands.onQuote}
          active={states.isQuote}
        >
          <QuoteIcon active={states.isQuote} />
        </MemoButton>
        <Toolbar.Divider />
        <MemoButton
          tooltip="Link"
          tooltipShortcut={["Mod", "K"]}
          onClick={handleLinkToggle}
          active={states.isLink}
        >
          <LinkIcon active={states.isLink} />
        </MemoButton>
      </Toolbar.Wrapper>
    </div>
  );
};
