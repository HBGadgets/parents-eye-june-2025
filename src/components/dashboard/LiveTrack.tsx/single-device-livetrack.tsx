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
import { OfflineIndicator } from "./offline-indicator";
import { VehiclePathTrail } from "./vehicle-path-trail";
import DataRefreshIndicator, {
  useDataRefreshIndicator,
} from "./data-refresh-indicator";
import { SingleDeviceLiveTrackControls } from "./single-device-livetrack-controls";
import { VehicleMarker } from "./VehicleMarker";

// Types based on your socket response - kept the same
export interface VehicleData {
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

// Component to disable transitions during zoom
const ZoomTransitionController = () => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const handleZoomStart = () => {
      // Remove smooth transitions during zoom
      const markers = document.querySelectorAll(
        ".custom-single-vehicle-marker"
      );
      const images = document.querySelectorAll(".vehicle-marker-img");

      markers.forEach((marker) => {
        marker.classList.remove("smooth-marker");
      });

      images.forEach((img) => {
        (img as HTMLElement).classList.remove("smooth-rotation");
      });

      console.log("[ZoomController] Transitions disabled");
    };

    const handleZoomEnd = () => {
      // Re-enable smooth transitions after zoom
      setTimeout(() => {
        const markers = document.querySelectorAll(
          ".custom-single-vehicle-marker"
        );
        const images = document.querySelectorAll(".vehicle-marker-img");

        markers.forEach((marker) => {
          marker.classList.add("smooth-marker");
        });

        images.forEach((img) => {
          (img as HTMLElement).classList.add("smooth-rotation");
        });

        console.log("[ZoomController] Transitions enabled");
      }, 100);
    };

    map.on("zoomstart", handleZoomStart);
    map.on("zoomend", handleZoomEnd);

    return () => {
      map.off("zoomstart", handleZoomStart);
      map.off("zoomend", handleZoomEnd);
    };
  }, [map]);

  return null;
};

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

// Helper function to interpolate between two points
const interpolatePoint = (
  start: [number, number],
  end: [number, number],
  progress: number
): [number, number] => {
  const lat = start[0] + (end[0] - start[0]) * progress;
  const lng = start[1] + (end[1] - start[1]) * progress;
  return [lat, lng];
};

const SingleDeviceLiveTrack: React.FC<SingleDeviceLiveTrackProps> = ({
  vehicle,
  center = [21.99099777777778, 78.92973111111111],
  zoom = 10,
  onVehicleClick,
  autoCenter = false,
  showTrail = false,
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const [vehiclePath, setVehiclePath] = useState<[number, number][]>([]);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const startPointRef = useRef<[number, number] | null>(null);
  const targetPointRef = useRef<[number, number] | null>(null);
  const currentPathRef = useRef<[number, number][]>([]);
  const maxPathPoints = 500;
  const animationDuration = 10000;
  const samplingInterval = 500;
  const [isSatelliteView, setIsSatelliteView] = useState(false);
  const [showTraffic, setShowTraffic] = useState(false);

  // Get vehicle status
  const vehicleStatus = useMemo(() => {
    if (!vehicle) return "noData";

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
    const trueStoppedConditionsCount = stoppedConditions.filter(Boolean).length;

    if (trueStoppedConditionsCount >= 2) return "stopped";
    if (trueConditionsCount >= 2) return "running";
    if (trueIdleConditionsCount >= 2) return "idle";
    return "noData";
  }, [vehicle]);

  // FIXED: Smooth polyline growth with throttled sampling
  useEffect(() => {
    if (!vehicle || !showTrail) return;

    const newPoint: [number, number] = [vehicle.latitude, vehicle.longitude];
    const currentPath = currentPathRef.current;
    const lastPoint = currentPath[currentPath.length - 1];

    // Check if this is a new position
    if (
      lastPoint &&
      lastPoint[0] === newPoint[0] &&
      lastPoint[1] === newPoint[1]
    ) {
      return; // Same position, no animation needed
    }

    // Set up animation
    startPointRef.current = lastPoint || newPoint;
    targetPointRef.current = newPoint;
    startTimeRef.current = Date.now();
    let lastSampleTime = Date.now();

    // Cancel any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    // Animation loop with throttled sampling
    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min(elapsed / animationDuration, 1);
      const currentTime = Date.now();

      if (startPointRef.current && targetPointRef.current) {
        // Only add point at intervals, not every frame
        if (
          currentTime - lastSampleTime >= samplingInterval ||
          progress === 1
        ) {
          const interpolatedPoint = interpolatePoint(
            startPointRef.current,
            targetPointRef.current,
            progress
          );

          // Update ref and state
          currentPathRef.current = [
            ...currentPathRef.current,
            interpolatedPoint,
          ];

          // Trim if needed
          if (currentPathRef.current.length > maxPathPoints) {
            currentPathRef.current = currentPathRef.current.slice(
              -maxPathPoints
            );
          }

          setVehiclePath([...currentPathRef.current]);
          lastSampleTime = currentTime;

          // console.log(
          //   `[Trail] Added point at ${(progress * 100).toFixed(1)}% progress`
          // );
        }
      }

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Animation complete
        console.log("[Trail] Animation complete");
        animationRef.current = null;
      }
    };

    // Start animation
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [vehicle?.latitude, vehicle?.longitude, showTrail]);

  // Clear path when vehicle changes
  useEffect(() => {
    if (vehicle?.imei) {
      setVehiclePath([]);
      currentPathRef.current = [];
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
  }, [vehicle?.imei]);

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

  const handleSatelliteToggle = useCallback(() => {
    setIsSatelliteView(!isSatelliteView);
  }, [isSatelliteView]);

  return (
    <div className="single-device-map-container relative w-full h-[600px]">
      {vehicle && <OfflineIndicator isOffline={!vehicle.gsmSignal} />}

      <MapContainer
        ref={mapRef}
        center={mapCenter}
        zoom={zoom}
        className="h-full w-full"
        preferCanvas={true}
        zoomControl={true}
        attributionControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={
            isSatelliteView
              ? "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
              : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          }
          maxZoom={19}
        />

        {showTraffic && (
          <TileLayer
            url="https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?key=WI92B5fNrRuw3y9wnNVFbF10gosmx1h2"
            attribution="Traffic data © 2024 TomTom"
          />
        )}

        <MapResizeHandler />
        <ZoomTransitionController vehicle={vehicle} />
        <AutoCenterHandler vehicle={vehicle} autoCenter={autoCenter} />

        {/* Render vehicle path trail */}
        {showTrail && vehiclePath.length > 1 && (
          <VehiclePathTrail path={vehiclePath} vehicleStatus={vehicleStatus} />
        )}

        {/* Render vehicle marker */}
        {isValidVehicle && vehicle && (
          <VehicleMarker
            vehicle={vehicle}
            onClick={handleVehicleClick}
            markerSize={100}
            popupMaxWidth={300}
          />
        )}
      </MapContainer>

      <SingleDeviceLiveTrackControls
        vehicle={vehicle}
        onCenterToVehicle={handleCenterToVehicle}
        isSatelliteView={isSatelliteView}
        onSatelliteToggle={handleSatelliteToggle}
        showTraffic={showTraffic}
        setShowTraffic={setShowTraffic}
      />

      {!vehicle && (
        <div className="no-vehicle-message">
          <p>No vehicle data available</p>
        </div>
      )}

      {vehicle && !isValidVehicle && (
        <div className="invalid-vehicle-message">
          <p>Invalid vehicle coordinates: {vehicle.name}</p>
        </div>
      )}
    </div>
  );
};

export default SingleDeviceLiveTrack;
