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
| variables        | Record<string, any>                    |         | **Deprecated.** Previously used for autocomplete suggestions. Users can now type any variable directly. This prop has no effect.                                                                                                                                       |

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
| variables        | Record<string, any>            |         | **Deprecated.** Previously used for autocomplete suggestions. Users can now type any variable directly. This prop has no effect. |

### Brand Provider

The Brand Provider component is responsible for managing brand-related state and context in your application. It wraps the Brand Editor component and handles data flow, authentication, and state management for brand customization. Here are the key properties that can be configured:

| Property | Type   | Required | Description                                                                           |
| -------- | ------ | -------- | ------------------------------------------------------------------------------------- |
| tenantId | string | Yes      | The unique identifier for the tenant whose brand settings are being edited.           |
| token    | string | Yes      | Authentication token (JWT or ClientKey) used to authorize brand-related API requests. |

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
