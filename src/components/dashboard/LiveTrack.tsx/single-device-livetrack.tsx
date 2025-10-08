import React, {
  useEffect,
  useRef,
  useMemo,
  useCallback,
  useState,
  useLayoutEffect,
} from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  Circle,
  useMapEvents,
} from "react-leaflet";
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
import { Slider } from "@/components/ui/slider";
import { getDecodedToken } from "@/lib/jwt";
import Cookies from "js-cookie";
import { GeofenceForm } from "./form/GeofenceForm";
type UserRole = "superAdmin" | "school" | "branchGroup" | "branch" | null;

// Types based on your socket response
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
  schoolId?: string;
  branchId?: string;
  routeObjId?: string;
}

// Radius adjustment component for interactive drawing
const GeofenceDrawing = ({
  center,
  radius,
  onRadiusChange,
}: {
  center: [number, number];
  radius: number;
  onRadiusChange: (radius: number) => void;
}) => {
  return (
    <>
      <Circle
        center={center}
        radius={radius}
        pathOptions={{
          color: "#3b82f6",
          fillColor: "#3b82f6",
          fillOpacity: 0.2,
          weight: 2,
        }}
      />
      <div
        className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white px-6 py-4 rounded-xl shadow-2xl border border-gray-200 w-80"
        style={{ zIndex: 1000 }}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">
              Geofence Radius
            </span>
            <span className="text-lg font-bold text-blue-600">{radius}m</span>
          </div>

          <Slider
            value={[radius]}
            onValueChange={(value) => onRadiusChange(value[0])}
            min={50}
            max={1000}
            step={10}
            className="w-full cursor-pointer"
          />

          <div className="flex justify-between text-xs text-gray-500">
            <span>50m</span>
            <span>1000m</span>
          </div>
        </div>
      </div>
    </>
  );
};

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

// Container resize handler component
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

// Map click handler component for geofence creation
const MapClickHandler = ({
  isCreatingGeofence,
  onMapClick,
}: {
  isCreatingGeofence: boolean;
  onMapClick: (latlng: [number, number]) => void;
}) => {
  useMapEvents({
    click(e) {
      if (isCreatingGeofence) {
        // Use the actual click coordinates from the map
        onMapClick([e.latlng.lat, e.latlng.lng]);
      }
    },
  });

  return null;
};

