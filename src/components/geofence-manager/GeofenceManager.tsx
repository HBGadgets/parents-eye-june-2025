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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import "./style.css";
import { api } from "@/services/apiService";
import { parseTimeString, safeParseTimeString } from "@/util/timeUtils";

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as unknown)._getIconUrl;
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

interface GeofenceManagerProps {
  mode?: "add" | "edit";
  initialData?: Geofence | null;
  onSuccess?: () => void;
  geofenceId?: string;
  geofenceRouteId?: Route | null;
  geofenceSchoolId?: School | null;
  geofenceBranchId?: Branch | null;
}

const GeofenceManager: React.FC = ({
  mode,
  geofenceId,
  initialData = null,
  onSuccess,
  geofenceRouteId,
  geofenceSchoolId,
  geofenceBranchId,
}: GeofenceManagerProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const geofenceLayerGroup = useRef<L.LayerGroup | null>(null);
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationSearchQuery, setLocationSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<unknown[]>([]);
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
  // const [selectedBranchGroup, setSelectedBranchGroup] =
  //   useState<BranchGroup | null>(null);
  const [filterResults, setFilterResults] = useState<Geofence[]>([]);
  const [filteredData, setFilteredData] = useState<Geofence[]>([]);
  // const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [filteredBranches, setFilteredBranches] = useState<Branch[]>([]);
  const [filteredRoutes, setFilteredRoutes] = useState<Route[]>([]);
  // const [filteredBranchGroups, setFilteredBranchGroups] = useState<
  //   BranchGroup[]
  // >([]);
  const { data: branchData } = useBranchData();
  const { data: routeData } = useRouteData();
  const queryClient = useQueryClient();
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [pickupTime, setPickupTime] = useState<Date | undefined>(undefined);
  const [dropTime, setDropTime] = useState<Date | undefined>(undefined);

  console.log("MODE", mode);
  useEffect(() => {
    console.log("geofenceId", geofenceId);
    console.log("school Id", geofenceSchoolId);
    console.log("branch Id", geofenceBranchId);
    console.log("route Id", geofenceRouteId);
  }, [geofenceId]);

  // 🆕 Add reverse geocoding function
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await response.json();
      return data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } catch (error) {
      console.error("Reverse geocoding failed:", error);
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  };

  // 🆕 NEW: Dedicated useEffect for map centering in edit mode
  useEffect(() => {
    if (
      mode === "edit" &&
      map.current &&
      currentCoords.lat &&
      currentCoords.lng
    ) {
      console.log(
        "🗺️ Centering map for edit mode:",
        currentCoords.lat,
        currentCoords.lng
      );

      // Use setTimeout to ensure map is fully ready
      setTimeout(() => {
        if (map.current) {
          try {
            map.current.setView([currentCoords.lat, currentCoords.lng], 16);
            console.log(
              "✅ Map successfully centered on:",
              currentCoords.lat,
              currentCoords.lng
            );
          } catch (error) {
            console.error("❌ Error centering map:", error);
          }
        }
      }, 200);
    }
  }, [mode, currentCoords.lat, currentCoords.lng]);

  // 🆕 UPDATED: Populate form with initial data when in edit mode
  useEffect(() => {
    if (mode === "edit" && initialData && branchData && routeData) {
      console.log("📝 Populating edit data:", initialData);

      // Step 1: Extract coordinates from initialData
      let lat, lng;

      if (initialData.area?.center && initialData.area.center.length >= 2) {
        [lat, lng] = initialData.area.center;
        console.log("📍 Found coordinates in area.center:", lat, lng);
      } else {
        console.warn("⚠️ No coordinates found in initialData");
        // Set default coordinates if none found
        lat = 21.1286677;
        lng = 79.1038211;
      }

      // Step 2: Set coordinates state (this will trigger the centering useEffect)
      setCurrentCoords({ lat, lng });

      // Step 3: Populate basic geofence data
      if (initialData.geofenceName) {
        setCurrentGeofenceName(initialData.geofenceName);
      }

      if (initialData.area?.radius) {
        setCurrentRadius(initialData.area.radius);
      }

      // Step 4: Set up temp geofence for visualization
      setTempGeofence({
        type: "radius",
        geofenceName: initialData.geofenceName || "Edit Geofence",
        coordinates: [[lng, lat]], // matches render logic
        radius: initialData.area?.radius || 100,
        pickupTime: initialData.pickupTime,
        dropTime: initialData.dropTime,
      });

      // Step 5: Get address from coordinates (existing code)
      const getAddressForEdit = async () => {
        const address = await reverseGeocode(lat, lng);
        setLocationSearchQuery(address);
      };

      if (initialData.address) {
        setLocationSearchQuery(initialData.address);
      } else {
        getAddressForEdit();
      }

      // Step 6: Handle time fields (your existing code)
      if (initialData.pickupTime) {
        try {
          const pickupDate =
            typeof initialData.pickupTime === "string"
              ? parseTimeString(initialData.pickupTime, {
                  fallbackTime: new Date(),
                })
              : new Date(initialData.pickupTime);
          setPickupTime(pickupDate);
        } catch (error) {
          console.error("Error parsing pickup time:", error);
          setPickupTime(new Date());
        }
      }

      if (initialData.dropTime) {
        try {
          const dropDate =
            typeof initialData.dropTime === "string"
              ? parseTimeString(initialData.dropTime, {
                  fallbackTime: new Date(),
                })
              : new Date(initialData.dropTime);
          setDropTime(dropDate);
        } catch (error) {
          console.error("Error parsing drop time:", error);
          setDropTime(new Date());
        }
      }

      // Step 7: Set school/branch/route objects (your existing code)
      if (geofenceSchoolId) {
        console.log("Setting school object:", geofenceSchoolId);
        setSelectedSchool(geofenceSchoolId);
      }

      if (geofenceBranchId) {
        console.log("Setting branch object:", geofenceBranchId);
        setSelectedBranch(geofenceBranchId);
      }

      if (geofenceRouteId) {
        console.log("Setting route object:", geofenceRouteId);
        setSelectedRoute(geofenceRouteId);
      }

      // Step 8: Fallback object finding (your existing code)
      if (!geofenceSchoolId && initialData.schoolId) {
        const branch = branchData.find(
          (b) => b.schoolId?._id === initialData.schoolId
        );
        if (branch?.schoolId) {
          setSelectedSchool(branch.schoolId);
        }
      }

      if (!geofenceBranchId && initialData.branchId) {
        const branch = branchData.find((b) => b._id === initialData.branchId);
        if (branch) {
          setSelectedBranch(branch);
        }
      }

      if (!geofenceRouteId && initialData.routeObjId) {
        const route = routeData.find((r) => r._id === initialData.routeObjId);
        if (route) {
          setSelectedRoute(route);
        }
      }
    }
  }, [
    mode,
    initialData,
    geofenceSchoolId,
    geofenceBranchId,
    geofenceRouteId,
    branchData,
    routeData,
  ]);

  // 🆕 DEBUG: Track edit mode state changes
  useEffect(() => {
    if (mode === "edit") {
      console.log("=== EDIT MODE DEBUG ===");
      console.log("Mode:", mode);
      console.log("GeofenceId:", geofenceId);
      console.log("Map current:", !!map.current);
      console.log("Initial data:", initialData);
      console.log("Current coords:", currentCoords);
      console.log("========================");
    }
  }, [mode, geofenceId, initialData, currentCoords]);

  // 🆕 Add this useEffect to listen for map centering events
  useEffect(() => {
    const handleCenterMap = (event: CustomEvent) => {
      const { lat, lng, zoom } = event.detail;

      console.log("Centering map on edit:", lat, lng);

      if (map.current) {
        map.current.setView([lat, lng], zoom || 15);
      }
    };

    // Add event listener
    window.addEventListener(
      "centerMapOnEdit",
      handleCenterMap as EventListener
    );

    // Cleanup
    return () => {
      window.removeEventListener(
        "centerMapOnEdit",
        handleCenterMap as EventListener
      );
    };
  }, []);

  // 🆕 Clear form when switching to add mode
  useEffect(() => {
    if (mode === "add") {
      setCurrentGeofenceName("");
      setCurrentRadius(100);
      setSelectedSchool(null);
      setSelectedBranch(null);
      setSelectedRoute(null);
      setPickupTime(undefined);
      setDropTime(undefined);
      setTempGeofence(null);
      setCurrentCoords({ lat: 21.1286677, lng: 79.1038211 });

      // Reset map to default view
      if (map.current) {
        map.current.setView([21.1286677, 79.1038211], 12);
      }
    }
  }, [mode]);

  // Add Geofence Mutation
  const addGeofenceMutation = useMutation({
    mutationFn: async (newGeofence: unknown) => {
      const geofence = await api.post("/geofence", newGeofence);
      return geofence.geofence;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["geofences"] }); // 🔥 This invalidates all geofence-related queries
      alert("Geofence added successfully.");
    },
  });

  // Update Geofence Mutation
  const updateGeofenceMutation = useMutation({
    mutationFn: async ({
      geofenceId,
      data,
    }: {
      geofenceId: string;
      data: unknown;
    }) => {
      return await api.put(`/geofence/${geofenceId}`, data);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["geofences"] }); // 🔥 This invalidates all geofence-related queries
      alert("Geofence eddited successfully.");
    },

    onError: (err) => {
      alert("Failed to update school.\nerror: " + err);
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
          `<strong>${tempGeofence.name}</strong><br/>Radius: ${tempGeofence.radius}m`
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

  const selectSearchResult = (result: unknown) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    setCurrentCoords({ lat, lng });
    setLocationSearchQuery(result.display_name);
    setShowSearchResults(false);

    // Recenter map
    if (map.current) {
      map.current.setView([lat, lng], 15);
    }

    // ✅ Correct shape for drawing effect
    setTempGeofence({
      type: "radius",
      geofenceName:
        currentGeofenceName ||
        result.display_name.split(",")[0] ||
        "New Geofence",
      coordinates: [[lng, lat]], // MUST match render logic
      radius: currentRadius,
      pickupTime,
      dropTime,
    });
  };

  const openStreetView = () => {
    const url = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${currentCoords.lat},${currentCoords.lng}`;
    window.open(url, "_blank");
  };

  // const deleteGeofence = (id: string) => {
  //   setGeofences(geofences.filter((g) => g.id !== id));
  //   if (activeGeofence === id) {
  //     setActiveGeofence(null);
  //   }
  //   toast("Geofence Deleted", {
  //     description: "Geofence removed successfully.",
  //   });
  // };

  // GeofenceManager.tsx
  // const editGeofence = (id: string) => {
  //   setActiveGeofence(id);

  //   const geofence = geofences.find((g) => g.id === id);
  //   if (!geofence || geofence.coordinates.length === 0) return;

  //   // 1. Read the first coordinate (all your geofences store centre as [lng, lat])
  //   const lat = geofence.coordinates[0][1];
  //   const lng = geofence.coordinates[0][0];

  //   // 2. Push those values into the controlled form state (unchanged code)
  //   setCurrentCoords({ lat, lng });
  //   setCurrentGeofenceName(geofence.name);
  //   if (geofence.radius) setCurrentRadius(geofence.radius);

  //   // 3. NEW: centre the Leaflet map on the feature
  //   if (map.current) {
  //     // For polygons we can optionally fit the bounds, but centre works for both.
  //     map.current.setView([lat, lng], 15); // 15 = nice close-up; tweak if you like.
  //   }
  // };

  const saveGeofences = async () => {
    if (!tempGeofence) return;

    setIsLoading(true);
    try {
      const savedGeofence: unknown = {
        geofenceName: tempGeofence?.geofenceName || tempGeofence?.name,
        area: {
          center: [
            tempGeofence.coordinates?.[0]?.[1] || currentCoords.lat, // lat
            tempGeofence.coordinates?.[0]?.[0] || currentCoords.lng, // lng
          ],
          radius: tempGeofence.radius || currentRadius,
        },
        schoolId: selectedSchool?._id,
        branchId: selectedBranch?._id,
        routeObjId: selectedRoute?._id,
      };

      // Only add times if they exist
      if (tempGeofence.pickupTime) {
        savedGeofence.pickupTime = formatTime(tempGeofence.pickupTime);
      }

      if (tempGeofence.dropTime) {
        savedGeofence.dropTime = formatTime(tempGeofence.dropTime);
      }

      if (mode === "add") {
        // Add new geofence
        addGeofenceMutation.mutate(savedGeofence, {
          onSuccess: (response) => {
            // 🆕 Create geofence object for map rendering
            const newGeofence = {
              id: response._id || Date.now().toString(), // Use API response ID or fallback
              type: "radius",
              geofenceName: savedGeofence.geofenceName,
              name: savedGeofence.geofenceName, // for backward compatibility
              coordinates: [
                [
                  savedGeofence.area.center[1], // lng
                  savedGeofence.area.center[0], // lat
                ],
              ],
              radius: savedGeofence.area.radius,
              pickupTime: tempGeofence.pickupTime,
              dropTime: tempGeofence.dropTime,
              schoolId: savedGeofence.schoolId,
              branchId: savedGeofence.branchId,
              routeObjId: savedGeofence.routeObjId,
            };

            // 🆕 Add to geofences array so it shows on map
            setGeofences((prev) => [...prev, newGeofence]);

            // 🆕 Set as active geofence to highlight it
            setActiveGeofence(newGeofence.id);

            // Clear temp geofence
            setTempGeofence(null);

            toast.success("Success", {
              description: "Geofence added successfully and visible on map.",
            });

            onSuccess?.(response); // Pass response to parent
          },
          onError: () => {
            toast.error("Error", {
              description: "Failed to add geofence.",
            });
          },
        });
      } else if (mode === "edit" && geofenceId) {
        // Update existing geofence
        updateGeofenceMutation.mutate(
          { geofenceId, data: savedGeofence },
          {
            onSuccess: (response) => {
              // 🆕 Update the existing geofence in the array
              const updatedGeofence = {
                id: geofenceId,
                type: "radius",
                geofenceName: savedGeofence.geofenceName,
                name: savedGeofence.geofenceName,
                coordinates: [
                  [
                    savedGeofence.area.center[1], // lng
                    savedGeofence.area.center[0], // lat
                  ],
                ],
                radius: savedGeofence.area.radius,
                pickupTime: tempGeofence.pickupTime,
                dropTime: tempGeofence.dropTime,
                schoolId: savedGeofence.schoolId,
                branchId: savedGeofence.branchId,
                routeObjId: savedGeofence.routeObjId,
              };

              // 🆕 Update geofences array
              setGeofences((prev) =>
                prev.map((g) => (g.id === geofenceId ? updatedGeofence : g))
              );

              // Keep it active to show it's selected
              setActiveGeofence(geofenceId);

              // Clear temp geofence
              setTempGeofence(null);

              toast.success("Success", {
                description: "Geofence updated successfully.",
              });

              onSuccess?.(response);
            },
            onError: () => {
              toast.error("Error", {
                description: "Failed to update geofence.",
              });
            },
          }
        );
      }
    } catch (error) {
      toast.error("Error", {
        description: "Failed to save geofence. Please try again.",
      });
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log("geofence", geofences);
  }, [geofences]);

  // const searchGeofence = (query: string) => {
  //   setSearchQuery(query);
  // };

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
        geofenceName: name, // ✅ keep this updated too
      });
    } else if (activeGeofence) {
      setGeofences(
        geofences.map((g) =>
          g.id === activeGeofence ? { ...g, name, geofenceName: name } : g
        )
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

  // 🆕 Update these useEffects to not reset during edit mode
  useEffect(() => {
    if (selectedSchool && branchData && mode !== "edit") {
      // 🆕 Add mode check
      const filtered = branchData.filter(
        (branch) => branch?.schoolId?._id === selectedSchool._id
      );
      setFilteredBranches(filtered);
      setSelectedBranch(null); // Only reset in add mode
    } else if (selectedSchool && branchData && mode === "edit") {
      // In edit mode, just filter but don't reset selection
      const filtered = branchData.filter(
        (branch) => branch?.schoolId?._id === selectedSchool._id
      );
      setFilteredBranches(filtered);
    } else {
      setFilteredBranches([]);
    }
  }, [selectedSchool, branchData, mode]); // 🆕 Add mode dependency

  useEffect(() => {
    if (selectedBranch && routeData) {
      const filtered = routeData.filter(
        (route) => route?.branchId?._id === selectedBranch._id
      );
      setFilteredRoutes(filtered);

      // 🆕 Only clear selection in add mode, not edit mode
      if (mode === "add") {
        setSelectedRoute(null);
      }
    } else {
      setFilteredRoutes([]);
    }
  }, [selectedBranch, routeData]);

  // useEffect(() => {
  //   if (selectedBranchGroup && routeData) {
  //     const filtered = routeData.filter((route) => {
  //       const schoolMatch =
  //         route?.branchId?.schoolId?._id === selectedBranchGroup.schoolId._id;

  //       const isAssigned = selectedBranchGroup.AssignedBranch.some(
  //         (branch) => branch._id === route?.branchId?._id
  //       );

  //       return schoolMatch && isAssigned;
  //     });

  //     setFilteredRoutes(filtered);
  //     setSelectedRoute(null); // reset on branch group change
  //   } else {
  //     setFilteredRoutes([]);
  //   }
  // }, [selectedBranchGroup, routeData]);

  const handleSchoolSelect = (school: School | null) => {
    setSelectedSchool(school);
  };

  const handleBranchSelect = (branch: Branch | null) => {
    setSelectedBranch(branch);
  };

  const handleRouteSelect = (route: Route | null) => {
    setSelectedRoute(route);
  };

  // const handleBranchGroupSelect = (branchGroup: BranchGroup | null) => {
  //   setSelectedBranchGroup(branchGroup);
  // };

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

  // 🆕 Add these useEffects to track state changes
  useEffect(() => {
    console.log("🏫 School changed:", selectedSchool);
  }, [selectedSchool]);

  useEffect(() => {
    console.log("🏢 Branch changed:", selectedBranch);
  }, [selectedBranch]);

  useEffect(() => {
    console.log("🚌 Route changed:", selectedRoute);
  }, [selectedRoute]);

  return (
    <div className="h-screen flex bg-background">
      {/* Left Sidebar - keeping exact same layout and functionality */}

      {/* Main Map Area */}
      <div className="flex-1 relative">
        {/* Vanilla Leaflet Map Container */}
        <div
          ref={mapContainer}
          className="w-full h-full min-h-[500px]" // 🆕 Add min-height
          style={{ height: "100%", minHeight: "500px" }}
        />

        {/* Map Controls */}
        <div className="absolute top-20 left-2 flex flex-col space-y-2 z-[1000]">
          <Button size="sm" variant="secondary" onClick={resetMap}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="secondary" onClick={undoLastAction}>
            <Undo className="h-4 w-4" />
          </Button>
          {mode === "add" && (
            <Button size="sm" variant="secondary" onClick={clearTempGeofence}>
              <X className="h-4 w-4" />
            </Button>
          )}
          <Separator />
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
