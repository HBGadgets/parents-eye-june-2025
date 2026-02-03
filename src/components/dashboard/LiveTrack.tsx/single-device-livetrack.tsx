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
import { VehiclePathTrail } from "./vehicle-path-trail";
import DataRefreshIndicator from "./data-refresh-indicator";
import { SingleDeviceLiveTrackControls } from "./single-device-livetrack-controls";
import { VehicleMarker } from "./VehicleMarker";
import { Slider } from "@/components/ui/slider";
import { getDecodedToken } from "@/lib/jwt";
import Cookies from "js-cookie";
import { GeofenceForm } from "./form/GeofenceForm";
import { useGeofence, useGeofenceByUniqueId } from "@/hooks/useGeofence";
import { calculateTimeSince } from "@/util/calculateTimeSince";
import { Geofence } from "@/interface/modal";
import { useDistance } from "@/hooks/useDistance";
import { reverseGeocodeMapTiler } from "@/hooks/useReverseGeocoding";
import { useSmoothSocketSpeed } from "@/hooks/useSmoothRandomSpeed";

type UserRole = "superAdmin" | "school" | "branchGroup" | "branch" | null;

export const isValidGeofence = (geofence: any): geofence is Geofence => {
  return (
    geofence &&
    geofence._id &&
    geofence.area &&
    Array.isArray(geofence.area.center) &&
    geofence.area.center.length === 2 &&
    typeof geofence.area.radius === "number" &&
    !isNaN(geofence.area.center[0]) &&
    !isNaN(geofence.area.center[1])
  );
};

// Types based on your socket response
export interface VehicleData {
  speed: number;
  longitude: number;
  latitude: number;
  course: number;
  deviceId: number;
  imei: number;
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
  uniqueId: number;
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
  routeName?: string;
  routeObjId?: string;
}

