# Repository settings

> **Proposed — not yet applied.**

This document is a source-controlled proposal for a separately authorized repository-administration change. It does not describe current live state, authorize a settings change, or authorize a release. Re-read the repository's live settings immediately before applying any part of the proposal.

## Branch ruleset

Propose an active branch ruleset with these values:

- Target: `refs/heads/master`.
- Bypass list: none.
- Require a pull request before changes reach the target branch. Require zero approving reviews so a solo maintainer can retain a reviewable pull-request trail without an impossible self-approval requirement.
- Require linear history and require conversation resolution before merging.
- Block force pushes and restrict deletions.
- Require the `quality` status check after GitHub records a successful `quality` check from `.github/workflows/ci.yml`. Do not attempt to select an unobserved check name.

## Release-tag ruleset

Propose an active tag ruleset with these values:

- Target: `refs/tags/v*`.
- Bypass list: none.
- Restrict updates and restrict deletions so an existing release tag cannot be moved or removed.
- Do not restrict creations; the separately authorized release process must still be able to create a new matching tag.

## Security features

Propose enabling or re-verifying each of the following in the live repository:

- Secret scanning and push protection.
- Private vulnerability reporting.
- Dependabot alerts and Dependabot security updates.
- CodeQL default setup for JavaScript and TypeScript.

The administrator applying this proposal must confirm the resulting live status instead of treating this file as evidence that a feature is enabled.

## GitHub Actions policy

Propose allowing GitHub-authored actions only. Any exception must identify an allowed action explicitly and receive separate review. Require every workflow `uses:` reference, including GitHub-authored actions, to use a reviewed full-length commit SHA; do not use mutable tags or branches.

## Repository presentation and collaboration

Propose the following settings:

- Description: `React components for ISO 15223-1 symbols and separate regulatory marks.`
- Topics: `medical-device`, `iso-15223-1`, `react`, `svg`, `typescript`, and `accessibility`; remove unrelated or misleading topics.
- Enable GitHub Discussions for usage and support questions so the issue chooser's Discussions link has a destination.
- Automatically delete head branches after pull requests merge.
- Allow squash merging only; disable merge commits and rebase merging.

## Publication prerequisites

The following values are proposals only. The environment and trusted publisher do not exist merely because they are documented here:

- Environment: `npm-publish`.
- Owner: `t4dhg`.
- Repository: `medical-device-symbols`.
- Workflow: `release.yml`.
- Allowed action: `npm publish`.

Creating the protected environment, configuring the npm trusted publisher, and using either are deferred pending separate release implementation and separately authorized external execution. A checked-in workflow, merged pull request, or passing `quality` check does not grant that authorization.
