# Medical Device Symbols

[![npm version](https://img.shields.io/npm/v/medical-device-symbols.svg)](https://www.npmjs.com/package/medical-device-symbols)
[![npm downloads](https://img.shields.io/npm/dm/medical-device-symbols.svg)](https://www.npmjs.com/package/medical-device-symbols)
[![license](https://img.shields.io/npm/l/medical-device-symbols.svg)](https://github.com/t4dhg/medical-device-symbols/blob/master/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/t4dhg/medical-device-symbols?style=social)](https://github.com/t4dhg/medical-device-symbols)

Internationally recognized medical device symbols based on ISO 15223-1:2021 for global regulatory compliance. This package provides official medical device symbols as React components that can be easily integrated into web applications, documentation, and medical device labeling worldwide.

## Features

- 🌍 **Globally Recognized**: Based on ISO 15223-1:2021, the international standard for medical device symbols
- 🏛️ **Multi-Regulatory Compliance**: Supports EU MDR/IVDR, FDA 21 CFR Part 801, Health Canada, and other international frameworks
- ⚛️ **React Components**: Direct import as React components with TypeScript support
- 📦 **Lightweight**: Minimal package size with tree-shaking support
- 🔧 **Easy Integration**: Simple import syntax like popular icon libraries
- 🎨 **SVG Format**: Scalable vector graphics for crisp display at any size
- 🎯 **Prop Support**: Full SVG props support with size, color, and event handling
- 🔒 **TypeScript Support**: Full TypeScript definitions included

## Installation

```bash
npm install medical-device-symbols
```

```bash
yarn add medical-device-symbols
```

```bash
pnpm add medical-device-symbols
```

## Quick Start

Import individual icon components directly:

```tsx
import { CautionIcon, CeIcon, ManufacturerIcon } from "medical-device-symbols";

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

| Symbol                                                                                                                    | Component Name                                       | Title                                               |
| ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------- |
| ![atmospheric-pressure-limitation](src/icons/atmospheric-pressure-limitation.svg)                                         | `AtmosphericPressureLimitationIcon`                  | Atmospheric Pressure Limitation                     |
| ![authorized-representative-in-the-european-community](src/icons/authorized-representative-in-the-european-community.svg) | `AuthorizedRepresentativeInTheEuropeanCommunityIcon` | Authorized Representative In The European Community |
| ![batch-code](src/icons/batch-code.svg)                                                                                   | `BatchCodeIcon`                                      | Batch Code                                          |
| ![catalogue-number](src/icons/catalogue-number.svg)                                                                       | `CatalogueNumberIcon`                                | Catalogue Number                                    |
| ![caution](src/icons/caution.svg)                                                                                         | `CautionIcon`                                        | Caution                                             |
| ![ce-bsi](src/icons/ce-bsi.svg)                                                                                           | `CeBsiIcon`                                          | Ce Bsi                                              |
| ![ce](src/icons/ce.svg)                                                                                                   | `CeIcon`                                             | Ce                                                  |
| ![consult-instructions-for-use](src/icons/consult-instructions-for-use.svg)                                               | `ConsultInstructionsForUseIcon`                      | Consult Instructions For Use                        |
| ![do-not-re-use](src/icons/do-not-re-use.svg)                                                                             | `DoNotReUseIcon`                                     | Do Not Re Use                                       |
| ![do-not-use-if-package-is-damaged](src/icons/do-not-use-if-package-is-damaged.svg)                                       | `DoNotUseIfPackageIsDamagedIcon`                     | Do Not Use If Package Is Damaged                    |
| ![fluid-path](src/icons/fluid-path.svg)                                                                                   | `FluidPathIcon`                                      | Fluid Path                                          |
| ![humidity-limitation](src/icons/humidity-limitation.svg)                                                                 | `HumidityLimitationIcon`                             | Humidity Limitation                                 |
| ![in-vitro-diagnostic-medical-device](src/icons/in-vitro-diagnostic-medical-device.svg)                                   | `InVitroDiagnosticMedicalDeviceIcon`                 | In Vitro Diagnostic Medical Device                  |
| ![latex](src/icons/latex.svg)                                                                                             | `LatexIcon`                                          | Latex                                               |
| ![liquid-filter-with-pore-size](src/icons/liquid-filter-with-pore-size.svg)                                               | `LiquidFilterWithPoreSizeIcon`                       | Liquid Filter With Pore Size                        |
| ![lower-limit-of-temperature](src/icons/lower-limit-of-temperature.svg)                                                   | `LowerLimitOfTemperatureIcon`                        | Lower Limit Of Temperature                          |
| ![manufacture-date](src/icons/manufacture-date.svg)                                                                       | `ManufactureDateIcon`                                | Manufacture Date                                    |
| ![manufacturer](src/icons/manufacturer.svg)                                                                               | `ManufacturerIcon`                                   | Manufacturer                                        |
| ![md](src/icons/md.svg)                                                                                                   | `MdIcon`                                             | Md                                                  |
| ![non-pyrogenic](src/icons/non-pyrogenic.svg)                                                                             | `NonPyrogenicIcon`                                   | Non Pyrogenic                                       |
| ![serial-number](src/icons/serial-number.svg)                                                                             | `SerialNumberIcon`                                   | Serial Number                                       |
| ![sterile](src/icons/sterile.svg)                                                                                         | `SterileIcon`                                        | Sterile                                             |
| ![sterilized-using-aseptic-processing-techniques](src/icons/sterilized-using-aseptic-processing-techniques.svg)           | `SterilizedUsingAsepticProcessingTechniquesIcon`     | Sterilized Using Aseptic Processing Techniques      |
| ![sterilized-using-ethylene-oxide](src/icons/sterilized-using-ethylene-oxide.svg)                                         | `SterilizedUsingEthyleneOxideIcon`                   | Sterilized Using Ethylene Oxide                     |
| ![sterilized-using-irradiation](src/icons/sterilized-using-irradiation.svg)                                               | `SterilizedUsingIrradiationIcon`                     | Sterilized Using Irradiation                        |
| ![sterilized-using-steam-or-dry-heat](src/icons/sterilized-using-steam-or-dry-heat.svg)                                   | `SterilizedUsingSteamOrDryHeatIcon`                  | Sterilized Using Steam Or Dry Heat                  |
| ![temperature-limit](src/icons/temperature-limit.svg)                                                                     | `TemperatureLimitIcon`                               | Temperature Limit                                   |
| ![udi](src/icons/udi.svg)                                                                                                 | `UdiIcon`                                            | Udi                                                 |
| ![upper-limit-of-temperature](src/icons/upper-limit-of-temperature.svg)                                                   | `UpperLimitOfTemperatureIcon`                        | Upper Limit Of Temperature                          |

## Usage

### Basic Usage

```tsx
import { CautionIcon, CeIcon, ManufacturerIcon } from "medical-device-symbols";

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
import { CautionIcon } from "medical-device-symbols";

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
import { CeIcon, ManufacturerIcon } from "medical-device-symbols";

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
} from "medical-device-symbols";

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
import { CautionIcon, IconProps } from "medical-device-symbols";

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

## International Regulatory Compliance

All symbols in this package are based on **ISO 15223-1:2021** - the international standard for medical device symbols. This standard is recognized and referenced by regulatory frameworks worldwide, including:

### Primary Standards

- **ISO 15223-1:2021** - Medical devices — Symbols to be used with medical device labels, labelling and information to be supplied

### Regional & National Regulatory Frameworks

- **European Union**: EU MDR 2017/745 and EU IVDR 2017/746
- **United States**: FDA 21 CFR Part 801 - Labeling requirements
- **Canada**: Medical Devices Regulations (SOR/98-282)
- **Japan**: Pharmaceutical and Medical Device Act (PMD Act)
- **Brazil**: ANVISA medical device regulations
- **China**: NMPA (National Medical Products Administration) requirements
- **South Korea**: MFDS (Ministry of Food and Drug Safety) regulations
- **Australia**: TGA (Therapeutic Goods Administration) requirements

### Supporting Standards

- **IEC 62366-1** - Medical devices application of usability engineering
- **IEC 60601-1** - Medical electrical equipment standards

The symbols provided are internationally recognized and should be used according to the respective regulations and standards in your target markets.

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have questions:

1. Check the [GitHub Issues](https://github.com/t4dhg/medical-device-symbols/issues)
2. Create a new issue if needed
3. Review the examples in the `examples/` directory

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

- **ISO 15223-1:2021**: The primary international standard for medical device symbols
- **EU MDR 2017/745 & IVDR 2017/746**: European medical device regulations
- **FDA 21 CFR Part 801**: US medical device labeling requirements
- **Health Canada MDR**: Canadian medical device regulations
- **Other International Standards**: Recognized by regulatory bodies worldwide

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT © [Taig Mac Carthy](https://github.com/t4dhg)

## Support

- 🐛 [Report Issues](https://github.com/t4dhg/medical-device-symbols/issues)
- 📖 [Documentation](https://github.com/t4dhg/medical-device-symbols#readme)
- 💬 [Discussions](https://github.com/t4dhg/medical-device-symbols/discussions)

---

**Note**: This package provides symbols based on ISO 15223-1:2021 for informational and development purposes. While these symbols are internationally recognized, always verify compliance with current regulations in your target markets and consult with regulatory experts for official medical device labeling requirements specific to your jurisdiction.
