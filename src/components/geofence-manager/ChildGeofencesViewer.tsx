"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { bleService } from "@/services/api/bleService";
import { geofenceService } from "@/services/api/geofenceSerevice";
import { reverseGeocodeMapTiler } from "@/hooks/useReverseGeocoding";
import { useDebounce } from "@/hooks/useDebounce";
import {
  MapPin,
  Pencil,
  Plus,
  Search,
  X,
  Shield,
  Crosshair,
  Loader2,
  RefreshCw,
  AlertCircle,
  Battery,
  SlidersHorizontal,
  ArrowLeft,
  Check,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import "./style.css";

// Fix for default Leaflet marker icons
if (typeof window !== "undefined") {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  });
}

export interface BleGeofenceItem {
  _id: string;
  name: string;
  fenceType?: string;
  center: {
    lat: number;
    lng: number;
  };
  radius: number;
  alarmRules?: "both" | "enter" | "exit" | string;
  status?: string;
  schoolName?: string;
  branchName?: string;
  childName?: string;
  parentName?: string;
  parentMobile?: string;
  boundaryToleranceMeter?: number;
  cooldownMinutes?: number;
  remark?: string;
  childId?: any;
  schoolId?: any;
  branchId?: any;
  devices?: any[];
  [key: string]: any;
}

interface ChildGeofencesViewerProps {
  isOpen: boolean;
  onClose: () => void;
  device: any | null;
  onEditGeofence: (fence: BleGeofenceItem, device: any) => void;
  onAddNewGeofence?: (device: any) => void;
  onGeofenceCreated?: () => void;
  onGeofenceDeleted?: (fence: BleGeofenceItem) => void;
}

