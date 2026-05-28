"use client";
import { useMemo, useEffect, useState, useRef, useCallback, Suspense } from "react";
import { Combobox } from "@/components/ui/combobox";
import DateRangeFilter from "@/components/ui/DateRangeFilter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import FullScreenSpinner from "@/components/RouteLoader";
import { formatDateToYYYYMMDD } from "@/util/formatDate";
import { api } from "@/services/apiService";
import TripsSidebar from "@/components/history/sliding-side-bar";
import { Menu, Gauge, Clock, MapPinOff, Save, Check } from "lucide-react";
import { toast } from "sonner";
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

const PALETTE_OPTIONS = [
  { name: "Sky Blue", value: "hsl(217, 91%, 60%)" },
  { name: "Red", value: "hsl(0, 84%, 60%)" },
  { name: "Emerald Green", value: "hsl(142, 71%, 45%)" },
  { name: "Amber Gold", value: "hsl(38, 92%, 50%)" },
  { name: "Violet Purple", value: "hsl(271, 91%, 65%)" },
  { name: "Rose Pink", value: "hsl(322, 81%, 55%)" },
  { name: "Cyan Teal", value: "hsl(187, 92%, 45%)" },
  { name: "Safety Orange", value: "hsl(24, 95%, 53%)" },
  { name: "Lime Green", value: "hsl(88, 74%, 48%)" },
  { name: "Sea Teal", value: "hsl(174, 86%, 40%)" },
  { name: "Magenta Fuchsia", value: "hsl(300, 76%, 50%)" },
  { name: "Indigo Blue", value: "hsl(245, 78%, 62%)" },
];

