---
"@trycourier/react-designer": minor
---

Restructure the server-data layer into services and hooks.

Fetching, saving, publishing and duplicating were six write-only atoms that each
built the same GraphQL request by hand, decided for themselves what counted as
an error, set one of three loading flags and cleared it in a `finally`. Nine
places wrote those flags — the six atoms, two by-hand resets in `TemplateEditor`
when the template id changed, and one in `BrandEditor` on tenant change — which
is why "is it loading" had more than one answer depending on who you asked.

Now:

- `src/services/` holds the I/O. `graphql-client.ts` builds the one request
  shape and raises every failure as a `CourierApiError`; the template and brand
  services are plain async functions you can call without a store.
- `src/components/Providers/hooks/` holds the query and write hooks. The
  template query is keyed on tenant + template, so opening a different template
  is a different cache entry rather than something the editor has to remember
  to clear — which is what the hand-written resets existed to do. A response
  from a superseded request is dropped rather than arbitrated.
- `TemplateQueryBridge` is the single writer that republishes fetch state into
  the atoms the rest of the library reads.
- The effect that triggered the fetch is gone. It listed the loading flag its
  own call set, and needed three guard clauses to avoid re-entering itself.

The query and write hooks are built on the package's own store rather than an
external data-fetching library, so this adds no runtime dependency.

The public API is unchanged: `useTemplateActions` and `useBrandActions` return
the same fields, and every previously exported atom is still exported.
