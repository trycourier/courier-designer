import { uploadImage } from "@/lib/api/uploadImage";
import { cn } from "@/lib/utils";
import type { Editor, NodeViewProps } from "@tiptap/react";
import { useAtomValue, useSetAtom } from "jotai";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { apiUrlAtom, clientKeyAtom, tenantIdAtom, tokenAtom } from "../../../Providers/store";
import { Loader } from "../../../ui/Loader/Loader";
import { SortableItemWrapper } from "../../../ui/SortableItemWrapper";
import { setSelectedNodeAtom } from "../../../ui/TextMenu/store";
import type { ImageBlockProps } from "../ImageBlock.types";

export const ImageBlockComponent: React.FC<
  ImageBlockProps & {
    nodeKey?: string;
    selected?: boolean;
    draggable?: boolean;
    onFileSelect?: (file: File) => void;
    width: number;
    imageNaturalWidth: number;
    editor?: Editor;
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
  const [isImageLoading, setIsImageLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (sourcePath) {
      setIsImageLoading(true);
    }
  }, [sourcePath]);

  // Update imageNaturalWidth when image loads
  useEffect(() => {
    if (sourcePath && !imageNaturalWidth && editor) {
      const img = new Image();
      img.onload = () => {
        try {
          if (!editor.view || !editor.state) return;
          const pos = editor.view.state.selection.from;
          editor
            .chain()
            .setNodeSelection(pos)
            .updateAttributes("imageBlock", {
              imageNaturalWidth: img.naturalWidth,
            })
            .run();
        } catch (error) {
          // console.warn('Editor not ready for image update:', error);
        }
      };
      img.src = sourcePath;
    }
  }, [sourcePath, imageNaturalWidth, editor]);

  // Memoize the width percentage calculation to avoid recalculations
  const calculateWidthPercentage = useCallback(
    (naturalWidth: number) => {
      // Get the editor's container width
      const editorContainer = editor?.view?.dom?.closest(".ProseMirror");
      const containerWidth = editorContainer?.clientWidth || 1000;
      const percentage = Math.min(100, (naturalWidth / containerWidth) * 100);

      // Round to integer
      return Math.round(percentage);
    },
    [editor]
  );

  // Memoize the original width percentage to avoid recalculations during renders
  const originalWidthPercentage = useMemo(
    () => calculateWidthPercentage(imageNaturalWidth),
    [calculateWidthPercentage, imageNaturalWidth]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer.types.includes("Files")) {
      const items = Array.from(e.dataTransfer.items);
      const hasImageFile = items.some((item) => item.type.startsWith("image/"));
      if (hasImageFile) {
        setIsDragging(true);
        e.dataTransfer.dropEffect = "copy";
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

    if (e.dataTransfer.types.includes("Files")) {
      const items = Array.from(e.dataTransfer.items);
      const hasImageFile = items.some((item) => item.type.startsWith("image/"));
      if (hasImageFile) {
        setIsDragging(true);
      }
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      // Check if we have files and at least one is an image
      const files = Array.from(e.dataTransfer.files);

      const imageFile = files.find((file) => file.type.startsWith("image/"));
      if (imageFile && onFileSelect) {
        onFileSelect(imageFile);
      }
    },
    [onFileSelect]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && onFileSelect) {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  if (!sourcePath) {
    return (
      <div
        className={cn(
          "courier-w-full node-element courier-empty-image courier-h-[160px] courier-bg-gray-100 courier-rounded-md courier-flex courier-flex-row courier-items-center courier-justify-center courier-cursor-pointer courier-transition-colors courier-flex-1",
          isDragging && "courier-border-primary courier-bg-gray-50"
        )}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{ pointerEvents: "all" }}
      >
        {isUploading ? (
          <Loader className="courier-w-8 courier-h-8" />
        ) : (
          <>
            <span className="courier-text-sm courier-pointer-events-none courier-inline-block">
              Drag and drop image, or&#160;
            </span>
            <button
              className="courier-underline courier-font-medium courier-inline-block courier-text-sm"
              onClick={handleBrowseClick}
            >
              Browse
            </button>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="courier-hidden"
          onChange={handleFileSelect}
        />
      </div>
    );
  }

  return (
    <div className="courier-w-full node-element">
      <div
        className={cn(
          "courier-relative",
          (isUploading || isImageLoading) &&
            "courier-min-h-[200px] courier-min-w-[300px] courier-bg-gray-100"
        )}
      >
        {(isUploading || isImageLoading) && (
          <div className="courier-absolute courier-inset-0 courier-flex courier-items-center courier-justify-center">
            <Loader className="courier-w-8 courier-h-8" />
          </div>
        )}
        <img
          ref={imgRef}
          src={sourcePath}
          alt={alt}
          className={cn(
            "courier-h-auto courier-inline-block courier-w-full",
            {
              left: "courier-mr-auto",
              center: "courier-mx-auto",
              right: "courier-ml-auto",
            }[alignment],
            isUploading && "courier-opacity-50",
            (isUploading || isImageLoading) && "courier-invisible"
          )}
          style={{
            maxWidth: width === originalWidthPercentage ? `${imageNaturalWidth}px` : `${width}%`,
            borderWidth: `${borderWidth}px`,
            borderRadius: `${borderRadius}px`,
            borderColor,
            borderStyle: borderWidth > 0 ? "solid" : "none",
            display: "block",
          }}
          loading="lazy"
          decoding="async"
          draggable={false}
          onLoad={(e) => {
            setIsImageLoading(false);
            // Update imageNaturalWidth from the actual loaded image if needed
            if (!imageNaturalWidth && editor) {
              try {
                if (!editor.view || !editor.state) return;
                setTimeout(() => {
                  const pos = editor.view.state.selection.from;
                  editor
                    .chain()
                    .setNodeSelection(pos)
                    .updateAttributes("imageBlock", {
                      imageNaturalWidth: (e.target as HTMLImageElement).naturalWidth,
                    })
                    .run();
                }, 100);
              } catch (error) {
                console.warn("Editor not ready for image update:", error);
              }
            }
          }}
          onError={() => setIsImageLoading(false)}
        />
      </div>
    </div>
  );
};

export const ImageBlockView = (props: NodeViewProps) => {
  const setSelectedNode = useSetAtom(setSelectedNodeAtom);
  const apiUrl = useAtomValue(apiUrlAtom);
  const token = useAtomValue(tokenAtom);
  const tenantId = useAtomValue(tenantIdAtom);
  const clientKey = useAtomValue(clientKeyAtom);

  const calculateWidthPercentage = useCallback(
    (naturalWidth: number) => {
      // Get the editor's container width
      const editorContainer = props.editor?.view?.dom?.closest(".ProseMirror");
      const containerWidth = editorContainer?.clientWidth || 1000;
      const percentage = Math.min(100, (naturalWidth / containerWidth) * 100);

      // Round to integer
      return Math.round(percentage);
    },
    [props.editor]
  );

  // Add useEffect for initial image load
  useEffect(() => {
    const node = props.editor.state.doc.nodeAt(props.getPos());
    // Only set natural width if it's not already set, but preserve the existing width value
    if (node?.attrs?.sourcePath && !node?.attrs?.imageNaturalWidth) {
      const img = new Image();
      img.onload = () => {
        // Only calculate width percentage if no width is set
        const widthPercentage = node.attrs.width || calculateWidthPercentage(img.naturalWidth);

        props.editor
          .chain()
          .focus()
          .setNodeSelection(props.getPos())
          .updateAttributes("imageBlock", {
            width: widthPercentage,
            imageNaturalWidth: img.naturalWidth,
          })
          .run();
      };
      img.src = node.attrs.sourcePath;
    }
  }, [props, props.getPos, calculateWidthPercentage]);

  const handleSelect = useCallback(() => {
    if (!props.editor.isEditable) {
      return;
    }

    const pos = props.getPos();
    const node = props.editor.state.doc.nodeAt(pos);
    if (node) {
      props.editor.commands.blur();
      setSelectedNode(node);
    }
  }, [props, setSelectedNode]);

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!apiUrl || !token || !tenantId) {
        toast.error("Missing configuration for image upload");
        return;
      }

      // Show uploading state immediately
      const pos = props.getPos();
      const node = props.editor.state.doc.nodeAt(pos);
      if (node) {
        props.editor
          .chain()
          .focus()
          .setNodeSelection(pos)
          .updateAttributes("imageBlock", {
            isUploading: true,
          })
          .run();
      }

      try {
        // Validate basic file properties to catch obvious issues
        if (!file.type.startsWith("image/")) {
          throw new Error("Only image files are supported");
        }

        // First check if file can be read properly
        const reader = new FileReader();
        reader.readAsDataURL(file);

        await new Promise((resolve, reject) => {
          reader.onload = resolve;
          reader.onerror = reject;
        });

        // Now upload the image once we know the file is valid
        const imageUrl = await uploadImage(file, {
          apiUrl,
          token,
          tenantId,
          clientKey,
        });

        // Update the node with the uploaded image URL
        const pos = props.getPos();
        const node = props.editor.state.doc.nodeAt(pos);
        if (node) {
          // Get the natural width of the uploaded image
          const img = new Image();
          img.src = imageUrl;

          await new Promise((resolve) => {
            img.onload = resolve;
          });

          const widthPercentage = calculateWidthPercentage(img.naturalWidth);

          props.editor
            .chain()
            .focus()
            .setNodeSelection(pos)
            .updateAttributes("imageBlock", {
              sourcePath: imageUrl,
              isUploading: false,
              width: widthPercentage,
              imageNaturalWidth: img.naturalWidth,
            })
            .run();
        }
      } catch (error) {
        console.error("Error uploading image:", error);
        let errorMessage = "Failed to upload image";

        if (error instanceof Error) {
          const errorText = error.message;

          if (errorText.includes("GraphQL error")) {
            errorMessage = "Server error: Could not process image";
          } else if (errorText.includes("network") || errorText.includes("fetch")) {
            errorMessage = "Network error: Could not upload image";
          }
        }

        toast.error(errorMessage);

        // Reset uploading state on error
        const pos = props.getPos();
        const node = props.editor.state.doc.nodeAt(pos);
        if (node) {
          props.editor
            .chain()
            .focus()
            .setNodeSelection(pos)
            .updateAttributes("imageBlock", {
              isUploading: false,
            })
            .run();
        }
      }
    },
    [props, calculateWidthPercentage, apiUrl, token, tenantId, clientKey]
  );

  return (
    <SortableItemWrapper
      id={props.node.attrs.id}
      className={cn(props.node.attrs.isSelected && "selected-element")}
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
