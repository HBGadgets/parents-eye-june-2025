import React, {
  useEffect,
  useRef,
  useMemo,
  useCallback,
  useState,
  useLayoutEffect,
} from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./VehicleMap.css";
import { calculateTimeSince } from "@/util/calculateTimeSince";
import { Satellite, List, Palette, X, Navigation, MapPin, Eye, EyeOff, Locate, Bus } from "lucide-react";
import { LiaTrafficLightSolid } from "react-icons/lia";
import { MdDirections } from "react-icons/md";

// Types based on your socket response
interface VehicleData {
  speed: number;
  longitude: number;
  latitude: number;
  course: number;
  deviceId: number;
  imei: string;
  uniqueId: number;
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

interface VehicleMapProps {
  vehicles: VehicleData[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  onVehicleClick?: (vehicle: VehicleData) => void;
  selectedVehicleId?: number | null;
  onVehicleSelect?: (vehicleId: number | null) => void;
  showTrails?: boolean;
  clusterMarkers?: boolean;
  autoFitBounds?: boolean;
  activeFilter?: string;
  selectedRouteData?: {
    success: boolean;
    message?: string;
    deviceDataByTrips: Array<Array<{
      latitude: number;
      longitude: number;
      speed: number;
      course: number;
      createdAt: string;
      attributes?: any;
    }>>;
  } | null;
  onToggleAllInTable?: (showAll: boolean) => void;
  isAllInTableActive?: boolean;
}

// Optimized marker component with proper memoization
const VehicleBusMarker = React.memo(
  ({
    vehicle,
    onClick,
    isSelected,
  }: {
    vehicle: VehicleData;
    onClick?: (vehicle: VehicleData) => void;
    isSelected?: boolean;
  }) => {
    // Memoize vehicle status calculation
    const vehicleStatus = useMemo(() => {
      const lastUpdateTime = new Date(vehicle.lastUpdate).getTime();
      const currentTime = new Date().getTime();
      const timeDifference = currentTime - lastUpdateTime;
      const thirtyFiveHoursInMs = 35 * 60 * 60 * 1000;

      // Check if vehicle is inactive
      if (vehicle.latitude === 0 && vehicle.longitude === 0) return "noData";

      if (timeDifference > thirtyFiveHoursInMs) return "inactive";

      // Check for overspeeding
      const speedLimit = parseFloat(vehicle.speedLimit) || 60;
      if (vehicle.speed > speedLimit) return "overspeeding";

      // Extract vehicle attributes
      const { ignition, motion } = vehicle.attributes;
      const speed = vehicle.speed;
      if (ignition === true) {
        if (speed > 5 && speed < speedLimit) {
          return "running";
        } else {
          return "idle";
        }
      } else if (ignition === false) {
        return "stopped";
      }
    }, [
      vehicle.speed,
      vehicle.speedLimit,
      vehicle.lastUpdate,
      vehicle.attributes.ignition,
    ]);

    // Memoize image URL
    const imageUrl = useMemo(() => {
      const statusToImageUrl = {
        running: "/BUS/top-view/green.svg",
        idle: "/BUS/top-view/yellow.svg",
        stopped: "/BUS/top-view/red.svg",
        inactive: "/BUS/top-view/gray.svg",
        overspeeding: "/BUS/top-view/orange.svg",
        new: "/BUS/top-view/blue.svg",
      };
      return statusToImageUrl[vehicle.category] || statusToImageUrl.new;
    }, [vehicle.category]);

    // Memoize icon with proper sizing
    const busIcon = useMemo(() => {
      const rotationAngle = vehicle.course || 0;

      return L.divIcon({
        html: `
          <div class="vehicle-marker-container ${isSelected ? "selected" : ""}">
            <img 
              src="${imageUrl}" 
              class="vehicle-marker-img"
              style="
                transform: rotate(${rotationAngle}deg);
                width: 100px;
                height: 100px;
                transform-origin: center center;
                transition: transform 0.3s ease;
                filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
              " 
              alt="Vehicle marker"
            />
          </div>
        `,
        className: "custom-vehicle-marker",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16],
      });
    }, [imageUrl, vehicle.course, isSelected]);

    const handleClick = useCallback(() => {
      onClick?.(vehicle);
    }, [vehicle, onClick]);

    // Memoize formatted date
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

    // Memoize status info
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
                <span className="value">
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
                    : "N/A"}
                </span>
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
                  className={`value ${vehicle.gsmSignal ? "online" : "offline"
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
  },
  // Custom comparison function for better memoization
  (prevProps, nextProps) => {
    return (
      prevProps.vehicle.deviceId === nextProps.vehicle.deviceId &&
      prevProps.vehicle.speed === nextProps.vehicle.speed &&
      prevProps.vehicle.latitude === nextProps.vehicle.latitude &&
      prevProps.vehicle.longitude === nextProps.vehicle.longitude &&
      prevProps.vehicle.course === nextProps.vehicle.course &&
      prevProps.vehicle.lastUpdate === nextProps.vehicle.lastUpdate &&
      prevProps.isSelected === nextProps.isSelected
    );
  }
);

const VehicleZoomHandler = ({
  selectedVehicleId,
  vehicles,
}: {
  selectedVehicleId: number | null;
  vehicles: VehicleData[];
}) => {
  const map = useMap();
  const [lastZoomedId, setLastZoomedId] = useState<number | null>(null);

  const zoomToVehicle = useCallback(
    (vehicle: VehicleData) => {
      if (!vehicle.latitude || !vehicle.longitude) return;

      // console.log(
      //   "Zooming to vehicle:",
      //   vehicle.name,
      //   "at coordinates:",
      //   vehicle.latitude,
      //   vehicle.longitude
      // );

      // ✅ Method 1: Use flyTo for smoother centering (recommended)
      map.flyTo([vehicle.latitude, vehicle.longitude], 16, {
        animate: true,
        duration: 1, // 1 second duration
        easeLinearity: 0.25,
      });

      // ✅ Alternative Method 2: Use panTo + setZoom if flyTo doesn't work
      // map.panTo([vehicle.latitude, vehicle.longitude]);
      // setTimeout(() => {
      //   map.setZoom(16);
      // }, 500);

      // ✅ Alternative Method 3: Force invalidateSize before setView (for rendering issues)
      // map.invalidateSize();
      // setTimeout(() => {
      //   map.setView([vehicle.latitude, vehicle.longitude], 16, {
      //     animate: true,
      //     duration: 0.8,
      //     easeLinearity: 0.1
      //   });
      // }, 100);

      // ✅ Open popup after animation completes
      setTimeout(() => {
        // console.log("Opening popup for vehicle:", vehicle.name);

        // Find all markers and open popup for selected vehicle
        map.eachLayer((layer: any) => {
          if (layer instanceof L.Marker) {
            const markerLatLng = layer.getLatLng();
            // Use more precise comparison for coordinate matching
            if (
              Math.abs(markerLatLng.lat - vehicle.latitude) < 0.0001 &&
              Math.abs(markerLatLng.lng - vehicle.longitude) < 0.0001
            ) {
              // console.log("Found matching marker, opening popup");
              layer.openPopup();
            }
          }
        });

        // Optional: Add visual highlight
        const selectedMarker = document.querySelector(
          `.custom-vehicle-marker[data-device-id="${vehicle.deviceId}"]`
        ) as HTMLElement;

        if (selectedMarker) {
          selectedMarker.classList.add("highlighted");

          // Remove highlight after 3 seconds
          setTimeout(() => {
            selectedMarker.classList.remove("highlighted");
          }, 3000);
        }
      }, 1100); // ✅ Wait for flyTo animation to complete (duration + 100ms buffer)
    },
    [map]
  );

  useEffect(() => {
    // console.log("VehicleZoomHandler effect triggered:", {
    //   selectedVehicleId,
    //   lastZoomedId,
    //   vehicleCount: vehicles.length,
    // });

    // Only zoom if selectedVehicleId is different from last zoomed ID
    if (!selectedVehicleId || selectedVehicleId === lastZoomedId) {
      // console.log("Skipping zoom - no change or same vehicle");
      return;
    }

    const selectedVehicle = vehicles.find(
      (v) => v.deviceId === selectedVehicleId
    );

    if (selectedVehicle) {
      // console.log("Found vehicle to zoom to:", selectedVehicle.name);
      zoomToVehicle(selectedVehicle);
      setLastZoomedId(selectedVehicleId);
    } else {
      // console.log("Vehicle not found with deviceId:", selectedVehicleId);
    }
  }, [selectedVehicleId, zoomToVehicle, lastZoomedId]); // ✅ Keep vehicles out of dependencies

  // Reset last zoomed ID when selectedVehicleId becomes null
  useEffect(() => {
    if (selectedVehicleId === null) {
      // console.log("Resetting last zoomed ID");
      setLastZoomedId(null);
    }
  }, [selectedVehicleId]);

  return null;
};

// Map bounds updater with better performance
const MapBoundsUpdater = ({
  vehicles,
  shouldFitBounds,
  onBoundsFitted,
}: {
  vehicles: VehicleData[];
  shouldFitBounds: boolean;
  onBoundsFitted: () => void;
}) => {
  const map = useMap();

  useEffect(() => {
    if (!shouldFitBounds || vehicles.length === 0) return;

    const bounds = L.latLngBounds(
      vehicles.map((v) => [v.latitude, v.longitude] as [number, number])
    );

    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [20, 20],
        maxZoom: 15,
      });
      onBoundsFitted();
    }
  }, [vehicles, shouldFitBounds, map, onBoundsFitted]);

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

// Optimized map controls
// const MapControls = ({
//   onFitBounds,
//   vehicleCount,
// }: {
//   onFitBounds: () => void;
//   vehicleCount: number;
// }) => {
//   return (
//     <div className="map-controls">
//       <button
//         className="map-control-button fit-bounds-btn"
//         onClick={onFitBounds}
//         title="Fit all vehicles in view"
//       >
//         <span className="control-icon">🎯</span>
//         <span className="control-text">Fit All ({vehicleCount})</span>
//       </button>
//     </div>
//   );
// };

// Custom cluster icon - memoized
const createClusterCustomIcon = (cluster: any) => {
  const count = cluster.getChildCount();

  let size = 40;
  let sizeClass = "text-xs";
  let bgClass = "bg-gradient-to-br from-sky-400 to-blue-600";

  if (count >= 100) {
    size = 60;
    sizeClass = "text-lg";
    bgClass = "bg-gradient-to-br from-orange-400 to-orange-600";
  } else if (count >= 10) {
    size = 50;
    sizeClass = "text-sm";
    bgClass = "bg-gradient-to-br from-emerald-400 to-green-600";
  }

  return L.divIcon({
    html: `
      <div
        class="
          flex items-center justify-center
          rounded-full
          font-bold text-white
          shadow-lg
          ring-2 ring-white/40
          transition-transform duration-200 ease-out
          hover:scale-110
          ${sizeClass}
          ${bgClass}
        "
        style="width:${size}px; height:${size}px;"
      >
        ${count}
      </div>
    `,
    className: "bg-transparent border-0",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

// Fallback FNV-1a golden angle color generator
const getUniqueRouteColor = (id: string | number) => {
  const str = String(id);
  // FNV-1a 32-bit hash algorithm for superior avalanche dispersion
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  // Golden ratio hue angle
  const hue = (Math.abs(hash) * 137.508) % 360;
  const lightness = Math.abs(hash) % 2 === 0 ? 50 : 60;
  return `hsl(${hue}, 85%, ${lightness}%)`;
};

// Create custom premium route start and end markers
const createRouteFlagIcon = (color: "green" | "red", size: number = 34) => {
  const flagColor = color === "green" ? "#10b981" : "#ef4444";
  return L.divIcon({
    className: `${color}-flag-route`,
    html: `
      <div style="width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(1px 2px 4px rgba(0,0,0,0.35));">
        <svg viewBox="0 0 24 24" style="width: ${size}px; height: ${size}px; fill: ${flagColor}; stroke: white; stroke-width: 1.2;">
          <path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/>
        </svg>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size - 2],
  });
};

const getLatLngDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371000; // meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const getBearing = (from: [number, number], to: [number, number]): number => {
  const lat1 = (from[0] * Math.PI) / 180;
  const lat2 = (to[0] * Math.PI) / 180;
  const dLng = ((to[1] - from[1]) * Math.PI) / 180;

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  let brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
};

const createArrowIcon = (course: number, color: string = "#3b82f6", size: number = 24) => {
  return L.divIcon({
    className: "course-arrow",
    html: `
      <div style="transform: rotate(${course + 180}deg); width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center;">
        <div style="display: flex; flex-direction: column; align-items: center; margin-top: -3px;">
          <svg width="${Math.round(size * 0.75)}" height="${Math.round(size * 0.75)}" viewBox="0 0 24 24" fill="none" style="filter: drop-shadow(0px 1px 2px rgba(0,0,0,0.6));">
            <path d="M7 6L12 11L17 6" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M7 14L12 19L17 14" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const createStopDotIcon = () => {
  return L.divIcon({
    className: "custom-stop-dot",
    html: `
      <div style="
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
      ">
        <div class="stop-glow" style="
          position: absolute;
          width: 18px;
          height: 18px;
          background-color: rgba(239, 68, 68, 0.4);
          border-radius: 50%;
          animation: stopPulse 2s infinite ease-in-out;
        "></div>
        <div style="
          position: relative;
          width: 10px;
          height: 10px;
          background-color: #ef4444;
          border: 2px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 1.5px 4px rgba(0, 0, 0, 0.45);
          z-index: 2;
        "></div>
      </div>
      <style>
        @keyframes stopPulse {
          0% { transform: scale(0.95); opacity: 0.8; }
          50% { transform: scale(1.35); opacity: 0.25; }
          100% { transform: scale(0.95); opacity: 0.8; }
        }
      </style>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

const computeRouteDecorations = (trip: any[], arrowSpacing: number = 1000) => {
  const arrows: Array<{
    lat: number;
    lng: number;
    course: number;
    speed: number;
    createdAt: string;
  }> = [];

  const stops: Array<{
    lat: number;
    lng: number;
    createdAt: string;
  }> = [];

  if (!trip || trip.length === 0) return { arrows, stops };

  // 1. Always place an arrow at the very start
  const startPt = trip[0];
  arrows.push({
    lat: startPt.latitude,
    lng: startPt.longitude,
    course: startPt.course,
    speed: startPt.speed,
    createdAt: startPt.createdAt,
  });

  let distanceSinceLastArrow = 0;
  let lastPoint = trip[0];

  for (let i = 1; i < trip.length; i++) {
    const point = trip[i];
    const dist = getLatLngDistance(
      lastPoint.latitude,
      lastPoint.longitude,
      point.latitude,
      point.longitude
    );

    if (dist === 0) {
      lastPoint = point;
      continue;
    }

    let segmentCovered = 0;

    while (distanceSinceLastArrow + (dist - segmentCovered) >= arrowSpacing) {
      const distanceToNextArrow = arrowSpacing - distanceSinceLastArrow;
      segmentCovered += distanceToNextArrow;

      const fraction = segmentCovered / dist;

      const lat = lastPoint.latitude + (point.latitude - lastPoint.latitude) * fraction;
      const lng = lastPoint.longitude + (point.longitude - lastPoint.longitude) * fraction;

      const bearing = getBearing(
        [lastPoint.latitude, lastPoint.longitude],
        [point.latitude, point.longitude]
      );

      arrows.push({
        lat,
        lng,
        course: bearing,
        speed: point.speed,
        createdAt: point.createdAt,
      });

      distanceSinceLastArrow = 0;
    }

    distanceSinceLastArrow += (dist - segmentCovered);
    lastPoint = point;
  }

  // A stop dot goes at the end of the trip
  const endPoint = trip[trip.length - 1];
  stops.push({
    lat: endPoint.latitude,
    lng: endPoint.longitude,
    createdAt: endPoint.createdAt,
  });

  return { arrows, stops };
};

// Map route bounds updater
const RouteBoundsUpdater = ({
  routeData,
}: {
  routeData: any;
}) => {
  const map = useMap();

  useEffect(() => {
    if (!routeData?.deviceDataByTrips) return;
    
    // Flatten trips to compute global bounds
    const points = routeData.deviceDataByTrips.flat();
    if (points.length === 0) return;

    const bounds = L.latLngBounds(
      points.map((p: any) => [p.latitude, p.longitude] as [number, number])
    );

    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [60, 60],
        maxZoom: 15,
      });
    }
  }, [routeData, map]);

  return null;
};

