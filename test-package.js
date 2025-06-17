// Test script to verify the package works correctly
const {
  CautionIcon,
  ManufacturerIcon,
  icons,
  ICON_NAMES,
} = require("./lib/index.js");

console.log("✅ Testing medical-device-symbols package...\n");

// Test 1: Check if components are exported
console.log("📦 Checking component exports:");
console.log("  CautionIcon:", typeof CautionIcon);
console.log("  ManufacturerIcon:", typeof ManufacturerIcon);

// Test 2: Check icons object
console.log("\n📋 Checking icons object:");
console.log("  Icons count:", Object.keys(icons).length);
console.log("  First few icons:", Object.keys(icons).slice(0, 5));

// Test 3: Check ICON_NAMES constants
console.log("\n🏷️  Checking ICON_NAMES:");
console.log("  Constants count:", Object.keys(ICON_NAMES).length);
console.log("  Sample constants:", Object.keys(ICON_NAMES).slice(0, 5));

// Test 4: Verify all expected icons are present
const expectedIcons = [
  "CautionIcon",
  "ManufacturerIcon",
  "CeIcon",
  "BatchCodeIcon",
  "SterileIcon",
];

console.log("\n🔍 Checking expected icons:");
expectedIcons.forEach((iconName) => {
  const exists = icons.hasOwnProperty(iconName);
  console.log(`  ${iconName}: ${exists ? "✅" : "❌"}`);
});

console.log("\n🎉 Package test completed!");
console.log(
  `\n📊 Summary: ${Object.keys(icons).length} total icon components available`
);
