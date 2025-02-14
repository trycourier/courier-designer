import {
  CancelDrop,
  closestCenter,
  CollisionDetection,
  defaultDropAnimationSideEffects,
  DndContext,
  DragOverlay,
  getFirstCollision,
  KeyboardCoordinateGetter,
  KeyboardSensor,
  MeasuringStrategy,
  Modifiers,
  MouseSensor,
  pointerWithin,
  rectIntersection,
  TouchSensor,
  UniqueIdentifier,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  AnimateLayoutChanges,
  arrayMove,
  defaultAnimateLayoutChanges,
  SortableContext,
  SortingStrategy,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { coordinateGetter as multipleContainersCoordinateGetter } from './multipleContainersKeyboardCoordinates';

import { Container, ContainerProps, Item } from './components';

// import { createRange } from './utilities';

const animateLayoutChanges: AnimateLayoutChanges = (args) =>
  defaultAnimateLayoutChanges({ ...args, wasDragging: true });

function DroppableContainer({
  children,
  disabled,
  id,
  items,
  style,
  ...props
}: ContainerProps & {
  disabled?: boolean;
  id: UniqueIdentifier;
  items: UniqueIdentifier[];
  style?: React.CSSProperties;
}) {
  const {
    active,
    isDragging,
    over,
    setNodeRef,
    transition,
    transform,
  } = useSortable({
    id,
    data: {
      type: 'container',
      children: items,
    },
    animateLayoutChanges,
  });
  const isOverContainer = over
    ? (id === over.id && active?.data.current?.type !== 'container') ||
    items.includes(over.id)
    : false;

  return (
    <Container
      ref={disabled ? undefined : setNodeRef}
      style={{
        ...style,
        transition,
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : undefined,
      }}
      hover={isOverContainer}
      {...props}
    >
      {children}
    </Container>
  );
}

type Items = Record<UniqueIdentifier, UniqueIdentifier[]>;

interface Props {
  adjustScale?: boolean;
  cancelDrop?: CancelDrop;
  containerStyle?: React.CSSProperties;
  coordinateGetter?: KeyboardCoordinateGetter;
  getItemStyles?(args: {
    value: UniqueIdentifier;
    index: number;
    overIndex: number;
    isDragging: boolean;
    containerId: UniqueIdentifier;
    isSorting: boolean;
    isDragOverlay: boolean;
  }): React.CSSProperties;
  wrapperStyle?(args: { index: number }): React.CSSProperties;
  itemCount?: number;
  items?: Items;
  handle?: boolean;
  strategy?: SortingStrategy;
  modifiers?: Modifiers;
  minimal?: boolean;
  scrollable?: boolean;
  vertical?: boolean;
}

export function MultipleContainers({
  adjustScale = false,
  // itemCount = 3,
  cancelDrop,
  handle = false,
  items: initialItems,
  containerStyle,
  coordinateGetter = multipleContainersCoordinateGetter,
  getItemStyles = () => ({}),
  wrapperStyle = () => ({}),
  minimal = false,
  modifiers,
  strategy = verticalListSortingStrategy,
  vertical = false,
  scrollable,
}: Props) {
  const [items, setItems] = useState<Items>(
    () =>
      initialItems ?? {
        Sidebar: ['Paragraph', 'Heading', 'Image'],
        Editor: ['Paragraph element'],
        // Sidebar: createRange(itemCount, (index) => `A${index + 1}`),
        // Editor: createRange(itemCount, (index) => `B${index + 1}`),
      }
  );
  const [containers, setContainers] = useState(
    Object.keys(items) as UniqueIdentifier[]
  );
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [_, setIsDroppingToEditor] = useState(false);
  const lastOverId = useRef<UniqueIdentifier | null>(null);
  const recentlyMovedToNewContainer = useRef(false);
  const isSortingContainer =
    activeId != null ? containers.includes(activeId) : false;

  /**
   * Custom collision detection strategy optimized for multiple containers
   *
   * - First, find any droppable containers intersecting with the pointer.
   * - If there are none, find intersecting containers with the active draggable.
   * - If there are no intersecting containers, return the last matched intersection
   *
   */
  const collisionDetectionStrategy: CollisionDetection = useCallback(
    (args) => {
      if (activeId && activeId in items) {
        return closestCenter({
          ...args,
          droppableContainers: args.droppableContainers.filter(
            (container) => container.id in items
          ),
        });
      }

      // Start by finding any intersecting droppable
      const pointerIntersections = pointerWithin(args);
      const intersections =
        pointerIntersections.length > 0
          ? // If there are droppables intersecting with the pointer, return those
          pointerIntersections
          : rectIntersection(args);
      let overId = getFirstCollision(intersections, 'id');

      if (overId != null) {
        if (overId in items) {
          const containerItems = items[overId];

          // If a container is matched and it contains items (columns 'A', 'B', 'C')
          if (containerItems.length > 0) {
            // Return the closest droppable within that container
            overId = closestCenter({
              ...args,
              droppableContainers: args.droppableContainers.filter(
                (container) =>
                  container.id !== overId &&
                  containerItems.includes(container.id)
              ),
            })[0]?.id;
          }
        }

        lastOverId.current = overId;

        return [{ id: overId }];
      }

      // When a draggable item moves to a new container, the layout may shift
      // and the `overId` may become `null`. We manually set the cached `lastOverId`
      // to the id of the draggable item that was moved to the new container, otherwise
      // the previous `overId` will be returned which can cause items to incorrectly shift positions
      if (recentlyMovedToNewContainer.current) {
        lastOverId.current = activeId;
      }

      // If no droppable is matched, return the last match
      return lastOverId.current ? [{ id: lastOverId.current }] : [];
    },
    [activeId, items]
  );
  const [clonedItems, setClonedItems] = useState<Items | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter,
    })
  );
  const findContainer = (id: UniqueIdentifier) => {
    if (id in items) {
      return id;
    }

    return Object.keys(items).find((key) => items[key].includes(id));
  };

  const getIndex = (id: UniqueIdentifier) => {
    const container = findContainer(id);

    if (!container) {
      return -1;
    }

    const index = items[container].indexOf(id);

    return index;
  };

  const onDragCancel = () => {
    if (clonedItems) {
      // Reset items to their original state in case items have been
      // Dragged across containers
      setItems(clonedItems);
    }

    setActiveId(null);
    setClonedItems(null);
  };

  useEffect(() => {
    requestAnimationFrame(() => {
      recentlyMovedToNewContainer.current = false;
    });
  }, [items]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetectionStrategy}
      measuring={{
        droppable: {
          strategy: MeasuringStrategy.Always,
        },
      }}
      onDragStart={({ active }) => {
        setIsDroppingToEditor(false);
        setActiveId(active.id);
        setClonedItems(items);
      }}
      onDragOver={({ active, over }) => {
        const overId = over?.id;

        if (overId == null || active.id in items) {
          return;
        }

        const overContainer = findContainer(overId);
        const activeContainer = findContainer(active.id);

        if (!overContainer || !activeContainer) {
          return;
        }

        // Prevent dragging from Editor to Sidebar
        if (activeContainer === "Editor" && overContainer === "Sidebar") {
          return;
        }

        if (activeContainer !== overContainer) {
          setItems((items) => {
            const activeItems = items[activeContainer];
            const overItems = items[overContainer];
            const overIndex = overItems.indexOf(overId);
            const activeIndex = activeItems.indexOf(active.id);

            let newIndex: number;

            if (overId in items) {
              newIndex = overItems.length + 1;
            } else {
              const isBelowOverItem =
                over &&
                active.rect.current.translated &&
                active.rect.current.translated.top >
                over.rect.top + over.rect.height;

              const modifier = isBelowOverItem ? 1 : 0;

              newIndex =
                overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
            }

            recentlyMovedToNewContainer.current = true;

            // Special handling for Sidebar to Editor drag
            if (activeContainer === "Sidebar" && overContainer === "Editor") {
              const tempId = `${active.id}_placeholder`;
              return {
                ...items,
                // Keep Sidebar items unchanged
                [activeContainer]: [...items[activeContainer]],
                // Show placeholder in Editor, removing any existing temp items
                [overContainer]: [
                  ...items[overContainer].filter(id => !id.toString().includes('_placeholder')),
                ].reduce((acc, item, index) => {
                  if (index === newIndex) {
                    acc.push(tempId);
                  }
                  acc.push(item);
                  return acc;
                }, [] as UniqueIdentifier[]),
              };
            }

            // Default behavior for other drag operations
            return {
              ...items,
              [activeContainer]: items[activeContainer].filter(
                (item) => item !== active.id
              ),
              [overContainer]: [
                ...items[overContainer].slice(0, newIndex),
                items[activeContainer][activeIndex],
                ...items[overContainer].slice(
                  newIndex,
                  items[overContainer].length
                ),
              ],
            };
          });
        }
      }}
      onDragEnd={({ active, over }) => {
        if (active.id in items && over?.id) {
          setContainers((containers) => {
            const activeIndex = containers.indexOf(active.id);
            const overIndex = containers.indexOf(over.id);

            return arrayMove(containers, activeIndex, overIndex);
          });
        }

        const activeContainer = findContainer(active.id);

        if (!activeContainer) {
          // Clean up any temporary items
          setItems((items) => ({
            ...items,
            Editor: items.Editor.filter(id => !id.toString().includes('_placeholder'))
          }));
          setActiveId(null);
          return;
        }

        const overId = over?.id;

        if (overId == null) {
          // Clean up any temporary items if dropped outside
          setItems((items) => ({
            ...items,
            Editor: items.Editor.filter(id => !id.toString().includes('_placeholder'))
          }));
          setActiveId(null);
          return;
        }

        const overContainer = findContainer(overId);

        if (overContainer) {
          if (activeContainer === "Sidebar" && overContainer === "Editor") {
            // First set activeId to null to prevent return animation
            setActiveId(null);

            const clonedId = `${{ 'Paragraph': 'Paragraph element', 'Heading': 'Heading element', 'Image': 'Image element' }[active.id]}_${Date.now()}`;
            const overIndex = items[overContainer].findIndex(id => id.toString().includes('_placeholder'));

            setItems((items) => {
              const filteredItems = items[overContainer].filter(id => !id.toString().includes('_placeholder'));
              return {
                ...items,
                [overContainer]: [
                  ...filteredItems.slice(0, overIndex >= 0 ? overIndex : filteredItems.length),
                  clonedId,
                  ...filteredItems.slice(overIndex >= 0 ? overIndex : filteredItems.length),
                ],
              };
            });
          } else {
            const activeIndex = items[activeContainer].indexOf(active.id);
            const overIndex = items[overContainer].indexOf(overId);

            // Clean up any temporary items since we're not dropping from Sidebar to Editor
            setItems((items) => {
              const newItems = {
                ...items,
                Editor: items.Editor.filter(id => !id.toString().includes('_placeholder'))
              };

              if (activeIndex !== overIndex && activeContainer === overContainer) {
                return {
                  ...newItems,
                  [overContainer]: arrayMove(
                    items[overContainer],
                    activeIndex,
                    overIndex
                  )
                };
              }

              return newItems;
            });
            setActiveId(null);
          }
        } else {
          // Clean up any temporary items if dropped in an invalid location
          setItems((items) => ({
            ...items,
            Editor: items.Editor.filter(id => !id.toString().includes('_placeholder'))
          }));
          setActiveId(null);
        }

        // Set isDroppingToEditor if we're dropping from Sidebar to Editor
        setIsDroppingToEditor(activeContainer === "Sidebar" && overContainer === "Editor");
      }}
      cancelDrop={cancelDrop}
      onDragCancel={onDragCancel}
      modifiers={modifiers}
    >
      <div
        style={{
          display: 'inline-grid',
          boxSizing: 'border-box',
          padding: 20,
          gridAutoFlow: vertical ? 'row' : 'column',
        }}
      >

        {/* Editor */}
        <div>
          <h3 className='text-xl font-bold px-3'>Editor</h3>

          <DroppableContainer
            id="Editor"
            items={items["Editor"]}
            scrollable={scrollable}
            style={containerStyle}
            unstyled={minimal}
          >
            <SortableContext items={items["Editor"]} strategy={strategy}>
              {items["Editor"].map((value, index) => {
                return (
                  <SortableItem
                    disabled={isSortingContainer}
                    key={value}
                    id={value}
                    index={index}
                    handle={handle}
                    style={getItemStyles}
                    wrapperStyle={wrapperStyle}
                    containerId="Editor"
                    getIndex={getIndex}
                  />
                );
              })}
            </SortableContext>
          </DroppableContainer>
        </div>

        {/* Sidebar */}
        <div>
          <h3 className='text-xl font-bold px-3'>Sidebar</h3>
          <DroppableContainer
            id="Sidebar"
            items={items["Sidebar"]}
            scrollable={scrollable}
            style={containerStyle}
            unstyled={minimal}
            hover={false}
          >
            {items["Sidebar"].map((value, index) => {
              return (
                <SortableItem
                  disabled={isSortingContainer}
                  key={value}
                  id={value}
                  index={index}
                  handle={handle}
                  style={getItemStyles}
                  wrapperStyle={wrapperStyle}
                  containerId="Sidebar"
                  getIndex={getIndex}
                />
              );
            })}
          </DroppableContainer>
        </div>
      </div>
      {createPortal(
        <DragOverlay
          adjustScale={adjustScale}
          dropAnimation={{
            duration: 0,
            sideEffects: defaultDropAnimationSideEffects({
              styles: {
                active: {
                  opacity: '0.5'
                }
              }
            })
          }}
        >
          {activeId
            ? containers.includes(activeId)
              ? renderContainerDragOverlay(activeId)
              : renderSortableItemDragOverlay(activeId)
            : null}
        </DragOverlay>,
        document.body
      )}
    </DndContext>
  );

  function renderSortableItemDragOverlay(id: UniqueIdentifier) {
    return (
      <Item
        value={id}
        handle={handle}
        style={getItemStyles({
          containerId: findContainer(id) as UniqueIdentifier,
          overIndex: -1,
          index: getIndex(id),
          value: id,
          isSorting: true,
          isDragging: true,
          isDragOverlay: true,
        })}
        color={getColor(id)}
        wrapperStyle={wrapperStyle({ index: 0 })}
        dragOverlay
      />
    );
  }

  function renderContainerDragOverlay(containerId: UniqueIdentifier) {
    return (
      <Container
        style={{
          height: '100%',
        }}
        shadow
        unstyled={false}
      >
        {items[containerId].map((item, index) => (
          <Item
            key={item}
            value={item}
            handle={handle}
            style={getItemStyles({
              containerId,
              overIndex: -1,
              index: getIndex(item),
              value: item,
              isDragging: false,
              isSorting: false,
              isDragOverlay: false,
            })}
            color={getColor(item)}
            wrapperStyle={wrapperStyle({ index })}
          />
        ))}
      </Container>
    );
  }
}

