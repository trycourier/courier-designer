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
    width: number;
    imageNaturalWidth: number;
    editor?: any;
  }
> = ({
  sourcePath,
  alt,
  alignment,
  borderWidth,
  borderRadius,
  borderColor,
  isUploading,
  width,
  imageNaturalWidth,
  onFileSelect,
  editor,
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const calculateWidthPercentage = useCallback((naturalWidth: number) => {
      // Get the editor's container width
      const editorContainer = editor?.view?.dom?.closest('.ProseMirror');
      const containerWidth = editorContainer?.clientWidth || 1000;
      const percentage = Math.min(100, (naturalWidth / containerWidth) * 100);

      // Round to integer
      const roundedPercentage = Math.round(percentage);

      return roundedPercentage;
    }, [editor]);

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
            "w-full node-element empty-image h-[160px] bg-gray-100 rounded-md flex flex-row items-center justify-center cursor-pointer transition-colors flex-1",
            isDragging && "border-primary bg-gray-50"
          )}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{ pointerEvents: 'all' }}
        >
          <span className="text-sm pointer-events-none inline-block">
            Drag and drop image, or&#160;
          </span>
          <button
            className="underline font-medium inline-block text-sm"
            onClick={handleBrowseClick}
          >
            Browse
          </button>
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

    // Calculate the original width percentage
    const originalWidthPercentage = calculateWidthPercentage(imageNaturalWidth);

    return (
      <div className="w-full node-element">
        <div>
          <img
            src={sourcePath}
            alt={alt}
            className={cn(
              "h-auto inline-block",
              {
                left: "mr-auto",
                center: "mx-auto",
                right: "ml-auto",
              }[alignment],
              isUploading && "opacity-50"
            )}
            style={{
              width: `${width}%`,
              // Only apply maxWidth when in Original mode (width equals the calculated original percentage)
              maxWidth: width === originalWidthPercentage ? `${imageNaturalWidth}px` : 'none',
              borderWidth: `${borderWidth}px`,
              borderRadius: `${borderRadius}px`,
              borderColor,
              borderStyle: borderWidth > 0 ? "solid" : "none",
              display: 'block'
            }}
            draggable={false}
          />
        </div>
      </div>
    );
  };

export const ImageBlockView = (props: NodeViewProps) => {
  const setSelectedNode = useSetAtom(setSelectedNodeAtom);

  const calculateWidthPercentage = useCallback((naturalWidth: number) => {
    // Get the editor's container width
    const editorContainer = props.editor?.view?.dom?.closest('.ProseMirror');
    const containerWidth = editorContainer?.clientWidth || 1000;
    const percentage = Math.min(100, (naturalWidth / containerWidth) * 100);

    // Round to integer
    const roundedPercentage = Math.round(percentage);

    return roundedPercentage;
  }, [props.editor]);

  const handleSelect = useCallback(() => {
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
      const result = reader.result as string;
      // Create an image element to get natural dimensions
      const img = new Image();
      img.onload = () => {
        const widthPercentage = calculateWidthPercentage(img.naturalWidth);

        const pos = props.getPos();
        const node = props.editor.state.doc.nodeAt(pos);
        if (node) {
          props.editor
            .chain()
            .focus()
            .setNodeSelection(pos)
            .updateAttributes('imageBlock', {
              sourcePath: result,
              isUploading: false,
              width: widthPercentage,
              imageNaturalWidth: img.naturalWidth
            })
            .run();
        } else {
          console.log('Node not found at position:', pos);
        }
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  }, [props.editor, props.getPos, calculateWidthPercentage]);

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
        editor={props.editor}
      />
    </SortableItemWrapper>
  );
};
