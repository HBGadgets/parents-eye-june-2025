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
import {
  MapPin,
  Clock,
  Navigation,
  X,
  Calendar,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeviceHistoryItem } from "@/data/sampleData";
import { reverseGeocodeMapTiler } from "@/hooks/useReverseGeocoding";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { useExport } from "@/hooks/useExport";
import { calculateDistance } from "@/util/calculate-distance";
import { toast } from "sonner";

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
  selectedVehicleImei?: string | null;
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
  fromDate,
  toDate,
  selectedVehicle,
  selectedVehicleImei,
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

  /* -------------------- Exporting State & Hook -------------------- */
  const [isExporting, setIsExporting] = useState(false);
  const { exportToPDF, exportToExcel } = useExport();

  /* -------------------- Trip Addresses State -------------------- */
  const [tripAddressMap, setTripAddressMap] = useState<
    Record<number, { start: string; end: string }>
  >({});
  const fetchedTripRef = useRef<Set<number>>(new Set());

  /* -------------------- Trip summaries -------------------- */
  const tripSummaries = useMemo(() => {
    return trips.map((trip, index) => {
      const start = trip[0];
      const end = trip[trip.length - 1];

      const maxSpeed = Math.max(...trip.map((p) => p.speed || 0));
      const avgSpeed =
        trip.reduce((sum, p) => sum + (p.speed || 0), 0) / trip.length;

      let distanceKm = 0;
      if (
        typeof end?.attributes?.totalDistance === "number" &&
        typeof start?.attributes?.totalDistance === "number" &&
        end.attributes.totalDistance >= start.attributes.totalDistance
      ) {
        distanceKm =
          (end.attributes.totalDistance - start.attributes.totalDistance) /
          1000;
      } else {
        let totalM = 0;
        for (let i = 1; i < trip.length; i++) {
          totalM += calculateDistance(
            trip[i - 1].latitude,
            trip[i - 1].longitude,
            trip[i].latitude,
            trip[i].longitude
          );
        }
        distanceKm = totalM / 1000;
      }

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
        distanceKm,
        maxSpeed,
        avgSpeed,
      };
    });
  }, [trips]);

  /* -------------------- Reverse Geocode for Trips & Stops -------------------- */

  useEffect(() => {
    tripSummaries.forEach((trip) => {
      if (tripAddressMap[trip.id]) return;
      if (fetchedTripRef.current.has(trip.id)) return;

      fetchedTripRef.current.add(trip.id);

      Promise.all([
        reverseGeocodeMapTiler(trip.startLat, trip.startLng),
        reverseGeocodeMapTiler(trip.endLat, trip.endLng),
      ])
        .then(([startAddr, endAddr]) => {
          setTripAddressMap((prev) => ({
            ...prev,
            [trip.id]: { start: startAddr, end: endAddr },
          }));
        })
        .catch(() => {
          setTripAddressMap((prev) => ({
            ...prev,
            [trip.id]: {
              start: `${trip.startLat.toFixed(4)}, ${trip.startLng.toFixed(4)}`,
              end: `${trip.endLat.toFixed(4)}, ${trip.endLng.toFixed(4)}`,
            },
          }));
        });
    });
  }, [tripSummaries, tripAddressMap]);

  useEffect(() => {
    derivedStops.forEach((stop) => {
      if (stopAddressMap[stop.id]) return;
      if (fetchedStopRef.current.has(stop.id)) return;

      fetchedStopRef.current.add(stop.id);

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

  const formatDateRangeDisplay = (from: string | null, to: string | null) => {
    if (!from || !to) return "N/A";
    const formatDate = (str: string) => {
      const d = new Date(str);
      if (isNaN(d.getTime())) return str;
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "UTC",
      });
    };
    const formattedFrom = formatDate(from);
    const formattedTo = formatDate(to);
    if (formattedFrom === formattedTo) {
      return formattedFrom;
    }
    return `${formattedFrom} – ${formattedTo}`;
  };

  /* -------------------- Export Handler -------------------- */
  const handleExport = async (type: "trip" | "stops", format: "excel" | "pdf") => {
    try {
      setIsExporting(true);

      const vehName = selectedVehicle || "N/A";
      const imeiNo = selectedVehicleImei || "N/A";

      if (type === "trip") {
        if (!tripSummaries.length) {
          toast.warning("No trip data available to export");
          return;
        }
        toast.info("Preparing trip report...");

        const enrichedTripData = await Promise.all(
          tripSummaries.map(async (trip) => {
            let startAddr = tripAddressMap[trip.id]?.start;
            let endAddr = tripAddressMap[trip.id]?.end;

            if (!startAddr || startAddr === "Loading...") {
              try {
                startAddr = await reverseGeocodeMapTiler(
                  trip.startLat,
                  trip.startLng
                );
              } catch {
                startAddr = `${trip.startLat.toFixed(4)}, ${trip.startLng.toFixed(4)}`;
              }
            }
            if (!endAddr || endAddr === "Loading...") {
              try {
                endAddr = await reverseGeocodeMapTiler(
                  trip.endLat,
                  trip.endLng
                );
              } catch {
                endAddr = `${trip.endLat.toFixed(4)}, ${trip.endLng.toFixed(4)}`;
              }
            }

            const startTimeFormatted = new Date(trip.startTime).toLocaleString(
              "en-GB",
              {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true,
                timeZone: "UTC",
              }
            );

            const endTimeFormatted = new Date(trip.endTime).toLocaleString(
              "en-GB",
              {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true,
                timeZone: "UTC",
              }
            );

            return {
              tripNo: `Trip ${trip.id + 1}`,
              vehicle: vehName,
              imei: imeiNo,
              startTime: startTimeFormatted,
              endTime: endTimeFormatted,
              startAddress: startAddr || "-",
              startCoordinates: `${trip.startLat.toFixed(6)}, ${trip.startLng.toFixed(6)}`,
              endAddress: endAddr || "-",
              endCoordinates: `${trip.endLat.toFixed(6)}, ${trip.endLng.toFixed(6)}`,
              duration: formatDuration(trip.duration),
              distance: trip.distanceKm.toFixed(2),
              maxSpeed: `${trip.maxSpeed.toFixed(0)} km/h`,
              avgSpeed: `${trip.avgSpeed.toFixed(0)} km/h`,
            };
          })
        );

        const exportColumns = [
          { key: "tripNo", header: "Trip #" },
          { key: "vehicle", header: "Vehicle No" },
          { key: "imei", header: "IMEI No" },
          { key: "startTime", header: "Start Time" },
          { key: "startAddress", header: "Start Address" },
          { key: "startCoordinates", header: "Start Coordinates" },
          { key: "endTime", header: "End Time" },
          { key: "endAddress", header: "End Address" },
          { key: "endCoordinates", header: "End Coordinates" },
          { key: "duration", header: "Duration" },
          { key: "distance", header: "Distance (KM)" },
          { key: "maxSpeed", header: "Max Speed" },
          { key: "avgSpeed", header: "Avg Speed" },
        ];

        const title = `Trip Report - ${vehName}`;
        const metadata: Record<string, string> = {};
        if (vehName && vehName !== "N/A") metadata["Vehicle No"] = vehName;
        if (imeiNo && imeiNo !== "N/A") metadata["IMEI No"] = imeiNo;
        if (fromDate && toDate) metadata["Date Range"] = formatDateRangeDisplay(fromDate, toDate);

        if (format === "excel") {
          await exportToExcel(enrichedTripData, exportColumns, { title, metadata });
        } else {
          await exportToPDF(enrichedTripData, exportColumns, { title, metadata });
        }
      } else {
        if (!derivedStops.length) {
          toast.warning("No stop data available to export");
          return;
        }
        toast.info("Preparing stops report...");

        const enrichedStopData = await Promise.all(
          derivedStops.map(async (stop, idx) => {
            let address = stopAddressMap[stop.id];
            if (!address || address === "Fetching address...") {
              try {
                address = await reverseGeocodeMapTiler(stop.lat, stop.lng);
              } catch {
                address = `${stop.lat.toFixed(4)}, ${stop.lng.toFixed(4)}`;
              }
            }

            const startTimeFormatted = new Date(stop.startTime).toLocaleString(
              "en-GB",
              {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true,
                timeZone: "UTC",
              }
            );

            const endTimeFormatted = new Date(stop.endTime).toLocaleString(
              "en-GB",
              {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true,
                timeZone: "UTC",
              }
            );

            return {
              stopNo: `Stop ${idx + 1}`,
              vehicle: vehName,
              imei: imeiNo,
              startTime: startTimeFormatted,
              endTime: endTimeFormatted,
              address: address || "-",
              coordinates: `${stop.lat.toFixed(6)}, ${stop.lng.toFixed(6)}`,
              duration: stop.duration,
              distanceFromPrev: `${stop.distanceFromPrev.toFixed(2)} km`,
            };
          })
        );

        const exportColumns = [
          { key: "stopNo", header: "Stop #" },
          { key: "vehicle", header: "Vehicle No" },
          { key: "imei", header: "IMEI No" },
          { key: "startTime", header: "Start Time" },
          { key: "endTime", header: "End Time" },
          { key: "address", header: "Address" },
          { key: "coordinates", header: "Coordinates" },
          { key: "duration", header: "Duration" },
          { key: "distanceFromPrev", header: "Dist From Prev" },
        ];

        const title = `Stops Report - ${vehName}`;
        const metadata: Record<string, string> = {};
        if (vehName && vehName !== "N/A") metadata["Vehicle No"] = vehName;
        if (imeiNo && imeiNo !== "N/A") metadata["IMEI No"] = imeiNo;
        if (fromDate && toDate) metadata["Date Range"] = formatDateRangeDisplay(fromDate, toDate);

        if (format === "excel") {
          await exportToExcel(enrichedStopData, exportColumns, { title, metadata });
        } else {
          await exportToPDF(enrichedStopData, exportColumns, { title, metadata });
        }
      }
    } catch (err: any) {
      console.error("Export error:", err);
      toast.error(`Export failed: ${err?.message || "Unknown error"}`);
    } finally {
      setIsExporting(false);
    }
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
        <Card className="h-full border-0 rounded-none flex flex-col">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as any)}
            className="h-full flex flex-col"
          >
            <CardHeader className="space-y-3 pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Navigation className="w-5 h-5 text-primary" />
                  Playback
                </CardTitle>

                <div className="flex items-center gap-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isExporting}
                        className="h-8 gap-1.5 text-xs font-medium cursor-pointer shadow-sm hover:bg-accent"
                      >
                        {isExporting ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                        ) : (
                          <Download className="w-3.5 h-3.5 text-primary" />
                        )}
                        <span>Export</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52 z-[10000]">
                      <DropdownMenuItem
                        onClick={() => handleExport("trip", "excel")}
                        className="cursor-pointer font-medium"
                      >
                        <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-600" />
                        Trip Report (Excel)
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleExport("trip", "pdf")}
                        className="cursor-pointer font-medium"
                      >
                        <FileText className="w-4 h-4 mr-2 text-rose-600" />
                        Trip Report (PDF)
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleExport("stops", "excel")}
                        className="cursor-pointer font-medium"
                      >
                        <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-600" />
                        Stops Report (Excel)
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleExport("stops", "pdf")}
                        className="cursor-pointer font-medium"
                      >
                        <FileText className="w-4 h-4 mr-2 text-rose-600" />
                        Stops Report (PDF)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="h-8 w-8 p-0 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
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
      transition-colors duration-300 cursor-pointer text-xs"
                    >
                      Trip
                    </TabsTrigger>

                    <TabsTrigger
                      value="stops"
                      onClick={() => setActiveTab("stops")}
                      className="relative z-10 rounded-full
      data-[state=active]:text-primary
      data-[state=inactive]:text-muted-foreground
      transition-colors duration-300 cursor-pointer text-xs"
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
                          className="w-full cursor-pointer transformations duration-300 rounded-full text-xs h-8"
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
                className="w-full cursor-pointer text-xs h-9"
                onClick={onOverallSelect}
              >
                Overall Playback
              </Button>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto space-y-3">
              {/* TRIPS */}
              <TabsContent value="trip" className="mt-0 space-y-2">
                {tripSummaries.length ? (
                  <>
                    <div className="flex justify-end mb-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isExporting}
                            className="w-full h-8 gap-1.5 text-xs font-medium cursor-pointer border-dashed border-primary/40 text-primary hover:bg-primary/5"
                          >
                            {isExporting ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Download className="w-3.5 h-3.5" />
                            )}
                            <span>Download Trip Report</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 z-[10000]">
                          <DropdownMenuItem
                            onClick={() => handleExport("trip", "excel")}
                            className="cursor-pointer"
                          >
                            <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-600" />
                            Excel Format (.xlsx)
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleExport("trip", "pdf")}
                            className="cursor-pointer"
                          >
                            <FileText className="w-4 h-4 mr-2 text-rose-600" />
                            PDF Format (.pdf)
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {tripSummaries.map((trip, index) => (
                      <Card
                        key={trip.id}
                        onClick={() => onTripSelect(index)}
                        className={`cursor-pointer p-3 rounded-lg border transition-all duration-300 
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

                        <div className="text-sm space-y-1 mt-2">
                          <div className="flex items-center gap-2 text-xs">
                            <Calendar className="w-3 h-3 text-muted-foreground" />
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
                          <div className="flex items-center gap-2 text-xs">
                            <Clock className="w-3 h-3 text-muted-foreground" />
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
                          <div className="text-xs text-muted-foreground space-y-1 pt-1">
                            <div className="flex items-start gap-2">
                              <div>
                                <MapPin className="w-3 h-3 text-green-600 mt-[2px]" />
                              </div>
                              <span className="font-medium">Start:</span>
                              <span className="leading-snug">
                                {tripAddressMap[index]?.start ??
                                  stopAddressMap[index] ??
                                  "Loading..."}
                              </span>
                            </div>

                            <div className="flex items-start gap-2">
                              <div>
                                <MapPin className="w-3 h-3 text-red-600 mt-[2px]" />
                              </div>
                              <span className="font-medium">End:</span>
                              <span className="leading-snug">
                                {tripAddressMap[index]?.end ??
                                  stopAddressMap[index] ??
                                  "Loading..."}
                              </span>
                            </div>
                          </div>

                          <div className="flex justify-between text-xs pt-1 border-t mt-2 text-muted-foreground">
                            <span>Dist: {trip.distanceKm.toFixed(2)} km</span>
                            <span>Max: {trip.maxSpeed.toFixed(0)} km/h</span>
                            <span>Avg: {trip.avgSpeed.toFixed(0)} km/h</span>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </>
                ) : (
                  <div className="text-center py-10 text-muted-foreground">
                    No trips detected
                  </div>
                )}
              </TabsContent>

              {/* STOPS */}
              <TabsContent value="stops" className="mt-0 space-y-2">
                {derivedStops.length ? (
                  <>
                    <div className="flex justify-end mb-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isExporting}
                            className="w-full h-8 gap-1.5 text-xs font-medium cursor-pointer border-dashed border-primary/40 text-primary hover:bg-primary/5"
                          >
                            {isExporting ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Download className="w-3.5 h-3.5" />
                            )}
                            <span>Download Stops Report</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 z-[10000]">
                          <DropdownMenuItem
                            onClick={() => handleExport("stops", "excel")}
                            className="cursor-pointer"
                          >
                            <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-600" />
                            Excel Format (.xlsx)
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleExport("stops", "pdf")}
                            className="cursor-pointer"
                          >
                            <FileText className="w-4 h-4 mr-2 text-rose-600" />
                            PDF Format (.pdf)
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {derivedStops.map((stop, index) => (
                      <Card
                        key={stop.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-all duration-300 ${
                          activeStopId === stop.id
                            ? "border-red-500 bg-red-50 shadow-md"
                            : ""
                        }`}
                        onClick={() => onStopSelect && onStopSelect(stop.id)}
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

                        <div className="text-xs space-y-1 mt-2">
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
                    ))}
                  </>
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
