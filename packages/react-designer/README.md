# Introduction

Courier Create is a package designed to facilitate the editing of templates in a multi-tenant environment. In platforms like Courier, where the application serves different users or clients (tenants) with unique configurations, this package makes it easy to edit and manage templates associated with specific tenants directly within your React application.

## Key Features

- **Embedded React Integration**
  Easily integrate the template editor directly into your existing React application.
- **Multi-Tenant Support**
  Seamlessly manage and edit templates for different tenants, each with their own branding.
- **Brand Editing**
  Customize branding elements such as logos, colors, and styles per tenant to ensure consistency with each client's identity.
- **Developer Friendly**
  Designed with intuitive APIs and flexible components to speed up development and integration.

# Getting Started

## Installation

```tsx
npm install @trycourier/react-designer
```

or

```tsx
yarn add @trycourier/react-designer
```

or

```tsx
pnpm add @trycourier/react-designer
```

### Bundle Size and Dependencies

The package includes Monaco Editor for the Custom Code block feature. Monaco Editor is loaded dynamically (lazy-loaded) only when the Custom Code feature is actually used, minimizing the impact on your initial bundle size.

**Monaco Editor Deduplication**

If your application already uses `@monaco-editor/react`, modern bundlers (Webpack 5, Vite, etc.) will likely deduplicate the dependency automatically. This package uses relaxed version ranges (`@monaco-editor/react`: `>=4.0.0 <6.0.0` and `monaco-editor`: `>=0.40.0 <1.0.0`) to maximize the chances of deduplication with consumer installations.

To minimize bundle size:
- Monaco Editor is lazy-loaded and only fetched when Custom Code blocks are used
- Modern bundlers will attempt deduplication when version ranges overlap
- Consider using the same version of `@monaco-editor/react` in your project if you're also using Monaco Editor directly

If bundle size is a critical concern for your use case, please reach out to discuss your specific requirements.

## Authentication

To use the Courier Editor, you'll need to authenticate your requests using a JWT token. For development environments, you can quickly get started with a client key, while JWT authentication is recommended for production deployments.

### Generate a JWT

**Scopes**

The follow scopes are available for the editor:

- `tenants:read`: allow the user to read all tenant data
- `tenants:brand:read`: allow the user to read brand data for all tenants
- `tenants:notifications:read`: allow the user to read all notification data for all tenants
- `tenants:notifications:write`: allow the user to write all notification data for all tenants
- `tenant:${TENANT_ID}:read` : allow the user to read tenant data for a specific tenant
- `tenant:${TENANT_ID}:notification:read` : allow the user to write notification data for a specific tenant
- `tenant:${TENANT_ID}:notification:write` : allow the user to write notification data for a specific tenant
- `tenant:${TENANT_ID}:brand:read` : allow the user to read brand data for a specific tenant
- `tenant:${TENANT_ID}:brand:write`: allow the user to write brand data for a specific tenant

Here is a curl example with all the scopes needed that the SDK uses. Change the scopes to the scopes you need for your use case.

**Example**

This example will generate a JWT that has access to all tenants and tenant notifications

```bash
curl --request POST \
     --url https://api.courier.com/auth/issue-token \
     --header 'Accept: application/json' \
     --header 'Authorization: Bearer $YOUR_AUTH_KEY' \
     --header 'Content-Type: application/json' \
     --data \
 '{
    "scope": "user_id:$YOUR_USER_ID tenants:read tenants:notifications:read tenants:notifications:write",
    "expires_in": "$YOUR_NUMBER days"
  }'

```

**Example**

This example will generate a JWT that only has access to a specific tenant and it's notifications

```bash
curl --request POST \
     --url https://api.courier.com/auth/issue-token \
     --header 'Accept: application/json' \
     --header 'Authorization: Bearer $YOUR_AUTH_KEY' \
     --header 'Content-Type: application/json' \
     --data \
 '{
    "scope": "user_id:$YOUR_USER_ID tenant:tenant-123:read tenant:tenant-123:notifications:read tenants:tenant-123:notifications:write",
    "expires_in": "$YOUR_NUMBER days"
  }'
```

**Example**

This example will generate a JWT that gives a user access to change brand information for a specific tenant

