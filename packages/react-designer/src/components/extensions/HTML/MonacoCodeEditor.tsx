import React, { useRef, useCallback, useState, lazy, Suspense } from "react";
import type { Monaco } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { Spinner } from "@/components/ui/Spinner";
import { useIsDarkMode } from "../shared/useIsDarkMode";

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
  /**
   * Called with the reasons the current code can't be saved (empty when it's valid).
   * Invalid code is never passed to onSave, so surface these or the edit is lost silently.
   * `edited` is false until the user changes the code, so hosts can tell code that was
   * loaded invalid apart from an edit that was just rejected.
   */
  onValidationErrors?: (errors: string[], meta: { edited: boolean }) => void;
  validator?: HTMLValidator;
}

const GENERIC_VALIDATION_ERROR = "This HTML didn't pass validation.";

// Outlook conditional comments: <!--[if mso]>, <!--[if gte mso 9]>, <!--[if !mso]><!-->
const MSO_CONDITIONAL_PATTERN = /<!--\[if\s[^\]]*\bmso\b[^\]]*\]>/i;

// Handlebars comments ({{!-- … --}}, {{! … }}) never render.
const stripHandlebarsComments = (code: string) =>
  code.replace(/\{\{!--[\s\S]*?--\}\}/g, "").replace(/\{\{![\s\S]*?\}\}/g, "");

// Only markup can unbalance brackets and tags, so leave out what isn't markup: comments,
// Handlebars partials ({{> name}}), and the bodies of <style> and <script>, where ">" is
// a CSS combinator or a JS operator.
const stripNonMarkup = (code: string) =>
  stripHandlebarsComments(code)
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\{\{~?>[\s\S]*?\}\}/g, "")
    .replace(/(<(style|script)\b[^>]*>)[\s\S]*?(<\/\2\s*>)/gi, "$1$3");

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
 * Returns the reasons HTML can't be saved, using Monaco's markers and DOMParser.
 * An empty array means the code is valid. Checks for:
 * - Outlook conditional comments (unsupported)
 * - Monaco language service errors
 * - Incomplete/malformed tags
 * - Mismatched angle brackets
 * - Unclosed tags
 */
