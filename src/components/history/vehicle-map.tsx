import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { DeviceHistoryItem } from "@/data/sampleData";
import { reverseGeocode } from "@/util/reverse-geocode";
import { MarkerPlayer } from "@/lib/leaflet-marker-player";
import type { Point } from "@/types/marker-player.types";
import { PlaybackControls } from "./playback-controls";
import { LiaTrafficLightSolid } from "react-icons/lia";
import { Satellite } from "lucide-react";

// Fix for default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface VehicleMapProps {
  data: DeviceHistoryItem[];
  currentIndex?: number;
  isExpanded?: boolean;
  onProgressChange?: (progress: number) => void;
  activeStopId?: number | null;
  stops?: any[];
  onStopClick?: (stop: any) => void;
  stopAddressMap: Record<number, string>;
}

type RoutePoint = {
  coordinates: [number, number];
  course: number;
};

const VehicleMap: React.FC<VehicleMapProps> = ({
  data,
  isExpanded,
  onProgressChange,
  activeStopId,
  stops,
  onStopClick,
  stopAddressMap,
}) => {
  const MIN_BASE_SECONDS = 100000;
  const BASE_PLAYBACK_SECONDS = Math.max(
    MIN_BASE_SECONDS,
    Math.ceil(data.length / 100)
  );

  const DEFAULT_CENTER: [number, number] = [30.73448, 79.067696];
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerPlayerRef = useRef<MarkerPlayer | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const arrowLayerRef = useRef<L.LayerGroup | null>(null);
  const allArrowMarkersRef = useRef<L.Marker[]>([]);
  const startFlagRef = useRef<L.Marker | null>(null);
  const endFlagRef = useRef<L.Marker | null>(null);
  const stopMarkersRef = useRef<Map<number, L.Marker>>(new Map());

  const [isRouteDrawn, setIsRouteDrawn] = useState(false);
  const [startAddress, setStartAddress] = useState<string>("");
  const [endAddress, setEndAddress] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [progress, setProgress] = useState(0);
  const [isSatelliteView, setIsSatelliteView] = useState(false);
  const [showTraffic, setShowTraffic] = useState(false);

  const speedCache = useRef(new Map<number, string>());
  const currentAngleRef = useRef(0);
  const isPlaybackActive = isPlaying;

  // Memoize completeRoute to prevent recalculation on every render
  const completeRoute: RoutePoint[] = useMemo(() => {
    return data.map((item) => ({
      coordinates: [item.latitude, item.longitude] as [number, number],
      course: item.course,
    }));
  }, [data]);

  // Vehicle icon
  const createVehicleIcon = useCallback(() => {
    return L.divIcon({
      className: "vehicle-marker",
      html: `
      <div class="vehicle-rotator" style="
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        transform-origin: center center;
      ">
        <img src="/Top Y.svg" width="32" height="32" />
      </div>
    `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  }, []);

  const createFlagIcon = useCallback(
    (color: "green" | "red", size: number = 24) => {
      const flagColor = color === "green" ? "#10b981" : "#ef4444";
      return L.divIcon({
        className: `${color}-flag`,
        html: `
        <div style="width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center;">
          <svg viewBox="0 0 24 24" style="width: ${size}px; height: ${size}px; fill: ${flagColor}; filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.3));">
            <path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/>
          </svg>
        </div>
      `,
        iconSize: [size, size],
        iconAnchor: [size / 2, size - 2],
      });
    },
    []
  );

  const createArrowIcon = useCallback((course: number, size: number = 34) => {
    return L.divIcon({
      className: "course-arrow",
      html: `
        <div style="transform: rotate(${course + 180
        }deg); width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center;">
          <div style="display: flex; flex-direction: column; align-items: center; margin-top: -3px;">
            <svg width="${Math.round(size * 0.75)}" height="${Math.round(
          size * 0.75
        )}" viewBox="0 0 24 24" fill="none" style="filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.7));">
              <path d="M7 10L12 15L17 10" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </div>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  }, []);

  const getArrowDensity = useCallback((zoom: number): number => {
    if (zoom < 14) return 0;
    if (zoom >= 16) return 0.01;
    if (zoom >= 14) return 0.01;
    return 0.0;
  }, []);

  const updateArrowVisibility = useCallback(() => {
    if (!mapRef.current || !arrowLayerRef.current) return;
    const bounds = mapRef.current.getBounds();
    arrowLayerRef.current.clearLayers();
    allArrowMarkersRef.current.forEach((marker) => {
      if (bounds.contains(marker.getLatLng())) {
        marker.addTo(arrowLayerRef.current!);
      }
    });
  }, []);

  const createAllArrowMarkers = useCallback(
    (zoom: number) => {
      if (!mapRef.current || !data || data.length === 0) return;

      const density = getArrowDensity(zoom);
      const step = Math.max(1, Math.floor(1 / density));
      const arrowSize = zoom >= 14 ? 28 : zoom >= 12 ? 20 : 24;

      allArrowMarkersRef.current.forEach((marker) => {
        if (marker && marker.remove) marker.remove();
      });
      allArrowMarkersRef.current = [];

      if (arrowLayerRef.current) {
        arrowLayerRef.current.clearLayers();
      }

      for (let i = 0; i < data.length; i += step) {
        const point = data[i];
        const arrowIcon = createArrowIcon(point.course, arrowSize);
        const marker = L.marker([point.latitude, point.longitude], {
          icon: arrowIcon,
          interactive: true,
          zIndexOffset: -1000,
        });

        marker.bindTooltip(`Speed: ${point.speed?.toFixed(1) || "N/A"} km/h`, {
          permanent: false,
          direction: "top",
          offset: [0, -10],
        });

        marker.on("click", () => {
          console.log("Marker clicked:", point.createdAt);
          const formattedTime = new Date(point.createdAt).toLocaleTimeString(
            "en-GB",
            {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: true,
              timeZone: "UTC",
            }
          );

          if (speedCache.current.has(i)) {
            marker
              .bindPopup(
                `
<div style="
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  padding: 8px 4px;
  min-width: 200px;
  line-height: 1.5;
  color: #374151;
">
  <div style="
    font-size: 14px;
    font-weight: 600;
    color: #111827;
    margin-bottom: 10px;
    padding-bottom: 8px;
    border-bottom: 1px solid #e5e7eb;
  ">
    Vehicle Info
  </div>
  
  <div style="font-size: 12px; margin-bottom: 10px;">
    <div style="display: grid; grid-template-columns: 60px 1fr; gap: 6px 8px;">
      <span style="color: #6b7280; font-weight: 500;">Speed:</span>
      <span style="color: #111827; font-weight: 600;">${point.speed?.toFixed(1) || "N/A"
                } km/h</span>
      
      <span style="color: #6b7280; font-weight: 500;">Time:</span>
      <span style="color: #111827;">${formattedTime}</span>
    </div>
  </div>
  
  <div style="
    padding-top: 8px;
    border-top: 1px solid #e5e7eb;
    font-size: 12px;
  ">
    <div style="color: #6b7280; font-weight: 500; margin-bottom: 4px;">Address</div>
    <div style="color: #111827; line-height: 1.4;">${speedCache.current.get(i) || "Loading..."
                }</div>
  </div>
</div>
`
              )
              .openPopup();
          } else {
            reverseGeocode(point.latitude, point.longitude)
              .then((address) => {
                speedCache.current.set(i, address);
                marker
                  .bindPopup(
                    `
<div style="
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  padding: 8px 4px;
  min-width: 200px;
  line-height: 1.5;
  color: #374151;
">
  <div style="
    font-size: 14px;
    font-weight: 600;
    color: #111827;
    margin-bottom: 10px;
    padding-bottom: 8px;
    border-bottom: 1px solid #e5e7eb;
  ">
    Vehicle Info
  </div>
  
  <div style="font-size: 12px; margin-bottom: 10px;">
    <div style="display: grid; grid-template-columns: 60px 1fr; gap: 6px 8px;">
      <span style="color: #6b7280; font-weight: 500;">Speed:</span>
      <span style="color: #111827; font-weight: 600;">${point.speed?.toFixed(1) || "N/A"
                    } km/h</span>
      
      <span style="color: #6b7280; font-weight: 500;">Time:</span>
      <span style="color: #111827;">${formattedTime}</span>
    </div>
  </div>
  
  <div style="
    padding-top: 8px;
    border-top: 1px solid #e5e7eb;
    font-size: 12px;
  ">
    <div style="color: #6b7280; font-weight: 500; margin-bottom: 4px;">Address</div>
    <div style="color: #111827; line-height: 1.4;">${speedCache.current.get(i) || "Loading..."
                    }</div>
  </div>
</div>
`
                  )
                  .openPopup();
              })
              .catch(() => {
                marker
                  .bindPopup(
                    `
<div style="
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  padding: 8px 4px;
  min-width: 200px;
  line-height: 1.5;
  color: #374151;
">
  <div style="
    font-size: 14px;
    font-weight: 600;
    color: #111827;
    margin-bottom: 10px;
    padding-bottom: 8px;
    border-bottom: 1px solid #e5e7eb;
  ">
    Vehicle Info
  </div>
  
  <div style="font-size: 12px; margin-bottom: 10px;">
    <div style="display: grid; grid-template-columns: 60px 1fr; gap: 6px 8px;">
      <span style="color: #6b7280; font-weight: 500;">Speed:</span>
      <span style="color: #111827; font-weight: 600;">${point.speed?.toFixed(1) || "N/A"
                    } km/h</span>
      
      <span style="color: #6b7280; font-weight: 500;">Time:</span>
      <span style="color: #111827;">${formattedTime}</span>
    </div>
  </div>
  
  <div style="
    padding-top: 8px;
    border-top: 1px solid #e5e7eb;
    font-size: 12px;
  ">
    <div style="color: #6b7280; font-weight: 500; margin-bottom: 4px;">Address</div>
    <div style="color: #111827; line-height: 1.4;">${speedCache.current.get(i) || "Loading..."
                    }</div>
  </div>
</div>
`
                  )
                  .openPopup();
              });
          }
        });

        allArrowMarkersRef.current.push(marker);
      }

      setTimeout(() => updateArrowVisibility(), 0);
    },
    [data, createArrowIcon, getArrowDensity, updateArrowVisibility]
  );

  const createStopIcon = (isActive: boolean) =>
    L.divIcon({
      className: "stop-marker",
      html: `
      <div style="
        width: 18px;
        height: 18px;
        background: ${isActive ? "#ef4444" : "#f97316"};
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 0 8px rgba(0,0,0,0.4);
      "></div>
    `,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });

  // ✅ Debounced arrow visibility update
  const updateArrowVisibilityDebounced = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          updateArrowVisibility();
        }, 150);
      };
    })(),
    [updateArrowVisibility]
  );

  const getBearing = (from: L.LatLng, to: L.LatLng): number => {
    const lat1 = (from.lat * Math.PI) / 180;
    const lat2 = (to.lat * Math.PI) / 180;
    const dLng = ((to.lng - from.lng) * Math.PI) / 180;

    const y = Math.sin(dLng) * Math.cos(lat2);
    const x =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

    let brng = (Math.atan2(y, x) * 180) / Math.PI;
    return (brng + 360) % 360;
  };

  const handleZoomEnd = useCallback(() => {
    if (!mapRef.current) return;
    const zoom = mapRef.current.getZoom();
    // createAllArrowMarkers(zoom);
    // updateArrowVisibility();
  }, [createAllArrowMarkers, updateArrowVisibility]);

  const handleMoveEnd = useCallback(() => {
    updateArrowVisibilityDebounced();
  }, [updateArrowVisibilityDebounced]);

  // ✅ Optimized smooth rotation function
  const smoothRotateVehicle = useCallback(
    (marker: L.Marker, targetAngle: number) => {
      const el = marker.getElement();
      if (!el) return;

      const rotator = el.querySelector(
        ".vehicle-rotator"
      ) as HTMLElement | null;
      if (!rotator) return;

      // shortest-path rotation
      let diff = targetAngle - currentAngleRef.current;
      while (diff > 180) diff -= 360;
      while (diff < -180) diff += 360;

      currentAngleRef.current = (currentAngleRef.current + diff + 360) % 360;

      rotator.style.transform = `rotate(${currentAngleRef.current}deg)`;
    },
    []
  );

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const hasData = data && data.length > 0;

    const initialCenter: [number, number] = hasData
      ? [data[0].latitude, data[0].longitude]
      : DEFAULT_CENTER;

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: hasData ? 15 : 17,
      zoomControl: false,
    });

    tileLayerRef.current = L.tileLayer(
      "https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
      {
        subdomains: ["mt0", "mt1", "mt2", "mt3"],
      }
    ).addTo(map);

    mapRef.current = map;
    arrowLayerRef.current = L.layerGroup().addTo(map);

    map.on("zoomend", handleZoomEnd);
    map.on("moveend", handleMoveEnd);
    map.on("resize", updateArrowVisibility);

    return () => {
      if (mapRef.current) {
        mapRef.current.off("zoomend", handleZoomEnd);
        mapRef.current.off("moveend", handleMoveEnd);
        mapRef.current.off("resize", updateArrowVisibility);
        allArrowMarkersRef.current.forEach((marker) => marker.remove());
        allArrowMarkersRef.current = [];
        if (startFlagRef.current) startFlagRef.current.remove();
        if (endFlagRef.current) endFlagRef.current.remove();
        if (markerPlayerRef.current) markerPlayerRef.current.remove();
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [data, handleZoomEnd, handleMoveEnd, updateArrowVisibility]);

  // Handle tile layer changes
  useEffect(() => {
    if (!mapRef.current || !tileLayerRef.current) return;

    tileLayerRef.current.remove();

    let lyrsParam = isSatelliteView ? "s" : "m";
    if (showTraffic) {
      lyrsParam += ",traffic";
    }

    tileLayerRef.current = L.tileLayer(
      `https://{s}.google.com/vt/lyrs=${lyrsParam}&x={x}&y={y}&z={z}`,
      {
        subdomains: ["mt0", "mt1", "mt2", "mt3"],
      }
    ).addTo(mapRef.current);
  }, [isSatelliteView, showTraffic]);

  // Draw route with flags
  useEffect(() => {
    if (!mapRef.current || !data || data.length === 0) return;
    const map = mapRef.current;

    if (completeRoute.length > 1) {
      if (polylineRef.current) polylineRef.current.remove();

      const routeCoordinates = completeRoute.map((point) => point.coordinates);

      polylineRef.current = L.polyline(routeCoordinates, {
        color: "#0ea5e9",
        weight: 4,
        opacity: 0.8,
        smoothFactor: 0, // Fix for marker drifting off the line
      }).addTo(map);

      const startPoint = data[0];
      const startLat = startPoint.latitude;
      const startLng = startPoint.longitude;
      const startFlagIcon = createFlagIcon("green", 40);

      if (startFlagRef.current) startFlagRef.current.remove();

      const startDate = new Date(startPoint.createdAt).toLocaleTimeString(
        "en-GB",
        {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
          timeZone: "UTC",
        }
      );

      startFlagRef.current = L.marker([startLat, startLng], {
        icon: startFlagIcon,
        zIndexOffset: 500,
      }).addTo(map).bindPopup(`
<div style="
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  padding: 8px 4px;
  min-width: 220px;
  line-height: 1.5;
  color: #374151;
">
  <div style="
    font-size: 14px;
    font-weight: 600;
    color: #111827;
    margin-bottom: 10px;
    padding-bottom: 8px;
    border-bottom: 1px solid #e5e7eb;
  ">
    Start Point
  </div>
  
  <div style="font-size: 12px; margin-bottom: 10px;">
    <div style="color: #6b7280; font-weight: 500; margin-bottom: 4px;">Coordinates</div>
    <div style="
      color: #111827;
      font-family: 'Courier New', monospace;
      background: #f3f4f6;
      padding: 6px 8px;
      border-radius: 4px;
      font-size: 11px;
    ">
      ${startLat.toFixed(6)}, ${startLng.toFixed(6)}
    </div>
  </div>
  
  <div style="
    padding-top: 8px;
    border-top: 1px solid #e5e7eb;
    font-size: 12px;
    margin-bottom: 10px;
  ">
    <div style="color: #6b7280; font-weight: 500; margin-bottom: 4px;">Address</div>
    <div style="color: #111827; line-height: 1.4;">${startAddress || "Loading address..."
        }</div>
  </div>
  
  <div style="
    padding-top: 8px;
    border-top: 1px solid #e5e7eb;
    font-size: 12px;
  ">
    <div style="color: #6b7280; font-weight: 500; margin-bottom: 4px;">Time</div>
    <div style="color: #111827;">${startDate}</div>
  </div>
</div>
`);

      const endPoint = data[data.length - 1];
      const endLat = endPoint.latitude;
      const endLng = endPoint.longitude;
      const endFlagIcon = createFlagIcon("red", 40);

      if (endFlagRef.current) endFlagRef.current.remove();

      const endDate = new Date(endPoint.createdAt).toLocaleTimeString("en-GB", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
        timeZone: "UTC",
      });

      endFlagRef.current = L.marker([endLat, endLng], {
        icon: endFlagIcon,
        zIndexOffset: 500,
      }).addTo(map).bindPopup(`
<div style="
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  padding: 8px 4px;
  min-width: 220px;
  line-height: 1.5;
  color: #374151;
">
  <div style="
    font-size: 14px;
    font-weight: 600;
    color: #111827;
    margin-bottom: 10px;
    padding-bottom: 8px;
    border-bottom: 1px solid #e5e7eb;
  ">
    End Point
  </div>
  
  <div style="font-size: 12px; margin-bottom: 10px;">
    <div style="color: #6b7280; font-weight: 500; margin-bottom: 4px;">Coordinates</div>
    <div style="
      color: #111827;
      font-family: 'Courier New', monospace;
      background: #f3f4f6;
      padding: 6px 8px;
      border-radius: 4px;
      font-size: 11px;
    ">
      ${endLat.toFixed(6)}, ${endLng.toFixed(6)}
    </div>
  </div>
  
  <div style="
    padding-top: 8px;
    border-top: 1px solid #e5e7eb;
    font-size: 12px;
    margin-bottom: 10px;
  ">
    <div style="color: #6b7280; font-weight: 500; margin-bottom: 4px;">Address</div>
    <div style="color: #111827; line-height: 1.4;">${endAddress || "Loading address..."
        }</div>
  </div>
  
  <div style="
    padding-top: 8px;
    border-top: 1px solid #e5e7eb;
    font-size: 12px;
  ">
    <div style="color: #6b7280; font-weight: 500; margin-bottom: 4px;">Time</div>
    <div style="color: #111827;">${endDate}</div>
  </div>
</div>
`);

      reverseGeocode(startLat, startLng).then(setStartAddress);
      reverseGeocode(endLat, endLng).then(setEndAddress);

      setIsRouteDrawn(true);
    }
  }, [data, completeRoute, startAddress, endAddress, createFlagIcon]);

  // Create arrows when route is drawn
  useEffect(() => {
    if (isRouteDrawn && mapRef.current) {
      const zoom = mapRef.current.getZoom();
      // createAllArrowMarkers(zoom);
      updateArrowVisibility();
    }
  }, [isRouteDrawn, data, createAllArrowMarkers, updateArrowVisibility]);

  // Create MarkerPlayer
  useEffect(() => {
    if (!mapRef.current || !isRouteDrawn || data.length < 2) return;

    if (markerPlayerRef.current) {
      markerPlayerRef.current.remove();
    }

    const points: Point[] = data.map((d) => ({
      latlng: [d.latitude, d.longitude],
      course: d.course,
    }));


    const totalDuration = BASE_PLAYBACK_SECONDS / playbackSpeed;
    const segmentCount = points.length - 1;

    // Calculate real durations based on timestamps
    const realDurations: number[] = [];
    let calculatedTotalDuration = 0;

    for (let i = 0; i < data.length - 1; i++) {
      const t1 = new Date(data[i].createdAt).getTime();
      const t2 = new Date(data[i + 1].createdAt).getTime();
      let diffSeconds = (t2 - t1) / 1000;

      // Fallback for bad data or zero time difference
      if (diffSeconds < 0.1) diffSeconds = 0.1;

      realDurations.push(diffSeconds);
      calculatedTotalDuration += diffSeconds;
    }

    // Apply playback speed
    const adjustedDurations = realDurations.map(d => d / playbackSpeed);

    const player = new MarkerPlayer(
      mapRef.current!,
      points,
      adjustedDurations,
      {
        icon: createVehicleIcon(),
      }
    );



    markerPlayerRef.current = player;
    currentAngleRef.current = data[0]?.course ?? 0;

    player.setOnUpdate((latlng, index) => {
      const bounds = mapRef.current!.getBounds();
      if (!bounds.pad(-0.5).contains(latlng)) {
        mapRef.current!.panTo(latlng, { animate: false });
      }

      // ⬇️ BEARING BASED ROTATION
      const curr = L.latLng(latlng);
      const nextPoint = data[index + 1];

      if (nextPoint) {
        const next = L.latLng(nextPoint.latitude, nextPoint.longitude);
        const bearing = getBearing(curr, next);
        smoothRotateVehicle((player as any).marker, bearing);
      }

      const percent = (index / (data.length - 1)) * 100;
      setProgress(percent);
      onProgressChange?.(percent);
    });

    player.setOnComplete(() => {
      setIsPlaying(false);
      setProgress(0);
      currentAngleRef.current = data[0]?.course ?? 0;
    });

    setIsPlaying(false);
    setProgress(0);

    return () => {
      if (player) {
        player.remove();
      }
      markerPlayerRef.current = null;
    };
  }, [
    isRouteDrawn,
    data,
    // playbackSpeed,
    smoothRotateVehicle,
    createVehicleIcon,
    onProgressChange,
  ]);

  useEffect(() => {
    if (!isRouteDrawn || isPlaying) return;
    // createAllArrowMarkers(mapRef.current!.getZoom());
  }, [isRouteDrawn, isPlaying]);


  useEffect(() => {
    if (!mapRef.current) return;

    // Clear old
    stopMarkersRef.current.forEach((m) => m.remove());
    stopMarkersRef.current.clear();

    stops?.forEach((stop) => {
      console.log("stop", stop);
      const marker = L.marker([stop.lat, stop.lng], {
        icon: createStopIcon(stop.id === activeStopId),
        zIndexOffset: 800,
      }).addTo(mapRef.current!).bindPopup(`
<div style="
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  padding: 8px 4px;
  min-width: 220px;
  line-height: 1.5;
  color: #374151;
">
  <div style="
    font-size: 14px;
    font-weight: 600;
    color: #111827;
    margin-bottom: 10px;
    padding-bottom: 8px;
    border-bottom: 1px solid #e5e7eb;
  ">
    Stop ${stop.id + 1}
  </div>
  
  <div style="font-size: 12px; margin-bottom: 10px;">
    <div style="display: grid; grid-template-columns: 80px 1fr; gap: 6px 8px;">
      <span style="color: #6b7280; font-weight: 500;">From:</span>
      <span style="color: #111827;">${new Date(stop.startTime).toLocaleString(
        "en-GB",
        {
          timeZone: "UTC",
        }
      )}</span>
      
      <span style="color: #6b7280; font-weight: 500;">To:</span>
      <span style="color: #111827;">${new Date(stop.endTime).toLocaleString(
        "en-GB",
        {
          timeZone: "UTC",
        }
      )}</span>
      
      <span style="color: #6b7280; font-weight: 500;">Duration:</span>
      <span style="color: #111827;">${stop.duration}</span>
      
      <span style="color: #6b7280; font-weight: 500;">Dist From Prev:</span>
      <span style="color: #111827;">${stop.distanceFromPrev.toFixed(
        2
      )} km</span>
    </div>
  </div>
  
  <div style="
    padding-top: 8px;
    border-top: 1px solid #e5e7eb;
    font-size: 12px;
  ">
    <div style="color: #6b7280; font-weight: 500; margin-bottom: 4px;">Address</div>
    <div style="color: #111827; line-height: 1.4;">${stopAddressMap[stop.id] ?? "Fetching address..."
        }</div>
  </div>
</div>
`);

      marker.on("click", () => {
        onStopClick?.(stop.id);
        marker.openPopup();
      });

      stopMarkersRef.current.set(stop.id, marker);
    });
  }, [stops]);

  useEffect(() => {
    if (activeStopId == null) return;

    const marker = stopMarkersRef.current.get(activeStopId);
    if (marker) {
      marker.openPopup();
      mapRef.current?.panTo(marker.getLatLng(), { animate: true });
    }
    stopMarkersRef.current.forEach((marker, id) => {
      marker.setIcon(createStopIcon(id === activeStopId));
    });
  }, [activeStopId]);

  // Handle speed changes
  useEffect(() => {
    if (!markerPlayerRef.current || data.length < 2) return;

    // Shorter total time => faster movement
    const scaledTotalDuration = BASE_PLAYBACK_SECONDS / playbackSpeed;

    // Recreate distance-based durations for this shorter/longer total time
    const points: Point[] = data.map((d) => ({
      latlng: { lat: d.latitude, lng: d.longitude },
      course: d.course,
    }));

    // Use the same logic as createDurations(distance-based)
    let totalDistance = 0;
    const distances: number[] = [];

    for (let i = 0; i < points.length - 1; i++) {
      const d = L.latLng(points[i].latlng).distanceTo(points[i + 1].latlng);
      distances.push(d);
      totalDistance += d;
    }

    if (totalDistance === 0 || distances.length === 0) return;

    const ratio = scaledTotalDuration / totalDistance;
    const durations = distances.map((d) => Math.max(d * ratio, 0.1));

    markerPlayerRef.current.setDuration(durations);
  }, [playbackSpeed, data]);

  // Enhanced resize handler
  useEffect(() => {
    if (!mapRef.current) return;

    // Immediate invalidation (for collapse)
    mapRef.current.invalidateSize();

    // Delayed invalidation (for expand)
    const timeout = setTimeout(() => {
      mapRef.current?.invalidateSize();
    }, 350); // slightly > transition duration

    return () => clearTimeout(timeout);
  }, [isExpanded]);

  // Playback controls
  const handlePlayPause = useCallback(() => {
    if (!markerPlayerRef.current) {
      alert("Select vehicle and date range first.");
      return;
    }

    if (isPlaying) {
      markerPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      markerPlayerRef.current.start();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const handleStop = useCallback(() => {
    if (!markerPlayerRef.current) {
      alert("Select vehicle and date range first.");
      return;
    }
    markerPlayerRef.current.stop();
    setIsPlaying(false);
    setProgress(0);
    currentAngleRef.current = data[0]?.course ?? 0;
  }, [data]);

  const handleSpeedChange = useCallback((speed: number) => {
    if (!markerPlayerRef.current) return;
    setPlaybackSpeed(speed);
  }, []);

  const handleProgressChange = useCallback(
    (value: number) => {
      if (!markerPlayerRef.current || !data.length) {
        alert("Select vehicle and date range first.");
        return;
      }

      markerPlayerRef.current.setProgress(value);
      setProgress(value);

      // ✅ Get the actual marker position and find nearest data point
      const markerPos = markerPlayerRef.current["marker"].getLatLng();

      let closestIndex = 0;
      let minDist = Infinity;

      for (let i = 0; i < data.length; i++) {
        const dist = L.latLng(data[i].latitude, data[i].longitude).distanceTo(
          markerPos
        );
        if (dist < minDist) {
          minDist = dist;
          closestIndex = i;
        }
      }

      currentAngleRef.current = data[closestIndex].course;
    },
    [data]
  );

  // if (!data || data.length === 0) {
  //   return (
  //     <div className="w-full h-full flex items-center justify-center">
  //       <p>No Data Available</p>
  //     </div>
  //   );
  // }

  return (
    <div className="relative w-full h-full rounded-t-lg overflow-hidden border border-border bg-card shadow-[var(--shadow-panel)]">
      <div ref={mapContainerRef} className="w-full h-full" />
      <PlaybackControls
        handlePlayPause={handlePlayPause}
        handleProgressChange={handleProgressChange}
        handleSpeedChange={handleSpeedChange}
        playbackSpeed={playbackSpeed}
        progress={progress}
        handleStop={handleStop}
        isPlaying={isPlaying}
        historyData={data}
        isExpanded={isExpanded || false}
      />
      <div className="absolute top-20 left-4 flex flex-col gap-2 z-[1000]">
        {/* Satellite Toggle */}
        <button
          className={`w-10 h-10 bg-card cursor-pointer border border-border rounded flex items-center justify-center hover:bg-secondary transition-colors ${isSatelliteView ? "bg-primary text-primary-foreground" : ""
            }`}
          onClick={() => setIsSatelliteView(!isSatelliteView)}
          title={isSatelliteView ? "Normal Map" : "Satellite View"}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {isSatelliteView ? (
              <>
                <path d="M3 6h4l2 2h8l2-2h2v10H3V6z" />
                <path d="M7 6v12" />
                <path d="M11 6v12" />
                <path d="M15 6v12" />
              </>
            ) : (
              <Satellite />
            )}
          </svg>
        </button>

        {/* Traffic Toggle */}
        <button
          className={`w-10 h-10 bg-card cursor-pointer border border-border rounded flex items-center justify-center hover:bg-secondary transition-colors ${showTraffic ? "bg-primary text-primary-foreground" : ""
            }`}
          onClick={() => setShowTraffic(!showTraffic)}
          title={showTraffic ? "Hide Traffic" : "Show Traffic"}
        >
          <LiaTrafficLightSolid className="w-6 h-6" />
        </button>

        {/* Divider */}
        <div className="w-full h-px bg-border" />

        {/* Zoom In */}
        <button
          className="w-10 h-10 bg-card cursor-pointer border border-border rounded flex items-center justify-center hover:bg-secondary transition-colors"
          onClick={() => mapRef.current?.zoomIn()}
          title="Zoom In"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        {/* Zoom Out */}
        <button
          className="w-10 h-10 bg-card cursor-pointer border border-border rounded flex items-center justify-center hover:bg-secondary transition-colors"
          onClick={() => mapRef.current?.zoomOut()}
          title="Zoom Out"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>
      <style jsx>{`
        .course-arrow {
          background: transparent !important;
          border: none !important;
        }
        .vehicle-marker {
          background: transparent !important;
          border: none !important;
          transition: none !important;
        }

        .vehicle-rotator {
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        .green-flag,
        .red-flag {
          background: transparent !important;
          border: none !important;
        }
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          background: #0ea5e9;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          transition: transform 0.2s;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.1);
        }
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: #0ea5e9;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          border: none;
        }
      `}</style>
    </div>
  );
};

export default React.memo(VehicleMap);