```bash
curl --request POST \
     --url https://api.courier.com/auth/issue-token \
     --header 'Accept: application/json' \
     --header 'Authorization: Bearer $YOUR_AUTH_KEY' \
     --header 'Content-Type: application/json' \
     --data \
 '{
    "scope": "user_id:$YOUR_USER_ID tenant:tenant-123:read tenant:tenant-123:brand:read tenant:tenant-123:brand:write",
    "expires_in": "$YOUR_NUMBER days"
  }'
```

## Editor Usage

To use the Courier editor, you do not need to have already created a template. Just give it an ID and it will be created if it does not already exist.

### Basic

This basic setup provides a fully functional editor with default settings. The TemplateProvider component handles state management and provides necessary context to the Editor.

As template changes are made, they are automatically saved to Courier.

```tsx
import "@trycourier/react-designer/styles.css";
import { TemplateEditor, TemplateProvider } from "@trycourier/react-designer";

function App() {
  return (
    <TemplateProvider templateId="template-123" tenantId="tenant-123" token="jwt">
      <TemplateEditor />
    </TemplateProvider>
  );
}
```

### Publishing Hook

By default, the Courier template editor exposes a publish button that the template editor can interact with after completing changes. To override this default publishing behavior, you can hide the publishing button and interact with the publishing action directly allowing you to tightly integrate with your application's workflow.

_Note:_ `useTemplateActions` _must be used inside of the `<TemplateProvider />` context_

```tsx
import "@trycourier/react-designer/styles.css";
import { TemplateEditor, TemplateProvider, useTemplateActions } from "@trycourier/react-designer";

function SaveButtonComponent() {
  const { publishTemplate } = useTemplateActions();

  const handlePublishTemplate = async () => {
    //... other publish logic
    await publishTemplate();
  };

  return (
    <div>
      <TemplateEditor hidePublish />
      <button onClick={handlePublishTemplate}>Save Template</button>
    </div>
  );
}

function App() {
  return (
    <TemplateProvider templateId="template-123" tenantId="tenant-123" token="jwt">
      <SaveButtonComponent />
    </TemplateProvider>
  );
}
```

### Theming

You can customize the look and feel through the theming API, which allows you to modify colors, and other visual elements via configuration.

```tsx
import "@trycourier/react-designer/styles.css";
import { TemplateEditor } from "@trycourier/react-designer";

function App() {
  return (
    <TemplateEditor
      theme={{
        background: "#ffffff",
        foreground: "#292929",
        muted: "#D9D9D9",
        mutedForeground: "#A3A3A3",
        popover: "#ffffff",
        popoverForeground: "#292929",
        border: "#DCDEE4",
        input: "#DCDEE4",
        card: "#FAF9F8",
        cardForeground: "#292929",
        primary: "#ffffff",
        primaryForeground: "#696F8C",
        secondary: "#F5F5F5",
        secondaryForeground: "#171717",
        accent: "#E5F3FF",
        accentForeground: "#1D4ED8",
        destructive: "#292929",
        destructiveForeground: "#FF3363",
        ring: "#80849D",
        radius: "6px",
      }}
    />
  );
}
```

### Disabling Auto-save

By default, the Courier Editor auto-saves content. To disable this feature, configure the provider as follows

_Note:_ `useTemplateActions` _must be used inside of the `<TemplateProvider />` context_

```tsx
import "@trycourier/react-designer/styles.css";
import { TemplateEditor, TemplateProvider, useTemplateActions } from "@trycourier/react-designer";

function SaveButtonComponent() {
  const { saveTemplate, publishTemplate } = useTemplateActions();

  const handleSaveTemplate = async () => {
    //... other publish logic
    await saveTemplate(); // the template must be saved before publishing
    await publishTemplate();
  };

  return (
    <div>
      <TemplateEditor autoSave={false} hidePublish />
      <button onClick={handleSaveTemplate}>Save Template</button>
    </div>
  );
}

function App() {
  return (
    <TemplateProvider templateId="template-123" tenantId="tenant-123" token="jwt">
      <SaveButtonComponent />
    </TemplateProvider>
  );
}
```

### Sending

To send to a message that has been created by you must include the tenant_id in the template identifier

```tsx
import { CourierClient } from "@trycourier/courier";

const courier = new CourierClient({ authorizationToken: "<AUTH_TOKEN>" }); // get from the Courier UI

const { requestId } = await courier.send({
  message: {
    context: {
      tenant_id: "<TENANT_ID>", // The tenant_id should be added to context
    },
    to: {
      data: {
        name: "Marty",
      },
      email: "marty_mcfly@email.com",
    },
    template: "tenant/<TEMPLATE_ID>", // The tenant/ qualifier should be added to the template_id
  },
});
```

