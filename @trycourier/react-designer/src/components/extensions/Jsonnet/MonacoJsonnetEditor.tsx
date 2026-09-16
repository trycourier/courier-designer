import React, { lazy, Suspense, useCallback, useRef } from "react";
import type { Monaco } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { Spinner } from "@/components/ui/Spinner";
import { useIsDarkMode } from "../shared/useIsDarkMode";
import { JSONNET_LANGUAGE_ID, registerJsonnetLanguage } from "./jsonnetLanguage";

const Editor = lazy(() =>
  import("@monaco-editor/react").then((module) => ({
    default: module.Editor,
  }))
);

interface MonacoJsonnetEditorProps {
  template: string;
  onSave: (template: string) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function useDebounce<T extends (...args: any[]) => void>(callback: T, delay: number): T {
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => callback(...args), delay);
    }) as T,
    [callback, delay]
  );
}

/**
 * Jsonnet counterpart to MonacoCodeEditor. Deliberately has no validator: the
 * HTML block can lean on Monaco's HTML language service, but there is no
 * jsonnet parser in the browser, so — as in the v1 designer — whatever is typed
 * is saved and the backend is the first thing to compile it.
 */
export const MonacoJsonnetEditor: React.FC<MonacoJsonnetEditorProps> = ({ template, onSave }) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const { isDark, containerRef } = useIsDarkMode();

  const debouncedSave = useDebounce(() => {
    if (editorRef.current) {
      // Read from the model rather than the change event to avoid a stale value.
      onSave(editorRef.current.getModel()?.getValue() ?? "");
    }
  }, 500);

  const handleEditorWillMount = (monaco: Monaco) => {
    registerJsonnetLanguage(monaco);
  };

  const handleEditorDidMount = (codeEditor: editor.IStandaloneCodeEditor) => {
    editorRef.current = codeEditor;
    codeEditor.focus();
  };

  return (
    <div ref={containerRef} className="courier-h-full courier-overflow-hidden">
      <div className="courier-h-full courier-p-2">
        <Suspense
          fallback={
            <div className="courier-flex courier-items-center courier-justify-center courier-h-full courier-text-gray-500">
              <Spinner />
            </div>
          }
        >
          <Editor
            height="100%"
            defaultLanguage={JSONNET_LANGUAGE_ID}
            defaultValue={template}
            beforeMount={handleEditorWillMount}
            onChange={debouncedSave}
            onMount={handleEditorDidMount}
            theme={isDark ? "vs-dark" : "vs-light"}
            options={{
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 14,
              wordWrap: "on",
              automaticLayout: true,
              tabSize: 4,
              insertSpaces: true,
              glyphMargin: false,
              folding: false,
              lineDecorationsWidth: 10,
              lineNumbersMinChars: 0,
              // Render widgets outside the container so parent overflow:hidden
              // does not clip them.
              fixedOverflowWidgets: true,
            }}
          />
        </Suspense>
      </div>
    </div>
  );
};
