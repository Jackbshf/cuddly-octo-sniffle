---
name: rollback-release-management
description: Manage release safety, preview/production separation, and rollback instructions for portfolio changes.
---

# Rollback Release Management

## When to use

Use this skill before deployment, production-impacting portfolio changes, large refactors, branch/push operations, or release reporting.

## Inputs to inspect

- `git status --short`
- Current branch and commit.
- Remote tracking state.
- `.github/workflows/*.yml`
- `wrangler.jsonc`
- Prior stable deploy URL or Worker version when available.
- Local generated artifacts that must not be staged.

## Required steps

- Preserve unrelated local changes.
- Prefer preview for large rewrites and production only for approved stop-loss patches or confirmed releases.
- Record branch, commit hash, deploy target, deploy ID or run ID, and rollback path.
- Do not force-push, rewrite history, or delete deployment assets without explicit approval.
- If remote main advanced, use fetch and rebase instead of force-pushing.
- Check dirty state before editing and before staging.
- Stage only files that belong to the task.

## Validation checklist

- Current branch and dirty-state summary.
- Release target: preview, staging, or production.
- Rollback command or platform action.
- Any blockers requiring user action.
- Commit hash and pushed branch when a commit is made.
- Confirmation that unrelated files were not staged.

## Failure conditions

- Unrelated local changes are overwritten, reverted, or staged.
- Force-push or history rewrite is used without explicit approval.
- Production release has no rollback command.
- Remote divergence is solved by overwriting remote history.

## What not to do

- Do not delete deployment assets or generated media as a rollback shortcut.
- Do not stage `output/`, screenshots, QA JSON, or local temp files unless requested.
- Do not treat preview and production as interchangeable.
