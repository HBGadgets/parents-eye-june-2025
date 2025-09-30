import React, {
  useEffect,
  useRef,
  useMemo,
  useCallback,
  useState,
  useLayoutEffect,
} from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../VehicleMap.css";
import { calculateTimeSince } from "@/util/calculateTimeSince";

// Types based on your socket response - kept the same
interface VehicleData {
  speed: number;
  longitude: number;
  latitude: number;
  course: number;
  deviceId: number;
  imei: string;
  attributes: {
    charge: boolean;
    ignition: boolean;
    motion: boolean;
    sat: number;
    distance: number;
    totalDistance: number;
    todayDistance: number;
  };
  gsmSignal: number;
  category: string;
  status: string;
  lastUpdate: string;
  name: string;
  TD: number;
  mileage: string;
  speedLimit: string;
  fuelConsumption: string;
  matchesSearch: boolean;
}

// Updated props interface for single device
interface SingleDeviceLiveTrackProps {
  vehicle: VehicleData | null;
  center?: [number, number];
  zoom?: number;
  height?: string;
  onVehicleClick?: (vehicle: VehicleData) => void;
  autoCenter?: boolean;
  showTrail?: boolean;
}

// Optimized marker component with CONTROLLED ANIMATION
const SingleVehicleMarker = React.memo(
  ({
    vehicle,
    onClick,
  }: {
    vehicle: VehicleData;
    onClick?: (vehicle: VehicleData) => void;
  }) => {
    const markerRef = useRef<L.Marker | null>(null);
    const prevPositionRef = useRef<[number, number] | null>(null);
    const isZoomingRef = useRef(false);

    // Vehicle status calculation (keep your existing logic)
    const vehicleStatus = useMemo(() => {
      const lastUpdateTime = new Date(vehicle.lastUpdate).getTime();
      const currentTime = new Date().getTime();
      const timeDifference = currentTime - lastUpdateTime;
      const thirtyFiveHoursInMs = 35 * 60 * 60 * 1000;

      if (timeDifference > thirtyFiveHoursInMs) return "inactive";

      const speedLimit = parseFloat(vehicle.speedLimit) || 60;
      if (vehicle.speed > speedLimit) return "overspeeding";

      const runningConditions = [
        vehicle.speed > 5,
        vehicle.attributes.motion === true,
        vehicle.attributes.ignition === true,
      ];
      const idleConditions = [
        vehicle.speed < 5,
        vehicle.attributes.motion === false,
        vehicle.attributes.ignition === true,
      ];
      const stoppedConditions = [
        vehicle.speed < 5,
        vehicle.attributes.motion === false,
        vehicle.attributes.ignition === false,
      ];

      const trueConditionsCount = runningConditions.filter(Boolean).length;
      const trueIdleConditionsCount = idleConditions.filter(Boolean).length;
      const trueStoppedConditionsCount =
        stoppedConditions.filter(Boolean).length;

      if (trueStoppedConditionsCount >= 2) return "stopped";
      if (trueConditionsCount >= 2) return "running";
      if (trueIdleConditionsCount >= 2) return "idle";
      return "noData";
    }, [
      vehicle.speed,
      vehicle.speedLimit,
      vehicle.lastUpdate,
      vehicle.attributes.motion,
      vehicle.attributes.ignition,
    ]);

    const imageUrl = useMemo(() => {
      const statusToImageUrl = {
        running: "/bus/top-view/green-top.png",
        idle: "/bus/top-view/yellow-top.png",
        stopped: "/bus/top-view/red-top.png",
        inactive: "/bus/top-view/grey-top.png",
        overspeeding: "/bus/top-view/orange-top.png",
        noData: "/bus/top-view/blue-top.png",
      };
      return statusToImageUrl[vehicleStatus] || statusToImageUrl.inactive;
    }, [vehicleStatus]);

    const busIcon = useMemo(() => {
      const rotationAngle = vehicle.course || 0;
      const markerSize = 200;

      return L.divIcon({
        html: `
          <div class="single-vehicle-marker-container">
            <img 
              src="${imageUrl}" 
              class="vehicle-marker-img"
              style="
                transform: rotate(${rotationAngle - 90}deg);
                width: ${markerSize}px;
                height: ${markerSize}px;
                transform-origin: center center;
                filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
              " 
              alt="Vehicle marker"
            />
          </div>
        `,
        // Don't add smooth-marker class here - we'll control it with JavaScript
        className: "custom-single-vehicle-marker",
        iconSize: [markerSize, markerSize],
        iconAnchor: [markerSize / 2, markerSize / 2],
        popupAnchor: [0, -(markerSize / 2)],
      });
    }, [imageUrl, vehicle.course]);

    // NEW: Smooth position update with transition control
    useEffect(() => {
      if (markerRef.current) {
        const newPosition: [number, number] = [
          vehicle.latitude,
          vehicle.longitude,
        ];
        const prevPosition = prevPositionRef.current;

        // Only update if position has changed
        if (
          !prevPosition ||
          prevPosition[0] !== newPosition[0] ||
          prevPosition[1] !== newPosition[1]
        ) {
          const markerElement = markerRef.current.getElement();

          if (markerElement && !isZoomingRef.current) {
            // Add smooth transition class ONLY for coordinate changes
            markerElement.classList.add("smooth-marker");

            // Update position
            markerRef.current.setLatLng(newPosition);
            prevPositionRef.current = newPosition;
            console.log(`[Marker] Updated position to:`, newPosition);
          } else if (markerElement) {
            // During zoom, update without transition
            markerRef.current.setLatLng(newPosition);
            prevPositionRef.current = newPosition;
          }
        }

        // Update icon for rotation changes
        markerRef.current.setIcon(busIcon);
      }
    }, [vehicle.latitude, vehicle.longitude, busIcon]);

    const handleClick = useCallback(() => {
      onClick?.(vehicle);
    }, [vehicle, onClick]);

    const formattedLastUpdate = useMemo(() => {
      const utcDate = new Date(vehicle.lastUpdate);
      const istDate = new Date(utcDate.getTime() + 5.5 * 60 * 60 * 1000);
      const day = istDate.getUTCDate().toString().padStart(2, "0");
      const month = (istDate.getUTCMonth() + 1).toString().padStart(2, "0");
      const year = istDate.getUTCFullYear();
      const hours = istDate.getUTCHours();
      const minutes = istDate.getUTCMinutes().toString().padStart(2, "0");
      const seconds = istDate.getUTCSeconds().toString().padStart(2, "0");
      const hour12 = hours % 12 || 12;
      const ampm = hours >= 12 ? "PM" : "AM";
      return `${day}/${month}/${year}, ${hour12}:${minutes}:${seconds} ${ampm}`;
    }, [vehicle.lastUpdate]);

    const statusInfo = useMemo(() => {
      const statusMap = {
        running: { text: "Running", color: "#28a745" },
        idle: { text: "Idle", color: "#ffc107" },
        stopped: { text: "Stopped", color: "#dc3545" },
        inactive: { text: "Inactive", color: "#666666" },
        overspeeding: { text: "Overspeeding", color: "#fd7e14" },
        noData: { text: "No Data", color: "#007bff" },
      };
      return statusMap[vehicleStatus] || statusMap.noData;
    }, [vehicleStatus]);

    return (
      <Marker
        ref={markerRef}
        position={[vehicle.latitude, vehicle.longitude]}
        icon={busIcon}
        eventHandlers={{
          click: handleClick,
        }}
      >
        <Popup maxWidth={290} className="vehicle-popup" maxHeight={300}>
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
                <span className="value">
                  {vehicle.attributes.todayDistance} km
                </span>
              </div>
              <div className="detail-row">
                <span className="label">Network:</span>
                <span
                  className={`value ${
                    vehicle.gsmSignal ? "online" : "offline"
                  }`}
                >
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
        </Popup>
      </Marker>
    );
  }
);

