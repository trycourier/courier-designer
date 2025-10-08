import React, { useRef, useCallback, useState, lazy, Suspense } from "react";
import type { Monaco } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { Spinner } from "@/components/ui/Spinner";

// Dynamically import Monaco Editor to reduce initial bundle size
// and allow better deduplication with consumer's Monaco installations
const Editor = lazy(() =>
  import("@monaco-editor/react").then((module) => ({
    default: module.Editor,
  }))
);

export type HTMLValidator = (
  code: string,
  editor: editor.IStandaloneCodeEditor,
  monaco: Monaco
) => boolean;

interface MonacoCodeEditorProps {
  code: string;
  onSave: (code: string) => void;
  onCancel: () => void; // Keep for backward compatibility but won't be used
  onValidationChange?: (isValid: boolean) => void;
  validator?: HTMLValidator;
}

// Debounce utility
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
 * Default HTML validator using Monaco's markers and DOMParser
 * Checks for:
 * - Monaco language service errors
 * - Incomplete/malformed tags
 * - Mismatched angle brackets
 * - Unclosed tags
 */
export const defaultHTMLValidator: HTMLValidator = (code, editor, monaco) => {
  if (!editor || !monaco) return true;

  const model = editor.getModel();
  if (!model) return true;

  // Get validation markers from Monaco's HTML language service
  const markers = monaco.editor.getModelMarkers({ resource: model.uri });

  // Filter for errors only (severity 8), ignore warnings and info
  const errors = markers.filter((marker: editor.IMarker) => marker.severity === 8);

  // If Monaco found errors, it's invalid
  if (errors.length > 0) return false;

  // Additional validation with DOMParser to catch unclosed tags
  // Monaco's HTML validator can be lenient
  if (!code.trim()) return true; // Empty code is valid

  try {
    // Check for incomplete/malformed tags (e.g., "<a " without closing ">")
    // Look for opening angle bracket followed by tag name but not properly closed
    const incompleteTagPattern = /<[a-z][a-z0-9]*\s[^>]*$/i;
    if (incompleteTagPattern.test(code.trim())) {
      return false; // Incomplete tag at the end
    }

    // Check for opening tags that are never closed with ">"
    const allOpenBrackets = (code.match(/</g) || []).length;
    const allCloseBrackets = (code.match(/>/g) || []).length;
    if (allOpenBrackets !== allCloseBrackets) {
      return false; // Mismatched angle brackets
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(code, "text/html");

    // Check for parser errors
    const parserErrors = doc.getElementsByTagName("parsererror");
    if (parserErrors.length > 0) {
      return false;
    }

    // Check for unclosed tags by comparing opening and closing tags
    const openTags = (code.match(/<([a-z][a-z0-9]*)\b[^>]*(?<!\/\/)>/gi) || [])
      .map((tag: string) => tag.match(/<([a-z][a-z0-9]*)/i)?.[1]?.toLowerCase())
      .filter(Boolean);

    const closeTags = (code.match(/<\/([a-z][a-z0-9]*)\s*>/gi) || [])
      .map((tag: string) => tag.match(/<\/([a-z][a-z0-9]*)/i)?.[1]?.toLowerCase())
      .filter(Boolean);

    // Self-closing and void elements
    const voidElements = [
      "area",
      "base",
      "br",
      "col",
      "embed",
      "hr",
      "img",
      "input",
      "link",
      "meta",
      "param",
      "source",
      "track",
      "wbr",
    ];
    const openTagsFiltered = openTags.filter(
      (tag: string | undefined) => tag && !voidElements.includes(tag)
    );

    // Check if all opening tags have closing tags
    for (const tag of openTagsFiltered) {
      const openCount = openTags.filter((t) => t === tag).length;
      const closeCount = closeTags.filter((t) => t === tag).length;
      if (openCount !== closeCount) {
        return false;
      }
    }

    return true;
  } catch (error) {
    return false;
  }
};

export const MonacoCodeEditor: React.FC<MonacoCodeEditorProps> = ({
  code,
  onSave,
  onValidationChange,
  validator = defaultHTMLValidator,
}) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const [isValid, setIsValid] = useState(true);

  // Check validation status using the provided or default validator
  const checkValidation = useCallback(() => {
    if (!editorRef.current || !monacoRef.current) return true;

    const model = editorRef.current.getModel();
    if (!model) return true;

    const code = model.getValue();
    const valid = validator(code, editorRef.current, monacoRef.current);

    if (valid !== isValid) {
      setIsValid(valid);
      onValidationChange?.(valid);
    }

    return valid;
  }, [isValid, onValidationChange, validator]);

  // Debounced save function that validates before saving
  const debouncedSave = useDebounce((newCode: string) => {
    // Wait a bit for Monaco to compute markers, then check validation before saving
    setTimeout(() => {
      const valid = checkValidation();
      if (valid) {
        onSave(newCode);
      }
    }, 150); // Give Monaco time to compute validation markers
  }, 500); // 500ms debounce

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    editor.focus();

    // Listen to content changes to check validation
    editor.onDidChangeModelContent(() => {
      // Small delay to allow Monaco to update markers
      setTimeout(checkValidation, 100);
    });

    // Initial validation check
    setTimeout(checkValidation, 100);
  };

  const handleCodeChange = (value: string | undefined) => {
    const newCode = value || "";
    debouncedSave(newCode);
  };

  return (
    <div className="courier-border courier-border-gray-300 courier-rounded courier-overflow-hidden">
      <div className="courier-h-[300px] courier-p-2">
        <Suspense
          fallback={
            <div className="courier-flex courier-items-center courier-justify-center courier-h-full courier-text-gray-500">
              <Spinner />
            </div>
          }
        >
          <Editor
            height="100%"
            defaultLanguage="html"
            value={code}
            onChange={handleCodeChange}
            onMount={handleEditorDidMount}
            theme="vs-light"
            options={{
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 14,
              wordWrap: "on",
              automaticLayout: true,
              tabSize: 2,
              insertSpaces: true,
              formatOnPaste: true,
              formatOnType: true,
              glyphMargin: false,
              folding: false,
              lineDecorationsWidth: 10,
              lineNumbersMinChars: 0,
              // Render widgets (autocomplete, hover, etc.) outside the editor container
              // This prevents them from being clipped by parent overflow:hidden
              fixedOverflowWidgets: true,
            }}
          />
        </Suspense>
      </div>
    </div>
  );
};