const SingleDeviceLiveTrack: React.FC<SingleDeviceLiveTrackProps> = ({
  vehicle,
  center = [21.99099777777778, 78.92973111111111],
  zoom = 10,
  onVehicleClick,
  autoCenter = false,
  showTrail = false,
  schoolId,
  branchId,
  routeObjId,
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const [vehiclePath, setVehiclePath] = useState<[number, number][]>([]);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);
  const startPointRef = useRef<[number, number] | null>(null);
  const targetPointRef = useRef<[number, number] | null>(null);
  const currentPathRef = useRef<[number, number][]>([]);

  const maxPathPoints = 500;
  const animationDuration = 10000;
  const samplingInterval = 500;

  const [isSatelliteView, setIsSatelliteView] = useState(false);
  const [showTraffic, setShowTraffic] = useState(false);

  // Geofence state
  const [isDrawingGeofence, setIsDrawingGeofence] = useState(false);
  const [showGeofenceForm, setShowGeofenceForm] = useState(false);
  const [geofenceRadius, setGeofenceRadius] = useState(200);
  const [geofenceCenter, setGeofenceCenter] = useState<[number, number] | null>(
    null
  );
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  React.useEffect(() => {
    const token = Cookies.get("token");

    const decoded = token ? getDecodedToken(token) : null;

    const role = decoded?.role;

    if (
      typeof role === "string" &&
      ["superAdmin", "school", "branchGroup", "branch"].includes(role)
    ) {
      setUserRole(role as UserRole);
    }
  }, []);

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

  // Smooth polyline growth with throttled sampling
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
        }

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          // Animation complete
          animationRef.current = null;
        }
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

  const handleGeofenceToggle = useCallback(() => {
    if (isDrawingGeofence) {
      // Cancel drawing
      setIsDrawingGeofence(false);
      setShowGeofenceForm(false);
    } else {
      // Start drawing
      if (isValidVehicle && vehicle) {
        setGeofenceCenter([vehicle.latitude, vehicle.longitude]);
        setGeofenceRadius(200);
        setIsDrawingGeofence(true);
        setShowGeofenceForm(false);
      }
    }
  }, [isDrawingGeofence, isValidVehicle, vehicle]);

  const handleNextStep = useCallback(() => {
    setShowGeofenceForm(true);
  }, []);

  const handleGeofenceSubmit = async (payload: any) => {
    try {
      console.log("Geofence Payload:", payload);

      const response = await fetch("/api/geofence/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        console.log("Geofence created successfully");
        setIsDrawingGeofence(false);
        setShowGeofenceForm(false);
        setGeofenceCenter(null); // Reset the center to null
        alert("Geofence created successfully!");
      } else {
        console.error("Failed to create geofence");
        alert("Failed to create geofence");
      }
    } catch (error) {
      console.error("Error creating geofence:", error);
      alert("Error creating geofence");
    }
  };

  const handleGeofenceCancel = useCallback(() => {
    setIsDrawingGeofence(false);
    setShowGeofenceForm(false);
    setGeofenceCenter(null);
  }, []);

  const handleMapClick = useCallback((latlng: [number, number]) => {
    setGeofenceCenter(latlng);
    setIsDrawingGeofence(true);
  }, []);

  return (
    <div
      style={{ height: "80vh", width: "100%", position: "relative" }}
      className="rounded-lg overflow-hidden"
    >
      <MapContainer
        ref={mapRef}
        center={mapCenter}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
      >
        <ZoomTransitionController />
        <MapResizeHandler />
        <AutoCenterHandler vehicle={vehicle} autoCenter={autoCenter} />

        {/* Add this new component */}
        <MapClickHandler
          isCreatingGeofence={isDrawingGeofence && !showGeofenceForm}
          onMapClick={handleMapClick}
        />

        {/* Tile Layers */}

        {/* <TileLayer
          url={
            isSatelliteView
              ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          }
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        /> */}
        {/* OG GOOGLE MAP!!!!!!!!!!!!! */}
        <TileLayer
          url={`https://{s}.google.com/vt/lyrs=${
            isSatelliteView ? "s" : "m"
          }&x={x}&y={y}&z={z}`}
          subdomains={["mt0", "mt1", "mt2", "mt3"]}
        />

        {vehicle && <DataRefreshIndicator vehicle={vehicle} />}

        {/* {showTraffic && (
          <TileLayer url="https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?key=WI92B5fNrRuw3y9wnNVFbF10gosmx1h2" />
        )} */}
        {showTraffic && (
          <TileLayer
            url={`https://{s}.google.com/vt/lyrs=${
              isSatelliteView ? "s" : "m"
            }@221097413,traffic&x={x}&y={y}&z={z}`}
            subdomains={["mt0", "mt1", "mt2", "mt3"]}
          />
        )}

        {/* Geofence Drawing */}
        {geofenceCenter && (isDrawingGeofence || showGeofenceForm) && (
          <GeofenceDrawing
            center={geofenceCenter}
            radius={geofenceRadius}
            onRadiusChange={setGeofenceRadius}
          />
        )}

        {/* Render vehicle path trail */}
        {showTrail && vehiclePath.length > 1 && (
          <VehiclePathTrail path={vehiclePath} />
        )}

        {/* Render vehicle marker */}
        {isValidVehicle && vehicle && (
          <VehicleMarker
            vehicle={vehicle}
            onClick={handleVehicleClick}
            status={vehicleStatus}
          />
        )}

        {!vehicle && (
          <Popup position={center}>
            <div className="text-center">No vehicle data available</div>
          </Popup>
        )}

        {vehicle && !isValidVehicle && (
          <Popup position={center}>
            <div className="text-center text-red-600">
              Invalid vehicle coordinates: {vehicle.name}
            </div>
          </Popup>
        )}
      </MapContainer>

      {/* Controls */}
      <SingleDeviceLiveTrackControls
        vehicle={vehicle}
        onCenterToVehicle={handleCenterToVehicle}
        isSatelliteView={isSatelliteView}
        onSatelliteToggle={handleSatelliteToggle}
        showTraffic={showTraffic}
        setShowTraffic={setShowTraffic}
        isDrawingGeofence={isDrawingGeofence}
        onGeofenceToggle={handleGeofenceToggle}
      />

      {/* Next Button during drawing */}

      {isDrawingGeofence && !showGeofenceForm && geofenceCenter && (
        <div
          className="absolute bottom-28 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-3"
          style={{ zIndex: 1000 }}
        >
          <button
            onClick={handleNextStep}
            className="group relative bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-4 rounded-xl shadow-lg hover:shadow-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-semibold text-base flex items-center gap-3"
          >
            <span>Next: Enter Details</span>
            <svg
              className="w-5 h-5 group-hover:translate-x-1 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Geofence Form */}
      {showGeofenceForm && geofenceCenter && (
        <GeofenceForm
          center={geofenceCenter}
          radius={geofenceRadius}
          onSubmit={handleGeofenceSubmit}
          onCancel={handleGeofenceCancel}
          schoolId={schoolId}
          branchId={branchId}
          routeObjId={routeObjId}
          role={userRole as UserRole}
        />
      )}
    </div>
  );
};

export default SingleDeviceLiveTrack;
