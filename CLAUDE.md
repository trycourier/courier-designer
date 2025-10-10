# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a monorepo for the Courier Editor - a rich text editor library built with React and TipTap, designed for creating multi-channel message templates (email, SMS, push, inbox). The editor uses a custom "Elemental" content format and supports email compatibility across major email clients.

## Package Management & Development Commands

This project uses `pnpm` workspaces with Turborepo for build orchestration.

### Essential Commands

```bash
pnpm install              # Install dependencies
pnpm dev                  # Start development environment
pnpm build                # Build all packages
pnpm lint                 # Lint all packages
pnpm test                 # Run tests across all packages
```

### Package-Specific Commands

For `packages/react-designer` (the core library):
```bash
pnpm --filter @trycourier/react-designer build    # Build the core package
pnpm --filter @trycourier/react-designer test     # Run vitest tests
pnpm --filter @trycourier/react-designer test:watch    # Watch mode for tests
pnpm --filter @trycourier/react-designer test:e2e # Run Playwright e2e tests
pnpm --filter @trycourier/react-designer dev      # Watch mode build
```

For `apps/editor-dev` (development environment):
```bash
pnpm --filter editor-dev dev    # Start Vite dev server
```

### Release Management

This project uses Changesets for version management:
```bash
pnpm changeset                  # Create a new changeset
pnpm version-packages           # Bump versions based on changesets
pnpm release                    # Build and publish packages
pnpm release:canary             # Publish canary version
```

## Architecture

### Layered Structure

1. **Core Library** (`packages/react-designer`)
   - Embeddable React editor component
   - Exports `TemplateEditor`, `BrandEditor`, providers, and utilities
   - Main entry point: `packages/react-designer/src/index.ts`
   - All new features should be developed here first

2. **Framework Adapters** (`packages/vue-designer`)
   - Vue wrapper (not actively maintained - ignore for now)

3. **Development Apps**
   - `apps/editor-dev` - Vite-based dev environment for testing the editor
   - `apps/nextjs-demo` - Next.js integration example

### Key Concepts

**Elemental Content Format**: Custom JSON structure for representing rich content across channels. The core type is `ElementalContent` with a version field and elements array containing nodes like `text`, `action`, `image`, `divider`, `quote`, `html`, `list`, etc.

**Multi-Channel Support**: Templates can contain channel-specific content (email, SMS, push, inbox). Each channel has its own editor layout and rendering requirements.

**Conversion Flow**: Content flows through transformations:
- External API: Elemental JSON format
- Internal editor: TipTap/ProseMirror document
- Utilities in `lib/utils/` handle conversions (`convertElementalToTiptap`, `convertTiptapToElemental`)

**State Management**: Uses Jotai for global state
- Template state in `components/Providers/store.ts`
- Channel/editor state in `components/TemplateEditor/store.ts`
- Brand editor state in `components/BrandEditor/store.ts`

### Directory Structure

```
packages/react-designer/src/
├── components/
│   ├── TemplateEditor/        # Main editor component
│   │   ├── Channels/          # Email, SMS, Push, Inbox layouts
│   │   ├── Layout/            # Editor layout components
│   │   └── TemplateEditor.tsx # Main entry component
│   ├── BrandEditor/           # Brand/theme configuration
│   ├── Providers/             # Context providers for template actions
│   ├── extensions/            # TipTap extensions (custom nodes/marks)
│   ├── ui-kit/                # Reusable UI components (Radix-based)
│   └── ui/                    # Additional UI components
├── lib/
│   └── utils/                 # Conversion utilities, helpers
├── types/                     # TypeScript definitions
│   ├── elemental.types.ts     # Elemental format types
│   └── tiptap.types.ts        # TipTap-specific types
├── hooks/                     # React hooks
└── store.ts                   # Global atoms
```

## Technology Stack

