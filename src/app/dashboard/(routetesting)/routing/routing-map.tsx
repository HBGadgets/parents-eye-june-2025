"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  GripVertical,
  Loader2,
  Redo2,
  RotateCcw,
  Search,
  Trash2,
  Undo2,
} from "lucide-react";
import { Combobox } from "@/components/ui/combobox";
import {
  DropdownItem,
  useBranchDropdown,
  useGeofenceDropdown,
  useRouteDropdown,
  useSchoolDropdown,
} from "@/hooks/useDropdown";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/axios";

type LeafletDefaultIconPrototype = L.Icon.Default & {
  _getIconUrl?: unknown;
};

delete (L.Icon.Default.prototype as LeafletDefaultIconPrototype)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

type Waypoint = {
  id: number;
  lat: number;
  lng: number;
  name?: string;
};

type RouteStats = {
  distance: number;
  duration: number;
};

type RouteCacheEntry = {
  geometry: GeoJSON.GeoJsonObject;
  stats: RouteStats;
};

type OsrmRouteResponse = {
  routes?: Array<{
    geometry?: GeoJSON.GeoJsonObject;
    distance?: number;
    duration?: number;
  }>;
};

type LocationSearchResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
};

const DEFAULT_CENTER: [number, number] = [21.120484, 79.091209];
const OSRM_BASE_URL = "https://router.project-osrm.org/route/v1/driving";
const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";
const ROUTE_REQUEST_DEBOUNCE_MS = 700;
const SEGMENT_KEY_SEPARATOR = "|";

const formatDistance = (meters: number) => {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
};

const areWaypointsEqual = (first: Waypoint[], second: Waypoint[]) => {
  if (first.length !== second.length) return false;

  return first.every((point, index) => {
    const comparisonPoint = second[index];
    return (
      point.id === comparisonPoint.id &&
      point.lat === comparisonPoint.lat &&
      point.lng === comparisonPoint.lng &&
      point.name === comparisonPoint.name
    );
  });
};

const getWaypointCoordinate = (point: Waypoint) =>
  `${point.lng.toFixed(6)},${point.lat.toFixed(6)}`;

const getSegmentKey = (from: Waypoint, to: Waypoint) =>
  `${getWaypointCoordinate(from)};${getWaypointCoordinate(to)}`;

