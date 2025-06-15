# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-06-15

### 🚀 BREAKING CHANGES

- **Complete API transformation**: Changed from function-based API to React components
- **New import pattern**: Now follows @sanity/icons pattern with direct component imports
- **React components**: All icons are now React components with forwardRef support

### Added

- React component exports for all 9 MDR icons (e.g., `<CautionIcon />`)
- TypeScript support with full React component types
- Size prop for easy scaling (`size={48}`)
- Full SVG props support (className, onClick, style, etc.)
- forwardRef support for accessing underlying SVG elements
- Tree-shaking support for optimal bundle sizes
- Comprehensive React usage examples
- Node.js compatibility guidance

### Removed

- **BREAKING**: Function-based API (`getIcon()`, `ICON_NAMES`, etc.)
- **BREAKING**: Bulk operations (`getAllIcons()`, `getIconNames()`)
- **BREAKING**: String-based icon returns

### Migration Guide

```tsx
// Old API (v1.x)
import { getIcon, ICON_NAMES } from "mdr-label-icons";
const iconHtml = getIcon(ICON_NAMES.CAUTION);

// New API (v2.x)
import { CautionIcon } from "mdr-label-icons";
<CautionIcon size={24} />;
```

## [1.0.0] - 2024-06-15

### Added

- Initial release of mdr-label-icons package
- 9 MDR compliant SVG icons:
  - Caution symbol
  - CE marking
  - European Conformity (EC)
  - Lot/Batch number
  - Date of manufacture
  - Manufacturer symbol
  - Medical Device (MD)
  - Read instructions for use (IFU)
  - Unique Device Identifier (UDI)
- TypeScript support with full type definitions
- Node.js API for importing icons
- Individual icon getter functions
- Bulk icon operations (getAllIcons, getIconNames)
- Constants for icon names (ICON_NAMES)
- Comprehensive documentation and examples
- React and Vue usage examples
- CSS styling examples

### Features

- Framework agnostic - works with React, Vue, Angular, vanilla JS
- Lightweight package with minimal dependencies
- SVG format for scalable graphics
- Medical Device Regulation 2017/745 compliant symbols
- Easy integration with existing projects

### Documentation

- Complete README with usage examples
- API reference documentation
- Medical device regulation compliance information
- Styling guidelines for icons
