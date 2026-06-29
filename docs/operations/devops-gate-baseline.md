# Devops Gate Baseline

This public package already has CI. Keep additional automation quiet and explicit so an unmaintained or low-touch period does not create noisy dependency churn.

## Current gate surface

- `.github/workflows/ci.yml` runs on pushes and pull requests.
- CI runs tests on Node 22 and Node 24.
- CI verifies packed manifest assets and typechecks on Node 24.
- `package.json` exposes `test`, `typecheck`, `verify:pack`, and `verify:plan`.

## Baseline readiness checklist

- Keep required checks aligned to the existing CI workflow.
- Do not add scheduled dependency automation without a maintainer willing to triage it.
- Preserve generated artifacts and compatibility packages as explicit review areas for package changes.
- Treat changes under `plugins/`, `packages/runtime/`, `packages/core/`, `generated/`, and `shared/` as gate-sensitive.
- Keep release and publish automation separate from generic devops hardening.

## Deferred integration points

- Renovate or Dependabot can be added later with low-frequency grouping, but should stay disabled until maintainer triage capacity is clear.
- A shared devops gate should call the existing test, pack verification, and typecheck commands rather than adding new tools.
- If package publishing is automated later, require a manual approval step and a clean verification packet.

## Cheap local verification

For a documentation-only baseline change:

```sh
git diff --check
```

For package or workflow changes:

```sh
npm test
npm run verify:pack
npm run typecheck
```
