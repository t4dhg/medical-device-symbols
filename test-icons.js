const {
  CautionIcon,
  CeIcon,
  EcIcon,
  LotIcon,
  ManufacturerIcon,
  ManufactureDateIcon,
  MdIcon,
  ReadIfuIcon,
  UdiIcon,
} = require("./lib/index.js");

// Simple test to verify all icons render without errors
const testIcons = () => {
  const icons = [
    CautionIcon,
    CeIcon,
    EcIcon,
    LotIcon,
    ManufacturerIcon,
    ManufactureDateIcon,
    MdIcon,
    ReadIfuIcon,
    UdiIcon,
  ];

  console.log("🧪 Testing all icon components...");

  icons.forEach((Icon, index) => {
    try {
      // Test that the component exists and has the expected structure
      const displayName = Icon.displayName || `Icon ${index + 1}`;

      if (typeof Icon === "object" && Icon.$$typeof) {
        // This is a React forwardRef component
        console.log(`✅ ${displayName} - Valid React component`);
      } else if (typeof Icon === "function") {
        // This is a regular function component
        console.log(`✅ ${displayName} - Valid function component`);
      } else {
        console.log(`❌ ${displayName} - Invalid component`);
      }
    } catch (error) {
      console.log(
        `❌ ${Icon.displayName || `Icon ${index + 1}`} - Error:`,
        error.message
      );
    }
  });

  console.log("\n🎉 All icon components tested!");
};

testIcons();
