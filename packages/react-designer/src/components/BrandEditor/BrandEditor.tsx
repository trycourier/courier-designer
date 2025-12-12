import { useAutoSave } from "@/hooks/useAutoSave";
import { createCustomError } from "@/lib/utils/errors";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { forwardRef, memo, useCallback, useEffect, useRef } from "react";
import { useBrandActions } from "../Providers";
import {
  isTemplateLoadingAtom,
  templateDataAtom,
  templateErrorAtom,
  tenantIdAtom,
} from "../Providers/store";
import type { Theme } from "../ui-kit/ThemeProvider/ThemeProvider.types";
import { MainLayout } from "../ui/MainLayout";
import type { BrandEditorFormValues, BrandSettings } from "./BrandEditor.types";
import { defaultBrandEditorFormValues } from "./BrandEditor.types";
import { Editor, type EditorProps } from "./Editor";
import { BrandEditorContentAtom, BrandEditorFormAtom } from "./store";

export interface BrandEditorProps extends EditorProps {
  theme?: Theme | string;
  colorScheme?: "light" | "dark";
}

const BrandEditorComponent = forwardRef<HTMLDivElement, BrandEditorProps>(
  (
    { hidePublish = false, autoSaveDebounce = 500, autoSave = true, theme, colorScheme, ...props },
    ref
  ) => {
    const isTemplateLoading = useAtomValue(isTemplateLoadingAtom);
    const isInitialLoadRef = useRef(true);
    const tenantId = useAtomValue(tenantIdAtom);
    const { getTemplate, saveBrand } = useBrandActions();
    const [templateData, setTemplateData] = useAtom(templateDataAtom);
    const setBrandEditorContent = useSetAtom(BrandEditorContentAtom);
    const brandEditorContent = useAtomValue(BrandEditorContentAtom);
    const [brandEditorForm, setBrandEditorForm] = useAtom(BrandEditorFormAtom);
    const isResponseSetRef = useRef(false);
    const setTemplateError = useSetAtom(templateErrorAtom);

    useEffect(() => {
      if (templateData && tenantId !== templateData?.data?.tenant?.tenantId) {
        setTemplateData(null);
        setBrandEditorContent(null);
        isInitialLoadRef.current = false;
      }
    }, [templateData, tenantId, setTemplateData, setBrandEditorContent]);

    const onSave = useCallback(
      async (data: BrandSettings) => {
        await saveBrand(data as BrandEditorFormValues);
      },
      [saveBrand]
    );

    const onError = useCallback(() => {
      setTemplateError(createCustomError("Error saving theme"));
    }, [setTemplateError]);

    const { handleAutoSave } = useAutoSave({
      onSave,
      enabled: isTemplateLoading !== null && autoSave && brandEditorContent !== null,
      debounceMs: autoSaveDebounce,
      onError,
    });

    // Simple effect with only the essential logic
    useEffect(() => {
      // Skip if no tenant or already loading
      if (!tenantId || isTemplateLoading || (templateData && isTemplateLoading === false)) {
        return;
      }

      getTemplate();
    }, [tenantId, getTemplate, isTemplateLoading, templateData]);

    useEffect(() => {
      if (!brandEditorContent) {
        return;
      }
      setTimeout(() => {
        isResponseSetRef.current = true;
      }, 500);
    }, [brandEditorContent]);

    useEffect(() => {
      if (!isResponseSetRef.current || !brandEditorForm) {
        return;
      }

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

      handleAutoSave(brandSettings);
    }, [brandEditorForm, brandEditorContent, handleAutoSave]);

    // Update isInitialLoadRef when loading state changes
    useEffect(() => {
      if (!isTemplateLoading) {
        isInitialLoadRef.current = false;
      }
    }, [isTemplateLoading]);

    useEffect(() => {
      // Only set form values if brandEditorForm is not already populated
      if (!brandEditorForm) {
        const brandSettings = templateData?.data?.tenant?.brand?.settings;

        const paragraphs =
          brandEditorContent?.split("\n") ?? brandSettings?.email?.footer?.markdown?.split("\n");
        const findPrefencesUrl = paragraphs?.find((paragraph: string) =>
          paragraph.includes("{{urls.preferences}}")
        );

        setBrandEditorForm({
          brandColor: brandSettings?.colors?.primary || defaultBrandEditorFormValues.brandColor,
          textColor: brandSettings?.colors?.secondary || defaultBrandEditorFormValues.textColor,
          subtleColor: brandSettings?.colors?.tertiary || defaultBrandEditorFormValues.subtleColor,
          headerStyle: brandSettings?.email?.header?.barColor ? "border" : "plain",
          logo: brandSettings?.email?.header?.logo?.image || defaultBrandEditorFormValues.logo,
          link: brandSettings?.email?.header?.logo?.href || defaultBrandEditorFormValues.link,
          facebookLink:
            brandSettings?.email?.footer?.social?.facebook?.url ||
            defaultBrandEditorFormValues.facebookLink,
          linkedinLink:
            brandSettings?.email?.footer?.social?.linkedin?.url ||
            defaultBrandEditorFormValues.linkedinLink,
          instagramLink:
            brandSettings?.email?.footer?.social?.instagram?.url ||
            defaultBrandEditorFormValues.instagramLink,
          mediumLink:
            brandSettings?.email?.footer?.social?.medium?.url ||
            defaultBrandEditorFormValues.mediumLink,
          xLink:
            brandSettings?.email?.footer?.social?.twitter?.url ||
            defaultBrandEditorFormValues.xLink,
          isPreferences: Boolean(findPrefencesUrl),
        });
      }
    }, [templateData, setBrandEditorForm, brandEditorContent, brandEditorForm]);

    return (
      <MainLayout
        theme={theme}
        colorScheme={colorScheme}
        isLoading={Boolean(isTemplateLoading && isInitialLoadRef.current)}
      >
        <Editor ref={ref} hidePublish={hidePublish} {...props} />
      </MainLayout>
    );
  }
);

export const BrandEditor = memo(BrandEditorComponent);
