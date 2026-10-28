"use client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useMediaQuery } from "usehooks-ts";
// import SingleDeviceLiveTrack from "./single-device-livetrack";
import "./styles.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSingleDeviceData } from "@/hooks/livetrack/useLiveDeviceData";
import { bleService } from "@/services/api/bleService";
import { useReverseGeocode } from "@/hooks/useReverseGeocoding";
import { calculateDistance } from "@/util/calculate-distance";
import { FaMapMarkerAlt } from "react-icons/fa";
import SingleDeviceLiveTrack from "./single-device-livetrack";

interface Imei {
  imei?: string;
  name?: string;
}

interface UniqueId {
  uniqueId?: number | string;
}

interface RouteNo {
  routeName?: string;
}

interface SchoolId {
  schoolId?: string;
}

interface BranchId {
  branchId?: string;
}

interface LiveTrackProps {
  open?: boolean;
  setOpen?: (open: boolean) => void;
  selectedImei?:
    | (Imei & UniqueId & RouteNo & SchoolId & BranchId & { device?: any })
    | null;
}

const DISTANCE_THRESHOLD = 500; // 500 meters
const MODAL_HISTORY_KEY = "livetrack-modal-open";

export const LiveTrack = ({ open, setOpen, selectedImei }: LiveTrackProps) => {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const isBle = useMemo(() => {
    return (
      (selectedImei as any)?.device?.category === "BLE" ||
      Boolean((selectedImei as any)?.device?.rawBleDevice) ||
      (typeof selectedImei?.uniqueId === "string" &&
        (selectedImei.uniqueId.startsWith("GeoTag") ||
          selectedImei.uniqueId.includes("-")))
    );
  }, [selectedImei]);

  const [bleLiveDevice, setBleLiveDevice] = useState<any>(null);
  const [isBleFetching, setIsBleFetching] = useState(false);

  const {
    deviceData,
    isActive,
    isConnected,
    isAuthenticated,
    switchToAllDevices,
  } = useSingleDeviceData(
    open && !isBle && selectedImei?.uniqueId
      ? String(selectedImei.uniqueId)
      : undefined
  );
  const { addresses, loadingAddresses, queueForGeocoding } =
    useReverseGeocode();

  const bleIdentifier = useMemo(() => {
    if (!isBle) return null;
    return (
      (selectedImei as any)?.device?.sn ||
      selectedImei?.uniqueId ||
      (selectedImei as any)?.device?._id ||
      null
    );
  }, [isBle, selectedImei]);

  // Fetch real-time coordinates & snapshot from /api/ble-devices/live/:identifier
  const fetchLiveBleData = useCallback(async () => {
    const id =
      bleIdentifier ||
      selectedImei?.uniqueId ||
      (selectedImei as any)?.device?.sn ||
      (selectedImei as any)?.device?._id;
    if (!id) return;

    try {
      setIsBleFetching(true);
      console.log(`[LiveTrack] Triggering GeoTag live tracking API for: ${id}`);
      const res = await bleService.getLiveDevice(String(id));

      const dev =
        (res && res.device) ||
        (res && res.data && res.data.device) ||
        (res && res.data) ||
        res;

      const loc =
        dev?.lastLocation ||
        dev?.location ||
        res?.lastLocation ||
        res?.location ||
        res?.data?.lastLocation ||
        res?.data?.location;

      const prevDevice = (selectedImei as any)?.device;
      const prevRaw = prevDevice?.rawBleDevice;

      const fallbackLat = Number(
        prevDevice?.latitude ||
        prevDevice?.lat ||
        prevRaw?.lastLocation?.lat ||
        prevRaw?.location?.lat ||
        0
      );
      const fallbackLng = Number(
        prevDevice?.longitude ||
        prevDevice?.lng ||
        prevRaw?.lastLocation?.lng ||
        prevRaw?.location?.lng ||
        0
      );

      const parsedLat = Number(loc?.lat ?? dev?.lat ?? dev?.latitude);
      const parsedLng = Number(loc?.lng ?? dev?.lng ?? dev?.longitude);

      const finalLat =
        !isNaN(parsedLat) && parsedLat !== 0 ? parsedLat : fallbackLat;
      const finalLng =
        !isNaN(parsedLng) && parsedLng !== 0 ? parsedLng : fallbackLng;

      const finalAddress =
        loc?.address ||
        dev?.address ||
        prevDevice?.address ||
        prevRaw?.lastLocation?.address ||
        "";

      const finalBattery =
        dev?.battery ??
        dev?.batteryLevel ??
        prevDevice?.batteryLevel ??
        prevRaw?.battery ??
        100;

      const finalStatus =
        dev?.status === "active" || prevDevice?.status === "running"
          ? "running"
          : dev?.status || prevDevice?.status || "inactive";

      const finalChildName =
        (typeof dev?.childId === "object" ? dev?.childId?.childName : null) ||
        dev?.childName ||
        dev?.child?.childName ||
        prevDevice?.childName ||
        (typeof prevRaw?.childId === "object" ? prevRaw?.childId?.childName : null);

      const finalSchoolName =
        (typeof dev?.schoolId === "object" ? dev?.schoolId?.schoolName : null) ||
        dev?.schoolName ||
        dev?.school?.schoolName ||
        prevDevice?.schoolName ||
        (typeof prevRaw?.schoolId === "object" ? prevRaw?.schoolId?.schoolName : null);

      const finalBranchName =
        (typeof dev?.branchId === "object" ? dev?.branchId?.branchName : null) ||
        dev?.branchName ||
        dev?.branch?.branchName ||
        prevDevice?.branchName ||
        (typeof prevRaw?.branchId === "object" ? prevRaw?.branchId?.branchName : null);

      const numId = dev?._id || dev?.deviceId || prevDevice?.deviceId
        ? parseInt(String(dev?._id || dev?.deviceId || prevDevice?.deviceId).slice(-6), 16) || 999999
        : 999999;

      const mappedBle = {
        deviceId: numId,
        uniqueId: dev?.sn || dev?.uniqueId || prevDevice?.uniqueId || id,
        imei: dev?.sn || dev?.uniqueId || prevDevice?.uniqueId || id,
        sn: dev?.sn || dev?.uniqueId || prevDevice?.uniqueId || id,
        name: dev?.name || dev?.sn || selectedImei?.name || prevDevice?.name || "GeoTag",
        latitude: finalLat,
        longitude: finalLng,
        lat: finalLat,
        lng: finalLng,
        speed: 0,
        course: 0,
        batteryLevel: finalBattery,
        status: finalStatus,
        category: "BLE",
        lastUpdate:
          dev?.lastUpdate ||
          loc?.locationTime ||
          loc?.reportedTime ||
          dev?.updatedAt ||
          prevDevice?.lastUpdate ||
          new Date().toISOString(),
        address: finalAddress,
        attributes: {
          charge: dev?.batteryStatus === "OK" || prevRaw?.batteryStatus === "OK",
          ignition: false,
          motion: false,
          sat: 0,
          distance: 0,
          totalDistance: 0,
          todayDistance: 0,
        },
        gsmSignal: finalBattery,
        TD: 0,
        mileage: "0",
        speedLimit: "0",
        fuelConsumption: "0",
        matchesSearch: true,
        childName: finalChildName,
        schoolName: finalSchoolName,
        branchName: finalBranchName,
        rawBleDevice: dev || prevRaw,
      };

      setBleLiveDevice(mappedBle);
    } catch (err) {
      console.error("[LiveTrack] Failed to fetch live BLE device data:", err);
    } finally {
      setIsBleFetching(false);
    }
  }, [bleIdentifier, selectedImei]);

  const fetchLiveBleDataRef = useRef(fetchLiveBleData);
  useEffect(() => {
    fetchLiveBleDataRef.current = fetchLiveBleData;
  }, [fetchLiveBleData]);

  // Real-time auto-polling for GeoTag every 10 seconds while LiveTrack modal is open
  useEffect(() => {
    if (!open || !isBle) {
      setBleLiveDevice(null);
      return;
    }

    // Trigger immediately on open
    fetchLiveBleDataRef.current();

    // Trigger every 10 seconds continuously
    const interval = setInterval(() => {
      fetchLiveBleDataRef.current();
    }, 10000);

    return () => clearInterval(interval);
  }, [open, isBle]);

  // Store last geocoded position
  const lastGeocodedPosition = useRef<{
    deviceId: number;
    latitude: number;
    longitude: number;
  } | null>(null);

  // Track if close was triggered by popstate to prevent double history manipulation
  const closedByPopState = useRef(false);

  const currentImei = useMemo(
    () => selectedImei?.uniqueId,
    [selectedImei?.uniqueId]
  );
  const currentName = useMemo(() => selectedImei?.name, [selectedImei?.name]);

  // Handle browser back button
  useEffect(() => {
    if (!open) return;

    // Push a new history state when modal opens
    const currentState = window.history.state;
    if (!currentState?.[MODAL_HISTORY_KEY]) {
      window.history.pushState(
        { ...currentState, [MODAL_HISTORY_KEY]: true },
        "",
        window.location.href
      );
    }

    // Listen for popstate (back button)
    const handlePopState = (event: PopStateEvent) => {
      // Check if modal should close (back button was pressed)
      if (open && !event.state?.[MODAL_HISTORY_KEY]) {
        closedByPopState.current = true;
        setOpen?.(false);
      }
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [open, setOpen]);

  // Optimized geocoding with distance check
  useEffect(() => {
    if (
      !deviceData?.deviceId ||
      !deviceData?.latitude ||
      !deviceData?.longitude
    ) {
      return;
    }

    const { deviceId, latitude, longitude } = deviceData;

    // Check if we need to fetch a new address
    const shouldFetchAddress = (() => {
      // First time fetching for this device
      if (
        !lastGeocodedPosition.current ||
        lastGeocodedPosition.current.deviceId !== deviceId
      ) {
        return true;
      }

      // Calculate distance from last geocoded position
      const distance = calculateDistance(
        lastGeocodedPosition.current.latitude,
        lastGeocodedPosition.current.longitude,
        latitude,
        longitude
      );

      // Only fetch if distance exceeds threshold
      return distance >= DISTANCE_THRESHOLD;
    })();

    if (shouldFetchAddress) {
      queueForGeocoding(deviceId, latitude, longitude, true);

      // Update last geocoded position
      lastGeocodedPosition.current = { deviceId, latitude, longitude };
    }
  }, [
    deviceData?.deviceId,
    deviceData?.latitude,
    deviceData?.longitude,
    queueForGeocoding,
  ]);


  const handleDialogClose = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        if (!isBle && isConnected && isAuthenticated) {
          switchToAllDevices();
        }
        setBleLiveDevice(null);
        // Reset last geocoded position on close
        lastGeocodedPosition.current = null;

        // Only manipulate history if close wasn't triggered by popstate
        if (
          !closedByPopState.current &&
          window.history.state?.[MODAL_HISTORY_KEY]
        ) {
          window.history.back();
        }

        // Reset the flag
        closedByPopState.current = false;
      }
      setOpen?.(isOpen);
    },
    [setOpen, switchToAllDevices, isConnected, isAuthenticated, isBle]
  );

  const activeVehicle = useMemo(() => {
    if (isBle) {
      return bleLiveDevice || (selectedImei as any)?.device || null;
    }
    return deviceData || (selectedImei as any)?.device || null;
  }, [isBle, bleLiveDevice, deviceData, selectedImei]);

  const singleDeviceProps = useMemo(
    () => ({
      vehicle: activeVehicle,
      autoCenter: true,
      showTrail: true,
      routeName: selectedImei?.routeName,
      routeObjId: selectedImei?.routeObjId,
      schoolId: selectedImei?.schoolId,
      branchId: selectedImei?.branchId,
    }),
    [activeVehicle, selectedImei]
  );

  // Get address and loading state
  const address = useMemo(() => {
    if (isBle) {
      return (
        activeVehicle?.address ||
        activeVehicle?.rawBleDevice?.location?.address ||
        (selectedImei as any)?.device?.address ||
        null
      );
    }
    const devId =
      deviceData?.deviceId || (selectedImei as any)?.device?.deviceId;
    if (devId && addresses[devId]) return addresses[devId];
    return (selectedImei as any)?.device?.address || null;
  }, [isBle, activeVehicle, deviceData?.deviceId, addresses, selectedImei]);

  const isLoadingAddress = useMemo(() => {
    if (isBle) {
      return isBleFetching && !address;
    }
    const devId =
      deviceData?.deviceId || (selectedImei as any)?.device?.deviceId;
    if (!devId) return false;
    return loadingAddresses[devId] || false;
  }, [isBle, isBleFetching, address, deviceData?.deviceId, loadingAddresses, selectedImei]);

  if (!currentImei) {
    return null;
  }

  const dialogTitle = currentName || activeVehicle?.name || "Live Tracking";

  const isLiveActive = Boolean(
    isBle
      ? activeVehicle?.status === "active" ||
          activeVehicle?.status === "running" ||
          bleLiveDevice != null
      : isActive
  );

  // Address display component
  const AddressDisplay = () => {
    if (isLoadingAddress) {
      return (
        <div className="flex items-center gap-2 text-sm text-gray-500 font-normal">
          <FaMapMarkerAlt
            className="flex-shrink-0 text-gray-400 animate-pulse"
            size={14}
          />
          <span className="animate-pulse">Loading address...</span>
        </div>
      );
    }

    if (address) {
      return (
        <div className="flex items-start gap-2 text-sm text-gray-600 font-normal">
          <FaMapMarkerAlt
            className="mt-0.5 flex-shrink-0 text-blue-500"
            size={14}
          />
          <span className="line-clamp-2">{address}</span>
        </div>
      );
    }

    return null;
  };

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={handleDialogClose}>
        <DialogContent className="h-[100vh] max-h-[100vh] w-full">
          <DialogHeader className="px-6 border-b pb-3">
            <DialogTitle className="flex items-center justify-between gap-3">
              <div className="flex flex-col gap-2 flex-1 min-w-0">
                <div className="flex flex-col items-start  gap-2">
                  <div className="flex items-center gap-2">
                    {isLiveActive && (
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                        Live
                      </span>
                    )}{" "}
                    <span className="text-lg font-semibold">{dialogTitle}</span>
                  </div>
                  <span className="text-sm ml-2 text-gray-500">
                    {isBle ? "SN" : "IMEI"}: {currentImei}
                  </span>
                </div>
                <AddressDisplay />
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="h-[calc(100vh-120px)] w-full">
            <SingleDeviceLiveTrack {...singleDeviceProps} />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={handleDialogClose}>
      <DrawerContent className="h-[100vh] max-h-[100vh]">
        <DrawerHeader className="text-left border-b px-4 py-3">
          <DrawerTitle className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">{dialogTitle}</span>
              {isLiveActive && (
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                  Live
                </span>
              )}
            </div>
            <span className="text-xs text-gray-500 font-normal">
              {isBle ? "SN" : "IMEI"}: {currentImei}
            </span>
            <AddressDisplay />
          </DrawerTitle>
        </DrawerHeader>

        <div className="flex-1 h-[calc(100vh-200px)] w-full">
          <SingleDeviceLiveTrack {...singleDeviceProps} />
        </div>

        <DrawerFooter className="pt-2 px-4 pb-4 border-t">
          <DrawerClose asChild>
            <Button variant="outline" size="sm">
              Close
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
