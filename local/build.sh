#!/usr/bin/env bash
# Local equivalent of .github/workflows/pages.yml. Runs inside local/Dockerfile with the repo
# mounted read-only at /src and a persistent volume at /work.
set -euo pipefail

SRC=/src
W=/work
WORKFLOW="$SRC/.github/workflows/pages.yml"

# Single source of truth for the game release: the workflow's env block.
workflow_env() { sed -n "s/^  $1: *//p" "$WORKFLOW" | head -n1; }
GAME_FILE=$(workflow_env GAME_FILE)
GAME_URL=$(workflow_env GAME_URL)
GAME_SHA256=$(workflow_env GAME_SHA256)

cd "$W"

if [ ! -d upstream/.git ]; then
  git clone --depth 1 -b wasm https://github.com/root-hunter/ppsspp-web upstream
fi
if [ ! -d ppsspp-wasm-src/.git ]; then
  git clone --depth 1 -b wasm --recurse-submodules --shallow-submodules \
    https://github.com/root-hunter/ppsspp-wasm ppsspp-wasm-src
fi

# patch_upstream.py edits ppsspp-web files with one-shot replacements, so start from a
# clean tree. The ppsspp-wasm edits are idempotent and are left in place to keep the
# emscripten build incremental.
git -C upstream checkout -- .

rm -rf custom
mkdir -p custom/game cache
cp -r "$SRC/customization" custom/

if [ ! -f "cache/$GAME_FILE" ] || ! echo "$GAME_SHA256  cache/$GAME_FILE" | sha256sum --check --status -; then
  curl --fail --location --retry 3 --retry-delay 2 --output "cache/$GAME_FILE" "$GAME_URL"
  echo "$GAME_SHA256  cache/$GAME_FILE" | sha256sum --check --strict -
fi
cp "cache/$GAME_FILE" custom/game/

python3 custom/customization/patch_upstream.py upstream custom ppsspp-wasm-src

cd upstream
make wasm-release WASM_ROOT=../ppsspp-wasm-src CMAKE=/usr/bin/cmake WASM_JOBS="-j$(nproc)"
if [ ! -d wasm-page/node_modules ]; then
  npm --prefix wasm-page ci
fi
make app-build-pages WASM_ROOT=../ppsspp-wasm-src

echo
echo "Bundle ready. Preview: docker compose -f local/docker-compose.yml up serve  ->  http://localhost:8080"
