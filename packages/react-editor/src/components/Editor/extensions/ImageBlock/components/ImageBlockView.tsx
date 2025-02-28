import { SortableItemWrapper } from "@/components/Editor/components/SortableItemWrapper/SortableItemWrapper";
import { setSelectedNodeAtom } from "@/components/Editor/components/TextMenu/store";
import { cn } from "@/lib/utils";
import { type NodeViewProps } from "@tiptap/react";
import { useSetAtom } from "jotai";
import React, { useCallback, useRef, useState, useMemo } from "react";
import type { ImageBlockProps } from "../ImageBlock.types";

// Maximum dimensions for stored images to improve performance
// Smaller dimensions for email compatibility
const MAX_IMAGE_DIMENSION = 800;
// Maximum file size for email attachments (in bytes, ~500KB)
const MAX_FILE_SIZE = 500 * 1024;

// Helper function to resize an image before storing it
const resizeImage = (file: File, maxDimension: number): Promise<{ dataUrl: string, width: number, height: number }> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        let newWidth, newHeight;
        if (img.width > img.height) {
          newWidth = Math.min(maxDimension, img.width);
          newHeight = Math.round((img.height / img.width) * newWidth);
        } else {
          newHeight = Math.min(maxDimension, img.height);
          newWidth = Math.round((img.width / img.height) * newHeight);
        }

        // Create canvas for resizing
        const canvas = document.createElement('canvas');
        canvas.width = newWidth;
        canvas.height = newHeight;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          // Use better quality settings for resizing
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, newWidth, newHeight);

          // Start with higher quality
          let quality = 0.8;
          let dataUrl = canvas.toDataURL(file.type || 'image/jpeg', quality);

          // Reduce quality if the file is still too large
          // This helps ensure email compatibility
          let iterations = 0;
          const maxIterations = 5;

          while (dataUrl.length > MAX_FILE_SIZE && iterations < maxIterations) {
            iterations++;
            quality -= 0.1;
            if (quality < 0.3) quality = 0.3; // Don't go below 0.3 quality
            dataUrl = canvas.toDataURL(file.type || 'image/jpeg', quality);
          }

          resolve({
            dataUrl,
            width: newWidth,
            height: newHeight
          });
        } else {
          // Fallback if canvas context not available
          resolve({
            dataUrl: e.target?.result as string,
            width: img.width,
            height: img.height
          });
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

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

    // Memoize the width percentage calculation to avoid recalculations
    const calculateWidthPercentage = useCallback((naturalWidth: number) => {
      // Get the editor's container width
      const editorContainer = editor?.view?.dom?.closest('.ProseMirror');
      const containerWidth = editorContainer?.clientWidth || 1000;
      const percentage = Math.min(100, (naturalWidth / containerWidth) * 100);

      // Round to integer
      return Math.round(percentage);
    }, [editor]);

    // Memoize the original width percentage to avoid recalculations during renders
    const originalWidthPercentage = useMemo(() =>
      calculateWidthPercentage(imageNaturalWidth),
      [calculateWidthPercentage, imageNaturalWidth]);

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
            loading="lazy"
            decoding="async"
            draggable={false}
          />
        </div>
      </div>
    );
  };

export const ImageBlockView = (props: NodeViewProps) => {
  const setSelectedNode = useSetAtom(setSelectedNodeAtom);

  // Memoize the width percentage calculation to avoid recalculations
  const calculateWidthPercentage = useCallback((naturalWidth: number) => {
    // Get the editor's container width
    const editorContainer = props.editor?.view?.dom?.closest('.ProseMirror');
    const containerWidth = editorContainer?.clientWidth || 1000;
    const percentage = Math.min(100, (naturalWidth / containerWidth) * 100);

    // Round to integer
    return Math.round(percentage);
  }, [props.editor]);

  const handleSelect = useCallback(() => {
    if (!props.editor.isEditable) {
      return
    }

    const pos = props.getPos();
    const node = props.editor.state.doc.nodeAt(pos);
    if (node) {
      props.editor.commands.blur()
      setSelectedNode(node);
    }
  }, [props.editor, props.getPos, setSelectedNode]);

  const handleFileSelect = useCallback((file: File) => {
    // Show uploading state immediately
    const pos = props.getPos();
    const node = props.editor.state.doc.nodeAt(pos);
    if (node) {
      props.editor
        .chain()
        .focus()
        .setNodeSelection(pos)
        .updateAttributes('imageBlock', {
          isUploading: true,
        })
        .run();
    }

    // Resize the image before storing it
    resizeImage(file, MAX_IMAGE_DIMENSION).then(({ dataUrl, width }) => {
      const pos = props.getPos();
      const node = props.editor.state.doc.nodeAt(pos);
      if (node) {
        const widthPercentage = calculateWidthPercentage(width);

        props.editor
          .chain()
          .focus()
          .setNodeSelection(pos)
          .updateAttributes('imageBlock', {
            sourcePath: dataUrl,
            isUploading: false,
            width: widthPercentage,
            imageNaturalWidth: width
          })
          .run();
      } else {
        console.log('Node not found at position:', pos);
      }
    });
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
