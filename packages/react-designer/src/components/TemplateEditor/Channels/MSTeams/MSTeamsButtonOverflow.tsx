import {
  draggable,
  dropTargetForElements,
  monitorForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { useCurrentEditor } from "@tiptap/react";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { cn } from "@/lib/utils";
import { selectedNodeAtom, setSelectedNodeAtom } from "@/components/ui/TextMenu/store";
import {
  currentSourceId,
  draggedBlockLabel,
  getLastTrailingTarget,
  setLastTrailingTarget,
  type TrailingDropTarget,
} from "@/components/extensions/DropRules";
import { BinIcon, DuplicateIcon } from "@/components/ui-kit/Icon";
import { createOrDuplicateNode } from "@/components/utils";
import { DropIndicatorPlaceholder } from "@/components/ui/DropIndicatorPlaceholder";
import { MSTEAMS_VISIBLE_BUTTONS } from "./teamsButtonDrop";

export { MSTEAMS_VISIBLE_BUTTONS };

export interface ButtonEntry {
  node: ProseMirrorNode;
  pos: number;
  /** Index among the document's top-level blocks. */
  index: number;
}

const topLevelButtons = (doc: ProseMirrorNode): ButtonEntry[] => {
  const buttons: ButtonEntry[] = [];
  doc.forEach((node, pos, index) => {
    if (node.type.name === "button") buttons.push({ node, pos, index });
  });
  return buttons;
};

const isButtonDrag = (data: Record<string, unknown>) =>
  String(data.dragType ?? "").split(":")[0] === "button";

/** The buttons other than the dragged one, in order. */
const othersThan = (doc: ProseMirrorNode, sourceId: unknown) =>
  topLevelButtons(doc).filter(({ node }) => node.attrs.id !== sourceId);

/**
 * The menu's list once the dragged button has left its place: a button leaving the row
 * brings the first one from under "…" up into it.
 */
const menuListWithout = (doc: ProseMirrorNode, sourceId: unknown) =>
  othersThan(doc, sourceId).slice(MSTEAMS_VISIBLE_BUTTONS);

/** A hidden button in the "…" menu, dragged out into the row like the buttons on it. */
const OverflowItem = ({
  entry,
  isSelected,
  isDragged,
  isHidden,
  onSelect,
  onDuplicate,
  onDelete,
  readOnly,
}: {
  entry: ButtonEntry;
  isSelected: boolean;
  isDragged: boolean;
  isHidden: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  readOnly: boolean;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const { node, pos, index } = entry;

  useEffect(() => {
    const element = ref.current;
    if (!element || readOnly) return;
    // The same data a top-level block gives its drag (SortableItemWrapper).
    return draggable({
      element,
      getInitialData: () => ({
        id: node.attrs.id,
        type: "editor",
        index,
        originalIndex: index,
        dragType: "button",
        pos,
        label: node.textContent || null,
      }),
    });
  }, [node, pos, index, readOnly]);

  return (
    <div
      ref={ref}
      role="menuitem"
      tabIndex={0}
      className={cn(
        "courier-msteams-button-overflow-item",
        isSelected && "courier-msteams-button-overflow-item-selected",
        isDragged && "courier-opacity-40",
        isHidden && "courier-hidden"
      )}
      onClick={readOnly ? undefined : onSelect}
      onKeyDown={(event) => !readOnly && event.key === "Enter" && onSelect()}
    >
      <span className="courier-truncate">{node.textContent || "Button"}</span>
      {/* The selected button's duplicate/delete, as on a button in the row. */}
      {isSelected && !readOnly && (
        <span className="courier-msteams-button-overflow-actions">
          <button
            type="button"
            aria-label="Duplicate"
            onClick={(event) => {
              event.stopPropagation();
              onDuplicate();
            }}
          >
            <DuplicateIcon color="currentColor" />
          </button>
          <button
            type="button"
            aria-label="Delete"
            className="courier-text-destructive"
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
          >
            <BinIcon color="currentColor" />
          </button>
        </span>
      )}
    </div>
  );
};

/**
 * The last box an element shows. A button hosting the drag placeholder is
 * `display: contents`, so it has no box of its own; its button and placeholder do.
 */
const lastBox = (element: Element): DOMRect | null => {
  const rect = element.getBoundingClientRect();
  if (rect.width > 0 || rect.height > 0) return rect;
  let last: DOMRect | null = null;
  for (const child of Array.from(element.children)) {
    const box = lastBox(child);
    // Boxes on one line can start a few px apart (the ghost has a margin the button lacks).
    const sameLine = !!box && !!last && Math.abs(box.top - last.top) < box.height / 2;
    if (box && (!last || (sameLine ? box.right > last.right : box.top > last.top))) {
      last = box;
    }
  }
  return last;
};

/** Every menu row and its placeholder is this tall (styles.css), so the list maps to y. */
const MENU_ROW_HEIGHT = 34;

/** The menu row under the pointer: the placeholder takes that row, under the pointer. */
const menuDropIndex = (menu: HTMLElement, y: number, count: number) => {
  const top = menu.getBoundingClientRect().top + parseFloat(getComputedStyle(menu).paddingTop);
  return Math.max(0, Math.min(count, Math.floor((y - top) / MENU_ROW_HEIGHT)));
};

const MENU_TARGET_ID = "msteams-button-overflow-menu";

type RowDrop = TrailingDropTarget | "end" | null;

/** Where the drag lands outside the menu, as the row's own drop target left it. */
const currentRowDrop = (overMenu: boolean, atRowEnd: boolean): RowDrop => {
  if (overMenu) return null;
  const target = getLastTrailingTarget();
  if (target) return { id: target.id, edge: target.edge };
  return atRowEnd ? "end" : null;
};

const sameRowDrop = (a: RowDrop, b: RowDrop) =>
  a === b ||
  (typeof a === "object" && typeof b === "object" && a?.id === b?.id && a?.edge === b?.edge);

/**
 * What the menu lists while a button is dragged, and where its placeholder goes, so the
 * menu shows the result of a drop: over the menu, the dragged button lands at the pointer;
 * at the row's end, or right after a full row's 6th, it goes under "…"; beside another
 * button in the row it takes a place there, pushing the 6th under "…".
 */
export const menuPreview = (
  others: ButtonEntry[] | null,
  overflow: ButtonEntry[],
  menuDrop: number | null,
  rowDrop: RowDrop,
  isFullInsert: boolean
): { listed: ButtonEntry[]; placeAt: number | null } => {
  if (!others) return { listed: overflow, placeAt: null };
  const under = others.slice(MSTEAMS_VISIBLE_BUTTONS);
  if (menuDrop !== null) return { listed: under, placeAt: menuDrop };
  if (rowDrop === "end") {
    return {
      listed: under,
      placeAt: others.length >= MSTEAMS_VISIBLE_BUTTONS ? under.length : null,
    };
  }
  if (rowDrop) {
    const sixth = others[MSTEAMS_VISIBLE_BUTTONS - 1];
    if (isFullInsert && rowDrop.edge === "right" && sixth?.node.attrs.id === rowDrop.id) {
      return { listed: under, placeAt: 0 };
    }
    return { listed: others.slice(MSTEAMS_VISIBLE_BUTTONS - 1), placeAt: null };
  }
  return { listed: overflow, placeAt: null };
};

/**
 * The "…" chip after the last button Teams shows, listing the buttons it hides there. The
 * row's CSS hides those buttons and leaves room for the chip; picking one selects it, so the
 * sidebar edits it. The menu opens for every button drag and takes a drop at a place in it.
 */
export const MSTeamsButtonOverflow = ({
  containerRef,
  readOnly = false,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  /** Lists the hidden buttons without selecting, dragging or editing them. */
  readOnly?: boolean;
}) => {
  const { editor } = useCurrentEditor();
  const isReadOnly = readOnly;
  const selectedNode = useAtomValue(selectedNodeAtom);
  const setSelectedNode = useSetAtom(setSelectedNodeAtom);
  const [buttons, setButtons] = useState<ButtonEntry[]>([]);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  // Where the menu opened for a drag: it stays there while the ghost reflows the row and
  // moves the chip, or it would slide under the pointer, take the drop and move back.
  const [menuAnchor, setMenuAnchor] = useState<{ left: number; top: number } | null>(null);
  const [isAddingButton, setIsAddingButton] = useState(false);
  // Where the drag lands outside the menu: beside a button in the row, or at the row's end.
  const [rowDrop, setRowDrop] = useState<RowDrop>(null);
  // The dragged button, and where in the menu it would land.
  const [drag, setDrag] = useState<{
    data: Record<string | symbol, unknown>;
    label: string | null;
  } | null>(null);
  const [menuDrop, setMenuDrop] = useState<number | null>(null);
  // The dragged button's place among the top-level blocks, taken when the drag starts: the
  // editor gives blocks new ids once a drag runs, so its id can't find it again.
  const sourceIndexRef = useRef<number | null>(null);
  const sourceIdNow = useCallback(() => {
    const index = sourceIndexRef.current;
    if (!editor || index === null || index >= editor.state.doc.childCount) return undefined;
    return editor.state.doc.child(index).attrs.id as string | undefined;
  }, [editor]);
  const chipRef = useRef<HTMLDivElement>(null);
  // State, not a ref: the drop target registers when the menu actually mounts, which a
  // drag-opened menu does a render after `isOpen` flips (the chip measures first).
  const [menuElement, setMenuElement] = useState<HTMLDivElement | null>(null);

  const overflow = buttons.slice(MSTEAMS_VISIBLE_BUTTONS);
  const lastShown = buttons[MSTEAMS_VISIBLE_BUTTONS - 1];
  const isShown = overflow.length > 0 || isAddingButton;

  useEffect(() => {
    if (!editor) return;
    // Every transaction: loading content (as after a drop) gives the buttons new ids
    // without an "update" event.
    let lastDoc: ProseMirrorNode | null = null;
    const update = () => {
      if (editor.state.doc === lastDoc) return;
      lastDoc = editor.state.doc;
      setButtons(topLevelButtons(editor.state.doc));
    };
    update();
    editor.on("transaction", update);
    editor.on("create", update);
    return () => {
      editor.off("transaction", update);
      editor.off("create", update);
    };
  }, [editor]);

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!editor || editor.isDestroyed || !container || !lastShown || !isShown) {
      setPosition(null);
      return;
    }
    // The row's last button as shown: a drag can move one out of the row or another in.
    const hosts = Array.from(
      editor.view.dom.querySelectorAll<HTMLElement>(":scope > .node-button")
    ).filter((host) => {
      const box = lastBox(host);
      return !!box && box.width > 0;
    });
    const dom = hosts[hosts.length - 1] ?? editor.view.nodeDOM(lastShown.pos);
    if (!(dom instanceof HTMLElement)) return;
    const box = container.getBoundingClientRect();
    const rect = lastBox(dom) ?? dom.getBoundingClientRect();
    // The row's slot is 40px with the button 4px in; the chip sits 8px after it.
    setPosition({ left: rect.right - box.left + 8, top: rect.top - box.top + 4 });
  }, [editor, containerRef, lastShown, isShown]);

  useEffect(() => {
    if (drag && position && !menuAnchor) setMenuAnchor(position);
  }, [drag, position, menuAnchor]);

  const measureRef = useRef(measure);
  measureRef.current = measure;

  useLayoutEffect(() => {
    measure();
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [measure, containerRef]);

  useEffect(
    () =>
      monitorForElements({
        canMonitor: ({ source }) => isButtonDrag(source.data),
        onDragStart: ({ source }) => {
          setIsAddingButton(source.data.type === "sidebar");
          const id = currentSourceId(editor, source.data);
          sourceIndexRef.current = null;
          editor?.state.doc.forEach((node, _offset, index) => {
            if (node.attrs.id === id) sourceIndexRef.current = index;
          });
          setDrag({ data: source.data, label: draggedBlockLabel(editor, source.data) });
          // Open for every button drag, so a button can go under "…" without hunting for it.
          setIsOpen(true);
          // A new button, or one from under "…", dropped into a full row pushes the 6th
          // under "…"; the row's CSS previews that.
          const current = editor ? topLevelButtons(editor.state.doc) : [];
          const shownIds = current
            .slice(0, MSTEAMS_VISIBLE_BUTTONS)
            .map(({ node }) => node.attrs.id);
          containerRef.current?.toggleAttribute(
            "data-row-full-insert",
            current.length >= MSTEAMS_VISIBLE_BUTTONS && !shownIds.includes(id)
          );
          // The ghost can empty the row's last line; were the editor to shrink, the
          // pointer would leave it and the ghost go, which brings the line back.
          const container = containerRef.current;
          if (container) container.style.minHeight = `${container.offsetHeight}px`;
        },
        onDrag: ({ location }) => {
          // The ghost reflows the row; the chip follows its 6th button.
          requestAnimationFrame(() => measureRef.current());
          const next = currentRowDrop(
            location.current.dropTargets[0]?.data.id === MENU_TARGET_ID,
            !!containerRef.current?.hasAttribute("data-trailing-drop")
          );
          setRowDrop((last) => (sameRowDrop(last, next) ? last : next));
        },
        onDrop: ({ location }) => {
          containerRef.current?.removeAttribute("data-row-full-insert");
          containerRef.current?.style.removeProperty("min-height");
          setRowDrop(null);
          setIsAddingButton(false);
          setDrag(null);
          setMenuDrop(null);
          setMenuAnchor(null);
          // Reordered inside the menu, it stays open on the result.
          if (location.current.dropTargets[0]?.data.id !== MENU_TARGET_ID) {
            setIsOpen(false);
          }
          requestAnimationFrame(() => measureRef.current());
        },
      }),
    [containerRef, editor]
  );

  // The menu takes a drop at a place in its list. The place comes from the list as it is
  // without the placeholder, so the placeholder moving the items can't move the drop.
  useEffect(() => {
    const element = menuElement;
    if (!element || !editor || isReadOnly) return;
    const placeAt = (sourceId: unknown, y: number) => {
      const list = menuListWithout(editor.state.doc, sourceId);
      const index = menuDropIndex(element, y, list.length);
      const at = list[index];
      const last = list[list.length - 1];
      const insertPos = at
        ? at.pos
        : last
          ? last.pos + last.node.nodeSize
          : editor.state.doc.content.size;
      return { index, insertPos };
    };
    return dropTargetForElements({
      element,
      canDrop: ({ source }) => isButtonDrag(source.data),
      getData: ({ input }) => ({
        type: "editor",
        id: MENU_TARGET_ID,
        outOfRow: true,
        insertPos: placeAt(sourceIdNow(), input.clientY).insertPos,
      }),
      onDrag: ({ location }) => {
        setLastTrailingTarget(null);
        setMenuDrop(placeAt(sourceIdNow(), location.current.input.clientY).index);
      },
      onDragLeave: () => setMenuDrop(null),
      onDrop: () => setMenuDrop(null),
    });
  }, [editor, menuElement, isReadOnly, sourceIdNow]);

  useEffect(() => {
    if (!isOpen) return;
    const close = (event: PointerEvent) => {
      if (!chipRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [isOpen]);

  if (!position || !isShown) return null;

  const selectedId = selectedNode?.attrs?.id;
  const hasSelected = overflow.some(({ node }) => selectedId && node.attrs.id === selectedId);

  // The entry as the doc has it now: the menu's copy can be a render behind.
  const currentEntry = ({ node }: ButtonEntry) =>
    editor && topLevelButtons(editor.state.doc).find((b) => b.node.attrs.id === node.attrs.id);

  const duplicate = (entry: ButtonEntry) => {
    const current = currentEntry(entry);
    if (!editor || !current || isReadOnly) return;
    const { id: _id, ...attrs } = current.node.attrs;
    createOrDuplicateNode(
      editor,
      "button",
      current.pos + current.node.nodeSize,
      attrs,
      (created) => setSelectedNode(created as ProseMirrorNode),
      current.node.content
    );
  };

  const remove = (entry: ButtonEntry) => {
    const current = currentEntry(entry);
    if (!editor || !current || isReadOnly) return;
    setSelectedNode(null);
    editor.view.dispatch(editor.state.tr.delete(current.pos, current.pos + current.node.nodeSize));
  };

  // While a button is dragged over the menu, it leaves its own place there and a
  // placeholder shows where it lands. Items leaving the list are hidden, not unmounted:
  // the dragged one is the drag's source element.
  const dragId = drag ? (sourceIdNow() ?? null) : null;
  const { listed, placeAt } = menuPreview(
    editor && drag ? othersThan(editor.state.doc, dragId) : null,
    overflow,
    menuDrop,
    rowDrop,
    !!containerRef.current?.hasAttribute("data-row-full-insert")
  );
  const listedIds = new Set(listed.map(({ node }) => node.attrs.id));
  // The menu's buttons, with any the drag pushes into it, in the document's order.
  const overflowNodes = new Set(overflow.map(({ node }) => node));
  const rendered = buttons.filter(
    ({ node }) => listedIds.has(node.attrs.id) || overflowNodes.has(node)
  );
  const placeholderBefore = placeAt !== null ? listed[placeAt]?.node.attrs.id : undefined;
  const placeholder = (
    <DropIndicatorPlaceholder
      key="msteams-overflow-placeholder"
      type="button"
      label={drag?.label ?? null}
      inline="before"
    />
  );

  return (
    <div
      ref={chipRef}
      className="courier-msteams-button-overflow"
      style={{ left: position.left, top: position.top }}
    >
      <button
        type="button"
        aria-label={`${overflow.length} more buttons`}
        aria-expanded={isOpen}
        className={cn(
          "courier-msteams-button-overflow-chip",
          hasSelected && "courier-msteams-button-overflow-chip-selected"
        )}
        onClick={() => setIsOpen((open) => !open)}
      >
        …
      </button>
      {isOpen && (
        <div
          ref={setMenuElement}
          role="menu"
          className="courier-msteams-button-overflow-menu"
          style={
            menuAnchor
              ? {
                  transform: `translate(${menuAnchor.left - position.left}px, ${menuAnchor.top - position.top}px)`,
                }
              : undefined
          }
        >
          {rendered.map((entry) => (
            <span key={entry.node.attrs.id ?? entry.pos} className="courier-contents">
              {placeholderBefore !== undefined &&
                entry.node.attrs.id === placeholderBefore &&
                placeholder}
              <OverflowItem
                entry={entry}
                isSelected={!!selectedId && entry.node.attrs.id === selectedId}
                isDragged={!!dragId && entry.node.attrs.id === dragId}
                isHidden={!listedIds.has(entry.node.attrs.id)}
                onSelect={() => setSelectedNode(entry.node)}
                onDuplicate={() => duplicate(entry)}
                onDelete={() => remove(entry)}
                readOnly={isReadOnly}
              />
            </span>
          ))}
          {placeAt !== null && placeAt >= listed.length && placeholder}
        </div>
      )}
    </div>
  );
};
