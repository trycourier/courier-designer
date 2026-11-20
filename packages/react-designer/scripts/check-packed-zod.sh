#!/usr/bin/env bash
# Run after building react-designer.
set -euo pipefail

package_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
scratch="$(mktemp -d)"
trap 'rm -rf "$scratch"' EXIT

cd "$scratch"
tarball="$(npm pack "$package_dir" --ignore-scripts --pack-destination "$scratch" --quiet)"

for version in 3.24.2 4.6.7; do
  mkdir "$scratch/zod-$version"
  cd "$scratch/zod-$version"
  printf '{"private":true}\n' > package.json
  echo "Checking packed Designer with host Zod $version"
  npm install --ignore-scripts --no-audit --no-fund --loglevel=error \
    "zod@$version" "$scratch/$tarball"
  node --input-type=module -e '
    import assert from "node:assert/strict";
    import { createRequire } from "node:module";
    import { TemplateEditor } from "@trycourier/react-designer";

    const require = createRequire(import.meta.url);
    const { version } = require("zod/package.json");
    assert.equal(version, process.argv[1]);
    assert.ok(TemplateEditor);
    console.log(`PASS: packed Designer imported with host Zod ${version}`);
  ' "$version"
done
