"use client";
import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RotateCcw, Undo, X } from "lucide-react";
import GeofenceConfigurationPanel from "./configuration-panel";
import { Branch, Geofence, Route, School } from "@/interface/modal";
import { useQueryClient } from "@tanstack/react-query";
import "./style.css";
import { parseTimeString } from "@/util/timeUtils";
// import { useInfiniteRouteData } from "@/hooks/useInfiniteRouteData";
import { useBranchDropdown, useSchoolDropdown } from "@/hooks/useDropdown";
import { useGeofence } from "@/hooks/useGeofence";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { reverseGeocodeMapTiler } from "@/hooks/useReverseGeocoding";
import { geofenceSchema } from "@/schemas/geofence.schema";

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
interface GeofenceData {
  id?: string;
  type?: string;
  geofenceName?: string;
  name?: string;
  coordinates?: number[][];
  radius?: number;
  area?: {
    center?: number[];
    radius?: number;
  };
  pickupTime?: Date;
  dropTime?: Date;
  schoolId?: string;
  branchId?: string;
  routeObjId?: string;
}

type DecodedToken = {
  role: string;
  schoolId?: string;
  id?: string;
};

interface GeofenceManagerProps {
  mode?: "add" | "edit";
  initialData?: GeofenceData | null;
  onSuccess?: () => void;
  geofenceId?: string | null;
  geofenceRouteId?: Route | null;
  geofenceSchoolId?: School | null;
  geofenceBranchId?: Branch | null;
}