SingleVehicleMarker.displayName = "SingleVehicleMarker";

// Auto-center handler for single vehicle
const AutoCenterHandler = ({
  vehicle,
  autoCenter,
}: {
  vehicle: VehicleData | null;
  autoCenter: boolean;
}) => {
  const map = useMap();
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    if (!vehicle || !autoCenter) return;

    // Auto-center on first load or when vehicle position changes significantly
    if (!hasInitialized) {
      map.setView([vehicle.latitude, vehicle.longitude], 15, {
        animate: true,
        duration: 1,
      });
      setHasInitialized(true);
      return;
    }

    // Follow vehicle movements with smooth animation
    const currentCenter = map.getCenter();
    const distance = map.distance(
      [currentCenter.lat, currentCenter.lng],
      [vehicle.latitude, vehicle.longitude]
    );

    // Only pan if vehicle has moved significantly (more than 50 meters)
    if (distance > 50) {
      map.panTo([vehicle.latitude, vehicle.longitude], {
        animate: true,
        duration: 0.5,
        easeLinearity: 0.1,
      });
    }
  }, [
    vehicle?.latitude,
    vehicle?.longitude,
    vehicle?.deviceId,
    autoCenter,
    map,
    hasInitialized,
  ]);

  return null;
};

// Container resize handler component - kept from original
const MapResizeHandler = () => {
  const map = useMap();

  useLayoutEffect(() => {
    const mapContainer = map.getContainer().parentElement;
    if (!mapContainer) return;

    const handleResize = () => {
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });

    resizeObserver.observe(mapContainer);
    return () => resizeObserver.disconnect();
  }, [map]);

  return null;
};

