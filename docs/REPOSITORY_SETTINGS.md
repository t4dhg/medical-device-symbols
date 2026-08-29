# Repository settings

> **Applied baseline — verified 2026-08-29.**

This document records the public repository controls that were applied and read back from GitHub and npm. It is an audit aid, not an authorization to tag or publish another release. Live state can drift, so re-read the services before each release.

## Branch ruleset

Master ruleset ID: `21795394`.

- Target: `refs/heads/master`.
- The bypass list is empty.
- Pull requests are required with zero approving reviews, preserving a reviewable solo-maintainer trail without requiring impossible self-approval.
- Linear history is required and review conversations must be resolved.
- Force pushes and deletions are blocked.
- The required status check is exactly `quality`, with the branch required to be current before merge.
- Squash is the only allowed merge method.

## Release-tag ruleset

Release-tag ruleset ID: `21795395`.

- Target: `refs/tags/v*`.
- The bypass list is empty.
- Updates and deletions are blocked so an existing release tag cannot be moved or removed.
- New matching tags may be created by the separately authorized release procedure.

## Security features

The following controls were enabled and re-read:

- Secret scanning and push protection.
- Private vulnerability reporting.
- Dependabot alerts, Dependabot security updates, and automated security fixes.
- CodeQL default setup for JavaScript and TypeScript, using the default query suite and the `remote_and_local` threat model.

The initial CodeQL setup run completed successfully on the privacy-clean `master` head.

## GitHub Actions policy

- GitHub-owned actions only; verified Marketplace and custom action patterns are not allowed.
- SHA pinning is required, and every checked-in `uses:` reference uses a reviewed full-length commit SHA.
- Default workflow token permissions are read-only and workflows cannot approve pull requests.

## Repository presentation and collaboration

- Description: `React components for ISO 15223-1 symbols and separate regulatory marks`.
- Homepage: `https://www.npmjs.com/package/medical-device-symbols`.
- Topics: `accessibility`, `iso-15223-1`, `medical-device`, `react`, `svg`, and `typescript`.
- GitHub Discussions is enabled for usage and support questions.
- Squash merges are the only merge method, auto-merge and update-branch suggestions are enabled, and merged head branches are deleted automatically.

## Publication prerequisites

GitHub Actions environment ID: `20830043044`.

- Environment: `npm-publish`.
- The environment has a five-minute wait timer and a custom deployment policy that permits only tags matching `v*`.
- No required reviewer is configured because the repository currently has no independent release maintainer.
- Administrators can bypass this environment; for this solo-maintainer repository, the compensating controls are the wait timer, protected immutable tags, pre-publication verification, and exact post-publication registry/provenance checks.
- The environment contains no npm token or publishing secret; the publish job receives only GitHub OIDC identity permission.

The npm trusted publisher was configured and re-read on 2026-08-29 with these exact values:

- Owner: `t4dhg`.
- Repository: `medical-device-symbols`.
- Workflow: `release.yml`.
- Environment: `npm-publish`.
- Allowed action: `npm publish`.

Do not treat a merged pull request or passing `quality` check as release authorization. A release still requires a separately authorized annotated tag and complete observation of the Release workflow. Retire any legacy npm publishing credentials only after the first OIDC publication, exact tarball verification, signature audit, and provenance verification all succeed.
