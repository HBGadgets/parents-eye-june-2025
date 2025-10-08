import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { DeviceHistoryItem } from "@/data/sampleData";
import { reverseGeocode } from "@/util/reverse-geocode";
// import { MapPin } from "lucide-react";

// Fix for default markers
delete (L.Icon.Default.prototype as unknown)._getIconUrl;
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
  isExpanded: boolean;
}

const VehicleMap: React.FC<VehicleMapProps> = ({
  data,
  currentIndex,
  isExpanded,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const arrowLayerRef = useRef<L.LayerGroup | null>(null);
  const allArrowMarkersRef = useRef<L.Marker[]>([]);
  const startFlagRef = useRef<L.Marker | null>(null);
  const endFlagRef = useRef<L.Marker | null>(null);
  const [isRouteDrawn, setIsRouteDrawn] = useState(false);
  const [startAddress, setStartAddress] = useState<string>("");
  const [endAddress, setEndAddress] = useState<string>("");
  const speedCache = new Map<number, string>();
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

  // Function to create double arrow icon with course direction
  // const createArrowIcon = (course: number, size: number = 30) => {
  //   return L.divIcon({
  //     className: "course-arrow",
  //     html: `
  //   <div style="
  //     transform: rotate(${course}deg);
  //     width: ${size}px;
  //     height: ${size}px;
  //     display: flex;
  //     align-items: center;
  //     justify-content: center;
  //   ">
  //     <div style="
  //       display: flex;
  //       flex-direction: column;
  //       align-items: center;
  //       margin-top: -3px;
  //     ">
  //       <svg
  //         width="${Math.round(size * 0.75)}"
  //         height="${Math.round(size * 0.75)}"
  //         viewBox="0 0 24 24"
  //         fill="none"
  //         style="filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.3));"
  //       >
  //         <path
  //           d="M7 10L12 15L17 10"
  //           stroke="white"
  //           strokeWidth="3"
  //           strokeLinecap="round"
  //           strokeLinejoin="round"
  //         />
  //       </svg>
  //       <svg
  //         width="${Math.round(size * 0.75)}"
  //         height="${Math.round(size * 0.75)}"
  //         viewBox="0 0 24 24"
  //         fill="none"
  //         style="margin-top: -10px; filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.3));"
  //       >
  //         <path
  //           d="M7 10L12 15L17 10"
  //           stroke="white"
  //           strokeWidth="3"
  //           strokeLinecap="round"
  //           strokeLinejoin="round"
  //         />
  //       </svg>
  //     </div>
  //   </div>
  // `,
  //     iconSize: [size, size],
  //     iconAnchor: [size / 2, size / 2],
  //   });
  // };

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
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-top: -3px;
      ">
        <svg 
          width="${Math.round(size * 0.75)}" 
          height="${Math.round(size * 0.75)}" 
          viewBox="0 0 24 24" 
          fill="none"
          style="filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.7));"
        >
          <path
            d="M7 10L12 15L17 10"
            stroke="white"
            stroke-width="4"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <svg 
          width="${Math.round(size * 0.75)}" 
          height="${Math.round(size * 0.75)}" 
          viewBox="0 0 24 24" 
          fill="none"
          style="margin-top: -10px; filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.7));"
        >
          <path
            d="M7 10L12 15L17 10"
            stroke="white"
            stroke-width="4"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>
    </div>
  `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  };

  // Function to calculate arrow density based on zoom level
  const getArrowDensity = (zoom: number): number => {
    if (zoom >= 16) return 0.03; // More arrows at high zoom
    if (zoom >= 14) return 0.02; // Medium arrows
    if (zoom >= 12) return 0.01; // Fewer arrows
    if (zoom >= 10) return 0.005; // Very few arrows
    return 0.0; // No arrows at very low zoom
  };

  // Function to create all arrow markers initially
  const createAllArrowMarkers = (zoom: number) => {
    if (!mapRef.current || !data || data.length === 0) return;

    const density = getArrowDensity(zoom);
    const step = Math.max(1, Math.floor(1 / density));
    const arrowSize = zoom >= 14 ? 14 : zoom >= 12 ? 12 : 10;

    allArrowMarkersRef.current.forEach((marker) => {
      if (marker && marker.remove) {
        marker.remove();
      }
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
        interactive: true, // Enable interaction for tooltip and popup
        zIndexOffset: -1000,
      });

      // Bind tooltip with speed on hover
      marker.bindTooltip(`Speed: ${point.speed?.toFixed(1) || "N/A"} km/h`, {
        permanent: false,
        direction: "top",
        offset: [0, -10],
      });

      // Add click handler for popup with address, speed, createdAt
      marker.on("click", () => {
        const formattedTime = new Date(point.createdAt).toLocaleString(
          "en-US",
          {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
          }
        );

        // Check cache for address to avoid repeat calls
        if (speedCache.has(i)) {
          const cachedAddress = speedCache.get(i);
          marker
            .bindPopup(
              `
          <b>Vehicle Info</b><br/>
          Speed: ${point.speed?.toFixed(1) || "N/A"} km/h<br/>
          Time: ${formattedTime}<br/>
          Address: ${cachedAddress}
        `
            )
            .openPopup();
        } else {
          // Fetch address and then show popup
          reverseGeocode(point.latitude, point.longitude)
            .then((address) => {
              speedCache.set(i, address);
              marker
                .bindPopup(
                  `
            
            Speed: ${point.speed?.toFixed(1) || "N/A"} km/h<br/>
            Time: ${formattedTime}<br/>
            Address: ${address}
          `
                )
                .openPopup();
            })
            .catch(() => {
              marker
                .bindPopup(
                  `
            <b>Vehicle Info</b><br/>
            Speed: ${point.speed?.toFixed(1) || "N/A"} km/h<br/>
            Time: ${formattedTime}<br/>
            Address: Not available
          `
                )
                .openPopup();
            });
        }
      });

      allArrowMarkersRef.current.push(marker);
    }

    setTimeout(() => {
      updateArrowVisibility();
    }, 0);
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
    L.tileLayer("https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
      subdomains: ["mt0", "mt1", "mt2", "mt3"],
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
      const startDate = new Date(startPoint.createdAt).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });

      startFlagRef.current = L.marker(
        [startPoint.latitude, startPoint.longitude],
        {
          icon: startFlagIcon,
          zIndexOffset: 500,
        }
      ).addTo(map).bindPopup(`
    <b>Start Point</b><br/>

    <div style="display: flex; align-items: center; gap: 4px; margin-top: 4px;">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="black" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin-icon lucide-map-pin"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
      ${startPoint.latitude.toFixed(6)}, ${startPoint.longitude.toFixed(6)}
    </div>
    <div style="display: flex; align-items: center; gap: 4px; margin-top: 4px;">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="black" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-navigation-icon lucide-navigation"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg> 
      ${startAddress || "Loading address..."}
    </div>
    <div style="display: flex; align-items: center; gap: 4px; margin-top: 4px;">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="black" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-calendar-icon lucide-calendar"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>
      ${startDate}
    </div>
    <div style="display: flex; align-items: center; gap: 4px; margin-top: 4px;">
      <div style="width: 15px; height: 15px; background-color: green; border-radius: 50%; margin-top: 4px;">
      </div>: 
      Start Point
    </div>
    
  `);

      // Add end flag (red) at last point
      const endPoint = data[data.length - 1];
      const endFlagIcon = createFlagIcon("red", 40);

      if (endFlagRef.current) {
        endFlagRef.current.remove();
      }

      const endDate = new Date(endPoint.createdAt).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });

      endFlagRef.current = L.marker([endPoint.latitude, endPoint.longitude], {
        icon: endFlagIcon,
        zIndexOffset: 500,
      }).addTo(map).bindPopup(`
    <b>End Point</b><br/>
    <div style="margin-top: 4px;">
      <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="black" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin-icon lucide-map-pin"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg> ${endPoint.latitude.toFixed(
        6
      )}, ${endPoint.longitude.toFixed(6)}
      </div>
       <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="black" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-navigation-icon lucide-navigation"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg> 
      ${endAddress || "Loading address..."}
      </div>
      <div style="display: flex; align-items: center; gap: 4px;">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="black" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-calendar-icon lucide-calendar"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>
      ${endDate}
      </div>
      <div style="display: flex; align-items: center; gap: 4px;">
      <div style="width: 15px; height: 15px; background-color: red; border-radius: 50%; margin-top: 4px;">
      </div>: 
      End Point
      </div>
    </div>
  `);

      reverseGeocode(startPoint.latitude, startPoint.longitude).then(
        setStartAddress
      );
      reverseGeocode(endPoint.latitude, endPoint.longitude).then(setEndAddress);

      setIsRouteDrawn(true);
    }
  }, [data, completeRoute, startAddress, endAddress]);

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

  // Enhanced resize handler
  useEffect(() => {
    if (!mapRef.current) return;

    const handleResize = () => {
      if (mapRef.current) {
        // Immediate resize
        mapRef.current.invalidateSize();

        // Delayed resize after transition
        setTimeout(() => {
          mapRef.current!.invalidateSize();
        }, 350);
      }
    };

    // Listen for window resize events
    window.addEventListener("resize", handleResize);

    // Also handle when expansion state changes
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [isExpanded, data]);

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p>No Data Available</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full rounded-t-lg overflow-hidden border border-border bg-card shadow-[var(--shadow-panel)]">
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
        .course-arrow svg {
          display: block !important;
        }
        .course-arrow path {
          stroke: white !important;
          stroke-width: 4 !important;
          stroke-linecap: round !important;
          stroke-linejoin: round !important;
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

export default React.memo(VehicleMap, (prevProps, nextProps) => {
  return (
    prevProps.currentIndex === nextProps.currentIndex &&
    prevProps.data === nextProps.data
  );
});