export default function ChildGeofencesViewer({
  isOpen,
  onClose,
  device,
  onEditGeofence,
  onAddNewGeofence,
  onGeofenceCreated,
  onGeofenceDeleted,
}: ChildGeofencesViewerProps) {
  const [fences, setFences] = useState<BleGeofenceItem[]>([]);
  const [selectedFenceId, setSelectedFenceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Deletion State
  const [fenceToDelete, setFenceToDelete] = useState<BleGeofenceItem | null>(null);
  const [isDeletingFence, setIsDeletingFence] = useState<boolean>(false);

  // Inline Geofence Creation / Editing State
  const [isAddingFence, setIsAddingFence] = useState<boolean>(false);
  const isAddingFenceRef = useRef<boolean>(false);
  isAddingFenceRef.current = isAddingFence;
  const [editingFence, setEditingFence] = useState<BleGeofenceItem | null>(null);

  const [newFenceName, setNewFenceName] = useState<string>("");
  const [newRadius, setNewRadius] = useState<number>(250);
  const [newCenter, setNewCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [newAddress, setNewAddress] = useState<string>("");
  const [newAlarmRules, setNewAlarmRules] = useState<"both" | "enter" | "exit">("both");
  const [newBoundaryToleranceMeter, setNewBoundaryToleranceMeter] = useState<number>(5);
  const [newCooldownMinutes, setNewCooldownMinutes] = useState<number>(2);
  const [newRemark, setNewRemark] = useState<string>("");
  const [isSavingFence, setIsSavingFence] = useState<boolean>(false);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersGroupRef = useRef<L.LayerGroup | null>(null);
  const tempLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const hasInitialFittedRef = useRef<boolean>(false);

  // Extract identifiers from device
  const raw = device?.rawBleDevice || device;
  const childObj =
    typeof raw?.childId === "object"
      ? raw?.childId
      : typeof device?.childId === "object"
      ? device?.childId
      : null;

  const childId =
    childObj?._id ||
    (typeof raw?.childId === "string" ? raw?.childId : null) ||
    (typeof device?.childId === "string" ? device?.childId : null);

  const childName =
    childObj?.childName ||
    device?.childName ||
    raw?.childName ||
    "Child";

  const deviceName = device?.name || raw?.name || "GeoTag";
  const sn = device?.uniqueId || device?.imei || raw?.sn || raw?.uniqueId || "";
  const schoolName =
    typeof raw?.schoolId === "object"
      ? raw?.schoolId?.schoolName
      : device?.schoolName || "-";
  const branchName =
    typeof raw?.branchId === "object"
      ? raw?.branchId?.branchName
      : device?.branchName || "-";
  const batteryLevel = device?.batteryLevel ?? raw?.battery ?? 100;

  const deviceLat = Number(raw?.lastLocation?.lat ?? device?.latitude ?? device?.lat);
  const deviceLng = Number(raw?.lastLocation?.lng ?? device?.longitude ?? device?.lng);
  const hasValidDeviceCoords =
    !isNaN(deviceLat) &&
    !isNaN(deviceLng) &&
    deviceLat !== 0 &&
    deviceLng !== 0;

  // Fetch geofences using GET /api/geofences
  const fetchGeofences = useCallback(async () => {
    if (!device) return;

    setIsLoading(true);
    try {
      const schoolId =
        typeof raw?.schoolId === "object"
          ? raw?.schoolId?._id
          : raw?.schoolId || device?.schoolId;
      const branchId =
        typeof raw?.branchId === "object"
          ? raw?.branchId?._id
          : raw?.branchId || device?.branchId;

      const params: Record<string, any> = {
        page: 1,
        limit: 50,
      };

      if (childId) {
        params.childId = childId;
      }
      if (sn) {
        params.sn = sn;
      }
      if (schoolId) params.schoolId = schoolId;
      if (branchId) params.branchId = branchId;

      let res = await bleService.getBleGeofences(params);
      let list: BleGeofenceItem[] =
        res?.fences ||
        res?.data?.fences ||
        (Array.isArray(res?.data) ? res.data : []) ||
        (Array.isArray(res) ? res : []);

      // If nothing found with strict childId + sn, fallback to sn or universal search
      if (list.length === 0 && (sn || childName !== "Child")) {
        const fallbackRes = await bleService.getBleGeofences({
          page: 1,
          limit: 50,
          search: sn || (childName !== "Child" ? childName : undefined),
        });
        const fallbackList =
          fallbackRes?.fences ||
          fallbackRes?.data?.fences ||
          (Array.isArray(fallbackRes?.data) ? fallbackRes.data : []);
        if (fallbackList.length > 0) {
          list = fallbackList;
        }
      }

      setFences(list);
      if (list.length > 0) {
        setSelectedFenceId((prev) => (prev && list.some((f) => f._id === prev) ? prev : list[0]._id));
      } else {
        setSelectedFenceId(null);
      }
    } catch (err: any) {
      console.error("Failed to fetch child geofences:", err);
      toast.error("Failed to load geofences", {
        description: err?.response?.data?.message || err?.message || "Server error",
      });
      setFences([]);
    } finally {
      setIsLoading(false);
    }
  }, [device, childId, sn, childName, raw?.schoolId, raw?.branchId]);

  useEffect(() => {
    if (isOpen) {
      hasInitialFittedRef.current = false;
      fetchGeofences();
    }
  }, [isOpen, fetchGeofences]);

  // Filtered fences for sidebar list
  const filteredFences = useMemo(() => {
    return fences.filter((f) => {
      const matchesSearch =
        !debouncedSearchQuery.trim() ||
        f.name?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        f.childName?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        f.remark?.toLowerCase().includes(debouncedSearchQuery.toLowerCase());

      const status = (f.status || "active").toLowerCase();
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && status === "active") ||
        (statusFilter === "inactive" && status !== "active");

      return matchesSearch && matchesStatus;
    });
  }, [fences, debouncedSearchQuery, statusFilter]);

  // Active selected fence object
  const activeFence = useMemo(() => {
    return fences.find((f) => f._id === selectedFenceId) || fences[0] || null;
  }, [fences, selectedFenceId]);

  // Initialize Leaflet map
  useEffect(() => {
    if (!isOpen) return;

    let resizeObserver: ResizeObserver | null = null;

    const timer = setTimeout(() => {
      if (!mapContainerRef.current || mapRef.current) return;

      const defaultLat = hasValidDeviceCoords ? deviceLat : 21.1286677;
      const defaultLng = hasValidDeviceCoords ? deviceLng : 79.1038211;

      const mapInstance = L.map(mapContainerRef.current, {
        zoomControl: false,
      }).setView([defaultLat, defaultLng], 14);

      // Add Zoom Control explicitly at bottom-right corner to avoid overlapping toolbar
      L.control.zoom({ position: "bottomright" }).addTo(mapInstance);

      // Google Maps standard road tile layer (same as GeofenceManager)
      L.tileLayer(`https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}`, {
        maxZoom: 20,
        subdomains: ["mt0", "mt1", "mt2", "mt3"],
      }).addTo(mapInstance);

      layersGroupRef.current = L.layerGroup().addTo(mapInstance);
      tempLayerGroupRef.current = L.layerGroup().addTo(mapInstance);
      mapRef.current = mapInstance;

      // Handle map clicks during inline geofence creation
      mapInstance.on("click", (e: L.LeafletMouseEvent) => {
        if (isAddingFenceRef.current) {
          const lat = e.latlng.lat;
          const lng = e.latlng.lng;
          setNewCenter({ lat, lng });
          reverseGeocodeMapTiler(lat, lng)
            .then((addr) => {
              if (addr) setNewAddress(addr);
            })
            .catch(() => {});
        }
      });

      // Invalidate size on initial display & animation
      mapInstance.invalidateSize();
      setTimeout(() => mapInstance.invalidateSize(), 150);
      setTimeout(() => mapInstance.invalidateSize(), 350);
      setTimeout(() => mapInstance.invalidateSize(), 700);

      // Handle container resizing smoothly
      resizeObserver = new ResizeObserver(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      });
      if (mapContainerRef.current) {
        resizeObserver.observe(mapContainerRef.current);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        layersGroupRef.current = null;
        tempLayerGroupRef.current = null;
      }
    };
  }, [isOpen, hasValidDeviceCoords, deviceLat, deviceLng]);

  // Center map smoothly on a selected fence
  const handleSelectFence = useCallback((fence: BleGeofenceItem) => {
    setSelectedFenceId(fence._id);
    if (!mapRef.current) return;

    const lat = Number(fence.center?.lat);
    const lng = Number(fence.center?.lng);
    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
      mapRef.current.invalidateSize();
      const currentZoom = mapRef.current.getZoom();
      const targetZoom = Math.max(currentZoom, 15);
      mapRef.current.setView([lat, lng], targetZoom, { animate: true });
    }
  }, []);

  // Redraw geofences whenever fences or active fence changes
  useEffect(() => {
    if (!mapRef.current || !layersGroupRef.current) return;

    const map = mapRef.current;
    const group = layersGroupRef.current;
    group.clearLayers();

    const bounds: L.LatLngBounds = L.latLngBounds([]);

    // 1. Plot current device location if available
    if (hasValidDeviceCoords) {
      const devLatLng: [number, number] = [deviceLat, deviceLng];
      bounds.extend(devLatLng);

      const deviceIcon = L.divIcon({
        className: "custom-device-pin",
        html: `
          <div class="relative flex items-center justify-center">
            <span class="absolute w-8 h-8 rounded-full bg-blue-500/30 animate-ping"></span>
            <div class="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg border-2 border-white text-[11px] font-bold">
              📍
            </div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const devMarker = L.marker(devLatLng, { icon: deviceIcon });
      devMarker.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; line-height: 1.4;">
          <div style="font-weight: 700; color: #1e3a8a; margin-bottom: 2px;">${deviceName}</div>
          <div style="color: #475569; font-size: 11px;">SN: ${sn}</div>
          <div style="color: #059669; font-weight: 600; font-size: 11px; margin-top: 4px;">Last Known Device Location</div>
        </div>
      `);
      group.addLayer(devMarker);
    }

    // 2. Plot all fences
    fences.forEach((fence) => {
      // If we are currently editing this fence, skip drawing its static circle so interactive preview controls it
      if (isAddingFence && editingFence && editingFence._id === fence._id) {
        return;
      }

      const lat = Number(fence.center?.lat);
      const lng = Number(fence.center?.lng);
      if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return;

      const center: [number, number] = [lat, lng];
      bounds.extend(center);

      const isSelected = fence._id === activeFence?._id;
      const radius = Number(fence.radius) || 200;

      // Circle styling
      const circle = L.circle(center, {
        radius,
        fillColor: isSelected ? "#f59e0b" : "#10b981",
        fillOpacity: isSelected ? 0.32 : 0.18,
        color: isSelected ? "#d97706" : "#059669",
        weight: isSelected ? 3 : 2,
        opacity: isSelected ? 1 : 0.85,
        className: isSelected ? "geofence-pulse-circle cursor-pointer" : "cursor-pointer",
      });

      // Clicking circle centers the geofence on map
      circle.on("click", () => {
        handleSelectFence(fence);
      });

      // Pulse effects on selected fence
      if (isSelected) {
        // Outer subtle radar pulse ring
        const radar = L.circle(center, {
          radius: radius * 1.03,
          fillOpacity: 0,
          color: "#f59e0b",
          weight: 1.5,
          opacity: 0.7,
          className: "geofence-pulse-radar",
          interactive: false,
        });
        group.addLayer(radar);

        // Center beacon wave marker
        const beaconIcon = L.divIcon({
          className: "geofence-center-pulse-container",
          html: `
            <div class="geofence-pulse-beacon">
              <div class="geofence-pulse-beacon-wave"></div>
              <div class="geofence-pulse-beacon-wave delay"></div>
            </div>
          `,
          iconSize: [48, 48],
          iconAnchor: [24, 24],
        });
        const beaconMarker = L.marker(center, {
          icon: beaconIcon,
          interactive: false,
        });
        group.addLayer(beaconMarker);
      }

      // Center Pin Marker
      const centerMarker = L.marker(center);
      centerMarker.on("click", () => {
        handleSelectFence(fence);
      });

      // Marker Popup
      const popupContent = document.createElement("div");
      popupContent.style.minWidth = "200px";
      popupContent.innerHTML = `
        <div style="font-family: inherit; font-size: 12px; line-height: 1.4;">
          <div style="font-weight: 700; font-size: 13px; color: #0f172a; margin-bottom: 2px;">
            ${fence.name || "Geofence"}
          </div>
          <div style="display: flex; gap: 4px; margin-bottom: 6px;">
            <span style="background: ${
              fence.status === "active" ? "#ecfdf5" : "#f1f5f9"
            }; color: ${
        fence.status === "active" ? "#047857" : "#475569"
      }; border: 1px solid ${
        fence.status === "active" ? "#a7f3d0" : "#cbd5e1"
      }; border-radius: 9999px; padding: 1px 6px; font-size: 10px; font-weight: 600;">
              ${(fence.status || "active").toUpperCase()}
            </span>
            <span style="background: #f8fafc; color: #475569; border: 1px solid #e2e8f0; border-radius: 9999px; padding: 1px 6px; font-size: 10px; font-weight: 600;">
              ${radius}m radius
            </span>
          </div>
          <div style="color: #64748b; font-size: 11px; margin-bottom: 8px;">
            <div><strong>Alerts:</strong> ${fence.alarmRules || "both"}</div>
            <div><strong>Center:</strong> ${lat.toFixed(5)}, ${lng.toFixed(5)}</div>
          </div>
          <button id="btn-edit-${fence._id}" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 4px; background: #eab308; color: #ffffff; font-weight: 600; padding: 5px 10px; border-radius: 6px; border: none; cursor: pointer; font-size: 11px;">
            ✏️ Edit Geofence
          </button>
        </div>
      `;

      // Bind button action inside popup
      popupContent
        .querySelector(`#btn-edit-${fence._id}`)
        ?.addEventListener("click", () => {
          onEditGeofence(fence, device);
        });

      circle.bindPopup(popupContent);
      centerMarker.bindPopup(popupContent);

      group.addLayer(circle);
      group.addLayer(centerMarker);
    });

    // Auto fit map view ONLY ONCE on initial open (do not re-fit on click/selection)
    if (!hasInitialFittedRef.current && bounds.isValid() && fences.length > 0) {
      hasInitialFittedRef.current = true;
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
          mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
        }
      }, 250);
    }
  }, [fences, activeFence, hasValidDeviceCoords, deviceLat, deviceLng, deviceName, sn, device, onEditGeofence, handleSelectFence]);

  // Center on device position
  const handleCenterOnDevice = () => {
    if (!mapRef.current || !hasValidDeviceCoords) {
      toast.info("No GPS coordinates recorded for this device");
      return;
    }
    mapRef.current.invalidateSize();
    const currentZoom = mapRef.current.getZoom();
    const targetZoom = Math.max(currentZoom, 16);
    mapRef.current.setView([deviceLat, deviceLng], targetZoom, { animate: true });
  };

  // Reset to view all fences
  const handleFitAllFences = () => {
    if (!mapRef.current || fences.length === 0) return;
    mapRef.current.invalidateSize();
    const bounds = L.latLngBounds([]);
    fences.forEach((f) => {
      const lat = Number(f.center?.lat);
      const lng = Number(f.center?.lng);
      if (!isNaN(lat) && !isNaN(lng)) {
        bounds.extend([lat, lng]);
      }
    });
    if (hasValidDeviceCoords) {
      bounds.extend([deviceLat, deviceLng]);
    }
    if (bounds.isValid()) {
      mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    }
  };

  // Draw preview circle and draggable pin during inline geofence creation or editing
  useEffect(() => {
    if (!mapRef.current || !tempLayerGroupRef.current) return;
    const tempGroup = tempLayerGroupRef.current;
    tempGroup.clearLayers();

    if (!isAddingFence || !newCenter) return;

    const center: [number, number] = [newCenter.lat, newCenter.lng];
    const isEditing = Boolean(editingFence);

    // Circle preview: amber for editing, emerald for creating
    const circle = L.circle(center, {
      radius: newRadius,
      fillColor: isEditing ? "#f59e0b" : "#10b981",
      fillOpacity: 0.28,
      color: isEditing ? "#d97706" : "#059669",
      weight: 2.5,
      dashArray: "6, 6",
    });
    tempGroup.addLayer(circle);

    // Draggable marker with custom pin icon
    const pinColor = isEditing ? "#d97706" : "#059669";
    const pingColor = isEditing
      ? "rgba(245, 158, 11, 0.4)"
      : "rgba(16, 185, 129, 0.4)";

    const pinIcon = L.divIcon({
      className: "custom-add-geofence-pin",
      html: `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; cursor: grab;">
          <span style="position: absolute; width: 36px; height: 36px; border-radius: 9999px; background: ${pingColor}; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
          <div style="width: 32px; height: 32px; border-radius: 9999px; background: ${pinColor}; color: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 8px -1px rgba(0,0,0,0.35); border: 2.5px solid white; font-size: 15px; font-weight: bold;">
            📍
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const marker = L.marker(center, { icon: pinIcon, draggable: true });
    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      setNewCenter({ lat: pos.lat, lng: pos.lng });
      reverseGeocodeMapTiler(pos.lat, pos.lng)
        .then((addr) => {
          if (addr) setNewAddress(addr);
        })
        .catch(() => {});
    });

    marker.bindTooltip(
      isEditing
        ? `Drag pin to update "${editingFence?.name}" center`
        : "Drag pin to reposition center",
      { permanent: false, direction: "top" }
    );
    tempGroup.addLayer(marker);
  }, [isAddingFence, editingFence, newCenter, newRadius]);

  const handleStartAddFence = useCallback(() => {
    const defaultLat = hasValidDeviceCoords ? deviceLat : 21.1286677;
    const defaultLng = hasValidDeviceCoords ? deviceLng : 79.1038211;

    setEditingFence(null);
    setNewFenceName("");
    setNewRadius(250);
    setNewCenter({ lat: defaultLat, lng: defaultLng });
    setNewAlarmRules("both");
    setNewBoundaryToleranceMeter(5);
    setNewCooldownMinutes(2);
    setNewRemark("");
    setNewAddress("");
    setIsAddingFence(true);

    if (mapRef.current) {
      mapRef.current.invalidateSize();
      mapRef.current.setView([defaultLat, defaultLng], 15, { animate: true });
    }

    reverseGeocodeMapTiler(defaultLat, defaultLng)
      .then((addr) => {
        if (addr) setNewAddress(addr);
      })
      .catch(() => {});
  }, [hasValidDeviceCoords, deviceLat, deviceLng]);

  const handleStartEditFence = useCallback(
    (fence: BleGeofenceItem) => {
      const lat =
        Number(fence.center?.lat) ||
        (hasValidDeviceCoords ? deviceLat : 21.1286677);
      const lng =
        Number(fence.center?.lng) ||
        (hasValidDeviceCoords ? deviceLng : 79.1038211);

      setEditingFence(fence);
      setNewFenceName(fence.name || "");
      setNewRadius(Number(fence.radius) || 250);
      setNewCenter({ lat, lng });
      setNewAlarmRules((fence.alarmRules as any) || "both");
      setNewBoundaryToleranceMeter(fence.boundaryToleranceMeter ?? 5);
      setNewCooldownMinutes(fence.cooldownMinutes ?? 2);
      setNewRemark(fence.remark || "");
      setNewAddress("");
      setIsAddingFence(true);
      setSelectedFenceId(fence._id);

      if (mapRef.current) {
        mapRef.current.invalidateSize();
        mapRef.current.setView([lat, lng], 16, { animate: true });
      }

      reverseGeocodeMapTiler(lat, lng)
        .then((addr) => {
          if (addr) setNewAddress(addr);
        })
        .catch(() => {});
    },
    [hasValidDeviceCoords, deviceLat, deviceLng]
  );

  const handleCancelAdd = useCallback(() => {
    setIsAddingFence(false);
    setEditingFence(null);
    setNewCenter(null);
    if (tempLayerGroupRef.current) {
      tempLayerGroupRef.current.clearLayers();
    }
  }, []);

  const handleSaveNewGeofence = async () => {
    if (!newFenceName.trim()) {
      toast.error("Please enter a geofence name");
      return;
    }
    if (!newCenter || isNaN(newCenter.lat) || isNaN(newCenter.lng)) {
      toast.error("Please set a valid center position on the map");
      return;
    }

    setIsSavingFence(true);
    try {
      const schoolId =
        typeof raw?.schoolId === "object"
          ? raw?.schoolId?._id
          : raw?.schoolId || device?.schoolId || null;
      const branchId =
        typeof raw?.branchId === "object"
          ? raw?.branchId?._id
          : raw?.branchId || device?.branchId || null;

      const targetDeviceId = device?._id || device?.deviceId || raw?._id;
      const deviceIdsList = targetDeviceId ? [targetDeviceId] : [];

      const payload = {
        name: newFenceName.trim(),
        fenceType: "circle" as const,
        center: {
          lat: Number(newCenter.lat),
          lng: Number(newCenter.lng),
        },
        radius: Number(newRadius) || 250,
        alarmRules: newAlarmRules || "both",
        schoolId: schoolId || null,
        branchId: branchId || null,
        childId: childId || null,
        deviceIds: deviceIdsList,
        boundaryToleranceMeter: Number(newBoundaryToleranceMeter) || 5,
        cooldownMinutes: Number(newCooldownMinutes) || 2,
        remark: newRemark.trim() || newAddress.trim() || "School boundary",
      };

      if (editingFence) {
        // UPDATE existing geofence inline
        await bleService.updateBleGeofence(editingFence._id, payload);
        toast.success("Geofence updated successfully!", {
          description: `"${newFenceName.trim()}" has been updated.`,
        });

        const updatedId = editingFence._id;
        setIsAddingFence(false);
        setEditingFence(null);
        setNewCenter(null);
        if (tempLayerGroupRef.current) {
          tempLayerGroupRef.current.clearLayers();
        }

        await fetchGeofences();
        setSelectedFenceId(updatedId);
        onGeofenceCreated?.();
      } else {
        // CREATE new geofence inline
        const res = await bleService.createBleGeofence(payload);
        const createdId =
          res?._id ||
          res?.geofence?._id ||
          res?.data?._id ||
          res?.data?.geofence?._id;

        if (targetDeviceId && createdId) {
          try {
            await bleService.updateBleDeviceAssignment(targetDeviceId, {
              geofenceId: createdId,
              geofence: createdId,
            });
          } catch (err: any) {
            console.warn("Could not bind new geofence to GeoTag:", err);
          }
        }

        toast.success("Geofence created successfully!");
        setIsAddingFence(false);
        setNewCenter(null);
        if (tempLayerGroupRef.current) {
          tempLayerGroupRef.current.clearLayers();
        }

        await fetchGeofences();
        if (createdId) {
          setSelectedFenceId(createdId);
        }
        onGeofenceCreated?.();
      }
    } catch (err: any) {
      console.error("Failed to save geofence:", err);
      toast.error(
        editingFence ? "Failed to update geofence" : "Failed to save geofence",
        {
          description:
            err?.response?.data?.message || err?.message || "Server error",
        }
      );
    } finally {
      setIsSavingFence(false);
    }
  };

  // Handle soft-delete of geofence using DELETE /api/geofences/:id
  const handleConfirmDeleteGeofence = async () => {
    if (!fenceToDelete) return;
    setIsDeletingFence(true);
    try {
      await bleService.deleteBleGeofence(fenceToDelete._id);
      toast.success("Geofence deleted successfully", {
        description: `"${fenceToDelete.name}" has been soft-deleted.`,
      });

      const deletedId = fenceToDelete._id;
      setFences((prev) => prev.filter((f) => f._id !== deletedId));
      if (selectedFenceId === deletedId) {
        setSelectedFenceId(null);
      }

      const deletedFence = fenceToDelete;
      setFenceToDelete(null);

      // Notify parent page to sync table / devices if needed
      onGeofenceDeleted?.(deletedFence);

      // Refresh geofences from server
      await fetchGeofences();
    } catch (err: any) {
      console.error("Failed to delete geofence:", err);
      toast.error("Failed to delete geofence", {
        description:
          err?.response?.data?.message || err?.message || "Server error while deleting fence.",
      });
    } finally {
      setIsDeletingFence(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        showCloseButton={false}
        className="max-w-6xl w-[96vw] h-[88vh] max-h-[88vh] p-0 overflow-hidden flex flex-col rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
      >
        <DialogHeader className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 flex flex-row items-center justify-between space-y-0 flex-shrink-0">
          <div>
            <DialogTitle className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span>Geofences for {childName}</span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                {fences.length} {fences.length === 1 ? "Fence" : "Fences"}
              </span>
            </DialogTitle>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 flex-wrap">
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {deviceName}
              </span>
              {sn && (
                <span className="text-slate-400 font-mono">
                  (SN: {sn})
                </span>
              )}
              <span>•</span>
              <span>{schoolName}</span>
              <span>•</span>
              <span>{branchName}</span>
              <span className="flex items-center gap-1 text-slate-600 font-medium">
                <Battery className="w-3.5 h-3.5 text-emerald-600" />
                {batteryLevel}%
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fetchGeofences}
              disabled={isLoading}
              className="gap-1.5 h-8 text-xs cursor-pointer"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
              />
              <span>Refresh</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={isAddingFence ? handleCancelAdd : handleStartAddFence}
              className={`gap-1.5 h-8 text-xs font-medium shadow-xs cursor-pointer ${
                isAddingFence
                  ? "bg-slate-200 hover:bg-slate-300 text-slate-800"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }`}
            >
              {isAddingFence ? (
                <>
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Geofence</span>
                </>
              )}
            </Button>

            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        {/* Modal Main Content: Split Map & List View with CSS Grid */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden relative min-h-0 w-full h-full">
          {/* Map Section (7 cols on md, 8 cols on lg) */}
          <div className="md:col-span-7 lg:col-span-8 h-[360px] md:h-full relative bg-slate-100 dark:bg-slate-950 overflow-hidden min-h-0">
            <div
              ref={mapContainerRef}
              className="w-full h-full"
              style={{ width: "100%", height: "100%", minHeight: "350px" }}
            />

            {/* Floating Map Actions - Horizontal toolbar with zero overlap */}
            <div className="absolute top-3 left-3 z-[400] flex items-center gap-1 bg-white/95 dark:bg-slate-900/95 p-1 rounded-lg shadow-md border border-slate-200 dark:border-slate-800 backdrop-blur-xs">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                title="Fit all geofences"
                onClick={handleFitAllFences}
                className="h-7 px-2.5 text-xs gap-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer font-medium"
              >
                <Crosshair className="w-3.5 h-3.5 text-emerald-600" />
                <span>Fit Fences</span>
              </Button>
              {hasValidDeviceCoords && (
                <>
                  <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    title="Center on current device position"
                    onClick={handleCenterOnDevice}
                    className="h-7 px-2.5 text-xs gap-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer font-medium"
                  >
                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                    <span>Device Pin</span>
                  </Button>
                </>
              )}
            </div>

            {/* Floating Banner when Adding or Editing Geofence */}
            {isAddingFence && (
              <div
                className={`absolute top-14 left-3 right-3 sm:right-auto z-[400] flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg shadow-lg text-xs backdrop-blur-xs border ${
                  editingFence
                    ? "bg-amber-900/95 text-white border-amber-700/60"
                    : "bg-emerald-900/95 text-white border-emerald-700/60"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full animate-pulse ${
                      editingFence ? "bg-amber-400" : "bg-emerald-400"
                    }`}
                  />
                  <span className="font-medium text-[11px] sm:text-xs">
                    {editingFence
                      ? `Reposition center or change radius for "${editingFence.name}"`
                      : "Click map or drag 📍 pin to set center point"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCancelAdd}
                  className="text-white/80 hover:text-white p-0.5 rounded cursor-pointer"
                  title="Cancel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Map Legend Overlay */}
            <div className="absolute bottom-3 left-3 z-[400] bg-white/95 dark:bg-slate-900/95 px-3 py-2 rounded-lg shadow-md border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-3 backdrop-blur-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-500 border border-amber-600 animate-pulse"></span>
                <span>Active / Selected</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500 border border-emerald-600"></span>
                <span>Child Geofences</span>
              </div>
              {hasValidDeviceCoords && (
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-blue-600"></span>
                  <span>GeoTag Position</span>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Section: Geofences List OR Inline Creation Form (5 cols on md, 4 cols on lg) */}
          <div className="md:col-span-5 lg:col-span-4 h-full border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/70 dark:bg-slate-900/60 overflow-hidden min-h-0">
            {isAddingFence ? (
              /* Inline Geofence Creation Form */
              <div className="flex flex-col h-full bg-white dark:bg-slate-900 overflow-hidden">
                {/* Form Header */}
                <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelAdd}
                      className="h-7 px-2 text-xs gap-1 text-slate-600 hover:text-slate-900 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back</span>
                    </Button>
                    <h3 className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                      {editingFence ? "Edit Geofence" : "Create New Geofence"}
                    </h3>
                  </div>
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                      editingFence
                        ? "text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800"
                        : "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800"
                    }`}
                  >
                    {editingFence ? "Editing Geofence" : "Direct on Map"}
                  </span>
                </div>

                {/* Form Scrollable Fields */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                  {/* Geofence Name */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300 text-[11px] flex items-center justify-between">
                      <span>Geofence Name</span>
                      <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <Input
                      type="text"
                      value={newFenceName}
                      onChange={(e) => setNewFenceName(e.target.value)}
                      placeholder="e.g. Home Perimeter, Tuition, Bus Stop"
                      className="h-8 text-xs bg-slate-50 dark:bg-slate-800 focus-visible:ring-emerald-500"
                    />
                  </div>

                  {/* Radius Setting */}
                  <div className="space-y-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                        Radius:
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                          {newRadius} meters
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 pt-1">
                      {[100, 200, 250, 500, 1000].map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setNewRadius(r)}
                          className={`flex-1 py-1 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                            newRadius === r
                              ? "bg-emerald-600 text-white shadow-xs font-semibold"
                              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {r}m
                        </button>
                      ))}
                    </div>

                    <input
                      type="range"
                      min={50}
                      max={2000}
                      step={25}
                      value={newRadius}
                      onChange={(e) => setNewRadius(Number(e.target.value))}
                      className="w-full accent-emerald-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
                    />
                  </div>

                  {/* Center Position & Snap Button */}
                  <div className="space-y-1.5 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                        Center Coordinates
                      </span>
                      {hasValidDeviceCoords && (
                        <button
                          type="button"
                          onClick={() => {
                            setNewCenter({ lat: deviceLat, lng: deviceLng });
                            if (mapRef.current) {
                              mapRef.current.setView([deviceLat, deviceLng], 16, { animate: true });
                            }
                            reverseGeocodeMapTiler(deviceLat, deviceLng)
                              .then((addr) => {
                                if (addr) setNewAddress(addr);
                              })
                              .catch(() => {});
                          }}
                          className="text-[10px] text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <MapPin className="w-3 h-3" />
                          <span>Snap to GeoTag Pin</span>
                        </button>
                      )}
                    </div>

                    {newCenter ? (
                      <div className="font-mono text-[11px] text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-1.5 rounded border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <span>Lat: {newCenter.lat.toFixed(6)}</span>
                        <span>Lng: {newCenter.lng.toFixed(6)}</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">
                        Click on the map to set center
                      </span>
                    )}
                    <p className="text-[10px] text-slate-400">
                      💡 Click anywhere on the map or drag the 📍 pin to set coordinates.
                    </p>
                  </div>

                  {/* Location Address */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                      Address / Landmark
                    </label>
                    <Input
                      type="text"
                      value={newAddress}
                      onChange={(e) => setNewAddress(e.target.value)}
                      placeholder="Auto-detected address or enter location details..."
                      className="h-8 text-xs bg-slate-50 dark:bg-slate-800 focus-visible:ring-emerald-500"
                    />
                  </div>

                  {/* Alert Trigger Rules */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                      Alert Rules
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { value: "both", label: "Enter & Exit" },
                        { value: "enter", label: "Enter Only" },
                        { value: "exit", label: "Exit Only" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setNewAlarmRules(opt.value as any)}
                          className={`py-1.5 px-2 rounded-lg border text-center text-xs transition-colors cursor-pointer ${
                            newAlarmRules === opt.value
                              ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 font-semibold"
                              : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tolerance & Cooldown */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                        Tolerance (meters)
                      </label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={newBoundaryToleranceMeter}
                        onChange={(e) => setNewBoundaryToleranceMeter(Number(e.target.value) || 0)}
                        className="h-8 text-xs bg-slate-50 dark:bg-slate-800 focus-visible:ring-emerald-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                        Cooldown (minutes)
                      </label>
                      <Input
                        type="number"
                        min={0}
                        max={60}
                        value={newCooldownMinutes}
                        onChange={(e) => setNewCooldownMinutes(Number(e.target.value) || 0)}
                        className="h-8 text-xs bg-slate-50 dark:bg-slate-800 focus-visible:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Notes / Remark */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                      Remarks / Notes (Optional)
                    </label>
                    <Input
                      type="text"
                      value={newRemark}
                      onChange={(e) => setNewRemark(e.target.value)}
                      placeholder="e.g. Near school main gate"
                      className="h-8 text-xs bg-slate-50 dark:bg-slate-800 focus-visible:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Form Footer Actions */}
                <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCancelAdd}
                    disabled={isSavingFence}
                    className="h-8 text-xs cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveNewGeofence}
                    disabled={isSavingFence}
                    className={`h-8 text-xs font-medium gap-1.5 cursor-pointer shadow-xs text-white ${
                      editingFence
                        ? "bg-amber-500 hover:bg-amber-600"
                        : "bg-emerald-600 hover:bg-emerald-700"
                    }`}
                  >
                    {isSavingFence ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>{editingFence ? "Updating..." : "Saving..."}</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>{editingFence ? "Update Geofence" : "Save Geofence"}</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              /* Normal Geofences List View */
              <>
                {/* Search & Filter Header */}
                <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search geofences..."
                      className="pl-8 h-8 text-xs bg-slate-50 dark:bg-slate-800"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setStatusFilter("all")}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                          statusFilter === "all"
                            ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        All ({fences.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatusFilter("active")}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                          statusFilter === "active"
                            ? "bg-emerald-600 text-white"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        Active
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatusFilter("inactive")}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                          statusFilter === "inactive"
                            ? "bg-slate-600 text-white"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        Inactive
                      </button>
                    </div>

                    <span className="text-[11px] text-slate-400">
                      Showing {filteredFences.length} of {fences.length}
                    </span>
                  </div>
                </div>

                {/* Scrollable Fences List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                      <span className="text-xs">Fetching child geofences...</span>
                    </div>
                  ) : filteredFences.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-6 text-center border border-dashed border-slate-300 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 mt-4">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-2">
                        <Shield className="w-5 h-5" />
                      </div>
                      <h4 className="font-semibold text-sm text-slate-700 dark:text-slate-200">
                        No Geofences Found
                      </h4>
                      <p className="text-xs text-slate-400 max-w-[240px] mt-1 mb-4">
                        {searchQuery
                          ? "No geofences match your search filter."
                          : "No geofences are currently bound to this child or tag."}
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleStartAddFence}
                        className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create New Geofence</span>
                      </Button>
                    </div>
                  ) : (
                    filteredFences.map((fence) => {
                      const isSelected = fence._id === activeFence?._id;
                      const lat = Number(fence.center?.lat);
                      const lng = Number(fence.center?.lng);
                      const radius = Number(fence.radius) || 200;
                      const isActive = (fence.status || "active").toLowerCase() === "active";

                      return (
                        <div
                          key={fence._id}
                          onClick={() => handleSelectFence(fence)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer relative bg-white dark:bg-slate-900 ${
                            isSelected
                              ? "border-amber-400 shadow-md ring-1 ring-amber-400/50 bg-amber-50/20"
                              : "border-slate-200 dark:border-slate-800 hover:border-slate-300 hover:shadow-xs"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    isActive ? "bg-emerald-500" : "bg-slate-400"
                                  }`}
                                />
                                <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">
                                  {fence.name || "Perimeter"}
                                </h4>
                              </div>

                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  {radius}m Radius
                                </span>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                  {fence.fenceType || "Circle"}
                                </span>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
                                  Alerts: {fence.alarmRules || "both"}
                                </span>
                              </div>

                              <div className="text-[11px] text-slate-500 mt-2 space-y-0.5">
                                {!isNaN(lat) && !isNaN(lng) && (
                                  <div className="font-mono text-[10px] text-slate-400 flex items-center gap-1">
                                    <MapPin className="w-3 h-3 text-slate-400" />
                                    <span>
                                      {lat.toFixed(5)}, {lng.toFixed(5)}
                                    </span>
                                  </div>
                                )}
                                {fence.remark && (
                                  <p className="text-[11px] text-slate-500 line-clamp-1 italic">
                                    &quot;{fence.remark}&quot;
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col gap-1.5 flex-shrink-0">
                              <Button
                                type="button"
                                size="sm"
                                title="Edit this geofence directly on map"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartEditFence(fence);
                                }}
                                className="h-7 px-2.5 text-xs bg-amber-500 hover:bg-amber-600 text-white font-medium shadow-xs gap-1 cursor-pointer"
                              >
                                <Pencil className="w-3 h-3" />
                                <span>Edit</span>
                              </Button>

                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                title="Delete this geofence"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFenceToDelete(fence);
                                }}
                                className="h-7 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 dark:border-rose-900/60 dark:hover:bg-rose-950/40 gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Delete</span>
                              </Button>

                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                title="Locate on map"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectFence(fence);
                                }}
                                className="h-6 px-1.5 text-[10px] text-slate-500 hover:text-slate-800 cursor-pointer"
                              >
                                <Crosshair className="w-3 h-3 text-slate-400" />
                                <span>Locate</span>
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Bottom Info Footer */}
                <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-xs text-slate-500">
                  <span className="text-[11px]">
                    Click on any geofence to focus or edit
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleStartAddFence}
                    className="gap-1 h-7 text-xs cursor-pointer font-medium"
                  >
                    <Plus className="w-3 h-3 text-emerald-600" />
                    <span>New Fence</span>
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Delete Geofence Confirmation Dialog */}
        <AlertDialog
          open={Boolean(fenceToDelete)}
          onOpenChange={(open) => {
            if (!open && !isDeletingFence) setFenceToDelete(null);
          }}
        >
          <AlertDialogContent className="sm:max-w-md">
            <AlertDialogHeader>
              <div className="flex items-center gap-2 text-rose-600 mb-1">
                <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center">
                  <Trash2 className="w-4 h-4 text-rose-600" />
                </div>
                <AlertDialogTitle className="text-base">
                  Delete Geofence
                </AlertDialogTitle>
              </div>
              <AlertDialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  &quot;{fenceToDelete?.name}&quot;
                </span>
                ? This will soft-delete the fence and remove it from alert monitoring for this device.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 sm:gap-0">
              <AlertDialogCancel
                disabled={isDeletingFence}
                className="h-8 text-xs cursor-pointer"
              >
                Cancel
              </AlertDialogCancel>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={isDeletingFence}
                onClick={handleConfirmDeleteGeofence}
                className="h-8 text-xs bg-rose-600 hover:bg-rose-700 text-white gap-1.5 cursor-pointer font-medium"
              >
                {isDeletingFence ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Fence</span>
                  </>
                )}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
