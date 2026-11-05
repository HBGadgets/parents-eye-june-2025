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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { bleService } from "@/services/api/bleService";
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
  onAddNewGeofence: (device: any) => void;
}

export default function ChildGeofencesViewer({
  isOpen,
  onClose,
  device,
  onEditGeofence,
  onAddNewGeofence,
}: ChildGeofencesViewerProps) {
  const [fences, setFences] = useState<BleGeofenceItem[]>([]);
  const [selectedFenceId, setSelectedFenceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersGroupRef = useRef<L.LayerGroup | null>(null);
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
        !searchQuery.trim() ||
        f.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.childName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.remark?.toLowerCase().includes(searchQuery.toLowerCase());

      const status = (f.status || "active").toLowerCase();
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && status === "active") ||
        (statusFilter === "inactive" && status !== "active");

      return matchesSearch && matchesStatus;
    });
  }, [fences, searchQuery, statusFilter]);

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
      mapRef.current = mapInstance;

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
              onClick={() => onAddNewGeofence(device)}
              className="gap-1.5 h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Geofence</span>
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

          {/* Sidebar Section: Geofences List (5 cols on md, 4 cols on lg) */}
          <div className="md:col-span-5 lg:col-span-4 h-full border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/70 dark:bg-slate-900/60 overflow-hidden min-h-0">
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
                    <X className="w-3 h-3" />
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
                    onClick={() => onAddNewGeofence(device)}
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

                        {/* Edit Button */}
                        <div className="flex flex-col gap-1.5 flex-shrink-0">
                          <Button
                            type="button"
                            size="sm"
                            title="Edit this geofence"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditGeofence(fence, device);
                            }}
                            className="h-7 px-2.5 text-xs bg-amber-500 hover:bg-amber-600 text-white font-medium shadow-xs gap-1 cursor-pointer"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Edit</span>
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
                onClick={() => onAddNewGeofence(device)}
                className="gap-1 h-7 text-xs cursor-pointer font-medium"
              >
                <Plus className="w-3 h-3 text-emerald-600" />
                <span>New Fence</span>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
