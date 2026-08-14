# WebGPU / WGSL Spec Reference

## Local files

After running `scripts/download.sh`:

- `target/webgpu-specs/webgpu-spec.bs` — WebGPU API specification
- `target/webgpu-specs/wgsl-spec.bs` — WGSL language specification

These are Bikeshed (`.bs`) sources from https://github.com/gpuweb/gpuweb.

## Citation format

Prefer **named anchors** over line numbers so links stay stable across spec updates.

### Finding an anchor

Section headers use this pattern:

```
### Object Descriptors ### {#object-descriptors}
```

Search the local file for the heading text or `{#anchor-id}`.

### Building the URL

| Spec | Base URL | Example |
|------|----------|---------|
| WebGPU | `https://gpuweb.github.io/gpuweb/` | `https://gpuweb.github.io/gpuweb/#object-descriptors` |
| WGSL | `https://gpuweb.github.io/gpuweb/wgsl/` | `https://gpuweb.github.io/gpuweb/wgsl/#memory-layout` |

Append `#anchor-id` (without braces) to the base URL.

### In answers

1. State the normative rule or definition from the spec section
2. Link the section name to the anchor URL
3. Optionally mention the local file path for repo context

Line numbers from local files may be added as secondary context only.

## Updating specs

Re-run the download script anytime you need fresher spec text:

```bash
sh .cursor/skills/webgpu-specs/scripts/download.sh
```

The script skips re-downloading when the remote file has not changed (etag compare).
