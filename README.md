<p align="center">
  <img src="https://cdn.jsdelivr.net/gh/t4dhg/medical-device-symbols@master/assets/banner.png" alt="Medical Device Symbols" width="880" />
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/medical-device-symbols"><img src="https://img.shields.io/npm/v/medical-device-symbols?style=flat-square&color=0e9e96" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/medical-device-symbols"><img src="https://img.shields.io/npm/dm/medical-device-symbols?style=flat-square" alt="npm downloads" /></a>
  <a href="https://www.npmjs.com/package/medical-device-symbols"><img src="https://img.shields.io/npm/types/medical-device-symbols?style=flat-square" alt="types included" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/npm/l/medical-device-symbols?style=flat-square" alt="license" /></a>
  <a href="https://github.com/t4dhg/medical-device-symbols"><img src="https://img.shields.io/github/stars/t4dhg/medical-device-symbols?style=flat-square" alt="GitHub stars" /></a>
</p>

# Medical Device Symbols

Internationally recognized medical device symbols based on **ISO 15223-1:2021**, delivered as React components you can drop into web apps, dashboards, documentation, and digital device labeling. Each symbol is a plain SVG component: size it, color it, and give it an accessible label like any other icon.

## Features

- 🌍 **Standards based**: every symbol follows ISO 15223-1:2021, the international standard for medical device labeling symbols.
- 🏛️ **Multi-regulatory**: the same symbol set is referenced by EU MDR/IVDR, FDA 21 CFR Part 801, Health Canada, and other frameworks worldwide.
- ⚛️ **React components**: import each symbol directly, with `forwardRef` and full TypeScript types.
- 🎨 **Themeable**: icons inherit `currentColor`, so they match surrounding text and adapt to light and dark themes. Recolor by setting `color`.
- ♿ **Accessible ready**: pass `title` for a labeled icon, or standard ARIA props for full control.
- 🌳 **Tree-shakeable**: ships ESM and CommonJS and is marked side-effect-free, so bundlers keep only the icons you import.
- 📦 **Zero runtime dependencies**: React is the only peer dependency.

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

```tsx
import { CautionIcon, CeIcon, ManufacturerIcon } from "medical-device-symbols";

function App() {
  return (
    <div>
      {/* Default size (24px) */}
      <CautionIcon />

      {/* Custom size */}
      <CeIcon size={48} />

      {/* Recolor via currentColor */}
      <ManufacturerIcon style={{ color: "#0e9e96" }} />
    </div>
  );
}
```

## Available Icons

29 symbols, each exported as a `PascalCase` component.

