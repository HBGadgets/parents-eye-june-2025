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
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [shouldFitBounds, setShouldFitBounds] = useState(false);
  const [customColors, setCustomColors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/history-playback-data/metadata.json")
      .then((res) => {
        if (!res.ok) throw new Error("No metadata");
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Invalid content-type");
        }
        return res.json();
      })
      .then((data) => {
        if (data) {
          setCustomColors(data);
        }
      })
      .catch(() => {
        // Silent catch
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

      fetch(`${localUrl}/history-playback-data/${imei}.json`)
        .then((res) => {
          const contentType = res.headers.get("content-type");
          if (!res.ok || !contentType || !contentType.includes("application/json")) {
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
          url={`https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}`}
          subdomains={["mt0", "mt1", "mt2", "mt3"]}
          maxZoom={19}
        />

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
        {renderMarkers}

        {/* Render travelled routes for all loaded vehicles automatically */}
        {Object.entries(routesMap).map(([imei, routeData]: [string, any]) => {
          if (!routeData?.deviceDataByTrips) return null;

          const isSelected = selectedVehicle && String(selectedVehicle.uniqueId || selectedVehicle.imei) === imei;
          const color = getRouteColorById(imei);

          return (
            <React.Fragment key={`route-group-${imei}`}>
              {routeData.deviceDataByTrips.map((trip: any, tripIndex: number) => {
                const positions = trip.map((pt: any) => [pt.latitude, pt.longitude] as [number, number]);
                return (
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
                );
              })}
            </React.Fragment>
          );
        })}

        {/* Start/End flag markers */}
        {routeMarkers?.start && (
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
        {routeMarkers?.end && (
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
        <RouteBoundsUpdater routeData={selectedRouteData} />
      </MapContainer>

      {/* Map Controls */}
      {/* <MapControls
        onFitBounds={handleFitBounds}
        vehicleCount={validVehicles.length}
      /> */}
    </div>
  );
};

export default VehicleMap;