### Variables

Variables are placeholders in your template that get replaced with actual data when the email is sent. For example, instead of writing "**Hello customer,**" you can write "**Hello `{{user.firstName}}`,**" which will display the recipient's actual name.

The Courier Editor supports any valid variable name, including nested structures like `{{user.firstName}}` or `{{company.address.city}}`.

**How to Insert Variables**

Type `{{variableName}}` directly in the editor. The variable will be automatically converted to a variable node when you finish typing. Variable names must follow valid JSON property naming conventions (e.g., `user.firstName`, `company.name`).

### Variable Autocomplete

When you provide a `variables` prop, the editor shows an autocomplete dropdown when users type `{{`. This guides users to select from available variables and helps prevent typos.

```tsx
import "@trycourier/react-designer/styles.css";
import { TemplateEditor, TemplateProvider } from "@trycourier/react-designer";

function App() {
  // Define available variables (can be nested objects)
  const variables = {
    user: {
      firstName: "",
      lastName: "",
      email: "",
    },
    order: {
      id: "",
      total: "",
      date: "",
    },
    company: {
      name: "",
    },
  };

  return (
    <TemplateProvider templateId="template-123" tenantId="tenant-123" token="jwt">
      <TemplateEditor variables={variables} />
    </TemplateProvider>
  );
}
```

When users type `{{` in the editor, they'll see a dropdown with:
- `user.firstName`
- `user.lastName`
- `user.email`
- `order.id`
- `order.total`
- `order.date`
- `company.name`

The dropdown filters as the user types, making it easy to find the right variable.

**Disabling Autocomplete:**

If you want to allow users to type any variable name without suggestions, use the `disableVariablesAutocomplete` prop:

```tsx
<TemplateEditor disableVariablesAutocomplete />
```

This is useful when you don't have a predefined list of variables and want to allow any variable name.

### Variable Validation

The editor supports custom variable validation, allowing you to restrict which variable names users can enter. This is useful when you have a specific set of allowed replacement variables and want to prevent users from entering arbitrary names that could cause errors downstream.

```tsx
import "@trycourier/react-designer/styles.css";
import { TemplateEditor, TemplateProvider } from "@trycourier/react-designer";
import type { VariableValidationConfig } from "@trycourier/react-designer";

const ALLOWED_VARIABLES = [
  "user.firstName",
  "user.lastName",
  "user.email",
  "order.id",
  "order.total",
];

function App() {
  const variableValidation: VariableValidationConfig = {
    // Custom validator - return true if variable is allowed
    validate: (name) => ALLOWED_VARIABLES.includes(name),
    
    // Behavior when validation fails: "mark" (default) or "remove"
    onInvalid: "mark",
    
    // Toast message shown on invalid variable
    invalidMessage: (name) => 
      `Variable "${name}" is not allowed. Available: ${ALLOWED_VARIABLES.join(", ")}`,
  };

  return (
    <TemplateProvider templateId="template-123" tenantId="tenant-123" token="jwt">
      <TemplateEditor variableValidation={variableValidation} />
    </TemplateProvider>
  );
}
```

**VariableValidationConfig Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `validate` | `(name: string) => boolean` | - | Custom validator function. Returns `true` if the variable is allowed. Runs after built-in format validation. |
| `onInvalid` | `"mark" \| "remove"` | `"mark"` | Behavior when validation fails. `"mark"` keeps the chip with invalid styling (red). `"remove"` deletes the chip. |
| `invalidMessage` | `string \| ((name: string) => string)` | - | Message to show as a toast when validation fails. Can be a static string or a function for dynamic messages. |
| `overrideFormatValidation` | `boolean` | `false` | If `true`, bypasses built-in format validation entirely. Only the custom `validate` function is used. Use with caution. |

**Validation Flow:**

1. **Built-in format validation** runs first (unless `overrideFormatValidation` is `true`), ensuring the variable name follows valid JSON property conventions.
2. **Custom validation** runs second (if `validate` is provided), checking against your allowed list or custom rules.
3. If validation fails, the `onInvalid` behavior is applied and a toast is shown if `invalidMessage` is configured.