| Symbol | Component | Title |
| :----: | --------- | ----- |
| <img src="https://cdn.jsdelivr.net/gh/t4dhg/medical-device-symbols@master/src/icons/atmospheric-pressure-limitation.svg" width="44" height="44" alt="Atmospheric Pressure Limitation" /> | `AtmosphericPressureLimitationIcon` | Atmospheric Pressure Limitation |
| <img src="https://cdn.jsdelivr.net/gh/t4dhg/medical-device-symbols@master/src/icons/authorized-representative-in-the-european-community.svg" width="44" height="44" alt="Authorized Representative In The European Community" /> | `AuthorizedRepresentativeInTheEuropeanCommunityIcon` | Authorized Representative In The European Community |
| <img src="https://cdn.jsdelivr.net/gh/t4dhg/medical-device-symbols@master/src/icons/batch-code.svg" width="44" height="44" alt="Batch Code" /> | `BatchCodeIcon` | Batch Code |
| <img src="https://cdn.jsdelivr.net/gh/t4dhg/medical-device-symbols@master/src/icons/catalogue-number.svg" width="44" height="44" alt="Catalogue Number" /> | `CatalogueNumberIcon` | Catalogue Number |
| <img src="https://cdn.jsdelivr.net/gh/t4dhg/medical-device-symbols@master/src/icons/caution.svg" width="44" height="44" alt="Caution" /> | `CautionIcon` | Caution |
| <img src="https://cdn.jsdelivr.net/gh/t4dhg/medical-device-symbols@master/src/icons/ce-bsi.svg" width="44" height="44" alt="CE marking (Notified Body 2797)" /> | `CeBsiIcon` | CE marking (Notified Body 2797) |
| <img src="https://cdn.jsdelivr.net/gh/t4dhg/medical-device-symbols@master/src/icons/ce.svg" width="44" height="44" alt="CE marking" /> | `CeIcon` | CE marking |
| <img src="https://cdn.jsdelivr.net/gh/t4dhg/medical-device-symbols@master/src/icons/consult-instructions-for-use.svg" width="44" height="44" alt="Consult Instructions For Use" /> | `ConsultInstructionsForUseIcon` | Consult Instructions For Use |
| <img src="https://cdn.jsdelivr.net/gh/t4dhg/medical-device-symbols@master/src/icons/do-not-re-use.svg" width="44" height="44" alt="Do not reuse" /> | `DoNotReUseIcon` | Do not reuse |
| <img src="https://cdn.jsdelivr.net/gh/t4dhg/medical-device-symbols@master/src/icons/do-not-use-if-package-is-damaged.svg" width="44" height="44" alt="Do Not Use If Package Is Damaged" /> | `DoNotUseIfPackageIsDamagedIcon` | Do Not Use If Package Is Damaged |
| <img src="https://cdn.jsdelivr.net/gh/t4dhg/medical-device-symbols@master/src/icons/fluid-path.svg" width="44" height="44" alt="Fluid Path" /> | `FluidPathIcon` | Fluid Path |
| <img src="https://cdn.jsdelivr.net/gh/t4dhg/medical-device-symbols@master/src/icons/humidity-limitation.svg" width="44" height="44" alt="Humidity Limitation" /> | `HumidityLimitationIcon` | Humidity Limitation |
| <img src="https://cdn.jsdelivr.net/gh/t4dhg/medical-device-symbols@master/src/icons/in-vitro-diagnostic-medical-device.svg" width="44" height="44" alt="In vitro diagnostic medical device" /> | `InVitroDiagnosticMedicalDeviceIcon` | In vitro diagnostic medical device |
| <img src="https://cdn.jsdelivr.net/gh/t4dhg/medical-device-symbols@master/src/icons/latex.svg" width="44" height="44" alt="Latex" /> | `LatexIcon` | Latex |
| <img src="https://cdn.jsdelivr.net/gh/t4dhg/medical-device-symbols@master/src/icons/liquid-filter-with-pore-size.svg" width="44" height="44" alt="Liquid Filter With Pore Size" /> | `LiquidFilterWithPoreSizeIcon` | Liquid Filter With Pore Size |
| <img src="https://cdn.jsdelivr.net/gh/t4dhg/medical-device-symbols@master/src/icons/lower-limit-of-temperature.svg" width="44" height="44" alt="Lower Limit Of Temperature" /> | `LowerLimitOfTemperatureIcon` | Lower Limit Of Temperature |
| <img src="https://cdn.jsdelivr.net/gh/t4dhg/medical-device-symbols@master/src/icons/manufacture-date.svg" width="44" height="44" alt="Manufacture Date" /> | `ManufactureDateIcon` | Manufacture Date |
| <img src="https://cdn.jsdelivr.net/gh/t4dhg/medical-device-symbols@master/src/icons/manufacturer.svg" width="44" height="44" alt="Manufacturer" /> | `ManufacturerIcon` | Manufacturer |
| <img src="https://cdn.jsdelivr.net/gh/t4dhg/medical-device-symbols@master/src/icons/md.svg" width="44" height="44" alt="Medical device" /> | `MdIcon` | Medical device |
| <img src="https://cdn.jsdelivr.net/gh/t4dhg/medical-device-symbols@master/src/icons/non-pyrogenic.svg" width="44" height="44" alt="Non Pyrogenic" /> | `NonPyrogenicIcon` | Non Pyrogenic |
| <img src="https://cdn.jsdelivr.net/gh/t4dhg/medical-device-symbols@master/src/icons/serial-number.svg" width="44" height="44" alt="Serial Number" /> | `SerialNumberIcon` | Serial Number |
| <img src="https://cdn.jsdelivr.net/gh/t4dhg/medical-device-symbols@master/src/icons/sterile.svg" width="44" height="44" alt="Sterile" /> | `SterileIcon` | Sterile |
| <img src="https://cdn.jsdelivr.net/gh/t4dhg/medical-device-symbols@master/src/icons/sterilized-using-aseptic-processing-techniques.svg" width="44" height="44" alt="Sterilized Using Aseptic Processing Techniques" /> | `SterilizedUsingAsepticProcessingTechniquesIcon` | Sterilized Using Aseptic Processing Techniques |
| <img src="https://cdn.jsdelivr.net/gh/t4dhg/medical-device-symbols@master/src/icons/sterilized-using-ethylene-oxide.svg" width="44" height="44" alt="Sterilized Using Ethylene Oxide" /> | `SterilizedUsingEthyleneOxideIcon` | Sterilized Using Ethylene Oxide |
| <img src="https://cdn.jsdelivr.net/gh/t4dhg/medical-device-symbols@master/src/icons/sterilized-using-irradiation.svg" width="44" height="44" alt="Sterilized Using Irradiation" /> | `SterilizedUsingIrradiationIcon` | Sterilized Using Irradiation |
| <img src="https://cdn.jsdelivr.net/gh/t4dhg/medical-device-symbols@master/src/icons/sterilized-using-steam-or-dry-heat.svg" width="44" height="44" alt="Sterilized Using Steam Or Dry Heat" /> | `SterilizedUsingSteamOrDryHeatIcon` | Sterilized Using Steam Or Dry Heat |
| <img src="https://cdn.jsdelivr.net/gh/t4dhg/medical-device-symbols@master/src/icons/temperature-limit.svg" width="44" height="44" alt="Temperature Limit" /> | `TemperatureLimitIcon` | Temperature Limit |
| <img src="https://cdn.jsdelivr.net/gh/t4dhg/medical-device-symbols@master/src/icons/udi.svg" width="44" height="44" alt="Unique Device Identifier" /> | `UdiIcon` | Unique Device Identifier |
| <img src="https://cdn.jsdelivr.net/gh/t4dhg/medical-device-symbols@master/src/icons/upper-limit-of-temperature.svg" width="44" height="44" alt="Upper Limit Of Temperature" /> | `UpperLimitOfTemperatureIcon` | Upper Limit Of Temperature |

