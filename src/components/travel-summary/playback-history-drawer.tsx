"use client";

import * as React from "react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import HistoryReport from "../history/HistoryReportTravelSummary";
import FullScreenSpinner from "@/components/RouteLoader";
import { useHistoryReport } from "@/hooks/playback-history/useHistoryReport";

interface PlaybackHistoryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uniqueId?: number;
  vehicleName?: string;
  startDate?: string;
  endDate?: string;
}

type UTCRange = {
  from?: string;
  to?: string;
};

export function PlaybackHistoryDrawer({
  open,
  onOpenChange,
  uniqueId,
  startDate,
  endDate,
  vehicleName,
}: PlaybackHistoryDrawerProps) {
  console.log("[PlaybackHistoryDrawer] uniqueId:", {
    uniqueId,
    startDate,
    endDate,
    vehicleName,
  });
  const toUTCRange = (start?: string, end?: string): UTCRange => {
    if (!start) return {};

    const parse = (date: string) => {
      let year: number, month: number, day: number;

      if (date.includes("/")) {
        const [d, m, y] = date.split("/").map(Number);
        day = d;
        month = m - 1;
        year = y;
      } else {
        const [y, m, d] = date.split("-").map(Number);
        day = d;
        month = m - 1;
        year = y;
      }

      return { year, month, day };
    };

    const startParsed = parse(start);
    const endParsed = parse(end ?? start);

    return {
      from: new Date(
        Date.UTC(startParsed.year, startParsed.month, startParsed.day, 0, 0, 0)
      ).toISOString(),
      to: new Date(
        Date.UTC(
          endParsed.year,
          endParsed.month,
          endParsed.day,
          23,
          59,
          59,
          999
        )
      ).toISOString(),
    };
  };

  const { from, to } = toUTCRange(startDate, endDate);

  // ✅ Query only when drawer is open AND params exist
  const { data, isFetching } = useHistoryReport(
    {
      uniqueId,
      from,
      to,
    },
    open && !!uniqueId && !!from && !!to
  );

  const trips = data?.deviceDataByTrips ?? [];
  const flatHistory = trips.flat();

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[95vh]">
        <div className="mx-auto h-screen w-screen px-4">
          <DrawerHeader>
            <DrawerTitle>Playback History</DrawerTitle>
            <DrawerDescription className="font-mono text-xs">
              Vehicle Number: <b>{vehicleName ?? "-"}</b>
            </DrawerDescription>
          </DrawerHeader>

          <div
            className="p-4"
            onPointerDown={(e) => e.stopPropagation()}
            onPointerMove={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            {isFetching ? (
              <FullScreenSpinner />
            ) : flatHistory.length === 0 ? (
              <p className="text-center text-muted-foreground">
                No history data available
              </p>
            ) : (
              <HistoryReport
                trips={trips}
                flatHistory={flatHistory}
                showFilters={false}
                showTripsSidebar={false}
              />
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