### Block Library Customization

The `useBlockConfig` hook allows you to customize the blocks available in the sidebar, set default attributes, and create pre-configured block presets.

_Note: `useBlockConfig` must be used inside of the `<TemplateProvider />` context_

```tsx
import { useBlockConfig, TemplateEditor, TemplateProvider } from "@trycourier/react-designer";

function CustomBlocksEditor() {
  const { setVisibleBlocks, setDefaults, registerPreset } = useBlockConfig();

  useEffect(() => {
    // Register a preset (pre-configured block variant)
    registerPreset({
      type: "button",
      key: "console",
      label: "Go to Console",
      icon: <ExternalLinkIcon />, // Optional custom icon
      attributes: { link: "https://console.example.com", backgroundColor: "#007bff" },
    });

    // Set default attributes for all new buttons (borderRadius is a number in pixels)
    setDefaults("button", { borderRadius: 4 });

    // Control which blocks appear in sidebar (and their order)
    setVisibleBlocks([
      "heading",
      "text",
      { type: "button", preset: "console" }, // Preset between built-in blocks
      "image",
      "button",
    ]);
  }, []);

  return <TemplateEditor />;
}
```

**API Reference:**

| Function | Description |
|----------|-------------|
| `visibleBlocks` | Current visible blocks array |
| `setVisibleBlocks(blocks)` | Set which blocks appear in sidebar |
| `resetVisibleBlocks()` | Reset to default blocks |
| `setDefaults(type, attrs)` | Set default attributes for a block type |
| `getDefaults(type)` | Get defaults for a block type |
| `clearDefaults(type)` | Clear defaults for a block type |
| `registerPreset(preset)` | Register a pre-configured block variant |
| `unregisterPreset(type, key)` | Remove a preset |
| `presets` | All registered presets |
| `getPresetsForType(type)` | Get presets for a specific block type |
| `insertBlock(type, presetKey?)` | Programmatically insert a block |

**Block Types:** `heading`, `text`, `image`, `button`, `divider`, `spacer`, `customCode`, `column`, `blockquote`

## Error Handling

The Courier Editor includes a comprehensive error handling system that automatically provides user-friendly notifications for various error types including API errors, network failures, validation issues, and file upload problems.

### Custom Error Handling

You can programmatically trigger and handle errors using the `useTemplateActions` hook. This is useful for custom validation, user actions, or integration with external systems.

_Note: `useTemplateActions` must be used inside of the `<TemplateProvider />` context_

```tsx
import { useTemplateActions, TemplateEditor, TemplateProvider } from "@trycourier/react-designer";

function CustomComponent() {
  const { setTemplateError } = useTemplateActions();

  const handleCustomAction = async () => {
    try {
      // Your custom logic here
      await someApiCall();
    } catch (error) {
      // Simple string error (automatically converted)
      setTemplateError("Something went wrong with your custom action");

      // Or create a structured error with custom toast configuration
      setTemplateError({
        message: "Custom error message",
        toastProps: {
          duration: 6000,
          action: {
            label: "Retry",
            onClick: () => handleCustomAction(),
          },
          description: "Additional context about the error",
        },
      });
    }
  };

  return (
    <div>
      <TemplateEditor />
      <button onClick={handleCustomAction}>Custom Action</button>
    </div>
  );
}

function App() {
  return (
    <TemplateProvider templateId="template-123" tenantId="tenant-123" token="jwt">
      <CustomComponent />
    </TemplateProvider>
  );
}
```

### Error Object Structure

All errors use a simple, consistent structure:

```tsx
// Error interface
interface TemplateError {
  message: string; // The error message to display
  toastProps?: ExternalToast; // Optional Sonner toast configuration
}

// Usage examples
setTemplateError({
  message: "Upload failed",
  toastProps: {
    duration: 5000,
    description: "File size too large",
    action: {
      label: "Try Again",
      onClick: () => retryUpload(),
    },
  },
});

// Different error scenarios
setTemplateError({ message: "Authentication failed", toastProps: { duration: 6000 } });
setTemplateError({ message: "Network error", toastProps: { description: "Check connection" } });
setTemplateError({ message: "Validation error", toastProps: { duration: 5000 } });
```

### Error Boundary Protection

The editor includes an error boundary component to catch and handle React rendering errors gracefully.

