# Courier Editor Monorepo

This monorepo contains the Courier Editor implementation and its ecosystem packages.

## Getting Started

Run `pnpm install` to install the dependencies.
Run `pnpm dev` to start the development environment.

### Workspace Scripts

- `pnpm dev` - Starts the development environment
- `pnpm build` - Builds all packages
- `pnpm test` - Runs tests across all packages
- `pnpm lint` - Runs linting across all packages

## Architecture

This monorepo uses a layered architecture:

1. **Core Layer** (`react-designer`)

   - Contains the core editor implementation
   - Implements all core editing functionality
   - Exports React components, types, and hooks

2. **Framework Adapters** (`vue-editor`)

   - Provides framework-specific implementations
   - Wraps the core React implementation for use in Vue
   - Maintains framework-specific APIs and conventions

3. **Development Tools** (`editor-dev`)
   - Provides development environment
   - Used for development, testing and demonstration

## Package Management

This monorepo uses `pnpm` workspaces for package management. The workspace configuration can be found in `pnpm-workspace.yaml`.

## Support

For support, please open an issue in the repository or contact the maintainers.
