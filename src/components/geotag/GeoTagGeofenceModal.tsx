"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox, ComboboxItem } from "@/components/ui/combobox";
import {
  X,
  MapPin,
  Search,
  RotateCcw,
  Shield,
  Loader2,
  Bell,
  Crosshair,
  Layers,
  Save,
} from "lucide-react";
import { bleService } from "@/services/api/bleService";
import { studentService } from "@/services/api/studentService";
import { geofenceService } from "@/services/api/geofenceSerevice";
import { toast } from "sonner";

// Fix default Leaflet icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface GeoTagGeofenceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device: any | null;
  onSuccess?: () => void;
}

export default function GeoTagGeofenceModal({
  open,
  onOpenChange,
  device,
  onSuccess,
}: GeoTagGeofenceModalProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const circleLayer = useRef<L.Circle | null>(null);
  const centerMarker = useRef<L.Marker | null>(null);
  const deviceMarker = useRef<L.Marker | null>(null);

  // Tab mode: "create" new geofence or "existing"
  const [tabMode, setTabMode] = useState<"create" | "existing">("create");

  // Coordinates
  const rawDevice = device?.rawBleDevice || device;
  const initialLat =
    Number(rawDevice?.lastLocation?.lat) ||
    Number(device?.latitude) ||
    Number(device?.lat) ||
    21.1286332;
  const initialLng =
    Number(rawDevice?.lastLocation?.lng) ||
    Number(device?.longitude) ||
    Number(device?.lng) ||
    79.1037043;

  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: initialLat,
    lng: initialLng,
  });
  const [address, setAddress] = useState<string>("");
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);

  // Form states per documentation
  const [fenceName, setFenceName] = useState<string>("");
  const [radius, setRadius] = useState<number>(250);
  const [alarmRules, setAlarmRules] = useState<"both" | "enter" | "exit">("both");
  const [boundaryToleranceMeter, setBoundaryToleranceMeter] = useState<number>(5);
  const [cooldownMinutes, setCooldownMinutes] = useState<number>(2);
  const [remark, setRemark] = useState<string>("");

  // Existing geofences
  const [existingGeofences, setExistingGeofences] = useState<any[]>([]);
  const [selectedExistingId, setSelectedExistingId] = useState<string>("none");
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);

  // Search places
  const [locationSearchQuery, setLocationSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form data when opened
  useEffect(() => {
    if (!open || !device) return;

    const raw = device?.rawBleDevice || device;
    const dLat =
      Number(raw?.lastLocation?.lat) ||
      Number(device?.latitude) ||
      Number(device?.lat) ||
      21.1286332;
    const dLng =
      Number(raw?.lastLocation?.lng) ||
      Number(device?.longitude) ||
      Number(device?.lng) ||
      79.1037043;

    setCoords({ lat: dLat, lng: dLng });

    const chName =
      typeof raw?.childId === "object"
        ? raw?.childId?.childName
        : device?.childName;
    const devName = raw?.name || device?.name || raw?.sn || "GeoTag";
    const defaultName = chName ? `${chName}'s Perimeter` : `${devName} Perimeter`;
    setFenceName(defaultName);
    setRadius(250);
    setAlarmRules("both");
    setBoundaryToleranceMeter(5);
    setCooldownMinutes(2);
    setRemark(chName ? `Perimeter for ${chName}` : "School boundary");
    setTabMode("create");

    reverseGeocode(dLat, dLng);
    fetchExistingGeofences(raw);
  }, [open, device]);

  // Reverse geocoding
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      setIsLoadingAddress(true);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await res.json();
      if (data?.display_name) {
        setAddress(data.display_name);
      } else {
        setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      }
    } catch {
      setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    } finally {
      setIsLoadingAddress(false);
    }
  };

  // Fetch existing geofences
  const fetchExistingGeofences = async (rawDev: any) => {
    try {
      setIsLoadingExisting(true);
      const sId =
        typeof rawDev?.schoolId === "object"
          ? rawDev?.schoolId?._id
          : rawDev?.schoolId;
      const bId =
        typeof rawDev?.branchId === "object"
          ? rawDev?.branchId?._id
          : rawDev?.branchId;

      const params: any = { page: 1, limit: 100 };
      if (sId && sId !== "none") params.schoolId = sId;
      if (bId && bId !== "none") params.branchId = bId;

      const res = await geofenceService.getGeofence(params);
      let list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      if (list.length === 0 && (params.schoolId || params.branchId)) {
        const fallback = await geofenceService.getGeofence({ page: 1, limit: 100 });
        list = Array.isArray(fallback?.data) ? fallback.data : [];
      }
      setExistingGeofences(list);

      const currentGf = rawDev?.geofenceId || rawDev?.geofence;
      const currentGfId =
        typeof currentGf === "object" ? currentGf?._id : currentGf;
      if (currentGfId) {
        setSelectedExistingId(currentGfId);
      } else {
        setSelectedExistingId("none");
      }
    } catch (e) {
      console.warn("Failed to load existing geofences:", e);
      setExistingGeofences([]);
    } finally {
      setIsLoadingExisting(false);
    }
  };

  // Search places using Nominatim
  const handleSearchLocation = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&limit=5`
      );
      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
      setShowSearchResults(true);
    } catch {
      setSearchResults([]);
    }
  };

  const handleSelectSearchResult = (result: any) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    if (!isNaN(lat) && !isNaN(lng)) {
      setCoords({ lat, lng });
      setAddress(result.display_name || "");
      setShowSearchResults(false);
      setLocationSearchQuery(result.display_name || "");
      if (map.current) {
        map.current.setView([lat, lng], 16);
      }
    }
  };

  // Initialize Map
  useEffect(() => {
    if (!open || !mapContainer.current) return;

    let isSubscribed = true;

    const timer = setTimeout(() => {
      if (!isSubscribed || !mapContainer.current) return;

      if (!map.current) {
        const leafletMap = L.map(mapContainer.current, {
          center: [coords.lat, coords.lng],
          zoom: 15,
          zoomControl: false,
        });

        // Google Maps Standard Layer
        L.tileLayer("https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
          subdomains: ["mt0", "mt1", "mt2", "mt3"],
          maxZoom: 20,
        }).addTo(leafletMap);

        // Add Zoom Control at bottom left
        L.control.zoom({ position: "bottomleft" }).addTo(leafletMap);

        // Map Click updates geofence center
        leafletMap.on("click", (e: L.LeafletMouseEvent) => {
          const { lat, lng } = e.latlng;
          setCoords({ lat, lng });
          reverseGeocode(lat, lng);
        });

        map.current = leafletMap;
      }

      if (map.current) {
        map.current.invalidateSize();
      }
    }, 200);

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
    };
  }, [open]);

  // Clean up Map on close
  useEffect(() => {
    if (!open && map.current) {
      map.current.remove();
      map.current = null;
      circleLayer.current = null;
      centerMarker.current = null;
      deviceMarker.current = null;
    }
  }, [open]);

  // Update Geofence Circle and Marker
  useEffect(() => {
    if (!map.current) return;

    const currentMap = map.current;

    // Center Pin (Amber / Green boundary center)
    const centerIcon = L.divIcon({
      className: "custom-geofence-center-pin",
      html: `
        <div style="
          width: 32px;
          height: 32px;
          background: #2563eb;
          border: 3px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          cursor: grab;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    if (!centerMarker.current) {
      centerMarker.current = L.marker([coords.lat, coords.lng], {
        icon: centerIcon,
        draggable: true,
      }).addTo(currentMap);

      centerMarker.current.on("dragend", (e: any) => {
        const marker = e.target;
        const position = marker.getLatLng();
        setCoords({ lat: position.lat, lng: position.lng });
        reverseGeocode(position.lat, position.lng);
      });
    } else {
      centerMarker.current.setLatLng([coords.lat, coords.lng]);
    }

    // Geofence Circle
    if (!circleLayer.current) {
      circleLayer.current = L.circle([coords.lat, coords.lng], {
        radius,
        color: "#2563eb",
        weight: 2,
        fillColor: "#3b82f6",
        fillOpacity: 0.16,
      }).addTo(currentMap);
    } else {
      circleLayer.current.setLatLng([coords.lat, coords.lng]);
      circleLayer.current.setRadius(radius);
    }

    // Device's current location pin
    const raw = device?.rawBleDevice || device;
    const dLat = Number(raw?.lastLocation?.lat) || Number(device?.latitude);
    const dLng = Number(raw?.lastLocation?.lng) || Number(device?.longitude);

    if (dLat && dLng && !isNaN(dLat) && !isNaN(dLng)) {
      const devIcon = L.divIcon({
        className: "custom-device-location-pin",
        html: `
          <div style="
            background: #059669;
            color: white;
            padding: 3px 8px;
            border-radius: 9999px;
            font-size: 11px;
            font-weight: 600;
            border: 2px solid white;
            box-shadow: 0 3px 8px rgba(0,0,0,0.25);
            display: flex;
            align-items: center;
            gap: 4px;
            white-space: nowrap;
          ">
            <span>Device</span>
          </div>
        `,
        iconSize: [64, 24],
        iconAnchor: [32, 12],
      });

      if (!deviceMarker.current) {
        deviceMarker.current = L.marker([dLat, dLng], { icon: devIcon })
          .addTo(currentMap)
          .bindPopup(`<b>${raw?.name || "GeoTag"}</b><br/>Current GPS location`);
      } else {
        deviceMarker.current.setLatLng([dLat, dLng]);
      }
    }
  }, [coords.lat, coords.lng, radius, device]);

  // Center Map on Device
  const handleCenterOnDevice = () => {
    const raw = device?.rawBleDevice || device;
    const dLat = Number(raw?.lastLocation?.lat) || Number(device?.latitude);
    const dLng = Number(raw?.lastLocation?.lng) || Number(device?.longitude);
    if (dLat && dLng && !isNaN(dLat) && !isNaN(dLng)) {
      setCoords({ lat: dLat, lng: dLng });
      reverseGeocode(dLat, dLng);
      if (map.current) {
        map.current.setView([dLat, dLng], 16);
      }
    } else {
      toast.info("No GPS coordinates reported for this device yet");
    }
  };

  // Submit via POST /api/geofences
  const handleCreateAndAssignGeofence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!device) return;

    if (!fenceName.trim()) {
      toast.error("Please enter a geofence name");
      return;
    }

    if (!radius || radius <= 0) {
      toast.error("Radius must be greater than 0");
      return;
    }

    const raw = device?.rawBleDevice || device;
    const deviceTargetId = raw?._id || raw?.deviceId || device?._id || device?.deviceId;
    const devNumericOrStrId = raw?.deviceId ?? raw?._id;

    const schoolId =
      typeof raw?.schoolId === "object"
        ? raw?.schoolId?._id
        : raw?.schoolId && raw?.schoolId !== "none"
        ? raw?.schoolId
        : null;

    const branchId =
      typeof raw?.branchId === "object"
        ? raw?.branchId?._id
        : raw?.branchId && raw?.branchId !== "none"
        ? raw?.branchId
        : null;

    const childId =
      typeof raw?.childId === "object"
        ? raw?.childId?._id
        : raw?.childId && raw?.childId !== "none"
        ? raw?.childId
        : null;

    setIsSubmitting(true);
    try {
      const payload: any = {
        name: fenceName.trim(),
        fenceType: "circle",
        center: {
          lat: Number(coords.lat.toFixed(7)),
          lng: Number(coords.lng.toFixed(7)),
        },
        radius: Number(radius),
        alarmRules,
        schoolId,
        branchId,
        childId,
        deviceIds: devNumericOrStrId != null ? [devNumericOrStrId] : [],
        boundaryToleranceMeter: Number(boundaryToleranceMeter) || 5,
        cooldownMinutes: Number(cooldownMinutes) || 2,
        remark: remark.trim() || undefined,
      };

      console.log("[GeoTagGeofenceModal] Calling POST /api/geofences:", payload);
      const res = await bleService.createBleGeofence(payload);
      const createdGeofenceId =
        res?.geofence?._id || res?.data?._id || res?._id || res?.data?.geofence?._id;

      if (deviceTargetId) {
        try {
          await bleService.updateBleDeviceAssignment(deviceTargetId, {
            geofenceId: createdGeofenceId || null,
            geofence: createdGeofenceId || null,
          });
        } catch (assignErr) {
          console.warn("Could not assign geofence to BLE device directly:", assignErr);
        }
      }

      if (childId && createdGeofenceId) {
        try {
          await studentService.updateStudent(childId, {
            pickupGeoId: createdGeofenceId,
            dropGeoId: createdGeofenceId,
          });
        } catch (studentErr) {
          console.warn("Could not sync student geofence:", studentErr);
        }
      }

      toast.success("Geofence created and assigned successfully!");
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      console.error("Failed to create geofence:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to create and assign geofence"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit via existing geofence assignment
  const handleAssignExistingGeofence = async () => {
    if (!device) return;
    const raw = device?.rawBleDevice || device;
    const targetId = raw?._id || raw?.deviceId || device?._id;

    if (!targetId) {
      toast.error("Device ID not found");
      return;
    }

    setIsSubmitting(true);
    try {
      const gfVal =
        selectedExistingId && selectedExistingId !== "none"
          ? selectedExistingId
          : null;

      await bleService.updateBleDeviceAssignment(targetId, {
        geofenceId: gfVal,
        geofence: gfVal,
      });

      const childId =
        typeof raw?.childId === "object"
          ? raw?.childId?._id
          : typeof raw?.childId === "string"
          ? raw?.childId
          : null;

      if (childId) {
        try {
          await studentService.updateStudent(childId, {
            pickupGeoId: gfVal,
            dropGeoId: gfVal,
          });
        } catch {
          // ignore
        }
      }

      toast.success(
        gfVal
          ? "Geofence assigned successfully!"
          : "Geofence unassigned successfully!"
      );
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      console.error("Failed to assign existing geofence:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to assign geofence"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const existingOptions: ComboboxItem[] = useMemo(() => {
    const opts: ComboboxItem[] = [{ label: "None (Unassigned)", value: "none" }];
    existingGeofences.forEach((g: any) => {
      opts.push({
        label: `${g.geofenceName || g.name || "Geofence"}${
          g.address ? ` - ${g.address.slice(0, 30)}...` : ""
        }`,
        value: g._id,
      });
    });
    return opts;
  }, [existingGeofences]);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-screen h-screen max-w-none max-h-none p-0 rounded-none !m-0 !left-0 !top-0 !transform-none !translate-x-0 !translate-y-0 bg-white border-none shadow-none z-50 overflow-hidden">
        <VisuallyHidden>
          <DialogTitle>Assign Geofence Map</DialogTitle>
        </VisuallyHidden>

        {/* Full Screen Layout exactly like /dashboard/school/geofence */}
        <div className="relative w-full h-full">
          {/* Edge-to-edge Map Container */}
          <div
            ref={mapContainer}
            className="w-full h-full absolute inset-0 z-0 bg-slate-100"
          />

          {/* Floating Close Button at Top Right */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 z-[1001] bg-white hover:bg-gray-100 text-gray-700 rounded-full shadow-md border border-gray-200 cursor-pointer h-9 w-9"
            title="Close"
          >
            <X className="h-5 w-5" />
          </Button>

          {/* Floating Map Controls at Top Left */}
          <div className="absolute top-4 left-4 z-[1000] flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCenterOnDevice}
              className="bg-white hover:bg-gray-50 text-gray-800 text-xs shadow-md border border-gray-200 h-9 gap-1.5 cursor-pointer font-medium"
              title="Center map on device"
            >
              <Crosshair className="w-4 h-4 text-blue-600" />
              <span>Center Device</span>
            </Button>
          </div>

          {/* Floating Configuration Card at Top Right (matches GeofenceConfigurationPanel) */}
          <div className="absolute top-14 right-4 w-[420px] max-w-[90vw] z-[1000] max-h-[calc(100vh-80px)] overflow-y-auto">
            <Card className="bg-white border border-gray-200 shadow-2xl rounded-xl">
              <CardContent className="p-5 space-y-4">
                {/* Header Title & Device badge */}
                <div className="border-b border-gray-100 pb-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-blue-600" />
                      Assign Geofence
                    </h2>
                    {rawDevice?.sn && (
                      <span className="text-xs font-mono font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded border border-gray-200">
                        {rawDevice.sn}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Click anywhere on the map or drag the pin to set the perimeter center.
                  </p>
                </div>

                {/* Target Information Pills */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs space-y-1">
                  <div className="flex justify-between items-center text-gray-700">
                    <span className="text-gray-500 font-medium">Tag / Device:</span>
                    <span className="font-semibold text-gray-900 truncate max-w-[200px]">
                      {rawDevice?.name || device?.name || rawDevice?.sn || "GeoTag"}
                    </span>
                  </div>
                  {(rawDevice?.childId || device?.childName) && (
                    <div className="flex justify-between items-center text-gray-700">
                      <span className="text-gray-500 font-medium">Child:</span>
                      <span className="font-semibold text-blue-600">
                        {typeof rawDevice?.childId === "object"
                          ? rawDevice?.childId?.childName
                          : device?.childName}
                      </span>
                    </div>
                  )}
                  {(rawDevice?.schoolId || device?.schoolName) && (
                    <div className="flex justify-between items-center text-gray-700">
                      <span className="text-gray-500 font-medium">School:</span>
                      <span className="truncate max-w-[200px]">
                        {typeof rawDevice?.schoolId === "object"
                          ? rawDevice?.schoolId?.schoolName
                          : device?.schoolName}
                      </span>
                    </div>
                  )}
                  {(rawDevice?.branchId || device?.branchName) && (
                    <div className="flex justify-between items-center text-gray-700">
                      <span className="text-gray-500 font-medium">Branch:</span>
                      <span className="truncate max-w-[200px]">
                        {typeof rawDevice?.branchId === "object"
                          ? rawDevice?.branchId?.branchName
                          : device?.branchName}
                      </span>
                    </div>
                  )}
                </div>

                {/* Mode Selector Tabs */}
                <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setTabMode("create")}
                    className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      tabMode === "create"
                        ? "bg-white text-blue-700 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Create Geofence</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTabMode("existing")}
                    className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      tabMode === "existing"
                        ? "bg-white text-blue-700 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Select Existing</span>
                  </button>
                </div>

                {/* TAB 1: CREATE GEOFENCE */}
                {tabMode === "create" && (
                  <form onSubmit={handleCreateAndAssignGeofence} className="space-y-3.5">
                    {/* Location Search Input */}
                    <div className="space-y-1.5 relative">
                      <Label className="text-xs font-semibold text-gray-700">
                        Search Location
                      </Label>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                          type="text"
                          placeholder="Search for a location..."
                          value={locationSearchQuery}
                          onChange={(e) => {
                            setLocationSearchQuery(e.target.value);
                            handleSearchLocation(e.target.value);
                          }}
                          className="pl-8 text-sm h-9 bg-white border-gray-300"
                        />
                      </div>
                      {showSearchResults && searchResults.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-56 overflow-y-auto">
                          {searchResults.map((result: any, index: number) => (
                            <div
                              key={index}
                              onClick={() => handleSelectSearchResult(result)}
                              className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-xs text-gray-800 border-b border-gray-100 last:border-none"
                            >
                              {result.display_name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Geofence Name */}
                    <div className="space-y-1.5">
                      <Label htmlFor="fenceName" className="text-xs font-semibold text-gray-700">
                        Geofence Name
                      </Label>
                      <Input
                        id="fenceName"
                        type="text"
                        placeholder="Enter geofence name"
                        value={fenceName}
                        onChange={(e) => setFenceName(e.target.value)}
                        className="text-sm h-9 bg-white border-gray-300"
                        required
                      />
                    </div>

                    {/* Radius Slider & Presets */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="fenceRadius" className="text-xs font-semibold text-gray-700">
                          Radius (meters)
                        </Label>
                        <span className="text-xs font-semibold text-blue-600">
                          {radius} meters
                        </span>
                      </div>
                      <Input
                        id="fenceRadius"
                        type="number"
                        min={20}
                        max={3000}
                        value={radius}
                        onChange={(e) => setRadius(parseInt(e.target.value) || 100)}
                        className="text-sm h-9 bg-white border-gray-300"
                      />
                      <div className="flex items-center gap-1.5 pt-1">
                        {[50, 100, 150, 250, 500].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setRadius(preset)}
                            className={`flex-1 py-1 rounded text-xs border transition-colors cursor-pointer ${
                              radius === preset
                                ? "bg-blue-50 border-blue-500 text-blue-700 font-bold"
                                : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                            }`}
                          >
                            {preset}m
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Alarm Rules */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                        <Bell className="w-3.5 h-3.5 text-gray-500" />
                        <span>Alarm Rules</span>
                      </Label>
                      <Select
                        value={alarmRules}
                        onValueChange={(val: "both" | "enter" | "exit") => setAlarmRules(val)}
                      >
                        <SelectTrigger className="h-9 text-sm bg-white border-gray-300">
                          <SelectValue placeholder="Select alarm trigger" />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          <SelectItem value="both">Both (Entry & Exit Alerts)</SelectItem>
                          <SelectItem value="enter">Entry Alert Only</SelectItem>
                          <SelectItem value="exit">Exit Alert Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Tolerance & Cooldown */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-600 font-medium">
                          Tolerance (m)
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          max={50}
                          value={boundaryToleranceMeter}
                          onChange={(e) => setBoundaryToleranceMeter(Number(e.target.value))}
                          className="h-8 text-xs bg-white border-gray-300"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-600 font-medium">
                          Cooldown (min)
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          max={60}
                          value={cooldownMinutes}
                          onChange={(e) => setCooldownMinutes(Number(e.target.value))}
                          className="h-8 text-xs bg-white border-gray-300"
                        />
                      </div>
                    </div>

                    {/* Coordinates Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-600">Latitude</Label>
                        <Input
                          type="number"
                          step="0.000001"
                          value={coords.lat}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val)) setCoords((prev) => ({ ...prev, lat: val }));
                          }}
                          className="h-8 text-xs bg-white border-gray-300"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-600">Longitude</Label>
                        <Input
                          type="number"
                          step="0.000001"
                          value={coords.lng}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val)) setCoords((prev) => ({ ...prev, lng: val }));
                          }}
                          className="h-8 text-xs bg-white border-gray-300"
                        />
                      </div>
                    </div>

                    {/* Location Address display */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-gray-600 font-semibold">
                        <MapPin className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                        <span>Location Address</span>
                      </div>
                      <p className="text-[11px] text-gray-700 line-clamp-2 leading-tight">
                        {isLoadingAddress ? "Resolving address..." : address || "Click on the map to set location"}
                      </p>
                    </div>

                    {/* Remark */}
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-600 font-medium">
                        Remark (Optional)
                      </Label>
                      <Input
                        value={remark}
                        onChange={(e) => setRemark(e.target.value)}
                        placeholder="e.g. School boundary or Tuition"
                        className="h-8 text-xs bg-white border-gray-300"
                      />
                    </div>

                    {/* Save Button */}
                    <div className="pt-2">
                      <Button
                        type="submit"
                        disabled={isSubmitting || !fenceName.trim()}
                        className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow cursor-pointer flex items-center justify-center gap-2"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Creating Geofence...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            <span>Create & Assign Geofence</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                )}

                {/* TAB 2: SELECT EXISTING GEOFENCE */}
                {tabMode === "existing" && (
                  <div className="space-y-4">
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Choose an existing geofence from your school or branch to link directly to this GeoTag device.
                    </p>

                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-gray-700">
                        Select Existing Geofence
                      </Label>
                      {isLoadingExisting ? (
                        <div className="flex items-center justify-center p-4 border border-gray-200 rounded-lg text-gray-500 text-xs gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                          <span>Loading geofences...</span>
                        </div>
                      ) : (
                        <Combobox
                          items={existingOptions}
                          value={selectedExistingId}
                          onValueChange={(val) => {
                            const newId = val || "none";
                            setSelectedExistingId(newId);
                            const match = existingGeofences.find((g: any) => g._id === newId);
                            if (match) {
                              const lat = match.area?.center?.[0] ?? match.center?.lat;
                              const lng = match.area?.center?.[1] ?? match.center?.lng;
                              if (lat && lng && map.current) {
                                setCoords({ lat, lng });
                                setRadius(match.area?.radius ?? match.radius ?? 250);
                                map.current.setView([lat, lng], 16);
                              }
                            }
                          }}
                          placeholder="Select existing geofence"
                          searchPlaceholder="Search by name..."
                          width="w-full"
                        />
                      )}
                    </div>

                    <div className="pt-4">
                      <Button
                        type="button"
                        onClick={handleAssignExistingGeofence}
                        disabled={isSubmitting || isLoadingExisting}
                        className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow cursor-pointer flex items-center justify-center gap-2"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Updating Assignment...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            <span>Save Geofence Assignment</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
