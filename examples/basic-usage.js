/**
 * ⚠️  API CHANGE NOTICE ⚠️
 *
 * This example is no longer applicable as of v2.0.0
 *
 * The package has been transformed from a function-based API to React components.
 *
 * OLD API (no longer available):
 * const { getIcon, ICON_NAMES } = require('mdr-label-icons')
 * const svg = getIcon(ICON_NAMES.CAUTION)
 *
 * NEW API (React components):
 * import { CautionIcon } from 'mdr-label-icons'
 * <CautionIcon size={48} />
 *
 * For React usage examples, see:
 * - examples/react/NewUsageExample.tsx
 * - examples/demo.html
 * - README.md
 *
 * This file is kept for reference but will not work with the current version.
 */

console.log("🏥 MDR Label Icons - API Change Notice\n");
console.log("❌ This example is outdated and no longer works.");
console.log("✅ The package now uses React components instead of functions.");
console.log("\nNew usage:");
console.log("import { CautionIcon, CeIcon } from 'mdr-label-icons'");
console.log("<CautionIcon size={48} />");
console.log("\n📖 See examples/react/ for working examples.");

// Attempting to use old API will fail:
try {
  const { getIcon } = require("../lib/index.js");
  console.log("\n❌ getIcon function:", typeof getIcon);
} catch (error) {
  console.log("\n❌ Old API no longer available:", error.message);
}
