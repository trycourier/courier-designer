import { cn } from "@/lib/utils";
import { MAX_IMAGE_DIMENSION, resizeImage } from "@/lib/utils/image";
import { useCallback, useRef, useState } from "react";

export interface LogoUploaderProps {
  onFileSelect?: (dataUrl: string) => void;
}

export const LogoUploader: React.FC<LogoUploaderProps> = ({ onFileSelect }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileUpload = useCallback(
    async (file: File) => {
      try {
        const { dataUrl } = await resizeImage(file, MAX_IMAGE_DIMENSION);
        onFileSelect?.(dataUrl);
        // Reset the file input after successful upload
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } catch (error) {
        console.error("Error processing image:", error);
        // Reset on error too
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [onFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      const imageFile = files.find((file) => file.type.startsWith("image/"));
      if (imageFile) {
        handleFileUpload(imageFile);
      }
    },
    [handleFileUpload]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileUpload(file);
      }
    },
    [handleFileUpload]
  );

  const handleBrowseClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fileInputRef.current?.click();
  }, []);

  return (
    <div
      className={cn(
        "courier-bg-gray-100 courier-rounded-md courier-flex courier-flex-row courier-items-center courier-cursor-pointer courier-transition-colors courier-py-4 courier-px-6 courier-gap-1 !courier-w-fit",
        isDragging && "courier-border-primary courier-bg-gray-50"
      )}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{ pointerEvents: "all" }}
    >
      <span className="courier-text-sm courier-pointer-events-none">Drag and drop logo, or</span>
      <button
        className="courier-underline courier-font-medium courier-text-sm"
        onClick={handleBrowseClick}
        type="button"
      >
        Browse
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="courier-hidden"
        onChange={handleFileSelect}
        key="logo-input" // Force React to recreate the input
      />
    </div>
  );
};