- **React 18** - UI framework (peer dependency)
- **TipTap** - Rich text editing framework built on ProseMirror
- **Jotai** - Atomic state management
- **Tailwind CSS** - Styling with `courier-` prefix to avoid conflicts
- **DnD Kit** - Drag and drop functionality
- **Radix UI** - Accessible UI primitives
- **TypeScript** - Type safety
- **Vitest** - Unit testing
- **Playwright** - E2E testing
- **esbuild** - Build tool (ESM + CJS outputs)

## Component Development Guidelines

### Styling Requirements

- **CRITICAL**: All Tailwind classes must use `courier-` prefix (e.g., `courier-bg-blue-500`)
- This prevents style conflicts when the editor is embedded in other applications
- Use CSS variables for theming when possible
- Avoid inline styles except for dynamic values

### Component Standards

- Use functional components with TypeScript
- Props interfaces should be suffixed with `Props`
- Use React.forwardRef when components need to expose DOM refs
- Keep components focused on single responsibility
- Extract complex logic into custom hooks

### TipTap Extension Development

Extensions are in `components/extensions/`. Each extension typically has:
- `ExtensionName.ts` - The TipTap extension definition
- `ExtensionNameView.tsx` - React component for node rendering
- `ExtensionName.test.tsx` - Tests

When creating custom nodes:
- Define clear schemas for parsing/serialization
- Implement conversion to/from Elemental format in utils
- Support keyboard navigation and accessibility
- Ensure email compatibility if the node appears in email templates

### Email Compatibility

For components that render in email:
- Use table-based layouts (no flexbox/grid)
- Inline all CSS at export time
- Avoid unsupported CSS properties (positioning, transforms, etc.)
- Test with major email clients (Gmail, Outlook, Apple Mail)
- Provide fallbacks for unsupported features
- Keep nested tables ≤ 4 levels deep
- Always include alt text for images
- Use web-safe fonts or provide fallbacks

### State Management

- Use Jotai atoms for shared state
- Keep state as local as possible (prefer useState before global atoms)
- Document the purpose and usage of each atom
- Avoid prop drilling - use atoms or context for deeply nested state

## Testing

- Unit tests: Vitest (run with `pnpm test` or `pnpm test:watch`)
- E2E tests: Playwright (run with `pnpm test:e2e`)
- Test files colocated with source files (e.g., `Component.test.tsx`)
- Write tests for utility functions and component behavior
- Test email rendering compatibility for email-specific features

## Build System

The build uses a custom esbuild setup (`build.js`):
1. Generates theme CSS from design tokens
2. Processes CSS with PostCSS (Tailwind, autoprefixer)
3. Builds ESM and CJS outputs
4. Generates TypeScript declarations

Watch mode: `pnpm dev` (in react-designer)
Production build: `pnpm build`

## Important Notes

- **Always develop in `packages/react-designer` first** - this is the core embeddable library
- `apps/editor-dev` is for testing/development only
- Vue package is not actively maintained
- Brand editor allows configuring colors, fonts, and theme for templates
- The editor supports custom variables that can be injected into content
- Auto-save functionality is built-in (controlled via props)
- The editor exports both controlled and uncontrolled usage patterns

## Common Patterns

### Adding a New Block Type

1. Create extension in `components/extensions/NewBlock/`
2. Define TipTap node schema
3. Create React component for rendering
4. Add conversion logic in `lib/utils/convertElementalToTiptap.ts` and `convertTiptapToElemental.ts`
5. Update `ElementalNode` type in `types/elemental.types.ts`
6. Add to extension kit in `components/extensions/extension-kit.ts`
7. Test with email rendering if applicable

### Accessing Editor State

```typescript
import { useAtomValue } from 'jotai';
import { templateDataAtom } from '@/components/Providers/store';

const MyComponent = () => {
  const templateData = useAtomValue(templateDataAtom);
  // Use templateData...
};
```

### Using Template Actions

```typescript
import { useTemplateActions } from '@trycourier/react-designer';

const MyComponent = () => {
  const { saveTemplate, publishTemplate, getTemplate } = useTemplateActions();
  // Use actions...
};
```
