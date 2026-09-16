# react-vite

The main development environment for `@trycourier/react-designer` — a Vite + React 18
app that mounts the editor against a real tenant.

Each example is one file in `src/examples/`, routed at `/examples/<slug>` and
listed on the catalog page at [`/examples`](http://localhost:5173/examples) with
a line saying what it demonstrates. `/` renders the basic editor, which is what
you usually want when checking a change by hand.

Adding an example means three things: a file in `src/examples/`, a route in
`src/App.tsx`, and a card in `src/examples/Examples.tsx`.

It resolves the designer from `@trycourier/react-designer/dist`, so run the package
in watch mode alongside it.

## Configuration

Each example under `examples/` carries its own configuration. Copy
`.env.example` to `.env` **in this directory** and fill it in:

```sh
cp .env.example .env
```

| Variable         | What it is                                                    |
| ---------------- | ------------------------------------------------------------- |
| `VITE_API_URL`   | Courier GraphQL endpoint — `https://api.courier.com/client/q`   |
| `VITE_JWT_TOKEN` | Courier **client JWT** — see below                              |

**The tenant and template ids are not configuration.** Paste them into the bar
at the top of the app and press Load. They are deliberately not in `.env`: a
stale id there is worse than an empty field, because the editor opens and fails
against a template nobody meant to load, and the errors read as the designer's
rather than the config's.

Until you press Load the designer is not mounted at all — you get an empty
state, not a wall of fetch errors.

### Generating `VITE_JWT_TOKEN`

Issue a client JWT with a workspace API key
(app.courier.com → Settings → API Keys):

```sh
curl -X POST https://api.courier.com/auth/issue-token \
  -H "Authorization: Bearer $COURIER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"scope":"user_id:you","expires_in":"7 days"}'
```

Put the returned `token` in `VITE_JWT_TOKEN`. The tenant and template you load
in the app must exist in the same workspace as the key that issued it.

**Which scopes?** None in particular. `/client/q` only requires the token carry
*some* non-empty scope (its authorizer is `hasApiKeyScopes()` with no argument),
and the `tenant` query the designer uses — along with its `notification` and
`brand` fields — declares no `@authorize` directive, so nothing narrower is
enforced. `user_id:<id>` is the conventional minimum.

Two things that will bite you:

- **Scopes are space-separated.** A comma-separated `scope` is rejected outright
  by the API with a message telling you so.
- **The token expires.** Pick an `expires_in` you can live with; when the editor
  starts 403ing again, that is usually why.

### Why you cannot copy studio's token

Studio mounts the same editor but authenticates differently, so nothing there is
copy-pasteable into this file:

- it points at **`/studio/q`**, not `/client/q`
  (`${NEXT_STATIC_AWS_API_ROOT_URI}/studio/q`), and
- its token is `viewer { jwtToken }` fetched from the logged-in **AWS
  Cognito/Amplify session** (`packages/studio/lib/hooks/use-courier-create-jwt.ts`),
  so it is minted per user per session rather than stored anywhere.

`/client/q` with an issued client JWT is the right setup for a standalone
example. Chasing the studio endpoint is not worth it.

## Development

From the repo root:

```sh
pnpm install
pnpm dev            # builds the package in watch mode and serves this example
```

Or just this example, against an already-built package:

```sh
pnpm --filter react-vite dev
```

Then open http://localhost:5173.
