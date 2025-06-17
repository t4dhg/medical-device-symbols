# Contributing to Medical Device Symbols

Thank you for your interest in contributing to Medical Device Symbols! This document provides guidelines for contributing to this project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Adding New Icons](#adding-new-icons)
- [Development Setup](#development-setup)
- [Submitting Changes](#submitting-changes)

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally
3. Install dependencies: `npm install`
4. Build the project: `npm run build`
5. Run examples to verify setup: `node examples/basic-usage.js`

## How to Contribute

### Reporting Bugs

- Use the GitHub issue tracker
- Include a clear title and description
- Provide as much relevant information as possible
- Include code samples if applicable

### Suggesting Features

- Open an issue with a clear title and detailed description
- Explain why this feature would be useful
- Provide examples of how it would be used

### Pull Requests

- Fork the repo and create your branch from `main`
- If you've added code that should be tested, add tests
- Ensure the build passes: `npm run build`
- Make sure your code follows the existing style
- Write a clear and descriptive commit message

## Adding New Icons

When adding new MDR-compliant icons:

1. **Verify Compliance**: Ensure the icon follows Medical Device Regulation 2017/745 standards
2. **SVG Format**: Icons must be in SVG format
3. **File Naming**: Use kebab-case naming (e.g., `new-icon.svg`)
4. **File Location**: Place SVG files in `src/icons/`
5. **Update Code**: Add the new icon to `src/index.ts`:

```typescript
export const getNewIcon = (): string => {
  return fs.readFileSync(path.join(__dirname, "icons", "new-icon.svg"), "utf8");
};

// Add to icons object
export const icons: Record<string, () => string> = {
  // ...existing icons...
  "new-icon": getNewIcon,
};

// Add to ICON_NAMES constant
export const ICON_NAMES = {
  // ...existing constants...
  NEW_ICON: "new-icon",
} as const;
```

6. **Update Documentation**: Add the new icon to the README.md table
7. **Update Examples**: Include the new icon in usage examples if relevant

## Development Setup

### Prerequisites

- Node.js 16.0.0 or higher
- npm or yarn

### Local Development

```bash
# Clone your fork
git clone https://github.com/your-username/medical-device-symbols.git
cd medical-device-symbols

# Install dependencies
npm install

# Build the project
npm run build

# Test the build
node examples/basic-usage.js
```

### File Structure

```
src/
├── index.ts          # Main entry point
└── icons/            # SVG icon files
lib/                  # Compiled JavaScript (generated)
examples/             # Usage examples
```

## Submitting Changes

1. **Create a Branch**: `git checkout -b feature/your-feature-name`
2. **Make Changes**: Implement your changes
3. **Test**: Ensure all examples work: `npm run build && node examples/basic-usage.js`
4. **Commit**: Use clear, descriptive commit messages
5. **Push**: `git push origin feature/your-feature-name`
6. **Pull Request**: Open a PR with a clear title and description

### Commit Message Guidelines

- Use present tense ("Add feature" not "Added feature")
- Use imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests when applicable

Example:

```
Add UDI icon for unique device identification

- Added udi.svg icon file
- Updated index.ts with getUdiIcon function
- Added UDI to ICON_NAMES constants
- Updated README with new icon documentation

Fixes #123
```

## Medical Device Regulation Compliance

When contributing icons, ensure they comply with:

- **EU MDR 2017/745**: Medical Device Regulation
- **ISO 15223-1**: Medical devices - Symbols to be used with medical device labels
- **IEC 60601-1**: Medical electrical equipment standards

## Questions?

Feel free to:

- Open an issue for questions
- Start a discussion in the Discussions tab
- Contact the maintainers

Thank you for contributing! 🏥