## Usage

### Sizing

`size` accepts a number (pixels) or any CSS length string.

```tsx
<CautionIcon />            {/* 24px default */}
<CautionIcon size={48} /> {/* 48px */}
<CautionIcon size="2rem" />
```

### Color and theming

Icons draw themselves with `currentColor`, so by default they match the surrounding text color and adapt to light or dark themes automatically. Set `color` (via `style`, `className`, or an inherited CSS `color`) to recolor a whole icon:

```tsx
<CeIcon style={{ color: "#0e9e96" }} />
<CautionIcon style={{ color: "#d7263d" }} />
```

Because the artwork uses `currentColor`, a plain `fill` prop only affects the root `<svg>` and will not recolor the symbol; use `color` instead.

### Accessibility

By default an icon has no ARIA semantics, so you decide how it is announced:

```tsx
{/* Decorative: the neighbouring text already conveys the meaning */}
<CautionIcon aria-hidden />
<span>Read the instructions before use</span>

{/* Meaningful: pass `title` to get role="img" and an accessible label */}
<CautionIcon title="Caution" />

{/* ...or set the ARIA attributes yourself, if you prefer */}
<CautionIcon role="img" aria-label="Caution" />
```

### Full example

```tsx
import {
  CautionIcon,
  CeIcon,
  ManufacturerIcon,
  BatchCodeIcon,
  ManufactureDateIcon,
} from "medical-device-symbols";

function DeviceLabel() {
  return (
    <div className="device-label">
      <div className="warning">
        <CautionIcon size={32} role="img" aria-label="Caution" />
        <span>Read instructions before use</span>
      </div>

      <div className="marks">
        <CeIcon size={24} />
        <ManufacturerIcon size={20} />
      </div>

      <div className="info">
        <BatchCodeIcon size={16} aria-hidden /> <span>LOT: ABC123</span>
        <ManufactureDateIcon size={16} aria-hidden /> <span>2024-06</span>
      </div>
    </div>
  );
}
```

## TypeScript

Full type definitions ship with the package. The `IconProps` interface is exported for building wrappers:

```tsx
import React from "react";
import { CautionIcon, IconProps } from "medical-device-symbols";

const BrandedCaution = React.forwardRef<SVGSVGElement, IconProps>(
  ({ size = 24, ...props }, ref) => (
    <CautionIcon ref={ref} size={size} {...props} />
  )
);
```

## Props

Every icon accepts:

| Prop       | Type                            | Default | Description                             |
| ---------- | ------------------------------- | ------- | --------------------------------------- |
| `size`     | `number \| string`              | `24`    | Width and height, in pixels or any CSS length |
| `title`    | `string`                        | -       | Accessible label. Sets `role="img"` and `aria-label`; omit for decorative icons |
| `...props` | `React.SVGProps<SVGSVGElement>` | -       | Any standard SVG prop (`className`, `style`, `fill`, `stroke`, `onClick`, `aria-*`, `role`, `ref`, and so on) |

## API

```ts
import {
  CautionIcon,      // ...and every other named icon component
  icons,            // Record<string, IconComponent> of all components, keyed by PascalCase name
  ICON_NAMES,       // { CAUTION: "caution", BATCH_CODE: "batch-code", ... } kebab-case slugs
  IconName,         // union type of every icon slug
  IconProps,        // component props interface (extends React.SVGProps with size)
} from "medical-device-symbols";
```

## Regulatory compliance

All symbols follow **ISO 15223-1:2021** (Medical devices, symbols to be used with information to be supplied by the manufacturer). That standard is recognized or referenced by regulatory frameworks worldwide, including:

- **European Union**: EU MDR 2017/745 and EU IVDR 2017/746
- **United States**: FDA 21 CFR Part 801
- **Canada**: Medical Devices Regulations (SOR/98-282)
- **Japan, Brazil, China, South Korea, Australia**: PMD Act, ANVISA, NMPA, MFDS, and TGA requirements

These symbols are provided for development and informational use. Always confirm the exact symbol, form, and usage required by the current regulations in your target markets, and consult a regulatory expert for official labeling.

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for how to add or update symbols.

## License

MIT © [Taig Mac Carthy](https://github.com/t4dhg)

## Support

- 🐛 [Report an issue](https://github.com/t4dhg/medical-device-symbols/issues)
- 💬 [Start a discussion](https://github.com/t4dhg/medical-device-symbols/discussions)
- 📖 [Browse the source and examples on GitHub](https://github.com/t4dhg/medical-device-symbols)