const VehicleMap: React.FC<VehicleMapProps> = ({
  vehicles,
  center = [21.99099777777778, 78.92973111111111],
  zoom = 10,
  height = "h-[80vh]",
  onVehicleClick,
  selectedVehicleId,
  showTrails = false,
  clusterMarkers = true,
  autoFitBounds = false,
  activeFilter,
  selectedRouteData,
  onToggleAllInTable,
  isAllInTableActive,
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [shouldFitBounds, setShouldFitBounds] = useState(false);
  const [customColors, setCustomColors] = useState<Record<string, string>>({});
  const [showHistory, setShowHistory] = useState(false);
  const [showArrows, setShowArrows] = useState(false);
  const [showStoppages, setShowStoppages] = useState(false);
  const [mapType, setMapType] = useState<"roadmap" | "satellite">("roadmap");
  const [showTraffic, setShowTraffic] = useState(false);
  const [showMarkers, setShowMarkers] = useState(true);

  // Draggable Route Color Legend state & hooks
  const [showLegend, setShowLegend] = useState(false);
  const [hiddenRouteImeis, setHiddenRouteImeis] = useState<Record<string, boolean>>({});
  const legendPositionRef = useRef({ x: 20, y: 70 });
  const dragRef = useRef<HTMLDivElement>(null);
  const relRef = useRef<{ x: number; y: number } | null>(null);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only allow left-click drags
    const target = e.target as HTMLElement;
    if (target.closest(".close-legend-btn")) return; // Don't drag if clicking close button

    const rect = dragRef.current?.getBoundingClientRect();
    const parentRect = dragRef.current?.parentElement?.getBoundingClientRect();
    if (rect && parentRect) {
      relRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      e.preventDefault();
    }
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!relRef.current || !dragRef.current) return;
      const parentRect = dragRef.current.parentElement?.getBoundingClientRect();
      if (!parentRect) return;

      // Restrict within the parent map container bounds for professional confinement
      let newX = e.clientX - parentRect.left - relRef.current.x;
      let newY = e.clientY - parentRect.top - relRef.current.y;
      
      // Calculate boundaries
      const maxBoundX = parentRect.width - dragRef.current.offsetWidth - 10;
      const maxBoundY = parentRect.height - dragRef.current.offsetHeight - 10;
      
      newX = Math.max(10, Math.min(newX, maxBoundX));
      newY = Math.max(10, Math.min(newY, maxBoundY));

      // Update ref and DOM directly for butter-smooth 60fps drag without map re-renders
      legendPositionRef.current = { x: newX, y: newY };
      dragRef.current.style.left = `${newX}px`;
      dragRef.current.style.top = `${newY}px`;
    };

    const onMouseUp = () => {
      relRef.current = null;
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  useEffect(() => {
    fetch("/history-playback-data/metadata.json")
      .then((res) => {
        if (!res.ok) throw new Error("No metadata");
        return res.json();
      })
      .then((data) => {
        if (data) {
          setCustomColors(data);
        }
      })
      .catch((err) => {
        console.warn("Error loading metadata.json in VehicleMap:", err);
      });
  }, []);

  // Pre-sort all vehicle IDs alphabetically to generate stable golden-angle color indexes
  const sortedVehicleIds = useMemo(() => {
    return vehicles
      .map((v) => String(v.imei || v.uniqueId || v.deviceId || ""))
      .filter((id) => id !== "")
      .filter((value, idx, self) => self.indexOf(value) === idx)
      .sort();
  }, [vehicles]);

  const getRouteColorById = useCallback((id: string | number) => {
    const targetId = String(id);
    if (customColors && customColors[targetId]) {
      return customColors[targetId];
    }
    const index = sortedVehicleIds.indexOf(targetId);
    if (index >= 0) {
      // Golden angle multiplication (~137.508 degrees) creates absolute maximum visual distance
      const hue = (index * 137.508) % 360;
      // Alternate lightness between 50% and 60% for even higher visual contrast
      const lightness = index % 2 === 0 ? 50 : 60;
      return `hsl(${hue}, 85%, ${lightness}%)`;
    }
    return getUniqueRouteColor(id);
  }, [sortedVehicleIds, customColors]);

  // Find selected vehicle to generate its deterministic route color
  const selectedVehicle = useMemo(() => {
    return vehicles.find((v) => v.deviceId === selectedVehicleId);
  }, [vehicles, selectedVehicleId]);

  const isSelectedRouteVisible = useMemo(() => {
    if (!selectedVehicle) return false;
    const imei = String(selectedVehicle.uniqueId || selectedVehicle.imei);
    return !hiddenRouteImeis[imei];
  }, [selectedVehicle, hiddenRouteImeis]);

  const routeColor = useMemo(() => {
    if (!selectedVehicle) return "#3b82f6"; // Fallback color
    const id = selectedVehicle.imei || selectedVehicle.uniqueId || selectedVehicle.deviceId;
    return getRouteColorById(id);
  }, [selectedVehicle, getRouteColorById]);

  // Extract start and end coordinates of the selected route
  const routeMarkers = useMemo(() => {
    if (!selectedRouteData?.deviceDataByTrips) return null;
    const nonElTrips = selectedRouteData.deviceDataByTrips.filter((t: any) => t.length > 0);
    if (nonElTrips.length === 0) return null;

    const startPoint = nonElTrips[0][0];
    const lastTrip = nonElTrips[nonElTrips.length - 1];
    const endPoint = lastTrip[lastTrip.length - 1];

    return {
      start: startPoint ? { lat: startPoint.latitude, lng: startPoint.longitude } : null,
      end: endPoint ? { lat: endPoint.latitude, lng: endPoint.longitude } : null,
    };
  }, [selectedRouteData]);

  // Filter valid vehicles with memoization
  const validVehicles = useMemo(() => {
    return vehicles.filter(
      (vehicle) =>
        vehicle.latitude &&
        vehicle.longitude &&
        !isNaN(vehicle.latitude) &&
        !isNaN(vehicle.longitude) &&
        Math.abs(vehicle.latitude) <= 90 &&
        Math.abs(vehicle.longitude) <= 180
    );
  }, [vehicles]);

  const [routesMap, setRoutesMap] = useState<Record<string, any>>({});
  const requestedImeisRef = useRef<Set<string>>(new Set());

  
  const localUrl = process.env.NODE_ENV === "development"
    ? "http://localhost:5001"
    : (process.env.NEXT_PUBLIC_LOCAL_URL || (typeof window !== "undefined" ? `${window.location.origin}/local` : ""));


  // Automatically fetch route history for all visible valid vehicles
  useEffect(() => {
    if (validVehicles.length === 0) return;

    validVehicles.forEach((vehicle) => {
      const imei = String(vehicle.uniqueId || vehicle.imei);
      if (!imei || requestedImeisRef.current.has(imei)) return;

      requestedImeisRef.current.add(imei);

      fetch(`/history-playback-data/${imei}.json`)
        .then((res) => {
          if (!res.ok) {
            throw new Error("No route");
          }
          return res.json();
        })
        .then((data) => {
          if (data && data.success) {
            setRoutesMap((prev) => ({ ...prev, [imei]: data }));
          }
        })
        .catch(() => {
          // Silent catch - we already marked it as requested
        });
    });
  }, [validVehicles]);

  // Calculate map center efficiently
  const mapCenter = useMemo(() => {
    if (validVehicles.length === 0) return center;
    if (!isInitialLoad) return center;

    const avgLat =
      validVehicles.reduce((sum, v) => sum + v.latitude, 0) /
      validVehicles.length;
    const avgLng =
      validVehicles.reduce((sum, v) => sum + v.longitude, 0) /
      validVehicles.length;

    return [avgLat, avgLng] as [number, number];
  }, [validVehicles, center, isInitialLoad]);

  const handleVehicleClick = useCallback(
    (vehicle: VehicleData) => {
      onVehicleClick?.(vehicle);
    },
    [onVehicleClick]
  );

  // Handle initial load bounds fitting
  useEffect(() => {
    if (isInitialLoad && validVehicles.length > 0 && autoFitBounds) {
      setShouldFitBounds(true);
    }
  }, [isInitialLoad, validVehicles.length, autoFitBounds]);

  // Handle manual fit bounds
  const handleFitBounds = useCallback(() => {
    if (validVehicles.length > 0) {
      setShouldFitBounds(true);
    }
  }, [validVehicles.length]);

  // Trigger fit bounds when active filter changes
  useEffect(() => {
    if (validVehicles.length > 0) {
      setShouldFitBounds(true);
    }
  }, [activeFilter, validVehicles.length]);

  // Reset bounds fitting flag
  const handleBoundsFitted = useCallback(() => {
    setShouldFitBounds(false);
    if (isInitialLoad) {
      setIsInitialLoad(false);
    }
  }, [isInitialLoad]);

  // Render markers with or without clustering - optimized
  const renderMarkers = useMemo(() => {
    const markers = validVehicles.map((vehicle) => (
      <VehicleBusMarker
        key={`${vehicle.deviceId}-${vehicle?.uniqueId}`}
        vehicle={vehicle}
        onClick={handleVehicleClick}
        isSelected={selectedVehicleId === vehicle.deviceId}
      />
    ));

    // if (clusterMarkers && validVehicles.length > 10) {
    //   return (
    //     <MarkerClusterGroup
    //       disabled={!clusterMarkers || validVehicles.length <= 10}
    //       chunkedLoading
    //       iconCreateFunction={createClusterCustomIcon}
    //       maxClusterRadius={50}
    //       spiderfyOnMaxZoom={false}
    //       showCoverageOnHover={false}
    //       // zoomToBoundsOnClick={true}
    //       disableClusteringAtZoom={80}
    //     >
    //       {markers}
    //     </MarkerClusterGroup>
    //   );
    // }

    return markers;
  }, [validVehicles, handleVehicleClick, selectedVehicleId]);

  return (
    <div className="vehicle-map-container" style={{ height, width: "100%" }}>
      {/* Floating Map Controls - Right Side */}
      <div 
        className="map-controls-right" 
        style={{ 
          position: "absolute", 
          top: "10px", 
          right: "10px", 
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
          gap: "8px"
        }}
      >
        {/* Toggle Show All in Table */}
        {onToggleAllInTable && (
          <button
            className={`map-control-button ${isAllInTableActive ? "fit-bounds-btn" : ""}`}
            onClick={() => onToggleAllInTable(!isAllInTableActive)}
            title={isAllInTableActive ? "Show Paginated Routes" : "Show All Routes in Table"}
            data-tooltip={isAllInTableActive ? "Show Paginated Routes" : "Show All Routes in Table"}
            style={{
              width: "36px",
              height: "36px",
              padding: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "6px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
              cursor: "pointer",
              border: "none",
              backgroundColor: isAllInTableActive ? "#007bff" : "#ffffff",
              color: isAllInTableActive ? "#ffffff" : "#374151",
              transition: "all 0.2s ease"
            }}
          >
            <List size={20} className={isAllInTableActive ? "text-white" : "text-gray-700"} />
          </button>
        )}

        {/* Toggle Vehicle Markers */}
        <button
          className={`map-control-button ${showMarkers ? "fit-bounds-btn" : ""}`}
          onClick={() => setShowMarkers((prev) => !prev)}
          title={showMarkers ? "Hide Vehicle Markers" : "Show Vehicle Markers"}
          data-tooltip={showMarkers ? "Hide Vehicle Markers" : "Show Vehicle Markers"}
          style={{
            width: "36px",
            height: "36px",
            padding: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "6px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
            cursor: "pointer",
            border: "none",
            backgroundColor: showMarkers ? "#007bff" : "#ffffff",
            color: showMarkers ? "#ffffff" : "#374151",
            transition: "all 0.2s ease"
          }}
        >
          <Bus size={20} className={showMarkers ? "text-white" : "text-gray-700"} />
        </button>

        {/* Toggle History Route */}
        <button
          className={`map-control-button ${showHistory ? "fit-bounds-btn" : ""}`}
          onClick={() => setShowHistory((prev) => !prev)}
          title={showHistory ? "Hide Route History" : "Show Route History"}
          data-tooltip={showHistory ? "Hide Route History" : "Show Route History"}
          style={{
            width: "36px",
            height: "36px",
            padding: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "6px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
            cursor: "pointer",
            border: "none",
            backgroundColor: showHistory ? "#007bff" : "#ffffff",
            color: showHistory ? "#ffffff" : "#374151",
            transition: "all 0.2s ease"
          }}
        >
          <MdDirections size={22} className={showHistory ? "text-white" : "text-gray-700"} />
        </button>

        {/* Toggle Route Arrows */}
        <button
          className={`map-control-button ${showArrows ? "fit-bounds-btn" : ""}`}
          onClick={() => setShowArrows((prev) => !prev)}
          title={showArrows ? "Hide Route Arrows" : "Show Route Arrows"}
          data-tooltip={showArrows ? "Hide Route Arrows" : "Show Route Arrows"}
          style={{
            width: "36px",
            height: "36px",
            padding: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "6px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
            cursor: "pointer",
            border: "none",
            backgroundColor: showArrows ? "#007bff" : "#ffffff",
            color: showArrows ? "#ffffff" : "#374151",
            transition: "all 0.2s ease"
          }}
        >
          <Navigation size={18} className={`transform rotate-45 ${showArrows ? "text-white" : "text-gray-700"}`} />
        </button>

        {/* Toggle Stoppages */}
        <button
          className={`map-control-button ${showStoppages ? "fit-bounds-btn" : ""}`}
          onClick={() => setShowStoppages((prev) => !prev)}
          title={showStoppages ? "Hide Stoppages" : "Show Stoppages"}
          data-tooltip={showStoppages ? "Hide Stoppages" : "Show Stoppages"}
          style={{
            width: "36px",
            height: "36px",
            padding: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "6px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
            cursor: "pointer",
            border: "none",
            backgroundColor: showStoppages ? "#007bff" : "#ffffff",
            color: showStoppages ? "#ffffff" : "#374151",
            transition: "all 0.2s ease"
          }}
        >
          <MapPin size={18} className={showStoppages ? "text-white" : "text-gray-700"} />
        </button>

        {/* Toggle Satellite View */}
        <button
          className={`map-control-button ${mapType === "satellite" ? "fit-bounds-btn" : ""}`}
          onClick={() => setMapType((prev) => (prev === "roadmap" ? "satellite" : "roadmap"))}
          title={mapType === "satellite" ? "Roadmap View" : "Satellite View"}
          data-tooltip={mapType === "satellite" ? "Roadmap View" : "Satellite View"}
          style={{
            width: "36px",
            height: "36px",
            padding: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "6px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
            cursor: "pointer",
            border: "none",
            backgroundColor: mapType === "satellite" ? "#007bff" : "#ffffff",
            color: mapType === "satellite" ? "#ffffff" : "#374151",
            transition: "all 0.2s ease"
          }}
        >
          <Satellite size={20} className={mapType === "satellite" ? "text-white" : "text-gray-700"} />
        </button>

        {/* Toggle Traffic View */}
        <button
          className={`map-control-button ${showTraffic ? "fit-bounds-btn" : ""}`}
          onClick={() => setShowTraffic((prev) => !prev)}
          title={showTraffic ? "Hide Traffic" : "Show Traffic"}
          data-tooltip={showTraffic ? "Hide Traffic" : "Show Traffic"}
          style={{
            width: "36px",
            height: "36px",
            padding: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "6px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
            cursor: "pointer",
            border: "none",
            backgroundColor: showTraffic ? "#007bff" : "#ffffff",
            color: showTraffic ? "#ffffff" : "#374151",
            transition: "all 0.2s ease"
          }}
        >
          <LiaTrafficLightSolid className={`w-6 h-6 ${showTraffic ? "text-white" : "text-gray-700"}`} />
        </button>

        {/* Toggle Draggable Route Color Legend */}
        <button
          className={`map-control-button ${showLegend ? "fit-bounds-btn" : ""}`}
          onClick={() => setShowLegend((prev) => !prev)}
          title={showLegend ? "Hide Route Legend" : "Show Route Color Legend"}
          data-tooltip={showLegend ? "Hide Route Legend" : "Show Route Color Legend"}
          style={{
            width: "36px",
            height: "36px",
            padding: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "6px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
            cursor: "pointer",
            border: "none",
            backgroundColor: showLegend ? "#007bff" : "#ffffff",
            color: showLegend ? "#ffffff" : "#374151",
            transition: "all 0.2s ease"
          }}
        >
          <Palette size={20} className={showLegend ? "text-white" : "text-gray-700"} />
        </button>
      </div>

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
          url={
            mapType === "satellite"
              ? "https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
              : "https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
          }
          subdomains={["mt0", "mt1", "mt2", "mt3"]}
          maxZoom={19}
        />

        {showTraffic && (
          <TileLayer
            url="https://{s}.google.com/vt/lyrs=h,traffic&x={x}&y={y}&z={z}"
            subdomains={["mt0", "mt1", "mt2", "mt3"]}
            maxZoom={19}
          />
        )}

        {/* Handle container resize issues */}
        <MapResizeHandler />

        {/* Handle vehicle selection and zoom */}
        <VehicleZoomHandler
          selectedVehicleId={selectedVehicleId}
          vehicles={validVehicles}
        />

        {/* Handle bounds fitting */}
        <MapBoundsUpdater
          vehicles={validVehicles}
          shouldFitBounds={shouldFitBounds}
          onBoundsFitted={handleBoundsFitted}
        />

        {/* Render optimized markers */}
        {showMarkers && renderMarkers}

        {/* Render travelled routes for all loaded vehicles automatically */}
        {showHistory && Object.entries(routesMap).map(([imei, routeData]: [string, any]) => {
          if (!routeData?.deviceDataByTrips) return null;
          if (hiddenRouteImeis[imei]) return null;

          const isSelected = selectedVehicle && String(selectedVehicle.uniqueId || selectedVehicle.imei) === imei;
          const color = getRouteColorById(imei);

          return (
            <React.Fragment key={`route-group-${imei}`}>
              {routeData.deviceDataByTrips.map((trip: any, tripIndex: number) => {
                const positions = trip.map((pt: any) => [pt.latitude, pt.longitude] as [number, number]);
                const { arrows, stops } = computeRouteDecorations(trip, 1000);

                return (
                  <React.Fragment key={`route-trip-group-${imei}-${tripIndex}`}>
                    <Polyline
                      key={`route-trip-${imei}-${tripIndex}`}
                      positions={positions}
                      pathOptions={{
                        color: color,
                        weight: isSelected ? 6 : 4, // highlight selected route slightly thicker
                        opacity: isSelected ? 0.95 : 0.7, // dim non-selected routes slightly for visual balance
                        lineJoin: "round",
                        lineCap: "round",
                      }}
                    />
                    {/* Directional Arrows at 1 km spacing */}
                    {showArrows && arrows.map((arrow, arrowIdx) => (
                      <Marker
                        key={`arrow-${imei}-${tripIndex}-${arrowIdx}`}
                        position={[arrow.lat, arrow.lng]}
                        icon={createArrowIcon(arrow.course, color, 24)}
                        zIndexOffset={200}
                      >
                        <Popup maxWidth={200}>
                          <div style={{ fontFamily: "sans-serif", padding: "4px" }}>
                            <strong>Vehicle speed:</strong> ~{arrow.speed?.toFixed(1) || "0.0"} km/h
                            <br />
                            <strong>Time:</strong> {new Date(arrow.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                    {/* Easy to spot Stop Dots at every stop */}
                    {showStoppages && stops.map((stop, stopIdx) => (
                      <Marker
                        key={`stop-${imei}-${tripIndex}-${stopIdx}`}
                        position={[stop.lat, stop.lng]}
                        icon={createStopDotIcon()}
                        zIndexOffset={300}
                      >
                        <Popup maxWidth={200}>
                          <div style={{ fontFamily: "sans-serif", padding: "4px", textAlign: "center" }}>
                            <strong style={{ color: "#ef4444" }}>Stop Dot</strong>
                            <div style={{ fontSize: "11px", color: "#666", marginTop: "4px" }}>
                              Stopped at: {new Date(stop.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </React.Fragment>
                );
              })}
            </React.Fragment>
          );
        })}

        {/* Start/End flag markers */}
        {showHistory && isSelectedRouteVisible && routeMarkers?.start && (
          <Marker
            position={[routeMarkers.start.lat, routeMarkers.start.lng]}
            icon={createRouteFlagIcon("green", 34)}
          >
            <Popup maxWidth={200}>
              <div style={{ textAlign: "center", fontFamily: "sans-serif" }}>
                <strong style={{ color: "#10b981" }}>Start Point</strong>
                <div style={{ fontSize: "11px", color: "#666", marginTop: "4px" }}>
                  📍 {routeMarkers.start.lat.toFixed(6)}, {routeMarkers.start.lng.toFixed(6)}
                </div>
              </div>
            </Popup>
          </Marker>
        )}
        {showHistory && isSelectedRouteVisible && routeMarkers?.end && (
          <Marker
            position={[routeMarkers.end.lat, routeMarkers.end.lng]}
            icon={createRouteFlagIcon("red", 34)}
          >
            <Popup maxWidth={200}>
              <div style={{ textAlign: "center", fontFamily: "sans-serif" }}>
                <strong style={{ color: "#ef4444" }}>End Point</strong>
                <div style={{ fontSize: "11px", color: "#666", marginTop: "4px" }}>
                  📍 {routeMarkers.end.lat.toFixed(6)}, {routeMarkers.end.lng.toFixed(6)}
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Route auto-bounding */}
        {showHistory && isSelectedRouteVisible && <RouteBoundsUpdater routeData={selectedRouteData} />}
      </MapContainer>

      {/* Draggable Route Color Legend Panel */}
      {showLegend && (
        <div
          ref={dragRef}
          style={{
            position: "absolute",
            left: `${legendPositionRef.current.x}px`,
            top: `${legendPositionRef.current.y}px`,
            zIndex: 1000,
            width: "280px",
            maxHeight: "350px",
            backgroundColor: "rgba(255, 255, 255, 0.85)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderRadius: "12px",
            border: "1px solid rgba(255, 255, 255, 0.4)",
            boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.15)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            fontFamily: "'Inter', sans-serif"
          }}
          className="vehicle-legend-panel animate-in fade-in zoom-in-95 duration-200"
        >
          {/* Drag Header */}
          <div
            onMouseDown={onMouseDown}
            style={{
              padding: "10px 14px",
              background: "rgba(243, 244, 246, 0.8)",
              borderBottom: "1px solid rgba(229, 231, 235, 0.6)",
              cursor: "move",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              userSelect: "none"
            }}
            className="legend-header"
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600, fontSize: "13px", color: "#1f2937" }}>
              <Palette size={16} style={{ color: "#3b82f6" }} />
              <span>Vehicle Route Colors</span>
            </div>
            <button
              onClick={() => setShowLegend(false)}
              className="close-legend-btn"
              style={{
                border: "none",
                background: "none",
                cursor: "pointer",
                padding: "2px",
                color: "#9ca3af",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "4px",
                transition: "background-color 0.2s"
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.05)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <X size={16} />
            </button>
          </div>

          {/* Vehicle List */}
          <div
            style={{
              padding: "10px 14px",
              overflowY: "auto",
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: "8px"
            }}
            className="legend-body"
          >
            {Object.keys(routesMap).length === 0 ? (
              <div style={{ fontSize: "12px", color: "#6b7280", textAlign: "center", padding: "10px 0" }}>
                No active routes rendered.
              </div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", paddingBottom: "6px", borderBottom: "1px dashed rgba(229, 231, 235, 0.6)" }}>
                  <button
                    onClick={() => {
                      const allHidden: Record<string, boolean> = {};
                      Object.keys(routesMap).forEach((imei) => {
                        allHidden[imei] = true;
                      });
                      setHiddenRouteImeis(allHidden);
                    }}
                    style={{
                      fontSize: "11px",
                      color: "#ef4444",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontWeight: 600,
                      padding: "2px 6px",
                      borderRadius: "4px",
                      transition: "background-color 0.2s"
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.08)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    Hide All
                  </button>
                  <button
                    onClick={() => {
                      setHiddenRouteImeis({});
                    }}
                    style={{
                      fontSize: "11px",
                      color: "#3b82f6",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontWeight: 600,
                      padding: "2px 6px",
                      borderRadius: "4px",
                      transition: "background-color 0.2s"
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(59, 130, 246, 0.08)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    Show All
                  </button>
                </div>
                {Object.entries(routesMap).map(([imei, routeData]: [string, any]) => {
                // Find matching vehicle
                const vehicle = validVehicles.find(
                  (v) => String(v.uniqueId || v.imei) === imei
                );
                if (!vehicle) return null;
                
                const color = getRouteColorById(imei);

                return (
                  <div
                    key={`legend-item-${imei}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "6px 8px",
                      borderRadius: "6px",
                      backgroundColor: "rgba(255, 255, 255, 0.5)",
                      border: "1px solid rgba(229, 231, 235, 0.4)",
                      fontSize: "12px"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: 1 }}>
                      <span
                        style={{
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          backgroundColor: color,
                          flexShrink: 0,
                          boxShadow: "0 0 4px rgba(0, 0, 0, 0.15)"
                        }}
                      />
                      <span style={{ fontWeight: 500, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {vehicle.name || `Vehicle ${vehicle.deviceId}`}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "10px", color: "#9ca3af" }}>
                        {imei.slice(-6)}
                      </span>
                      <button
                        onClick={() => {
                          setHiddenRouteImeis((prev) => ({
                            ...prev,
                            [imei]: !prev[imei],
                          }));
                        }}
                        style={{
                          border: "none",
                          background: "none",
                          cursor: "pointer",
                          padding: "2px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: hiddenRouteImeis[imei] ? "#9ca3af" : "#3b82f6",
                          transition: "color 0.2s"
                        }}
                        title={hiddenRouteImeis[imei] ? "Show route" : "Hide route"}
                      >
                        {hiddenRouteImeis[imei] ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </>
            )}
          </div>
        </div>
      )}

      {/* Map Controls */}
      {/* <MapControls
        onFitBounds={handleFitBounds}
        vehicleCount={validVehicles.length}
      /> */}
    </div>
  );
};

export default VehicleMap;
