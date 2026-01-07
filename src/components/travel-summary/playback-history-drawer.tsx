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
import { useQueryClient } from "@tanstack/react-query";
import { number } from "framer-motion";

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
  const queryClient = useQueryClient();

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
  const { from, to } = React.useMemo(
    () => toUTCRange(startDate, endDate),
    [startDate, endDate]
  );
  const { data, isFetching } = useHistoryReport(
    {
      uniqueId,
      from,
      to,
    },
    open && !!uniqueId && !!from && !!to
  );
  const cachedData = queryClient.getQueryData([
    "history-report",
    uniqueId,
    from,
    to,
  ]);
  const flattendCachedData = cachedData?.deviceDataByTrips?.flat() || [];
  const trips = data?.deviceDataByTrips ?? [];
  const flatHistory = trips.flat();

  const { odometerDistance, summedDistance } = React.useMemo(() => {
    if (!flattendCachedData || flattendCachedData.length < 2) {
      return { odometerDistance: 0, summedDistance: 0 };
    }

    const first = flattendCachedData[0];
    const last = flattendCachedData[flattendCachedData.length - 1];

    const odometerDistance =
      (last?.attributes?.totalDistance ?? 0) -
      (first?.attributes?.totalDistance ?? 0);

    // const summedDistance = flattendCachedData.reduce(
    //   (acc, item) => acc + (item?.attributes?.distance ?? 0),
    //   0
    // );

    return {
      odometerDistance: (Number(odometerDistance) / 1000).toFixed(2),
      // summedDistance,
    };
  }, [flattendCachedData]);

  console.log("Total distance: ", odometerDistance);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[95vh]">
        <div className="mx-auto h-screen w-screen px-4">
          <DrawerHeader>
            <DrawerTitle>Playback History</DrawerTitle>
            <DrawerDescription className="font-mono text-xs flex-col justify-center">
              <div className="flex justify-center gap-2">
                <div>
                  Vehicle Number: <b>{vehicleName ?? "-"}</b>
                </div>
                <div>
                  From:{" "}
                  <b>
                    {new Date(from).toLocaleString("en-GB", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      hour12: true,
                      timeZone: "UTC",
                    }) ?? "-"}
                  </b>
                </div>
                <div>
                  To:{" "}
                  <b>
                    {new Date(to).toLocaleString("en-GB", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      hour12: true,
                      timeZone: "UTC",
                    }) ?? "-"}
                  </b>
                </div>
              </div>
              <div>
                Total Distance: <b>{odometerDistance ?? "-"} km</b>
              </div>
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
