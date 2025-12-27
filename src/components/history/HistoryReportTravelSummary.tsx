"use client";

import React, { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gauge, Clock } from "lucide-react";
import TripsSidebar from "./sliding-side-bar";

const VehicleMap = dynamic(() => import("./vehicle-map"), { ssr: false });

interface HistoryReportProps {
  /** Data */
  trips: any[][];
  flatHistory: any[];

  /** UI toggles */
  showFilters?: boolean;
  showTripsSidebar?: boolean;

  /** Optional external control */
  initialPlayback?: any[];
}

export default function HistoryReport({
  trips,
  flatHistory,
  showFilters = true,
  showTripsSidebar = true,
  initialPlayback,
}: HistoryReportProps) {
  const [activePlayback, setActivePlayback] = useState<any[]>(
    initialPlayback ?? flatHistory
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);

  const currentIndex = useMemo(() => {
    if (!activePlayback.length) return 0;
    return Math.round((playbackProgress / 100) * (activePlayback.length - 1));
  }, [playbackProgress, activePlayback]);

  const currentData = activePlayback[currentIndex];

  return (
    <div className="space-y-3">
      {/* Map */}
      <div className="h-[60vh]">
        <VehicleMap
          data={activePlayback}
          currentIndex={currentIndex}
          onProgressChange={setPlaybackProgress}
        />
      </div>

      {/* Metrics */}
      {currentData && (
        <Card className="p-4 space-y-2">
          <div className="flex gap-5">
            <div className="flex items-center gap-2 text-sm">
              <Gauge className="w-4 h-4" />
              {currentData.speed?.toFixed(1)} km/h
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4" />
              {new Date(currentData.createdAt).toLocaleString()}
            </div>
          </div>
        </Card>
      )}

      {/* Sidebar trigger */}
      {showTripsSidebar && (
        <Button
          className="fixed right-0 top-1/2 z-50"
          onClick={() => setIsSidebarOpen(true)}
        >
          Trips
        </Button>
      )}

      {/* Trips Sidebar */}
      {showTripsSidebar && (
        <TripsSidebar
          trips={trips}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onTripSelect={(index) => {
            setActivePlayback(trips[index]);
            setPlaybackProgress(0);
          }}
          onOverallSelect={() => {
            setActivePlayback(flatHistory);
            setPlaybackProgress(0);
          }}
        />
      )}
    </div>
  );
}