const parseLatLngSearch = (query: string) => {
  const coordinateMatch = query
    .trim()
    .match(/^(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)$/);

  if (!coordinateMatch) return null;

  const lat = Number(coordinateMatch[1]);
  const lng = Number(coordinateMatch[2]);

  if (
    Number.isNaN(lat) ||
    Number.isNaN(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return null;
  }

  return { lat, lng };
};

const getDefaultWaypointLabel = (index: number, total: number) => {
  if (index === 0) return "Start Point";
  if (index === total - 1) return "End Point";
  return `Point ${index + 1}`;
};

const getWaypointLabel = (point: Waypoint, index: number, total: number) =>
  point.name?.trim() || getDefaultWaypointLabel(index, total);

const createFlagIcon = (color: "green" | "red", label: string) => {
  const flagColor = color === "green" ? "#16a34a" : "#dc2626";

  return L.divIcon({
    className: "",
    html: `
      <div style="
        width: 42px;
        height: 42px;
        display: flex;
        align-items: center;
        justify-content: center;
        filter: drop-shadow(0 8px 16px rgba(15, 23, 42, 0.28));
      ">
        <svg viewBox="0 0 24 24" style="width: 36px; height: 36px; fill: ${flagColor}; stroke: white; stroke-width: 1.4;">
          <path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/>
        </svg>
      </div>
    `,
    iconSize: [42, 42],
    iconAnchor: [14, 38],
    popupAnchor: [4, -34],
    tooltipAnchor: [14, -28],
    ariaLabel: label,
  });
};

const createNumberedIcon = (index: number, total: number) => {
  if (index === 0) return createFlagIcon("green", "Start Point");
  if (index === total - 1) return createFlagIcon("red", "End Point");

  return L.divIcon({
    className: "",
    html: `
      <div style="
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        background: #2563eb;
        border: 3px solid #ffffff;
        color: #ffffff;
        font-size: 13px;
        font-weight: 700;
        box-shadow: 0 8px 20px rgba(15, 23, 42, 0.28);
      ">
        ${index + 1}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -30],
  });
};

export default function Routing() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const searchPanelRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.GeoJSON | null>(null);
  const pendingRequestRef = useRef<AbortController | null>(null);
  const pendingSearchRequestRef = useRef<AbortController | null>(null);
  const routeCacheRef = useRef(new Map<string, RouteCacheEntry>());
  const waypointIdRef = useRef(0);
  const decodedToken = useAuthStore((state) => state.decodedToken);

  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [routeStats, setRouteStats] = useState<RouteStats | null>(null);
  const [routeError, setRouteError] = useState("");
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [debouncedSegmentKeyString, setDebouncedSegmentKeyString] =
    useState("");
  const [undoStack, setUndoStack] = useState<Waypoint[][]>([]);
  const [redoStack, setRedoStack] = useState<Waypoint[][]>([]);
  const [draggedWaypointId, setDraggedWaypointId] = useState<number | null>(
    null
  );
  const [dragOverWaypointId, setDragOverWaypointId] = useState<number | null>(
    null
  );
  const [editingWaypointId, setEditingWaypointId] = useState<number | null>(
    null
  );
  const [editingWaypointName, setEditingWaypointName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>(
    []
  );
  const [searchError, setSearchError] = useState("");
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>();
  const [selectedBranchId, setSelectedBranchId] = useState<string>();
  const [selectedRouteId, setSelectedRouteId] = useState<string>();
  const [selectedGeofenceId, setSelectedGeofenceId] = useState<string>();
  const [geofenceSearch, setGeofenceSearch] = useState("");
  const [schoolOpen, setSchoolOpen] = useState(false);
  const [branchOpen, setBranchOpen] = useState(false);
  const [routeOpen, setRouteOpen] = useState(false);
  const [geofenceOpen, setGeofenceOpen] = useState(false);

  const userRole = decodedToken?.role;
  const tokenSchoolId =
    userRole === "school" ? decodedToken?.id : decodedToken?.schoolId;
  const tokenBranchId = decodedToken?.branchId;
  const isSuperAdmin = userRole === "superAdmin";
  const isSchoolLevel = userRole === "school" || userRole === "branchGroup";
  const isBranchLevel = userRole === "branch";
  const showSchoolDropdown = isSuperAdmin;
  const showBranchDropdown = isSuperAdmin || isSchoolLevel;
  const showRouteDropdown = isSuperAdmin || isSchoolLevel || isBranchLevel;
  const showGeofenceDropdown = showRouteDropdown;

  const { data: schools = [], isLoading: isLoadingSchools } =
    useSchoolDropdown(showSchoolDropdown);

  const { data: branches = [], isLoading: isLoadingBranches } =
    useBranchDropdown(
      selectedSchoolId,
      showBranchDropdown,
      userRole === "branchGroup"
    );

  const { data: routes = [], isLoading: isLoadingRoutes } = useRouteDropdown(
    selectedBranchId,
    showRouteDropdown
  );

  const {
    data: geofencePages,
    fetchNextPage: fetchNextGeofencePage,
    hasNextPage: hasNextGeofencePage,
    isFetchingNextPage: isFetchingNextGeofencePage,
    isLoading: isLoadingGeofences,
  } = useGeofenceDropdown(selectedRouteId, geofenceSearch, showGeofenceDropdown);

  const geofences = useMemo(
    () => geofencePages?.pages.flatMap((page) => page.data) ?? [],
    [geofencePages]
  );

  const schoolItems = useMemo(
    () =>
      schools.map((school: DropdownItem) => ({
        value: school._id,
        label: school.schoolName || school.name || "Unnamed school",
      })),
    [schools]
  );

  const branchItems = useMemo(
    () =>
      branches.map((branch: DropdownItem) => ({
        value: branch._id,
        label: branch.branchName || branch.name || "Unnamed branch",
      })),
    [branches]
  );

  const routeItems = useMemo(
    () =>
      routes.map((route: DropdownItem) => ({
        value: route._id,
        label: route.routeNumber || route.routeName || route.name || "Unnamed route",
      })),
    [routes]
  );

  const geofenceItems = useMemo(
    () =>
      geofences.map((geofence: DropdownItem) => ({
        value: geofence._id,
        label: geofence.geofenceName || geofence.name || "Unnamed geofence",
      })),
    [geofences]
  );

  const routeSegmentKeys = useMemo(() => {
    if (waypoints.length < 2) return "";

    const segmentKeys: string[] = [];
    for (let index = 0; index < waypoints.length - 1; index++) {
      segmentKeys.push(getSegmentKey(waypoints[index], waypoints[index + 1]));
    }

    return segmentKeys.join(SEGMENT_KEY_SEPARATOR);
  }, [waypoints]);

  useEffect(() => {
    if (userRole === "school" && tokenSchoolId) {
      setSelectedSchoolId(tokenSchoolId);
    }

    if (userRole === "branch" && tokenBranchId) {
      setSelectedBranchId(tokenBranchId);
    }
  }, [tokenBranchId, tokenSchoolId, userRole]);

  const drawRouteSegments = useCallback((segments: RouteCacheEntry[]) => {
    if (!mapRef.current) return;

    if (routeLayerRef.current) {
      routeLayerRef.current.remove();
      routeLayerRef.current = null;
    }

    const featureCollection: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: segments.map((segment) => ({
        type: "Feature",
        properties: {},
        geometry: segment.geometry as GeoJSON.Geometry,
      })),
    };

    routeLayerRef.current = L.geoJSON(featureCollection, {
      style: {
        color: "#2563eb",
        weight: 5,
        opacity: 0.9,
      },
    }).addTo(mapRef.current);

    const bounds = routeLayerRef.current.getBounds();
    if (bounds.isValid()) {
      mapRef.current.fitBounds(bounds.pad(0.18), { maxZoom: 17 });
    }

    setRouteStats({
      distance: segments.reduce(
        (total, segment) => total + segment.stats.distance,
        0
      ),
      duration: segments.reduce(
        (total, segment) => total + segment.stats.duration,
        0
      ),
    });
  }, []);

  const updateWaypoints = useCallback(
    (updater: Waypoint[] | ((current: Waypoint[]) => Waypoint[])) => {
      setWaypoints((current) => {
        const next =
          typeof updater === "function" ? updater(current) : updater;

        if (areWaypointsEqual(current, next)) return current;

        setUndoStack((stack) => [...stack, current]);
        setRedoStack([]);

        return next;
      });
    },
    []
  );

  const addWaypoint = useCallback(
    (latlng: L.LatLng, name?: string) => {
      updateWaypoints((current) => [
        ...current,
        {
          id: waypointIdRef.current++,
          lat: latlng.lat,
          lng: latlng.lng,
          name,
        },
      ]);
    },
    [updateWaypoints]
  );

  const addSearchedPoint = (lat: number, lng: number, name?: string) => {
    const latlng = L.latLng(lat, lng);
    addWaypoint(latlng, name);
    mapRef.current?.setView(latlng, 16);
    setSearchResults([]);
    setSearchError("");
  };

  const handleLocationSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return;

    pendingSearchRequestRef.current?.abort();
    setSearchResults([]);
    setSearchError("");

    const coordinates = parseLatLngSearch(trimmedQuery);
    if (coordinates) {
      addSearchedPoint(
        coordinates.lat,
        coordinates.lng,
        `${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}`
      );
      return;
    }

    const abortController = new AbortController();
    pendingSearchRequestRef.current = abortController;
    setIsSearchingLocation(true);

    const searchUrl = `${NOMINATIM_SEARCH_URL}?format=json&limit=5&q=${encodeURIComponent(
      trimmedQuery
    )}`;

    fetch(searchUrl, { signal: abortController.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Unable to search location.");
        }

        return response.json() as Promise<LocationSearchResult[]>;
      })
      .then((results) => {
        setSearchResults(results);

        if (results.length === 0) {
          setSearchError("No matching locations found.");
        }
      })
      .catch((error) => {
        if (error.name === "AbortError") return;
        setSearchError(error.message || "Unable to search location.");
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setIsSearchingLocation(false);
        }
      });
  };

  const undoRouteChange = () => {
    setUndoStack((currentUndoStack) => {
      const previousWaypoints = currentUndoStack.at(-1);
      if (!previousWaypoints) return currentUndoStack;

      setRedoStack((currentRedoStack) => [waypoints, ...currentRedoStack]);
      setWaypoints(previousWaypoints);

      return currentUndoStack.slice(0, -1);
    });
  };

  const redoRouteChange = () => {
    setRedoStack((currentRedoStack) => {
      const nextWaypoints = currentRedoStack[0];
      if (!nextWaypoints) return currentRedoStack;

      setUndoStack((currentUndoStack) => [...currentUndoStack, waypoints]);
      setWaypoints(nextWaypoints);

      return currentRedoStack.slice(1);
    });
  };

  const clearRoute = () => {
    updateWaypoints([]);
    setRouteStats(null);
    setRouteError("");
    setDebouncedSegmentKeyString("");
  };

  const handleSchoolChange = (schoolId?: string) => {
    setSelectedSchoolId(schoolId);
    setSelectedBranchId(undefined);
    setSelectedRouteId(undefined);
    setSelectedGeofenceId(undefined);
    setGeofenceSearch("");
  };

  const handleBranchChange = (branchId?: string) => {
    setSelectedBranchId(branchId);
    setSelectedRouteId(undefined);
    setSelectedGeofenceId(undefined);
    setGeofenceSearch("");
  };

  const handleRouteChange = (routeId?: string) => {
    setSelectedRouteId(routeId);
    setSelectedGeofenceId(undefined);
    setGeofenceSearch("");
  };

  const handleGeofenceChange = async (geofenceId?: string) => {
    setSelectedGeofenceId(geofenceId);
    if (!geofenceId) return;

    let selectedGeofence = geofences.find(
      (geofence) => geofence._id === geofenceId
    ) as any;

    // If dropdown data doesn't contain the area.center coordinates, fetch them from the backend
    if (!selectedGeofence?.area?.center) {
      try {
        const response = await api.get(`/geofence/${geofenceId}`);
        if (response.data?.data) {
          selectedGeofence = response.data.data;
        } else if (response.data) {
          selectedGeofence = response.data;
        }
      } catch (error) {
        console.error("Failed to fetch geofence details by ID:", error);
        
        // Fallback: search in the `/geofence` list using the list endpoint
        try {
          const response = await api.get("/geofence", {
            params: { limit: 1, search: selectedGeofence?.geofenceName || selectedGeofence?.name }
          });
          if (response.data?.data?.[0]) {
            selectedGeofence = response.data.data[0];
          }
        } catch (fallbackError) {
          console.error("Failed fallback geofence fetch:", fallbackError);
        }
      }
    }

    if (selectedGeofence?.area?.center) {
      const [lat, lng] = selectedGeofence.area.center;
      if (
        typeof lat === "number" &&
        typeof lng === "number" &&
        !Number.isNaN(lat) &&
        !Number.isNaN(lng)
      ) {
        const latlng = L.latLng(lat, lng);
        const name =
          selectedGeofence.geofenceName ||
          selectedGeofence.name ||
          "Geofence Point";
        addWaypoint(latlng, name);
        mapRef.current?.setView(latlng, 16);
      }
    }
  };

  const deleteWaypoint = (waypointId: number) => {
    updateWaypoints((current) =>
      current.filter((point) => point.id !== waypointId)
    );
  };

  const startEditingWaypointName = (point: Waypoint, label: string) => {
    setEditingWaypointId(point.id);
    setEditingWaypointName(point.name ?? label);
  };

  const cancelEditingWaypointName = () => {
    setEditingWaypointId(null);
    setEditingWaypointName("");
  };

  const saveEditingWaypointName = (waypointId: number) => {
    const nextName = editingWaypointName.trim();

    updateWaypoints((current) =>
      current.map((point) =>
        point.id === waypointId
          ? {
              ...point,
              name: nextName || undefined,
            }
          : point
      )
    );

    cancelEditingWaypointName();
  };

  const reorderWaypoints = (targetWaypointId: number) => {
    if (draggedWaypointId === null || draggedWaypointId === targetWaypointId) {
      setDraggedWaypointId(null);
      setDragOverWaypointId(null);
      return;
    }

    updateWaypoints((current) => {
      const fromIndex = current.findIndex(
        (point) => point.id === draggedWaypointId
      );
      const toIndex = current.findIndex((point) => point.id === targetWaypointId);

      if (fromIndex === -1 || toIndex === -1) return current;

      const reordered = [...current];
      const [movedPoint] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, movedPoint);

      return reordered;
    });

    setDraggedWaypointId(null);
    setDragOverWaypointId(null);
  };

  const recenterMap = () => {
    if (!mapRef.current) return;

    if (waypoints.length > 0) {
      const bounds = L.latLngBounds(
        waypoints.map((point) => [point.lat, point.lng] as [number, number])
      );
      mapRef.current.fitBounds(bounds.pad(0.25), { maxZoom: 16 });
      return;
    }

    mapRef.current.setView(DEFAULT_CENTER, 15);
  };

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: DEFAULT_CENTER,
      zoom: 15,
      zoomControl: false,
    });

    L.control.zoom({ position: "bottomright" }).addTo(map);

    L.tileLayer("https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
      subdomains: ["mt0", "mt1", "mt2", "mt3"],
    }).addTo(map);

    markerLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    map.on("click", (event) => addWaypoint(event.latlng));

    return () => {
      pendingRequestRef.current?.abort();
      pendingSearchRequestRef.current?.abort();
      map.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
      routeLayerRef.current = null;
    };
  }, [addWaypoint]);

  useEffect(() => {
    if (!searchPanelRef.current) return;

    L.DomEvent.disableClickPropagation(searchPanelRef.current);
    L.DomEvent.disableScrollPropagation(searchPanelRef.current);
  }, []);

  useEffect(() => {
    if (!markerLayerRef.current) return;

    markerLayerRef.current.clearLayers();

    waypoints.forEach((point, index) => {
      const pointLabel = getWaypointLabel(point, index, waypoints.length);
      const marker = L.marker([point.lat, point.lng], {
        icon: createNumberedIcon(index, waypoints.length),
        draggable: true,
      });

      marker.bindPopup(`
        <div style="font-family: sans-serif; min-width: 180px;">
          <strong>${pointLabel}</strong>
          <div style="margin-top: 6px; color: #475569; font-size: 12px;">
            ${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}
          </div>
        </div>
      `);

      marker.on("dragend", () => {
        const updatedPosition = marker.getLatLng();
        updateWaypoints((current) =>
          current.map((item) =>
            item.id === point.id
              ? { ...item, lat: updatedPosition.lat, lng: updatedPosition.lng }
              : item
          )
        );
      });

      marker.addTo(markerLayerRef.current!);
    });
  }, [waypoints, updateWaypoints]);

  useEffect(() => {
    pendingRequestRef.current?.abort();

    if (!routeSegmentKeys) {
      setDebouncedSegmentKeyString("");
      setIsLoadingRoute(false);
      setRouteStats(null);
      setRouteError("");

      if (routeLayerRef.current) {
        routeLayerRef.current.remove();
        routeLayerRef.current = null;
      }

      return;
    }

    setIsLoadingRoute(true);
    setRouteError("");

    const debounceTimer = window.setTimeout(() => {
      setDebouncedSegmentKeyString(routeSegmentKeys);
    }, ROUTE_REQUEST_DEBOUNCE_MS);

    return () => window.clearTimeout(debounceTimer);
  }, [routeSegmentKeys]);

  useEffect(() => {
    if (!mapRef.current) return;

    if (!debouncedSegmentKeyString) {
      if (routeLayerRef.current) {
        routeLayerRef.current.remove();
        routeLayerRef.current = null;
      }

      setIsLoadingRoute(false);
      setRouteStats(null);
      setRouteError("");
      return;
    }

    const segmentKeys = debouncedSegmentKeyString.split(SEGMENT_KEY_SEPARATOR);
    const missingSegmentKeys = segmentKeys.filter(
      (segmentKey) => !routeCacheRef.current.has(segmentKey)
    );

    if (missingSegmentKeys.length === 0) {
      const cachedSegments = segmentKeys
        .map((segmentKey) => routeCacheRef.current.get(segmentKey))
        .filter((segment): segment is RouteCacheEntry => Boolean(segment));

      drawRouteSegments(cachedSegments);
      setIsLoadingRoute(false);
      return;
    }

    const abortController = new AbortController();
    pendingRequestRef.current = abortController;
    setIsLoadingRoute(true);
    setRouteError("");

    Promise.all(
      missingSegmentKeys.map((segmentKey) => {
        const osrmUrl = `${OSRM_BASE_URL}/${segmentKey}?overview=full&geometries=geojson`;

        return fetch(osrmUrl, { signal: abortController.signal })
          .then((response) => {
            if (!response.ok) {
              throw new Error("Unable to fetch route from OSRM.");
            }
            return response.json() as Promise<OsrmRouteResponse>;
          })
          .then((data) => {
            const route = data.routes?.[0];

            if (
              !route?.geometry ||
              typeof route.distance !== "number" ||
              typeof route.duration !== "number"
            ) {
              throw new Error("OSRM did not return a route for these points.");
            }

            const routeEntry: RouteCacheEntry = {
              geometry: route.geometry,
              stats: {
                distance: route.distance,
                duration: route.duration,
              },
            };

            routeCacheRef.current.set(segmentKey, routeEntry);
          });
      })
    )
      .then(() => {
        const routeSegments = segmentKeys
          .map((segmentKey) => routeCacheRef.current.get(segmentKey))
          .filter((segment): segment is RouteCacheEntry => Boolean(segment));

        drawRouteSegments(routeSegments);
      })
      .catch((error) => {
        if (error.name === "AbortError") return;
        setRouteStats(null);
        setRouteError(error.message || "Unable to draw route.");
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setIsLoadingRoute(false);
        }
      });
  }, [debouncedSegmentKeyString, drawRouteSegments]);

  return (
    <div className="flex h-[calc(100vh-96px)] min-h-[640px] flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">
            Route Optimization
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Select points on the map to draw the driving route between them.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={recenterMap}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
            title="Recenter map"
          >
            <RotateCcw size={18} />
          </button>
          <button
            type="button"
            onClick={undoRouteChange}
            disabled={undoStack.length === 0}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
            title="Undo route change"
          >
            <Undo2 size={18} />
          </button>
          <button
            type="button"
            onClick={redoRouteChange}
            disabled={redoStack.length === 0}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
            title="Redo route change"
          >
            <Redo2 size={18} />
          </button>
          <button
            type="button"
            onClick={clearRoute}
            disabled={waypoints.length === 0}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-red-600 shadow-sm hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-45"
            title="Clear route"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {(showSchoolDropdown ||
        showBranchDropdown ||
        showRouteDropdown ||
        showGeofenceDropdown) && (
        <div className="grid shrink-0 grid-cols-1 gap-3 rounded-md border border-slate-200 bg-white p-3 md:grid-cols-2 xl:grid-cols-4">
          {showSchoolDropdown && (
            <div className="min-w-0">
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                School
              </label>
              <Combobox
                items={schoolItems}
                value={selectedSchoolId}
                onValueChange={handleSchoolChange}
                placeholder="Select school"
                searchPlaceholder="Search schools..."
                emptyMessage={isLoadingSchools ? "Loading..." : "No school found"}
                width="w-full"
                open={schoolOpen}
                onOpenChange={setSchoolOpen}
              />
            </div>
          )}

          {showBranchDropdown && (
            <div className="min-w-0">
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Branch
              </label>
              <Combobox
                items={branchItems}
                value={selectedBranchId}
                onValueChange={handleBranchChange}
                placeholder="Select branch"
                searchPlaceholder="Search branches..."
                emptyMessage={isLoadingBranches ? "Loading..." : "No branch found"}
                width="w-full"
                disabled={
                  isSuperAdmin
                    ? !selectedSchoolId
                    : userRole === "school" && !selectedSchoolId
                }
                open={branchOpen}
                onOpenChange={setBranchOpen}
              />
            </div>
          )}

          {showRouteDropdown && (
            <div className="min-w-0">
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Route
              </label>
              <Combobox
                items={routeItems}
                value={selectedRouteId}
                onValueChange={handleRouteChange}
                placeholder="Select route"
                searchPlaceholder="Search routes..."
                emptyMessage={isLoadingRoutes ? "Loading..." : "No route found"}
                width="w-full"
                disabled={!selectedBranchId}
                open={routeOpen}
                onOpenChange={setRouteOpen}
              />
            </div>
          )}

          {showGeofenceDropdown && (
            <div className="min-w-0">
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Geofence
              </label>
              <Combobox
                items={geofenceItems}
                value={selectedGeofenceId}
                onValueChange={handleGeofenceChange}
                placeholder="Select geofence"
                searchPlaceholder="Search geofences..."
                emptyMessage={
                  isLoadingGeofences ? "Loading..." : "No geofence found"
                }
                width="w-full"
                disabled={!selectedRouteId}
                open={geofenceOpen}
                onOpenChange={setGeofenceOpen}
                searchValue={geofenceSearch}
                onSearchChange={setGeofenceSearch}
                onReachEnd={() => {
                  if (hasNextGeofencePage && !isFetchingNextGeofencePage) {
                    fetchNextGeofencePage();
                  }
                }}
                isLoadingMore={isFetchingNextGeofencePage}
              />
            </div>
          )}
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="relative min-h-[460px] overflow-hidden rounded-md border border-slate-200 bg-slate-100">
          <div ref={mapContainerRef} className="h-full w-full" />
          <div
            ref={searchPanelRef}
            className="absolute left-4 top-4 z-[500] w-[min(420px,calc(100%-32px))] rounded-md border border-slate-200 bg-white/95 p-2 shadow-sm"
          >
            <form onSubmit={handleLocationSearch} className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search location or lat, lng"
                  className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-950 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <button
                type="submit"
                disabled={isSearchingLocation || !searchQuery.trim()}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
                title="Search and add point"
              >
                {isSearchingLocation ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Search size={16} />
                )}
              </button>
            </form>

            {searchError && (
              <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {searchError}
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="mt-2 max-h-56 overflow-y-auto rounded-md border border-slate-200 bg-white">
                {searchResults.map((result) => (
                  <button
                    key={result.place_id}
                    type="button"
                    onClick={() =>
                      addSearchedPoint(
                        Number(result.lat),
                        Number(result.lon),
                        result.display_name.split(",")[0]?.trim() ||
                          "Searched Point"
                      )
                    }
                    className="block w-full border-b border-slate-100 px-3 py-2 text-left text-sm text-slate-700 last:border-b-0 hover:bg-slate-50"
                  >
                    <span className="block truncate font-medium text-slate-950">
                      {result.display_name.split(",")[0]}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-slate-500">
                      {result.display_name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="pointer-events-none absolute left-4 top-[76px] z-[400] rounded-md border border-slate-200 bg-white/95 px-3 py-2 text-sm text-slate-700 shadow-sm">
            {isLoadingRoute
              ? "Updating route..."
              : waypoints.length < 2
                ? "Click the map to add at least 2 points."
                : "Route ready."}
          </div>
        </div>

        <aside className="flex min-h-0 flex-col overflow-hidden rounded-md border border-slate-200 bg-white">
          <div className="shrink-0 border-b border-slate-200 px-4 py-3">
            <h2 className="text-base font-semibold text-slate-950">
              Selected Points
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Drag markers to adjust location. Drag rows to reorder sequence.
            </p>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
            <div className="grid shrink-0 grid-cols-2 gap-3">
              <div className="rounded-md border border-slate-200 p-3">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Distance
                </div>
                <div className="mt-1 text-lg font-semibold text-slate-950">
                  {routeStats ? formatDistance(routeStats.distance) : "-"}
                </div>
              </div>
              <div className="rounded-md border border-slate-200 p-3">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Points
                </div>
                <div className="mt-1 text-lg font-semibold text-slate-950">
                  {waypoints.length}
                </div>
              </div>
            </div>

            {routeError && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {routeError}
              </div>
            )}

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {waypoints.length === 0 ? (
                <div className="rounded-md border border-dashed border-slate-300 px-3 py-8 text-center text-sm text-slate-500">
                  No points selected yet.
                </div>
              ) : (
                waypoints.map((point, index) => {
                  const pointLabel = getWaypointLabel(
                    point,
                    index,
                    waypoints.length
                  );

                  return (
                  <div
                    key={point.id}
                    draggable
                    onDragStart={() => setDraggedWaypointId(point.id)}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDragOverWaypointId(point.id);
                    }}
                    onDragLeave={() => {
                      setDragOverWaypointId((current) =>
                        current === point.id ? null : current
                      );
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      reorderWaypoints(point.id);
                    }}
                    onDragEnd={() => {
                      setDraggedWaypointId(null);
                      setDragOverWaypointId(null);
                    }}
                    className={`cursor-grab rounded-md border px-3 py-2 transition active:cursor-grabbing ${
                      dragOverWaypointId === point.id &&
                      draggedWaypointId !== point.id
                        ? "border-blue-400 bg-blue-50"
                        : "border-slate-200 bg-white"
                    } ${
                      draggedWaypointId === point.id
                        ? "opacity-55"
                        : "opacity-100"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className="mt-0.5 flex h-8 w-5 shrink-0 items-center justify-center text-slate-400"
                        title="Drag to reorder"
                      >
                        <GripVertical size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          {editingWaypointId === point.id ? (
                            <input
                              autoFocus
                              value={editingWaypointName}
                              onChange={(event) =>
                                setEditingWaypointName(event.target.value)
                              }
                              onBlur={() => saveEditingWaypointName(point.id)}
                              onClick={(event) => event.stopPropagation()}
                              onDragStart={(event) => event.preventDefault()}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  saveEditingWaypointName(point.id);
                                }

                                if (event.key === "Escape") {
                                  cancelEditingWaypointName();
                                }
                              }}
                              className="min-w-0 flex-1 rounded-md border border-blue-300 bg-white px-2 py-1 text-sm font-medium text-slate-950 outline-none ring-2 ring-blue-100"
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                startEditingWaypointName(point, pointLabel);
                              }}
                              onDragStart={(event) => event.preventDefault()}
                              className="min-w-0 truncate rounded-md px-1 py-0.5 text-left text-sm font-medium text-slate-950 hover:bg-slate-100"
                              title="Rename point"
                            >
                              {pointLabel}
                            </button>
                          )}
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                              {index + 1}
                            </span>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                deleteWaypoint(point.id);
                              }}
                              onDragStart={(event) => event.preventDefault()}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600"
                              title="Delete point"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        <div className="mt-1 truncate font-mono text-xs text-slate-500">
                          {point.lat.toFixed(6)}, {point.lng.toFixed(6)}
                        </div>
                      </div>
                    </div>
                  </div>
                  );
                })
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
