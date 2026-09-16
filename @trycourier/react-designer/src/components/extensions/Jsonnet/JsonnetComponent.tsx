import { cn } from "@/lib";
import { type NodeViewProps } from "@tiptap/react";
import { useSetAtom } from "@/lib/store";
import React, { useCallback } from "react";
import { SortableItemWrapper } from "../../ui/SortableItemWrapper";
import { setSelectedNodeAtom } from "../../ui/TextMenu/store";
import { safeGetNodeAtPos } from "../../utils";
import { JsonnetBlockIcon } from "../../ui/Blocks/JsonnetBlock";
import type { JsonnetProps } from "./Jsonnet.types";

const countLines = (template: string) => (template ? template.split("\n").length : 0);

/**
 * Card geometry, all derived so the three things that have to agree cannot
 * drift apart:
 *  - the selection outline sits at `left/right: -12px` off `.node-element`
 *    (the `.selected-element` rules in styles.css),
 *  - `.node-element`'s own `py-1.5` already leaves 6px above and below the
 *    card, so the card is inset the same 6px at the sides to match,
 *  - the remaining horizontal padding absorbs the border, which puts the
 *    card's *content* back on the text column of the blocks around it.
 */
const OUTLINE_INSET = 12;
const CARD_GAP = 6;
const CARD_BORDER = 1;
const CARD_PULL = OUTLINE_INSET - CARD_GAP;
const CARD_PADDING = CARD_GAP - CARD_BORDER;

export const JsonnetComponent: React.FC<
  JsonnetProps & {
    /**
     * Jsonnet compiles to the provider's payload on the server, against send
     * data the editor does not have, so the canvas can never show the real
     * message. Editing shows a summary; preview says so outright.
     */
    previewable?: boolean;
  }
> = ({ template, previewable = true }) => {
  const lines = countLines(template);

  return (
    <div className="courier-w-full node-element courier-py-1.5">
      {/* Inline rather than negative Tailwind utilities: the prefix + negative +
          arbitrary-value combination silently compiles to nothing if written
          wrong. See OUTLINE_INSET above for what the numbers line up with. */}
      <div
        className="courier-flex courier-flex-row courier-items-center courier-gap-2 courier-rounded-md courier-border courier-border-border courier-bg-secondary courier-py-2"
        style={{
          marginLeft: -CARD_PULL,
          marginRight: -CARD_PULL,
          paddingLeft: CARD_PADDING,
          paddingRight: CARD_PADDING,
        }}
      >
        <span className="courier-shrink-0 courier-text-muted-foreground">
          <JsonnetBlockIcon />
        </span>
        <span className="courier-text-sm courier-font-medium courier-text-foreground">
          Jsonnet block
        </span>
        <span className="courier-ml-auto courier-text-xs courier-text-muted-foreground">
          {previewable ? `${lines} ${lines === 1 ? "line" : "lines"}` : "Can't be previewed here"}
        </span>
      </div>
    </div>
  );
};

export const JsonnetComponentNode = (props: NodeViewProps) => {
  const setSelectedNode = useSetAtom(setSelectedNodeAtom);

  const handleSelect = useCallback(() => {
    if (!props.editor.isEditable) {
      return;
    }

    const node = safeGetNodeAtPos(props);
    if (node) {
      props.editor.commands.blur();
      const nodeId = node.attrs.id;
      props.editor.state.doc.descendants((currentNode) => {
        if (currentNode.type.name === "jsonnet" && currentNode.attrs.id === nodeId) {
          setSelectedNode(currentNode);
          return false;
        }
        return true;
      });
    }
  }, [props, setSelectedNode]);

  return (
    <SortableItemWrapper
      id={props.node.attrs.id}
      className={cn(props.node.attrs.isSelected && "selected-element")}
      onClick={handleSelect}
      editor={props.editor}
      data-node-type="jsonnet"
    >
      <JsonnetComponent
        {...(props.node.attrs as JsonnetProps)}
        previewable={props.editor.isEditable}
      />
    </SortableItemWrapper>
  );
};
