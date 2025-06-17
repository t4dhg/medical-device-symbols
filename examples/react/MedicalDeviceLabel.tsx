import React from "react";
import {
  CautionIcon,
  CeIcon,
  ManufacturerIcon,
  ManufactureDateIcon,
  LotIcon,
} from "medical-device-symbols";
import "./MedicalDeviceLabel.css";

const MedicalDeviceLabel: React.FC = () => {
  return (
    <div className="medical-device-label">
      <h2>Medical Device Label</h2>

      <div className="label-section">
        <div className="label-row">
          <div className="icon-container">
            <CautionIcon className="mdr-icon warning" size={24} />
            <span>Read instructions before use</span>
          </div>
        </div>

        <div className="label-row">
          <div className="icon-container">
            <CeIcon className="mdr-icon" size={24} />
            <span>CE 0123</span>
          </div>
        </div>

        <div className="label-row">
          <div className="icon-container">
            <ManufacturerIcon className="mdr-icon" size={24} />
            <span>ACME Medical Devices Ltd.</span>
          </div>
        </div>

        <div className="label-row">
          <div className="icon-container">
            <ManufactureDateIcon className="mdr-icon" size={24} />
            <span>2024-06</span>
          </div>
        </div>

        <div className="label-row">
          <div className="icon-container">
            <LotIcon className="mdr-icon" size={24} />
            <span>LOT: ABC123456</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MedicalDeviceLabel;
