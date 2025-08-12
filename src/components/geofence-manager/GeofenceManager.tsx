"use client";
import React, { useState, useRef, useEffect, useCallback, use } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
// import { useToast } from "@/hooks/use-toast";
import { toast } from "sonner";
import {
  Search,
  Trash2,
  Upload,
  RotateCcw,
  Undo,
  ZoomIn,
  ZoomOut,
  Eye,
  X,
  MapPin,
  Save,
  XCircle,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import GeofenceConfigurationPanel from "./configuration-panel";
import { Branch, BranchGroup, Route, School } from "@/interface/modal";
import { useBranchData } from "@/hooks/useBranchData";
import { useRouteData } from "@/hooks/useRouteData";
import { useBranchGroupData } from "@/hooks/useBranchGroup";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import "./style.css";
import { api } from "@/services/apiService";

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Types
interface Geofence {
  geofenceName?: string;
  area: {
    center?: number[];
    radius?: number;
  };
  pickupTime?: Date;
  dropTime?: Date;
  schoolId?: string;
  branchId?: string;
  routeObjId?: string;
}

const GeofenceManager: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const geofenceLayerGroup = useRef<L.LayerGroup | null>(null);
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationSearchQuery, setLocationSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [activeGeofence, setActiveGeofence] = useState<string | null>(null);
  const [currentCoords, setCurrentCoords] = useState({
    lat: 21.1286677,
    lng: 79.1038211,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [currentGeofenceName, setCurrentGeofenceName] = useState("");
  const [currentRadius, setCurrentRadius] = useState(100);
  const [tempGeofence, setTempGeofence] = useState<Geofence | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const tempLayerGroup = useRef<L.LayerGroup | null>(null);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [selectedBranchGroup, setSelectedBranchGroup] =
    useState<BranchGroup | null>(null);
  const [filterResults, setFilterResults] = useState<Geofence[]>([]);
  const [filteredData, setFilteredData] = useState<Geofence[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [filteredBranches, setFilteredBranches] = useState<Branch[]>([]);
  const [filteredRoutes, setFilteredRoutes] = useState<Route[]>([]);
  const [filteredBranchGroups, setFilteredBranchGroups] = useState<
    BranchGroup[]
  >([]);
  const { data: branchData } = useBranchData();
  const { data: routeData } = useRouteData();
  const { data: branchGroupData } = useBranchGroupData();
  const queryClient = useQueryClient();
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [pickupTime, setPickupTime] = useState<Date | undefined>(undefined);
  const [dropTime, setDropTime] = useState<Date | undefined>(undefined);

  // Add Geofence Mutation
  const addGeofenceMutation = useMutation({
    mutationFn: async (newGeofence: any) => {
      const geofence = await api.post("/geofence", newGeofence);
      return geofence.geofence;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["geofences"] }); // 🔥 This invalidates all geofence-related queries
      alert("Geofence added successfully.");
    },
  });

  // Initialize map using vanilla Leaflet
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    try {
      console.log("Initializing Leaflet map...");

      // Create map instance
      map.current = L.map(mapContainer.current).setView(
        [21.1286677, 79.1038211],
        12
      );

      // Add tile layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map.current);

      // Create layer group for geofences
      geofenceLayerGroup.current = L.layerGroup().addTo(map.current);

      // Create layer group for temporary geofence
      tempLayerGroup.current = L.layerGroup().addTo(map.current);

      // Add click event listener
      map.current.on("click", (e: L.LeafletMouseEvent) => {
        const newCoords = {
          lat: parseFloat(e.latlng.lat.toFixed(6)),
          lng: parseFloat(e.latlng.lng.toFixed(6)),
        };
        setCurrentCoords(newCoords);

        setTempGeofence({
          type: "radius",
          geofenceName: currentGeofenceName || `New Geofence`,
          coordinates: [[newCoords.lng, newCoords.lat]], // matches render logic
          radius: currentRadius,
          pickupTime,
          dropTime,
        });
        setCurrentGeofenceName(currentGeofenceName || `New Geofence`);
      });

      console.log("Map initialized successfully");
    } catch (error) {
      console.error("Error initializing map:", error);

      toast.error("Map Error", {
        description: "Failed to initialize map. Please refresh the page.",
      });
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [toast]);

  // Update geofences on map
  useEffect(() => {
    if (!map.current || !geofenceLayerGroup.current) return;

    try {
      // Clear existing layers
      geofenceLayerGroup.current.clearLayers();

      geofences.forEach((geofence) => {
        if (
          geofence.type === "radius" &&
          geofence.radius &&
          geofence.coordinates.length > 0
        ) {
          const center: [number, number] = [
            geofence.coordinates[0][1],
            geofence.coordinates[0][0],
          ];
          const circle = L.circle(center, {
            radius: geofence.radius,
            fillColor: "#8b5cf6",
            fillOpacity: 0.3,
            color: "#7c3aed",
            weight: 2,
            opacity: activeGeofence === geofence.id ? 1 : 0.8,
          });

          circle.bindPopup(
            `<strong>${geofence.name}</strong><br/>Type: ${geofence.type}<br/>Radius: ${geofence.radius}m`
          );
          geofenceLayerGroup.current?.addLayer(circle);
        } else if (
          geofence.type === "polygon" &&
          geofence.coordinates.length > 2
        ) {
          const coords: [number, number][] = geofence.coordinates.map(
            (coord) => [coord[1], coord[0]]
          );
          const polygon = L.polygon(coords, {
            fillColor: "#8b5cf6",
            fillOpacity: 0.3,
            color: "#7c3aed",
            weight: 2,
            opacity: activeGeofence === geofence.id ? 1 : 0.8,
          });

          polygon.bindPopup(`<strong>${geofence.geofenceName}</strong>`);
          geofenceLayerGroup.current?.addLayer(polygon);
        }
      });
    } catch (error) {
      console.error("Error updating geofences:", error);
    }
  }, [geofences, activeGeofence]);

  // Update temporary geofence on map
  useEffect(() => {
    if (!map.current || !tempLayerGroup.current) return;

    try {
      // Clear existing temporary layers
      tempLayerGroup.current.clearLayers();

      if (
        tempGeofence &&
        tempGeofence.type === "radius" &&
        tempGeofence.radius &&
        tempGeofence.coordinates.length > 0
      ) {
        const center: [number, number] = [
          tempGeofence.coordinates[0][1],
          tempGeofence.coordinates[0][0],
        ];

        // Add marker
        const marker = L.marker(center);
        tempLayerGroup.current.addLayer(marker);

        // Add circle
        const circle = L.circle(center, {
          radius: tempGeofence.radius,
          fillColor: "#f59e0b",
          fillOpacity: 0.3,
          color: "#d97706",
          weight: 2,
          opacity: 0.8,
        });

        circle.bindPopup(
          `<strong>${tempGeofence.name}</strong><br/>Type: ${tempGeofence.type}<br/>Radius: ${tempGeofence.radius}m`
        );
        tempLayerGroup.current.addLayer(circle);
      }
    } catch (error) {
      console.error("Error updating temporary geofence:", error);
    }
  }, [tempGeofence]);

  // Location search debounce

  ////////////////////////////////////////
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(locationSearchQuery);
    }, 500);

    return () => {
      clearTimeout(handler); // clear timeout on cleanup
    };
  }, [locationSearchQuery]);

  useEffect(() => {
    if (debouncedQuery.trim()) {
      searchLocation(debouncedQuery);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  }, [debouncedQuery]);
  //////////////////////

  // Location search functionality
  const searchLocation = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&limit=5`
      );
      const data = await response.json();
      setSearchResults(data);
      setShowSearchResults(true);
    } catch (error) {
      console.error("Error searching location:", error);
      toast.error("Search Error", {
        description: "Failed to search location. Please try again.",
      });
    }
  };

  const selectSearchResult = (result: any) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    setCurrentCoords({ lat, lng });
    setLocationSearchQuery(result.display_name);
    setShowSearchResults(false);

    // Center map and create temporary geofence
    if (map.current) {
      map.current.setView([lat, lng], 15);
    }

    setTempGeofence((prev) => ({
      type: "radius",
      geofenceName:
        currentGeofenceName ||
        result.display_name.split(",")[0] ||
        "New Geofence",
      area: {
        coordinates: [[lat, lng]],
        radius: currentRadius,
      },
      pickupTime: pickupTime,
      dropTime: dropTime,
    }));
  };

  const openStreetView = () => {
    const url = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${currentCoords.lat},${currentCoords.lng}`;
    window.open(url, "_blank");
  };

  const deleteGeofence = (id: string) => {
    setGeofences(geofences.filter((g) => g.id !== id));
    if (activeGeofence === id) {
      setActiveGeofence(null);
    }
    toast("Geofence Deleted", {
      description: "Geofence removed successfully.",
    });
  };

  // GeofenceManager.tsx
  const editGeofence = (id: string) => {
    setActiveGeofence(id);

    const geofence = geofences.find((g) => g.id === id);
    if (!geofence || geofence.coordinates.length === 0) return;

    // 1. Read the first coordinate (all your geofences store centre as [lng, lat])
    const lat = geofence.coordinates[0][1];
    const lng = geofence.coordinates[0][0];

    // 2. Push those values into the controlled form state (unchanged code)
    setCurrentCoords({ lat, lng });
    setCurrentGeofenceName(geofence.name);
    if (geofence.radius) setCurrentRadius(geofence.radius);

    // 3. NEW: centre the Leaflet map on the feature
    if (map.current) {
      // For polygons we can optionally fit the bounds, but centre works for both.
      map.current.setView([lat, lng], 15); // 15 = nice close-up; tweak if you like.
    }
  };

  const saveGeofences = async () => {
    if (!tempGeofence) return;

    setIsLoading(true);
    try {
      const savedGeofence: any = {
        ...tempGeofence,
        branchId: selectedBranch?._id,
        schoolId: selectedSchool?._id,
        routeObjId: selectedRoute?._id,
        geofenceName: tempGeofence?.name,
      };

      // Only add pickupTime if not empty
      if (tempGeofence.pickupTime) {
        savedGeofence.pickupTime = formatTime(tempGeofence.pickupTime);
      }

      // Only add dropTime if not empty
      if (tempGeofence.dropTime) {
        savedGeofence.dropTime = formatTime(tempGeofence.dropTime);
      }

      console.log("savedGeofence", savedGeofence);

      // 🔥 Call your mutation to save to backend
      addGeofenceMutation.mutate(savedGeofence, {
        onSuccess: () => {
          setTempGeofence(null);
          setActiveGeofence(savedGeofence.id);
          toast.success("Success", {
            description: "Geofence saved successfully.",
          });
        },
        onError: () => {
          toast.error("Error", {
            description: "Failed to save geofence.",
          });
        },
      });
    } catch (error) {
      toast.error("Error", {
        description: "Failed to save geofences. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log("geofence", geofences);
  }, [geofences]);

  const searchGeofence = (query: string) => {
    setSearchQuery(query);
  };

  const clearTempGeofence = () => {
    setTempGeofence(null);
    setCurrentGeofenceName("");
    setCurrentRadius(100);
  };

  const updateCoordinates = (lat: number, lng: number) => {
    setCurrentCoords({ lat, lng });

    // Center map on new coordinates
    if (map.current) {
      map.current.setView([lat, lng], map.current.getZoom());
    }

    // Update temporary geofence or active geofence
    if (tempGeofence) {
      setTempGeofence({
        ...tempGeofence,
        coordinates: [[lng, lat]],
      });
    } else if (activeGeofence) {
      setGeofences(
        geofences.map((g) =>
          g.id === activeGeofence ? { ...g, coordinates: [[lng, lat]] } : g
        )
      );
    }
  };

  const updateGeofenceName = (name: string) => {
    setCurrentGeofenceName(name);
    if (tempGeofence) {
      setTempGeofence({
        ...tempGeofence,
        name,
      });
    } else if (activeGeofence) {
      setGeofences(
        geofences.map((g) => (g.id === activeGeofence ? { ...g, name } : g))
      );
    }
  };

  const updateRadius = (radius: number) => {
    setCurrentRadius(radius);
    if (tempGeofence) {
      setTempGeofence({
        ...tempGeofence,
        radius,
      });
    } else if (activeGeofence) {
      setGeofences(
        geofences.map((g) => (g.id === activeGeofence ? { ...g, radius } : g))
      );
    }
  };

  const resetMap = () => {
    if (map.current) {
      map.current.setView([21.1286677, 79.1038211], 12);
    }
    setActiveGeofence(null);
    setCurrentCoords({ lat: 21.1286677, lng: 79.1038211 });
    toast("Map Reset", {
      description: "Map view reset to default location.",
    });
  };

  const undoLastAction = () => {
    toast("Undo", { description: "Last action undone." });
  };

  const filteredGeofences = geofences.filter((g) =>
    (g.geofenceName || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCustomFilter = useCallback((filtered: Geofence[]) => {
    setFilteredData(filtered);
  }, []);

  useEffect(() => {
    if (selectedSchool && branchData) {
      const filtered = branchData.filter(
        (branch) => branch?.schoolId?._id === selectedSchool._id
      );
      setFilteredBranches(filtered);
      setSelectedBranch(null); // reset on school change
    } else {
      setFilteredBranches([]);
    }
  }, [selectedSchool, branchData]);

  useEffect(() => {
    if (selectedBranch && routeData) {
      const filtered = routeData.filter(
        (route) => route?.branchId?._id === selectedBranch._id
      );
      setFilteredRoutes(filtered);
      setSelectedRoute(null); // reset on branch change
    } else {
      setFilteredRoutes([]);
    }
  }, [selectedBranch, routeData]);

  useEffect(() => {
    if (selectedBranchGroup && routeData) {
      const filtered = routeData.filter((route) => {
        const schoolMatch =
          route?.branchId?.schoolId?._id === selectedBranchGroup.schoolId._id;

        const isAssigned = selectedBranchGroup.AssignedBranch.some(
          (branch) => branch._id === route?.branchId?._id
        );

        return schoolMatch && isAssigned;
      });

      setFilteredRoutes(filtered);
      setSelectedRoute(null); // reset on branch group change
    } else {
      setFilteredRoutes([]);
    }
  }, [selectedBranchGroup, routeData]);

  const handleSchoolSelect = (school: School | null) => {
    setSelectedSchool(school);
  };

  const handleBranchSelect = (branch: Branch | null) => {
    setSelectedBranch(branch);
  };

  const handleRouteSelect = (route: Route | null) => {
    setSelectedRoute(route);
  };

  const handleBranchGroupSelect = (branchGroup: BranchGroup | null) => {
    setSelectedBranchGroup(branchGroup);
  };

  const formatTime = (date?: Date) => {
    if (!date) return "";
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  useEffect(() => {
    console.log("Filtered Geofences:", filteredGeofences);
  }, [filteredGeofences]);

  useEffect(() => {
    if (tempGeofence) {
      setTempGeofence((prev) => ({
        ...prev,
        pickupTime,
      }));
    } else if (activeGeofence) {
      setGeofences((prev) =>
        prev.map((g) => (g.id === activeGeofence ? { ...g, pickupTime } : g))
      );
    }
  }, [pickupTime]);

  useEffect(() => {
    if (tempGeofence) {
      setTempGeofence((prev) => ({
        ...prev,
        dropTime,
      }));
    } else if (activeGeofence) {
      setGeofences((prev) =>
        prev.map((g) => (g.id === activeGeofence ? { ...g, dropTime } : g))
      );
    }
  }, [dropTime]);

  return (
    <div className="h-screen flex bg-background">
      {/* Left Sidebar - keeping exact same layout and functionality */}
      <div
        className={`${
          isSidebarCollapsed ? "w-14" : "w-80"
        } bg-sidebar-background border-r border-border flex flex-col transition-all duration-300 ease-in-out`}
      >
        {/* Collapse/Expand Button - Always visible */}
        <div className="flex justify-end p-2 border-b border-border">
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Sidebar Content - Hidden when collapsed */}
        {!isSidebarCollapsed && (
          <>
            {/* Header */}
            <div className="p-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">
                Geography → Geofence
              </h2>
            </div>

            {/* Search */}
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search center of geofence"
                  value={searchQuery}
                  onChange={(e) => searchGeofence(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Geofence List */}
            <ScrollArea className="flex-1 px-4">
              <div className="space-y-2">
                {filteredGeofences.map((geofence) => (
                  <div
                    key={geofence.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      activeGeofence === geofence.id
                        ? "bg-primary/10 border-primary"
                        : "bg-card hover:bg-accent"
                    }`}
                    onClick={() => editGeofence(geofence.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">
                          {geofence.geofenceName}
                        </h4>
                        <p className="text-xs text-muted-foreground capitalize">
                          {geofence.type}{" "}
                          {geofence.radius ? `(${geofence.radius}m)` : ""}
                        </p>
                        {geofence.pickupTime && (
                          <p className="text-xs text-muted-foreground">
                            Pickup: {formatTime(new Date(geofence.pickupTime))}
                          </p>
                        )}
                        {geofence.dropTime && (
                          <p className="text-xs text-muted-foreground">
                            Drop: {formatTime(new Date(geofence.dropTime))}
                          </p>
                        )}
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteGeofence(geofence.id);
                        }}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        )}
      </div>

      {/* Main Map Area */}
      <div className="flex-1 relative">
        {/* Vanilla Leaflet Map Container */}
        <div ref={mapContainer} className="h-full w-full" />

        {/* Map Controls */}
        <div className="absolute top-20 left-2 flex flex-col space-y-2 z-[1000]">
          <Button size="sm" variant="secondary" onClick={resetMap}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="secondary" onClick={undoLastAction}>
            <Undo className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="secondary" onClick={clearTempGeofence}>
            <X className="h-4 w-4" />
          </Button>
          <Separator />
          <Button
            size="sm"
            variant="secondary"
            onClick={() => map.current?.zoomIn()}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => map.current?.zoomOut()}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="secondary">
            <Eye className="h-4 w-4" />
          </Button>
        </div>

        {/* Configuration Panel - keeping exact same layout and functionality */}
        <GeofenceConfigurationPanel
          dropTime={dropTime}
          pickupTime={pickupTime}
          setDropTime={setDropTime}
          setPickupTime={setPickupTime}
          handleRouteSelect={handleRouteSelect}
          filteredBranches={filteredBranches}
          filteredRoutes={filteredRoutes}
          handleSchoolSelect={handleSchoolSelect}
          handleBranchSelect={handleBranchSelect}
          handleCustomFilter={handleCustomFilter}
          setFilterResults={setFilterResults}
          filterResults={filterResults}
          setSelectedRoute={setSelectedRoute}
          selectedRoute={selectedRoute}
          setSelectedBranch={setSelectedBranch}
          selectedBranch={selectedBranch}
          setSelectedSchool={setSelectedSchool}
          selectedSchool={selectedSchool}
          locationSearchQuery={locationSearchQuery}
          setLocationSearchQuery={setLocationSearchQuery}
          searchLocation={searchLocation}
          searchResults={searchResults}
          showSearchResults={showSearchResults}
          selectSearchResult={selectSearchResult}
          currentGeofenceName={currentGeofenceName}
          updateGeofenceName={updateGeofenceName}
          currentRadius={currentRadius}
          updateRadius={updateRadius}
          currentCoords={currentCoords}
          updateCoordinates={updateCoordinates}
          openStreetView={openStreetView}
          saveGeofences={saveGeofences}
          isLoading={isLoading}
          tempGeofence={tempGeofence}
        />
      </div>
    </div>
  );
};

export default GeofenceManager;