const GeofenceManager: React.FC<GeofenceManagerProps> = ({
  mode = "add",
  geofenceId,
  initialData = null,
  onSuccess,
  geofenceRouteId,
  geofenceSchoolId,
  geofenceBranchId,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const geofenceLayerGroup = useRef<L.LayerGroup | null>(null);
  const tempLayerGroup = useRef<L.LayerGroup | null>(null);

  const [geofences, setGeofences] = useState<GeofenceData[]>([]);
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
  const [tempGeofence, setTempGeofence] = useState<GeofenceData | null>(null);

  // Form dropdown states
  const [schoolId, setSchoolId] = useState<string | undefined>();
  const [branchId, setBranchId] = useState<string | undefined>();

  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);

  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [pickupTime, setPickupTime] = useState<Date | undefined>(undefined);
  const [dropTime, setDropTime] = useState<Date | undefined>(undefined);

  // Role-based state
  const [decodedToken, setDecodedToken] = useState<DecodedToken>({ role: "" });
  const role = decodedToken.role || "";

  const queryClient = useQueryClient();

  // Decode token on mount
  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) return;

    try {
      const decoded = jwtDecode<DecodedToken>(token);
      setDecodedToken(decoded);
    } catch (err) {
      console.error("Failed to decode token", err);
    }
  }, []);

  // Token-based IDs
  const tokenSchoolId = useMemo(() => {
    if (role === "school") return decodedToken.id;
    if (role === "branchGroup") return decodedToken.schoolId;
    return decodedToken.schoolId;
  }, [role, decodedToken.id, decodedToken.schoolId]);

  const tokenBranchId = useMemo(
    () => (role === "branch" ? decodedToken.id : undefined),
    [role, decodedToken.id]
  );

  const tokenBranchGroupId = useMemo(
    () => (role === "branchGroup" ? decodedToken.id : undefined),
    [role, decodedToken.id]
  );

  // Set form dropdown states based on role
  useEffect(() => {
    if (role === "school" && tokenSchoolId) {
      setSchoolId(tokenSchoolId);
    }

    if (role === "branch" && tokenBranchId) {
      setBranchId(tokenBranchId);
    }

    if (role === "branchGroup" && tokenBranchGroupId) {
      setBranchId(tokenBranchGroupId);
    }
  }, [role, tokenSchoolId, tokenBranchId, tokenBranchGroupId]);

  // Dropdown data hooks
  const { data: schools = [] } = useSchoolDropdown(role === "superAdmin");

  // Determine when to fetch branches based on role
  const shouldFetchBranches = useMemo(() => {
    if (role === "branch") return false;
    if (role === "branchGroup") return true;
    if (role === "school") return !!schoolId;
    if (role === "superAdmin") return !!schoolId;
    return false;
  }, [role, schoolId]);

  // Determine schoolId parameter for branch dropdown
  const branchDropdownSchoolId = useMemo(() => {
    if (role === "branchGroup") return undefined;
    return schoolId;
  }, [role, schoolId]);

  const { data: branches = [] } = useBranchDropdown(
    branchDropdownSchoolId,
    shouldFetchBranches,
    role === "branchGroup"
  );

  // Route data with proper dependencies
  // const { data: routeData } = useInfiniteRouteData({
  //   schoolId: selectedSchool?._id || schoolId,
  //   branchId: selectedBranch?._id || branchId,
  //   limit: "all",
  // });

  // Use the useGeofence hook for mutations
  const { createGeofence, updateGeofence, isCreateLoading, isUpdateLoading } =
    useGeofence({ pageIndex: 0, pageSize: 10 }, [], {});

  // Reverse geocoding function
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

  // Map centering in edit mode
  useEffect(() => {
    if (
      mode === "edit" &&
      map.current &&
      currentCoords.lat &&
      currentCoords.lng
    ) {
      setTimeout(() => {
        if (map.current) {
          try {
            map.current.setView([currentCoords.lat, currentCoords.lng], 16);
          } catch (error) {
            console.error("Error centering map:", error);
          }
        }
      }, 200);
    }
  }, [mode, currentCoords.lat, currentCoords.lng]);

  // Populate form with initial data when in edit mode
  useEffect(() => {
    if (
      mode === "edit" &&
      initialData &&
      schools.length > 0 &&
      branches.length > 0
    ) {
      let lat, lng;
      if (initialData.area?.center && initialData.area.center.length >= 2) {
        [lat, lng] = initialData.area.center;
      } else {
        lat = 21.1286677;
        lng = 79.1038211;
      }

      setCurrentCoords({ lat, lng });

      if (initialData.geofenceName) {
        setCurrentGeofenceName(initialData.geofenceName);
      }

      if (initialData.area?.radius) {
        setCurrentRadius(initialData.area.radius);
      }

      setTempGeofence({
        type: "radius",
        geofenceName: initialData.geofenceName,
        name: initialData.geofenceName,
        coordinates: [[lng, lat]],
        radius: initialData.area.radius,
        pickupTime: initialData.pickupTime,
        dropTime: initialData.dropTime,
      });

      // Set address
      if (initialData.address) {
        setLocationSearchQuery(initialData.address);
      } else {
        reverseGeocode(lat, lng).then(setLocationSearchQuery);
      }

      // console.log("object", initialData);

      // Handle time fields
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
          // console.error("Error parsing pickup time:", error);
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
        }
      }

      // Set school/branch/route
      if (geofenceSchoolId) {
        setSelectedSchool(geofenceSchoolId);
        setSchoolId(geofenceSchoolId._id);
      } else if (initialData.schoolId) {
        const school = schools.find((s) => s._id === initialData.schoolId);
        if (school) {
          setSelectedSchool(school);
          setSchoolId(school._id);
        }
      }

      if (geofenceBranchId) {
        setSelectedBranch(geofenceBranchId);
        setBranchId(geofenceBranchId._id);
      } else if (initialData.branchId) {
        const branch = branches.find((b) => b._id === initialData.branchId);
        if (branch) {
          setSelectedBranch(branch);
          setBranchId(branch._id);
        }
      }

      // if (geofenceRouteId) {
      //   setSelectedRoute(geofenceRouteId);
      // } else if (initialData.routeObjId && routeData?.pages?.[0]?.data) {
      //   const route = routeData.pages[0].data.find(
      //     (r) => r._id === initialData.routeObjId
      //   );
      //   if (route) {
      //     setSelectedRoute(route);
      //   }
      // }
    }
  }, [
    mode,
    initialData,
    geofenceSchoolId,
    geofenceBranchId,
    geofenceRouteId,
    schools,
    branches,
    // routeData,
  ]);

  // Clear form when switching to add mode
  useEffect(() => {
    if (mode === "add") {
      setCurrentGeofenceName("");
      setCurrentRadius(100);
      setSelectedSchool(null);
      setSelectedBranch(null);
      setSelectedRoute(null);
      setSchoolId(undefined);
      setBranchId(undefined);
      setPickupTime(undefined);
      setDropTime(undefined);
      setTempGeofence(null);
      setCurrentCoords({ lat: 21.1286677, lng: 79.1038211 });

      if (map.current) {
        map.current.setView([21.1286677, 79.1038211], 12);
      }
    }
  }, [mode]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    try {
      map.current = L.map(mapContainer.current).setView(
        [21.1286677, 79.1038211],
        12
      );

      L.tileLayer(`https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}`, {
        subdomains: ["mt0", "mt1", "mt2", "mt3"],
      }).addTo(map.current);

      geofenceLayerGroup.current = L.layerGroup().addTo(map.current);
      tempLayerGroup.current = L.layerGroup().addTo(map.current);

      map.current.on("click", (e: L.LeafletMouseEvent) => {
        const newCoords = {
          lat: parseFloat(e.latlng.lat.toFixed(6)),
          lng: parseFloat(e.latlng.lng.toFixed(6)),
        };
        setCurrentCoords(newCoords);

        setTempGeofence({
          type: "radius",
          geofenceName: currentGeofenceName || `New Geofence`,
          coordinates: [[newCoords.lng, newCoords.lat]],
          radius: currentRadius,
          pickupTime,
          dropTime,
        });
        setCurrentGeofenceName(currentGeofenceName || `New Geofence`);
      });
    } catch (error) {
      console.error("Error initializing map:", error);
      toast.error("Failed to initialize map. Please refresh the page.");
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update geofences on map
  useEffect(() => {
    if (!map.current || !geofenceLayerGroup.current) return;

    try {
      geofenceLayerGroup.current.clearLayers();

      geofences.forEach((geofence) => {
        if (
          geofence.type === "radius" &&
          geofence.radius &&
          geofence.coordinates &&
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
            `<strong>${geofence.name}</strong><br/>Radius: ${geofence.radius}m`
          );
          geofenceLayerGroup.current?.addLayer(circle);
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
      tempLayerGroup.current.clearLayers();

      if (
        tempGeofence &&
        tempGeofence.type === "radius" &&
        tempGeofence.radius &&
        tempGeofence.coordinates &&
        tempGeofence.coordinates.length > 0
      ) {
        const center: [number, number] = [
          tempGeofence.coordinates[0][1],
          tempGeofence.coordinates[0][0],
        ];

        const marker = L.marker(center);
        tempLayerGroup.current.addLayer(marker);

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
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(locationSearchQuery);
    }, 500);

    return () => {
      clearTimeout(handler);
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
      toast.error("Failed to search location. Please try again.");
    }
  };

  const selectSearchResult = (result: any) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    setCurrentCoords({ lat, lng });
    setLocationSearchQuery(result.display_name);
    setShowSearchResults(false);

    if (map.current) {
      map.current.setView([lat, lng], 15);
    }

    setTempGeofence({
      type: "radius",
      geofenceName:
        currentGeofenceName ||
        result.display_name.split(",")[0] ||
        "New Geofence",
      coordinates: [[lng, lat]],
      radius: currentRadius,
      pickupTime,
      dropTime,
    });
  };

  const openStreetView = () => {
    const url = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${currentCoords.lat},${currentCoords.lng}`;
    window.open(url, "_blank");
  };

  const clearTempGeofence = () => {
    setTempGeofence(null);
    setCurrentGeofenceName("");
    setCurrentRadius(100);
  };

  const updateCoordinates = (lat: number, lng: number) => {
    setCurrentCoords({ lat, lng });

    if (map.current) {
      map.current.setView([lat, lng], map.current.getZoom());
    }

    if (tempGeofence) {
      setTempGeofence({
        ...tempGeofence,
        coordinates: [[lng, lat]],
      });
    }
  };

  const updateGeofenceName = (name: string) => {
    setCurrentGeofenceName(name);
    if (tempGeofence) {
      setTempGeofence({
        ...tempGeofence,
        name,
        geofenceName: name,
      });
    }
  };

  const updateRadius = (radius: number) => {
    setCurrentRadius(radius);
    if (tempGeofence) {
      setTempGeofence({
        ...tempGeofence,
        radius,
      });
    }
  };

  const resetMap = () => {
    if (map.current) {
      map.current.setView([21.1286677, 79.1038211], 12);
    }
    setActiveGeofence(null);
    setCurrentCoords({ lat: 21.1286677, lng: 79.1038211 });
    toast("Map view reset to default location.");
  };

  const undoLastAction = () => {
    toast("Last action undone.");
  };

  const handleSchoolSelect = (school: School | null) => {
    setSelectedSchool(school);
    setSchoolId(school?._id);

    if (mode === "add") {
      setSelectedBranch(null);
      setBranchId(undefined);
      setSelectedRoute(null);
    }
  };

  const handleBranchSelect = (branch: Branch | null) => {
    setSelectedBranch(branch);
    setBranchId(branch?._id);

    if (mode === "add") {
      setSelectedRoute(null);
    }
  };

  const handleRouteSelect = (route: Route | null) => {
    setSelectedRoute(route);
  };

  const formatTime = (date?: Date) => {
    if (!date) return "";
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

const saveGeofences = async () => {
  if (!tempGeofence) {
    toast.error("Please create a geofence first");
    return;
  }

  setIsLoading(true);

  try {
    const lat = tempGeofence.coordinates?.[0]?.[1] || currentCoords.lat;
    const lng = tempGeofence.coordinates?.[0]?.[0] || currentCoords.lng;

   const payloadForValidation = {
     geofenceName: tempGeofence.geofenceName || tempGeofence.name || "",
     latitude: lat,
     longitude: lng,
     radius: tempGeofence.radius || currentRadius,
     schoolId: selectedSchool?._id,
     branchId: selectedBranch?._id,
     routeObjId: selectedRoute?._id,
     pickupTime: pickupTime ? formatTime(pickupTime) : "",
     dropTime: dropTime ? formatTime(dropTime) : undefined,
   };


    // ✅ ZOD VALIDATION
    const parsed = geofenceSchema.safeParse(payloadForValidation);

    if (!parsed.success) {
      parsed.error.errors.forEach((err) => {
        toast.error(err.message);
      });
      setIsLoading(false);
      return;
    }

    // ✅ Reverse geocode only after validation
    const address = await reverseGeocodeMapTiler(lat, lng);

    const savedGeofence = {
      geofenceName: parsed.data.geofenceName,
      area: {
        center: [lat, lng],
        radius: parsed.data.radius,
      },
      schoolId: parsed.data.schoolId,
      branchId: parsed.data.branchId,
      routeObjId: parsed.data.routeObjId,
      address,
      ...(parsed.data.pickupTime && {
        pickupTime: parsed.data.pickupTime,
      }),
      ...(parsed.data.dropTime && {
        dropTime: parsed.data.dropTime,
      }),
    };

    if (mode === "add") {
      createGeofence(savedGeofence, {
        onSuccess: () => {
          setTempGeofence(null);
          onSuccess?.();
        },
      });
    } else if (mode === "edit" && geofenceId) {
      updateGeofence(
        { id: geofenceId, payload: savedGeofence },
        {
          onSuccess: () => {
            setTempGeofence(null);
            onSuccess?.();
          },
        }
      );
    }
  } catch (error) {
    console.error(error);
    toast.error("Failed to save geofence");
  } finally {
    setIsLoading(false);
  }
};


  return (
    <div className="h-screen flex bg-background">
      {/* Map Container */}
      <div className="flex-1 relative">
        <div
          ref={mapContainer}
          className="w-full h-full min-h-[500px]"
          style={{ height: "100%", minHeight: "500px" }}
        />

        {/* Map Control Buttons */}
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
        </div>
      </div>

      {/* Configuration Panel */}
      <GeofenceConfigurationPanel
        pickupTime={pickupTime}
        setPickupTime={setPickupTime}
        dropTime={dropTime}
        setDropTime={setDropTime}
        selectedSchool={selectedSchool}
        handleSchoolSelect={handleSchoolSelect}
        selectedBranch={selectedBranch}
        handleBranchSelect={handleBranchSelect}
        selectedRoute={selectedRoute}
        handleRouteSelect={handleRouteSelect}
        role={role}
        schools={schools}
        branches={branches}
        locationSearchQuery={locationSearchQuery}
        setLocationSearchQuery={setLocationSearchQuery}
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
        isLoading={isCreateLoading || isUpdateLoading || isLoading}
        tempGeofence={tempGeofence}
      />
    </div>
  );
};

export default GeofenceManager;
