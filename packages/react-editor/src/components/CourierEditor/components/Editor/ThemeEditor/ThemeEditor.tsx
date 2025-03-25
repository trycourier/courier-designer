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
        "courier-bg-gray-100 courier-rounded-md courier-flex courier-flex-row courier-items-center courier-cursor-pointer courier-transition-colors courier-py-4 courier-px-6 courier-gap-1 !courier-w-fit",
        isDragging && "courier-border-primary courier-bg-gray-50"
      )}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{ pointerEvents: 'all' }}
    >
      <span className="courier-text-sm courier-pointer-events-none">
        Drag and drop logo, or
      </span>
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
      <div className={cn("courier-z-30 courier-w-full courier-h-12", !isVisible && "courier-hidden")}>
        <div className="courier-flex courier-w-full courier-border-t-0 courier-border-l-0 courier-border-r-0 courier-border-b rounded-b-none rounded-t-sm courier-shadow-none courier-bg-white courier-h-full courier-px-4 courier-items-center courier-justify-between">
          <div className="courier-text-sm courier-font-medium">Brand theme</div>
          <div className="courier-flex courier-gap-2">
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
        "courier-flex courier-flex-1 courier-overflow-hidden",
        !isVisible && "courier-hidden"
      )}>
        <div className="courier-editor-container" ref={ref}>
          <div className="courier-mb-3 courier-max-w-2xl courier-self-center courier-w-full">Header</div>
          <div className="courier-editor-main courier-transition-all courier-duration-300 courier-ease-in-out courier-p-10 courier-mb-8 courier-relative courier-overflow-hidden courier-flex courier-flex-col courier-items-start">
            {form?.headerStyle === "border" && <div className="courier-absolute courier-top-0 courier-left-0 courier-right-0 courier-h-2" style={{ backgroundColor: form.brandColor }} />}
            {form?.logo ? (
              <img
                src={form.logo}
                alt="Brand logo"
                className="courier-w-auto courier-object-contain courier-cursor-default"
              />
            ) : (
              <LogoUploader onFileSelect={handleLogoSelect} />
            )}
          </div>
          <div className="courier-mb-3 courier-max-w-2xl courier-self-center courier-w-full">Footer</div>
          <div className="courier-theme-editor-main courier-transition-all courier-duration-300 courier-ease-in-out courier-p-10">
            <EditorContent
              editor={editor}
            // onClick={handleEditorClick}
            />
            <div className="courier-flex courier-justify-end courier-items-center courier-gap-2">
              {form?.facebookLink && <a href={form.facebookLink} target="_blank" rel="noopener noreferrer"><FacebookIcon className="courier-w-5 courier-h-5" /></a>}
              {form?.linkedinLink && <a href={form.linkedinLink} target="_blank" rel="noopener noreferrer"><LinkedinIcon className="courier-w-5 courier-h-5" /></a>}
              {form?.instagramLink && <a href={form.instagramLink} target="_blank" rel="noopener noreferrer"><InstagramIcon className="courier-w-5 courier-h-5" /></a>}
              {form?.mediumLink && <a href={form.mediumLink} target="_blank" rel="noopener noreferrer"><MediumIcon className="courier-w-5 courier-h-5" /></a>}
              {form?.xLink && <a href={form.xLink} target="_blank" rel="noopener noreferrer"><XIcon className="courier-w-5 courier-h-5" /></a>}
            </div>
          </div>
        </div>
        <div
          className="courier-editor-sidebar courier-opacity-100 courier-translate-x-0 courier-w-64 courier-flex-shrink-0"
        >
          <div className="courier-p-4 courier-h-full">
            <SideBar editor={editor} setForm={setForm} currentForm={form} />
          </div>
        </div>
      </div>
    </>
  );
});
