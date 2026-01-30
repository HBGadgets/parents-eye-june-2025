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
import { BusStopTimeline } from "./BusStopTimeline";
import { Bus, History, MapPin } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRouteTimeline } from "@/hooks/timeline/useRouteTimeline";
import { useQueryClient } from "@tanstack/react-query";
import { useRouteTimelineStore } from "@/store/timeline/routeTimelineStore";
import { useRouter } from "next/navigation";
// import { useRouteTimeline } from "@/hooks/useRouteTimeline";

interface RouteTimelineProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  // handleHistoryClick: (deviceId: number) => void;

  routeId?: string;
  uniqueId?: string;
  deviceName?: string;
}

export const RouteTimeline: React.FC<RouteTimelineProps> = ({
  isOpen,
  onOpenChange,
  // handleHistoryClick,
  uniqueId,
  deviceName,
}) => {
  const router = useRouter();
  const resetTimeline = useRouteTimelineStore((s) => s.reset);
  const { stops, currentStopIndex, isLoading, startPoint, endPoint } =
    useRouteTimeline(uniqueId!, isOpen);
  const remainingStops = stops.filter(
    (stop) => !stop.hasArrived && !stop.exitedAt && !stop.isCurrent
  ).length;

  const handleHistoryClick = (uniqueId: number) => {
    console.log("[handleHistoryClick] uniqueId:", uniqueId);
    router.push("/dashboard/reports/history-report?uniqueId=" + uniqueId);
  };

  useEffect(() => {
    resetTimeline();
  }, [resetTimeline, uniqueId]);
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:w-[440px] sm:max-w-[440px] p-0 overflow-hidden border-l border-border bg-background"
      >
        {/* Header */}
        <SheetHeader className="p-5 pb-4 border-b border-border bg-card">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/15">
                <Bus className="h-5 w-5 text-amber-500" />
              </div>

              <div>
                <SheetTitle className="text-base font-semibold text-foreground">
                  Route Timeline
                </SheetTitle>

                <SheetDescription className="text-sm mt-0.5 text-muted-foreground">
                  {deviceName ? (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-emerald-500" />
                      {deviceName}
                    </span>
                  ) : (
                    "Track bus stops in real-time"
                  )}
                </SheetDescription>

                {uniqueId && (
                  <p className="text-xs text-muted-foreground mt-1 font-mono">
                    IMEI: {uniqueId}
                  </p>
                )}
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="gap-2 shrink-0 cursor-pointer mt-5"
              disabled={!uniqueId}
              onClick={() => {
                uniqueId && handleHistoryClick(Number(uniqueId));
              }}
            >
              <History className="h-4 w-4" />
              History
            </Button>
          </div>
        </SheetHeader>

        {/* Timeline Content */}
        <ScrollArea className="h-[calc(100vh-140px)]">
          <div className="p-5">
            {isLoading ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                Loading route timeline…
              </div>
            ) : stops.length > 0 ? (
              <>
                {/* START & END POINTS */}
                {(startPoint || endPoint) && (
                  <div className="mb-4 space-y-2">
                    {startPoint && (
                      <div className="flex items-center gap-3 p-3 rounded-lg border bg-emerald-50">
                        <div className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
                        <div>
                          <p className="text-xs font-semibold text-emerald-700">
                            START POINT
                          </p>
                          <p className="text-sm text-foreground">
                            {startPoint.geofenceName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Pickup: {startPoint.pickupTime}
                          </p>
                        </div>
                      </div>
                    )}

                    {endPoint && (
                      <div className="flex items-center gap-3 p-3 rounded-lg border bg-rose-50">
                        <div className="h-2.5 w-2.5 rounded-full bg-rose-600" />
                        <div>
                          <p className="text-xs font-semibold text-rose-700">
                            END POINT
                          </p>
                          <p className="text-sm text-foreground">
                            {endPoint.geofenceName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Drop: {endPoint.dropTime}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <BusStopTimeline
                  stops={stops}
                  currentStopIndex={currentStopIndex}
                />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <MapPin className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">
                  No Stops Available
                </h3>
                <p className="text-sm text-muted-foreground max-w-[260px]">
                  {uniqueId
                    ? "No route data available for this device."
                    : "Select a device to view its route timeline."}
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer stats */}
        {stops.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
            <div className="flex items-center justify-between text-sm bg-card rounded-lg border border-border p-3 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="text-muted-foreground">
                  Arrived:{" "}
                  <span className="font-medium text-foreground">
                    {stops.filter((stop) => stop.hasArrived).length}
                  </span>
                </span>
              </div>

              <div className="h-4 w-px bg-border" />

              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <span className="text-muted-foreground">
                  Remaining:{" "}
                  <span className="font-medium text-foreground">
                    {remainingStops}
                  </span>
                </span>
              </div>

              <div className="h-4 w-px bg-border" />

              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">
                  Total:{" "}
                  <span className="font-medium text-foreground">
                    {stops.length}
                  </span>
                </span>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default RouteTimeline;
