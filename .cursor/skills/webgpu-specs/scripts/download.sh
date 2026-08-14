#!/bin/sh

set -e

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
REPO_ROOT="$(CDPATH= cd -- "$SCRIPT_DIR/../../../.." && pwd)"
TARGET_DIR="$REPO_ROOT/target/webgpu-specs"
WEBGPU="$TARGET_DIR/webgpu-spec"
WGSL="$TARGET_DIR/wgsl-spec"

mkdir -p "$TARGET_DIR"

if [ -f "$WEBGPU.etag" ]; then
  curl --etag-save "$WEBGPU.etag.new" --etag-compare "$WEBGPU.etag" -fsSL https://raw.githubusercontent.com/gpuweb/gpuweb/main/spec/index.bs -o "$WEBGPU.bs"
  [ -s "$WEBGPU.etag.new" ] && mv "$WEBGPU.etag.new" "$WEBGPU.etag" || rm "$WEBGPU.etag.new"
else
  curl --etag-save "$WEBGPU.etag" https://raw.githubusercontent.com/gpuweb/gpuweb/main/spec/index.bs -o "$WEBGPU.bs"
fi

if [ -f "$WGSL.etag" ]; then
  curl --etag-save "$WGSL.etag.new" --etag-compare "$WGSL.etag" -fsSL https://raw.githubusercontent.com/gpuweb/gpuweb/main/wgsl/index.bs -o "$WGSL.bs"
  [ -s "$WGSL.etag.new" ] && mv "$WGSL.etag.new" "$WGSL.etag" || rm "$WGSL.etag.new"
else
  curl --etag-save "$WGSL.etag" https://raw.githubusercontent.com/gpuweb/gpuweb/main/wgsl/index.bs -o "$WGSL.bs"
fi