function HistoryReportContent() {
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [shouldFetch, setShouldFetch] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [showStopsOnMap, setShowStopsOnMap] = useState(false);
  const [activeStopId, setActiveStopId] = useState<number | null>(null);
  
  // Custom route color configuration states
  const [selectedColor, setSelectedColor] = useState<string>("hsl(217, 91%, 60%)");
  const [savedColors, setSavedColors] = useState<Record<string, string>>({});
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);

  const localUrl = process.env.NODE_ENV === "development"
    ? "http://localhost:5001"
    : process.env.NEXT_PUBLIC_LOCAL_URL;

  const fetchSavedColors = async () => {
    try {
      const res = await fetch(`${localUrl}/saved-colors`);
      const data = await res.json();
      if (data.success && data.colors) {
        setSavedColors(data.colors);
      }
    } catch (e) {
      console.error("Error loading saved colors map:", e);
    }
  };

  useEffect(() => {
    fetchSavedColors();
  }, [hasGenerated]);

  const handleSavePlayback = async () => {
    const finalUniqueId = uniqueIdFromUrl || selectedVehicle;
    if (!finalUniqueId) {
      toast.error("Please select a vehicle first");
      return;
    }
    if (!historyReport) {
      toast.error("No playback route data available to save");
      return;
    }

    // Check if the selected color is already assigned to a different vehicle
    const takenBy = Object.entries(savedColors).find(
      ([busId, col]) => col.toLowerCase() === selectedColor.toLowerCase() && busId !== String(finalUniqueId)
    );

    if (takenBy) {
      toast.error(`The color ${selectedColor} is already assigned to Bus ${takenBy[0]}. Please select a unique color.`);
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`${localUrl}/save-playback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uniqueId: finalUniqueId,
          data: historyReport,
          routeColor: selectedColor, // Custom selected color key!
        }),
      });

      const resData = await response.json();
      if (response.ok && resData.success) {
        const isOverwrite = !!savedColors[String(finalUniqueId)];
        if (isOverwrite) {
          toast.success(`Existing playback data for bus ${finalUniqueId} has been successfully rewritten and updated with the new data.`);
        } else {
          toast.success(`Successfully saved playback JSON data for bus: ${finalUniqueId}`);
        }
        fetchSavedColors(); // Refresh assigned states
      } else {
        toast.error(`Failed to save: ${resData.message}`);
      }
    } catch (err: any) {
      console.error("Error saving playback data:", err);
      toast.error(`Error saving playback data: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

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
  const deviceCategoryFromUrl = searchParams.get("deviceCategory");
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

  // ✅ Refs for direct DOM manipulation (avoids React re-renders during playback)
  const playbackProgressRef = useRef(0);
  const speedRef = useRef<HTMLSpanElement>(null);
  const timestampRef = useRef<HTMLSpanElement>(null);
  const distanceCoveredRef = useRef<HTMLSpanElement>(null);

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
        hour: "2-digit",
        minute: "2-digit",
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
      layout: {
        padding: {
          top: 0,
          bottom: 0,
        },
      },
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
            text: "Timestamp",
            font: { size: 18 },
          },
          ticks: {
            maxTicksLimit: 70,
            font: { size: 10 },
            minRotation: 45,
            maxRotation: 45,
            autoSkip: true,
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

  // ✅ Imperative progress handler — updates DOM directly without triggering React re-renders
  const handlePlaybackProgress = useCallback(
    (progress: number) => {
      playbackProgressRef.current = progress;

      if (!activePlayback || activePlayback.length === 0) return;

      const idx = Math.round((progress / 100) * (activePlayback.length - 1));
      const data = activePlayback[idx];
      if (!data) return;

      // Update speed
      if (speedRef.current) {
        speedRef.current.textContent = `${data.speed.toFixed(1)} kmph`;
      }

      // Update timestamp
      if (timestampRef.current) {
        const d = new Date(data.createdAt);
        if (!isNaN(d.getTime())) {
          const dateStr = d.toLocaleString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour12: true,
            timeZone: "UTC",
          });
          const timeStr = d.toLocaleString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
            timeZone: "UTC",
          });
          timestampRef.current.textContent = `${dateStr} ${timeStr}`;
        } else {
          timestampRef.current.textContent = "-- : --";
        }
      }

      // Update incremental distance
      if (distanceCoveredRef.current) {
        const first = activePlayback[0];
        const incDist = Math.max(
          0,
          (data?.attributes?.totalDistance ?? 0) -
          (first?.attributes?.totalDistance ?? 0)
        );
        distanceCoveredRef.current.textContent = `${(incDist / 1000).toFixed(2)} km`;
      }
    },
    [activePlayback]
  );

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
              {hasGenerated && historyReport && (
                <Button
                  className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white ml-2 flex items-center gap-1.5"
                  onClick={() => setIsColorModalOpen(true)}
                  disabled={isSaving}
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? "Saving..." : "Save Route Data"}
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* Sliding Menu Trigger */}
        <div>
          <Button
            className="fixed top-[225px] right-0 z-[9999] rounded-l-full rounded-r-none w-[68px] bg-[#0c235c] cursor-pointer shadow-[var(--shadow-panel)]"
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
                className={`w-full mt-3 transition-all duration-300 ease-in-out ${isMapExpanded
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
                  deviceCategory={deviceCategoryFromUrl || "CAR"}
                />
                <div>
                  <div
                    onClick={handleMapExpand}
                    className="h-3 w-full bg-[#0c235c] relative flex items-center justify-center hover:cursor-pointer"
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
                className={`w-full mt-3 transition-all duration-300 ease-in-out ${isMapExpanded
                  ? "h-[80vh] md:h-[60vh] lg:h-[70vh]"
                  : "h-[60vh] md:h-[45vh] lg:h-[55vh]"
                  }`}
                style={{ zIndex: 0 }}
              >
                {hasGenerated && (!activePlayback || activePlayback.length === 0) ? (
                  <div className="flex flex-col items-center justify-center w-full h-full bg-white/50 backdrop-blur-sm rounded-lg border-2 border-dashed border-gray-300">
                    <MapPinOff className="w-16 h-16 text-gray-400 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-700">No History Available</h3>
                    <p className="text-gray-500 mt-2 text-center max-w-md px-4">
                      No playback data found for the selected vehicle and date range.
                      <br />Please try adjusting your filters.
                    </p>
                  </div>
                ) : (
                  <VehicleMap
                    data={activePlayback}
                    stops={showStopsOnMap ? derivedStops : []}
                    activeStopId={activeStopId}
                    onStopClick={(id) => setActiveStopId(id)}
                    currentIndex={displayIndex}
                    isExpanded={isMapExpanded}
                    onProgressChange={handlePlaybackProgress}
                    stopAddressMap={stopAddressMap}
                    deviceCategory={deviceCategoryFromUrl || "CAR"}
                  />
                )}

                <div>
                  <div
                    onClick={handleMapExpand}
                    className="h-3 w-full bg-[#0c235c] relative flex items-center justify-center hover:cursor-pointer"
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
              <Card className="p-2 bg-[var(--gradient-panel)] rounded-t-none border-border shadow-[var(--shadow-panel)] space-y-1">
                {/* Info Row */}
                {currentData && activePlayback.length > 1 && (
                  <div className="flex gap-6 items-center flex-wrap">
                    {/* Speed */}
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Gauge className="w-4 h-4" />
                      <span>Speed</span>
                      <span ref={speedRef} className="bg-gray-200 px-2 py-1 rounded-sm">
                        {currentData.speed.toFixed(1)} kmph
                      </span>
                    </div>

                    {/* Timestamp */}
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Clock className="w-4 h-4" />
                      <span>Timestamp</span>
                      <span ref={timestampRef} className="bg-gray-200 px-2 py-1 rounded-sm">
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
                      <span ref={distanceCoveredRef} className="bg-blue-100 text-blue-700 px-2 py-1 rounded-sm font-medium">
                        {(incrementalDistance / 1000).toFixed(2)} km
                      </span>

                      <span className="text-muted-foreground">/</span>
                      {/* Total trip distance */}
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded-sm font-medium">
                        {(odometerDistance / 1000).toFixed(2)} km
                      </span>
                    </div>

                    {/* Trip Info */}
                    <div className="flex items-center gap-2 text-muted-foreground text-sm border-l pl-4 border-gray-300">
                      <span className="font-semibold text-black flex items-center">
                        {selectedTripIndex !== null ? (
                          `Trip ${selectedTripIndex + 1}`
                        ) : (
                          <>
                            Overall Playback
                            <span className="ml-2 text-xs font-normal text-muted-foreground bg-slate-100 px-2 py-0.5 rounded-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center gap-1">
                              <span>
                                {trips.length} Trips • {derivedStops.length} Stops
                              </span>
                              {trips.length > 0 && (
                                <span className="hidden sm:inline text-gray-400">|</span>
                              )}
                              {trips.length > 0 && (
                                <span>
                                  {new Date(trips[0][0].createdAt).toLocaleString("en-GB", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                    hour12: true,
                                    timeZone: "UTC",
                                  })}
                                  {" - "}
                                  {new Date(
                                    trips[trips.length - 1][
                                      trips[trips.length - 1].length - 1
                                    ].createdAt
                                  ).toLocaleString("en-GB", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                    hour12: true,
                                    timeZone: "UTC",
                                  })}
                                </span>
                              )}
                            </span>
                          </>
                        )}
                      </span>
                      {selectedTripIndex !== null && trips[selectedTripIndex] && (
                        <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-sm text-xs">
                          {new Date(
                            trips[selectedTripIndex][0].createdAt
                          ).toLocaleString("en-GB", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                            hour12: true,
                            timeZone: "UTC",
                          })}
                          {" - "}
                          {new Date(
                            trips[selectedTripIndex][
                              trips[selectedTripIndex].length - 1
                            ].createdAt
                          ).toLocaleString("en-GB", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                            hour12: true,
                            timeZone: "UTC",
                          })}
                        </span>
                      )}
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
                    <div style={{ height: "180px" }}>
                      <SpeedTimelineGraph
                        data={chartData}
                        options={chartOptions}
                        onHoverSeek={() => { }}
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
            selectedTripIndex={selectedTripIndex}
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

      {/* Visual Color Picker Modal Overlay */}
      {isColorModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 animate-scale-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                🎨 Select Route Color Key
              </h3>
            </div>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Choose a visually distinct color for this bus route. Occupied colors are marked with a warning dot.
            </p>

            {/* Visually stunning color swatches grid */}
            <div className="grid grid-cols-4 gap-3 justify-items-center mb-6">
              {PALETTE_OPTIONS.map((opt) => {
                const finalUniqueId = uniqueIdFromUrl || selectedVehicle;
                const takenBy = Object.entries(savedColors).find(
                  ([busId, col]) => col === opt.value && busId !== String(finalUniqueId)
                );
                const isTaken = !!takenBy;
                const isCurrentSelection = selectedColor === opt.value;
                
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSelectedColor(opt.value)}
                    className={`w-10 h-10 rounded-full border border-white dark:border-slate-800 cursor-pointer transition-all duration-200 flex items-center justify-center relative hover:scale-110 shadow-md ${
                      isCurrentSelection 
                        ? "scale-110 ring-4 ring-emerald-500 dark:ring-emerald-400 ring-offset-2 dark:ring-offset-slate-900" 
                        : "opacity-85 hover:opacity-100"
                    }`}
                    style={{ backgroundColor: opt.value }}
                    title={`${opt.name}${isTaken ? ` (Occupied by Bus ${takenBy[0]})` : " (Available)"}`}
                  >
                    {isCurrentSelection && (
                      <Check className="h-5 w-5 text-white font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]" />
                    )}
                    {isTaken && !isCurrentSelection && (
                      <span 
                        className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-amber-500 rounded-full border border-white dark:border-slate-900 shadow-sm flex items-center justify-center text-[10px]"
                        title={`Occupied by Bus ${takenBy[0]}`}
                      >
                        ⚠️
                      </span>
                    )}
                  </button>
                );
              })}
              
              {/* Custom Color Input for full color wheel freedom */}
              <label 
                className="w-10 h-10 rounded-full border border-white dark:border-slate-800 cursor-pointer transition-all duration-200 flex items-center justify-center shadow-md relative hover:scale-110 overflow-hidden"
                style={{
                  background: "conic-gradient(from 0deg, red, yellow, green, cyan, blue, magenta, red)",
                }}
                title="Custom Color Wheel Picker"
              >
                <input 
                  type="color"
                  value={selectedColor.startsWith("hsl") ? "#3b82f6" : selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <span className="text-[9px] text-white font-black drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">CUSTOM</span>
              </label>
            </div>

            {/* Visual Live Route Line Preview */}
            <div className="mb-6 p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-900">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2">
                Live Route Line Preview:
              </span>
              <div className="flex items-center gap-3">
                <div 
                  className="h-1.5 flex-grow rounded-full transition-colors duration-200" 
                  style={{ 
                    backgroundColor: selectedColor,
                    boxShadow: `0 0 10px ${selectedColor}`
                  }}
                />
                <span 
                  className="w-3.5 h-3.5 rounded-full border border-white dark:border-slate-800 shadow-md flex-shrink-0" 
                  style={{ 
                    backgroundColor: selectedColor,
                    boxShadow: `0 0 8px ${selectedColor}` 
                  }}
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() => setIsColorModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 px-4"
                onClick={() => {
                  setIsColorModalOpen(false);
                  handleSavePlayback();
                }}
                disabled={isSaving}
              >
                <Save className="h-4 w-4" />
                {isSaving ? "Saving..." : "Save & Apply"}
              </Button>
            </div>
          </div>
        </div>
      )}
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
