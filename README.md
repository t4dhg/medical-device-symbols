# MDR Label Icons

[![npm version](https://img.shields.io/npm/v/mdr-label-icons.svg)](https://www.npmjs.com/package/mdr-label-icons)
[![npm downloads](https://img.shields.io/npm/dm/mdr-label-icons.svg)](https://www.npmjs.com/package/mdr-label-icons)
[![license](https://img.shields.io/npm/l/mdr-label-icons.svg)](https://github.com/t4dhg/mdr-label-icons/blob/master/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/t4dhg/mdr-label-icons?style=social)](https://github.com/t4dhg/mdr-label-icons)

Easy and light-weight React icons compliant with Medical Device Regulation 2017/745. This package provides official MDR symbols as React components that can be easily integrated into web applications, documentation, and medical device labeling.

## Features

- 🏥 **MDR Compliant**: All icons follow the official Medical Device Regulation 2017/745 specifications
- ⚛️ **React Components**: Direct import as React components with TypeScript support
- 📦 **Lightweight**: Minimal package size with tree-shaking support
- 🔧 **Easy Integration**: Simple import syntax like popular icon libraries
- 🎨 **SVG Format**: Scalable vector graphics for crisp display at any size
- 🎯 **Prop Support**: Full SVG props support with size, color, and event handling
- 🔒 **TypeScript Support**: Full TypeScript definitions included

## Installation

```bash
npm install mdr-label-icons
```

```bash
yarn add mdr-label-icons
```

```bash
pnpm add mdr-label-icons
```

## Quick Start

Import individual icon components directly:

```tsx
import { CautionIcon, CeIcon, ManufacturerIcon } from "mdr-label-icons";

function App() {
  return (
    <div>
      {/* Simple usage with default size (24px) */}
      <CautionIcon />

      {/* Custom size */}
      <CeIcon size={48} />

      {/* Custom styling */}
      <ManufacturerIcon style={{ fontSize: 72, color: "blue" }} />
    </div>
  );
}
```

## Available Icons

| Icon Component        | Symbol | Description               |
| --------------------- | ------ | ------------------------- |
| `CautionIcon`         | ⚠️     | General caution symbol    |
| `CeIcon`              | CE     | CE marking                |
| `EcIcon`              | EC     | European Conformity       |
| `LotIcon`             | LOT    | Batch/Lot number          |
| `ManufactureDateIcon` | 📅     | Date of manufacture       |
| `ManufacturerIcon`    | 🏭     | Manufacturer symbol       |
| `MdIcon`              | MD     | Medical Device            |
| `ReadIfuIcon`         | 📖     | Read instructions for use |
| `UdiIcon`             | UDI    | Unique Device Identifier  |

## Usage

### Basic Usage

```tsx
import { CautionIcon, CeIcon, ManufacturerIcon } from "mdr-label-icons";

function MyComponent() {
  return (
    <div>
      <CautionIcon />
      <CeIcon size={32} />
      <ManufacturerIcon style={{ color: "blue" }} />
    </div>
  );
}
```

### Custom Sizing

```tsx
import { CautionIcon } from "mdr-label-icons";

function App() {
  return (
    <div>
      {/* Default size (24px) */}
      <CautionIcon />

      {/* Custom pixel size */}
      <CautionIcon size={48} />

      {/* Custom CSS unit */}
      <CautionIcon size="2rem" />

      {/* Using CSS in style prop */}
      <CautionIcon style={{ fontSize: 72 }} />
    </div>
  );
}
```

### Custom Styling and Props

```tsx
import { CeIcon, ManufacturerIcon } from "mdr-label-icons";

function App() {
  return (
    <div>
      {/* Custom colors */}
      <CeIcon style={{ color: "blue" }} />

      {/* All standard SVG props work */}
      <ManufacturerIcon
        fill="red"
        stroke="black"
        strokeWidth={2}
        opacity={0.8}
      />

      {/* Event handlers */}
      <CeIcon
        onClick={() => console.log("Clicked!")}
        onMouseOver={() => console.log("Hovered!")}
        style={{ cursor: "pointer" }}
      />
    </div>
  );
}
```

### React Component Example

```tsx
import React from "react";
import {
  CautionIcon,
  CeIcon,
  ManufacturerIcon,
  LotIcon,
  ManufactureDateIcon,
} from "mdr-label-icons";

const MedicalDeviceLabel = () => {
  return (
    <div className="device-label">
      <div className="warning-section">
        <CautionIcon size={32} style={{ color: "#ff6b35" }} />
        <span>Read instructions before use</span>
      </div>

      <div className="compliance-marks">
        <CeIcon size={24} />
        <ManufacturerIcon size={20} />
      </div>

      <div className="device-info">
        <div className="lot-info">
          <LotIcon size={16} />
          <span>LOT: ABC123</span>
        </div>
        <div className="date-info">
          <ManufactureDateIcon size={16} />
          <span>2024-06</span>
        </div>
      </div>
    </div>
  );
};
```

## TypeScript Support

The package includes full TypeScript definitions. All icon components are properly typed:

```tsx
import { CautionIcon, IconProps } from "mdr-label-icons";

// IconProps interface is available for custom components
const CustomIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ size = 24, ...props }, ref) => {
    return <CautionIcon ref={ref} size={size} {...props} />;
  }
);
```

## Props

All icon components accept the following props:

| Prop       | Type                            | Default | Description                      |
| ---------- | ------------------------------- | ------- | -------------------------------- |
| `size`     | `number \| string`              | `24`    | Icon size in pixels or CSS units |
| `...props` | `React.SVGProps<SVGSVGElement>` | -       | All standard SVG element props   |

Common SVG props include:

- `fill` - Fill color
- `stroke` - Stroke color
- `strokeWidth` - Stroke width
- `opacity` - Opacity (0-1)
- `className` - CSS class
- `style` - Inline styles
- `onClick`, `onMouseOver`, etc. - Event handlers

## Medical Device Regulation Compliance

All icons in this package are designed to comply with:

- **EU MDR 2017/745** - Medical Device Regulation
- **ISO 15223-1** - Medical devices symbols to be used with medical device labels
- **IEC 62366-1** - Medical devices application of usability engineering

The symbols are officially recognized and should be used according to the respective regulations and standards.

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have questions:

1. Check the [GitHub Issues](https://github.com/t4dhg/mdr-label-icons/issues)
2. Create a new issue if needed
3. Review the examples in the `examples/` directory

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release history and changes.

#### `getIcon(name: string): string | null`

Returns the SVG content for the specified icon name, or null if not found.

#### `getIconNames(): string[]`

Returns an array of all available icon names.

#### `getAllIcons(): Record<string, string>`

Returns an object with all icons where keys are icon names and values are SVG strings.

### Individual Icon Functions

Each icon has its own dedicated function:

- `getCautionIcon(): string`
- `getCeIcon(): string`
- `getEcIcon(): string`
- `getLotIcon(): string`
- `getManufactureDateIcon(): string`
- `getManufacturerIcon(): string`
- `getMdIcon(): string`
- `getReadIfuIcon(): string`
- `getUdiIcon(): string`

### Constants

#### `ICON_NAMES`

Object containing all icon names as constants for better developer experience:

```typescript
{
  CAUTION: 'caution',
  CE: 'ce',
  EC: 'ec',
  LOT: 'lot',
  MANUFACTURE_DATE: 'manufacture-date',
  MANUFACTURER: 'manufacturer',
  MD: 'md',
  READ_IFU: 'read-ifu',
  UDI: 'udi'
}
```

## Styling Icons

The SVG icons can be styled using CSS:

```css
.mdr-icon {
  width: 24px;
  height: 24px;
  fill: #333;
}

.mdr-icon.large {
  width: 48px;
  height: 48px;
}

.mdr-icon.warning {
  fill: #ff6b35;
}

.mdr-icon.success {
  fill: #4caf50;
}
```

## Medical Device Regulation Compliance

This package provides symbols that are compliant with:

- **EU MDR 2017/745**: Medical Device Regulation
- **ISO 15223-1**: Medical devices - Symbols to be used with medical device labels, labelling and information to be supplied
- **IEC 60601-1**: Medical electrical equipment standards

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT © [Taig Mac Carthy](https://github.com/t4dhg)

## Support

- 🐛 [Report Issues](https://github.com/t4dhg/mdr-label-icons/issues)
- 📖 [Documentation](https://github.com/t4dhg/mdr-label-icons#readme)
- 💬 [Discussions](https://github.com/t4dhg/mdr-label-icons/discussions)

---

**Note**: This package provides symbols for informational and development purposes. Always verify compliance with current regulations and consult with regulatory experts for official medical device labeling requirements.