// Geofence Display Layer Component with proper API structure
const GeofenceLayer = ({
  geofenceByRoute,
  visible,
}: {
  geofenceByRoute: Geofence[];
  visible: boolean;
}) => {
  // Debug logs
  // useEffect(() => {
  //   // console.log("🔵 GeofenceLayer - Rendered with:", {
  //   //   visible,
  //   //   geofencesCount: geofences?.length || 0,
  //   //   geofences: geofences,
  //   // });
  // }, [geofences, visible]);

  // if (!visible) {
  //   console.log("⚪ GeofenceLayer - Not visible");
  //   return null;
  // }

  // if (!geofenceByRoute || geofenceByRoute.length === 0) {
  //   console.log("⚪ GeofenceLayer - No geofences to display");
  //   return null;
  // }

  // Filter out invalid geofences before rendering
  // console.log("🔵 GeofenceLayer - Rendering geofences:", geofenceByRoute);
  const validGeofences = geofenceByRoute?.filter((g) => isValidGeofence(g));

  // console.log("✅ GeofenceLayer - Rendering valid geofences:", validGeofences);

  // if (validGeofences?.length === 0) {
  //   console.log("⚠️ GeofenceLayer - No valid geofences after filtering");
  //   return null;
  // }

  return (
    <>
      {validGeofences?.map((geofence) => {
        const [latitude, longitude] = geofence.area.center;
        const radius = geofence.area.radius;

        return (
          <React.Fragment key={geofence._id}>
            <Circle
              center={[latitude, longitude]}
              radius={radius}
              pathOptions={{
                color: "#10b981",
                fillColor: "#10b981",
                fillOpacity: 0.15,
                weight: 2,
                dashArray: "5 5",
              }}
            >
              <Popup>
                <div className="text-sm">
                  <strong>{geofence.geofenceName}</strong>
                  <br />
                  Radius: {geofence.area.radius} m
                </div>
              </Popup>
            </Circle>
          </React.Fragment>
        );
      })}
    </>
  );
};

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
  const sliderContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = sliderContainerRef.current;
    if (container) {
      // Prevent click and scroll events from propagating to the map
      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.disableScrollPropagation(container);
    }
  }, []);

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
        ref={sliderContainerRef}
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

    if (!hasInitialized) {
      map.setView([vehicle.latitude, vehicle.longitude], 15, {
        animate: true,
        duration: 1,
      });
      setHasInitialized(true);
      return;
    }

    const currentCenter = map.getCenter();
    const distance = map.distance(
      [currentCenter.lat, currentCenter.lng],
      [vehicle.latitude, vehicle.longitude]
    );

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
  routeName,
  routeObjId,
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const smoothSpeed = useSmoothSocketSpeed(
    vehicle?.speed,
    5000,
    vehicle?.attributes?.motion
  );
  const [vehiclePath, setVehiclePath] = useState<[number, number][]>([]);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);
  const startPointRef = useRef<[number, number] | null>(null);
  const targetPointRef = useRef<[number, number] | null>(null);
  const currentPathRef = useRef<[number, number][]>([]);
  const { distance } = useDistance(vehicle?.uniqueId);
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
  const [showGeofences, setShowGeofences] = useState(true);

  const pagination = useMemo(
    () => ({
      pageIndex: 0,
      pageSize: 100, // Fetch 100 geofences at once for map display
    }),
    []
  );

  const sorting = useMemo(() => [], []);
  const filters = useMemo(
    () => ({
      routeId: routeObjId || "",
    }),
    [routeObjId]
  );
  // TanStack Query hooks for geofence management
  const queryParams = useMemo(
    () => ({ schoolId, branchId }),
    [schoolId, branchId]
  );

  const {
    // geofence: geofences,
    // geofenceByRoute,
    isLoading: isLoadingGeofences,
    createGeofence,
  } = useGeofence(pagination, sorting, filters);
  const geofenceQuery = useGeofenceByUniqueId(vehicle?.uniqueId || "");

  const geofenceByRoute = geofenceQuery?.geofenceByUniqueId;

  // console.log("geofenceByRoute",geofenceByRoute)

  // Debug logs for geofences
  // useEffect(() => {
  //   // console.log("📊 Geofences State Update:", {
  //     count: geofences.length,
  //     isLoading: isLoadingGeofences,
  //     error: geofencesError,
  //     showGeofences,
  //     geofences: geofences,
  //     queryParams,
  //   });
  // }, [
  //   geofences,
  //   isLoadingGeofences,
  //   geofencesError,
  //   showGeofences,
  //   queryParams,
  // ]);

  // Debug mutation state
  // useEffect(() => {
  //   // console.log("🔄 Mutation State:", {
  //     isPending: createGeofenceMutation.isPending,
  //     isSuccess: createGeofenceMutation.isSuccess,
  //     isError: createGeofenceMutation.isError,
  //     error: createGeofenceMutation.error,
  //   });
  // }, [
  //   createGeofenceMutation.isPending,
  //   createGeofenceMutation.isSuccess,
  //   createGeofenceMutation.isError,
  //   createGeofenceMutation.error,
  // ]);

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

    if (vehicle.category === "inactive") return "inactive";
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

    if (
      lastPoint &&
      lastPoint[0] === newPoint[0] &&
      lastPoint[1] === newPoint[1]
    ) {
      return;
    }

    startPointRef.current = lastPoint || newPoint;
    targetPointRef.current = newPoint;
    startTimeRef.current = Date.now();
    let lastSampleTime = Date.now();

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min(elapsed / animationDuration, 1);
      const currentTime = Date.now();

      if (startPointRef.current && targetPointRef.current) {
        if (
          currentTime - lastSampleTime >= samplingInterval ||
          progress === 1
        ) {
          const interpolatedPoint = interpolatePoint(
            startPointRef.current,
            targetPointRef.current,
            progress
          );

          currentPathRef.current = [
            ...currentPathRef.current,
            interpolatedPoint,
          ];

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
          animationRef.current = null;
        }
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [vehicle?.latitude, vehicle?.longitude, showTrail]);

  // Clear path when vehicle changes
  useEffect(() => {
    if (vehicle?.uniqueId) {
      setVehiclePath([]);
      currentPathRef.current = [];
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
  }, [vehicle?.uniqueId]);

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
      setIsDrawingGeofence(false);
      setShowGeofenceForm(false);
    } else {
      if (isValidVehicle && vehicle) {
        setGeofenceCenter([vehicle.latitude, vehicle.longitude]);
        setGeofenceRadius(200);
        setIsDrawingGeofence(true);
        setShowGeofenceForm(false);
      }
    }
  }, [isDrawingGeofence, isValidVehicle, vehicle]);

  const handleToggleGeofences = useCallback(() => {
    setShowGeofences((prev) => {
      // console.log("🔄 Toggling geofences visibility:", !prev);
      return !prev;
    });
  }, []);

  const handleNextStep = useCallback(() => {
    setShowGeofenceForm(true);
  }, []);

  const handleGeofenceSubmit = async (payload: any) => {
    const lat = geofenceCenter![0];
    const lng = geofenceCenter![1];

    const address = await reverseGeocodeMapTiler(lat, lng);
    const geofencePayload = {
      geofenceName: payload.name || payload.geofenceName || "New Geofence",
      area: {
        center: [geofenceCenter![0], geofenceCenter![1]],
        radius: geofenceRadius,
      },
      pickupTime: payload.pickupTime,
      dropTime: payload.dropTime,
      schoolId: schoolId || payload.schoolId,
      branchId: branchId || payload.branchId,
      routeObjId: routeObjId || payload.routeObjId,
      address,
    };

    // console.log("📤 Submitting geofence:", geofencePayload);

    // Call the mutation from the hook
    createGeofence(geofencePayload);

    // Reset state after submission
    setIsDrawingGeofence(false);
    setShowGeofenceForm(false);
    setGeofenceCenter(null);
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

        <MapClickHandler
          isCreatingGeofence={isDrawingGeofence && !showGeofenceForm}
          onMapClick={handleMapClick}
        />

        <TileLayer
          url={`https://{s}.google.com/vt/lyrs=${isSatelliteView ? "s" : "m"
            }&x={x}&y={y}&z={z}`}
          subdomains={["mt0", "mt1", "mt2", "mt3"]}
        />

        {vehicle && <DataRefreshIndicator vehicle={vehicle} />}

        {showTraffic && (
          <TileLayer
            url={`https://{s}.google.com/vt/lyrs=${isSatelliteView ? "s" : "m"
              }@221097413,traffic&x={x}&y={y}&z={z}`}
            subdomains={["mt0", "mt1", "mt2", "mt3"]}
          />
        )}

        {/* Display existing geofences */}
        {showGeofences && (
          <GeofenceLayer
            geofenceByRoute={geofenceByRoute}
            visible={showGeofences}
          />
        )}

        {/* Current drawing geofence */}
        {geofenceCenter && (isDrawingGeofence || showGeofenceForm) && (
          <GeofenceDrawing
            center={geofenceCenter}
            radius={geofenceRadius}
            onRadiusChange={setGeofenceRadius}
          />
        )}

        {showTrail && vehiclePath.length > 1 && (
          <VehiclePathTrail path={vehiclePath} />
        )}

        {isValidVehicle && vehicle && (
          <VehicleMarker
            vehicle={vehicle}
            onClick={handleVehicleClick}
            status={vehicleStatus}
          />
        )}

        {!vehicle && (
          <Popup position={center}>
            <div className="text-center">Loading....</div>
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

      {/* Loading indicator for geofences */}
      {isLoadingGeofences && (
        <div className="absolute top-20 right-4 z-[1000] bg-white px-4 py-2 rounded-lg shadow-lg">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <svg
              className="animate-spin h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Loading geofences...
          </div>
        </div>
      )}

      {/* Info panel */}
      <div className="absolute top-20 left-4 z-[1000] bg-white/90 px-3 py-2 rounded-lg shadow-lg text-xs">
        <div>
          Network Status:{" "}
          <span
            className={`${vehicle?.gsmSignal ? "text-green-600" : "text-red-600"
              } px-1 py-0.5 rounded font-semibold`}
          >
            {vehicle?.gsmSignal ? "Online" : "Offline"}
          </span>
        </div>
        <div>
          Route No:{" "}
          {routeName ? routeName : "Not assigned"}
        </div>
        <div>
          Geofences: {geofenceByRoute ? geofenceByRoute?.length : "loading..."}
        </div>
        <div>
          Last Update:{" "}
          {vehicle?.lastUpdate
            ? new Date(vehicle.lastUpdate).toLocaleString("en-GB", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: true,
              timeZone: "UTC",
            })
            : "loading..."}
        </div>
        <div>
          Since:{" "}
          {vehicle?.lastUpdate
            ? calculateTimeSince(vehicle?.lastUpdate)
            : "loading..."}
        </div>
        <div>Speed: {Math.floor(smoothSpeed)} km/h</div>

        <div>
          Distance:{" "}
          {(
            (distance?.distance ?? 0) +
            (vehicle?.attributes?.distance ?? 0) / 1000
          ).toFixed(2)}{" "}
          km
        </div>
        <div>Odometer: {`${distance?.totalDistance} km`}</div>
        <div>
          Speed Limit: {vehicle?.speedLimit && `${vehicle.speedLimit} km/h`}
        </div>
      </div>

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
        showGeofences={showGeofences}
        onToggleGeofences={handleToggleGeofences}
        geofenceCount={geofenceByRoute?.length}
      />

      {/* Next Button during drawing */}
      {isDrawingGeofence && !showGeofenceForm && geofenceCenter && (
        <div
          className="absolute bottom-28 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-3"
          style={{ zIndex: 1000 }}
        >
          <button
            onClick={handleNextStep}
            className="group relative bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-4 rounded-xl shadow-lg hover:shadow-xl hover:from-blue-600 hover:to-blue-700 cursor-pointer transition-all duration-200 font-semibold text-base flex items-center gap-3"
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
          schoolId={vehicle?.schoolId}
          branchId={vehicle?.branchId}
          routeObjId={routeObjId}
          role={userRole as UserRole}
        />
      )}
    </div>
  );
};

export default SingleDeviceLiveTrack;
