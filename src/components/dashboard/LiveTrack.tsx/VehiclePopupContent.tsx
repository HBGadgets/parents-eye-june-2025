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

  return (
    <div className="vehicle-popup-content">
      <div className="vehicle-header">
        <h3 className="vehicle-name">{vehicle.name}</h3>
        <span
          className="status-badge"
          style={{ backgroundColor: statusInfo.color }}
        >
          {statusInfo.text}
        </span>
      </div>

      <div className="vehicle-details scrollable-details">
        <div className="detail-row">
          <span className="label">Speed:</span>
          <span className="value">{vehicle.speed.toFixed(2)} km/h</span>
        </div>
        <div className="detail-row">
          <span className="label">Speed Limit:</span>
          <span className="value">{vehicle.speedLimit}</span>
        </div>
        <div className="detail-row">
          <span className="label">Category:</span>
          <span className="value">{vehicle.category}</span>
        </div>
        <div className="detail-row">
          <span className="label">Mileage:</span>
          <span className="value">{vehicle.mileage}</span>
        </div>
        <div className="detail-row">
          <span className="label">Fuel Consumption:</span>
          <span className="value">{vehicle.fuelConsumption} L</span>
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
          <span className="value">{vehicle.attributes.todayDistance} km</span>
        </div>
        <div className="detail-row">
          <span className="label">Network:</span>
          <span className={`value ${vehicle.gsmSignal ? "online" : "offline"}`}>
            {vehicle.gsmSignal ? "Online" : "Offline"}
          </span>
        </div>
      </div>

      <div className="vehicle-coordinates">
        <small>
          📍 {vehicle.latitude.toFixed(6)}, {vehicle.longitude.toFixed(6)}
        </small>
      </div>
    </div>
  );
};
