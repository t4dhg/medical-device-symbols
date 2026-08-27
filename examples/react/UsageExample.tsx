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

        {/* Recoloring currentColor artwork */}
        <BatchCodeIcon size={32} color="red" />

        {/* Responsive sizing */}
        <CautionIcon size="2rem" />

        {/* Interactive icons belong inside native controls */}
        <button
          type="button"
          aria-label="Log the CE icon selection"
          onClick={() => console.log("CE icon clicked")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
            border: 0,
            background: "transparent",
            color: "inherit",
            cursor: "pointer",
          }}
        >
          <CeIcon size={40} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export default App;
