import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { forwardRef, memo, useEffect, useMemo, useRef } from "react";
import { useBrandActions } from "../Providers";
import { isTenantLoadingAtom, tenantDataAtom, tenantIdAtom } from "../Providers/store";
import type { Theme } from "../ui-kit/ThemeProvider/ThemeProvider.types";
import { MainLayout } from "../ui/MainLayout";
import { Editor, type EditorProps } from "./Editor";
import { BrandEditorContentAtom } from "./store";
import type { BrandSettings } from "./BrandEditor.types";

export interface BrandEditorProps extends EditorProps {
  theme?: Theme | string;
}

const BrandEditorComponent = forwardRef<HTMLDivElement, BrandEditorProps>(
  ({ hidePublish = false, autoSaveDebounce = 200, autoSave = true, theme, ...props }, ref) => {
    const isTenantLoading = useAtomValue(isTenantLoadingAtom);
    const isInitialLoadRef = useRef(true);
    const tenantId = useAtomValue(tenantIdAtom);
    const { getTenant } = useBrandActions();
    const [tenantData, setTenantData] = useAtom(tenantDataAtom);
    const setBrandEditorContent = useSetAtom(BrandEditorContentAtom);

    useEffect(() => {
      if (tenantData && tenantId !== tenantData?.data?.tenant?.tenantId) {
        console.log("setting tenant data to null", tenantData);
        setTenantData(null);
        setBrandEditorContent(null);
        isInitialLoadRef.current = false;
      }
    }, [tenantData, tenantId, setTenantData, setBrandEditorContent]);

    // Simple effect with only the essential logic
    useEffect(() => {
      // Skip if no tenant or already loading
      if (!tenantId || isTenantLoading || (tenantData && isTenantLoading === false)) {
        return;
      }

      getTenant();
    }, [tenantId, getTenant, isTenantLoading, tenantData]);

    // Update isInitialLoadRef when loading state changes
    useEffect(() => {
      if (!isTenantLoading) {
        isInitialLoadRef.current = false;
      }
    }, [isTenantLoading]);

    const brandSettings = useMemo(() => tenantData?.data?.tenant?.brand?.settings, [tenantData]);

    return (
      <MainLayout theme={theme} isLoading={Boolean(isTenantLoading && isInitialLoadRef.current)}>
        <Editor
          ref={ref}
          value={brandSettings as BrandSettings}
          autoSaveDebounce={autoSaveDebounce}
          autoSave={autoSave}
          hidePublish={hidePublish}
          {...props}
        />
      </MainLayout>
    );
  }
);

export const BrandEditor = memo(BrandEditorComponent);
