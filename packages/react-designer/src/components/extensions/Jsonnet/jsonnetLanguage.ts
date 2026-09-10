import type { Monaco } from "@monaco-editor/react";

export const JSONNET_LANGUAGE_ID = "jsonnet";

/**
 * Monaco ships no jsonnet grammar, so register one. Ported from the v1
 * designer's CodeMirror mode (`syntax-highlighter/jsonnet.ts`) so both editors
 * colour the same snippet the same way. Tokens only — jsonnet cannot be parsed
 * in the browser, so nothing here validates.
 */
export function registerJsonnetLanguage(monaco: Monaco): void {
  if (monaco.languages.getLanguages().some((lang) => lang.id === JSONNET_LANGUAGE_ID)) {
    return;
  }

  monaco.languages.register({ id: JSONNET_LANGUAGE_ID });

  monaco.languages.setLanguageConfiguration(JSONNET_LANGUAGE_ID, {
    comments: {
      lineComment: "//",
      blockComment: ["/*", "*/"],
    },
    brackets: [
      ["{", "}"],
      ["[", "]"],
      ["(", ")"],
    ],
    autoClosingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: '"', close: '"', notIn: ["string", "comment"] },
      { open: "'", close: "'", notIn: ["string", "comment"] },
    ],
    surroundingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
  });

  monaco.languages.setMonarchTokensProvider(JSONNET_LANGUAGE_ID, {
    keywords: [
      "assert",
      "else",
      "error",
      "for",
      "function",
      "if",
      "import",
      "importstr",
      "in",
      "local",
      "self",
      "super",
      "tailstrict",
      "then",
      "$",
    ],
    atoms: ["true", "false", "null"],
    tokenizer: {
      root: [
        { include: "@whitespace" },
        [/\|\|\|/, { token: "string", next: "@textblock" }],
        [/@["']/, { token: "string.quote", next: "@rawstring" }],
        [/"/, { token: "string.quote", next: "@stringDouble" }],
        [/'/, { token: "string.quote", next: "@stringSingle" }],
        [
          /[a-zA-Z_$][\w$]*/,
          {
            cases: {
              "@keywords": "keyword",
              "@atoms": "constant",
              "@default": "identifier",
            },
          },
        ],
        [/(?:\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/, "number"],
        [/[{}()[\]]/, "@brackets"],
        [/[-+*/=<>!&~^|%]+/, "operator"],
        [/[,;:.]/, "delimiter"],
      ],
      whitespace: [
        [/[ \t\r\n]+/, ""],
        [/\/\*/, { token: "comment", next: "@blockComment" }],
        [/\/\/.*$/, "comment"],
        [/#.*$/, "comment"],
      ],
      blockComment: [
        [/[^/*]+/, "comment"],
        [/\*\//, { token: "comment", next: "@pop" }],
        [/[/*]/, "comment"],
      ],
      stringDouble: [
        [/\\(?:[\\"'bfnrt0]|u[0-9a-fA-F]{4})/, "string.escape"],
        [/\\./, "string.invalid"],
        [/"/, { token: "string.quote", next: "@pop" }],
        [/[^\\"]+/, "string"],
      ],
      stringSingle: [
        [/\\(?:[\\"'bfnrt0]|u[0-9a-fA-F]{4})/, "string.escape"],
        [/\\./, "string.invalid"],
        [/'/, { token: "string.quote", next: "@pop" }],
        [/[^\\']+/, "string"],
      ],
      // Verbatim strings: the only escape is a doubled quote.
      rawstring: [
        [/""|''/, "string.escape"],
        [/["']/, { token: "string.quote", next: "@pop" }],
        [/[^"']+/, "string"],
      ],
      textblock: [
        [/^\s*\|\|\|/, { token: "string", next: "@pop" }],
        [/.*$/, "string"],
      ],
    },
  });
}
