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

// Helper function to calculate the shortest rotation path
const getShortestRotation = (from: number, to: number): number => {
  // Normalize the difference to be within -180 to 180 degrees
  let delta = ((((to - from) % 360) + 540) % 360) - 180;
  return from + delta;
};

// // Optimized marker component with SMOOTH ROTATION
// const SingleVehicleMarker = React.memo(
//   ({
//     vehicle,
//     onClick,
//   }: {
//     vehicle: VehicleData;
//     onClick?: (vehicle: VehicleData) => void;
//   }) => {
//     const markerRef = useRef<L.Marker | null>(null);
//     const prevPositionRef = useRef<[number, number] | null>(null);
//     const prevRotationRef = useRef<number>(0);
//     const prevImageUrlRef = useRef<string>(""); // Track previous image URL
//     const isZoomingRef = useRef(false);

//     // Vehicle status calculation
//     const vehicleStatus = useMemo(() => {
//       const lastUpdateTime = new Date(vehicle.lastUpdate).getTime();
//       const currentTime = new Date().getTime();
//       const timeDifference = currentTime - lastUpdateTime;
//       const thirtyFiveHoursInMs = 35 * 60 * 60 * 1000;

//       // Check if vehicle is inactive
//       if (vehicle.latitude === 0 && vehicle.longitude === 0) return "noData";

//       if (timeDifference > thirtyFiveHoursInMs) return "inactive";

//       // Check for overspeeding
//       const speedLimit = parseFloat(vehicle.speedLimit) || 60;
//       if (vehicle.speed > speedLimit) return "overspeeding";

//       // Extract vehicle attributes
//       const { ignition, motion } = vehicle.attributes;
//       const speed = vehicle.speed;
//       if (ignition === true) {
//         if (speed > 5 && speed < speedLimit) {
//           return "running";
//         } else {
//           return "idle";
//         }
//       } else if (ignition === false) {
//         return "stopped";
//       }
//     }, [
//       vehicle.speed,
//       vehicle.speedLimit,
//       vehicle.lastUpdate,
//       vehicle.attributes.ignition,
//     ]);

//     const imageUrl = useMemo(() => {
//       const statusToImageUrl = {
//         running: "/bus/top-view/green-top.svg",
//         idle: "/bus/top-view/yellow-top.svg",
//         stopped: "/bus/top-view/red-top.svg",
//         inactive: "/bus/top-view/grey-top.svg",
//         overspeeding: "/bus/top-view/orange-top.svg",
//         noData: "/bus/top-view/blue-top.svg",
//       };
//       return statusToImageUrl[vehicleStatus] || statusToImageUrl.inactive;
//     }, [vehicleStatus]);

//     // Icon without rotation (rotation applied separately via JS)
//     const busIcon = useMemo(() => {
//       const markerSize = 100;

//       return L.divIcon({
//         html: `
//           <div class="single-vehicle-marker-container">
//             <img
//               src="${imageUrl}"
//               class="vehicle-marker-img"
//               style="
//                 width: ${markerSize}px;
//                 height: ${markerSize}px;
//                 transform-origin: center center;
//                 filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
//               "
//               alt="Vehicle marker"
//             />
//           </div>
//         `,
//         className: "custom-single-vehicle-marker",
//         iconSize: [markerSize, markerSize],
//         iconAnchor: [markerSize / 2, markerSize / 2],
//         popupAnchor: [0, -20],
//       });
//     }, [imageUrl]);

//     // FIXED: Apply position and rotation updates with proper element handling
//     useEffect(() => {
//       if (markerRef.current) {
//         const newPosition: [number, number] = [
//           vehicle.latitude,
//           vehicle.longitude,
//         ];
//         const targetRotation = vehicle.course || 0;
//         const prevPosition = prevPositionRef.current;
//         const currentRotation = prevRotationRef.current;
//         const prevImageUrl = prevImageUrlRef.current;

//         // Check what has changed
//         const positionChanged =
//           !prevPosition ||
//           prevPosition[0] !== newPosition[0] ||
//           prevPosition[1] !== newPosition[1];

//         // FIXED: Calculate shortest rotation path
//         const normalizedTarget = targetRotation % 360; // Normalize target to 0-360
//         const normalizedCurrent = currentRotation % 360; // Normalize current to 0-360

//         // Calculate shortest path rotation
//         const shortestRotation = getShortestRotation(
//           currentRotation,
//           normalizedTarget
//         );
//         const rotationChanged = currentRotation !== shortestRotation;

//         const imageChanged = prevImageUrl !== imageUrl;

//         // Get marker element
//         let markerElement = markerRef.current.getElement();

//         // Only update icon if the image URL changed (status change)
//         if (imageChanged) {
//           markerRef.current.setIcon(busIcon);
//           prevImageUrlRef.current = imageUrl;

//           // Re-query for element after setIcon recreates DOM
//           markerElement = markerRef.current.getElement();
//           console.log("[Marker] Icon updated due to status change");
//         }

//         if (markerElement) {
//           const imgElement = markerElement.querySelector(
//             ".vehicle-marker-img"
//           ) as HTMLElement;

//           // Update position with smooth transition
//           if (positionChanged) {
//             if (!isZoomingRef.current) {
//               markerElement.classList.add("smooth-marker");
//             }

//             markerRef.current.setLatLng(newPosition);
//             prevPositionRef.current = newPosition;
//             console.log(`[Marker] Updated position to:`, newPosition);
//           }

//           // Update rotation with smooth transition (shortest path)
//           if (imgElement) {
//             if (rotationChanged && !isZoomingRef.current) {
//               imgElement.classList.add("smooth-rotation");
//             }

