---
name: cloudflare-worker-deploy
description: Deploy and verify the Zhang Wei portfolio through the existing Cloudflare Worker workflow.
---

# Cloudflare Worker Deploy

## When to use

Use this skill when preparing preview or production deployment, verifying Cloudflare Worker output, checking GitHub Actions deploys, or documenting rollback.

## Inputs to inspect

- `AGENTS.md`
- `package.json`
- `wrangler.jsonc`
- `.github/workflows/*.yml`
- `.publish-files.txt`
- Current git branch, dirty state, and remote state.
- Latest build and static preparation output.
- Cloudflare Worker and GitHub Actions logs when available.

## Required steps

- Inspect existing Wrangler and GitHub Actions configuration before choosing a deploy path.
- Do not change secrets, account IDs, OAuth state, or user-level config without explicit approval.
- Production stop-loss fixes may deploy directly only when the task explicitly allows production.
- Architecture rewrites should deploy to preview first unless the user explicitly requests production.
- Run required build/static commands before deployment unless the task is documentation-only.
- Preserve unrelated local changes; stage only intended files.
- Verify the deployed URL after deploy with browser checks when frontend behavior changed.

## Validation checklist

- Build command and result.
- Deploy command or workflow and result.
- Public URL and environment type.
- Rollback instructions.
- Commit hash and deploy ID, version ID, or Actions run ID.
- Online verification result or exact blocker.

## Failure conditions

- Deployment is skipped for a code change without explicit user approval.
- Production deploy is used for a large rewrite without approval.
- Deployed URL is not verified.
- Rollback path is missing.
- Unrelated files are staged or committed.

## What not to do

- Do not modify secrets, account IDs, OAuth state, or user-level Cloudflare config.
- Do not force-push or rewrite history.
- Do not stage generated screenshots, QA JSON, or `output/` unless requested.
- Do not claim deployment completion from local build success alone.