_Note: `useTemplateActions` must be used inside of the `<TemplateProvider />` context_

```tsx
import {
  ErrorBoundary,
  useTemplateActions,
  TemplateEditor,
  TemplateProvider,
} from "@trycourier/react-designer";

function TemplateEditorWithErrorHandling() {
  const { setTemplateError } = useTemplateActions();

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Custom error logging
        console.error("Editor error:", error);

        // Optional: integrate with template error system
        setTemplateError({
          message: `Render error: ${error.message}`,
          toastProps: {
            duration: 6000,
            action: {
              label: "Reload",
              onClick: () => window.location.reload(),
            },
          },
        });
      }}
      fallback={<div>Something went wrong. Please refresh the page.</div>}
    >
      <TemplateEditor />
    </ErrorBoundary>
  );
}

function App() {
  return (
    <TemplateProvider templateId="template-123" tenantId="tenant-123" token="jwt">
      <TemplateEditorWithErrorHandling />
    </TemplateProvider>
  );
}
```

### Clearing Errors

To programmatically clear the current error state:

_Note: `useTemplateActions` must be used inside of the `<TemplateProvider />` context_

```tsx
import { useTemplateActions, TemplateEditor, TemplateProvider } from "@trycourier/react-designer";

function ClearErrorComponent() {
  const { setTemplateError } = useTemplateActions();

  const handleClearError = () => {
    // Clear the error
    setTemplateError(null);
  };

  return (
    <div>
      <TemplateEditor />
      <button onClick={handleClearError}>Clear Error</button>
    </div>
  );
}

function App() {
  return (
    <TemplateProvider templateId="template-123" tenantId="tenant-123" token="jwt">
      <ClearErrorComponent />
    </TemplateProvider>
  );
}
```

## Template Duplication

The `useTemplateActions` hook provides a `duplicateTemplate` function that allows you to create a copy of the current template with a new ID. This is useful for creating variations of existing templates or providing users with a "Save As" functionality.

_Note: `useTemplateActions` must be used inside of the `<TemplateProvider />` context_

```tsx
import { useTemplateActions, TemplateEditor, TemplateProvider } from "@trycourier/react-designer";
import { useState } from "react";

function DuplicateTemplateExample() {
  const { duplicateTemplate } = useTemplateActions();

  // Simple duplicate with auto-generated name (adds "-copy" suffix)
  const handleQuickDuplicate = async () => {
    const result = await duplicateTemplate();
    if (result?.success) {
      console.log(`Template duplicated to: ${result.templateId}`);
    }
  };

  // Duplicate with custom ID
  const handleCustomDuplicate = async () => {
    const result = await duplicateTemplate({
      targetTemplateId: "my-custom-template-id",
      // Optionally provide a custom display name:
      // name: "My Duplicated Template",
    });
    if (result?.success) {
      console.log(`Template duplicated! New ID: ${result.templateId}, Version: ${result.version}`);
    }
  };

  return (
    <div>
      <TemplateEditor />
      <button onClick={handleQuickDuplicate}>Quick Duplicate</button>
      <button onClick={handleCustomDuplicate}>Duplicate with Custom ID</button>
    </div>
  );
}

function App() {
  return (
    <TemplateProvider templateId="original-template" tenantId="tenant-123" token="jwt">
      <DuplicateTemplateExample />
    </TemplateProvider>
  );
}
```

### Duplicate Template Options

All options are optional. If called with no arguments, the function will create a duplicate with ID `{currentTemplateId}-copy`.

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `targetTemplateId` | `string` | No | The ID for the new duplicated template. Defaults to `{currentTemplateId}-copy` |
| `content` | `ElementalContent` | No | Override the content to duplicate (defaults to current editor content) |
| `name` | `string` | No | Custom display name for the new template (defaults to targetTemplateId) |

### Duplicate Template Result

The `duplicateTemplate` function returns a promise that resolves to:

```tsx
interface DuplicateTemplateResult {
  success: boolean;    // Whether the duplication succeeded
  templateId: string;  // The ID of the new template
  version?: string;    // The version of the newly created template
}
```

## Brand Editor

The Brand Editor component allows you to customize and manage a tenant's brand settings directly within your application. This specialized editor provides an interface for modifying brand colors, logos, and other visual elements that will be applied to your templates.

_Note: For successful authentication it's required to generate a JWT with proper [brand scopes](#scopes)._

