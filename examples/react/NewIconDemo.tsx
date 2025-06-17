import React from "react";
import { CeBsiIcon, CeIcon, MdIcon } from "medical-device-symbols";

/**
 * Demonstration of the new CE-BSI icon alongside related regulatory icons
 */
export default function NewIconDemo() {
  return (
    <div
      style={{
        padding: "20px",
        fontFamily: "Arial, sans-serif",
        maxWidth: "600px",
        margin: "0 auto",
      }}
    >
      <h1>New CE-BSI Icon Demo</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "20px",
          marginTop: "20px",
        }}
      >
        <div
          style={{
            textAlign: "center",
            padding: "20px",
            border: "1px solid #ddd",
            borderRadius: "8px",
            backgroundColor: "#f9f9f9",
          }}
        >
          <CeBsiIcon size={48} />
          <p style={{ marginTop: "10px", fontWeight: "bold" }}>CE-BSI</p>
          <p style={{ fontSize: "12px", color: "#666" }}>
            New BSI notified body marking
          </p>
        </div>

        <div
          style={{
            textAlign: "center",
            padding: "20px",
            border: "1px solid #ddd",
            borderRadius: "8px",
          }}
        >
          <CeIcon size={48} />
          <p style={{ marginTop: "10px", fontWeight: "bold" }}>CE</p>
          <p style={{ fontSize: "12px", color: "#666" }}>European Conformity</p>
        </div>

        <div
          style={{
            textAlign: "center",
            padding: "20px",
            border: "1px solid #ddd",
            borderRadius: "8px",
          }}
        >
          <MdIcon size={48} />
          <p style={{ marginTop: "10px", fontWeight: "bold" }}>MD</p>
          <p style={{ fontSize: "12px", color: "#666" }}>Medical Device</p>
        </div>
      </div>

      <div
        style={{
          marginTop: "30px",
          padding: "20px",
          backgroundColor: "#e8f5e8",
          borderRadius: "8px",
        }}
      >
        <h3>Usage Example</h3>
        <pre
          style={{
            backgroundColor: "#f4f4f4",
            padding: "15px",
            borderRadius: "4px",
            overflow: "auto",
            fontSize: "14px",
          }}
        >
          {`import { CeBsiIcon } from "medical-device-symbols";

function MyLabel() {
  return (
    <div>
      <CeBsiIcon size={32} />
      <span>BSI Notified Body</span>
    </div>
  );
}`}
        </pre>
      </div>
    </div>
  );
}
