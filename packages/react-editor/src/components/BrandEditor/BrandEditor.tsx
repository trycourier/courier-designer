import { useAtomValue } from "jotai";
import { forwardRef, useRef } from "react";
import { isBrandLoadingAtom } from "../BrandProvider/store";
import { Theme } from "../ui-kit/ThemeProvider/ThemeProvider.types";
import { EditorLayout } from "../ui/EditorLayout";
import { Loader } from "../ui/Loader";
import { Editor } from './Editor';

export type BrandEditorProps = {
  className?: string;
  autoSave?: boolean;
  theme?: Theme | string;
  variables?: Record<string, any>;
};

export const BrandEditor = forwardRef<HTMLDivElement, BrandEditorProps>(({ autoSave = true, theme, variables }, ref) => {
  const isBrandLoading = useAtomValue(isBrandLoadingAtom);
  const isInitialLoadRef = useRef(true);

  return (
    <EditorLayout theme={theme}>
      {isBrandLoading && isInitialLoadRef.current && (
        <div className="courier-editor-loading">
          <Loader />
        </div>
      )}
      <Editor autoSave={autoSave} ref={ref} isVisible={!isBrandLoading} variables={variables} />
    </EditorLayout>
  );
});
