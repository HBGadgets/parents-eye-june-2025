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
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useSingleDeviceData } from "@/hooks/livetrack/useLiveDeviceData";
import DataRefreshIndicator, {
  useDataRefreshIndicator,
} from "./data-refresh-indicator";
import { useReverseGeocode } from "@/hooks/useReverseGeocoding";
import { calculateDistance } from "@/util/calculate-distance";
import { FaMapMarkerAlt } from "react-icons/fa";
import SingleDeviceLiveTrack from "./single-device-livetrack";

interface Imei {
  imei?: string;
  name?: string;
}

interface UniqueId {
  uniqueId?: number;
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
  selectedImei?: Imei | UniqueId | RouteNo | SchoolId | BranchId | null;
}

const DISTANCE_THRESHOLD = 500; // 500 meters
const MODAL_HISTORY_KEY = "livetrack-modal-open";

export const LiveTrack = ({ open, setOpen, selectedImei }: LiveTrackProps) => {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const {
    deviceData,
    isActive,
    isConnected,
    isAuthenticated,
    switchToAllDevices,
  } = useSingleDeviceData(open ? selectedImei?.uniqueId : undefined);

  const { key: refreshKey, triggerRefresh } = useDataRefreshIndicator(10);
  const { addresses, loadingAddresses, queueForGeocoding } =
    useReverseGeocode();

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

  // Trigger refresh indicator
  useEffect(() => {
    if (deviceData?.lastUpdate) {
      triggerRefresh();
    }
  }, [deviceData?.lastUpdate]);

  const handleDialogClose = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        if (isConnected && isAuthenticated) {
          switchToAllDevices();
        }
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
    [setOpen, switchToAllDevices, isConnected, isAuthenticated]
  );

  const singleDeviceProps = useMemo(
    () => ({
      vehicle: deviceData,
      autoCenter: true,
      showTrail: true,
      routeName: selectedImei?.routeName,
      routeObjId: selectedImei?.routeObjId,
      schoolId: selectedImei?.schoolId,
      branchId: selectedImei?.branchId,
    }),
    [deviceData]
  );

  // Get address and loading state
  const address = useMemo(() => {
    if (!deviceData?.deviceId) return null;
    return addresses[deviceData?.deviceId] || null;
  }, [deviceData?.deviceId, addresses]);

  const isLoadingAddress = useMemo(() => {
    if (!deviceData?.deviceId) return false;
    return loadingAddresses[deviceData?.deviceId] || false;
  }, [deviceData?.deviceId, loadingAddresses]);

  if (!currentImei) {
    return null;
  }

  const dialogTitle = currentName || "Live Tracking";

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
                    {isActive && (
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                        Live
                      </span>
                    )}{" "}
                    <span className="text-lg font-semibold">{dialogTitle}</span>
                  </div>
                  <span className="text-sm ml-2 text-gray-500">
                    IMEI: {currentImei}
                  </span>
                </div>
                <AddressDisplay />
              </div>

              {/* <div className="flex-shrink-0">
                <DataRefreshIndicator
                  key={refreshKey}
                  intervalSeconds={10}
                  className="flex-shrink-0"
                />
              </div> */}
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
              {isActive && (
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                  Live
                </span>
              )}
            </div>
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
