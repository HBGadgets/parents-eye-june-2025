import { VehicleData } from "./single-device-livetrack";

export const SingleDeviceLiveTrackControls = ({
  vehicle,
  onCenterToVehicle,
  isSatelliteView,
  onSatelliteToggle,
  showTraffic,
  setShowTraffic,
}: {
  vehicle: VehicleData | null;
  onCenterToVehicle: () => void;
  isSatelliteView: boolean;
  onSatelliteToggle: () => void;
  showTraffic: boolean;
  setShowTraffic: (show: boolean) => void;
}) => {
  if (!vehicle) return null;

  return (
    <div className="absolute top-2.5 right-2.5 z-[1000] flex flex-col gap-2.5 min-w-[100px]">
      <button
        className="bg-white border-2 border-gray-300 rounded px-3 py-2 cursor-pointer flex items-center gap-1.5 text-sm font-medium shadow-md transition-all duration-200 hover:bg-gray-50 hover:border-gray-400 hover:shadow-lg active:translate-y-0.5 active:shadow-sm whitespace-nowrap"
        onClick={onCenterToVehicle}
        title={`Center on ${vehicle.name}`}
      >
        <span className="text-lg leading-none">🎯</span>
        <span className="font-sans">Center Vehicle</span>
      </button>

      <button
        className={`bg-white border-2 rounded px-3 py-2 cursor-pointer flex items-center gap-1.5 text-sm font-medium shadow-md transition-all duration-200 hover:shadow-lg active:translate-y-0.5 active:shadow-sm whitespace-nowrap ${
          isSatelliteView
            ? "bg-green-50 border-green-500 hover:bg-green-100"
            : "border-gray-300 hover:bg-gray-50 hover:border-gray-400"
        }`}
        onClick={onSatelliteToggle}
        title={
          isSatelliteView ? "Switch to Street View" : "Switch to Satellite View"
        }
      >
        <span className="text-lg leading-none">
          {isSatelliteView ? "🗺️" : "🛰️"}
        </span>
        <span className="font-sans">
          {isSatelliteView ? "Street" : "Satellite"}
        </span>
      </button>
      {/* Traffic Layer */}
      <button
        onClick={() => setShowTraffic(!showTraffic)}
        className={`${
          showTraffic ? `bg-[#f3c623]` : "bg-gray-50"
        } border-2 border-gray-300 rounded px-3 py-2 cursor-pointer flex items-center gap-1.5 text-sm text-black font-medium shadow-md transition-all duration-200 hover:bg-gray-50 hover:border-gray-400 hover:shadow-lg active:translate-y-0.5 active:shadow-sm whitespace-nowrap`}
        title="Toggle Traffic View"
      >
        {showTraffic ? "🚦 Hide traffic view" : "🚦 Show traffic view"}
      </button>
    </div>
  );
};
