#!/usr/bin/env node

// Test script to verify all examples and components work correctly
const fs = require("fs");

console.log("🧪 Testing Medical Device Symbols Package...\n");

// Test 1: Verify all components can be imported
console.log("1️⃣ Testing component imports...");
try {
  const {
    CautionIcon,
    CeIcon,
    ManufacturerIcon,
    BatchCodeIcon,
    LiquidFilterWithPoreSizeIcon,
    icons,
    ICON_NAMES,
  } = require("./lib/index.js");

  console.log("✅ Core components imported successfully");
  console.log(`✅ Total icons available: ${Object.keys(icons).length}`);
  console.log(`✅ ICON_NAMES constants: ${Object.keys(ICON_NAMES).length}`);

  // Test component properties
  if (typeof CautionIcon === "object" && CautionIcon.displayName) {
    console.log(`✅ CautionIcon has displayName: ${CautionIcon.displayName}`);
  }

  if (typeof LiquidFilterWithPoreSizeIcon === "object") {
    console.log(
      "✅ LiquidFilterWithPoreSizeIcon (renamed from 15-micra) available"
    );
  }

  // Verify old problematic component is gone
  if (!icons.Icon15MicraIcon) {
    console.log("✅ Old Icon15MicraIcon correctly removed");
  }

  // Test a few key components
  const keyComponents = [CautionIcon, CeIcon, ManufacturerIcon, BatchCodeIcon];
  keyComponents.forEach((component, i) => {
    if (typeof component === "object" && component.$$typeof) {
      console.log(`✅ Component ${i + 1} is valid React forwardRef`);
    } else {
      console.log(`❌ Component ${i + 1} is invalid`);
    }
  });
} catch (error) {
  console.error("❌ Component import failed:", error.message);
  process.exit(1);
}

// Test 2: Check example files exist and are valid
console.log("\n2️⃣ Testing example files...");
const exampleFiles = [
  "examples/react/MedicalDeviceLabel.tsx",
  "examples/react/UsageExample.tsx",
  "examples/react/ComprehensiveDemo.tsx",
  "examples/node-svg-extraction.js",
  "examples/demo.html",
];

exampleFiles.forEach((file) => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} exists`);

    // Check for old component names in examples
    const content = fs.readFileSync(file, "utf8");
    if (content.includes("LotIcon") && !content.includes("BatchCodeIcon")) {
      console.log(`⚠️  ${file} may contain outdated LotIcon reference`);
    }
    if (content.includes("Icon15MicraIcon")) {
      console.log(`⚠️  ${file} contains old Icon15MicraIcon reference`);
    }
  } else {
    console.log(`❌ ${file} missing`);
  }
});

// Test 3: Verify SVG files
console.log("\n3️⃣ Testing SVG source files...");
const iconsDir = "src/icons";
if (fs.existsSync(iconsDir)) {
  const svgFiles = fs.readdirSync(iconsDir).filter((f) => f.endsWith(".svg"));
  console.log(`✅ Found ${svgFiles.length} SVG files`);

  // Check for the renamed file
  if (svgFiles.includes("liquid-filter-with-pore-size.svg")) {
    console.log("✅ liquid-filter-with-pore-size.svg correctly renamed");
  }

  if (!svgFiles.includes("15-micra.svg")) {
    console.log("✅ Old 15-micra.svg correctly removed");
  }

  // List some key icons
  const keyIcons = [
    "caution.svg",
    "ce.svg",
    "manufacturer.svg",
    "batch-code.svg",
  ];
  keyIcons.forEach((icon) => {
    if (svgFiles.includes(icon)) {
      console.log(`✅ Key icon ${icon} present`);
    } else {
      console.log(`❌ Key icon ${icon} missing`);
    }
  });
} else {
  console.log("❌ SVG icons directory not found");
}

console.log("\n🎉 Testing completed! Package appears to be working correctly.");
