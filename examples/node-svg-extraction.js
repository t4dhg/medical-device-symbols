/**
 * Node.js example for accessing SVG content directly
 *
 * NOTE: This is NOT the recommended way to use this package.
 * The package is designed for React applications.
 *
 * If you need SVG strings in Node.js, you can access them like this,
 * but you lose all the benefits of React components.
 */

const React = require("react");
const ReactDOMServer = require("react-dom/server");

// Import the React components
const {
  CautionIcon,
  CeIcon,
  ManufacturerIcon,
  BatchCodeIcon,
  SterileIcon,
  LiquidFilterWithPoreSizeIcon,
} = require("medical-device-symbols");

console.log("Medical Device Symbols - Node.js SVG String Extraction\n");

// Function to render React component to SVG string
function renderIconToSVG(IconComponent, props = {}) {
  try {
    const element = React.createElement(IconComponent, props);
    return ReactDOMServer.renderToStaticMarkup(element);
  } catch (error) {
    console.error("Error rendering icon:", error.message);
    return null;
  }
}

// Test basic component access
console.log("1. Testing component access:");
console.log(`CautionIcon: ${typeof CautionIcon}`);
console.log(`CautionIcon.displayName: ${CautionIcon.displayName}`);
console.log(`BatchCodeIcon: ${typeof BatchCodeIcon}`);
console.log(
  `LiquidFilterWithPoreSizeIcon: ${typeof LiquidFilterWithPoreSizeIcon}`,
);

console.log("\n2. Attempting to render to SVG string...");
const cautionSVG = renderIconToSVG(CautionIcon, {
  size: 48,
  title: "Caution",
  role: "img",
  color: "red",
});
const batchCodeSVG = renderIconToSVG(BatchCodeIcon, {
  size: 32,
  "aria-hidden": "true",
});

if (cautionSVG) {
  console.log("✅ CautionIcon SVG successfully generated!");
  console.log(`Length: ${cautionSVG.length} characters`);
  console.log(`Preview: ${cautionSVG.substring(0, 100)}...`);

  if (batchCodeSVG) {
    console.log("\n✅ BatchCodeIcon SVG successfully generated!");
    console.log(`Length: ${batchCodeSVG.length} characters`);
  }
} else {
  console.log("❌ SVG rendering failed");
  console.log("\n💡 ALTERNATIVE APPROACHES:");
  console.log("1. Use this package in a React application (recommended)");
  console.log("2. Use a different icon library designed for Node.js");
}

console.log("\n⚠️  IMPORTANT:");
console.log("This package is optimized for React applications.");
console.log("For React apps, simply use: <CautionIcon size={48} />");
console.log("\n📖 See examples/react/ for proper React usage.");
