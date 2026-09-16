# Examples

One self-contained app per framework. Each has its own `package.json`, build
config and **its own `.env`** — copy the `.env.example` in the example's
directory and fill it in there, rather than keeping configuration at the root.

| Example                      | Stack                 | Port |
| ---------------------------- | --------------------- | ---- |
| [`react-vite`](./react-vite) | Vite + React 18       | 5173 |
| [`next`](./next)             | Next.js (App Router)  | 3005 |

Both examples need the same four values: a Courier GraphQL endpoint, a tenant, a
template, and a client JWT. **The `.env.example` values are placeholders — with
them in place the editor 403s and shows template errors.**
[Generating `VITE_JWT_TOKEN`](./react-vite/README.md#generating-vite_jwt_token)
covers how to issue a real one.

`react-vite` is the one to reach for when developing the editor: it resolves
`@trycourier/react-designer` straight out of `@trycourier/react-designer/dist`, so
`pnpm dev` at the root rebuilds the package and reloads the example together.
