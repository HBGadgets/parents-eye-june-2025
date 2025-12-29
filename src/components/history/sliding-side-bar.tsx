import React, { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Navigation, Fuel, X, Calendar } from "lucide-react";
import { DeviceHistoryItem } from "@/data/sampleData";
import { useReport } from "@/hooks/reports/useReport";
import { GiPathDistance } from "react-icons/gi";

interface Trip {
  id: number;
  startTime: string;
  endTime: string;
  startLocation: { lat: number; lng: number };
  endLocation: { lat: number; lng: number };
  distance: number;
  duration: number;
  maxSpeed: number;
  avgSpeed: number;
}

type PageSize = number | "all";

interface Stoppage {
  id: number;
  startTime: String;
  endTime: String;
  location: { lat: number; lng: number };
  duration: number;
  reason: string;
}

interface TripsSidebarProps {
  trips: DeviceHistoryItem[][];
  selectedTripIndex: number | null;
  onTripSelect: (tripIndex: number) => void;
  fromDate: string | null;
  toDate: string | null;
  onOverallSelect: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const TripsSidebar: React.FC<TripsSidebarProps> = ({
  trips,
  selectedTripIndex,
  onTripSelect,
  onOverallSelect,
  isOpen,
  onClose,
  fromDate,
  toDate,
}) => {
  const tripSummaries = trips.map((trip, index) => {
    const start = trip[0];
    const end = trip[trip.length - 1];

    const maxSpeed = Math.max(...trip.map((p) => p.speed || 0));
    const avgSpeed =
      trip.reduce((sum, p) => sum + (p.speed || 0), 0) / trip.length;

    const latitudes = trip.map((p) => p.latitude);
    const longitudes = trip.map((p) => p.longitude);

    return {
      id: index,
      startTime: start.createdAt,
      endTime: end.createdAt,
      distance: end.attributes?.distance ?? 0,
      duration:
        new Date(end.createdAt).getTime() - new Date(start.createdAt).getTime(),
      maxSpeed,
      avgSpeed,
    };
  });

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    return hours ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 pointer-events-none">
          {/* Click outside area (only right side) */}
          <div
            className="absolute right-80 top-0 h-full w-[calc(100%-20rem)] pointer-events-auto"
            onClick={onClose}
          />
        </div>
      )}

      <div
        className={`fixed top-12 right-0 h-[calc(100vh-7rem)] w-80 bg-background border-l z-[9999]
        transition-transform ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <Card className="h-full border-0 rounded-none">
          <CardHeader className="space-y-3">
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Navigation className="w-5 h-5" />
                Journey
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* ✅ Overall Playback */}
            <Button
              variant={selectedTripIndex === null ? "default" : "outline"}
              onClick={onOverallSelect}
            >
              Overall Playback
            </Button>
          </CardHeader>

          <CardContent className="space-y-3 overflow-y-auto">
            {tripSummaries.length ? (
              tripSummaries.map((trip, index) => (
                <Card
                  key={trip.id}
                  onClick={() => onTripSelect(index)}
                  className={`
    cursor-pointer p-3 border transition-all duration-200 ease-out
    rounded-lg my-2
    ${
      selectedTripIndex === index
        ? "border-primary bg-primary/5 shadow-sm"
        : "border-border bg-background"
    }
    hover:-translate-y-[1px]
    hover:shadow-md
    hover:border-primary/60
    hover:bg-muted/40
    active:translate-y-0
  `}
                >
                  <div className="flex justify-between mb-1">
                    <Badge>Trip {index + 1}</Badge>
                    <Badge variant="outline">
                      {formatDuration(trip.duration)}
                    </Badge>
                  </div>

                  <div className="text-sm space-y-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3" />
                      {new Date(trip.startTime).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        timeZone: "UTC",
                      })}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      {new Date(trip.startTime).toLocaleString("en-GB", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        hour12: true,
                        timeZone: "UTC",
                      })}{" "}
                      –
                      {" "}
                      {new Date(trip.endTime).toLocaleString("en-GB", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        hour12: true,
                        timeZone: "UTC",
                      })}
                    </div>

                    <div className="flex justify-between text-xs">
                      <span>Max: {trip.maxSpeed.toFixed(0)} km/h</span>
                      <span>Avg: {trip.avgSpeed.toFixed(0)} km/h</span>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-10">
                No trips detected
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default TripsSidebar;
