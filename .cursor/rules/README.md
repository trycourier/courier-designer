# Courier Editor Development Rules

This directory contains development guidelines and standards for the Courier Editor project. These rules are designed to help maintain consistency, quality, and best practices across the codebase.

## Available Rules

| Rule                                                             | Description                                                                    | Applies To            |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------- |
| [Courier Editor Guidelines](./courier-editor-guidelines.mdc)     | Core development guidelines covering architecture, tech stack, and conventions | All React Editor code |
| [Accessibility Standards](./courier-accessibility-standards.mdc) | WCAG compliance and accessibility requirements                                 | All UI components     |
| [Component Standards](./courier-component-standards.mdc)         | Guidelines for React component development                                     | Component files       |
| [TipTap Implementation](./courier-tiptap-guidelines.mdc)         | Specific guidelines for the TipTap editor integration                          | Editor-related files  |
| [Email Compatibility](./courier-email-compatibility.mdc)         | Standards for ensuring email templates render correctly                        | Template-related code |

## How These Rules Work

These rules are automatically applied by Cursor AI when working with relevant files. The rules use glob patterns to determine which files they apply to. Each rule includes:

- **Title**: Brief name of the rule
- **Description**: Short explanation of what the rule covers
- **Glob Pattern**: Pattern to match files where the rule applies
- **Priority** (optional): Indicates importance level
- **Tags** (optional): Additional categorization for the rule
- **Always Apply** (optional): Controls whether the rule is automatically applied (true) or only when explicitly requested (false)

More specialized rules have `alwaysApply: false` to prevent overwhelming the AI with too many guidelines at once. Core rules like general guidelines and accessibility standards are always applied automatically.

## Contributing to Rules

When updating these rules:

1. Ensure the rule has a clear, concise title and description
2. Use appropriate glob patterns to target relevant files
3. Keep the content organized in logical sections
4. Provide specific, actionable guidance
5. Include examples where helpful

## Usage with Cursor AI

When working with Cursor AI, you can reference these rules using the fetch_rules tool. For example:

```
fetch_rules(["courier-editor-guidelines"])
```

This will provide the AI with the specific guidelines to follow when assisting with your code.
