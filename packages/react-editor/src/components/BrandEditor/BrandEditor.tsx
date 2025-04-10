import { useAtomValue } from "jotai";
import { forwardRef, useEffect, useRef } from "react";
import { useBrandActions } from "../Providers";
import { isBrandLoadingAtom, tenantIdAtom } from "../Providers/store";
import type { Theme } from "../ui-kit/ThemeProvider/ThemeProvider.types";
import { EditorLayout } from "../ui/EditorLayout";
import { Loader } from "../ui/Loader";
import { Editor, type EditorProps } from "./Editor";

export interface BrandEditorProps extends EditorProps {
  theme?: Theme | string;
}

export const BrandEditor = forwardRef<HTMLDivElement, BrandEditorProps>(
  ({ hidePublish = false, autoSaveDebounce = 200, autoSave = true, theme, ...props }, ref) => {
    const isBrandLoading = useAtomValue(isBrandLoadingAtom);
    const isInitialLoadRef = useRef(true);
    const tenantId = useAtomValue(tenantIdAtom);
    const { getBrand } = useBrandActions();

    useEffect(() => {
      if (tenantId) {
        getBrand(tenantId);
      }
    }, [tenantId, getBrand]);

    return (
      <EditorLayout theme={theme}>
        {isBrandLoading && isInitialLoadRef.current && (
          <div className="courier-editor-loading">
            <Loader />
          </div>
        )}
        <Editor
          ref={ref}
          isVisible={!isBrandLoading}
          autoSaveDebounce={autoSaveDebounce}
          autoSave={autoSave}
          hidePublish={hidePublish}
          {...props}
        />
      </EditorLayout>
    );
  }
);
