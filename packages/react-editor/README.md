# Courier React Editor

### Scripts

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
npm dist-tag ls @trycourier/react-editor
```

To install a specific canary build:
```sh
# Example for a specific canary build
npm install @trycourier/react-editor@canary-1718392847
```

### Manual publishing

If you need more control over the publishing process:

1. Build the package: `pnpm build`
2. Run tests: `pnpm test`
3. Bump version: `pnpm version patch|minor|major`
4. Publish: `pnpm publish --access public`

Note: You need to have npm publishing rights for the `@trycourier` organization to publish this package.
