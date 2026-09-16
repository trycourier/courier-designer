# next

A Next.js App Router integration example for `@trycourier/react-designer`,
covering `TemplateProvider`, `BrandProvider` and the brand editor.

## Configuration

Copy `.env.example` to `.env` **in this directory** and fill it in:

```sh
cp .env.example .env
```

Next only exposes variables prefixed `NEXT_PUBLIC_` to the browser, so the keys
here are the `NEXT_PUBLIC_` equivalents of the ones the `react-vite` example
uses.

| Variable                  | What it is                             |
| ------------------------- | -------------------------------------- |
| `NEXT_PUBLIC_API_URL`     | Courier GraphQL endpoint                |
| `NEXT_PUBLIC_TENANT_ID`   | Tenant whose template you want to open  |
| `NEXT_PUBLIC_TEMPLATE_ID` | Template to load                        |
| `NEXT_PUBLIC_JWT_TOKEN`   | Courier client JWT                      |

These are the same credentials the `react-vite` example uses.
[Generating `VITE_JWT_TOKEN`](../react-vite/README.md#generating-vite_jwt_token)
explains how to issue the JWT, which scopes it needs (none in particular), and
why studio's token cannot be copied.

## Development

From the repo root:

```sh
pnpm install
pnpm --filter next dev
```

Then open http://localhost:3005.
