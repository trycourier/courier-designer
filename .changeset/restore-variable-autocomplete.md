---
"@trycourier/react-designer": minor
---

Restore variable autocomplete functionality.

**Changes:**
- The `variables` prop is now active again - when provided, typing `{{` shows an autocomplete dropdown with matching variables
- Added `disableVariablesAutocomplete` prop (default: `false`) - when `true`, disables autocomplete and allows users to type any variable name freely
- When autocomplete is enabled with `variables` provided, users can filter and select from the available variables list

**Usage with autocomplete (restrictive - for Courier Create):**
```tsx
<TemplateEditor
  variables={{ user: { name: '', email: '' }, order: { id: '' } }}
/>
```

**Usage without autocomplete (permissive - for Courier's product):**
```tsx
<TemplateEditor disableVariablesAutocomplete />
```

The `variables` and `disableVariablesAutocomplete` props can be combined with the new `variableValidation` prop for stricter enforcement of allowed variable names.

