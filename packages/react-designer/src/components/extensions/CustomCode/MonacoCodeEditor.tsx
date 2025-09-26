import React, { useRef, useCallback } from "react";
import Editor from "@monaco-editor/react";

interface MonacoCodeEditorProps {
  code: string;
  onSave: (code: string) => void;
  onCancel: () => void; // Keep for backward compatibility but won't be used
}

// Debounce utility
function useDebounce<T extends (...args: any[]) => void>(callback: T, delay: number): T {
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback(
    ((...args: any[]) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => callback(...args), delay);
    }) as T,
    [callback, delay]
  );
}

// HTML validation utility
function isValidHTML(code: string): boolean {
  if (!code.trim()) return true; // Empty code is valid

  try {
    // Create a temporary DOM element to test parsing
    const parser = new DOMParser();
    const doc = parser.parseFromString(code, "text/html");

    // Check for parser errors
    const parserErrors = doc.getElementsByTagName("parsererror");
    if (parserErrors.length > 0) {
      return false;
    }

    // For simple validation, we'll allow any content that doesn't have obvious parsing errors
    return true;
  } catch (error) {
    return false;
  }
}

export const MonacoCodeEditor: React.FC<MonacoCodeEditorProps> = ({ code, onSave }) => {
  const editorRef = useRef<any>(null);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
    editor.focus();
  };

  // Debounced save function that validates before saving
  const debouncedSave = useDebounce((newCode: string) => {
    if (isValidHTML(newCode)) {
      onSave(newCode);
    }
  }, 500); // 500ms debounce

  const handleCodeChange = (value: string | undefined) => {
    const newCode = value || "";
    debouncedSave(newCode);
  };

  return (
    <div className="courier-border courier-border-gray-300 courier-rounded courier-overflow-hidden">
      <div className="courier-h-[430px] courier-bg-[#1e1e1e] courier-p-2">
        <Editor
          height="100%"
          defaultLanguage="html"
          value={code}
          onChange={handleCodeChange}
          onMount={handleEditorDidMount}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 14,
            // lineNumbers: "off",
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
          }}
        />
      </div>
    </div>
  );
};
