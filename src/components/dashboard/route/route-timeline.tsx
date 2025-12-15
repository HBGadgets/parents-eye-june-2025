"use client";
import React, { useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useGeofenceByUniqueId } from "@/hooks/useGeofence";

interface RouteTimelineProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  handleHistoryClick: (uniqueId: number) => void;
  uniqueId?: string;
  deviceName?: string;
}

export const RouteTimeline = ({
  isOpen,
  onOpenChange,
  handleHistoryClick,
  uniqueId,
  deviceName,
}: RouteTimelineProps) => {
  const { geofenceByUniqueId, isLoadingByUniqueId } = useGeofenceByUniqueId(
    "693ac8cc37fe5a9f5cacd03f"
  );
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px]">
        <SheetHeader className="p-4 border-b">
          <div className="flex items-center justify-between mt-2">
            <div>
              <SheetTitle>Route Timeline</SheetTitle>
              <SheetDescription>
                {deviceName && `Device: ${deviceName}`}
              </SheetDescription>
              {uniqueId && (
                <p className="text-xs text-gray-500 mt-1">IMEI: {uniqueId}</p>
              )}
            </div>
            <Button
              onClick={() => handleHistoryClick(Number(uniqueId))}
              className="cursor-pointer"
            >
              History
            </Button>
          </div>
        </SheetHeader>

        {/* Add your timeline content here */}
        <div className="p-4">
          {uniqueId ? (
            <p>Timeline for device: {uniqueId}</p>
          ) : (
            <p>No device selected</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
