import { useBrandActions } from "@/components/Providers";
import {
  isTemplateLoadingAtom,
  isTemplatePublishingAtom,
  isTemplateSavingAtom,
  templateDataAtom,
  templateErrorAtom,
} from "@/components/Providers/store";
// import { SideBarItemDetails } from "@/components/TemplateEditor/Channels/Email/SideBar/SideBarItemDetails";
import { brandEditorAtom, variableValidationAtom } from "@/components/TemplateEditor/store";
import { Button } from "@/components/ui-kit/Button";
// import { selectedNodeAtom } from "@/components/ui/TextMenu/store";
import type { TiptapDoc } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { convertTiptapToMarkdown } from "@/lib/utils/convertTiptapToMarkdown/convertTiptapToMarkdown";
import type { VariableValidationConfig } from "@/types/validation.types";
import type { Editor as TiptapEditor } from "@tiptap/react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { forwardRef, memo, useCallback, useEffect } from "react";
import { pageAtom } from "../../../store";
import { Header } from "../../ui/Header";
import { Status } from "../../ui/Status";
import type { BrandEditorFormValues } from "../BrandEditor.types";
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
  /** @deprecated The variables prop is no longer used. Users can now type any variable directly without autocomplete suggestions. */
  variables?: Record<string, unknown>;
  /**
   * Configuration for custom variable validation.
   * Allows restricting which variable names are allowed and defining behavior on validation failure.
   */
  variableValidation?: VariableValidationConfig;
  value?: BrandEditorFormValues;
}

const EditorComponent = forwardRef<HTMLDivElement, EditorProps>(
  ({ hidePublish = false, templateEditor, variables, variableValidation }, ref) => {
    const setPage = useSetAtom(pageAtom);
    const { publishBrand } = useBrandActions();
    const setVariableValidation = useSetAtom(variableValidationAtom);

    // Sync variableValidation prop to atom so VariableChipBase can access it
    useEffect(() => {
      setVariableValidation(variableValidation);
    }, [variableValidation, setVariableValidation]);
    const templateData = useAtomValue(templateDataAtom);
    const isTemplatePublishing = useAtomValue(isTemplatePublishingAtom);
    const isTemplateSaving = useAtomValue(isTemplateSavingAtom);
    const isTemplateLoading = useAtomValue(isTemplateLoadingAtom);
    const templateError = useAtomValue(templateErrorAtom);
    const brandEditor = useAtomValue(brandEditorAtom);
    // const [selectedNode, setSelectedNode] = useAtom(selectedNodeAtom);
    const [brandEditorForm, setBrandEditorForm] = useAtom(BrandEditorFormAtom);
    const [brandEditorContent, setBrandEditorContent] = useAtom(BrandEditorContentAtom);

    const handlePublish = useCallback(() => {
      publishBrand();
    }, [publishBrand]);

    const onUpdateHandler = useCallback(
      ({ editor }: { editor: TiptapEditor }) => {
        setBrandEditorContent(convertTiptapToMarkdown(editor.getJSON() as TiptapDoc));
      },
      [setBrandEditorContent]
    );

    const handleLogoSelect = useCallback(
      (dataUrl: string) => {
        setBrandEditorForm((prevForm) =>
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
      [setBrandEditorForm]
    );

    const handleBack = useCallback(() => {
      setPage("template");
      // setSelectedNode(null);
      // }, [setPage, setSelectedNode]);
    }, [setPage]);

    return (
      <>
        <div className="courier-z-30 courier-w-full courier-h-12">
          <Header>
            <div className="courier-text-sm courier-font-medium">Brand theme</div>
            <div className="courier-flex courier-gap-2 courier-items-center">
              {isTemplateSaving !== null && (
                <Status
                  isLoading={Boolean(isTemplateLoading)}
                  isSaving={Boolean(isTemplateSaving)}
                  isError={Boolean(templateError)}
                />
              )}
              {templateEditor && (
                <Button
                  variant="outline"
                  buttonSize="small"
                  onClick={handleBack}
                  disabled={isTemplatePublishing === true || isTemplateSaving === true}
                >
                  Back
                </Button>
              )}
              {!hidePublish && isTemplateLoading !== null && (
                <Button
                  variant="primary"
                  buttonSize="small"
                  disabled={
                    !templateData?.data?.tenant?.brand ||
                    isTemplatePublishing === true ||
                    isTemplateSaving !== false
                  }
                  onClick={handlePublish}
                >
                  {isTemplatePublishing ? "Publishing..." : "Publish changes"}
                </Button>
              )}
            </div>
          </Header>
        </div>

        <div className="courier-flex courier-flex-1 courier-flex-row courier-overflow-hidden">
          <div className="courier-flex courier-flex-col courier-flex-1">
            <div className="courier-editor-container" ref={ref}>
              <div className="courier-mb-3 courier-max-w-2xl courier-self-center courier-w-full">
                Header
              </div>
              <div
                className={cn(
                  "courier-editor-main courier-transition-all courier-duration-300 courier-ease-in-out courier-py-5 courier-px-9 courier-mb-8 courier-relative courier-overflow-hidden courier-flex courier-flex-col courier-items-start",
                  brandEditorForm?.headerStyle === "border" && "courier-pt-6"
                )}
              >
                {brandEditorForm?.headerStyle === "border" && (
                  <div
                    className="courier-absolute courier-top-0 courier-left-0 courier-right-0 courier-h-2"
                    style={{ backgroundColor: brandEditorForm.brandColor }}
                  />
                )}
                {brandEditorForm?.logo ? (
                  <img
                    src={brandEditorForm.logo}
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
                  value={
                    brandEditorContent ??
                    templateData?.data?.tenant?.brand?.settings?.email?.footer?.markdown
                  }
                  variables={variables}
                  facebookLink={brandEditorForm?.facebookLink}
                  linkedinLink={brandEditorForm?.linkedinLink}
                  instagramLink={brandEditorForm?.instagramLink}
                  mediumLink={brandEditorForm?.mediumLink}
                  xLink={brandEditorForm?.xLink}
                  onUpdate={onUpdateHandler}
                />
              </div>
            </div>
          </div>
          <div className="courier-editor-sidebar courier-opacity-100 courier-translate-x-0 courier-w-64 courier-flex-shrink-0">
            <div className="courier-p-4 courier-h-full">
              {brandEditor && <SideBar />}
              {/* {brandEditor && selectedNode && (
                <SideBarItemDetails element={selectedNode} editor={brandEditor} />
              )} */}
            </div>
          </div>
        </div>
      </>
    );
  }
);

export const Editor = memo(EditorComponent);
