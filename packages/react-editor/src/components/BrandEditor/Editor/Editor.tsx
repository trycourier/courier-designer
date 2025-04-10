import { useBrandActions } from "@/components/Providers";
import {
  tenantDataAtom,
  tenantErrorAtom,
  isTenantLoadingAtom,
  isTenantPublishingAtom,
  isTenantSavingAtom,
} from "@/components/Providers/store";
import { Button } from "@/components/ui-kit/Button";
import { TextMenu } from "@/components/ui/TextMenu";
import { useAutoSave } from "@/hooks/useAutoSave";
import { cn } from "@/lib/utils";
import type { ElementalContent } from "@/types/elemental.types";
import type { Editor as TiptapEditor } from "@tiptap/react";
import { useAtomValue, useSetAtom } from "jotai";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { pageAtom } from "../../../store";
import { Header } from "../../ui/Header";
import { Status } from "../../ui/Status";
import { type BrandEditorFormValues, defaultBrandEditorFormValues } from "../BrandEditor.types";
import { BrandFooter } from "./BrandFooter";
import { LogoUploader } from "./LogoUploader";
import { SideBar } from "./SideBar";

interface BrandSettings {
  colors?: {
    primary?: string;
    secondary?: string;
    tertiary?: string;
  };
  email?: {
    header?: {
      barColor?: string;
      logo?: {
        href?: string;
        image?: string;
      };
    };
    footer?: {
      content?: ElementalContent;
      social?: {
        facebook?: { url?: string };
        instagram?: { url?: string };
        linkedin?: { url?: string };
        medium?: { url?: string };
        twitter?: { url?: string };
      };
    };
  };
}

export interface EditorProps {
  hidePublish?: boolean;
  autoSaveDebounce?: number;
  autoSave?: boolean;
  templateEditor?: boolean;
  isVisible?: boolean;
  variables?: Record<string, unknown>;
  value?: BrandSettings;
  onChange?: (value: BrandSettings) => void;
}

