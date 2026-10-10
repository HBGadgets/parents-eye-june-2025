import React, {
  useEffect,
  useRef,
  useMemo,
  useCallback,
  useState,
  useLayoutEffect,
} from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, Tooltip, Circle } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./VehicleMap.css";
import { calculateTimeSince } from "@/util/calculateTimeSince";
import { Satellite, List, Palette, X, Navigation, MapPin, Eye, EyeOff, Locate, Bus, Search, Calendar, Loader2 } from "lucide-react";
import { LiaTrafficLightSolid } from "react-icons/lia";
import { MdDirections } from "react-icons/md";
import { reportService } from "@/services/api/reportService";
import { geofenceService } from "@/services/api/geofenceSerevice";
import { Geofence } from "@/interface/modal";
import { getYesterdayDateRange, getYesterdayDateString, getTodayDateString, getDateRangeForDay } from "@/util/dateFormatters";
import { useAuthStore } from "@/store/authStore";
import StopChildrenList from "./route/StopChildrenList";

const ROUTE_STATUS_CONFIG: Record<
  string,
  { bg: string; text: string; dot: string; label: string }
> = {
  running: { bg: "#ecfdf5", text: "#059669", dot: "#10b981", label: "Running" },
  idle: { bg: "#fffbeb", text: "#d97706", dot: "#f59e0b", label: "Idle" },
  stopped: { bg: "#fef2f2", text: "#dc2626", dot: "#ef4444", label: "Stopped" },
  inactive: { bg: "#f3f4f6", text: "#4b5563", dot: "#9ca3af", label: "Inactive" },
  overspeed: { bg: "#fff7ed", text: "#c2410c", dot: "#f97316", label: "Overspeed" },
  overspeeding: { bg: "#fff7ed", text: "#c2410c", dot: "#f97316", label: "Overspeed" },
  new: { bg: "#eff6ff", text: "#2563eb", dot: "#3b82f6", label: "New" },
};

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
  routeName?: string;
  noOfStudent?: number | string;
  noOfStops?: number | string;
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
  userRole?: string;
}

