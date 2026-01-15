"use client";
import { useMemo, useEffect, useState, useRef, Suspense } from "react";
import { Combobox } from "@/components/ui/combobox";
import DateRangeFilter from "@/components/ui/DateRangeFilter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import FullScreenSpinner from "@/components/RouteLoader";
import { formatDateToYYYYMMDD } from "@/util/formatDate";
import { api } from "@/services/apiService";
import TripsSidebar from "@/components/history/sliding-side-bar";
import { Menu, Gauge, Clock } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useDeviceDropdownWithUniqueIdForHistory } from "@/hooks/useDropdown";
import { SpeedTimelineGraph } from "@/components/history/SpeedGraph";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { useQueryClient } from "@tanstack/react-query";
import { useHistoryReport } from "@/hooks/playback-history/useHistoryReport";
import { GiPathDistance } from "react-icons/gi";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);
type StopAddressMap = Record<number, string>;

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

function HistoryReportContent() {
  const queryClient = useQueryClient();
  const [shouldFetch, setShouldFetch] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [showStopsOnMap, setShowStopsOnMap] = useState(false);
  const [activeStopId, setActiveStopId] = useState<number | null>(null);

  // Trip-wise source data
  const [trips, setTrips] = useState<any[][]>([]);
  // What map is currently playing
  const [activePlayback, setActivePlayback] = useState<any[]>([]);
  // null = overall playback
  // number = trip index
  const [selectedTripIndex, setSelectedTripIndex] = useState<number | null>(
    null
  );
  const searchParams = useSearchParams();
  const uniqueIdFromUrl = searchParams.get("uniqueId");
  const [stopAddressMap, setStopAddressMap] = useState<StopAddressMap>({});

  const { data: vehicleData, isLoading: vehiclesLoading } =
    useDeviceDropdownWithUniqueIdForHistory();

  const [apiFilters, setApiFilters] = useState<Record<string, any>>({
    uniqueId: undefined,
    from: undefined,
    to: undefined,
  });

  const { data: historyReport, isFetching } = useHistoryReport(
    apiFilters,
    hasGenerated
  );

  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [isMapExpanded, setIsMapExpanded] = useState(true);
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // ✅ Track raw progress and throttled progress separately
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [throttledProgress, setThrottledProgress] = useState(0);
  const progressUpdateRef = useRef<number>();

  const [defaultDateRange, setDefaultDateRange] = useState<{
    startDate: Date;
    endDate: Date;
  } | null>(null);

  const metaPosition = [
    {
      attributes: {
        ignition: true,
        distance: 1270.9719643791261,
        totalDistance: 10052535.677769283,
      },
      deviceId: 2730,
      latitude: 21.10755111111111,
      longitude: 79.10318222222223,
      speed: 7.5594,
      course: 135,
    },
  ];

  // ✅ Throttle progress updates for chart (update every 100ms)
  useEffect(() => {
    if (progressUpdateRef.current) {
      cancelAnimationFrame(progressUpdateRef.current);
    }

    progressUpdateRef.current = requestAnimationFrame(() => {
      setThrottledProgress(playbackProgress);
    });

    return () => {
      if (progressUpdateRef.current) {
        cancelAnimationFrame(progressUpdateRef.current);
      }
    };
  }, [playbackProgress]);

  // ✅ Use throttled progress for chart rendering
  const currentIndex = useMemo(() => {
    if (!activePlayback || activePlayback.length === 0) return 0;
    return Math.round((throttledProgress / 100) * (activePlayback.length - 1));
  }, [throttledProgress, activePlayback]);

  // ✅ But use real progress for current data display
  const displayIndex = useMemo(() => {
    if (!activePlayback || activePlayback.length === 0) return 0;
    return Math.round((playbackProgress / 100) * (activePlayback.length - 1));
  }, [playbackProgress, activePlayback]);

  const currentData = activePlayback[displayIndex];

  const vehicleMetaData = useMemo(() => {
    if (!vehicleData || !Array.isArray(vehicleData)) return [];
    return vehicleData.map((vehicle) => ({
      value: vehicle.uniqueId,
      label: vehicle.name,
    }));
  }, [vehicleData]);

  const formatDateTime = (dateString: string) => {
    if (!dateString || dateString === "---") {
      return { date: "-- : --", time: "-- : --" };
    }
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return { date: "-- : --", time: "-- : --" };
    }
    return {
      date: date.toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour12: true,
        timeZone: "UTC",
      }),
      time: date.toLocaleString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
        timeZone: "UTC",
      }),
    };
  };

  const { date, time } = currentData
    ? formatDateTime(currentData.createdAt)
    : { date: "-- : --", time: "-- : --" };

  const baseChartData = useMemo(() => {
    if (!activePlayback || activePlayback.length === 0) {
      return {
        labels: [],
        speeds: [],
        baseDataset: {
          label: "Speed (km/h)",
          data: [],
          borderColor: "rgb(59, 130, 246)",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          borderWidth: 1.5,
          pointRadius: 0,
          pointHoverRadius: 0,
          tension: 0.1,
          fill: true,
        },
      };
    }

    const labels = activePlayback.map((item) => {
      const date = new Date(item.createdAt);
      return date.toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour12: true,
        timeZone: "UTC",
      });
    });

    const speeds = activePlayback.map((item) => item.speed);

    return {
      labels,
      speeds,
      baseDataset: {
        label: "Speed (km/h)",
        data: speeds,
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        borderWidth: 1.5,
        pointRadius: 0,
        pointHoverRadius: 0,
        tension: 0.1,
        fill: true,
      },
    };
  }, [activePlayback]);

  const chartData = useMemo(
    () => ({
      labels: baseChartData.labels,
      datasets: [
        baseChartData.baseDataset,
        {
          label: "Current Position",
          data: baseChartData.speeds.map((speed, index) =>
            index === currentIndex ? speed : null
          ),
          borderColor: "rgb(239, 68, 68)",
          backgroundColor: "rgb(239, 68, 68)",
          pointRadius: baseChartData.speeds.map((_, index) =>
            index === currentIndex ? 8 : 0
          ),
          pointHoverRadius: 10,
          pointBorderWidth: 2,
          pointBorderColor: "#fff",
          showLine: false,
          pointStyle: "circle",
          spanGaps: false,
          order: 0,
        },
      ],
    }),
    [baseChartData, currentIndex]
  );

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      // animation: true, // ✅ Completely disable animations
      animations: false,
      transitions: {
        active: {
          animation: {
            duration: 0,
          },
        },
      },
      interaction: {
        intersect: false,
        mode: "index" as const,
      },
      elements: {
        point: {
          radius: 0,
          hoverRadius: 0,
          hitRadius: 10,
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          enabled: true,
          mode: "index" as const,
          intersect: false,

          callbacks: {
            title: (context: any) => {
              const index = context[0].dataIndex;
              if (!activePlayback[index]) return "";
              const date = new Date(activePlayback[index].createdAt);
              return date.toLocaleString("en-GB", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true,
                timeZone: "UTC",
              });
            },
            label: (context: any) => {
              return `Speed: ${context.parsed.y.toFixed(1)} km/h`;
            },
          },
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          titleColor: "white",
          bodyColor: "white",
          borderColor: "rgb(239, 68, 68)",
          borderWidth: 1,
          cornerRadius: 6,
          displayColors: false,
        },
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: "Timeline",
            font: { size: 12 },
          },
          ticks: {
            maxTicksLimit: 8,
            font: { size: 10 },
          },
          grid: {
            color: "rgba(0, 0, 0, 0.1)",
          },
          animation: false,
        },
        y: {
          display: true,
          title: {
            display: true,
            text: "Speed (km/h)",
            font: { size: 12 },
          },
          beginAtZero: true,
          ticks: {
            font: { size: 10 },
          },
          grid: {
            color: "rgba(0, 0, 0, 0.1)",
          },
          animation: false,
        },
      },
      onHover: (event: any) => {
        if (event.native) {
          event.native.target.style.cursor = "pointer";
        }
      },
      onClick: (event: any, elements: any[]) => {
        if (elements.length > 0) {
          const index = elements[0].index;
          const newProgress = (index / (activePlayback.length - 1)) * 100;
          setPlaybackProgress(newProgress);
        }
      },
    }),
    [activePlayback]
  );

  const handleVehicleChange = (vehicleId: string) => {
    console.log("Vehicle change to:", vehicleId);
    setSelectedVehicle(vehicleId);
  };

  const handleDateFilter = useMemo(
    () => (startDate: Date | null, endDate: Date | null) => {
      const formattedStart = formatDateToYYYYMMDD(startDate);
      const formattedEnd = formatDateToYYYYMMDD(endDate);
      setFromDate(formattedStart + "T00:00:00.000Z");
      setToDate(formattedEnd + "T23:59:59.000Z");
    },
    []
  );

  const { odometerDistance, summedDistance } = useMemo(() => {
    if (!activePlayback || activePlayback.length < 2) {
      return { odometerDistance: 0, summedDistance: 0 };
    }

    const first = activePlayback[0];
    const last = activePlayback[activePlayback.length - 1];

    const odometerDistance =
      (last?.attributes?.totalDistance ?? 0) -
      (first?.attributes?.totalDistance ?? 0);

    // const summedDistance = activePlayback.reduce(
    //   (acc, item) => acc + (item?.attributes?.distance ?? 0),
    //   0
    // );

    return {
      odometerDistance: Math.max(0, odometerDistance),
      // summedDistance,
    };
  }, [activePlayback]);

  const incrementalDistance = useMemo(() => {
    if (!activePlayback || activePlayback.length < 2 || !currentData) return 0;

    const first = activePlayback[0];

    return Math.max(
      0,
      (currentData?.attributes?.totalDistance ?? 0) -
        (first?.attributes?.totalDistance ?? 0)
    );
  }, [activePlayback, currentData]);

  const formatDurationHMS = (ms: number): string => {
    if (!ms || ms < 0) return "00H:00M";

    const totalSeconds = Math.floor(ms / 1000);

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    const pad = (n: number) => n.toString().padStart(2, "0");

    return `${pad(hours)}H:${pad(minutes)}M`;
  };

  const derivedStops = useMemo(() => {
    return trips.map((trip, index) => {
      const endPoint = trip[trip.length - 1];
      // --- Stop duration (gap till next trip)
      const nextTrip = trips[index + 1];
      const stopStartTime = new Date(endPoint.createdAt).getTime();
      const stopEndTime = nextTrip
        ? new Date(nextTrip[0].createdAt).getTime()
        : stopStartTime;
      const stopDurationMs = stopEndTime - stopStartTime;

      // --- Distance from previous stop (using totalDistance)
      let distanceFromPrev = 0;

      if (index > 0) {
        const prevTrip = trips[index - 1];
        const prevEndPoint = prevTrip[prevTrip.length - 1];
        const currentTotal = endPoint.attributes?.totalDistance ?? 0;
        const prevTotal = prevEndPoint.attributes?.totalDistance ?? 0;
        distanceFromPrev = Math.max(0, (currentTotal - prevTotal) / 1000);
      }

      return {
        id: index,
        startTime: endPoint.createdAt,
        endTime: stopEndTime,
        duration: formatDurationHMS(stopDurationMs),
        distanceFromPrev,
        lat: endPoint.latitude,
        lng: endPoint.longitude,
      };
    });
  }, [trips]);

  const getTodayUtcRange = () => {
    const now = new Date();
    const start = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0,
        0,
        0
      )
    );

    const end = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        23,
        59,
        59
      )
    );

    return {
      from: start.toISOString(),
      to: end.toISOString(),
    };
  };

  const handleShow = () => {
    const finalUniqueId = uniqueIdFromUrl || selectedVehicle;
    if (!finalUniqueId) return;

    const finalFrom = fromDate || getTodayUtcRange().from;
    const finalTo = toDate || getTodayUtcRange().to;

    setApiFilters({
      uniqueId: finalUniqueId,
      from: finalFrom,
      to: finalTo,
      period: "Custom",
    });
    setHasGenerated(true);
  };
  
  // Sync uniqueId from URL with dropdown selection and set today's date
  useEffect(() => {
    if (uniqueIdFromUrl && vehicleData && !selectedVehicle) {
      const vehicleExists = vehicleData.some(
        (vehicle: any) => vehicle.uniqueId === uniqueIdFromUrl
      );

      if (vehicleExists) {
        setSelectedVehicle(uniqueIdFromUrl);

        const { from, to } = getTodayUtcRange();

        setApiFilters({
          uniqueId: uniqueIdFromUrl,
          from,
          to,
          period: "Custom",
        });

        setFromDate(from);
        setToDate(to);

        // ✅ Set default date range for DateRangeFilter
        const today = new Date();
        setDefaultDateRange({
          startDate: new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate()
          ),
          endDate: new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate()
          ),
        });

        setHasGenerated(true);
      }
    }
  }, [uniqueIdFromUrl, vehicleData, selectedVehicle]);

  useEffect(() => {
    if (!historyReport?.deviceDataByTrips) return;
    const history = historyReport.deviceDataByTrips;
    setTrips(history);
    setActivePlayback(history.flat());
    setSelectedTripIndex(null);
    setPlaybackProgress(0);
    setThrottledProgress(0);
  }, [historyReport]);

  useEffect(() => {
    if (!isFetching && shouldFetch) {
      setShouldFetch(false);
    }
  }, [isFetching, shouldFetch]);

  useEffect(() => {
    if (shouldFetch && hasGenerated) {
      queryClient.invalidateQueries({
        queryKey: ["history-report"],
      });
    }
  }, [shouldFetch, hasGenerated, queryClient]);

  const handleMapExpand = () => {
    setIsMapExpanded(!isMapExpanded);
  };

  return (
    <>
      <section>
        {/* Filters */}
        <header className="flex flex-col">
          <div className="flex gap-4">
            <Combobox
              items={vehicleMetaData}
              value={selectedVehicle}
              onValueChange={handleVehicleChange}
              placeholder="Select Vehicle"
              className="cursor-pointer"
              searchPlaceholder="Search vehicles..."
              emptyMessage="No vehicles found"
              width="w-[300px]"
            />
            <div className="flex gap-3">
              <DateRangeFilter
                onDateRangeChange={handleDateFilter}
                title="Select Date Range"
                maxDays={7}
                defaultStartDate={defaultDateRange?.startDate}
                defaultEndDate={defaultDateRange?.endDate}
              />
              <Button className="cursor-pointer" onClick={handleShow}>
                Show
              </Button>
            </div>
          </div>
        </header>

        {/* Sliding Menu Trigger */}
        <div>
          <Button
            className="fixed top-[225px] right-0 z-[9999] rounded-l-full rounded-r-none w-[68px] bg-[#f3c623] cursor-pointer shadow-[var(--shadow-panel)]"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu />
          </Button>
        </div>

        {/* Main Content */}
        <div className="space-y-3">
          {/* Map Section */}
          <div className="w-full">
            {isFetching ? (
              <div
                className={`w-full mt-3 transition-all duration-300 ease-in-out ${
                  isMapExpanded
                    ? "h-[100vh] md:h-[80vh] lg:h-[90vh]"
                    : "h-[50vh] md:h-[25vh] lg:h-[40vh]"
                }`}
                style={{ zIndex: 0 }}
              >
                <FullScreenSpinner />
                <VehicleMap
                  data={metaPosition}
                  currentIndex={displayIndex}
                  isExpanded={isMapExpanded}
                  onProgressChange={setPlaybackProgress}
                />
                <div>
                  <div
                    onClick={handleMapExpand}
                    className="h-3 w-full bg-[#f3c623] relative flex items-center justify-center hover:cursor-pointer"
                  >
                    <div className="flex flex-col items-center bg-[#d7a901] w-[100px]">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        className="text-gray-600"
                        style={{
                          transform: isMapExpanded
                            ? "rotate(180deg)"
                            : "rotate(0deg)",
                        }}
                      >
                        <path
                          d="M7 10L12 15L17 10"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        className="text-gray-600 -mt-3"
                        style={{
                          transform: isMapExpanded
                            ? "rotate(180deg)"
                            : "rotate(0deg)",
                        }}
                      >
                        <path
                          d="M7 10L12 15L17 10"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className={`w-full mt-3 transition-all duration-300 ease-in-out ${
                  isMapExpanded
                    ? "h-[80vh] md:h-[60vh] lg:h-[70vh]"
                    : "h-[50vh] md:h-[25vh] lg:h-[40vh]"
                }`}
                style={{ zIndex: 0 }}
              >
                <VehicleMap
                  data={activePlayback}
                  stops={showStopsOnMap ? derivedStops : []}
                  activeStopId={activeStopId}
                  onStopClick={(id) => setActiveStopId(id)}
                  currentIndex={displayIndex}
                  isExpanded={isMapExpanded}
                  onProgressChange={setPlaybackProgress}
                  stopAddressMap={stopAddressMap}
                />

                <div>
                  <div
                    onClick={handleMapExpand}
                    className="h-3 w-full bg-[#f3c623] relative flex items-center justify-center hover:cursor-pointer"
                  >
                    <div className="flex flex-col items-center bg-[#d7a901] w-[100px]">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        className="text-gray-600"
                        style={{
                          transform: isMapExpanded
                            ? "rotate(180deg)"
                            : "rotate(0deg)",
                        }}
                      >
                        <path
                          d="M7 10L12 15L17 10"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        className="text-gray-600 -mt-3"
                        style={{
                          transform: isMapExpanded
                            ? "rotate(180deg)"
                            : "rotate(0deg)",
                        }}
                      >
                        <path
                          d="M7 10L12 15L17 10"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ✅ Metrics Section with Speed Graph */}
          <div className="w-full">
            <div className="lg:col-span-2">
              <Card className="p-4 bg-[var(--gradient-panel)] rounded-t-none border-border shadow-[var(--shadow-panel)] space-y-3">
                {/* Info Row */}
                {currentData && activePlayback.length > 1 && (
                  <div className="flex gap-6 items-center flex-wrap">
                    {/* Speed */}
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Gauge className="w-4 h-4" />
                      <span>Speed</span>
                      <span className="bg-gray-200 px-2 py-1 rounded-sm">
                        {currentData.speed.toFixed(1)} kmph
                      </span>
                    </div>

                    {/* Timestamp */}
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Clock className="w-4 h-4" />
                      <span>Timestamp</span>
                      <span className="bg-gray-200 px-2 py-1 rounded-sm">
                        {date === "Invalid Date"
                          ? "-- : --"
                          : `${date} ${time}`}
                      </span>
                    </div>

                    {/* Distance */}
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <GiPathDistance className="w-4 h-4" />
                      <span>Distance Covered</span>
                      {/* Incremental distance till current playback */}
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-sm font-medium">
                        {(incrementalDistance / 1000).toFixed(2)} km
                      </span>

                      <span className="text-muted-foreground">/</span>
                      {/* Total trip distance */}
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded-sm font-medium">
                        {(odometerDistance / 1000).toFixed(2)} km
                      </span>
                    </div>

                    {/* Total Distance (Calculated)
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <span>Distance (Calculated)</span>
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-sm font-medium">
                        {(summedDistance / 1000).toFixed(2)} km
                      </span>
                    </div> */}
                  </div>
                )}

                {activePlayback.length > 1 && (
                  <div className="w-full h-[1px] bg-gray-300"></div>
                )}

                {/* Speed vs Timeline Graph */}
                {!isMapExpanded &&
                  activePlayback &&
                  activePlayback.length > 1 && (
                    <div style={{ height: "150px" }}>
                      <SpeedTimelineGraph
                        data={chartData}
                        options={chartOptions}
                        onHoverSeek={() => {}}
                        isExpanded={isMapExpanded}
                      />
                    </div>
                  )}
              </Card>
            </div>
          </div>

          {/* Sliding Side Bar */}
          <TripsSidebar
            trips={trips}
            isOpen={isSidebarOpen}
            fromDate={fromDate}
            toDate={toDate}
            selectedVehicle={selectedVehicle}
            onClose={() => setIsSidebarOpen(false)}
            onTripSelect={(index) => {
              setSelectedTripIndex(index);
              setActivePlayback(trips[index]);
              setPlaybackProgress(0);
            }}
            onOverallSelect={() => {
              setSelectedTripIndex(null);
              setActivePlayback(trips.flat());
              setPlaybackProgress(0);
            }}
            derivedStops={derivedStops}
            showStopsOnMap={showStopsOnMap}
            onToggleStops={() => setShowStopsOnMap((p) => !p)}
            activeStopId={activeStopId}
            onStopSelect={(id) => setActiveStopId(id)}
            stopAddressMap={stopAddressMap}
            setStopAddressMap={setStopAddressMap}
          />
        </div>
      </section>
    </>
  );
}

export default function HistoryReportPage() {
  return (
    <Suspense fallback={<FullScreenSpinner />}>
      <HistoryReportContent />
    </Suspense>
  );
}
