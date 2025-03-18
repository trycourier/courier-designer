import { Button } from "@/components/ui-kit/Button";
import { cn } from "@/lib/utils";
import { MAX_IMAGE_DIMENSION, resizeImage } from "@/lib/utils/image";
import { Editor, EditorContent } from "@tiptap/react";
import { useSetAtom } from "jotai";
import { forwardRef, useCallback, useMemo, useRef, useState } from "react";
import { Doc as YDoc } from "yjs";
import { pageAtom } from "../../../store";
import { SideBar, ThemeFormValues } from "./SideBar";
import { useBlockEditor } from "./useBlockEditor";
import { FacebookIcon, LinkedinIcon, InstagramIcon, MediumIcon, XIcon } from "@/components/ui-kit/Icon";
// import { TextMenu } from "../../TextMenu";

interface LogoUploaderProps {
  onFileSelect?: (dataUrl: string) => void;
}

const LogoUploader: React.FC<LogoUploaderProps> = ({ onFileSelect }) => {
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

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    if (imageFile) {
      handleFileUpload(imageFile);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  }, []);

  const handleFileUpload = useCallback(async (file: File) => {
    try {
      const { dataUrl } = await resizeImage(file, MAX_IMAGE_DIMENSION);
      onFileSelect?.(dataUrl);
      // Reset the file input after successful upload
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error('Error processing image:', error);
      // Reset on error too
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [onFileSelect]);

  const handleBrowseClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fileInputRef.current?.click();
  }, []);

  return (
    <div
      className={cn(
        "bg-gray-100 rounded-md flex flex-row items-center cursor-pointer transition-colors py-4 px-6 gap-1 !w-fit",
        isDragging && "border-primary bg-gray-50"
      )}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{ pointerEvents: 'all' }}
    >
      <span className="text-sm pointer-events-none">
        Drag and drop logo, or
      </span>
      <button
        className="underline font-medium text-sm"
        onClick={handleBrowseClick}
        type="button"
      >
        Browse
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
        key="logo-input" // Force React to recreate the input
      />
    </div>
  );
};

type ThemeEditorProps = {
  editor: Editor;
  className?: string;
  isVisible?: boolean;
}

export const ThemeEditor = forwardRef<HTMLDivElement, ThemeEditorProps>(({ isVisible }, ref) => {
  const setPage = useSetAtom(pageAtom);
  const [form, setForm] = useState<ThemeFormValues>();

  const ydoc = useMemo(() => new YDoc(), []);

  const { editor } = useBlockEditor({
    ydoc,
    // onUpdate: () => { },
    variables: {
      user: {
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com"
      },
      company: {
        name: "Acme Inc",
        address: {
          street: "123 Main St",
          city: "San Francisco"
        }
      }
    },
    setSelectedNode: () => { }
  });

  const handleLogoSelect = useCallback((dataUrl: string) => {
    setForm(prevForm => ({
      headerStyle: prevForm?.headerStyle || "plain",
      brandColor: prevForm?.brandColor || "#000000",
      textColor: prevForm?.textColor || "#000000",
      subtleColor: prevForm?.subtleColor || "#737373",
      ...prevForm,
      logo: dataUrl,
    }));
  }, []);

  return (
    <>
      <div className={cn("z-30 w-full h-12", !isVisible && "hidden")}>
        <div className="flex w-full border-t-0 border-l-0 border-r-0 border-b rounded-b-none rounded-t-sm shadow-none bg-white h-full px-4 items-center justify-between">
          <div className="text-sm font-medium">Brand theme</div>
          <div className="flex gap-2">
            <Button variant="outline" buttonSize="small" onClick={() => setPage("template")}>
              Cancel
            </Button>
            <Button variant="primary" buttonSize="small" onClick={() => setPage("template")}>
              Save
            </Button>
          </div>
        </div>
        {/* <TextMenu editor={editor} /> */}
      </div>

      <div className={cn(
        "flex flex-1 overflow-hidden",
        !isVisible && "hidden"
      )}>
        <div className="editor-container" ref={ref}>
          <div className="mb-3 max-w-2xl self-center w-full">Header</div>
          <div className="editor-main transition-all duration-300 ease-in-out p-10 mb-8 relative overflow-hidden flex flex-col items-start">
            {form?.headerStyle === "border" && <div className="absolute top-0 left-0 right-0 h-2" style={{ backgroundColor: form.brandColor }} />}
            {form?.logo ? (
              <img
                src={form.logo}
                alt="Brand logo"
                className="w-auto object-contain cursor-default"
              />
            ) : (
              <LogoUploader onFileSelect={handleLogoSelect} />
            )}
          </div>
          <div className="mb-3 max-w-2xl self-center w-full">Footer</div>
          <div className="theme-editor-main transition-all duration-300 ease-in-out p-10">
            <EditorContent
              editor={editor}
            // onClick={handleEditorClick}
            />
            <div className="flex justify-end items-center gap-2">
              {form?.facebookLink && <a href={form.facebookLink} target="_blank" rel="noopener noreferrer"><FacebookIcon className="w-5 h-5" /></a>}
              {form?.linkedinLink && <a href={form.linkedinLink} target="_blank" rel="noopener noreferrer"><LinkedinIcon className="w-5 h-5" /></a>}
              {form?.instagramLink && <a href={form.instagramLink} target="_blank" rel="noopener noreferrer"><InstagramIcon className="w-5 h-5" /></a>}
              {form?.mediumLink && <a href={form.mediumLink} target="_blank" rel="noopener noreferrer"><MediumIcon className="w-5 h-5" /></a>}
              {form?.xLink && <a href={form.xLink} target="_blank" rel="noopener noreferrer"><XIcon className="w-5 h-5" /></a>}
            </div>
          </div>
        </div>
        <div
          className="editor-sidebar opacity-100 translate-x-0 w-64 flex-shrink-0"
        >
          <div className="p-4 h-full">
            <SideBar editor={editor} setForm={setForm} currentForm={form} />
          </div>
        </div>
      </div>
    </>
  );
});
