"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Navigation, X, Calendar } from "lucide-react";
import { DeviceHistoryItem } from "@/data/sampleData";
import { reverseGeocodeMapTiler } from "@/hooks/useReverseGeocoding";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

interface TripsSidebarProps {
  trips: DeviceHistoryItem[][];
  selectedTripIndex: number | null;
  onTripSelect: (tripIndex: number) => void;
  onOverallSelect: () => void;
  isOpen: boolean;
  onClose: () => void;
  fromDate: string | null;
  toDate: string | null;
  selectedVehicle: string | null;
  showStopsOnMap: boolean;
  onToggleStops: () => void;
  derivedStops: DerivedStop[];
  activeStopId?: number | null;
  onStopSelect?: (stopId: number | null) => void;
  stopAddressMap: Record<number, string>;
  setStopAddressMap: React.Dispatch<
    React.SetStateAction<Record<number, string>>
  >;
}

interface DerivedStop {
  id: number;
  startTime: string;
  endTime: string;
  duration: string;
  distanceFromPrev: number;
  lat: number;
  lng: number;
}

const TripsSidebar: React.FC<TripsSidebarProps> = ({
  trips,
  selectedTripIndex,
  onTripSelect,
  onOverallSelect,
  isOpen,
  onClose,
  showStopsOnMap,
  onToggleStops,
  derivedStops,
  activeStopId,
  onStopSelect,
  stopAddressMap,
  setStopAddressMap,
}) => {
  /* -------------------- Stop addresses Map -------------------- */
  const fetchedStopRef = useRef<Set<number>>(new Set());

  /* -------------------- Tabs -------------------- */
  const [activeTab, setActiveTab] = useState<"trip" | "stops">("trip");

  /* -------------------- Trip summaries -------------------- */
  const tripSummaries = useMemo(() => {
    return trips.map((trip, index) => {
      const start = trip[0];
      const end = trip[trip.length - 1];

      const maxSpeed = Math.max(...trip.map((p) => p.speed || 0));
      const avgSpeed =
        trip.reduce((sum, p) => sum + (p.speed || 0), 0) / trip.length;

      return {
        id: index,
        startTime: start.createdAt,
        endTime: end.createdAt,
        startLat: start.latitude,
        startLng: start.longitude,
        endLat: end.latitude,
        endLng: end.longitude,
        duration:
          new Date(end.createdAt).getTime() -
          new Date(start.createdAt).getTime(),
        maxSpeed,
        avgSpeed,
      };
    });
  }, [trips]);

  /* -------------------- Reverse Geocode -------------------- */

  const fetchedRef = useRef<Set<number>>(new Set());

  const loadAddresses = useCallback(
    async (
      index: number,
      startLat: number,
      startLng: number,
      endLat: number,
      endLng: number
    ) => {
      if (fetchedRef.current.has(index)) return;
      fetchedRef.current.add(index);

      const [startAddr, endAddr] = await Promise.all([
        reverseGeocodeMapTiler(startLat, startLng),
        reverseGeocodeMapTiler(endLat, endLng),
      ]);

      setAddressMap((prev) => ({
        ...prev,
        [index]: { start: startAddr, end: endAddr },
      }));
    },
    []
  );

  useEffect(() => {
    derivedStops.forEach((stop) => {
      if (stopAddressMap[stop.id]) return;
      if (fetchedRef.current.has(stop.id)) return;

      fetchedRef.current.add(stop.id);

      reverseGeocodeMapTiler(stop.lat, stop.lng)
        .then((address) => {
          setStopAddressMap((prev) => ({
            ...prev,
            [stop.id]: address,
          }));
        })
        .catch(() => {
          setStopAddressMap((prev) => ({
            ...prev,
            [stop.id]: "Address not available",
          }));
        });
    });
  }, [derivedStops, stopAddressMap, setStopAddressMap]);

  /* -------------------- Helpers -------------------- */
  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    return hours ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
  };

  /* -------------------- UI -------------------- */
  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 pointer-events-none">
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
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as any)}
            className="h-full flex flex-col"
          >
            <CardHeader className="space-y-3">
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Navigation className="w-5 h-5" />
                  Playback
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={onClose}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <TabsList className="relative grid grid-cols-2 rounded-full bg-muted p-1">
                    {/* Sliding bubble with improved animations */}
                    <div
                      className={`absolute inset-y-1 w-[calc(50%-0.25rem)] rounded-full 
      bg-background shadow-md
      transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
      ${activeTab === "stops" ? "left-[calc(50%+0.125rem)]" : "left-1"}
    `}
                      style={{
                        boxShadow:
                          "0 2px 8px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)",
                      }}
                    />

                    <TabsTrigger
                      value="trip"
                      onClick={() => setActiveTab("trip")}
                      className="relative z-10 rounded-full
      data-[state=active]:text-primary
      data-[state=inactive]:text-muted-foreground
      transition-colors duration-300 cursor-pointer"
                    >
                      Trip
                    </TabsTrigger>

                    <TabsTrigger
                      value="stops"
                      onClick={() => setActiveTab("stops")}
                      className="relative z-10 rounded-full
      data-[state=active]:text-primary
      data-[state=inactive]:text-muted-foreground
      transition-colors duration-300 cursor-pointer"
                    >
                      Stops
                    </TabsTrigger>
                  </TabsList>
                </div>
                <div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={showStopsOnMap ? "destructive" : "outline"}
                          className="w-full cursor-pointer transformations duration-300 rounded-full"
                          onClick={onToggleStops}
                        >
                          Stoppages
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        className="bg-black/80 text-white font-bold rounded-md px-3 py-2 shadow-lg"
                      >
                        <p>{showStopsOnMap ? "Hide Stops" : "Show Stops"}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
              <Button
                variant={selectedTripIndex === null ? "default" : "outline"}
                className="w-full cursor-pointer"
                onClick={onOverallSelect}
              >
                Overall Playback
              </Button>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto space-y-3">
              {/* TRIPS */}
              <TabsContent value="trip" className="mt-0">
                {tripSummaries.length ? (
                  tripSummaries.map((trip, index) => (
                    <Card
                      key={trip.id}
                      onClick={() => onTripSelect(index)}
                      className={`cursor-pointer p-3 my-2 rounded-lg border transition-all duration-300 
                        ${
                          selectedTripIndex === index
                            ? "border-primary bg-primary/10 shadow-md"
                            : "hover:shadow-md hover:border-primary/60"
                        }`}
                    >
                      <div className="flex justify-between">
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
                          })}{" "}
                          –{" "}
                          {new Date(trip.endTime).toLocaleString("en-GB", {
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
                          –{" "}
                          {new Date(trip.endTime).toLocaleString("en-GB", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                            hour12: true,
                            timeZone: "UTC",
                          })}
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div className="flex items-start gap-2">
                            <div>
                              <MapPin className="w-3 h-3 text-green-600" />
                            </div>
                            <span className="font-medium">Start:</span>
                            <span>
                              {stopAddressMap[index] ?? "Loading..."}
                            </span>
                          </div>

                          <div className="flex items-start gap-2">
                            <div>
                              <MapPin className="w-3 h-3 text-red-600" />
                            </div>
                            <span className="font-medium">End:</span>
                            <span>
                              {stopAddressMap[index] ?? "Loading..."}
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-between text-xs">
                          <span>Max: {trip.maxSpeed.toFixed(0)} km/h</span>
                          <span>Avg: {trip.avgSpeed.toFixed(0)} km/h</span>
                        </div>
                      </div>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-10 text-muted-foreground">
                    No trips detected
                  </div>
                )}
              </TabsContent>

              {/* STOPS */}
              <TabsContent value="stops" className="mt-0">
                {derivedStops.length ? (
                  derivedStops.map((stop, index) => (
                    <Card
                      key={stop.id}
                      className={`p-3 my-2 rounded-lg border cursor-pointer transition-all duration-300 ${
                        activeStopId === stop.id
                          ? "border-red-500 bg-red-50 shadow-md"
                          : ""
                      }`}
                      onClick={() => onStopSelect(stop.id)}
                    >
                      <div className="flex justify-between">
                        <Badge variant="destructive">Stop {index + 1}</Badge>
                        <div className="space-y-1">
                          <div className="flex items-center justify-end gap-2 text-muted-foreground font-mono text-[10px]">
                            <span>Dist. From prev:</span>
                            <span>{stop.distanceFromPrev.toFixed(2)} km</span>
                          </div>
                          <div className="flex items-center justify-end gap-2 text-muted-foreground font-mono text-[10px]">
                            <span>Duration: {stop.duration}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-xs space-y-1">
                        {/* 📅 Stop Date Range */}
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3 h-3" />
                          {new Date(stop.startTime).toLocaleDateString(
                            "en-GB",
                            {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              timeZone: "UTC",
                            }
                          )}
                          {" – "}
                          {new Date(stop.endTime).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            timeZone: "UTC",
                          })}
                        </div>

                        {/* ⏰ Stop End Time */}
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          {new Date(stop.startTime).toLocaleTimeString(
                            "en-GB",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                              hour12: true,
                              timeZone: "UTC",
                            }
                          )}{" "}
                          –{" "}
                          {new Date(stop.endTime).toLocaleTimeString("en-GB", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                            hour12: true,
                            timeZone: "UTC",
                          })}
                        </div>

                        {/* 📍 Address */}
                        <div className="flex items-start gap-2 text-muted-foreground">
                          <div>
                            <MapPin className="w-3 h-3 mt-[2px]" color="red" />
                          </div>
                          <span className="leading-snug">
                            {stopAddressMap[stop.id] ?? "Fetching address..."}
                          </span>
                        </div>
                      </div>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-10 text-muted-foreground">
                    No stops detected
                  </div>
                )}
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </>
  );
};

export default TripsSidebar;
