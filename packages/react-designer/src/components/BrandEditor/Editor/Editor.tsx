import { useBrandActions } from "@/components/Providers";
import {
  isTenantLoadingAtom,
  isTenantPublishingAtom,
  isTenantSavingAtom,
  tenantDataAtom,
  tenantErrorAtom,
  tenantIdAtom,
} from "@/components/Providers/store";
import { SideBarItemDetails } from "@/components/TemplateEditor/Channels/Email/SideBar/SideBarItemDetails";
import { brandEditorAtom } from "@/components/TemplateEditor/store";
import { Button } from "@/components/ui-kit/Button";
import { TextMenu } from "@/components/ui/TextMenu";
import { selectedNodeAtom } from "@/components/ui/TextMenu/store";
import { useAutoSave } from "@/hooks/useAutoSave";
import type { TiptapDoc } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { convertTiptapToMarkdown } from "@/lib/utils/convertTiptapToMarkdown/convertTiptapToMarkdown";
import type { Editor as TiptapEditor } from "@tiptap/react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { forwardRef, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { pageAtom } from "../../../store";
import { Header } from "../../ui/Header";
import { Status } from "../../ui/Status";
import type { BrandEditorFormValues, BrandSettings } from "../BrandEditor.types";
import { defaultBrandEditorFormValues } from "../BrandEditor.types";
import { BrandEditorContentAtom, BrandEditorFormAtom } from "../store";
import { BrandFooter } from "./BrandFooter";
import { LogoUploader } from "./LogoUploader";
import { SideBar } from "./SideBar";

export interface EditorProps {
  hidePublish?: boolean;
  autoSaveDebounce?: number;
  autoSave?: boolean;
  templateEditor?: boolean;
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
      variables,
      value,
      onChange,
    },
    ref
  ) => {
    const setPage = useSetAtom(pageAtom);
    const { saveBrand, publishBrand } = useBrandActions();
    const tenantData = useAtomValue(tenantDataAtom);
    const isTenantPublishing = useAtomValue(isTenantPublishingAtom);
    const isTenantSaving = useAtomValue(isTenantSavingAtom);
    const isTenantLoading = useAtomValue(isTenantLoadingAtom);
    const tenantId = useAtomValue(tenantIdAtom);
    const tenantError = useAtomValue(tenantErrorAtom);
    const brandEditor = useAtomValue(brandEditorAtom);
    const [selectedNode, setSelectedNode] = useAtom(selectedNodeAtom);
    const [form, setForm] = useState<BrandEditorFormValues>(
      tenantData?.data?.tenant?.brand?.settings as BrandEditorFormValues
    );
    const [brandEditorForm, setBrandEditorForm] = useAtom(BrandEditorFormAtom);
    const [brandEditorContent, setBrandEditorContent] = useAtom(BrandEditorContentAtom);
    const isResponseSetRef = useRef(false);

    const { handleAutoSave } = useAutoSave({
      onSave: async (data: BrandSettings) => {
        await saveBrand(data as BrandEditorFormValues);
      },
      enabled: isTenantLoading !== null && autoSave && brandEditorContent !== null,
      debounceMs: autoSaveDebounce,
      onError: useMemo(() => () => toast.error("Error saving theme"), []),
    });

    useEffect(() => {
      if (tenantData === null) {
        isResponseSetRef.current = false;
        setBrandEditorForm(null);
      }
    }, [tenantData, setBrandEditorForm]);

    useEffect(() => {
      const brandSettings: BrandSettings = {
        colors: {
          primary: brandEditorForm?.brandColor,
          secondary: brandEditorForm?.textColor,
          tertiary: brandEditorForm?.subtleColor,
        },
        email: {
          header: {
            barColor: brandEditorForm?.headerStyle === "border" ? brandEditorForm?.brandColor : "",
            logo: { href: brandEditorForm?.link, image: brandEditorForm?.logo },
          },
          footer: {
            markdown: brandEditorContent ?? undefined,
            social: {
              facebook: { url: brandEditorForm?.facebookLink },
              instagram: { url: brandEditorForm?.instagramLink },
              linkedin: { url: brandEditorForm?.linkedinLink },
              medium: { url: brandEditorForm?.mediumLink },
              twitter: { url: brandEditorForm?.xLink },
            },
          },
        },
      };

      if (!isResponseSetRef.current || JSON.stringify(value) === JSON.stringify(brandSettings)) {
        return;
      }

      if (onChange) {
        onChange(brandSettings);
      }

      if (brandSettings !== null) {
        handleAutoSave(brandSettings);
      }
    }, [brandEditorContent, brandEditorForm, handleAutoSave, onChange, value]);

    const handlePublish = useCallback(() => {
      publishBrand();
    }, [publishBrand]);

    const onUpdateHandler = useCallback(
      ({ editor }: { editor: TiptapEditor }) => {
        setBrandEditorContent(convertTiptapToMarkdown(editor.getJSON() as TiptapDoc));
      },
      [setBrandEditorContent]
    );

    useEffect(() => {
      const brandSettings = value;
      if (brandSettings && tenantData?.data?.tenant?.tenantId === tenantId) {
        const paragraphs = brandSettings?.email?.footer?.markdown?.split("\n");
        const findPrefencesUrl = paragraphs?.find((paragraph) =>
          paragraph.includes("{{urls.preferences}}")
        );

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
          isPreferences: Boolean(findPrefencesUrl),
        };

        setForm(formValues);

        setTimeout(() => {
          isResponseSetRef.current = true;
        }, 100);
      }
    }, [value, tenantId, tenantData?.data?.tenant?.tenantId, setForm]);

    const handleLogoSelect = useCallback(
      (dataUrl: string) => {
        setForm((prevForm) =>
          prevForm
            ? {
                ...prevForm,
                logo: dataUrl,
              }
            : {
                ...defaultBrandEditorFormValues,
                logo: dataUrl,
              }
        );
      },
      [setForm]
    );

    const handleBack = useCallback(() => {
      setPage("template");
      setSelectedNode(null);
    }, [setPage, setSelectedNode]);

    // console.log("brandEditorForm", brandEditorForm);

    return (
      <>
        <div className="courier-z-30 courier-w-full courier-h-12">
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

        <div className="courier-flex courier-flex-1 courier-flex-row courier-overflow-hidden">
          <div className="courier-flex courier-flex-col courier-flex-1">
            {!isTenantLoading && brandEditor && <TextMenu editor={brandEditor} />}
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
                  value={value?.email?.footer?.markdown}
                  variables={variables}
                  facebookLink={brandEditorForm?.facebookLink}
                  linkedinLink={form?.linkedinLink}
                  instagramLink={form?.instagramLink}
                  mediumLink={form?.mediumLink}
                  xLink={form?.xLink}
                  onUpdate={onUpdateHandler}
                />
              </div>
            </div>
          </div>
          <div className="courier-editor-sidebar courier-opacity-100 courier-translate-x-0 courier-w-64 courier-flex-shrink-0">
            <div className="courier-p-4 courier-h-full">
              {brandEditor && !selectedNode && <SideBar />}
              {brandEditor && selectedNode && (
                <SideBarItemDetails element={selectedNode} editor={brandEditor} />
              )}
            </div>
          </div>
        </div>
      </>
    );
  }
);

export const Editor = memo(EditorComponent);
