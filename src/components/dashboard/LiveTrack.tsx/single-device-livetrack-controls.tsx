import React from "react";
import { VehicleData } from "./SingleDeviceLiveTrack";

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
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>

      {/* Traffic Toggle Button */}
      <button
        onClick={() => setShowTraffic(!showTraffic)}
        className={`p-3 rounded-lg shadow-lg transition-all duration-200 ${
          showTraffic
            ? "bg-orange-500 text-white hover:bg-orange-600"
            : "bg-white text-gray-700 hover:bg-gray-100"
        }`}
        title={showTraffic ? "Hide Traffic" : "Show Traffic"}
      >
        <svg
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
        </svg>
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
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
          />
        </svg>
        {geofenceCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center font-bold shadow-md">
            {geofenceCount}
          </span>
        )}
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
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {isDrawingGeofence ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          )}
        </svg>
      </button>
    </div>
  );
};