export const Editor = forwardRef<HTMLDivElement, EditorProps>(
  (
    {
      hidePublish = false,
      autoSaveDebounce,
      autoSave,
      templateEditor,
      isVisible = true,
      variables,
      value,
      onChange,
    },
    ref
  ) => {
    const setPage = useSetAtom(pageAtom);
    const { saveBrand, publishBrand } = useBrandActions();
    const tenantData = useAtomValue(tenantDataAtom);
    const setTenantData = useSetAtom(tenantDataAtom);
    const [form, setForm] = useState<BrandEditorFormValues>(
      tenantData?.data?.tenant?.brand?.settings as BrandEditorFormValues
    );
    const isTenantPublishing = useAtomValue(isTenantPublishingAtom);
    const isTenantSaving = useAtomValue(isTenantSavingAtom);
    const isTenantLoading = useAtomValue(isTenantLoadingAtom);
    const tenantError = useAtomValue(tenantErrorAtom);
    const [editor, setEditor] = useState<TiptapEditor | null>(null);
    const [footerContent, setFooterContent] = useState<ElementalContent | undefined>(undefined);
    const brandSettings = tenantData?.data?.tenant?.brand?.settings;
    const previousSettingsRef = useRef<string>("");
    const isInitialLoadRef = useRef(true);

    useEffect(() => {
      if (value) {
        setTenantData({
          ...tenantData,
          data: {
            ...tenantData?.data,
            tenant: {
              ...tenantData?.data?.tenant,
              brand: {
                ...tenantData?.data?.tenant?.brand,
                settings: value as Record<string, unknown>,
              },
            },
          },
        });
      }
    }, [value, tenantData, setTenantData]);

    useEffect(() => {
      if (isTenantLoading) {
        isInitialLoadRef.current = true;
      }
    }, [isTenantLoading]);

    const { handleAutoSave } = useAutoSave({
      onSave: async (data: BrandSettings) => {
        await saveBrand(data as BrandEditorFormValues);
      },
      enabled: isTenantLoading !== null && autoSave,
      debounceMs: autoSaveDebounce,
      onError: () => toast.error("Error saving theme"),
    });

    // Save changes whenever form or editor content changes
    useEffect(() => {
      if (!editor) {
        return;
      }

      // Convert theme values from sidebar to brand settings structure
      const settings: BrandSettings = {
        colors: {
          primary: form?.brandColor,
          secondary: form?.textColor,
          tertiary: form?.subtleColor,
        },
        email: {
          header: {
            barColor: form?.headerStyle === "border" ? form?.brandColor : "",
            logo: { href: form?.link, image: form?.logo },
          },
          footer: {
            content: footerContent,
            social: {
              facebook: { url: form?.facebookLink },
              instagram: { url: form?.instagramLink },
              linkedin: { url: form?.linkedinLink },
              medium: { url: form?.mediumLink },
              twitter: { url: form?.xLink },
            },
          },
        },
      };

      const currentSettingsString = JSON.stringify(settings);
      const brandSettingsString = JSON.stringify(brandSettings);

      // Only update if settings have changed AND they're different from the brand settings
      // AND we're not in the middle of receiving new data from the server
      if (
        form &&
        editor &&
        currentSettingsString !== brandSettingsString &&
        currentSettingsString !== previousSettingsRef.current
      ) {
        previousSettingsRef.current = currentSettingsString;

        setTenantData({
          ...tenantData,
          data: {
            ...tenantData?.data,
            tenant: {
              ...tenantData?.data?.tenant,
              brand: {
                ...tenantData?.data?.tenant?.brand,
                settings: settings as Record<string, unknown>,
              },
            },
          },
        });

        onChange?.(settings);

        if (!isInitialLoadRef.current) {
          handleAutoSave(settings);
        }
      }
    }, [
      form,
      editor,
      brandSettings,
      footerContent,
      handleAutoSave,
      tenantData,
      isInitialLoadRef,
      onChange,
      setTenantData,
    ]);

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
          headerStyle: brandSettings.email?.header?.barColor ? "border" : "plain",
          logo: brandSettings.email?.header?.logo?.image || defaultBrandEditorFormValues.logo,
          link: brandSettings.email?.header?.logo?.href || defaultBrandEditorFormValues.link,
          facebookLink:
            brandSettings.email?.footer?.social?.facebook?.url ||
            defaultBrandEditorFormValues.facebookLink,
          linkedinLink:
            brandSettings.email?.footer?.social?.linkedin?.url ||
            defaultBrandEditorFormValues.linkedinLink,
          instagramLink:
            brandSettings.email?.footer?.social?.instagram?.url ||
            defaultBrandEditorFormValues.instagramLink,
          mediumLink:
            brandSettings.email?.footer?.social?.medium?.url ||
            defaultBrandEditorFormValues.mediumLink,
          xLink:
            brandSettings.email?.footer?.social?.twitter?.url || defaultBrandEditorFormValues.xLink,
        });
      }

      // Wait until next tick to ensure all editor updates are processed
      // before marking initial load as complete
      setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 300);
    }, [tenantData, isInitialLoadRef, brandSettings]);

    const handleLogoSelect = useCallback((dataUrl: string) => {
      setForm((prevForm) => ({
        ...prevForm,
        logo: dataUrl,
      }));
    }, []);

    return (
      <>
        <div
          className={cn("courier-z-30 courier-w-full courier-h-12", !isVisible && "courier-hidden")}
        >
          <Header>
            <div className="courier-text-sm courier-font-medium">Brand theme</div>
            <div className="courier-flex courier-gap-2 courier-items-center">
              {isTenantSaving !== null && (
                <Status
                  isLoading={Boolean(isTenantLoading)}
                  isSaving={Boolean(isTenantSaving)}
                  isError={Boolean(tenantError)}
                />
              )}
              {templateEditor && (
                <Button
                  variant="outline"
                  buttonSize="small"
                  onClick={() => setPage("template")}
                  disabled={isTenantPublishing === true || isTenantSaving === true}
                >
                  Back
                </Button>
              )}
              {!hidePublish && isTenantLoading !== null && (
                <Button
                  variant="primary"
                  buttonSize="small"
                  disabled={
                    !tenantData?.data?.tenant?.brand ||
                    isTenantPublishing === true ||
                    isTenantSaving !== false
                  }
                  onClick={handlePublish}
                >
                  {isTenantPublishing ? "Publishing..." : "Publish changes"}
                </Button>
              )}
            </div>
          </Header>
        </div>

        <div
          className={cn(
            "courier-flex courier-flex-1 courier-flex-row courier-overflow-hidden",
            !isVisible && "courier-hidden"
          )}
        >
          <div className="courier-flex courier-flex-col courier-flex-1">
            {!isTenantLoading && isVisible && editor && <TextMenu editor={editor} />}
            <div className="courier-editor-container" ref={ref}>
              <div className="courier-mb-3 courier-max-w-2xl courier-self-center courier-w-full">
                Header
              </div>
              <div
                className={cn(
                  "courier-editor-main courier-transition-all courier-duration-300 courier-ease-in-out courier-py-5 courier-px-9 courier-mb-8 courier-relative courier-overflow-hidden courier-flex courier-flex-col courier-items-start",
                  form?.headerStyle === "border" && "courier-pt-6"
                )}
              >
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
                    className="courier-w-auto courier-max-w-36 courier-object-contain courier-cursor-default"
                  />
                ) : (
                  <LogoUploader onFileSelect={handleLogoSelect} />
                )}
              </div>
              <div className="courier-mb-3 courier-max-w-2xl courier-self-center courier-w-full">
                Footer
              </div>
              <div className="courier-theme-editor-main courier-transition-all courier-duration-300 courier-ease-in-out courier-pt-3 courier-pb-5 courier-px-9">
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
  }
);
