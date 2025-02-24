import { SortableItemWrapper } from "@/components/Editor/components/SortableItemWrapper/SortableItemWrapper";
import { setSelectedNodeAtom } from "@/components/Editor/components/TextMenu/store";
import { cn } from "@/lib/utils";
import { type NodeViewProps } from "@tiptap/react";
import { useSetAtom } from "jotai";
import React, { useCallback, useRef, useState } from "react";
import type { ImageBlockProps } from "../ImageBlock.types";

export const ImageBlockComponent: React.FC<
  ImageBlockProps & {
    nodeKey?: string;
    selected?: boolean;
    draggable?: boolean;
    onFileSelect?: (file: File) => void;
  }
> = ({
  sourcePath,
  alt,
  alignment,
  borderWidth,
  borderRadius,
  borderColor,
  isUploading,
  onFileSelect,
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.dataTransfer.types.includes('Files')) {
        const items = Array.from(e.dataTransfer.items);
        const hasImageFile = items.some(item => item.type.startsWith('image/'));
        if (hasImageFile) {
          setIsDragging(true);
          e.dataTransfer.dropEffect = 'copy';
        }
      }
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    }, []);

    const handleDragEnter = useCallback((e: React.DragEvent) => {
      console.log('handleDragEnter', e.dataTransfer.types);
      e.preventDefault();
      e.stopPropagation();

      if (e.dataTransfer.types.includes('Files')) {
        const items = Array.from(e.dataTransfer.items);
        const hasImageFile = items.some(item => item.type.startsWith('image/'));
        if (hasImageFile) {
          setIsDragging(true);
        }
      }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      // Check if we have files and at least one is an image
      const files = Array.from(e.dataTransfer.files);

      const imageFile = files.find(file => file.type.startsWith('image/'));
      if (imageFile && onFileSelect) {
        onFileSelect(imageFile);
      }
    }, [onFileSelect]);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && onFileSelect) {
        onFileSelect(file);
      }
    }, [onFileSelect]);

    const handleBrowseClick = useCallback(() => {
      fileInputRef.current?.click();
    }, []);

    if (!sourcePath) {
      return (
        <div
          className={cn(
            "w-full h-[160px] bg-gray-100 rounded-md flex flex-col items-center justify-center cursor-pointer transition-colors",
            isDragging && "border-primary bg-gray-50"
          )}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{ pointerEvents: 'all' }}
        >
          <p className="mb-2 pointer-events-none text-sm">
            Drag and drop image, or&#160;
            <button
              className="underline font-medium pointer-events-none"
              onClick={handleBrowseClick}
            >
              Browse
            </button>
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      );
    }

    return (
      <div className="w-full node-element">
        <img
          src={sourcePath}
          alt={alt}
          className={cn(
            "max-w-full h-auto",
            {
              left: "mr-auto",
              center: "mx-auto",
              right: "ml-auto",
            }[alignment],
            isUploading && "opacity-50"
          )}
          style={{
            borderWidth: `${borderWidth}px`,
            borderRadius: `${borderRadius}px`,
            borderColor,
            borderStyle: borderWidth > 0 ? "solid" : "none",
          }}
          draggable={false}
        />
      </div>
    );
  };

export const ImageBlockView = (props: NodeViewProps) => {
  const setSelectedNode = useSetAtom(setSelectedNodeAtom);

  const handleSelect = useCallback(() => {
    console.log('handleSelect', props.getPos());
    const pos = props.getPos();
    const node = props.editor.state.doc.nodeAt(pos);
    if (node) {
      props.editor.commands.blur()
      setSelectedNode(node);
    }
  }, [props.editor, props.getPos, setSelectedNode]);

  const handleFileSelect = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const pos = props.getPos();
      const node = props.editor.state.doc.nodeAt(pos);
      if (node) {
        props.editor
          .chain()
          .focus()
          .setNodeSelection(pos)
          .updateAttributes('imageBlock', {
            sourcePath: reader.result as string,
            isUploading: false,
          })
          .run();
      } else {
        console.log('Node not found at position:', pos);
      }
    };
    reader.readAsDataURL(file);
  }, [props.editor, props.getPos]);

  // console.log(props.node.attrs)

  return (
    <SortableItemWrapper
      id={props.node.attrs.id}
      className={cn(props.node.attrs.isSelected && 'selected-element')}
      onClick={handleSelect}
      editor={props.editor}
    >
      <ImageBlockComponent
        {...(props.node.attrs as ImageBlockProps)}
        onFileSelect={handleFileSelect}
      />
    </SortableItemWrapper>
  );
};
