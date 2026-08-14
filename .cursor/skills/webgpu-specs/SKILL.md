---
name: webgpu-specs
description: >-
  Looks up WebGPU and WGSL specification sections from local copies of the
  official specs. Use when implementing or debugging WebGPU APIs, WGSL shaders,
  bind groups, pipelines, textures, buffers, compute/render passes, or when
  the user asks about WebGPU/WGSL behavior, limits, or validation rules.
---

# WebGPU & WGSL Specifications

## Quick start

1. Ensure local specs exist (run once, or when specs may be stale):

   ```bash
   sh .cursor/skills/webgpu-specs/scripts/download.sh
   ```

2. Search the downloaded Bikeshed sources:

   | Spec | Local file |
   |------|------------|
   | WebGPU | `target/webgpu-specs/webgpu-spec.bs` |
   | WGSL | `target/webgpu-specs/wgsl-spec.bs` |

3. Prefer spec-backed answers over memory. Grep/read the local files, then cite the matching section with a clickable anchor URL.

## When to use

- Implementing or changing WebGPU resource setup, pipelines, or passes in this project
- Debugging validation errors, layout mismatches, or WGSL type/syntax issues
- Answering "what does the spec say about X?" for WebGPU or WGSL

## Lookup workflow

```
Task progress:
- [ ] Run download script if spec files are missing
- [ ] Grep local .bs files for the API, keyword, or error
- [ ] Read surrounding section for normative rules and definitions
- [ ] Link to the spec section using named anchors (see reference.md)
```

**Search tips**

- Spec headings look like: `### Object Descriptors ### {#object-descriptors}`
- Grep for the `{#anchor-id}` or the heading text to locate a section quickly
- WebGPU base URL: https://gpuweb.github.io/gpuweb/
- WGSL base URL: https://gpuweb.github.io/gpuweb/wgsl/

## Citing the spec

Always give the user a clickable link to the named anchor, not just line numbers.

Example: for `{#object-descriptors}`, link to https://gpuweb.github.io/gpuweb/#object-descriptors

For full citation rules and examples, see [reference.md](reference.md).

## Scripts

**download.sh** — downloads or updates both spec files (uses etag caching; safe to re-run):

```bash
sh .cursor/skills/webgpu-specs/scripts/download.sh
```
