#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

console.log("Starting icon generation script...");

// Convert kebab-case to PascalCase for component names
function kebabToPascalCase(str) {
  const pascalCase =
    str
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join("") + "Icon";

  // If it starts with a number, prefix with Icon
  return /^\d/.test(pascalCase) ? "Icon" + pascalCase : pascalCase;
}

// Convert kebab-case to valid variable name
function kebabToVariableName(str) {
  const cleaned = str.replace(/-/g, "");
  // If it starts with a number, prefix with underscore
  return /^\d/.test(cleaned) ? "_" + cleaned : cleaned;
}

// Convert kebab-case to valid constant name
function kebabToConstantName(str) {
  const upperCase = str.toUpperCase().replace(/-/g, "_");
  // If it starts with a number, prefix with underscore
  return /^\d/.test(upperCase) ? "_" + upperCase : upperCase;
}

// Clean SVG content by removing XML declaration, comments, and unnecessary attributes
function cleanSvgContent(svgContent) {
  let viewBox = "0 0 200 200"; // Default viewBox

  const cleaned = svgContent
    // Remove XML declaration
    .replace(/<\?xml[^>]*\?>/g, "")
    // Remove comments
    .replace(/<!--[\s\S]*?-->/g, "")
    // Extract viewBox before removing svg tags
    .replace(/<svg[^>]*viewBox="([^"]*)"[^>]*>/g, (match, extractedViewBox) => {
      viewBox = extractedViewBox;
      return "";
    })
    // Remove any remaining svg opening tags
    .replace(/<svg[^>]*>/g, "")
    .replace(/<\/svg>/g, "")
    // Remove style tags and their content
    .replace(/<style[\s\S]*?<\/style>/g, "")
    // Remove defs if they only contain styles
    .replace(/<defs>\s*<\/defs>/g, "")
    // Clean up extra whitespace
    .trim();

  return { content: cleaned, viewBox };
}

// Read all SVG files from src/icons directory
const iconsDir = path.join(__dirname, "../src/icons");
const svgFiles = fs
  .readdirSync(iconsDir)
  .filter((file) => file.endsWith(".svg"));

console.log(`Found ${svgFiles.length} SVG files`);

// Generate the TypeScript content
let indexContent = `import React from "react";

// Base icon component interface
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

// Base icon component factory
const createIcon = (
  displayName: string,
  svgContent: string,
  viewBox: string = "0 0 24 24"
) => {
  const IconComponent = React.forwardRef<SVGSVGElement, IconProps>(
    ({ size = 24, ...props }, ref) => {
      return React.createElement("svg", {
        ref,
        width: size,
        height: size,
        viewBox,
        fill: "currentColor",
        xmlns: "http://www.w3.org/2000/svg",
        ...props,
        dangerouslySetInnerHTML: { __html: svgContent },
      });
    }
  );

  IconComponent.displayName = displayName;
  return IconComponent;
};

`;

// Store icon data for later exports
const iconData = [];

// Process each SVG file
svgFiles.forEach((file) => {
  const iconName = path.basename(file, ".svg");
  const componentName = kebabToPascalCase(iconName);
  const svgPath = path.join(iconsDir, file);
  const svgContent = fs.readFileSync(svgPath, "utf8");

  console.log(`Processing ${file}...`);

  // Clean the SVG content
  const { content: cleanedContent, viewBox } = cleanSvgContent(svgContent);

  // Escape backticks and other special characters
  const escapedContent = cleanedContent
    .replace(/`/g, "\\`")
    .replace(/\$\{/g, "\\${");

  // Add SVG content constant
  indexContent += `// SVG content for ${iconName}\n`;
  indexContent += `const ${kebabToVariableName(
    iconName
  )}SvgContent = \`${escapedContent}\`;\n\n`;

  iconData.push({
    iconName,
    componentName,
    variableName: kebabToVariableName(iconName),
    constantName: kebabToConstantName(iconName),
    viewBox,
  });
});

// Generate icon component exports
indexContent += "// Icon components\n";
iconData.forEach(({ iconName, componentName, variableName, viewBox }) => {
  indexContent += `export const ${componentName} = createIcon(\n`;
  indexContent += `  "${componentName}",\n`;
  indexContent += `  ${variableName}SvgContent,\n`;
  indexContent += `  "${viewBox}"\n`;
  indexContent += `);\n\n`;
});

// Generate the icons object export
indexContent += "// Export all icons in an object for compatibility\n";
indexContent += "export const icons = {\n";
iconData.forEach(({ componentName }) => {
  indexContent += `  ${componentName},\n`;
});
indexContent += "};\n\n";

// Generate individual icon name constants
indexContent += "// Icon name constants\n";
indexContent += "export const ICON_NAMES = {\n";
iconData.forEach(({ iconName, constantName }) => {
  indexContent += `  ${constantName}: "${iconName}",\n`;
});
indexContent += "} as const;\n\n";

// Generate type for icon names
indexContent += "// Type for icon names\n";
indexContent +=
  "export type IconName = typeof ICON_NAMES[keyof typeof ICON_NAMES];\n";

// Write the generated content to src/index.tsx
const outputPath = path.join(__dirname, "../src/index.tsx");
fs.writeFileSync(outputPath, indexContent);

console.log(`Generated index.tsx with ${iconData.length} icon components`);
console.log("Icon components generated:");
iconData.forEach(({ componentName, iconName }) => {
  console.log(`  - ${componentName} (from ${iconName}.svg)`);
});
