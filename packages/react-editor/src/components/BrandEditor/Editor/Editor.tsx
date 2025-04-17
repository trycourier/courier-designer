import { useBrandActions } from "@/components/Providers";
import {
  isTenantLoadingAtom,
  isTenantPublishingAtom,
  isTenantSavingAtom,
  tenantDataAtom,
  tenantErrorAtom,
  tenantIdAtom,
} from "@/components/Providers/store";
import { SideBarItemDetails } from "@/components/TemplateEditor/Editor/SideBar/SideBarItemDetails";
import { Button } from "@/components/ui-kit/Button";
import { TextMenu } from "@/components/ui/TextMenu";
import { selectedNodeAtom } from "@/components/ui/TextMenu/store";
import { useAutoSave } from "@/hooks/useAutoSave";
import { cn } from "@/lib/utils";
import type { ElementalContent } from "@/types/elemental.types";
import type { Editor as TiptapEditor } from "@tiptap/react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { forwardRef, memo, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { pageAtom } from "../../../store";
import { Header } from "../../ui/Header";
import { Status } from "../../ui/Status";
import { type BrandEditorFormValues, defaultBrandEditorFormValues } from "../BrandEditor.types";
import { BrandEditorContentAtom, BrandEditorFormAtom } from "../store";
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

const EditorComponent = forwardRef<HTMLDivElement, EditorProps>(
  (
    {
      hidePublish = false,
      autoSaveDebounce = 200,
      autoSave,
      templateEditor,
      isVisible = true,
      variables,
      onChange,
    },
    ref
  ) => {
    const [brandValue, setBrandValue] = useState<BrandSettings | undefined>();
    const setPage = useSetAtom(pageAtom);
    const { saveBrand, publishBrand } = useBrandActions();
    const tenantData = useAtomValue(tenantDataAtom);
    const [form, setForm] = useState<BrandEditorFormValues>(
      tenantData?.data?.tenant?.brand?.settings as BrandEditorFormValues
    );
    const isTenantPublishing = useAtomValue(isTenantPublishingAtom);
    const isTenantSaving = useAtomValue(isTenantSavingAtom);
    const isTenantLoading = useAtomValue(isTenantLoadingAtom);
    const tenantId = useAtomValue(tenantIdAtom);
    const tenantError = useAtomValue(tenantErrorAtom);
    const [editor, setEditor] = useState<TiptapEditor | null>(null);
    const [footerContent, setFooterContent] = useState<ElementalContent | undefined>(undefined);
    const previousSettingsRef = useRef<string>("");
    const [selectedNode, setSelectedNode] = useAtom(selectedNodeAtom);
    const setBrandEditorForm = useSetAtom(BrandEditorFormAtom);
    const [brandEditorContent, setBrandEditorContent] = useAtom(BrandEditorContentAtom);
    const isResponseSetRef = useRef(false);

    const { handleAutoSave } = useAutoSave({
      onSave: async (data: BrandSettings) => {
        await saveBrand(data as BrandEditorFormValues);
      },
      enabled: isTenantLoading !== null && autoSave && brandEditorContent !== null,
      debounceMs: autoSaveDebounce,
      onError: () => toast.error("Error saving theme"),
    });

    useEffect(() => {
      if (tenantData === null) {
        isResponseSetRef.current = false;
        setFooterContent(undefined);
        setBrandEditorForm(null);
        setBrandValue(undefined);
      }
    }, [tenantData, setBrandEditorContent, setBrandEditorForm, setBrandValue]);

    useEffect(() => {
      const brandSettings: BrandSettings = {
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
            content: brandEditorContent ?? undefined,
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

      if (brandValue === undefined && brandEditorContent) {
        setBrandValue(brandSettings);
      }

      if (!brandEditorContent || !isResponseSetRef.current) {
        return;
      }

      setTimeout(() => {
        setFooterContent(brandEditorContent);
      }, 0);

      if (JSON.stringify(brandValue) === JSON.stringify(brandSettings)) {
        return;
      }

      setBrandValue(brandSettings);

      if (onChange) {
        onChange(brandSettings);
      }

      if (brandSettings !== null) {
        handleAutoSave(brandSettings);
      }
    }, [footerContent, brandEditorContent, form, handleAutoSave, onChange, brandValue]);

    const handlePublish = useCallback(() => {
      publishBrand();
    }, [publishBrand]);

    useEffect(() => {
      const brandSettings = tenantData?.data?.tenant?.brand?.settings;
      if (brandSettings && tenantData?.data?.tenant?.tenantId === tenantId) {
        const brandSettingsString = JSON.stringify(brandSettings);
        previousSettingsRef.current = brandSettingsString;

        const formValues: BrandEditorFormValues = {
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
        };

        setForm(formValues);

        setTimeout(() => {
          isResponseSetRef.current = true;
        }, 100);
      }
    }, [tenantData, tenantId]);

    useEffect(() => {
      setBrandEditorForm(form);
    }, [form, setBrandEditorForm]);

    const handleLogoSelect = useCallback((dataUrl: string) => {
      setForm((prevForm) => ({
        ...prevForm,
        logo: dataUrl,
      }));
    }, []);

    const handleBack = useCallback(() => {
      setPage("template");
      setSelectedNode(null);
    }, [setPage, setSelectedNode]);

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
                  onClick={handleBack}
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
              {editor && !selectedNode && (
                <SideBar editor={editor} setForm={setForm} currentForm={form} />
              )}
              {editor && selectedNode && (
                <SideBarItemDetails element={selectedNode} editor={editor} />
              )}
            </div>
          </div>
        </div>
      </>
    );
  }
);

export const Editor = memo(EditorComponent);
