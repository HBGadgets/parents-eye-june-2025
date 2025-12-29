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
}

interface DerivedStop {
  id: number;
  startTime: string;
  endTime: string;
  duration: number;
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
}) => {
  /* -------------------- Stop addresses Map -------------------- */
  const fetchedStopRef = useRef<Set<number>>(new Set());

  /* -------------------- Tabs -------------------- */
  const [activeTab, setActiveTab] = useState<"journey" | "stops">("journey");

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

  /* -------------------- Derived Stops (NO MIN DURATION) -------------------- */
  const derivedStops = useMemo<DerivedStop[]>(() => {
    return trips.map((trip, index) => {
      const endPoint = trip[trip.length - 1];

      // --- Stop duration (gap till next trip)
      const nextTrip = trips[index + 1];
      const stopStartTime = new Date(endPoint.createdAt).getTime();
      const stopEndTime = nextTrip
        ? new Date(nextTrip[0].createdAt).getTime()
        : stopStartTime;

      const stopDuration = stopEndTime - stopStartTime;

      // --- Distance from previous stop (using totalDistance)
      let distanceFromPrev = 0;

      if (index > 0) {
        const prevTrip = trips[index - 1];
        const prevEndPoint = prevTrip[prevTrip.length - 1];

        const currentTotal = endPoint.attributes?.totalDistance ?? 0;
        const prevTotal = prevEndPoint.attributes?.totalDistance ?? 0;

        // totalDistance is usually in meters
        distanceFromPrev = Math.max(0, (currentTotal - prevTotal) / 1000);
      }

      return {
        id: index,
        startTime: endPoint.createdAt,
        duration: stopDuration,
        distanceFromPrev,
        lat: endPoint.latitude,
        lng: endPoint.longitude,
      };
    });
  }, [trips]);

  /* -------------------- Reverse Geocode -------------------- */
  const [addressMap, setAddressMap] = useState<
    Record<number, { start?: string; end?: string }>
  >({});
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
    tripSummaries.forEach((trip, index) => {
      if (addressMap[index]?.start && addressMap[index]?.end) return;
      loadAddresses(
        index,
        trip.startLat,
        trip.startLng,
        trip.endLat,
        trip.endLng
      );
    });
  }, [tripSummaries, addressMap, loadAddresses]);

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

              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="journey" className="cursor-pointer">
                  Journey
                </TabsTrigger>
                <TabsTrigger value="stops" className="cursor-pointer">
                  Stops
                </TabsTrigger>
              </TabsList>

              {activeTab === "journey" && (
                <Button
                  variant={selectedTripIndex === null ? "default" : "outline"}
                  className="w-full cursor-pointer"
                  onClick={onOverallSelect}
                >
                  Overall Playback
                </Button>
              )}
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto space-y-3">
              {/* JOURNEY */}
              <TabsContent value="journey" className="mt-0">
                {tripSummaries.length ? (
                  tripSummaries.map((trip, index) => (
                    <Card
                      key={trip.id}
                      onClick={() => onTripSelect(index)}
                      className={`cursor-pointer p-3 my-2 rounded-lg border transition-all
                        ${
                          selectedTripIndex === index
                            ? "border-primary bg-primary/10 shadow-md"
                            : "hover:shadow-md hover:border-primary/60"
                        }`}
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
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3 h-3 text-green-600" />
                            <span className="font-medium">Start:</span>
                            <span>
                              {addressMap[index]?.start ?? "Loading..."}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <MapPin className="w-3 h-3 text-red-600" />
                            <span className="font-medium">End:</span>
                            <span>
                              {addressMap[index]?.end ?? "Loading..."}
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
                    <Card key={stop.id} className="p-3 my-2 rounded-lg border">
                      <div className="flex justify-between mb-1">
                        <Badge variant="destructive">Stop {index + 1}</Badge>
                        <div className="flex items-center gap-2 text-muted-foreground font-mono text-xs">
                          <span>From prev:</span>
                          <span>{stop.distanceFromPrev.toFixed(2)} km</span>
                        </div>
                      </div>

                      <div className="text-xs space-y-1">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          {new Date(stop.startTime).toLocaleTimeString(
                            "en-GB",
                            {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                              hour12: true,
                              timeZone: "UTC",
                            }
                          )}
                        </div>
                        <div className="flex items-start gap-2 text-muted-foreground">
                          <MapPin className="w-3 h-3 mt-[2px]" />
                          <span className="leading-snug">
                            {addressMap[stop.id]?.end ?? "Fetching address..."}
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
