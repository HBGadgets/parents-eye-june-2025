import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polygon, Polyline, useMap } from 'react-leaflet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapIcon, Satellite, SatelliteDish, TrafficCone } from 'lucide-react';
import { FaTrafficLight } from 'react-icons/fa';

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Type definitions
interface MarkerData {
  id: string | number;
  position: [number, number];
  popup?: string;
}

interface CircleData {
  id: string | number;
  center: [number, number];
  radius: number;
  color?: string;
  fillColor?: string;
  fillOpacity?: number;
}

interface PolygonData {
  id: string | number;
  positions: [number, number][];
  color?: string;
  fillColor?: string;
  fillOpacity?: number;
}

interface PolylineData {
  id: string | number;
  positions: [number, number][];
  color?: string;
  weight?: number;
}

interface ClickCoords {
  lat: number;
  lng: number;
}

// Map layer types (removed traffic from base layers)
type MapLayerType = 'street' | 'satellite';

interface TileLayerConfig {
  url: string;
  attribution: string;
  maxZoom?: number;
}

// Component to update map view when center changes
interface MapUpdaterProps {
  center: [number, number];
  zoom?: number;
}

function MapUpdater({ center, zoom }: MapUpdaterProps) {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || map.getZoom());
    }
  }, [center, zoom, map]);
  
  return null;
}

// Main Dynamic Map Component Props
interface DynamicLeafletMapProps {
  center?: [number, number];
  zoom?: number;
  height?: string;
  width?: string;
  markers?: MarkerData[];
  circles?: CircleData[];
  polygons?: PolygonData[];
  polylines?: PolylineData[];
  onMapClick?: (coords: ClickCoords) => void;
  onMarkerClick?: (marker: MarkerData) => void;
  interactive?: boolean;
  showLayerControl?: boolean;
  defaultLayer?: MapLayerType;
  showTrafficByDefault?: boolean;
}

export default function DynamicLeafletMap({
  center = [40.7128, -74.0060], // Default to NYC
  zoom = 13,
  height = '500px',
  width = '100%',
  markers = [],
  circles = [],
  polygons = [],
  polylines = [],
  onMapClick,
  onMarkerClick,
  interactive = true,
  showLayerControl = true,
  defaultLayer = 'street',
  showTrafficByDefault = false
}: DynamicLeafletMapProps) {
  const [currentCenter, setCurrentCenter] = useState<[number, number]>(center);
  const [currentZoom, setCurrentZoom] = useState<number>(zoom);
  const [activeLayer, setActiveLayer] = useState<MapLayerType>(defaultLayer);
  const [showTrafficOverlay, setShowTrafficOverlay] = useState<boolean>(showTrafficByDefault);
  
  // Update center when prop changes
  useEffect(() => {
    setCurrentCenter(center);
  }, [center]);

  // Tile layer configurations
  const tileLayerConfigs: Record<MapLayerType, TileLayerConfig> = {
    street: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      maxZoom: 18
    }
  };

  const currentTileConfig = tileLayerConfigs[activeLayer];

 const layerButtons = [
  { key: 'street' as MapLayerType, icon: <MapIcon size={18} />, label: 'Street View' },
  { key: 'satellite' as MapLayerType, icon: <Satellite size={18} />, label: 'Satellite View' }
];

  return (
    <TooltipProvider>
      <div className="relative">
        {/* Layer Control */}
        {showLayerControl && (
          <div className="absolute top-4 right-4 z-[1000]">
            {/* Base Layer Buttons */}
            <div className="p-1">
              <div className="flex flex-col space-y-1">
                {layerButtons.map(({ key, icon, label }) => (
                  <Tooltip key={key}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setActiveLayer(key)}
                        className={`w-10 h-10 flex items-center justify-center rounded-md text-lg transition-all duration-200 ${
                          activeLayer === key
                            ? 'bg-black text-white shadow-sm'
                            : 'bg-white text-gray-600 hover:bg-gray-50 hover:shadow-sm border border-transparent '

                        }`}
                      >
                       {icon}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      <p>{label}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
                              
                {/* Traffic Overlay Toggle */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setShowTrafficOverlay(!showTrafficOverlay)}
                      className={`w-10 h-10 flex items-center justify-center rounded-md text-lg transition-all duration-200 ${
                        showTrafficOverlay
                          ? 'bg-black text-white shadow-sm'
                          : 'bg-white text-gray-600 hover:bg-gray-50 hover:shadow-sm border border-transparent '
                      }`}
                    >
                      <FaTrafficLight size={18} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p>{showTrafficOverlay ? 'Hide Traffic' : 'Show Traffic'}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        )}

      <div style={{ height, width }}>
        <MapContainer
          center={currentCenter}
          zoom={currentZoom}
          style={{ height: '100%', width: '100%' }}
          className="rounded-lg"
        >
          {/* Base Layer */}
          <TileLayer
            key={`base-${activeLayer}`} // Force re-render when layer changes
            url={currentTileConfig.url}
            attribution={currentTileConfig.attribution}
            maxZoom={currentTileConfig.maxZoom || 19}
            zIndex={1}
          />
          
          {/* Traffic overlay - shows on any base layer when enabled */}
          {showTrafficOverlay && (
            <TileLayer
              key={`traffic-overlay-${activeLayer}`} // Include activeLayer to force re-render
              url="https://{s}.google.com/vt/lyrs=h@221097413,traffic&x={x}&y={y}&z={z}"
              subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
              attribution=""
              opacity={0.7}
              zIndex={2}
            />
          )}
          
          <MapUpdater center={currentCenter} zoom={currentZoom} />
          
          {/* Render Markers */}
          {markers.map((marker) => (
            <Marker
              key={marker.id}
              position={marker.position}
              eventHandlers={{
                click: () => onMarkerClick && onMarkerClick(marker)
              }}
            >
              {marker.popup && (
                <Popup>
                  <div>
                    {marker.popup}
                  </div>
                </Popup>
              )}
            </Marker>
          ))}
          
          {/* Render Circles */}
          {circles.map((circle) => (
            <Circle
              key={circle.id}
              center={circle.center}
              radius={circle.radius}
              pathOptions={{
                color: circle.color || 'blue',
                fillColor: circle.fillColor || 'lightblue',
                fillOpacity: circle.fillOpacity || 0.5
              }}
            >
              <Popup>
                <div>
                  Circle - Radius: {circle.radius}m
                </div>
              </Popup>
            </Circle>
          ))}
          
          {/* Render Polygons */}
          {polygons.map((polygon) => (
            <Polygon
              key={polygon.id}
              positions={polygon.positions}
              pathOptions={{
                color: polygon.color || 'purple',
                fillColor: polygon.fillColor || 'lightpurple',
                fillOpacity: polygon.fillOpacity || 0.5
              }}
            >
              <Popup>
                <div>
                  Polygon - {polygon.positions.length} points
                </div>
              </Popup>
            </Polygon>
          ))}
          
          {/* Render Polylines */}
          {polylines.map((polyline) => (
            <Polyline
              key={polyline.id}
              positions={polyline.positions}
              pathOptions={{
                color: polyline.color || 'orange',
                weight: polyline.weight || 3
              }}
            >
              <Popup>
                <div>
                  Line - {polyline.positions.length} points
                </div>
              </Popup>
            </Polyline>
          ))}
        </MapContainer>
      </div>      
    </div>
    </TooltipProvider>
  );
}
