import { cn } from "@/lib/utils";
import type { NodeViewProps } from "@tiptap/react";
import { useSetAtom } from "jotai";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { templateErrorAtom } from "../../../Providers/store";
import { useImageUpload } from "../../../Providers/useImageUpload";
import { Loader } from "../../../ui/Loader/Loader";
import { SortableItemWrapper } from "../../../ui/SortableItemWrapper";
import { setSelectedNodeAtom } from "../../../ui/TextMenu/store";
import type { ImageBlockProps } from "../ImageBlock.types";
import { safeGetPos, safeGetNodeAtPos } from "../../../utils";
import { isBlankImageSrc } from "@/lib/utils/image";

// Allowed image types (excludes SVG for email compatibility)
const allowedImageTypes = ["image/png", "image/jpeg", "image/gif", "image/webp"];

export const ImageBlockComponent: React.FC<
  ImageBlockProps & {
    nodeKey?: string;
    selected?: boolean;
    draggable?: boolean;
    onFileSelect?: (file: File) => void;
    width: number;
  }
> = ({
  sourcePath,
  alt,
  alignment,
  borderWidth,
  borderColor,
  isUploading,
  width,
  onFileSelect,
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

  const isAllowedImageType = useCallback((type: string) => allowedImageTypes.includes(type), []);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.dataTransfer.types.includes("Files")) {
        const items = Array.from(e.dataTransfer.items);
        const hasImageFile = items.some((item) => isAllowedImageType(item.type));
        if (hasImageFile) {
          setIsDragging(true);
          e.dataTransfer.dropEffect = "copy";
        }
      }
    },
    [isAllowedImageType]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.dataTransfer.types.includes("Files")) {
        const items = Array.from(e.dataTransfer.items);
        const hasImageFile = items.some((item) => isAllowedImageType(item.type));
        if (hasImageFile) {
          setIsDragging(true);
        }
      }
    },
    [isAllowedImageType]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      // Check if we have files and at least one is an allowed image type
      const files = Array.from(e.dataTransfer.files);

      const imageFile = files.find((file) => isAllowedImageType(file.type));
      if (imageFile && onFileSelect) {
        onFileSelect(imageFile);
      }
    },
    [onFileSelect, isAllowedImageType]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && onFileSelect) {
        onFileSelect(file);
      }
      // Reset file input so the same file can be selected again
      if (e.target) {
        e.target.value = "";
      }
    },
    [onFileSelect]
  );

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  if (isBlankImageSrc(sourcePath)) {
    return (
      <div
        className={cn(
          "courier-w-full node-element courier-empty-image courier-h-[160px] courier-bg-gray-100 courier-rounded-md courier-flex courier-flex-row courier-items-center courier-justify-center courier-cursor-pointer courier-transition-colors courier-flex-1 courier-text-center courier-flex-wrap courier-content-center courier-p-4",
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
          accept="image/png, image/jpeg, image/gif, image/webp"
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
          "courier-relative courier-p-1",
          (isUploading || isImageLoading) &&
            "courier-w-full courier-aspect-[4/3] courier-bg-gray-100"
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
            maxWidth: `${width}%`,
            borderWidth: `${borderWidth}px`,
            borderColor,
            borderStyle: borderWidth > 0 ? "solid" : "none",
            display: "block",
          }}
          loading="lazy"
          decoding="async"
          draggable={false}
          onLoad={() => {
            setIsImageLoading(false);
            // imageNaturalWidth is handled by ImageBlockView's useEffect which has
            // access to the correct node position via props.getPos.
          }}
          onError={() => setIsImageLoading(false)}
        />
      </div>
    </div>
  );
};

// Allowed image types (excludes SVG for email compatibility)
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

export const ImageBlockView = (props: NodeViewProps) => {
  const setSelectedNode = useSetAtom(setSelectedNodeAtom);
  const setTemplateError = useSetAtom(templateErrorAtom);
  const { uploadImage } = useImageUpload();

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

  // Set imageNaturalWidth on initial image load without stealing focus.
  // Uses tr.setNodeMarkup instead of editor.chain().focus() to avoid
  // moving focus away from other editors (e.g., the subject VariableInput).
  useEffect(() => {
    const node = safeGetNodeAtPos(props);
    if (!node?.attrs?.sourcePath || node?.attrs?.imageNaturalWidth) return;

    const img = new Image();
    img.onload = () => {
      const pos = safeGetPos(props.getPos);
      if (pos === null) return;

      try {
        if (!props.editor.view || !props.editor.state) return;
        const currentNode = props.editor.state.doc.nodeAt(pos);
        if (!currentNode || currentNode.type.name !== "imageBlock") return;

        const widthPercentage =
          currentNode.attrs.width || calculateWidthPercentage(img.naturalWidth);

        const { tr } = props.editor.state;
        tr.setNodeMarkup(pos, undefined, {
          ...currentNode.attrs,
          width: widthPercentage,
          imageNaturalWidth: img.naturalWidth,
        });
        props.editor.view.dispatch(tr);
      } catch {
        // Editor not ready
      }
    };
    img.src = node.attrs.sourcePath;
  }, [props, calculateWidthPercentage]);

  const handleSelect = useCallback(() => {
    if (!props.editor.isEditable) {
      return;
    }

    const node = safeGetNodeAtPos(props);
    if (node) {
      props.editor.commands.blur();
      setSelectedNode(node);
    }
  }, [props, setSelectedNode]);

  const handleFileSelect = useCallback(
    async (file: File) => {
      // Show uploading state immediately and clear existing image
      const pos = safeGetPos(props.getPos);
      const node = safeGetNodeAtPos(props);
      if (node && pos !== null) {
        props.editor
          .chain()
          .focus()
          .setNodeSelection(pos)
          .updateAttributes("imageBlock", {
            isUploading: true,
            sourcePath: "", // Clear existing image to show only loading spinner
          })
          .run();
      }

      try {
        // Validate basic file properties to catch obvious issues
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
          throw new Error("Only PNG, JPEG, GIF, and WebP images are supported");
        }

        // First check if file can be read properly
        const reader = new FileReader();
        reader.readAsDataURL(file);

        await new Promise((resolve, reject) => {
          reader.onload = resolve;
          reader.onerror = reject;
        });

        // Now upload the image once we know the file is valid
        const uploadResult = await uploadImage({ file });
        const imageUrl = uploadResult.url;

        // Update the node with the uploaded image URL
        const pos = safeGetPos(props.getPos);
        const node = safeGetNodeAtPos(props);
        if (node && pos !== null) {
          // Get the natural width of the uploaded image
          const img = new Image();
          img.src = imageUrl;

          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = () => reject(new Error("Failed to load uploaded image"));
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
        let errorMessage = "Error uploading image";

        if (error instanceof Error) {
          const errorText = error.message;

          if (errorText.includes("GraphQL error")) {
            errorMessage = "Server error: Could not process image";
          } else if (errorText.includes("network") || errorText.includes("fetch")) {
            errorMessage = "Network error: Could not upload image";
          } else {
            // Use the error message directly (e.g., from custom uploader)
            errorMessage = errorText;
          }
        }

        setTemplateError({
          message: errorMessage,
          toastProps: {
            duration: 6000,
            description: `File: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`,
          },
        });

        // Reset uploading state on error
        const pos = safeGetPos(props.getPos);
        const node = safeGetNodeAtPos(props);
        if (node && pos !== null) {
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
    [props, calculateWidthPercentage, uploadImage, setTemplateError]
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
      />
    </SortableItemWrapper>
  );
};