// Optimized marker component with proper memoization
const VehicleBusMarker = React.memo(
  ({
    vehicle,
    onClick,
    isSelected,
    stoppageData,
    onStoppageClick,
  }: {
    vehicle: VehicleData;
    onClick?: (vehicle: VehicleData) => void;
    isSelected?: boolean;
    stoppageData?: {
      stops: Geofence[];
      startPoint: Geofence | null;
      endPoint: Geofence | null;
    };
    onStoppageClick?: (stoppageKey: string, coords: [number, number]) => void;
  }) => {
    const orderedStoppages = useMemo(() => {
      if (!stoppageData) return [];
      const list: Array<{
        item: any;
        type: "start" | "stop" | "end";
        stopNumber?: number;
      }> = [];

      const startId = stoppageData.startPoint?._id ?? (stoppageData.startPoint as any)?.id;
      const endId = stoppageData.endPoint?._id ?? (stoppageData.endPoint as any)?.id;

      if (stoppageData.startPoint) {
        list.push({ item: stoppageData.startPoint, type: "start" });
      }

      let num = 1;
      (stoppageData.stops || []).forEach((st) => {
        const stId = st._id ?? (st as any)?.id;
        if (startId && stId === startId) return;
        if (endId && stId === endId) return;
        list.push({ item: st, type: "stop", stopNumber: num++ });
      });

      if (stoppageData.endPoint) {
        list.push({ item: stoppageData.endPoint, type: "end" });
      }

      return list;
    }, [stoppageData]);

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
      const rawCat = (vehicle.category || "").toLowerCase();
      const rawStatus = (vehicle.status || "").toLowerCase();
      if (
        vehicle.speed > speedLimit ||
        rawCat.includes("overspeed") ||
        rawStatus.includes("overspeed")
      ) {
        return "overspeeding";
      }

      // Extract vehicle attributes
      const { ignition, motion } = vehicle.attributes || {};
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

      if (rawCat.includes("run") || rawStatus.includes("run")) return "running";
      if (rawCat.includes("stop") || rawStatus.includes("stop")) return "stopped";
      if (rawCat.includes("idle") || rawStatus.includes("idle")) return "idle";
      if (rawCat.includes("inact") || rawStatus.includes("inact")) return "inactive";
      if (rawCat.includes("new") || rawStatus.includes("new")) return "new";

      return "new";
    }, [
      vehicle.speed,
      vehicle.speedLimit,
      vehicle.lastUpdate,
      vehicle.attributes?.ignition,
      vehicle.category,
      vehicle.status,
      vehicle.latitude,
      vehicle.longitude,
    ]);

    // Memoize image URL
    const imageUrl = useMemo(() => {
      const statusToImageUrl: Record<string, string> = {
        running: "/BUS/top-view/green.svg",
        idle: "/BUS/top-view/yellow.svg",
        stopped: "/BUS/top-view/red.svg",
        inactive: "/BUS/top-view/gray.svg",
        overspeeding: "/BUS/top-view/orange.svg",
        overspeed: "/BUS/top-view/orange.svg",
        new: "/BUS/top-view/blue.svg",
        noData: "/BUS/top-view/blue.svg",
      };

      const speedLimit = parseFloat(vehicle.speedLimit) || 60;
      const rawCat = (vehicle.category || "").toLowerCase();
      const rawStatus = (vehicle.status || "").toLowerCase();

      // 1. Direct check: is vehicle overspeeding by speed limit or category/status?
      if (
        vehicle.speed > speedLimit ||
        rawCat.includes("overspeed") ||
        rawStatus.includes("overspeed") ||
        vehicleStatus === "overspeeding" ||
        vehicleStatus === "overspeed"
      ) {
        return "/BUS/top-view/orange.svg";
      }

      // 2. Check computed vehicleStatus
      if (vehicleStatus && statusToImageUrl[vehicleStatus]) {
        return statusToImageUrl[vehicleStatus];
      }

      // 3. Fallback to category / status
      if (rawCat && statusToImageUrl[rawCat]) {
        return statusToImageUrl[rawCat];
      }
      if (rawStatus && statusToImageUrl[rawStatus]) {
        return statusToImageUrl[rawStatus];
      }

      return statusToImageUrl.new;
    }, [
      vehicle.speed,
      vehicle.speedLimit,
      vehicle.category,
      vehicle.status,
      vehicleStatus,
    ]);

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
      const statusMap: Record<string, { text: string; color: string }> = {
        running: { text: "Running", color: "#28a745" },
        idle: { text: "Idle", color: "#ffc107" },
        stopped: { text: "Stopped", color: "#dc3545" },
        inactive: { text: "Inactive", color: "#666666" },
        overspeeding: { text: "Overspeeding", color: "#fd7e14" },
        overspeed: { text: "Overspeeding", color: "#fd7e14" },
        new: { text: "New", color: "#2196f3" },
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
        <Popup maxWidth={290} className="vehicle-popup" maxHeight={300} autoPan={false}>
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
              {vehicle.routeName && (
                <div className="detail-row">
                  <span className="label">Route No:</span>
                  <span className="value">{vehicle.routeName}</span>
                </div>
              )}
              {vehicle.noOfStudent !== undefined && vehicle.noOfStudent !== null && (
                <div className="detail-row">
                  <span className="label">No. of Students:</span>
                  <span className="value">{vehicle.noOfStudent}</span>
                </div>
              )}
              {vehicle.noOfStops !== undefined && vehicle.noOfStops !== null && (
                <div className="detail-row">
                  <span className="label">No. of Stops:</span>
                  <span className="value">{vehicle.noOfStops}</span>
                </div>
              )}
              {orderedStoppages.length > 0 && (
                <div style={{ marginTop: "6px", borderTop: "1px dashed #e5e7eb", paddingTop: "5px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 600, color: "#374151" }}>
                      Stoppages ({orderedStoppages.length}):
                    </span>
                    <span style={{ fontSize: "9px", color: "#9ca3af" }}>Click stop to zoom</span>
                  </div>
                  <div style={{ maxHeight: "110px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "2px" }}>
                    {orderedStoppages.map((st, sIdx) => {
                      const coords = getGeofenceCoords(st.item);
                      const stoppageKey = `${String(vehicle.uniqueId || vehicle.imei)}-${st.type}-${st.item._id || (st.item as any)?.id || sIdx}`;
                      return (
                        <div
                          key={sIdx}
                          onClick={(e) => {
                            if (coords && onStoppageClick) {
                              e.stopPropagation();
                              onStoppageClick(stoppageKey, coords);
                            }
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "10px",
                            padding: "2px 4px",
                            backgroundColor: "#f9fafb",
                            borderRadius: "3px",
                            cursor: coords ? "pointer" : "default",
                            transition: "background-color 0.15s ease",
                          }}
                          onMouseEnter={(e) => {
                            if (coords) e.currentTarget.style.backgroundColor = "#eff6ff";
                          }}
                          onMouseLeave={(e) => {
                            if (coords) e.currentTarget.style.backgroundColor = "#f9fafb";
                          }}
                          title={coords ? `Click to zoom & open popup: ${st.item.geofenceName || "Stop"}` : undefined}
                        >
                          <span
                            style={{
                              fontSize: "8px",
                              fontWeight: 700,
                              padding: "1px 3px",
                              borderRadius: "2px",
                              backgroundColor:
                                st.type === "start"
                                  ? "#ecfdf5"
                                  : st.type === "end"
                                  ? "#fef2f2"
                                  : "#eff6ff",
                              color:
                                st.type === "start"
                                  ? "#059669"
                                  : st.type === "end"
                                  ? "#dc2626"
                                  : "#2563eb",
                            }}
                          >
                            {st.type === "start" ? "S" : st.type === "end" ? "E" : `#${st.stopNumber}`}
                          </span>
                          <span
                            style={{
                              fontWeight: 500,
                              color: "#1f2937",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              flex: 1,
                            }}
                          >
                            {st.item.geofenceName || "Stop"}
                          </span>
                          {st.item.pickupTime && (
                            <span style={{ color: "#059669", fontSize: "9px" }}>
                              {st.item.pickupTime}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
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
    if (!shouldFitBounds) return;

    if (vehicles.length > 0) {
      const bounds = L.latLngBounds(
        vehicles.map((v) => [v.latitude, v.longitude] as [number, number])
      );

      if (bounds.isValid()) {
        map.fitBounds(bounds, {
          padding: [20, 20],
          maxZoom: 15,
        });
      }
    }

    onBoundsFitted();
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

const arrowIconCache = new Map<string, L.DivIcon>();

const createArrowIcon = (course: number, color: string = "#3b82f6", size: number = 20) => {
  const roundedCourse = Math.round(course / 10) * 10;
  const cacheKey = `${roundedCourse}_${color}_${size}`;
  let icon = arrowIconCache.get(cacheKey);
  if (!icon) {
    icon = L.divIcon({
      className: "course-arrow",
      html: `
        <div style="transform: rotate(${roundedCourse + 180}deg); width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center; pointer-events: none;">
          <div style="display: flex; flex-direction: column; align-items: center; margin-top: -2px;">
            <svg width="${Math.round(size * 0.75)}" height="${Math.round(size * 0.75)}" viewBox="0 0 24 24" fill="none" style="filter: drop-shadow(0px 1px 2px rgba(0,0,0,0.5));">
              <path d="M7 6L12 11L17 6" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M7 14L12 19L17 14" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </div>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
    arrowIconCache.set(cacheKey, icon);
  }
  return icon;
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

const isValidGeofencePoint = (geo?: any) => {
  if (!geo) return false;
  const id = geo._id ?? geo.id;
  if (!id || id === "null") return false;
  return true;
};

const getGeofenceCoords = (geofence: any): [number, number] | null => {
  if (!geofence) return null;
  if (
    geofence.area?.center &&
    Array.isArray(geofence.area.center) &&
    geofence.area.center.length >= 2
  ) {
    const lat = Number(geofence.area.center[0]);
    const lng = Number(geofence.area.center[1]);
    if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return [lat, lng];
    }
  }
  if (geofence.latitude !== undefined && geofence.longitude !== undefined) {
    const lat = Number(geofence.latitude);
    const lng = Number(geofence.longitude);
    if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return [lat, lng];
    }
  }
  if (geofence.lat !== undefined && geofence.lng !== undefined) {
    const lat = Number(geofence.lat);
    const lng = Number(geofence.lng);
    if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return [lat, lng];
    }
  }
  return null;
};

const createMapStoppageIcon = (
  type: "start" | "stop" | "end",
  stopNumber?: number,
  color: string = "#2563eb"
) => {
  const isStart = type === "start";
  const isEnd = type === "end";
  const label = isStart ? "S" : isEnd ? "E" : String(stopNumber ?? "");
  const bgColor = isStart ? "#059669" : isEnd ? "#dc2626" : color;

  return L.divIcon({
    className: "custom-stoppage-pin",
    html: `
      <div style="position: relative; width: 30px; height: 38px; display: flex; flex-direction: column; align-items: center; filter: drop-shadow(0 3px 6px rgba(0,0,0,0.35)); cursor: pointer;">
        <div style="
          width: 28px;
          height: 28px;
          background: ${bgColor};
          border: 2px solid #ffffff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-weight: 800;
          font-size: ${label.length > 2 ? "10px" : "12px"};
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          box-shadow: inset 0 1px 2px rgba(255,255,255,0.35);
          z-index: 2;
        ">
          ${label}
        </div>
        <div style="
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 8px solid ${bgColor};
          margin-top: -2px;
          z-index: 1;
        "></div>
      </div>
    `,
    iconSize: [30, 38],
    iconAnchor: [15, 36],
    popupAnchor: [0, -36],
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

// Fast distance & angle downsampling for map polylines
// Retains points where distance >= toleranceMeters, plus first and last points
const simplifyTripPoints = (
  points: Array<{ latitude: number; longitude: number }>,
  toleranceMeters: number = 8
): [number, number][] => {
  if (!points || points.length === 0) return [];
  if (points.length <= 2) {
    return points.map((p) => [p.latitude, p.longitude] as [number, number]);
  }

  const result: [number, number][] = [[points[0].latitude, points[0].longitude]];
  let prevLat = points[0].latitude;
  let prevLng = points[0].longitude;

  // Approx conversion: 1 deg lat ~ 111,000m, 1 deg lng ~ 111,000m * cos(lat)
  const latFactor = 111000;
  const lngFactor = 111000 * Math.cos((prevLat * Math.PI) / 180);
  const tolSq = toleranceMeters * toleranceMeters;

  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i];
    const dy = (p.latitude - prevLat) * latFactor;
    const dx = (p.longitude - prevLng) * lngFactor;
    const distSq = dx * dx + dy * dy;

    if (distSq >= tolSq) {
      result.push([p.latitude, p.longitude]);
      prevLat = p.latitude;
      prevLng = p.longitude;
    }
  }

  // Always keep the final point
  const last = points[points.length - 1];
  result.push([last.latitude, last.longitude]);
  return result;
};

interface ProcessedTrip {
  positions: [number, number][];
  rawTrip: any[];
}

const RouteArrows = React.memo(
  ({
    trip,
    color,
    arrowSpacing,
    imei,
    tripIndex,
    isSelected,
    totalRoutesCount,
  }: {
    trip: any[];
    color: string;
    arrowSpacing: number;
    imei: string;
    tripIndex: number;
    isSelected: boolean;
    totalRoutesCount: number;
  }) => {
    const map = useMap();
    const [mapState, setMapState] = useState(() => ({
      zoom: map.getZoom(),
      bounds: map.getBounds(),
    }));

    useEffect(() => {
      const update = () => {
        setMapState({
          zoom: map.getZoom(),
          bounds: map.getBounds(),
        });
      };
      // Only fire after user finishes panning/zooming - NEVER on every drag frame!
      map.on("moveend", update);
      map.on("zoomend", update);
      return () => {
        map.off("moveend", update);
        map.off("zoomend", update);
      };
    }, [map]);

    // For large fleets (> 5 routes), non-selected routes don't render arrows when zoomed out (< 13)
    if (!isSelected && totalRoutesCount > 5 && mapState.zoom < 13) {
      return null;
    }

    // Quick bounding box check: if trip is completely off-screen, skip
    if (trip.length > 0) {
      const first = trip[0];
      const last = trip[trip.length - 1];
      const minLat = Math.min(first.latitude, last.latitude);
      const maxLat = Math.max(first.latitude, last.latitude);
      const minLng = Math.min(first.longitude, last.longitude);
      const maxLng = Math.max(first.longitude, last.longitude);
      const approxBounds = L.latLngBounds([minLat, minLng], [maxLat, maxLng]);
      if (
        !mapState.bounds.intersects(approxBounds) &&
        !mapState.bounds.contains([first.latitude, first.longitude]) &&
        !mapState.bounds.contains([last.latitude, last.longitude])
      ) {
        return null;
      }
    }

    const effectiveSpacing = isSelected ? arrowSpacing : Math.max(arrowSpacing, 3500);
    const { arrows } = computeRouteDecorations(trip, effectiveSpacing);

    // Only render arrows within current viewport bounds, max 4 per non-selected trip, 8 for selected
    const visibleArrows = arrows
      .filter((a) => mapState.bounds.contains([a.lat, a.lng]))
      .slice(0, isSelected ? 8 : 4);

    if (visibleArrows.length === 0) return null;

    return (
      <>
        {visibleArrows.map((arrow, arrowIdx) => (
          <Marker
            key={`arrow-${imei}-${tripIndex}-${arrowIdx}`}
            position={[arrow.lat, arrow.lng]}
            icon={createArrowIcon(arrow.course, color, 18)}
            zIndexOffset={isSelected ? 300 : 100}
            interactive={false}
          />
        ))}
      </>
    );
  }
);

const VehicleRouteItem = React.memo(
  ({
    imei,
    trips,
    color,
    isSelected,
    vehicleName,
    routeName,
    noOfStudent,
    noOfStops,
    showArrows,
    totalRoutesCount,
  }: {
    imei: string;
    trips: ProcessedTrip[];
    color: string;
    isSelected: boolean;
    vehicleName: string;
    routeName?: string;
    noOfStudent?: string | number;
    noOfStops?: string | number;
    showArrows: boolean;
    totalRoutesCount: number;
  }) => {
    const arrowSpacing = totalRoutesCount > 50 ? 5000 : 1500;

    return (
      <React.Fragment key={`route-group-${imei}`}>
        {trips.map((tripObj, tripIndex) => {
          const { positions, rawTrip } = tripObj;
          if (positions.length < 2) return null;

          return (
            <React.Fragment key={`route-trip-group-${imei}-${tripIndex}`}>
              <Polyline
                key={`route-trip-${imei}-${tripIndex}`}
                positions={positions}
                pathOptions={{
                  color: color,
                  weight: isSelected ? 6 : 4,
                  opacity: isSelected ? 0.95 : 0.75,
                  lineJoin: "round",
                  lineCap: "round",
                  smoothFactor: 1.5,
                }}
              >
                <Tooltip
                  direction="top"
                  opacity={0.95}
                  sticky={totalRoutesCount < 50}
                >
                  <div
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      padding: "4px 8px",
                      fontSize: "12px",
                      lineHeight: "1.4",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 600,
                        color: "#111827",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <span
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          backgroundColor: color,
                          display: "inline-block",
                        }}
                      />
                      <span>{vehicleName}</span>
                    </div>
                    <div
                      style={{
                        marginTop: "4px",
                        fontSize: "11px",
                        color: "#374151",
                        display: "flex",
                        flexDirection: "column",
                        gap: "2px",
                      }}
                    >
                      {routeName && (
                        <div>
                          <strong>Route No:</strong> {routeName}
                        </div>
                      )}
                      {noOfStudent !== undefined && (
                        <div>
                          <strong>No. of Students:</strong> {noOfStudent}
                        </div>
                      )}
                      {noOfStops !== undefined && (
                        <div>
                          <strong>No. of Stops:</strong> {noOfStops}
                        </div>
                      )}
                    </div>
                  </div>
                </Tooltip>
              </Polyline>

              {showArrows && (
                <RouteArrows
                  trip={rawTrip}
                  color={color}
                  arrowSpacing={arrowSpacing}
                  imei={imei}
                  tripIndex={tripIndex}
                  isSelected={isSelected}
                  totalRoutesCount={totalRoutesCount}
                />
              )}
            </React.Fragment>
          );
        })}
      </React.Fragment>
    );
  },
  (prev, next) => {
    return (
      prev.imei === next.imei &&
      prev.color === next.color &&
      prev.isSelected === next.isSelected &&
      prev.showArrows === next.showArrows &&
      prev.trips === next.trips &&
      prev.vehicleName === next.vehicleName &&
      prev.routeName === next.routeName &&
      prev.noOfStudent === next.noOfStudent &&
      prev.noOfStops === next.noOfStops &&
      prev.totalRoutesCount === next.totalRoutesCount
    );
  }
);

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
  onVehicleSelect,
  showTrails = false,
  clusterMarkers = true,
  autoFitBounds = false,
  activeFilter,
  selectedRouteData,
  onToggleAllInTable,
  isAllInTableActive,
  userRole: userRoleProp,
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const { decodedToken } = useAuthStore();
  const rawRole = (userRoleProp || decodedToken?.role || "").toLowerCase();
  const isRouteDisabled = [
    "superadmin",
  ].includes(rawRole);

  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [shouldFitBounds, setShouldFitBounds] = useState(false);
  const [customColors, setCustomColors] = useState<Record<string, string>>({});
  const [showHistory, setShowHistory] = useState(false);
  const [isFetchingRoutes, setIsFetchingRoutes] = useState(false);
  const [showArrows, setShowArrows] = useState(false);
  const [showStoppages, setShowStoppages] = useState(false);
  const [mapType, setMapType] = useState<"roadmap" | "satellite">("roadmap");
  const [stoppagesMap, setStoppagesMap] = useState<
    Record<
      string,
      {
        stops: Geofence[];
        startPoint: Geofence | null;
        endPoint: Geofence | null;
        vehicle: VehicleData;
      }
    >
  >({});
  const [isFetchingStoppages, setIsFetchingStoppages] = useState(false);
  const requestedStoppageImeisRef = useRef<Set<string>>(new Set());
  const [selectedStoppageImei, setSelectedStoppageImei] = useState<string | null>(null);
  const [stoppageSearch, setStoppageSearch] = useState("");
  const stoppageMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const [activeStoppageKey, setActiveStoppageKey] = useState<string | null>(null);
  const [selectedGeofenceId, setSelectedGeofenceId] = useState<string | null>(null);

  const handleStoppageClick = useCallback(
    (stoppageKey: string, coords: [number, number], geofenceId?: string) => {
      setShowStoppages(true);
      setActiveStoppageKey(stoppageKey);
      if (geofenceId) {
        setSelectedGeofenceId(geofenceId);
      }
      if (mapRef.current) {
        const map = mapRef.current;
        map.flyTo(coords, 17, { animate: true, duration: 0.8 });

        const openTargetPopup = () => {
          const marker = stoppageMarkersRef.current.get(stoppageKey);
          if (marker) {
            marker.openPopup();
          }
        };

        map.once("moveend", openTargetPopup);
        setTimeout(openTargetPopup, 350);
        setTimeout(openTargetPopup, 850);
      }
    },
    []
  );

  useEffect(() => {
    if (!activeStoppageKey) return;
    const timer = setTimeout(() => {
      const marker = stoppageMarkersRef.current.get(activeStoppageKey);
      if (marker) {
        marker.openPopup();
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [activeStoppageKey, showStoppages, stoppagesMap]);

  const [showTraffic, setShowTraffic] = useState(false);
  const [showMarkers, setShowMarkers] = useState(true);

  // Draggable Route Color Legend state & hooks
  const [showLegend, setShowLegend] = useState(false);

  useEffect(() => {
    if (isRouteDisabled) {
      if (showHistory) setShowHistory(false);
      if (showArrows) setShowArrows(false);
      if (showLegend) setShowLegend(false);
    }
  }, [isRouteDisabled, showHistory, showArrows, showLegend]);
  const [hiddenRouteImeis, setHiddenRouteImeis] = useState<Record<string, boolean>>({});
  const [legendSearch, setLegendSearch] = useState("");
  const [legendVisibilityFilter, setLegendVisibilityFilter] = useState<"all" | "visible" | "hidden">("all");
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

  // Draggable Route Stoppages Panel refs & mouse handlers
  const stoppagePanelPosRef = useRef({ x: 335, y: 70 });
  const stoppageDragRef = useRef<HTMLDivElement>(null);
  const stoppageRelRef = useRef<{ x: number; y: number } | null>(null);

  const onStoppageMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (
      target.closest(".close-stoppage-btn") ||
      target.closest("button") ||
      target.closest("input")
    )
      return;

    const rect = stoppageDragRef.current?.getBoundingClientRect();
    const parentRect = stoppageDragRef.current?.parentElement?.getBoundingClientRect();
    if (rect && parentRect) {
      stoppageRelRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      e.preventDefault();
    }
  }, []);

  // Position stoppage panel beside legend panel when opened
  useEffect(() => {
    if (selectedStoppageImei && stoppageDragRef.current) {
      const parentWidth =
        stoppageDragRef.current.parentElement?.offsetWidth || window.innerWidth;
      let targetX = legendPositionRef.current.x + 312;
      if (targetX + 320 > parentWidth) {
        targetX = Math.max(10, legendPositionRef.current.x - 322);
      }
      const targetY = legendPositionRef.current.y;
      stoppagePanelPosRef.current = { x: targetX, y: targetY };
      stoppageDragRef.current.style.left = `${targetX}px`;
      stoppageDragRef.current.style.top = `${targetY}px`;
    }
  }, [selectedStoppageImei]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (relRef.current && dragRef.current) {
        const parentRect = dragRef.current.parentElement?.getBoundingClientRect();
        if (parentRect) {
          let newX = e.clientX - parentRect.left - relRef.current.x;
          let newY = e.clientY - parentRect.top - relRef.current.y;

          const maxBoundX = parentRect.width - dragRef.current.offsetWidth - 10;
          const maxBoundY = parentRect.height - dragRef.current.offsetHeight - 10;

          newX = Math.max(10, Math.min(newX, maxBoundX));
          newY = Math.max(10, Math.min(newY, maxBoundY));

          legendPositionRef.current = { x: newX, y: newY };
          dragRef.current.style.left = `${newX}px`;
          dragRef.current.style.top = `${newY}px`;
        }
      }

      if (stoppageRelRef.current && stoppageDragRef.current) {
        const parentRect = stoppageDragRef.current.parentElement?.getBoundingClientRect();
        if (parentRect) {
          let newX = e.clientX - parentRect.left - stoppageRelRef.current.x;
          let newY = e.clientY - parentRect.top - stoppageRelRef.current.y;

          const maxBoundX = parentRect.width - stoppageDragRef.current.offsetWidth - 10;
          const maxBoundY = parentRect.height - stoppageDragRef.current.offsetHeight - 10;

          newX = Math.max(10, Math.min(newX, maxBoundX));
          newY = Math.max(10, Math.min(newY, maxBoundY));

          stoppagePanelPosRef.current = { x: newX, y: newY };
          stoppageDragRef.current.style.left = `${newX}px`;
          stoppageDragRef.current.style.top = `${newY}px`;
        }
      }
    };

    const onMouseUp = () => {
      relRef.current = null;
      stoppageRelRef.current = null;
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

  const [routesMap, setRoutesMap] = useState<Record<string, any>>({});
  const requestedImeisRef = useRef<Set<string>>(new Set());
  const yesterdayStr = useMemo(() => getYesterdayDateString(), []);
  const todayStr = useMemo(() => getTodayDateString(), []);
  const [routeDate, setRouteDate] = useState<string>(getYesterdayDateString);
  const activeFetchDateRef = useRef<string>(getYesterdayDateString());

  const handleDateChange = useCallback((newDate: string) => {
    if (!newDate) return;
    setRouteDate(newDate);
    activeFetchDateRef.current = newDate;
    requestedImeisRef.current.clear();
    setRoutesMap({});
    setShowHistory(true);
  }, []);

  const routeColor = useMemo(() => {
    if (!selectedVehicle) return "#3b82f6"; // Fallback color
    const id = selectedVehicle.imei || selectedVehicle.uniqueId || selectedVehicle.deviceId;
    return getRouteColorById(id);
  }, [selectedVehicle, getRouteColorById]);

  // Extract start and end coordinates of the selected route
  const currentSelectedRouteData = useMemo(() => {
    if (!selectedVehicle) return selectedRouteData;
    const imei = String(selectedVehicle.uniqueId || selectedVehicle.imei);
    return routesMap[imei] || selectedRouteData || null;
  }, [selectedVehicle, routesMap, selectedRouteData]);

  const routeMarkers = useMemo(() => {
    if (!currentSelectedRouteData?.deviceDataByTrips) return null;
    const nonElTrips = currentSelectedRouteData.deviceDataByTrips.filter((t: any) => t.length > 0);
    if (nonElTrips.length === 0) return null;

    const startPoint = nonElTrips[0][0];
    const lastTrip = nonElTrips[nonElTrips.length - 1];
    const endPoint = lastTrip[lastTrip.length - 1];

    return {
      start: startPoint ? { lat: startPoint.latitude, lng: startPoint.longitude } : null,
      end: endPoint ? { lat: endPoint.latitude, lng: endPoint.longitude } : null,
    };
  }, [currentSelectedRouteData]);

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

  // Fetch route history for all visible valid vehicles ONLY when showHistory is active and role is allowed
  useEffect(() => {
    if (isRouteDisabled || !showHistory || validVehicles.length === 0) return;

    const dateToFetch = routeDate;
    activeFetchDateRef.current = dateToFetch;
    const { from, to } = getDateRangeForDay(dateToFetch);

    const unrequested = validVehicles.filter((vehicle) => {
      const imei = String(vehicle.uniqueId || vehicle.imei);
      return imei && !requestedImeisRef.current.has(imei);
    });

    if (unrequested.length === 0) return;

    unrequested.forEach((v) => {
      const imei = String(v.uniqueId || v.imei);
      requestedImeisRef.current.add(imei);
    });

    setIsFetchingRoutes(true);
    const BATCH_SIZE = 5;
    const fetchRoutes = async () => {
      try {
        for (let i = 0; i < unrequested.length; i += BATCH_SIZE) {
          if (activeFetchDateRef.current !== dateToFetch) break;
          const batch = unrequested.slice(i, i + BATCH_SIZE);
          await Promise.allSettled(
            batch.map(async (vehicle) => {
              const imei = String(vehicle.uniqueId || vehicle.imei);
              try {
                const data = await reportService.getHistoryReport({
                  uniqueId: imei,
                  from,
                  to,
                  period: "Custom",
                });
                if (activeFetchDateRef.current !== dateToFetch) return;
                if (data && (data.deviceDataByTrips?.length > 0 || data.success)) {
                  setRoutesMap((prev) => ({ ...prev, [imei]: data }));
                }
              } catch {
                // Ignore errors for individual vehicles without trips
              }
            })
          );
        }
      } finally {
        if (activeFetchDateRef.current === dateToFetch) {
          setIsFetchingRoutes(false);
        }
      }
    };

    fetchRoutes();
  }, [isRouteDisabled, showHistory, validVehicles, routeDate]);

  // Fetch geofence timeline stoppages for visible valid vehicles when showStoppages or showLegend is active
  useEffect(() => {
    if ((!showStoppages && !showLegend) || validVehicles.length === 0) return;

    const unrequested = validVehicles.filter((vehicle) => {
      const imei = String(vehicle.uniqueId || vehicle.imei);
      return imei && !requestedStoppageImeisRef.current.has(imei);
    });

    if (unrequested.length === 0) return;

    unrequested.forEach((v) => {
      const imei = String(v.uniqueId || v.imei);
      requestedStoppageImeisRef.current.add(imei);
    });

    setIsFetchingStoppages(true);
    const BATCH_SIZE = 5;

    const fetchStoppages = async () => {
      try {
        for (let i = 0; i < unrequested.length; i += BATCH_SIZE) {
          const batch = unrequested.slice(i, i + BATCH_SIZE);
          await Promise.allSettled(
            batch.map(async (vehicle) => {
              const imei = String(vehicle.uniqueId || vehicle.imei);
              try {
                const res = await geofenceService.getGeofenceByUniqueId({
                  uniqueId: imei,
                });
                if (res) {
                  const rawStart = res.startPointGeoId;
                  const rawEnd = res.endPointGeoId;
                  const rawData = Array.isArray(res.data) ? res.data : [];

                  const startPoint = isValidGeofencePoint(rawStart)
                    ? { ...rawStart, _id: rawStart._id ?? (rawStart as any).id }
                    : null;
                  const endPoint = isValidGeofencePoint(rawEnd)
                    ? { ...rawEnd, _id: rawEnd._id ?? (rawEnd as any).id }
                    : null;

                  setStoppagesMap((prev) => ({
                    ...prev,
                    [imei]: {
                      stops: rawData,
                      startPoint,
                      endPoint,
                      vehicle,
                    },
                  }));
                }
              } catch {
                setStoppagesMap((prev) => ({
                  ...prev,
                  [imei]: {
                    stops: [],
                    startPoint: null,
                    endPoint: null,
                    vehicle,
                  },
                }));
              }
            })
          );
        }
      } finally {
        setIsFetchingStoppages(false);
      }
    };

    fetchStoppages();
  }, [showStoppages, showLegend, validVehicles]);

  // Keep vehicle data updated in stoppagesMap when validVehicles updates
  useEffect(() => {
    if (Object.keys(stoppagesMap).length === 0) return;
    setStoppagesMap((prev) => {
      let changed = false;
      const updated = { ...prev };
      validVehicles.forEach((v) => {
        const imei = String(v.uniqueId || v.imei);
        if (updated[imei] && updated[imei].vehicle !== v) {
          updated[imei] = { ...updated[imei], vehicle: v };
          changed = true;
        }
      });
      return changed ? updated : prev;
    });
  }, [validVehicles]);


  // Memoize simplified coordinates for each vehicle's trips to keep position arrays stable across renders
  const processedRoutesMap = useMemo(() => {
    const map: Record<string, ProcessedTrip[]> = {};
    for (const [imei, routeData] of Object.entries(routesMap)) {
      if (!routeData?.deviceDataByTrips) continue;
      map[imei] = routeData.deviceDataByTrips
        .filter((trip: any) => Array.isArray(trip) && trip.length > 0)
        .map((trip: any) => ({
          positions: simplifyTripPoints(trip, 8),
          rawTrip: trip,
        }));
    }
    return map;
  }, [routesMap]);

  // Extract and memoize route items with their vehicle details for filtering
  const routeEntries = useMemo(() => {
    return Object.entries(routesMap)
      .map(([imei, routeData]: [string, any]) => {
        const vehicle = validVehicles.find(
          (v) => String(v.uniqueId || v.imei) === imei
        );
        const isHidden = !!hiddenRouteImeis[imei];
        const rawStatus = (vehicle?.category || vehicle?.status || "").toLowerCase();
        let statusKey = "other";
        if (rawStatus.includes("run")) statusKey = "running";
        else if (rawStatus.includes("stop")) statusKey = "stopped";
        else if (rawStatus.includes("idle")) statusKey = "idle";
        else if (rawStatus.includes("overspeed")) statusKey = "overspeed";
        else if (rawStatus.includes("inact")) statusKey = "inactive";
        else if (rawStatus.includes("new")) statusKey = "new";

        return {
          imei,
          routeData,
          vehicle,
          isHidden,
          statusKey,
        };
      })
      .filter((item) => item.vehicle !== undefined);
  }, [routesMap, validVehicles, hiddenRouteImeis]);

  // Filtered route items based on search query and visibility filter
  const filteredRouteEntries = useMemo(() => {
    return routeEntries.filter((item) => {
      // Visibility filter
      if (legendVisibilityFilter === "visible" && item.isHidden) return false;
      if (legendVisibilityFilter === "hidden" && !item.isHidden) return false;

      // Text search filter (matches vehicle name, imei, deviceId, or routeName)
      if (legendSearch.trim()) {
        const query = legendSearch.trim().toLowerCase();
        const name = (item.vehicle?.name || "").toLowerCase();
        const imeiStr = String(item.imei || "").toLowerCase();
        const deviceIdStr = String(item.vehicle?.deviceId || "").toLowerCase();
        const routeNameStr = String(item.vehicle?.routeName || "").toLowerCase();
        if (!name.includes(query) && !imeiStr.includes(query) && !deviceIdStr.includes(query) && !routeNameStr.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [routeEntries, legendVisibilityFilter, legendSearch]);

  const totalRoutesCount = routeEntries.length;
  const visibleRoutesCount = useMemo(() => routeEntries.filter((r) => !r.isHidden).length, [routeEntries]);
  const hiddenRoutesCount = totalRoutesCount - visibleRoutesCount;
  const isFilterActive = legendSearch.trim() !== "" || legendVisibilityFilter !== "all";

  const handleHideAll = useCallback(() => {
    const targetEntries = isFilterActive ? filteredRouteEntries : routeEntries;
    setHiddenRouteImeis((prev) => {
      const updated = { ...prev };
      targetEntries.forEach((item) => {
        updated[item.imei] = true;
      });
      return updated;
    });
  }, [isFilterActive, filteredRouteEntries, routeEntries]);

  const handleShowAll = useCallback(() => {
    const targetEntries = isFilterActive ? filteredRouteEntries : routeEntries;
    setHiddenRouteImeis((prev) => {
      const updated = { ...prev };
      targetEntries.forEach((item) => {
        delete updated[item.imei];
      });
      return updated;
    });
  }, [isFilterActive, filteredRouteEntries, routeEntries]);

  const handleResetFilters = useCallback(() => {
    setLegendSearch("");
    setLegendVisibilityFilter("all");
  }, []);

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
      const imei = String(vehicle.uniqueId || vehicle.imei);
      setSelectedStoppageImei(imei);
      if (!stoppagesMap[imei] && !requestedStoppageImeisRef.current.has(imei)) {
        requestedStoppageImeisRef.current.add(imei);
        geofenceService.getGeofenceByUniqueId({ uniqueId: imei }).then((res) => {
          if (res) {
            const rawStart = res.startPointGeoId;
            const rawEnd = res.endPointGeoId;
            const rawData = Array.isArray(res.data) ? res.data : [];
            const startPoint = isValidGeofencePoint(rawStart)
              ? { ...rawStart, _id: rawStart._id ?? (rawStart as any).id }
              : null;
            const endPoint = isValidGeofencePoint(rawEnd)
              ? { ...rawEnd, _id: rawEnd._id ?? (rawEnd as any).id }
              : null;
            setStoppagesMap((prev) => ({
              ...prev,
              [imei]: { stops: rawData, startPoint, endPoint, vehicle },
            }));
          }
        }).catch(() => {
          setStoppagesMap((prev) => ({
            ...prev,
            [imei]: { stops: [], startPoint: null, endPoint: null, vehicle },
          }));
        });
      }
    },
    [onVehicleClick, stoppagesMap]
  );

  // Handle initial load bounds fitting
  useEffect(() => {
    if (isInitialLoad && validVehicles.length > 0 && autoFitBounds && !selectedVehicleId) {
      setShouldFitBounds(true);
    }
  }, [isInitialLoad, validVehicles.length, autoFitBounds, selectedVehicleId]);

  // Handle manual fit bounds
  const handleFitBounds = useCallback(() => {
    if (validVehicles.length > 0) {
      setShouldFitBounds(true);
    }
  }, [validVehicles.length]);

  const prevFilterRef = useRef<string | undefined>(activeFilter);
  const filterChangePendingRef = useRef<boolean>(false);

  // Detect when active filter explicitly changes (not on initial mount, not on periodic socket updates)
  useEffect(() => {
    if (prevFilterRef.current !== activeFilter) {
      prevFilterRef.current = activeFilter;
      filterChangePendingRef.current = true;
    }
  }, [activeFilter]);

  // Trigger fit bounds ONLY ONCE when a filter change was requested and valid vehicles exist
  useEffect(() => {
    if (filterChangePendingRef.current && validVehicles.length > 0 && !selectedVehicleId) {
      filterChangePendingRef.current = false;
      setShouldFitBounds(true);
    }
  }, [validVehicles.length, selectedVehicleId]);

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
        stoppageData={stoppagesMap[String(vehicle.uniqueId || vehicle.imei)]}
        onStoppageClick={handleStoppageClick}
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
  }, [validVehicles, handleVehicleClick, selectedVehicleId, stoppagesMap, handleStoppageClick]);

  // Derived data for the separate Route Stoppages Panel
  const selectedStoppageVehicle = useMemo(() => {
    if (!selectedStoppageImei) return null;
    return validVehicles.find(
      (v) => String(v.uniqueId || v.imei) === selectedStoppageImei
    );
  }, [selectedStoppageImei, validVehicles]);

  const selectedVehicleStoppageData = selectedStoppageImei
    ? stoppagesMap[selectedStoppageImei]
    : null;

  const separateOrderedStops = useMemo(() => {
    if (!selectedVehicleStoppageData) return [];
    const ordered: Array<{
      item: any;
      type: "start" | "stop" | "end";
      stopNumber?: number;
      coords: [number, number] | null;
    }> = [];

    const startId =
      selectedVehicleStoppageData.startPoint?._id ??
      (selectedVehicleStoppageData.startPoint as any)?.id;
    const endId =
      selectedVehicleStoppageData.endPoint?._id ??
      (selectedVehicleStoppageData.endPoint as any)?.id;

    if (selectedVehicleStoppageData.startPoint) {
      ordered.push({
        item: selectedVehicleStoppageData.startPoint,
        type: "start",
        coords: getGeofenceCoords(selectedVehicleStoppageData.startPoint),
      });
    }

    let stopNum = 1;
    (selectedVehicleStoppageData.stops || []).forEach((st) => {
      const stId = st._id ?? (st as any)?.id;
      if (startId && stId === startId) return;
      if (endId && stId === endId) return;
      ordered.push({
        item: st,
        type: "stop",
        stopNumber: stopNum++,
        coords: getGeofenceCoords(st),
      });
    });

    if (selectedVehicleStoppageData.endPoint) {
      ordered.push({
        item: selectedVehicleStoppageData.endPoint,
        type: "end",
        coords: getGeofenceCoords(selectedVehicleStoppageData.endPoint),
      });
    }

    return ordered;
  }, [selectedVehicleStoppageData]);

  const filteredSeparateStops = useMemo(() => {
    if (!stoppageSearch.trim()) return separateOrderedStops;
    const term = stoppageSearch.trim().toLowerCase();
    return separateOrderedStops.filter((st) => {
      const name = (st.item.geofenceName || "").toLowerCase();
      const addr = (st.item.address || "").toLowerCase();
      return name.includes(term) || addr.includes(term);
    });
  }, [separateOrderedStops, stoppageSearch]);

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
            onClick={() => {
              if (isRouteDisabled) return;
              onToggleAllInTable(!isAllInTableActive);
            }}
            disabled={isRouteDisabled}
            title={
              isRouteDisabled
                ? "Show All Routes in Table is disabled for your role"
                : isAllInTableActive
                ? "Show Paginated Routes"
                : "Show All Routes in Table"
            }
            data-tooltip={
              isRouteDisabled
                ? "Show All Routes in Table is disabled for your role"
                : isAllInTableActive
                ? "Show Paginated Routes"
                : "Show All Routes in Table"
            }
            style={{
              width: "36px",
              height: "36px",
              padding: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "6px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
              cursor: isRouteDisabled ? "not-allowed" : "pointer",
              border: "none",
              backgroundColor: isRouteDisabled
                ? "#f3f4f6"
                : isAllInTableActive
                ? "#007bff"
                : "#ffffff",
              color: isRouteDisabled
                ? "#9ca3af"
                : isAllInTableActive
                ? "#ffffff"
                : "#374151",
              opacity: isRouteDisabled ? 0.5 : 1,
              transition: "all 0.2s ease"
            }}
          >
            <List size={20} className={isRouteDisabled ? "text-gray-400" : (isAllInTableActive ? "text-white" : "text-gray-700")} />
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
          onClick={() => {
            if (isRouteDisabled) return;
            setShowHistory((prev) => !prev);
          }}
          disabled={isRouteDisabled}
          title={
            isRouteDisabled
              ? "Show Route is disabled for your role"
              : showHistory
              ? (isFetchingRoutes ? `Loading Routes (${routeDate})...` : `Hide Route History (${routeDate})`)
              : `Show Route History (${routeDate})`
          }
          data-tooltip={
            isRouteDisabled
              ? "Show Route is disabled for your role"
              : showHistory
              ? (isFetchingRoutes ? `Loading Routes (${routeDate})...` : `Hide Route History (${routeDate})`)
              : `Show Route History (${routeDate})`
          }
          style={{
            width: "36px",
            height: "36px",
            padding: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "6px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
            cursor: isRouteDisabled ? "not-allowed" : "pointer",
            border: "none",
            backgroundColor: isRouteDisabled
              ? "#f3f4f6"
              : showHistory
              ? "#007bff"
              : "#ffffff",
            color: isRouteDisabled
              ? "#9ca3af"
              : showHistory
              ? "#ffffff"
              : "#374151",
            opacity: isRouteDisabled ? 0.5 : 1,
            transition: "all 0.2s ease"
          }}
        >
          {isFetchingRoutes ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <MdDirections size={22} className={isRouteDisabled ? "text-gray-400" : (showHistory ? "text-white" : "text-gray-700")} />
          )}
        </button>

        {/* Toggle Route Arrows */}
        <button
          className={`map-control-button ${showArrows ? "fit-bounds-btn" : ""}`}
          onClick={() => {
            if (isRouteDisabled) return;
            setShowArrows((prev) => !prev);
          }}
          disabled={isRouteDisabled}
          title={
            isRouteDisabled
              ? "Route Arrows disabled for your role"
              : showArrows
              ? "Hide Route Arrows"
              : "Show Route Arrows"
          }
          data-tooltip={
            isRouteDisabled
              ? "Route Arrows disabled for your role"
              : showArrows
              ? "Hide Route Arrows"
              : "Show Route Arrows"
          }
          style={{
            width: "36px",
            height: "36px",
            padding: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "6px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
            cursor: isRouteDisabled ? "not-allowed" : "pointer",
            border: "none",
            backgroundColor: isRouteDisabled
              ? "#f3f4f6"
              : showArrows
              ? "#007bff"
              : "#ffffff",
            color: isRouteDisabled
              ? "#9ca3af"
              : showArrows
              ? "#ffffff"
              : "#374151",
            opacity: isRouteDisabled ? 0.5 : 1,
            transition: "all 0.2s ease"
          }}
        >
          <Navigation size={18} className={`transform rotate-45 ${isRouteDisabled ? "text-gray-400" : (showArrows ? "text-white" : "text-gray-700")}`} />
        </button>

        {/* Toggle Stoppages */}
        <button
          className={`map-control-button ${showStoppages ? "fit-bounds-btn" : ""}`}
          onClick={() => setShowStoppages((prev) => !prev)}
          title={
            showStoppages
              ? (isFetchingStoppages ? "Loading Stoppages..." : "Hide Stoppages")
              : "Show Stoppages"
          }
          data-tooltip={
            showStoppages
              ? (isFetchingStoppages ? "Loading Stoppages..." : "Hide Stoppages")
              : "Show Stoppages"
          }
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
          {isFetchingStoppages ? (
            <Loader2 size={18} className={`animate-spin ${showStoppages ? "text-white" : "text-blue-600"}`} />
          ) : (
            <MapPin size={18} className={showStoppages ? "text-white" : "text-gray-700"} />
          )}
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
          onClick={() => {
            if (isRouteDisabled) return;
            setShowLegend((prev) => !prev);
          }}
          disabled={isRouteDisabled}
          title={
            isRouteDisabled
              ? "Route Legend disabled for your role"
              : showLegend
              ? "Hide Route Legend"
              : "Show Route Color Legend"
          }
          data-tooltip={
            isRouteDisabled
              ? "Route Legend disabled for your role"
              : showLegend
              ? "Hide Route Legend"
              : "Show Route Color Legend"
          }
          style={{
            width: "36px",
            height: "36px",
            padding: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "6px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
            cursor: isRouteDisabled ? "not-allowed" : "pointer",
            border: "none",
            backgroundColor: isRouteDisabled
              ? "#f3f4f6"
              : showLegend
              ? "#007bff"
              : "#ffffff",
            color: isRouteDisabled
              ? "#9ca3af"
              : showLegend
              ? "#ffffff"
              : "#374151",
            opacity: isRouteDisabled ? 0.5 : 1,
            transition: "all 0.2s ease"
          }}
        >
          <Palette size={20} className={isRouteDisabled ? "text-gray-400" : (showLegend ? "text-white" : "text-gray-700")} />
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
        {showHistory &&
          Object.entries(processedRoutesMap).map(([imei, trips]) => {
            if (hiddenRouteImeis[imei]) return null;

            const isSelected =
              selectedVehicle &&
              String(selectedVehicle.uniqueId || selectedVehicle.imei) === imei;
            const color = getRouteColorById(imei);
            const vehicle = validVehicles.find(
              (v) => String(v.uniqueId || v.imei) === imei
            );

            return (
              <VehicleRouteItem
                key={`route-group-${imei}`}
                imei={imei}
                trips={trips}
                color={color}
                isSelected={!!isSelected}
                vehicleName={vehicle?.name || `Vehicle ${imei.slice(-6)}`}
                routeName={vehicle?.routeName}
                noOfStudent={vehicle?.noOfStudent}
                noOfStops={vehicle?.noOfStops}
                showArrows={showArrows}
                totalRoutesCount={totalRoutesCount}
              />
            );
          })}

        {/* Start/End flag markers */}
        {showHistory && isSelectedRouteVisible && routeMarkers?.start && (
          <Marker
            position={[routeMarkers.start.lat, routeMarkers.start.lng]}
            icon={createRouteFlagIcon("green", 34)}
          >
            <Popup maxWidth={200} autoPan={false}>
              <div style={{ textAlign: "center", fontFamily: "sans-serif" }}>
                <strong style={{ color: "#10b981" }}>Start Point</strong>
                {selectedVehicle?.routeName && (
                  <div style={{ fontSize: "11px", color: "#374151", marginTop: "2px" }}>
                    <strong>Route No:</strong> {selectedVehicle.routeName}
                  </div>
                )}
                {selectedVehicle?.noOfStudent !== undefined && (
                  <div style={{ fontSize: "11px", color: "#374151", marginTop: "2px" }}>
                    <strong>No. of Students:</strong> {selectedVehicle.noOfStudent}
                  </div>
                )}
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
            <Popup maxWidth={200} autoPan={false}>
              <div style={{ textAlign: "center", fontFamily: "sans-serif" }}>
                <strong style={{ color: "#ef4444" }}>End Point</strong>
                <div style={{ fontSize: "11px", color: "#666", marginTop: "4px" }}>
                  📍 {routeMarkers.end.lat.toFixed(6)}, {routeMarkers.end.lng.toFixed(6)}
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Route Geofence Stoppages Layer from /geofence/timeline API */}
        {(showStoppages || selectedStoppageImei) &&
          Object.entries(stoppagesMap).map(([imei, stopData]) => {
            if (!showStoppages && selectedStoppageImei !== imei) return null;
            if (hiddenRouteImeis[imei]) return null;

            const color = getRouteColorById(imei);
            const vehicle = stopData.vehicle;
            const routeName = vehicle.routeName || "";
            const vehicleName = vehicle.name || `Device ${imei}`;
            const isSelected =
              selectedVehicle &&
              String(selectedVehicle.uniqueId || selectedVehicle.imei) === imei;

            // Build ordered list of stoppages
            const orderedStoppages: Array<{
              item: any;
              type: "start" | "stop" | "end";
              stopNumber?: number;
              coords: [number, number];
            }> = [];

            const startId =
              stopData.startPoint?._id ?? (stopData.startPoint as any)?.id;
            const endId =
              stopData.endPoint?._id ?? (stopData.endPoint as any)?.id;

            if (stopData.startPoint) {
              const coords = getGeofenceCoords(stopData.startPoint);
              if (coords) {
                orderedStoppages.push({
                  item: stopData.startPoint,
                  type: "start",
                  coords,
                });
              }
            }

            let currentStopNum = 1;
            stopData.stops.forEach((st) => {
              const stId = st._id ?? (st as any)?.id;
              if (startId && stId === startId) return;
              if (endId && stId === endId) return;
              const coords = getGeofenceCoords(st);
              if (coords) {
                orderedStoppages.push({
                  item: st,
                  type: "stop",
                  stopNumber: currentStopNum++,
                  coords,
                });
              }
            });

            if (stopData.endPoint) {
              const coords = getGeofenceCoords(stopData.endPoint);
              if (coords) {
                orderedStoppages.push({
                  item: stopData.endPoint,
                  type: "end",
                  coords,
                });
              }
            }

            const totalIntermediateStops = currentStopNum - 1;

            return (
              <React.Fragment key={`stoppages-group-${imei}`}>
                {orderedStoppages.map((stoppage, sIdx) => {
                  const { item, type, stopNumber, coords } = stoppage;
                  const stoppageKey = `${imei}-${type}-${item._id || item.id || sIdx}`;
                  const radius = item.area?.radius || 50;
                  const stopColor =
                    type === "start" ? "#059669" : type === "end" ? "#dc2626" : color;
                  const zIndexOffset = isSelected
                    ? 700
                    : type === "start" || type === "end"
                    ? 500
                    : 400;

                  return (
                    <React.Fragment
                      key={`stoppage-${stoppageKey}`}
                    >
                      {/* Geofence Perimeter Circle */}
                      <Circle
                        center={coords}
                        radius={radius}
                        pathOptions={{
                          color: stopColor,
                          fillColor: stopColor,
                          fillOpacity: 0.12,
                          weight: 1.5,
                          dashArray: "4 4",
                        }}
                        eventHandlers={{
                          click: () => {
                            const geofenceId = item._id ?? (item as any)?.id ?? item.geofenceId;
                            handleStoppageClick(
                              stoppageKey,
                              coords,
                              geofenceId ? String(geofenceId) : undefined
                            );
                          },
                        }}
                      />

                      {/* Stoppage Pin Marker */}
                      <Marker
                        key={`stoppage-marker-${stoppageKey}`}
                        ref={(ref) => {
                          if (ref) {
                            stoppageMarkersRef.current.set(stoppageKey, ref);
                          } else {
                            stoppageMarkersRef.current.delete(stoppageKey);
                          }
                        }}
                        position={coords}
                        icon={createMapStoppageIcon(type, stopNumber, stopColor)}
                        zIndexOffset={zIndexOffset}
                        eventHandlers={{
                          click: (e) => {
                            const geofenceId = item._id ?? (item as any)?.id ?? item.geofenceId;
                            setActiveStoppageKey(stoppageKey);
                            if (geofenceId) {
                              setSelectedGeofenceId(String(geofenceId));
                            }
                            if (mapRef.current) {
                              mapRef.current.flyTo(coords, 17, { animate: true, duration: 0.8 });
                              mapRef.current.once("moveend", () => {
                                e.target?.openPopup();
                              });
                              setTimeout(() => {
                                e.target?.openPopup();
                              }, 850);
                            }
                          },
                        }}
                      >
                        <Tooltip direction="top" offset={[0, -36]} opacity={0.95}>
                          <div
                            style={{
                              fontSize: "11px",
                              fontWeight: "600",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {type === "start"
                              ? "Start Point"
                              : type === "end"
                              ? "End Point"
                              : `Stop #${stopNumber}`}
                            : {item.geofenceName || "Stoppage"}
                            {routeName ? ` (${routeName})` : ""}
                          </div>
                        </Tooltip>

                        <Popup maxWidth={320} className="custom-stoppage-popup" autoPan={false}>
                          <div
                            style={{
                              fontFamily:
                                "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                              padding: "2px",
                              minWidth: "210px",
                            }}
                          >
                            {/* Badge & Route Name */}
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                marginBottom: "8px",
                                borderBottom: "1px solid #e5e7eb",
                                paddingBottom: "6px",
                              }}
                            >
                              <span
                                style={{
                                  backgroundColor:
                                    type === "start"
                                      ? "#ecfdf5"
                                      : type === "end"
                                      ? "#fef2f2"
                                      : "#eff6ff",
                                  color:
                                    type === "start"
                                      ? "#059669"
                                      : type === "end"
                                      ? "#dc2626"
                                      : "#2563eb",
                                  fontSize: "11px",
                                  fontWeight: "700",
                                  padding: "2px 8px",
                                  borderRadius: "12px",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.5px",
                                }}
                              >
                                {type === "start"
                                  ? "Start Point"
                                  : type === "end"
                                  ? "End Point"
                                  : `Stop #${stopNumber} of ${totalIntermediateStops}`}
                              </span>
                              {routeName && (
                                <span
                                  style={{
                                    fontSize: "11px",
                                    fontWeight: "600",
                                    color: "#4b5563",
                                  }}
                                >
                                  {routeName}
                                </span>
                              )}
                            </div>

                            {/* Stoppage Name */}
                            <div
                              style={{
                                fontSize: "14px",
                                fontWeight: "700",
                                color: "#111827",
                                marginBottom: "4px",
                              }}
                            >
                              {item.geofenceName ||
                                (type === "start"
                                  ? "Start Location"
                                  : type === "end"
                                  ? "End Location"
                                  : `Stoppage #${stopNumber}`)}
                            </div>

                            {/* Address */}
                            {item.address && (
                              <div
                                style={{
                                  fontSize: "11px",
                                  color: "#6b7280",
                                  marginBottom: "6px",
                                  lineHeight: "1.3",
                                }}
                              >
                                📍 {item.address}
                              </div>
                            )}

                            {/* Vehicle and Device info */}
                            <div
                              style={{
                                backgroundColor: "#f9fafb",
                                padding: "6px 8px",
                                borderRadius: "6px",
                                marginBottom: "6px",
                                fontSize: "11px",
                                border: "1px solid #f3f4f6",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  marginBottom: "2px",
                                }}
                              >
                                <span style={{ color: "#6b7280" }}>Vehicle:</span>
                                <span
                                  style={{
                                    fontWeight: "600",
                                    color: "#1f2937",
                                  }}
                                >
                                  {vehicleName}
                                </span>
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                }}
                              >
                                <span style={{ color: "#6b7280" }}>
                                  IMEI / Unique ID:
                                </span>
                                <span
                                  style={{
                                    fontFamily: "monospace",
                                    color: "#374151",
                                  }}
                                >
                                  {imei}
                                </span>
                              </div>
                            </div>

                            {/* Pickup / Drop Timings */}
                            {(item.pickupTime || item.dropTime) && (
                              <div
                                style={{
                                  backgroundColor: "#f0fdf4",
                                  padding: "6px 8px",
                                  borderRadius: "6px",
                                  marginBottom: "6px",
                                  fontSize: "11px",
                                  border: "1px solid #dcfce7",
                                }}
                              >
                                {item.pickupTime && (
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      marginBottom: item.dropTime ? "2px" : 0,
                                    }}
                                  >
                                    <span style={{ color: "#166534" }}>
                                      Pickup Time:
                                    </span>
                                    <span
                                      style={{
                                        fontWeight: "700",
                                        color: "#15803d",
                                      }}
                                    >
                                      {item.pickupTime}
                                    </span>
                                  </div>
                                )}
                                {item.dropTime && (
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                    }}
                                  >
                                    <span style={{ color: "#166534" }}>
                                      Drop Time:
                                    </span>
                                    <span
                                      style={{
                                        fontWeight: "700",
                                        color: "#15803d",
                                      }}
                                    >
                                      {item.dropTime}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Details (Radius, Coords) */}
                            <div
                              style={{
                                fontSize: "10px",
                                color: "#9ca3af",
                                display: "flex",
                                justifyContent: "space-between",
                                paddingTop: "2px",
                              }}
                            >
                              <span>Radius: {radius}m</span>
                              <span>
                                {coords[0].toFixed(5)}, {coords[1].toFixed(5)}
                              </span>
                            </div>

                            {/* Students at this geofence stoppage from /stop-children/:geofenceId */}
                            <StopChildrenList
                              geofenceId={item._id ?? (item as any)?.id ?? item.geofenceId}
                              geofenceName={item.geofenceName}
                              maxHeight="180px"
                            />
                          </div>
                        </Popup>
                      </Marker>
                    </React.Fragment>
                  );
                })}
              </React.Fragment>
            );
          })}

        {/* Route auto-bounding */}
        {showHistory && isSelectedRouteVisible && <RouteBoundsUpdater routeData={currentSelectedRouteData} />}
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
            width: "300px",
            maxHeight: "440px",
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            borderRadius: "12px",
            border: "1px solid rgba(255, 255, 255, 0.6)",
            boxShadow: "0 10px 32px 0 rgba(31, 38, 135, 0.18)",
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
              background: "rgba(243, 244, 246, 0.85)",
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
              {totalRoutesCount > 0 && (
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 600,
                    color: "#4b5563",
                    backgroundColor: "rgba(0, 0, 0, 0.06)",
                    padding: "1px 6px",
                    borderRadius: "10px"
                  }}
                >
                  {isFilterActive ? `${filteredRouteEntries.length}/${totalRoutesCount}` : totalRoutesCount}
                </span>
              )}
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

          {/* Filters & Search Header */}
          <div
            style={{
              padding: "8px 12px 6px 12px",
              borderBottom: "1px solid rgba(229, 231, 235, 0.6)",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              backgroundColor: "rgba(255, 255, 255, 0.4)"
            }}
          >
            {/* Date Selector Row */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "5px",
                backgroundColor: "rgba(243, 244, 246, 0.85)",
                padding: "6px 8px",
                borderRadius: "8px",
                border: "1px solid rgba(229, 231, 235, 0.9)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", fontWeight: 600, color: "#374151" }}>
                  <Calendar size={13} style={{ color: "#2563eb" }} />
                  <span>Route Date:</span>
                </div>
                <input
                  type="date"
                  value={routeDate}
                  max={todayStr}
                  onChange={(e) => handleDateChange(e.target.value)}
                  style={{
                    fontSize: "11px",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    border: "1px solid #d1d5db",
                    backgroundColor: "#ffffff",
                    color: "#1f2937",
                    cursor: "pointer",
                    outline: "none",
                    fontWeight: 500,
                    fontFamily: "'Inter', sans-serif"
                  }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "4px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <button
                    onClick={() => handleDateChange(yesterdayStr)}
                    type="button"
                    style={{
                      fontSize: "10px",
                      padding: "2px 7px",
                      borderRadius: "4px",
                      border: routeDate === yesterdayStr ? "1px solid #3b82f6" : "1px solid #e5e7eb",
                      backgroundColor: routeDate === yesterdayStr ? "#eff6ff" : "#ffffff",
                      color: routeDate === yesterdayStr ? "#1d4ed8" : "#4b5563",
                      fontWeight: routeDate === yesterdayStr ? 600 : 500,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    Yesterday
                  </button>
                  <button
                    onClick={() => handleDateChange(todayStr)}
                    type="button"
                    style={{
                      fontSize: "10px",
                      padding: "2px 7px",
                      borderRadius: "4px",
                      border: routeDate === todayStr ? "1px solid #3b82f6" : "1px solid #e5e7eb",
                      backgroundColor: routeDate === todayStr ? "#eff6ff" : "#ffffff",
                      color: routeDate === todayStr ? "#1d4ed8" : "#4b5563",
                      fontWeight: routeDate === todayStr ? 600 : 500,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    Today
                  </button>
                </div>
                {isFetchingRoutes && (
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", color: "#2563eb", fontWeight: 500 }}>
                    <div className="w-2.5 h-2.5 border border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span>Loading...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Search Input */}
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <Search size={13} style={{ position: "absolute", left: "9px", color: "#9ca3af", pointerEvents: "none" }} />
              <input
                type="text"
                placeholder="Filter by vehicle or IMEI..."
                value={legendSearch}
                onChange={(e) => setLegendSearch(e.target.value)}
                style={{
                  width: "100%",
                  padding: "5px 24px 5px 28px",
                  fontSize: "12px",
                  borderRadius: "6px",
                  border: "1px solid rgba(209, 213, 219, 0.8)",
                  backgroundColor: "rgba(255, 255, 255, 0.9)",
                  outline: "none",
                  color: "#1f2937",
                  boxSizing: "border-box"
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#3b82f6";
                  e.target.style.boxShadow = "0 0 0 2px rgba(59, 130, 246, 0.15)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(209, 213, 219, 0.8)";
                  e.target.style.boxShadow = "none";
                }}
              />
              {legendSearch && (
                <button
                  onClick={() => setLegendSearch("")}
                  style={{
                    position: "absolute",
                    right: "6px",
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    padding: "2px",
                    color: "#9ca3af",
                    display: "flex",
                    alignItems: "center"
                  }}
                  title="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            {totalRoutesCount > 0 && (
              <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
                {/* Visibility Segmented Tabs */}
                <div
                  style={{
                    display: "inline-flex",
                    backgroundColor: "rgba(229, 231, 235, 0.6)",
                    borderRadius: "6px",
                    padding: "2px",
                    gap: "2px",
                    width: "100%"
                  }}
                >
                  {(["all", "visible", "hidden"] as const).map((tab) => {
                    const isActive = legendVisibilityFilter === tab;
                    const count =
                      tab === "all"
                        ? totalRoutesCount
                        : tab === "visible"
                        ? visibleRoutesCount
                        : hiddenRoutesCount;
                    const label = tab === "all" ? "All" : tab === "visible" ? "Shown" : "Hidden";
                    return (
                      <button
                        key={tab}
                        onClick={() => setLegendVisibilityFilter(tab)}
                        style={{
                          border: "none",
                          padding: "3px 8px",
                          fontSize: "11px",
                          fontWeight: isActive ? 600 : 500,
                          borderRadius: "4px",
                          cursor: "pointer",
                          backgroundColor: isActive ? "#ffffff" : "transparent",
                          color: isActive ? "#1d4ed8" : "#4b5563",
                          boxShadow: isActive ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                          transition: "all 0.15s ease",
                          flex: 1,
                          textAlign: "center"
                        }}
                      >
                        {label} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Action Row (Hide All / Show All / Reset) */}
          {totalRoutesCount > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "6px 14px 4px 14px",
                borderBottom: "1px dashed rgba(229, 231, 235, 0.6)"
              }}
            >
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <button
                  onClick={handleHideAll}
                  style={{
                    fontSize: "11px",
                    color: "#ef4444",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 600,
                    padding: "2px 4px",
                    borderRadius: "4px",
                    transition: "background-color 0.2s"
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.08)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  {isFilterActive ? `Hide Filtered (${filteredRouteEntries.length})` : "Hide All"}
                </button>
                <button
                  onClick={handleShowAll}
                  style={{
                    fontSize: "11px",
                    color: "#3b82f6",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 600,
                    padding: "2px 4px",
                    borderRadius: "4px",
                    transition: "background-color 0.2s"
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(59, 130, 246, 0.08)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  {isFilterActive ? `Show Filtered (${filteredRouteEntries.length})` : "Show All"}
                </button>
              </div>

              {isFilterActive && (
                <button
                  onClick={handleResetFilters}
                  style={{
                    fontSize: "10px",
                    color: "#6b7280",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    textDecoration: "underline"
                  }}
                >
                  Reset
                </button>
              )}
            </div>
          )}

          {/* Vehicle List */}
          <div
            style={{
              padding: "8px 12px",
              overflowY: "auto",
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: "6px"
            }}
            className="legend-body"
          >
            {totalRoutesCount === 0 ? (
              <div style={{ fontSize: "12px", color: "#6b7280", textAlign: "center", padding: "16px 8px" }}>
                {isFetchingRoutes ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span style={{ fontSize: "11px", color: "#2563eb", fontWeight: 500 }}>
                      Loading routes for {routeDate}...
                    </span>
                  </div>
                ) : (
                  <div>
                    <p style={{ margin: "0 0 4px 0", fontWeight: 500, color: "#374151" }}>No route history found</p>
                    <p style={{ margin: 0, fontSize: "11px", color: "#9ca3af" }}>No trip data recorded on {routeDate}</p>
                  </div>
                )}
              </div>
            ) : filteredRouteEntries.length === 0 ? (
              <div style={{ fontSize: "12px", color: "#6b7280", textAlign: "center", padding: "16px 8px" }}>
                <p style={{ margin: "0 0 8px 0" }}>No routes match your filters</p>
                <button
                  onClick={handleResetFilters}
                  style={{
                    fontSize: "11px",
                    color: "#3b82f6",
                    background: "rgba(59, 130, 246, 0.08)",
                    border: "1px solid rgba(59, 130, 246, 0.2)",
                    borderRadius: "4px",
                    padding: "3px 8px",
                    cursor: "pointer"
                  }}
                >
                  Clear filters
                </button>
              </div>
            ) : (
              filteredRouteEntries.map(({ imei, vehicle, isHidden, statusKey }) => {
                if (!vehicle) return null;
                const color = getRouteColorById(imei);

                const stopsFromApi = stoppagesMap[imei]
                  ? (stoppagesMap[imei].stops?.length || 0) +
                    (stoppagesMap[imei].startPoint ? 1 : 0) +
                    (stoppagesMap[imei].endPoint ? 1 : 0)
                  : undefined;

                const totalStopsCount =
                  stopsFromApi !== undefined
                    ? stopsFromApi
                    : vehicle.noOfStops !== undefined && vehicle.noOfStops !== null && vehicle.noOfStops !== ""
                    ? vehicle.noOfStops
                    : undefined;

                const isSelectedForStoppages = selectedStoppageImei === imei;

                const handleToggleStoppages = () => {
                  setSelectedStoppageImei((prev) => (prev === imei ? null : imei));
                  if (!stoppagesMap[imei] && !requestedStoppageImeisRef.current.has(imei)) {
                    requestedStoppageImeisRef.current.add(imei);
                    geofenceService
                      .getGeofenceByUniqueId({ uniqueId: imei })
                      .then((res) => {
                        if (res) {
                          const rawStart = res.startPointGeoId;
                          const rawEnd = res.endPointGeoId;
                          const rawData = Array.isArray(res.data) ? res.data : [];
                          const startPoint = isValidGeofencePoint(rawStart)
                            ? { ...rawStart, _id: rawStart._id ?? (rawStart as any).id }
                            : null;
                          const endPoint = isValidGeofencePoint(rawEnd)
                            ? { ...rawEnd, _id: rawEnd._id ?? (rawEnd as any).id }
                            : null;
                          setStoppagesMap((prev) => ({
                            ...prev,
                            [imei]: { stops: rawData, startPoint, endPoint, vehicle },
                          }));
                        }
                      })
                      .catch(() => {
                        setStoppagesMap((prev) => ({
                          ...prev,
                          [imei]: { stops: [], startPoint: null, endPoint: null, vehicle },
                        }));
                      });
                  }
                };

                return (
                  <div
                    key={`legend-item-${imei}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "6px 8px",
                      borderRadius: "6px",
                      backgroundColor: isSelectedForStoppages
                        ? "rgba(239, 246, 255, 0.95)"
                        : isHidden
                        ? "rgba(243, 244, 246, 0.4)"
                        : "rgba(255, 255, 255, 0.65)",
                      border: isSelectedForStoppages
                        ? "1.5px solid #3b82f6"
                        : "1px solid rgba(229, 231, 235, 0.5)",
                      boxShadow: isSelectedForStoppages ? "0 2px 8px rgba(59, 130, 246, 0.12)" : "none",
                      fontSize: "12px",
                      transition: "all 0.15s ease",
                      opacity: isHidden ? 0.75 : 1,
                    }}
                  >
                    <div
                      onClick={() => {
                        onVehicleSelect?.(vehicle.deviceId);
                        if (mapRef.current && vehicle.latitude && vehicle.longitude) {
                          mapRef.current.flyTo([vehicle.latitude, vehicle.longitude], 16, {
                            animate: true,
                            duration: 1,
                            easeLinearity: 0.25,
                          });
                        }
                        handleToggleStoppages();
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        minWidth: 0,
                        flex: 1,
                        cursor: "pointer",
                      }}
                      title={`Click to view stoppages & locate: ${vehicle.name || vehicle.deviceId}`}
                    >
                        <span
                          style={{
                            width: "12px",
                            height: "12px",
                            borderRadius: "50%",
                            backgroundColor: color,
                            flexShrink: 0,
                            boxShadow: "0 0 4px rgba(0, 0, 0, 0.15)",
                            border: isHidden ? "1px dashed #9ca3af" : "none",
                          }}
                        />
                        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                          <span
                            style={{
                              fontWeight: 500,
                              color: isHidden ? "#6b7280" : "#1f2937",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {vehicle.name || `Vehicle ${vehicle.deviceId}`}
                          </span>
                          {(vehicle.noOfStudent !== undefined || totalStopsCount !== undefined) && (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                fontSize: "10px",
                                color: isHidden ? "#9ca3af" : "#4b5563",
                                marginTop: "1px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {vehicle.noOfStudent !== undefined && (
                                <span style={{ color: "#4b5563" }}>
                                  👥 {vehicle.noOfStudent} std
                                </span>
                              )}
                              {totalStopsCount !== undefined && (
                                <span
                                  style={{
                                    color: "#4b5563",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "2px",
                                  }}
                                  title={`Total Stoppages: ${totalStopsCount}`}
                                >
                                  🚏 {totalStopsCount} {Number(totalStopsCount) === 1 ? "stop" : "stops"}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                        {vehicle.routeName && (
                          <span
                            style={{
                              backgroundColor: "rgba(59, 130, 246, 0.08)",
                              color: "#2563eb",
                              padding: "1px 5px",
                              borderRadius: "4px",
                              fontSize: "10px",
                              fontWeight: 600,
                              whiteSpace: "nowrap",
                            }}
                          >
                            Rt: {vehicle.routeName}
                          </span>
                        )}
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
                            color: isHidden ? "#9ca3af" : "#3b82f6",
                            transition: "color 0.2s",
                          }}
                          title={isHidden ? "Show route" : "Hide route"}
                        >
                          {isHidden ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                        <button
                          onClick={handleToggleStoppages}
                          style={{
                            border: "none",
                            background: isSelectedForStoppages ? "rgba(59, 130, 246, 0.15)" : "none",
                            cursor: "pointer",
                            padding: "3px 4px",
                            borderRadius: "4px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: isSelectedForStoppages ? "#2563eb" : "#9ca3af",
                            transition: "all 0.2s",
                          }}
                          title={isSelectedForStoppages ? "Close stoppages panel" : "View stoppages panel"}
                        >
                          <MapPin size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

      {/* Dedicated Route Stoppages Panel (Separate List) */}
      {selectedStoppageImei && selectedStoppageVehicle && (
        <div
          ref={stoppageDragRef}
          style={{
            position: "absolute",
            top: `${stoppagePanelPosRef.current.y}px`,
            left: `${stoppagePanelPosRef.current.x}px`,
            zIndex: 1000,
            width: "350px",
            maxHeight: "520px",
            display: "flex",
            flexDirection: "column",
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(12px)",
            borderRadius: "12px",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            border: "1px solid rgba(229, 231, 235, 0.8)",
            overflow: "hidden",
            fontFamily: "inherit",
          }}
        >
          {/* Draggable Header */}
          <div
            onMouseDown={onStoppageMouseDown}
            style={{
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid rgba(229, 231, 235, 0.8)",
              backgroundColor: "rgba(249, 250, 251, 0.85)",
              cursor: "move",
              userSelect: "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "8px",
                  backgroundColor: "rgba(59, 130, 246, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#2563eb",
                  flexShrink: 0,
                }}
              >
                <MapPin size={16} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "#111827",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {selectedStoppageVehicle.name || `Vehicle ${selectedStoppageVehicle.deviceId}`}
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      backgroundColor: "#eff6ff",
                      color: "#2563eb",
                      padding: "1px 6px",
                      borderRadius: "10px",
                      flexShrink: 0,
                    }}
                  >
                    {separateOrderedStops.length} stops
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "10px", color: "#6b7280" }}>
                  {selectedStoppageVehicle.routeName && (
                    <span>
                      Route: <strong>{selectedStoppageVehicle.routeName}</strong>
                    </span>
                  )}
                  {selectedStoppageVehicle.noOfStudent !== undefined && (
                    <span>• {selectedStoppageVehicle.noOfStudent} std</span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedStoppageImei(null)}
              style={{
                border: "none",
                background: "none",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#9ca3af",
                borderRadius: "6px",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#111827";
                e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.05)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#9ca3af";
                e.currentTarget.style.backgroundColor = "transparent";
              }}
              title="Close stoppages"
            >
              <X size={16} />
            </button>
          </div>

          {/* Search Filter input */}
          <div style={{ padding: "8px 12px", borderBottom: "1px solid rgba(243, 244, 246, 0.9)" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "5px 8px",
                backgroundColor: "#f9fafb",
                borderRadius: "6px",
                border: "1px solid #e5e7eb",
              }}
            >
              <Search size={13} style={{ color: "#9ca3af", flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Filter stoppages by name or address..."
                value={stoppageSearch}
                onChange={(e) => setStoppageSearch(e.target.value)}
                style={{
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontSize: "11px",
                  width: "100%",
                  color: "#1f2937",
                }}
              />
              {stoppageSearch && (
                <button
                  onClick={() => setStoppageSearch("")}
                  style={{
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    padding: 0,
                    color: "#9ca3af",
                    display: "flex",
                  }}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Stoppages List */}
          <div
            style={{
              padding: "8px 12px",
              overflowY: "auto",
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            {isFetchingStoppages && !stoppagesMap[selectedStoppageImei] ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "28px 0",
                  color: "#6b7280",
                  fontSize: "12px",
                }}
              >
                <Loader2 size={16} className="animate-spin text-blue-600" />
                <span>Loading route stoppages...</span>
              </div>
            ) : filteredSeparateStops.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 8px", color: "#9ca3af", fontSize: "12px" }}>
                {stoppageSearch ? "No stoppages match your search" : "No stoppages found for this vehicle route"}
              </div>
            ) : (
              filteredSeparateStops.map((stoppage) => {
                const { item, type, stopNumber, coords } = stoppage;
                const isStart = type === "start";
                const isEnd = type === "end";
                const badgeBg = isStart ? "#ecfdf5" : isEnd ? "#fef2f2" : "#eff6ff";
                const badgeColor = isStart ? "#059669" : isEnd ? "#dc2626" : "#2563eb";
                const badgeText = isStart ? "Start" : isEnd ? "End" : `#${stopNumber}`;
                const geofenceId = item._id ?? (item as any)?.id ?? item.geofenceId;
                const stoppageKey = `${selectedStoppageImei}-${type}-${item._id || item.id || stopNumber}`;
                const isSelected = activeStoppageKey === stoppageKey;

                return (
                  <div
                    key={`sep-stop-${stoppageKey}`}
                    onClick={() => {
                      if (coords) {
                        handleStoppageClick(
                          stoppageKey,
                          coords,
                          geofenceId ? String(geofenceId) : undefined
                        );
                      }
                    }}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "8px",
                      padding: "8px 10px",
                      borderRadius: "8px",
                      backgroundColor: isSelected ? "rgba(239, 246, 255, 0.95)" : "rgba(249, 250, 251, 0.8)",
                      border: isSelected ? "1.5px solid #3b82f6" : "1px solid rgba(229, 231, 235, 0.7)",
                      cursor: coords ? "pointer" : "default",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (coords && !isSelected) {
                        e.currentTarget.style.backgroundColor = "rgba(239, 246, 255, 0.6)";
                        e.currentTarget.style.borderColor = "rgba(191, 219, 254, 0.9)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (coords && !isSelected) {
                        e.currentTarget.style.backgroundColor = "rgba(249, 250, 251, 0.8)";
                        e.currentTarget.style.borderColor = "rgba(229, 231, 235, 0.7)";
                      }
                    }}
                    title={coords ? `Click to locate & open popup on map` : undefined}
                  >
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        padding: "2px 6px",
                        borderRadius: "4px",
                        backgroundColor: badgeBg,
                        color: badgeColor,
                        flexShrink: 0,
                        marginTop: "1px",
                      }}
                    >
                      {badgeText}
                    </span>
                    <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "#1f2937",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.geofenceName || (isStart ? "Start Point" : isEnd ? "End Point" : `Stop #${stopNumber}`)}
                      </span>
                      {(item.pickupTime || item.dropTime) && (
                        <div
                          style={{
                            fontSize: "10px",
                            color: "#4b5563",
                            marginTop: "2px",
                            display: "flex",
                            gap: "10px",
                          }}
                        >
                          {item.pickupTime && (
                            <span>
                              Pickup: <strong style={{ color: "#059669" }}>{item.pickupTime}</strong>
                            </span>
                          )}
                          {item.dropTime && (
                            <span>
                              Drop: <strong style={{ color: "#dc2626" }}>{item.dropTime}</strong>
                            </span>
                          )}
                        </div>
                      )}
                      {item.address && (
                        <span
                          style={{
                            fontSize: "10px",
                            color: "#9ca3af",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            marginTop: "2px",
                          }}
                        >
                          📍 {item.address}
                        </span>
                      )}

                      {/* Display students list for selected stop inside panel */}
                      {isSelected && geofenceId && (
                        <div onClick={(e) => e.stopPropagation()}>
                          <StopChildrenList
                            geofenceId={geofenceId}
                            geofenceName={item.geofenceName}
                            compact
                            maxHeight="160px"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
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