function getColor(id: UniqueIdentifier) {
  if (id.toString() === 'Paragraph' || id.toString() === 'Heading' || id.toString() === 'Image') {
    return '#ffda6c';
  }
  if (id.toString().includes('Paragraph element') || id.toString().includes('Heading element') || id.toString().includes('Image element')) {
    return '#7193f1';
  }
  // switch (String(id)) {
  //   case 'Paragraph':
  //   case 'Heading':
  //   case 'Image':
  //     return '#7193f1';
  //   case 'Paragraph element':
  //   case 'Heading element':
  //   case 'Image element':
  //     return '#ffda6c';
  //   case 'C':
  //     return '#00bcd4';
  //   case 'D':
  //     return '#ef769f';
  // }

  return undefined;
}

interface SortableItemProps {
  containerId: UniqueIdentifier;
  id: UniqueIdentifier;
  index: number;
  handle: boolean;
  disabled?: boolean;
  style(args: any): React.CSSProperties;
  getIndex(id: UniqueIdentifier): number;
  wrapperStyle({ index }: { index: number }): React.CSSProperties;
}

function SortableItem({
  disabled,
  id,
  index,
  handle,
  style,
  containerId,
  getIndex,
  wrapperStyle,
}: SortableItemProps) {
  const {
    setNodeRef,
    setActivatorNodeRef,
    listeners,
    isDragging,
    isSorting,
    over,
    overIndex,
    transform,
    transition,
  } = useSortable({
    id,
  });
  const mounted = useMountStatus();
  const mountedWhileDragging = isDragging && !mounted;

  return (
    <Item
      ref={disabled ? undefined : setNodeRef}
      value={id}
      dragging={isDragging}
      sorting={isSorting}
      handle={handle}
      handleProps={handle ? { ref: setActivatorNodeRef } : undefined}
      index={index}
      wrapperStyle={wrapperStyle({ index })}
      style={style({
        index,
        value: id,
        isDragging,
        isSorting,
        overIndex: over ? getIndex(over.id) : overIndex,
        containerId,
      })}
      color={getColor(id)}
      transition={transition}
      transform={transform}
      fadeIn={mountedWhileDragging}
      listeners={listeners}
    />
  );
}

function useMountStatus() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setIsMounted(true), 500);

    return () => clearTimeout(timeout);
  }, []);

  return isMounted;
}