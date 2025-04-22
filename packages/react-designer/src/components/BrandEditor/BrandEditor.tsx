import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { forwardRef, memo, useEffect, useRef } from "react";
import { useBrandActions } from "../Providers";
import { isTenantLoadingAtom, tenantDataAtom, tenantIdAtom } from "../Providers/store";
import type { Theme } from "../ui-kit/ThemeProvider/ThemeProvider.types";
import { EditorLayout } from "../ui/EditorLayout";
import { Loader } from "../ui/Loader";
import { Editor, type EditorProps } from "./Editor";
import { BrandEditorContentAtom } from "./store";

export interface BrandEditorProps extends EditorProps {
  theme?: Theme | string;
}

// Track the current tenant and pending fetches globally
let currentTenantId: string | null = null;
let pendingFetch = false;

const BrandEditorComponent = forwardRef<HTMLDivElement, BrandEditorProps>(
  ({ hidePublish = false, autoSaveDebounce = 200, autoSave = true, theme, ...props }, ref) => {
    const isTenantLoading = useAtomValue(isTenantLoadingAtom);
    const isInitialLoadRef = useRef(true);
    const tenantId = useAtomValue(tenantIdAtom);
    const { getTenant } = useBrandActions();
    const [tenantData, setTenantData] = useAtom(tenantDataAtom);
    const setBrandEditorContent = useSetAtom(BrandEditorContentAtom);

    useEffect(() => {
      if (tenantData && tenantId !== currentTenantId) {
        setTenantData(null);
        setBrandEditorContent(null);
        isInitialLoadRef.current = false;
      }
    }, [tenantData, tenantId, setTenantData, setBrandEditorContent]);

    useEffect(() => {
      return () => {
        currentTenantId = null;
        pendingFetch = false;
      };
    }, []);

    // Simple effect with only the essential logic
    useEffect(() => {
      // Skip if no tenant or already loading
      if (!tenantId || isTenantLoading || pendingFetch) {
        return;
      }

      // Skip if tenant hasn't changed
      if (tenantId === currentTenantId) {
        return;
      }

      // Tenant has changed - update and fetch
      currentTenantId = tenantId;
      pendingFetch = true;

      // Make the API call
      getTenant().finally(() => {
        pendingFetch = false;
      });
    }, [tenantId, getTenant, isTenantLoading]);

    // Update isInitialLoadRef when loading state changes
    useEffect(() => {
      if (!isTenantLoading) {
        isInitialLoadRef.current = false;
      }
    }, [isTenantLoading]);

    return (
      <EditorLayout theme={theme}>
        {isTenantLoading && isInitialLoadRef.current && (
          <div className="courier-editor-loading">
            <Loader />
          </div>
        )}
        <Editor
          ref={ref}
          isVisible={!isTenantLoading}
          autoSaveDebounce={autoSaveDebounce}
          autoSave={autoSave}
          hidePublish={hidePublish}
          {...props}
        />
      </EditorLayout>
    );
  }
);

export const BrandEditor = memo(BrandEditorComponent);
