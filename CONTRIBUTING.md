# Contributing to Medical Device Symbols

Thank you for your interest in contributing! This guide explains how the package is built and how to add or update symbols.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How It Works](#how-it-works)
- [Getting Started](#getting-started)
- [Adding or Updating a Symbol](#adding-or-updating-a-symbol)
- [Submitting Changes](#submitting-changes)

## Code of Conduct

Be respectful and constructive. By participating, you agree to keep the project a welcoming space for everyone.

## How It Works

Symbols are authored as plain SVG files and compiled into React components automatically:

- `src/icons/` holds one SVG per symbol (the source of truth).
- `scripts/generate-index.js` reads those SVGs and generates `src/index.tsx`.
- `src/index.tsx` is generated. Do not edit it by hand; it is overwritten on every build.
- `tsc` compiles `src/index.tsx` into `lib/` (the published output).

```
src/
  icons/          # SVG source files (edit these)
  index.tsx       # generated, do not edit
scripts/
  generate-index.js  # generates src/index.tsx from the SVGs
  generate-table.js   # prints the README "Available Icons" table
lib/              # compiled output (generated, gitignored)
```

## Getting Started

Requirements: Node.js 18 or later and npm.

```bash
# Fork and clone your fork
git clone https://github.com/<your-username>/medical-device-symbols.git
cd medical-device-symbols

# Install dependencies
npm install

# Build (runs the generator, then tsc)
npm run build

# Run the smoke tests
npm test
```

## Adding or Updating a Symbol

1. **Add the SVG** to `src/icons/` using a kebab-case file name, for example `new-symbol.svg`.
2. **Match the conventions** of the existing icons:
   - Use a `viewBox="0 0 200 200"`.
   - Use `fill="currentColor"` / `stroke="currentColor"` (not hard-coded `#000`) so the symbol inherits the consumer's color and works in dark mode. The generator normalises stray black fills, but authoring in `currentColor` keeps the source clean.
   - Verify the symbol matches the official **ISO 15223-1:2021** artwork.
3. **Regenerate** the components:
   ```bash
   npm run generate   # rewrites src/index.tsx
   npm run build      # compiles to lib/
   npm test           # verifies the exports
   ```
   The component name is derived automatically (`new-symbol.svg` becomes `NewSymbolIcon`).
4. **Update the README gallery**. Regenerate the table with `node scripts/generate-table.js` and paste the output into the "Available Icons" section, or add the single new row.
5. **Update the CHANGELOG** under the `[Unreleased]` heading.

## Submitting Changes

1. Create a branch from `master`: `git checkout -b feature/my-symbol`.
2. Make your changes and ensure `npm run build && npm test` passes.
3. Write clear commit messages in the imperative mood, referencing issues where relevant.
4. Open a pull request against `master` with a short description of the change.

### Commit message example

```
Add non-sterile symbol

- Add non-sterile.svg to src/icons/
- Regenerate components and the README gallery
- Note the addition in the changelog

Closes #123
```

## Questions?

Open an [issue](https://github.com/t4dhg/medical-device-symbols/issues) or start a [discussion](https://github.com/t4dhg/medical-device-symbols/discussions). Thank you for contributing!
