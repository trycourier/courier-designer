---
"@trycourier/react-designer": minor
---

Replace jotai with an internal atom store.

The designer is embedded in applications that have their own React tree and,
often, their own copy of jotai. Two copies means two module registries: an atom
written through one is invisible to the other, and the editor renders from
state nothing is writing to. Owning the store removes that failure mode instead
of documenting it, and drops a runtime dependency from a package other people
bundle.

`src/lib/store` implements the same semantics the call sites were already
written against — primitive, derived and action atoms, per-Provider store
instances, dependency-tracked recomputation, and writes batched so one action
re-renders subscribers once. No public API changes.
