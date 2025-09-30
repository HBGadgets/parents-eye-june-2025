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
import SingleDeviceLiveTrack from "./single-device-livetrack";
import "./styles.css";
import { useCallback, useMemo } from "react";
import { useSingleDeviceData } from "@/hooks/livetrack/useLiveDeviceData";

interface Imei {
  imei?: string;
  name?: string;
}

interface LiveTrackProps {
  open?: boolean;
  setOpen?: (open: boolean) => void;
  selectedImei?: Imei | null;
}

export const LiveTrack = ({ open, setOpen, selectedImei }: LiveTrackProps) => {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  // Use the single device data hook - it handles auto-streaming
  const {
    deviceData,
    isActive,
    isLoading,
    isConnected,
    isAuthenticated,
    switchToAllDevices,
  } = useSingleDeviceData(open ? selectedImei?.imei : undefined);

  // Memoize the current imei and name
  const currentImei = useMemo(() => selectedImei?.imei, [selectedImei?.imei]);
  const currentName = useMemo(() => selectedImei?.name, [selectedImei?.name]);

  // Handle dialog close with proper cleanup
  const handleDialogClose = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        console.log("[LiveTrack] Dialog closing, switching to all devices");
        // Switch back to all devices mode when dialog closes
        if (isConnected && isAuthenticated) {
          switchToAllDevices();
        }
      }
      setOpen?.(isOpen);
    },
    [setOpen, switchToAllDevices, isConnected, isAuthenticated]
  );

  // Memoize the child component props to prevent unnecessary re-renders
  const singleDeviceProps = useMemo(
    () => ({
      deviceData,
      isLoading,
      isActive,
      imei: currentImei,
      deviceName: currentName,
    }),
    [deviceData, isLoading, isActive, currentImei, currentName]
  );

  // Early return if no imei selected
  if (!currentImei) {
    return null;
  }

  const dialogTitle = currentName || "Live Tracking";

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={handleDialogClose}>
        <DialogContent className="h-[100vh] max-h-[100vh] w-full">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="text-lg font-semibold">
              {dialogTitle}
              {isActive && (
                <span className="ml-2 inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                  Live
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 h-[calc(100vh-80px)] w-full">
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
          <DrawerTitle className="text-lg font-semibold">
            {dialogTitle}
            {isActive && (
              <span className="ml-2 inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                Live
              </span>
            )}
          </DrawerTitle>
        </DrawerHeader>

        <div className="flex-1 h-[calc(100vh-140px)] w-full">
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
