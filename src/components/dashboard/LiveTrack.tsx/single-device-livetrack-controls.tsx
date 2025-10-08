import {
  FaStreetView,
  FaSatellite,
  FaMap,
  FaCrosshairs,
  FaTrafficLight,
  FaDrawPolygon,
} from "react-icons/fa";
import { VehicleData } from "./single-device-livetrack";

export const SingleDeviceLiveTrackControls = ({
  vehicle,
  onCenterToVehicle,
  isSatelliteView,
  onSatelliteToggle,
  showTraffic,
  setShowTraffic,
  isDrawingGeofence,
  onGeofenceToggle,
}: {
  vehicle: VehicleData | null;
  onCenterToVehicle: () => void;
  isSatelliteView: boolean;
  onSatelliteToggle: () => void;
  showTraffic: boolean;
  setShowTraffic: (show: boolean) => void;
  isDrawingGeofence: boolean;
  onGeofenceToggle: () => void;
}) => {
  if (!vehicle) return null;

  const buttonBaseClass =
    "w-11 h-11 flex items-center justify-center rounded-lg shadow-lg hover:shadow-xl active:scale-95 transition-all duration-200";

  return (
    <div className="absolute top-4 right-4 flex flex-col gap-3 z-[1000]">
      {/* Center to Vehicle */}
      <button
        onClick={onCenterToVehicle}
        className={`${buttonBaseClass} bg-white text-gray-700 hover:bg-gray-50`}
        title="Center to Vehicle"
      >
        <FaCrosshairs className="text-lg" />
      </button>

      {/* Satellite/Map Toggle */}
      <button
        onClick={onSatelliteToggle}
        className={`${buttonBaseClass} ${
          isSatelliteView
            ? "bg-blue-500 text-white"
            : "bg-white text-gray-700 hover:bg-gray-50"
        }`}
        title={isSatelliteView ? "Map View" : "Satellite View"}
      >
        {isSatelliteView ? (
          <FaMap className="text-lg" />
        ) : (
          <FaSatellite className="text-lg" />
        )}
      </button>

      {/* Traffic Toggle */}
      <button
        onClick={() => setShowTraffic(!showTraffic)}
        className={`${buttonBaseClass} ${
          showTraffic
            ? "bg-orange-500 text-white"
            : "bg-white text-gray-700 hover:bg-gray-50"
        }`}
        title={showTraffic ? "Hide Traffic" : "Show Traffic"}
      >
        <FaTrafficLight className="text-lg" />
      </button>

      {/* Create Geofence Button */}
      <button
        onClick={onGeofenceToggle}
        className={`${buttonBaseClass} ${
          isDrawingGeofence
            ? "bg-red-500 text-white"
            : "bg-white text-gray-700 hover:bg-gray-50"
        }`}
        title={isDrawingGeofence ? "Cancel Geofence" : "Create Geofence"}
      >
        <FaDrawPolygon className="text-lg" />
      </button>
    </div>
  );
};