export const getHTMLValidationErrors = (
  code: string,
  editor: editor.IStandaloneCodeEditor,
  monaco: Monaco
): string[] => {
  if (!editor || !monaco) return [];

  const model = editor.getModel();
  if (!model) return [];

  // Unsupported by policy, even when the conditional markup is otherwise well formed.
  if (MSO_CONDITIONAL_PATTERN.test(stripHandlebarsComments(code))) {
    return [
      "Outlook conditional comments (<!--[if mso]> … <![endif]-->) aren't supported in HTML blocks. Remove them, keeping only the markup for non-Outlook clients.",
    ];
  }

  // Get validation markers from Monaco's HTML language service
  const markers = monaco.editor.getModelMarkers({ resource: model.uri });

  // Filter for errors only (severity 8), ignore warnings and info
  const markerErrors = markers.filter((marker: editor.IMarker) => marker.severity === 8);

  if (markerErrors.length > 0) {
    return markerErrors
      .slice(0, 3)
      .map((marker) => `Line ${marker.startLineNumber}: ${marker.message}`);
  }

  // Additional validation with DOMParser to catch unclosed tags
  // Monaco's HTML validator can be lenient
  if (!code.trim()) return []; // Empty code is valid

  const markup = stripNonMarkup(code);

  try {
    // Check for incomplete/malformed tags (e.g., "<a " without closing ">")
    // Look for opening angle bracket followed by tag name but not properly closed
    const incompleteTagPattern = /<[a-z][a-z0-9]*\s[^>]*$/i;
    if (incompleteTagPattern.test(markup.trim())) {
      return ['The last tag is missing its closing ">".'];
    }

    // Check for opening tags that are never closed with ">"
    const allOpenBrackets = (markup.match(/</g) || []).length;
    const allCloseBrackets = (markup.match(/>/g) || []).length;
    if (allOpenBrackets !== allCloseBrackets) {
      return [
        `Found ${allOpenBrackets} "<" but ${allCloseBrackets} ">". A tag is missing an angle bracket.`,
      ];
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(code, "text/html");

    // Check for parser errors
    const parserErrors = doc.getElementsByTagName("parsererror");
    if (parserErrors.length > 0) {
      return ["The HTML couldn't be parsed."];
    }

    // Check for unclosed tags by comparing opening and closing tags
    const openTags = (markup.match(/<([a-z][a-z0-9]*)\b[^>]*(?<!\/\/)>/gi) || [])
      .map((tag: string) => tag.match(/<([a-z][a-z0-9]*)/i)?.[1]?.toLowerCase())
      .filter(Boolean);

    const closeTags = (markup.match(/<\/([a-z][a-z0-9]*)\s*>/gi) || [])
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
    for (const tag of new Set(openTagsFiltered)) {
      const openCount = openTags.filter((t) => t === tag).length;
      const closeCount = closeTags.filter((t) => t === tag).length;
      if (openCount !== closeCount) {
        const tags = (n: number, kind: string) => `${n} ${kind} tag${n === 1 ? "" : "s"}`;
        return [`<${tag}> has ${tags(openCount, "opening")} but ${tags(closeCount, "closing")}.`];
      }
    }

    return [];
  } catch (error) {
    return [GENERIC_VALIDATION_ERROR];
  }
};

/** Boolean form of getHTMLValidationErrors, kept as the `validator` prop's default. */
export const defaultHTMLValidator: HTMLValidator = (code, editor, monaco) =>
  getHTMLValidationErrors(code, editor, monaco).length === 0;

export const MonacoCodeEditor: React.FC<MonacoCodeEditorProps> = ({
  code,
  onSave,
  onValidationChange,
  onValidationErrors,
  validator = defaultHTMLValidator,
}) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const [isValid, setIsValid] = useState(true);
  // null so the first check always reports, clearing errors left over from another block
  const lastErrorsRef = useRef<string | null>(null);
  const hasEditedRef = useRef(false);
  // The content-change listener is registered once on mount, so it reads the latest
  // callbacks through refs instead of the first render's closure.
  const onValidationErrorsRef = useRef(onValidationErrors);
  onValidationErrorsRef.current = onValidationErrors;
  const { isDark, containerRef } = useIsDarkMode();

  // Check validation status using the provided or default validator
  const checkValidation = useCallback(() => {
    if (!editorRef.current || !monacoRef.current) return true;

    const model = editorRef.current.getModel();
    if (!model) return true;

    const code = model.getValue();
    // Only the default validator can explain itself; a custom one gets a generic reason.
    const errors =
      validator === defaultHTMLValidator
        ? getHTMLValidationErrors(code, editorRef.current, monacoRef.current)
        : validator(code, editorRef.current, monacoRef.current)
          ? []
          : [GENERIC_VALIDATION_ERROR];
    const valid = errors.length === 0;

    if (valid !== isValid) {
      setIsValid(valid);
      onValidationChange?.(valid);
    }

    const edited = hasEditedRef.current;
    const errorsKey = `${edited}\n${errors.join("\n")}`;
    if (errorsKey !== lastErrorsRef.current) {
      lastErrorsRef.current = errorsKey;
      onValidationErrorsRef.current?.(errors, { edited });
    }

    return valid;
  }, [isValid, onValidationChange, validator]);
  const checkValidationRef = useRef(checkValidation);
  checkValidationRef.current = checkValidation;

  // Debounced save function that validates before saving
  const debouncedSave = useDebounce(() => {
    // Wait a bit for Monaco to compute markers, then check validation before saving
    setTimeout(() => {
      const valid = checkValidation();
      if (valid && editorRef.current) {
        // Read the current value from the model to avoid stale closure values
        onSave(editorRef.current.getModel()?.getValue() || "");
      }
    }, 150); // Give Monaco time to compute validation markers
  }, 500); // 500ms debounce

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    editor.focus();

    // Listen to content changes to check validation
    editor.onDidChangeModelContent(() => {
      hasEditedRef.current = true;
      // Small delay to allow Monaco to update markers
      setTimeout(() => checkValidationRef.current(), 100);
    });

    // Initial validation check
    setTimeout(checkValidation, 100);
  };

  const handleCodeChange = () => {
    debouncedSave();
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
            defaultLanguage="html"
            defaultValue={code}
            onChange={handleCodeChange}
            onMount={handleEditorDidMount}
            theme={isDark ? "vs-dark" : "vs-light"}
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
