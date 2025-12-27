"use client";

import * as React from "react";
import { ResponsiveContainer } from "recharts";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useDeviceDropdownWithUniqueIdForHistory } from "@/hooks/useDropdown";
import dynamic from "next/dynamic";
import HistoryReportPage from "@/app/dashboard/reports/history-report/page";
import HistoryReport from "../history/HistoryReportTravelSummary";

interface PlaybackHistoryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uniqueId?: number;
  vehicleName?: string;
  startDate?: string;
  endDate?: string;
  flatHistory: any[];
}

type UTCRange = {
  from?: string;
  to?: string;
};

// Dynamically import VehicleMap with SSR disabled
const VehicleMap = dynamic(() => import("@/components/history/vehicle-map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[50vh] flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading map...</p>
      </div>
    </div>
  ),
});

export function PlaybackHistoryDrawer({
  open,
  onOpenChange,
  uniqueId,
  startDate,
  endDate,
  flatHistory,
  vehicleName,
}: PlaybackHistoryDrawerProps) {
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

    const from = new Date(
      Date.UTC(startParsed.year, startParsed.month, startParsed.day, 0, 0, 0, 0)
    );

    const to = new Date(
      Date.UTC(endParsed.year, endParsed.month, endParsed.day, 23, 59, 59, 999)
    );

    return {
      from: from.toISOString(),
      to: to.toISOString(),
    };
  };
  const { from, to } = toUTCRange(startDate, endDate);
  console.log("flatHistory:", flatHistory);

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
            <HistoryReport
              trips={[flatHistory]}
              flatHistory={flatHistory}
              showFilters={false}
              showTripsSidebar={false}
            />
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
