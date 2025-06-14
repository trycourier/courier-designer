import { useAutoSave } from "@/hooks/useAutoSave";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { forwardRef, memo, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { useBrandActions } from "../Providers";
import { isTenantLoadingAtom, tenantDataAtom, tenantIdAtom } from "../Providers/store";
import type { Theme } from "../ui-kit/ThemeProvider/ThemeProvider.types";
import { MainLayout } from "../ui/MainLayout";
import type { BrandEditorFormValues, BrandSettings } from "./BrandEditor.types";
import { defaultBrandEditorFormValues } from "./BrandEditor.types";
import { Editor, type EditorProps } from "./Editor";
import { BrandEditorContentAtom, BrandEditorFormAtom } from "./store";

export interface BrandEditorProps extends EditorProps {
  theme?: Theme | string;
}

const BrandEditorComponent = forwardRef<HTMLDivElement, BrandEditorProps>(
  ({ hidePublish = false, autoSaveDebounce = 200, autoSave = true, theme, ...props }, ref) => {
    const isTenantLoading = useAtomValue(isTenantLoadingAtom);
    const isInitialLoadRef = useRef(true);
    const tenantId = useAtomValue(tenantIdAtom);
    const { getTenant, saveBrand } = useBrandActions();
    const [tenantData, setTenantData] = useAtom(tenantDataAtom);
    const setBrandEditorContent = useSetAtom(BrandEditorContentAtom);
    const brandEditorContent = useAtomValue(BrandEditorContentAtom);
    const [brandEditorForm, setBrandEditorForm] = useAtom(BrandEditorFormAtom);
    const isResponseSetRef = useRef(false);

    useEffect(() => {
      if (tenantData && tenantId !== tenantData?.data?.tenant?.tenantId) {
        setTenantData(null);
        setBrandEditorContent(null);
        isInitialLoadRef.current = false;
      }
    }, [tenantData, tenantId, setTenantData, setBrandEditorContent]);

    const { handleAutoSave } = useAutoSave({
      onSave: async (data: BrandSettings) => {
        await saveBrand(data as BrandEditorFormValues);
      },
      enabled: isTenantLoading !== null && autoSave && brandEditorContent !== null,
      debounceMs: autoSaveDebounce,
      onError: useMemo(() => () => toast.error("Error saving theme"), []),
    });

    // Simple effect with only the essential logic
    useEffect(() => {
      // Skip if no tenant or already loading
      if (!tenantId || isTenantLoading || (tenantData && isTenantLoading === false)) {
        return;
      }

      getTenant();
    }, [tenantId, getTenant, isTenantLoading, tenantData]);

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
      if (!isTenantLoading) {
        isInitialLoadRef.current = false;
      }
    }, [isTenantLoading]);

    useEffect(() => {
      // Only set form values if brandEditorForm is not already populated
      if (!brandEditorForm) {
        const brandSettings = tenantData?.data?.tenant?.brand?.settings;

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
    }, [tenantData, setBrandEditorForm, brandEditorContent, brandEditorForm]);

    return (
      <MainLayout theme={theme} isLoading={Boolean(isTenantLoading && isInitialLoadRef.current)}>
        <Editor ref={ref} hidePublish={hidePublish} {...props} />
      </MainLayout>
    );
  }
);

export const BrandEditor = memo(BrandEditorComponent);
