import React from "react";

import { calculateTimeSince } from "@/util/calculateTimeSince";
import { VehicleData } from "./single-device-livetrack";
import { formatToIST, getStatusInfo } from "@/util/dateFormatters";

interface VehiclePopupContentProps {
  vehicle: VehicleData;
  vehicleStatus: string;
}

export const VehiclePopupContent: React.FC<VehiclePopupContentProps> = ({
  vehicle,
  vehicleStatus,
}) => {
  const formattedLastUpdate = formatToIST(vehicle.lastUpdate);
  const statusInfo = getStatusInfo(vehicleStatus);
  const isBle =
    vehicle.category === "BLE" || Boolean((vehicle as any).rawBleDevice);

  const rawBle = (vehicle as any).rawBleDevice;
  const childObj =
    typeof rawBle?.childId === "object"
      ? rawBle?.childId
      : typeof (vehicle as any).childId === "object"
      ? (vehicle as any).childId
      : null;
  const child =
    (vehicle as any).childName ||
    childObj?.childName;
  const school =
    (vehicle as any).schoolName ||
    (typeof rawBle?.schoolId === "object" ? rawBle?.schoolId?.schoolName : null);
  const branch =
    (vehicle as any).branchName ||
    (typeof rawBle?.branchId === "object" ? rawBle?.branchId?.branchName : null);

  const battery =
    (vehicle as any).batteryLevel ?? rawBle?.battery ?? 100;

  return (
    <div className="vehicle-popup-content">
      <div className="vehicle-header">
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {isBle && (
            <img
              src="/geotag-icon/crtag.png"
              alt="GeoTag"
              style={{ width: "22px", height: "22px", objectFit: "contain", flexShrink: 0 }}
            />
          )}
          <h3 className="vehicle-name">{vehicle.name}</h3>
        </div>
        <span
          className="status-badge"
          style={{ backgroundColor: statusInfo.color }}
        >
          {isBle ? (vehicle.status || "Active") : statusInfo.text}
        </span>
      </div>

      <div className="vehicle-details scrollable-details">
        {isBle ? (
          <>
            <div className="detail-row">
              <span className="label">Serial No:</span>
              <span className="value">
                {vehicle.uniqueId || (vehicle as any).sn || "N/A"}
              </span>
            </div>
            <div className="detail-row">
              <span className="label">Battery:</span>
              <span className="value font-bold text-green-600">{battery}%</span>
            </div>
            {child && (
              <div className="detail-row">
                <span className="label">Child:</span>
                <span className="value">{child}</span>
              </div>
            )}
            {school && (
              <div className="detail-row">
                <span className="label">School:</span>
                <span className="value">{school}</span>
              </div>
            )}
            {branch && (
              <div className="detail-row">
                <span className="label">Branch:</span>
                <span className="value">{branch}</span>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="detail-row">
              <span className="label">Speed:</span>
              <span className="value">
                {(vehicle.speed ?? 0).toFixed(2)} km/h
              </span>
            </div>
            <div className="detail-row">
              <span className="label">Speed Limit:</span>
              <span className="value">{vehicle.speedLimit || "60"}</span>
            </div>
            <div className="detail-row">
              <span className="label">Category:</span>
              <span className="value">{vehicle.category}</span>
            </div>
            <div className="detail-row">
              <span className="label">Mileage:</span>
              <span className="value">{vehicle.mileage || "0"}</span>
            </div>
            <div className="detail-row">
              <span className="label">Fuel Consumption:</span>
              <span className="value">{vehicle.fuelConsumption || "0"} L</span>
            </div>
            <div className="detail-row">
              <span className="label">Last Update:</span>
              <span className="value">{formattedLastUpdate}</span>
            </div>
            <div className="detail-row">
              <span className="label">Since:</span>
              <span className="value">
                {calculateTimeSince(vehicle.lastUpdate)}
              </span>
            </div>
            <div className="detail-row">
              <span className="label">Today's Distance:</span>
              <span className="value">
                {vehicle.attributes?.todayDistance ?? 0} km
              </span>
            </div>
            <div className="detail-row">
              <span className="label">Network:</span>
              <span
                className={`value ${vehicle.gsmSignal ? "online" : "offline"}`}
              >
                {vehicle.gsmSignal ? "Online" : "Offline"}
              </span>
            </div>
          </>
        )}
      </div>

      <div className="vehicle-coordinates">
        <small>
          📍 {(vehicle.latitude ?? 0).toFixed(6)}, {(vehicle.longitude ?? 0).toFixed(6)}
        </small>
      </div>
    </div>
  );
};
