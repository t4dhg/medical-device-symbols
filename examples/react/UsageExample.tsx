import React from "react";
import {
  CautionIcon,
  CeIcon,
  ManufacturerIcon,
  BatchCodeIcon,
} from "medical-device-symbols";

// Example usage following the Sanity icons pattern
function App() {
  return (
    <div className="medical-device-label">
      <h2>Medical Device Label</h2>

      <div className="icon-grid">
        {/* Simple usage with default size */}
        <CautionIcon />

        {/* Custom size using the size prop */}
        <CeIcon size={48} />

        {/* Custom styling with style prop */}
        <ManufacturerIcon style={{ fontSize: 72, color: "blue" }} />

        {/* Using standard SVG props */}
        <BatchCodeIcon size={32} fill="red" stroke="black" strokeWidth={1} />

        {/* Responsive sizing */}
        <CautionIcon size="2rem" />

        {/* With click handler */}
        <CeIcon
          size={40}
          onClick={() => console.log("CE icon clicked")}
          style={{ cursor: "pointer" }}
        />
      </div>
    </div>
  );
}

export default App;