// Simplified map controls for single device
const SingleDeviceLiveTrackControls = ({
  vehicle,
  onCenterToVehicle,
}: {
  vehicle: VehicleData | null;
  onCenterToVehicle: () => void;
}) => {
  if (!vehicle) return null;

  return (
    <div className="map-controls">
      <button
        className="map-control-button center-vehicle-btn"
        onClick={onCenterToVehicle}
        title={`Center on ${vehicle.name}`}
      >
        <span className="control-icon">🎯</span>
        <span className="control-text">Center Vehicle</span>
      </button>
    </div>
  );
};

const SingleDeviceLiveTrack: React.FC<SingleDeviceLiveTrackProps> = ({
  vehicle,
  center = [21.99099777777778, 78.92973111111111],
  zoom = 10,
  height = "500px",
  onVehicleClick,
  autoCenter = false,
  showTrail = false,
}) => {
  const mapRef = useRef<L.Map | null>(null);

  // Validate vehicle data
  const isValidVehicle = useMemo(() => {
    return (
      vehicle &&
      vehicle.latitude &&
      vehicle.longitude &&
      !isNaN(vehicle.latitude) &&
      !isNaN(vehicle.longitude) &&
      Math.abs(vehicle.latitude) <= 90 &&
      Math.abs(vehicle.longitude) <= 180
    );
  }, [vehicle]);

  // Calculate initial map center
  const mapCenter = useMemo(() => {
    if (isValidVehicle && vehicle) {
      return [vehicle.latitude, vehicle.longitude] as [number, number];
    }
    return center;
  }, [isValidVehicle, vehicle, center]);

  const handleVehicleClick = useCallback(
    (clickedVehicle: VehicleData) => {
      onVehicleClick?.(clickedVehicle);
    },
    [onVehicleClick]
  );

  // Center map to vehicle manually
  const handleCenterToVehicle = useCallback(() => {
    if (!isValidVehicle || !vehicle) return;

    const map = mapRef.current;
    if (map) {
      map.flyTo([vehicle.latitude, vehicle.longitude], 15, {
        animate: true,
        duration: 1,
        easeLinearity: 0.25,
      });
    }
  }, [isValidVehicle, vehicle]);

  return (
    <div
      className="single-device-map-container"
      style={{ height, width: "100%" }}
    >
      <MapContainer
        ref={mapRef}
        center={mapCenter}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
        preferCanvas={true}
        zoomControl={true}
        attributionControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {/* Handle container resize issues */}
        <MapResizeHandler />

        {/* Auto-center functionality */}
        <AutoCenterHandler vehicle={vehicle} autoCenter={autoCenter} />

        {/* Render single vehicle marker */}
        {isValidVehicle && vehicle && (
          <SingleVehicleMarker vehicle={vehicle} onClick={handleVehicleClick} />
        )}
      </MapContainer>

      {/* Map Controls */}
      <SingleDeviceLiveTrackControls
        vehicle={vehicle}
        onCenterToVehicle={handleCenterToVehicle}
      />

      {/* No vehicle message */}
      {!vehicle && (
        <div className="no-vehicle-message">
          <p>No vehicle data available</p>
        </div>
      )}

      {/* Invalid vehicle message */}
      {vehicle && !isValidVehicle && (
        <div className="invalid-vehicle-message">
          <p>Invalid vehicle coordinates: {vehicle.name}</p>
        </div>
      )}
    </div>
  );
};

export default SingleDeviceLiveTrack;
