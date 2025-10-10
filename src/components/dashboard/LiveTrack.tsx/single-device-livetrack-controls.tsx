import React from "react";
import { VehicleData } from "./SingleDeviceLiveTrack";
import Image from "next/image";
import { MapPinned, Radius, Satellite } from "lucide-react";
import { FaStreetView } from "react-icons/fa";

interface SingleDeviceLiveTrackControlsProps {
  vehicle: VehicleData | null;
  onCenterToVehicle: () => void;
  isSatelliteView: boolean;
  onSatelliteToggle: () => void;
  showTraffic: boolean;
  setShowTraffic: (show: boolean) => void;
  isDrawingGeofence: boolean;
  onGeofenceToggle: () => void;
  showGeofences: boolean;
  onToggleGeofences: () => void;
  geofenceCount?: number;
}

export const SingleDeviceLiveTrackControls: React.FC<
  SingleDeviceLiveTrackControlsProps
> = ({
  vehicle,
  onCenterToVehicle,
  isSatelliteView,
  onSatelliteToggle,
  showTraffic,
  setShowTraffic,
  isDrawingGeofence,
  onGeofenceToggle,
  showGeofences,
  onToggleGeofences,
  geofenceCount = 0,
}) => {
  return (
    <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
      {/* Center to Vehicle Button */}
      <button
        onClick={onCenterToVehicle}
        disabled={!vehicle}
        className="p-3 bg-white rounded-lg shadow-lg hover:bg-gray-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Center on Vehicle"
      >
        <svg
          className="w-6 h-6 text-gray-700"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </button>

      {/* Satellite Toggle Button */}
      <button
        onClick={onSatelliteToggle}
        className={`p-3 rounded-lg shadow-lg transition-all duration-200 ${
          isSatelliteView
            ? "bg-blue-500 text-white hover:bg-blue-600"
            : "bg-white text-gray-700 hover:bg-gray-100"
        }`}
        title={isSatelliteView ? "Map View" : "Satellite View"}
      >
        <Satellite />
      </button>

      {/* Traffic Toggle Button */}
      <button
        onClick={() => setShowTraffic(!showTraffic)}
        className={`p-3 rounded-lg shadow-lg transition-all duration-200 ${
          showTraffic
            ? "bg-orange-500 text-white hover:bg-orange-600"
            : "bg-gray-700  hover:bg-gray-900"
        }`}
        title={showTraffic ? "Hide Traffic" : "Show Traffic"}
      >
        {/* <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg> */}
        <img
          src={"/icons/traffic.svg"}
          alt="traffic view"
          className="reverse"
        />
      </button>

      {/* Show/Hide Geofences Button */}
      <button
        onClick={onToggleGeofences}
        className={`p-3 rounded-lg shadow-lg transition-all duration-200 relative ${
          showGeofences
            ? "bg-green-500 text-white hover:bg-green-600"
            : "bg-white text-gray-700 hover:bg-gray-100"
        }`}
        title={showGeofences ? "Hide Geofences" : "Show Geofences"}
      >
        <Radius />
        {geofenceCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center font-bold shadow-md">
            {geofenceCount}
          </span>
        )}
      </button>

      <button
        onClick={onToggleGeofences}
        className={`p-3 rounded-lg shadow-lg transition-all duration-200 relative bg-white text-gray-700 hover:bg-gray-100 cursor-pointer`}
        title={showGeofences ? "Hide Geofences" : "Show Geofences"}
      >
        <a
          href={`http://maps.google.com/maps?q=&layer=c&cbll=${vehicle?.latitude},${vehicle?.longitude}&cbp=11,0,0,0,0`}
          target="_blank"
          rel="noopener noreferrer"
          title="Open Street View"
          className={` bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer`}
        >
          <FaStreetView size={18} />
        </a>
      </button>

      {/* Add Geofence Button */}
      <button
        onClick={onGeofenceToggle}
        className={`p-3 rounded-lg shadow-lg transition-all duration-200 ${
          isDrawingGeofence
            ? "bg-red-500 text-white hover:bg-red-600"
            : "bg-white text-gray-700 hover:bg-gray-100"
        }`}
        title={isDrawingGeofence ? "Cancel Geofence" : "Add Geofence"}
      >
        <MapPinned />
      </button>
    </div>
  );
};
