import {
  FaStreetView,
  FaSatellite,
  FaMap,
  FaCrosshairs,
  FaTrafficLight,
} from "react-icons/fa";
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

  const buttonBaseClass =
    "w-11 h-11 flex items-center justify-center rounded-lg shadow-lg hover:shadow-xl active:scale-95 transition-all duration-200";

  return (
    <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2.5 p-2 bg-white rounded-xl shadow-2xl">
      <button
        onClick={onCenterToVehicle}
        title={`Center on ${vehicle.name}`}
        className={`${buttonBaseClass} bg-blue-500 text-white hover:bg-blue-600 cursor-pointer`}
      >
        <FaCrosshairs
          size={18}
          className="hover:rotate-90 transition-transform duration-300"
        />
      </button>

      <button
        onClick={onSatelliteToggle}
        title={
          isSatelliteView ? "Switch to Street View" : "Switch to Satellite View"
        }
        className={`${buttonBaseClass} ${
          isSatelliteView
            ? "bg-emerald-500 text-white hover:bg-emerald-600"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
        } cursor-pointer`}
      >
        {isSatelliteView ? <FaMap size={18} /> : <FaSatellite size={18} />}
      </button>

      <button
        onClick={() => setShowTraffic(!showTraffic)}
        title="Toggle Traffic View"
        className={`${buttonBaseClass} ${
          showTraffic
            ? "bg-amber-400 text-gray-900 hover:bg-amber-500"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
        } cursor-pointer`}
      >
        <FaTrafficLight size={18} />
      </button>

      <div className="h-px bg-gray-200 my-0.5" />

      <a
        href={`http://maps.google.com/maps?q=&layer=c&cbll=${vehicle.latitude},${vehicle.longitude}&cbp=11,0,0,0,0`}
        target="_blank"
        rel="noopener noreferrer"
        title="Open Street View"
        className={`${buttonBaseClass} bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer`}
      >
        <FaStreetView size={18} />
      </a>
    </div>
  );
};
