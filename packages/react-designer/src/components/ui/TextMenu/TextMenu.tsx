import type { Editor } from "@tiptap/react";
import { useAtomValue } from "jotai";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Braces,
  Italic,
  Link,
  Quote,
  Strikethrough,
  Underline,
} from "lucide-react";
import type { ReactElement } from "react";
import { Fragment, memo, useMemo, useRef } from "react";
import { Toolbar } from "../Toolbar";
import { ContentTypePicker } from "./components/ContentTypePicker";
import { useTextmenuCommands } from "./hooks/useTextmenuCommands";
import { useTextmenuContentTypes } from "./hooks/useTextmenuContentTypes";
import { useTextmenuStates } from "./hooks/useTextmenuStates";
import { getNodeConfigAtom, lastActiveInputRefAtom, selectedNodeAtom } from "./store";

// We memorize the button so each button is not rerendered
// on every editor state change
const MemoButton = memo(Toolbar.Button);
const MemoContentTypePicker = memo(ContentTypePicker);

export interface TextMenuProps {
  editor: Editor;
}

export const TextMenu = ({ editor }: TextMenuProps) => {
  const commands = useTextmenuCommands(editor);
  const states = useTextmenuStates(editor);
  const blockOptions = useTextmenuContentTypes(editor);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const lastActiveInput = useAtomValue(lastActiveInputRefAtom);
  const selectedNode = useAtomValue(selectedNodeAtom);
  const currentNodeName = selectedNode?.type.name;

  const getNodeConfig = useAtomValue(getNodeConfigAtom);
  const menuConfig = useMemo(
    () => getNodeConfig(currentNodeName || ""),
    [getNodeConfig, currentNodeName]
  );

  const handleLinkToggle = () => {
    const { selection } = editor.state;

    // Only prevent link creation if we're in a non-text context
    // Allow link creation if we have selection OR if we're positioned in text
    if (selection.empty && !states.isLink && !editor.can().setLink({ href: "" })) {
      return;
    }

    if (states.isLink) {
      // If link is already active, show the form to edit it
      const tr = editor.state.tr.setMeta("showLinkForm", {
        from: selection.from,
        to: selection.to,
      });
      editor.view.dispatch(tr);
    } else {
      // Create new link
      const tr = editor.state.tr.setMeta("showLinkForm", {
        from: selection.from,
        to: selection.to,
      });
      editor.view.dispatch(tr);
    }
  };

  const handleVariableClick = () => {
    // Case 1: TextInput is focused
    if (lastActiveInput.ref) {
      const element = lastActiveInput.ref;
      const value = element.value;
      const caretPos = lastActiveInput.caretPosition || element.selectionStart || 0;

      // Insert {{ at last known caret position
      const beforeCursor = value.substring(0, caretPos);
      const afterCursor = value.substring(caretPos);
      const newValue = `${beforeCursor}{{${afterCursor}`;
      const newCaretPosition = caretPos + 2; // Move caret after {{

      // Focus first
      element.focus();

      // Create and dispatch a proper change event
      const changeEvent = new Event("input", { bubbles: true, cancelable: true });
      Object.defineProperty(changeEvent, "target", {
        writable: false,
        value: { ...element, value: newValue },
      });

      // Update value and trigger change
      element.value = newValue;
      element.dispatchEvent(changeEvent);

      // Set caret position after change event
      element.setSelectionRange(newCaretPosition, newCaretPosition);

      // Calculate cursor position for suggestions popup
      const containerRect = element.getBoundingClientRect();
      if (containerRect) {
        const textBeforeCursor = newValue.slice(0, newCaretPosition);
        const tempSpan = document.createElement("span");
        tempSpan.style.font = window.getComputedStyle(element).font;
        tempSpan.style.whiteSpace = "pre-wrap";
        tempSpan.textContent = textBeforeCursor;
        document.body.appendChild(tempSpan);

        const textWidth = tempSpan.offsetWidth;
        document.body.removeChild(tempSpan);

        const lineHeight = parseInt(window.getComputedStyle(element).lineHeight);
        const lines = textBeforeCursor.split("\n").length - 1;

        // Dispatch a custom event to show suggestions
        const showSuggestionsEvent = new CustomEvent("showVariableSuggestions", {
          detail: {
            cursorPosition: {
              left: Math.min(textWidth % element.offsetWidth, element.offsetWidth - 200),
              top: lines * lineHeight + 30,
            },
          },
          bubbles: true,
        });
        element.dispatchEvent(showSuggestionsEvent);
      }
      return;
    }

    // Case 2: Editor's Paragraph/Heading is focused
    const { state, dispatch } = editor.view;
    const { tr } = state;
    tr.insertText("{{");
    dispatch(tr);
    editor.commands.focus();

    // Trigger variable suggestions in the editor
    const tr2 = editor.state.tr.setMeta("showVariableSuggestions", {
      from: editor.state.selection.from,
      to: editor.state.selection.to,
    });
    editor.view.dispatch(tr2);
  };

  const renderButton = (
    key: keyof typeof menuConfig,
    icon: JSX.Element,
    tooltip: string,
    onClick: () => void,
    active: boolean,
    shortcut?: string[],
    dataAttributes?: Record<string, unknown>
  ) => {
    const config = menuConfig[key];
    if (!config || config.state === "hidden") return null;

    return (
      <MemoButton
        key={key}
        tooltip={tooltip}
        tooltipShortcut={shortcut}
        onClick={onClick}
        active={active}
        disabled={config.state === "disabled"}
        {...dataAttributes}
      >
        {icon}
      </MemoButton>
    );
  };

  const renderGroup = (items: (ReactElement | null | false)[], groupKey: string) => {
    const visibleItems = items.filter((item): item is ReactElement => Boolean(item));
    return visibleItems.length > 0 ? (
      <div key={groupKey} className="courier-flex courier-items-center courier-gap-0.5">
        {visibleItems}
      </div>
    ) : null;
  };

  const contentTypeGroup = renderGroup(
    [
      menuConfig.contentType?.state === "enabled" && (
        <MemoContentTypePicker
          key="content-type"
          options={blockOptions}
          containerRef={toolbarRef}
        />
      ),
    ],
    "content-type-group"
  );

  const textStyleGroup = renderGroup(
    [
      renderButton(
        "bold",
        <Bold strokeWidth={1.25} className="courier-w-4 courier-h-4" />,
        "Bold",
        commands.onBold,
        states.isBold,
        ["Mod", "B"]
      ),
      renderButton(
        "italic",
        <Italic strokeWidth={1.25} className="courier-w-4 courier-h-4" />,
        "Italic",
        commands.onItalic,
        states.isItalic,
        ["Mod", "I"]
      ),
      renderButton(
        "underline",
        <Underline strokeWidth={1.25} className="courier-w-4 courier-h-4" />,
        "Underline",
        commands.onUnderline,
        states.isUnderline,
        ["Mod", "U"]
      ),
      renderButton(
        "strike",
        <Strikethrough strokeWidth={1.25} className="courier-w-4 courier-h-4" />,
        "Strikethrough",
        commands.onStrike,
        states.isStrike,
        ["Mod", "Shift", "S"]
      ),
    ],
    "text-style-group"
  );

  const alignmentGroup = renderGroup(
    [
      renderButton(
        "alignLeft",
        <AlignLeft strokeWidth={1.25} className="courier-w-4 courier-h-4" />,
        "Align left",
        commands.onAlignLeft,
        states.isAlignLeft,
        ["Shift", "Mod", "L"]
      ),
      renderButton(
        "alignCenter",
        <AlignCenter strokeWidth={1.25} className="courier-w-4 courier-h-4" />,
        "Align center",
        commands.onAlignCenter,
        states.isAlignCenter,
        ["Shift", "Mod", "E"]
      ),
      renderButton(
        "alignRight",
        <AlignRight strokeWidth={1.25} className="courier-w-4 courier-h-4" />,
        "Align right",
        commands.onAlignRight,
        states.isAlignRight,
        ["Shift", "Mod", "R"]
      ),
      renderButton(
        "alignJustify",
        <AlignJustify strokeWidth={1.25} className="courier-w-4 courier-h-4" />,
        "Justify",
        commands.onAlignJustify,
        states.isAlignJustify,
        ["Shift", "Mod", "J"]
      ),
    ],
    "alignment-group"
  );

  const blockStyleGroup = renderGroup(
    [
      renderButton(
        "quote",
        <Quote strokeWidth={1.25} className="courier-w-4 courier-h-4" />,
        "Quote",
        commands.onQuote,
        states.isQuote,
        ["Mod", "Shift", "B"]
      ),
    ],
    "block-style-group"
  );

  const insertGroup = renderGroup(
    [
      renderButton(
        "link",
        <Link strokeWidth={1.25} className="courier-w-4 courier-h-4" />,
        "Link",
        handleLinkToggle,
        states.isLink,
        ["Mod", "K"]
      ),
      renderButton(
        "variable",
        <Braces strokeWidth={1.25} className="courier-w-4 courier-h-4" />,
        "Variable",
        handleVariableClick,
        false,
        ["Mod", "V"],
        { "data-variable-button": "true" }
      ),
    ],
    "insert-group"
  );

  return (
    <div className="courier-z-30 courier-w-full courier-h-12 courier-sticky courier-top-0 courier-left-0 courier-right-0 courier-bottom-0">
      <Toolbar.Wrapper
        ref={toolbarRef}
        className="courier-w-full courier-border-t-0 courier-border-l-0 courier-border-r-0 courier-border-b rounded-b-none rounded-t-sm courier-shadow-none courier-justify-center courier-rounded-none"
      >
        {[contentTypeGroup, textStyleGroup, alignmentGroup, blockStyleGroup, insertGroup]
          .filter(Boolean)
          .map((item, index) => (
            <Fragment key={`item-${index}`}>
              {item}
              {index <
                [
                  contentTypeGroup,
                  textStyleGroup,
                  alignmentGroup,
                  blockStyleGroup,
                  insertGroup,
                ].filter(Boolean).length -
                  1 && <Toolbar.Divider />}
            </Fragment>
          ))}
      </Toolbar.Wrapper>
    </div>
  );
};
