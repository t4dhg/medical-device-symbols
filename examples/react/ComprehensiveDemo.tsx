import React from "react";
import {
  CautionIcon,
  CeIcon,
  ManufacturerIcon,
  ManufactureDateIcon,
  BatchCodeIcon,
  SerialNumberIcon,
  SterileIcon,
  DoNotReUseIcon,
  ConsultInstructionsForUseIcon,
  LatexIcon,
  TemperatureLimitIcon,
  HumidityLimitationIcon,
  LiquidFilterWithPoreSizeIcon,
  InVitroDiagnosticMedicalDeviceIcon,
  NonPyrogenicIcon,
} from "medical-device-symbols";
import "./ComprehensiveDemo.css";

const ComprehensiveDemo: React.FC = () => {
  return (
    <div className="comprehensive-demo">
      <h1>Medical Device Symbols - Comprehensive Demo</h1>

      <section className="demo-section">
        <h2>🏥 Complete Medical Device Label</h2>
        <div className="medical-label">
          <div className="label-header">
            <h3>SterileMax™ Surgical Instrument</h3>
          </div>

          <div className="label-grid">
            <div className="label-item">
              <CautionIcon className="icon warning" size={24} />
              <span>Read instructions before use</span>
            </div>

            <div className="label-item">
              <CeIcon className="icon" size={24} />
              <span>CE 0123</span>
            </div>

            <div className="label-item">
              <ManufacturerIcon className="icon" size={24} />
              <span>MedTech Solutions Ltd.</span>
            </div>

            <div className="label-item">
              <ManufactureDateIcon className="icon" size={24} />
              <span>2024-06</span>
            </div>

            <div className="label-item">
              <BatchCodeIcon className="icon" size={24} />
              <span>LOT: SMX240615</span>
            </div>

            <div className="label-item">
              <SerialNumberIcon className="icon" size={24} />
              <span>SN: 1234567890</span>
            </div>

            <div className="label-item">
              <SterileIcon className="icon success" size={24} />
              <span>Sterile - EO</span>
            </div>

            <div className="label-item">
              <DoNotReUseIcon className="icon warning" size={24} />
              <span>Single use only</span>
            </div>
          </div>
        </div>
      </section>

      <section className="demo-section">
        <h2>🔬 Specialized Symbols</h2>
        <div className="specialized-grid">
          <div className="spec-item">
            <TemperatureLimitIcon className="icon info" size={32} />
            <h4>Temperature Limit</h4>
            <p>Store between 15-25°C</p>
          </div>

          <div className="spec-item">
            <HumidityLimitationIcon className="icon info" size={32} />
            <h4>Humidity Control</h4>
            <p>Keep dry, &lt; 60% RH</p>
          </div>

          <div className="spec-item">
            <LiquidFilterWithPoreSizeIcon className="icon info" size={32} />
            <h4>Filter Specifications</h4>
            <p>15 micron pore size</p>
          </div>

          <div className="spec-item">
            <InVitroDiagnosticMedicalDeviceIcon
              className="icon info"
              size={32}
            />
            <h4>IVD Device</h4>
            <p>For diagnostic use</p>
          </div>

          <div className="spec-item">
            <NonPyrogenicIcon className="icon success" size={32} />
            <h4>Non-Pyrogenic</h4>
            <p>Fever-free guarantee</p>
          </div>

          <div className="spec-item">
            <LatexIcon className="icon warning" size={32} />
            <h4>Latex Warning</h4>
            <p>Contains natural rubber</p>
          </div>
        </div>
      </section>

      <section className="demo-section">
        <h2>🎨 Styling Examples</h2>
        <div className="styling-examples">
          <div className="style-group">
            <h4>Size Variations</h4>
            <div className="size-demo">
              <CautionIcon size={16} />
              <CautionIcon size={24} />
              <CautionIcon size={32} />
              <CautionIcon size={48} />
              <CautionIcon size={64} />
            </div>
          </div>

          <div className="style-group">
            <h4>Color Variations</h4>
            <div className="color-demo">
              <CeIcon size={32} style={{ color: "#007bff" }} />
              <SterileIcon size={32} style={{ color: "#28a745" }} />
              <DoNotReUseIcon size={32} style={{ color: "#dc3545" }} />
              <CautionIcon size={32} style={{ color: "#ffc107" }} />
              <ManufacturerIcon size={32} style={{ color: "#6c757d" }} />
            </div>
          </div>

          <div className="style-group">
            <h4>Interactive Icons</h4>
            <div className="interactive-demo">
              <CautionIcon
                size={40}
                className="interactive-icon"
                onClick={() => alert("Caution: Read all instructions!")}
                style={{ cursor: "pointer" }}
              />
              <ConsultInstructionsForUseIcon
                size={40}
                className="interactive-icon"
                onClick={() => window.open("/instructions.pdf", "_blank")}
                style={{ cursor: "pointer" }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="demo-section">
        <h2>📋 All Available Icons</h2>
        <div className="all-icons-grid">
          <div className="icon-showcase">
            <CautionIcon size={24} />
            <span>CautionIcon</span>
          </div>
          <div className="icon-showcase">
            <CeIcon size={24} />
            <span>CeIcon</span>
          </div>
          <div className="icon-showcase">
            <ManufacturerIcon size={24} />
            <span>ManufacturerIcon</span>
          </div>
          <div className="icon-showcase">
            <ManufactureDateIcon size={24} />
            <span>ManufactureDateIcon</span>
          </div>
          <div className="icon-showcase">
            <BatchCodeIcon size={24} />
            <span>BatchCodeIcon</span>
          </div>
          <div className="icon-showcase">
            <SerialNumberIcon size={24} />
            <span>SerialNumberIcon</span>
          </div>
          <div className="icon-showcase">
            <SterileIcon size={24} />
            <span>SterileIcon</span>
          </div>
          <div className="icon-showcase">
            <DoNotReUseIcon size={24} />
            <span>DoNotReUseIcon</span>
          </div>
          <div className="icon-showcase">
            <ConsultInstructionsForUseIcon size={24} />
            <span>ConsultInstructionsForUseIcon</span>
          </div>
          <div className="icon-showcase">
            <LatexIcon size={24} />
            <span>LatexIcon</span>
          </div>
          <div className="icon-showcase">
            <TemperatureLimitIcon size={24} />
            <span>TemperatureLimitIcon</span>
          </div>
          <div className="icon-showcase">
            <HumidityLimitationIcon size={24} />
            <span>HumidityLimitationIcon</span>
          </div>
          <div className="icon-showcase">
            <LiquidFilterWithPoreSizeIcon size={24} />
            <span>LiquidFilterWithPoreSizeIcon</span>
          </div>
          <div className="icon-showcase">
            <InVitroDiagnosticMedicalDeviceIcon size={24} />
            <span>InVitroDiagnosticMedicalDeviceIcon</span>
          </div>
          <div className="icon-showcase">
            <NonPyrogenicIcon size={24} />
            <span>NonPyrogenicIcon</span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ComprehensiveDemo;