### Basic

Similar to the basic Template Editor setup, implementing the Brand Editor requires minimal configuration. The BrandProvider component handles state management and provides the necessary context to the Brand Editor component.

```tsx
import "@trycourier/react-designer/styles.css";
import { BrandEditor, BrandProvider } from "@trycourier/react-designer";

function App() {
  return (
    <BrandProvider tenantId="tenant-123" token="jwt">
      <BrandEditor />
    </BrandProvider>
  );
}
```

### Publishing Hook

Similar to the Template Editor, the Brand Editor also provides a publishing hook that allows you to customize the publishing behavior. You can use the `useBrandActions` hook to programmatically trigger brand updates and integrate them with your application's workflow.

_Note: `useBrandActions` must be used inside of the `<BrandProvider />` context_

```tsx
import "@trycourier/react-designer/styles.css";
import { BrandEditor, BrandProvider, useBrandActions } from "@trycourier/react-designer";

function SaveBrandComponent() {
  const { publishBrand } = useBrandActions();

  const handlePublishBrand = () => {
    //... other publish logic
    await publishBrand();
  };

  return (
    <BrandProvider tenantId="tenant-123" token="jwt | client key">
      <BrandEditor hidePublish />
      <button onClick={handlePublishBrand}>Save Brand</button>
    </BrandProvider>
  );
}
```

# Using Brand and Template Editors Simultaneously

The `@trycourier/react-designer` package allows you to use both the Brand Editor and Template Editor in a single interface by adding the `brandEditor` prop to the `TemplateEditor` component.

```tsx
import "@trycourier/react-designer/styles.css";
import { TemplateEditor, TemplateProvider } from "@trycourier/react-designer";

function App() {
  return (
    <TemplateProvider templateId="template-123" tenantId="tenant-123" token="jwt">
      <TemplateEditor brandEditor />
    </TemplateProvider>
  );
}
```

`TemplaeProvider` supports the both editors – there is no need to add `BrandProvider` in this mode.

