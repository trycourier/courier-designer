import { useAtomValue } from "jotai";
import { forwardRef, useEffect, useRef } from "react";
import { useBrandActions } from "../BrandProvider/BrandProvider";
import { brandTenantIdAtom, isBrandLoadingAtom } from "../BrandProvider/store";
import { Theme } from "../ui-kit/ThemeProvider/ThemeProvider.types";
import { EditorLayout } from "../ui/EditorLayout";
import { Loader } from "../ui/Loader";
import { Editor, EditorProps } from './Editor';

export interface BrandEditorProps extends EditorProps {
  theme?: Theme | string;
}

export const BrandEditor = forwardRef<HTMLDivElement, BrandEditorProps>(({ hidePublish = false, autoSaveDebounce = 200, theme, ...props }, ref) => {
  const isBrandLoading = useAtomValue(isBrandLoadingAtom);
  const isInitialLoadRef = useRef(true);
  const brandTenantId = useAtomValue(brandTenantIdAtom);
  const { getBrand } = useBrandActions();

  useEffect(() => {
    if (brandTenantId) {
      getBrand(brandTenantId)
    }
  }, [brandTenantId, getBrand]);

  return (
    <EditorLayout theme={theme}>
      {isBrandLoading && isInitialLoadRef.current && (
        <div className="courier-editor-loading">
          <Loader />
        </div>
      )}
      <Editor ref={ref} isVisible={!isBrandLoading} autoSaveDebounce={autoSaveDebounce} hidePublish={hidePublish} {...props} />
    </EditorLayout>
  );
});
