import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { DeviceHistoryItem } from "@/data/sampleData";

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
  currentIndex: number;
}

const VehicleMap: React.FC<VehicleMapProps> = ({ data, currentIndex }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const arrowLayerRef = useRef<L.LayerGroup | null>(null);
  const allArrowMarkersRef = useRef<L.Marker[]>([]);
  const startFlagRef = useRef<L.Marker | null>(null);
  const endFlagRef = useRef<L.Marker | null>(null);
  const [isRouteDrawn, setIsRouteDrawn] = useState(false);

  const currentPoint = data[currentIndex];

  // Complete route using all data points
  const completeRoute = data.map(
    (item) => [item.latitude, item.longitude] as [number, number]
  );

  // Function to create flag icon
  const createFlagIcon = (color: "green" | "red", size: number = 24) => {
    const flagColor = color === "green" ? "#10b981" : "#ef4444";
    return L.divIcon({
      className: `${color}-flag`,
      html: `
        <div style="
          width: ${size}px; 
          height: ${size}px; 
          display: flex; 
          align-items: center; 
          justify-content: center;
        ">
          <svg viewBox="0 0 24 24" style="
            width: ${size}px; 
            height: ${size}px; 
            fill: ${flagColor};
            filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.3));
          ">
            <path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/>
          </svg>
        </div>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size - 2],
    });
  };

  // Function to create arrow icon with course direction
  const createArrowIcon = (course: number, size: number = 16) => {
    return L.divIcon({
      className: "course-arrow",
      html: `
        <div style="
          transform: rotate(${course}deg); 
          width: ${size}px; 
          height: ${size}px; 
          display: flex; 
          align-items: center; 
          justify-content: center;
        ">
          <svg viewBox="0 0 24 24" style="
            width: ${size}px; 
            height: ${size}px; 
            fill: white;
            filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.3));
          ">
            <path d="M6 6L10.5 12L6 18V6zM13.5 6L18 12L13.5 18V6z"/>
          </svg>
        </div>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  };

  // Function to calculate arrow density based on zoom level
  const getArrowDensity = (zoom: number): number => {
    if (zoom >= 16) return 0.01;
    if (zoom >= 14) return 0.005;
    if (zoom >= 12) return 0.005;
    if (zoom >= 10) return 0;
    return 0.0;
  };

  // Function to create all arrow markers initially
  const createAllArrowMarkers = (zoom: number) => {
    if (!mapRef.current || !data || data.length === 0) return;

    const density = getArrowDensity(zoom);
    const step = Math.max(1, Math.floor(1 / density));
    const arrowSize = zoom >= 14 ? 20 : zoom >= 12 ? 16 : 12;

    // Clear existing arrow markers
    allArrowMarkersRef.current.forEach((marker) => marker.remove());
    allArrowMarkersRef.current = [];

    // Create arrow markers at calculated intervals
    for (let i = 0; i < data.length; i += step) {
      const point = data[i];
      const arrowIcon = createArrowIcon(point.course, arrowSize);

      const marker = L.marker([point.latitude, point.longitude], {
        icon: arrowIcon,
        interactive: false,
        zIndexOffset: -1000,
      });

      allArrowMarkersRef.current.push(marker);
    }
  };

  // Function to update arrow visibility based on viewport
  const updateArrowVisibility = () => {
    if (!mapRef.current || !arrowLayerRef.current) return;

    const bounds = mapRef.current.getBounds();

    // Clear the layer group
    arrowLayerRef.current.clearLayers();

    // Add only visible arrows to the layer group
    allArrowMarkersRef.current.forEach((marker) => {
      const position = marker.getLatLng();
      if (bounds.contains(position)) {
        marker.addTo(arrowLayerRef.current);
      }
    });

    // Debug info
    const visibleCount = allArrowMarkersRef.current.filter((marker) =>
      bounds.contains(marker.getLatLng())
    ).length;

    console.log(
      `Total arrows: ${allArrowMarkersRef.current.length}, Visible: ${visibleCount}`
    );
  };

  // Function to handle zoom changes
  const handleZoomEnd = () => {
    if (!mapRef.current) return;

    const zoom = mapRef.current.getZoom();

    // Recreate arrows with new density and size
    createAllArrowMarkers(zoom);

    // Update visibility
    updateArrowVisibility();
  };

  // Function to handle pan/move changes
  const handleMoveEnd = () => {
    // Only update visibility, don't recreate arrows
    updateArrowVisibility();
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Create map
    const map = L.map(mapContainerRef.current, {
      center: [currentPoint.latitude, currentPoint.longitude],
      zoom: 15,
      zoomControl: false,
    });

    // Add tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    mapRef.current = map;

    // Create arrow layer group
    arrowLayerRef.current = L.layerGroup().addTo(map);

    // Add event listeners
    map.on("zoomend", handleZoomEnd);
    map.on("moveend", handleMoveEnd);
    map.on("resize", updateArrowVisibility);

    return () => {
      if (mapRef.current) {
        mapRef.current.off("zoomend", handleZoomEnd);
        mapRef.current.off("moveend", handleMoveEnd);
        mapRef.current.off("resize", updateArrowVisibility);

        // Clean up arrow markers
        allArrowMarkersRef.current.forEach((marker) => marker.remove());
        allArrowMarkersRef.current = [];

        // Clean up flag markers
        if (startFlagRef.current) {
          startFlagRef.current.remove();
          startFlagRef.current = null;
        }
        if (endFlagRef.current) {
          endFlagRef.current.remove();
          endFlagRef.current = null;
        }

        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [data]);

  // Draw complete route with start and end flags
  useEffect(() => {
    if (!mapRef.current || !data || data.length === 0) return;

    const map = mapRef.current;

    // Draw complete polyline
    if (completeRoute.length > 1) {
      if (polylineRef.current) {
        polylineRef.current.remove();
      }

      polylineRef.current = L.polyline(completeRoute, {
        color: "#0ea5e9",
        weight: 4,
        opacity: 0.8,
      }).addTo(map);

      // Add start flag (green) at first point
      const startPoint = data[0];
      const startFlagIcon = createFlagIcon("green", 40);

      if (startFlagRef.current) {
        startFlagRef.current.remove();
      }

      startFlagRef.current = L.marker(
        [startPoint.latitude, startPoint.longitude],
        {
          icon: startFlagIcon,
          zIndexOffset: 500,
        }
      ).addTo(map);

      // Add end flag (red) at last point
      const endPoint = data[data.length - 1];
      const endFlagIcon = createFlagIcon("red", 40);

      if (endFlagRef.current) {
        endFlagRef.current.remove();
      }

      endFlagRef.current = L.marker([endPoint.latitude, endPoint.longitude], {
        icon: endFlagIcon,
        zIndexOffset: 500,
      }).addTo(map);

      setIsRouteDrawn(true);
    }
  }, [data, completeRoute]);

  // Create arrows when route is drawn
  useEffect(() => {
    if (isRouteDrawn && mapRef.current) {
      const zoom = mapRef.current.getZoom();
      createAllArrowMarkers(zoom);
      updateArrowVisibility();
    }
  }, [isRouteDrawn, data]);

  // Update marker position after route is drawn
  useEffect(() => {
    if (!mapRef.current || !isRouteDrawn || !currentPoint) return;

    const map = mapRef.current;

    // Create custom vehicle icon
    const vehicleIcon = L.divIcon({
      className: "vehicle-marker",
      html: `
        <div style="
          transform: rotate(${currentPoint.course}deg); 
          width: 32px; 
          height: 32px; 
          display: flex; 
          align-items: center; 
          justify-content: center;
          z-index: 1000;
        ">
          <img src="/Top Y.svg" />
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    // Update or create marker
    if (markerRef.current) {
      markerRef.current.setLatLng([
        currentPoint.latitude,
        currentPoint.longitude,
      ]);
      markerRef.current.setIcon(vehicleIcon);
    } else {
      markerRef.current = L.marker(
        [currentPoint.latitude, currentPoint.longitude],
        {
          icon: vehicleIcon,
          zIndexOffset: 1000,
        }
      ).addTo(map);
    }

    // Optionally center map on current position
    map.setView([currentPoint.latitude, currentPoint.longitude], map.getZoom());
  }, [currentPoint, currentIndex, isRouteDrawn]);

  if (!data || data.length === 0) {
    return <p>No Data Available</p>;
  }

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden border border-border bg-card shadow-[var(--shadow-panel)]">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Custom zoom controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-[1000]">
        <button
          className="w-8 h-8 bg-card border border-border rounded flex items-center justify-center hover:bg-secondary transition-colors"
          onClick={() => {
            if (mapRef.current) {
              mapRef.current.zoomIn();
            }
          }}
        >
          +
        </button>
        <button
          className="w-8 h-8 bg-card border border-border rounded flex items-center justify-center hover:bg-secondary transition-colors"
          onClick={() => {
            if (mapRef.current) {
              mapRef.current.zoomOut();
            }
          }}
        >
          -
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
        }
        .green-flag {
          background: transparent !important;
          border: none !important;
        }
        .red-flag {
          background: transparent !important;
          border: none !important;
        }
      `}</style>
    </div>
  );
};

export default VehicleMap;