//             // FIXED: Apply rotation using shortest path calculation
//             imgElement.style.transform = `rotate(${shortestRotation}deg)`;

//             if (rotationChanged) {
//               prevRotationRef.current = shortestRotation;
//               console.log(
//                 `[Marker] Rotated from ${currentRotation.toFixed(
//                   1
//                 )}° to ${shortestRotation.toFixed(
//                   1
//                 )}° (target: ${targetRotation}°, delta: ${(
//                   shortestRotation - currentRotation
//                 ).toFixed(1)}°)`
//               );
//             }
//           }
//         }
//       }
//     }, [
//       vehicle.latitude,
//       vehicle.longitude,
//       vehicle.course,
//       busIcon,
//       imageUrl,
//     ]);

//     const handleClick = useCallback(() => {
//       onClick?.(vehicle);
//     }, [vehicle, onClick]);

//     const formattedLastUpdate = useMemo(() => {
//       const utcDate = new Date(vehicle.lastUpdate);
//       const istDate = new Date(utcDate.getTime() + 5.5 * 60 * 60 * 1000);
//       const day = istDate.getUTCDate().toString().padStart(2, "0");
//       const month = (istDate.getUTCMonth() + 1).toString().padStart(2, "0");
//       const year = istDate.getUTCFullYear();
//       const hours = istDate.getUTCHours();
//       const minutes = istDate.getUTCMinutes().toString().padStart(2, "0");
//       const seconds = istDate.getUTCSeconds().toString().padStart(2, "0");
//       const hour12 = hours % 12 || 12;
//       const ampm = hours >= 12 ? "PM" : "AM";
//       return `${day}/${month}/${year}, ${hour12}:${minutes}:${seconds} ${ampm}`;
//     }, [vehicle.lastUpdate]);

//     const statusInfo = useMemo(() => {
//       const statusMap = {
//         running: { text: "Running", color: "#28a745" },
//         idle: { text: "Idle", color: "#ffc107" },
//         stopped: { text: "Stopped", color: "#dc3545" },
//         inactive: { text: "Inactive", color: "#666666" },
//         overspeeding: { text: "Overspeeding", color: "#fd7e14" },
//         noData: { text: "No Data", color: "#007bff" },
//       };
//       return statusMap[vehicleStatus] || statusMap.noData;
//     }, [vehicleStatus]);

//     return (
//       <Marker
//         ref={markerRef}
//         position={[vehicle.latitude, vehicle.longitude]}
//         icon={busIcon}
//         eventHandlers={{
//           click: handleClick,
//         }}
//       >
//         <Popup maxWidth={290} className="vehicle-popup" maxHeight={300}>
//           <div className="vehicle-popup-content">
//             <div className="vehicle-header">
//               <h3 className="vehicle-name">{vehicle.name}</h3>
//               <span
//                 className="status-badge"
//                 style={{ backgroundColor: statusInfo.color }}
//               >
//                 {statusInfo.text}
//               </span>
//             </div>

//             <div className="vehicle-details scrollable-details">
//               <div className="detail-row">
//                 <span className="label">Speed:</span>
//                 <span className="value">{vehicle.speed.toFixed(2)} km/h</span>
//               </div>
//               <div className="detail-row">
//                 <span className="label">Speed Limit:</span>
//                 <span className="value">{vehicle.speedLimit}</span>
//               </div>
//               <div className="detail-row">
//                 <span className="label">Category:</span>
//                 <span className="value">{vehicle.category}</span>
//               </div>
//               <div className="detail-row">
//                 <span className="label">Mileage:</span>
//                 <span className="value">{vehicle.mileage}</span>
//               </div>
//               <div className="detail-row">
//                 <span className="label">Fuel Consumption:</span>
//                 <span className="value">{vehicle.fuelConsumption} L</span>
//               </div>
//               <div className="detail-row">
//                 <span className="label">Last Update:</span>
//                 <span className="value">{formattedLastUpdate}</span>
//               </div>
//               <div className="detail-row">
//                 <span className="label">Since:</span>
//                 <span className="value">
//                   {calculateTimeSince(vehicle.lastUpdate)}
//                 </span>
//               </div>
//               <div className="detail-row">
//                 <span className="label">Today's Distance:</span>
//                 <span className="value">
//                   {vehicle.attributes.todayDistance} km
//                 </span>
//               </div>
//               <div className="detail-row">
//                 <span className="label">Network:</span>
//                 <span
//                   className={`value ${
//                     vehicle.gsmSignal ? "online" : "offline"
//                   }`}
//                 >
//                   {vehicle.gsmSignal ? "Online" : "Offline"}
//                 </span>
//               </div>
//             </div>

//             <div className="vehicle-coordinates">
//               <small>
//                 📍 {vehicle.latitude.toFixed(6)}, {vehicle.longitude.toFixed(6)}
//               </small>
//             </div>
//           </div>
//         </Popup>
//       </Marker>
//     );
//   }
// );

// SingleVehicleMarker.displayName = "SingleVehicleMarker";

// Component to disable transitions during zoom
const ZoomTransitionController = ({
  vehicle,
}: {
  vehicle: VehicleData | null;
}) => {
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
  height = "500px",
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

          console.log(
            `[Trail] Added point at ${(progress * 100).toFixed(1)}% progress`
          );
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
    <div
      className="single-device-map-container"
      style={{ position: "relative", height, width: "100%" }}
    >
      {vehicle && <OfflineIndicator isOffline={!vehicle.gsmSignal} />}
      {/* <DataRefreshIndicator key={refreshKey} intervalSeconds={10} /> */}

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
          url={
            isSatelliteView
              ? "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
              : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          }
          maxZoom={19}
        />

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