_Note: The JWT token must include proper [scopes](#scopes) for both template and brand editing capabilities._

# Properties

The Properties section details the configuration options available for both the Editor and TemplateProvider components. These properties allow you to customize the behavior and functionality of the editor to match your specific requirements.

### Template Editor Properties

The Editor component is the core element that provides the template editing interface. If you are using the Template Editor with the Template provider, required properties will be provided.

| Property         | Type                                   | Default | Description                                                                                                                                                                                                                                                            |
| ---------------- | -------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| autoSave         | boolean                                | true    | Enables automatic saving of changes to the template. When true, changes are automatically persisted.                                                                                                                                                                   |
| autoSaveDebounce | number                                 | 2000ms  | Time in milliseconds to wait after changes before triggering an auto-save operation. Controls save frequency.                                                                                                                                                          |
| brandEditor      | boolean                                | false   | When enabled, shows the brand editor interface alongside the template editor. Allows editing brand settings.                                                                                                                                                           |
| brandProps       | BrandEditorProps                       |         | Configuration options for the brand editor when enabled. Passed directly to the BrandEditor component.                                                                                                                                                                 |
| hidePublish      | boolean                                | false   | When true, hides the "Publish Changes" button in the editor interface.                                                                                                                                                                                                 |
| onChange         | (value: ElementalContent) => void      |         | Callback function that fires whenever the editor content changes, providing the updated ElementalContent structure.                                                                                                                                                    |
| routing          | { method: string; channels: string[] } |         | Configures multi-channel routing and delivery behavior. The `method` property determines delivery strategy: "single" (deliver via first available channel) or "all" (deliver via all configured channels). The `channels` array defines which delivery channels are available in the editor. |
| theme            | ThemeObj \| cssClass                   |         | Controls the visual appearance of the editor. Can be a Theme object with styling properties or a CSS class name.                                                                                                                                                       |
| value            | ElementalContent                       |         | Initial content for the editor in ElementalContent format. Used as the starting template when the editor loads.                                                                                                                                                        |
| variableValidation | VariableValidationConfig             |         | Configuration for custom variable validation. Allows restricting which variable names are allowed and defining behavior on validation failure. See [Variable Validation](#variable-validation) section for details.                                                    |
| variables        | Record<string, any>                    |         | Variables available for autocomplete suggestions. When provided, typing `{{` shows a dropdown with matching variables. See [Variable Autocomplete](#variable-autocomplete) section for details.                                                                        |
| disableVariablesAutocomplete | boolean                      | false   | When `true`, disables variable autocomplete and allows users to type any variable name directly. When `false` (default), shows autocomplete dropdown with variables from the `variables` prop.                                                                          |

### Multi-Channel Routing

The `routing` property allows you to configure which communication channels are available in the template editor and how messages are delivered to recipients. This gives you full control over the delivery strategy for your templates.

```tsx
import "@trycourier/react-designer/styles.css";
import { TemplateEditor, TemplateProvider } from "@trycourier/react-designer";

function App() {
  return (
    <TemplateProvider templateId="template-123" tenantId="tenant-123" token="jwt">
      <TemplateEditor
        routing={{
          method: "single", // "single" for fallback delivery, "all" for simultaneous delivery
          channels: ["email", "sms", "push"] // Available channels in the editor
        }}
      />
    </TemplateProvider>
  );
}
```

**Channel Options:**
- `"email"` - Email delivery
- `"sms"` - SMS text messaging
- `"push"` - Push notifications
- `"inbox"` - In-app messaging

**Delivery Methods:**
- `"single"` - Delivers via the first available channel (fallback strategy)
- `"all"` - Delivers via all configured channels simultaneously

### Template Provider Properties

The TemplateProvider component wraps the Editor component and manages the template state, authentication, and data flow. It provides essential context and functionality needed for the editor to operate. Below are the key properties that can be configured when using the

| Property   | Type   | Required | Description                                                                                                                                                                          |
| ---------- | ------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| templateId | string | Yes      | Unique identifier for the template being edited. Required for loading and saving template data. If the template with that ID has not been created yet, it will be on the first save. |
| tenantId   | string | Yes      | The tenant ID associated with the template. Used for brand theming and tenant-specific functionality.                                                                                |
| token      | string | Yes      | Authentication token (JWT or ClientKey) used to authorize API requests to Courier services.                                                                                          |

### Brand Editor

The Brand Editor component accepts properties that allow you to customize its behavior and appearance. These properties provide control over the editing interface and functionality specific to brand management.

| Property         | Type                           | Default | Description                                                                                                                    |
| ---------------- | ------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------ |
| autoSave         | boolean                        | true    | Enables automatic saving of changes to the template. When true, changes are automatically persisted.                           |
| autoSaveDebounce | number                         | 2000ms  | Time in milliseconds to wait after changes before triggering an auto-save operation. Controls save frequency.                  |
| hidePublish      | boolean                        | false   | When true, hides the "Publish Changes" button in the editor interface.                                                         |
| onChange         | (value: BrandSettings) => void |         | Callback function that fires whenever brand settings are modified, providing the updated brand configuration values.           |
| theme            | ThemeObj \| cssClass           |         | Controls the visual appearance of the editor. Can be a Theme object with styling properties or a CSS class name.               |
| value            | BrandSettings                  |         | Initial brand settings values to populate the editor with, including colors, logo, social links, and header style preferences. |
| variableValidation | VariableValidationConfig     |         | Configuration for custom variable validation. See [Variable Validation](#variable-validation) section for details.             |
| variables        | Record<string, any>            |         | Variables available for autocomplete suggestions. When provided, typing `{{` shows a dropdown with matching variables.           |
| disableVariablesAutocomplete | boolean              | false   | When `true`, disables variable autocomplete and allows users to type any variable name directly.                                  |

### Brand Provider

The Brand Provider component is responsible for managing brand-related state and context in your application. It wraps the Brand Editor component and handles data flow, authentication, and state management for brand customization. Here are the key properties that can be configured:

| Property | Type   | Required | Description                                                                           |
| -------- | ------ | -------- | ------------------------------------------------------------------------------------- |
| tenantId | string | Yes      | The unique identifier for the tenant whose brand settings are being edited.           |
| token    | string | Yes      | Authentication token (JWT or ClientKey) used to authorize brand-related API requests. |

## Shadow DOM Usage

If you render the Courier Editor inside a [Shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM) (e.g., for style isolation), drag-and-drop functionality will not work out of the box. This is a known incompatibility with the underlying [pragmatic-drag-and-drop](https://github.com/atlassian/pragmatic-drag-and-drop) library, which relies on `event.target` to identify dragged elements. Shadow DOM re-targets events to the shadow host, breaking this detection.

We provide a utility function `applyShadowDomDndFix` that patches event handling to restore drag-and-drop support inside a Shadow DOM.

### Setup

Call `applyShadowDomDndFix(shadowRoot)` **after** creating the shadow root but **before** rendering the editor. Store the returned cleanup function and call it when unmounting.

```tsx
import { useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  TemplateEditor,
  TemplateProvider,
  applyShadowDomDndFix,
} from "@trycourier/react-designer";
import "@trycourier/react-designer/styles.css";

function EditorInShadowDom() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Create Shadow DOM
    const shadowRoot = container.attachShadow({ mode: "open" });

    // 2. Apply DnD fix BEFORE rendering the editor
    const cleanupDndFix = applyShadowDomDndFix(shadowRoot);

    // 3. Inject styles into shadow root
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/path/to/react-designer/styles.css";
    shadowRoot.appendChild(link);

    // 4. Render the editor
    const mountPoint = document.createElement("div");
    shadowRoot.appendChild(mountPoint);

    const root = createRoot(mountPoint);
    root.render(
      <TemplateProvider
        templateId="my-template"
        tenantId="my-tenant"
        token="my-token"
      >
        <TemplateEditor />
      </TemplateProvider>
    );

    // 5. Cleanup on unmount
    return () => {
      cleanupDndFix();
      root.unmount();
    };
  }, []);

  return <div ref={containerRef} />;
}
```

### Known Limitations

- **Drag handles are disabled in Shadow DOM.** In a normal DOM context, blocks can only be dragged by the grip icon on the left. Inside a Shadow DOM, blocks become draggable from anywhere on the element. This is because pragmatic-drag-and-drop's internal handle validation is not compatible with Shadow DOM event re-targeting.
- **Global patch.** The fix monkey-patches `Event.prototype.target` while active. Always call the cleanup function when unmounting to restore normal behavior.

# Limitations

**React Only**

The Courier Editor is currently only compatible with React applications. This means you'll need to have a React-based frontend to integrate the editor into your application. Support for other frameworks like Vue.js or Angular may be considered in future releases based on community demand.

Minimal supported React version is 18.2.0.

**Email channel support only**

Currently, the editor only supports creating and editing email templates. Support for additional channels like SMS, push notifications, and direct messages is currently under development and will be added in the next month or so.

# Development

## Scripts

- `pnpm dev` - Starts the development environment
- `pnpm build` - Builds the package
- `pnpm test` - Runs tests
- `pnpm lint` - Runs linting

## Publishing to npm

This package can be published to npm using the provided scripts. The publishing process includes version bumping, building, testing, and pushing changes to git.

### Publishing workflow

1. Make sure your changes are committed and your working directory is clean
2. Run one of the release commands:
   - `pnpm release` - Bumps patch version and publishes
   - `pnpm release:patch` - Same as above
   - `pnpm release:minor` - Bumps minor version and publishes
   - `pnpm release:major` - Bumps major version and publishes
   - `pnpm release:dry-run` - Simulates the release process without publishing
   - `pnpm release:canary` - Creates a canary release with a unique tag

The release script will:

- Check if your working directory is clean
- Build the package
- Run tests
- Bump the version (if not dry run)
- Commit version changes and create a git tag (except for canary releases)
- Publish to npm
- Push changes and tags to git repository (except for canary releases)

### Canary builds

Canary builds are pre-release versions that allow users to test the latest changes without affecting the stable release. Each canary build is published with a unique npm tag based on the timestamp when it was created.

#### Creating a canary build

Run the canary release command:

```sh
pnpm release:canary
```

This will:

- Generate a unique tag in the format `canary-{timestamp}`
- Create a version like `0.0.1-canary-1718392847`
- Publish to npm with the unique tag

#### Installing a specific canary build

To see all available canary builds:

```sh
npm dist-tag ls @trycourier/courier-designer
```

To install a specific canary build:

```sh
# Example for a specific canary build
npm install @trycourier/courier-designer@canary-1718392847
```

### Manual publishing

If you need more control over the publishing process:

1. Build the package: `pnpm build`
2. Run tests: `pnpm test`
3. Bump version: `pnpm version patch|minor|major`
4. Publish: `pnpm publish --access public`

Note: You need to have npm publishing rights for the `@trycourier` organization to publish this package.
