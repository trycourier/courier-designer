import { useBrandActions } from "@/components/BrandProvider/BrandProvider";
import { brandDataAtom, brandErrorAtom, isBrandLoadingAtom, isBrandPublishingAtom, isBrandSavingAtom } from '@/components/BrandProvider/store';
import { Button } from "@/components/ui-kit/Button";
import { useAutoSave } from "@/hooks/useAutoSave";
import { cn } from "@/lib/utils";
import { MAX_IMAGE_DIMENSION, resizeImage } from "@/lib/utils/image";
import { ElementalContent } from "@/types/elemental.types";
import { Editor as TiptapEditor } from "@tiptap/react";
import { useAtomValue, useSetAtom } from "jotai";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { pageAtom } from "../../../store";
import { Header } from "../../ui/Header";
import { Status } from "../../ui/Status";
import { BrandEditorFormValues, defaultBrandEditorFormValues } from "../BrandEditor.types";
import { BrandFooter } from "./BrandFooter";
import { SideBar } from "./SideBar";
import { TextMenu } from "@/components/ui/TextMenu";

interface LogoUploaderProps {
  onFileSelect?: (dataUrl: string) => void;
}

const LogoUploader: React.FC<LogoUploaderProps> = ({ onFileSelect }) => {
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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find((file) => file.type.startsWith("image/"));
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

type EditorProps = {
  className?: string;
  autoSave?: boolean;
  templateEditor?: boolean;
  isVisible?: boolean;
  variables?: Record<string, any>;
};

export const Editor = forwardRef<HTMLDivElement, EditorProps>(({ autoSave, templateEditor, isVisible = true, variables }, ref) => {
  const setPage = useSetAtom(pageAtom);
  const { saveBrand, publishBrand } = useBrandActions();
  const brandData = useAtomValue(brandDataAtom);
  const setBrandData = useSetAtom(brandDataAtom);
  const [form, setForm] = useState<BrandEditorFormValues>(brandData?.data?.tenant?.brand?.settings);
  const isBrandPublishing = useAtomValue(isBrandPublishingAtom);
  const isBrandSaving = useAtomValue(isBrandSavingAtom);
  const isBrandLoading = useAtomValue(isBrandLoadingAtom);
  const brandError = useAtomValue(brandErrorAtom);
  const [editor, setEditor] = useState<TiptapEditor | null>(null);
  const [footerContent, setFooterContent] = useState<ElementalContent | undefined>(undefined);
  const brandSettings = brandData?.data?.tenant?.brand?.settings
  const previousSettingsRef = useRef<string>("");
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    if (isBrandLoading) {
      isInitialLoadRef.current = true;
    }
  }, [isBrandLoading]);

  const { handleAutoSave } = useAutoSave({
    onSave: async (data: any) => {
      await saveBrand(data);
    },
    debounceMs: 500,
    onError: () => toast.error("Error saving theme"),
  });

  // Save changes whenever form or editor content changes
  useEffect(() => {
    if (!editor) {
      return;
    }

    // Convert theme values from sidebar to brand settings structure
    const settings = {
      colors: { primary: form?.brandColor, secondary: form?.textColor, tertiary: form?.subtleColor, },
      email: {
        header: {
          barColor: form?.headerStyle === 'border' ? form?.brandColor : '',
          logo: { href: form?.link, image: form?.logo }
        },
        footer: {
          content: footerContent,
          social: {
            facebook: { url: form?.facebookLink },
            instagram: { url: form?.instagramLink },
            linkedin: { url: form?.linkedinLink },
            medium: { url: form?.mediumLink },
            twitter: { url: form?.xLink }
          }
        }
      }
    };

    const currentSettingsString = JSON.stringify(settings);
    const brandSettingsString = JSON.stringify(brandSettings);

    // Only update if settings have changed AND they're different from the brand settings
    // AND we're not in the middle of receiving new data from the server
    if (form &&
      editor &&
      currentSettingsString !== brandSettingsString &&
      currentSettingsString !== previousSettingsRef.current) {

      previousSettingsRef.current = currentSettingsString;

      setBrandData({
        ...brandData,
        data: {
          ...brandData?.data,
          tenant: {
            ...brandData?.data?.tenant,
            brand: { ...brandData?.data?.tenant?.brand, settings }
          }
        }
      });

      if (!isInitialLoadRef.current) {
        handleAutoSave(settings);
      }
    }
  }, [form, editor, brandSettings, footerContent, handleAutoSave, brandData, isInitialLoadRef]);

  const handlePublish = useCallback(() => {
    publishBrand();
  }, [publishBrand]);

  useEffect(() => {
    if (brandSettings) {
      isInitialLoadRef.current = true;

      const brandSettingsString = JSON.stringify(brandSettings);
      previousSettingsRef.current = brandSettingsString;

      setFooterContent(brandSettings.email?.footer?.content);
      setForm({
        brandColor: brandSettings.colors?.primary || defaultBrandEditorFormValues.brandColor,
        textColor: brandSettings.colors?.secondary || defaultBrandEditorFormValues.textColor,
        subtleColor: brandSettings.colors?.tertiary || defaultBrandEditorFormValues.subtleColor,
        headerStyle: brandSettings.email?.header?.barColor ? 'border' : 'plain',
        logo: brandSettings.email?.header?.logo?.image || defaultBrandEditorFormValues.logo,
        link: brandSettings.email?.header?.logo?.href || defaultBrandEditorFormValues.link,
        facebookLink: brandSettings.email?.footer?.social?.facebook?.url || defaultBrandEditorFormValues.facebookLink,
        linkedinLink: brandSettings.email?.footer?.social?.linkedin?.url || defaultBrandEditorFormValues.linkedinLink,
        instagramLink: brandSettings.email?.footer?.social?.instagram?.url || defaultBrandEditorFormValues.instagramLink,
        mediumLink: brandSettings.email?.footer?.social?.medium?.url || defaultBrandEditorFormValues.mediumLink,
        xLink: brandSettings.email?.footer?.social?.twitter?.url || defaultBrandEditorFormValues.xLink,
      });
    }

    // Wait until next tick to ensure all editor updates are processed
    // before marking initial load as complete
    setTimeout(() => {
      isInitialLoadRef.current = false;
    }, 3000);
  }, [brandData, isInitialLoadRef]);

  const handleLogoSelect = useCallback((dataUrl: string) => {
    setForm((prevForm) => ({
      ...prevForm,
      logo: dataUrl,
    }));
  }, []);

  return (
    <>
      <div className={cn("courier-z-30 courier-w-full courier-h-12", !isVisible && "courier-hidden")}>
        <Header>
          <div className="courier-text-sm courier-font-medium">Brand theme</div>
          <div className="courier-flex courier-gap-2 courier-items-center">
            <Status isLoading={isBrandLoading} isSaving={Boolean(isBrandSaving)} isError={Boolean(brandError)} />
            {templateEditor && (
              <Button variant="outline" buttonSize="small" onClick={() => setPage("template")}>
                Back
              </Button>
            )}
            {autoSave && (
              <Button
                variant="primary"
                buttonSize="small"
                disabled={
                  !brandData?.data?.tenant?.brand ||
                  isBrandPublishing === true ||
                  isBrandSaving !== false
                }
                onClick={handlePublish}
              >
                {isBrandPublishing ? "Publishing..." : "Publish changes"}
              </Button>
            )}
          </div>
        </Header>
      </div>

      <div className={cn("courier-flex courier-flex-1 courier-flex-row courier-overflow-hidden", !isVisible && "courier-hidden")}>
        <div className="courier-flex courier-flex-col courier-flex-1">
          {!isBrandLoading && isVisible && editor && <TextMenu editor={editor} />}
          <div className="courier-editor-container" ref={ref}>
            <div className="courier-mb-3 courier-max-w-2xl courier-self-center courier-w-full">
              Header
            </div>
            <div className="courier-editor-main courier-transition-all courier-duration-300 courier-ease-in-out courier-p-10 courier-mb-8 courier-relative courier-overflow-hidden courier-flex courier-flex-col courier-items-start">
              {form?.headerStyle === "border" && (
                <div
                  className="courier-absolute courier-top-0 courier-left-0 courier-right-0 courier-h-2"
                  style={{ backgroundColor: form.brandColor }}
                />
              )}
              {form?.logo ? (
                <img
                  src={form.logo}
                  alt="Brand logo"
                  className="courier-w-auto courier-max-w-64 courier-object-contain courier-cursor-default"
                />
              ) : (
                <LogoUploader onFileSelect={handleLogoSelect} />
              )}
            </div>
            <div className="courier-mb-3 courier-max-w-2xl courier-self-center courier-w-full">
              Footer
            </div>
            <div className="courier-theme-editor-main courier-transition-all courier-duration-300 courier-ease-in-out courier-p-10">
              <BrandFooter
                variables={variables}
                setEditor={setEditor}
                content={footerContent}
                onUpdate={setFooterContent}
                facebookLink={form?.facebookLink}
                linkedinLink={form?.linkedinLink}
                instagramLink={form?.instagramLink}
                mediumLink={form?.mediumLink}
                xLink={form?.xLink}
              />
            </div>
          </div>
        </div>
        <div className="courier-editor-sidebar courier-opacity-100 courier-translate-x-0 courier-w-64 courier-flex-shrink-0">
          <div className="courier-p-4 courier-h-full">
            {editor && <SideBar editor={editor} setForm={setForm} currentForm={form} />}
          </div>
        </div>
      </div>
    </>
  );
});
