"use client";
import {
  useMemo,
  useEffect,
  useState,
  useRef,
  Suspense,
} from "react";
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
import { deviceWithTrip } from "@/data/playback-nested";

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
  const router = useRouter();
  const vehicleIdFromUrl = searchParams.get("vehicleId");
  const nameFromUrl = searchParams.get("name");
  const branchId = searchParams.get("branchId");

  const isFromDashboardRef = useRef(false);
  const hasInitializedRef = useRef(false);

  const { data: vehicleData, isLoading: vehiclesLoading } =
    useDeviceDropdownWithUniqueIdForHistory();

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

  const [data, setData] = useState([
    {
      attributes: {
        distance: 0.0,
        totalDistance: 0.0,
      },
      latitude: 21.10755111111111,
      longitude: 79.10318222222223,
      speed: 0.0,
      course: 135,
      createdAt: "---",
    },
  ]);

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

  const [loading, setLoading] = useState(false);

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
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString("en-US"),
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
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
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
              return date.toLocaleString();
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

  useEffect(() => {
    if (!hasInitializedRef.current && vehicleIdFromUrl) {
      isFromDashboardRef.current = true;
      hasInitializedRef.current = true;

      console.log(
        "Detected redirect from dashboard with vehicle unique ID:",
        vehicleIdFromUrl
      );

      const today = new Date();
      setDefaultDateRange({
        startDate: today,
        endDate: today,
      });

      const formattedStart = formatDateToYYYYMMDD(today);
      const formattedEnd = formatDateToYYYYMMDD(today);
      setFromDate(formattedStart + "T00:00:00.000Z");
      setToDate(formattedEnd + "T23:59:59.000Z");
    } else if (!hasInitializedRef.current) {
      isFromDashboardRef.current = false;
      hasInitializedRef.current = true;
      console.log("Direct page visit detected");
    }
  }, [vehicleIdFromUrl, nameFromUrl]);

  useEffect(() => {
    if (
      vehicleIdFromUrl &&
      vehicleData &&
      vehicleData.length > 0 &&
      isFromDashboardRef.current &&
      !selectedVehicle
    ) {
      const vehicleExists = vehicleData.find(
        (vehicle) => vehicle.value.toString() === vehicleIdFromUrl
      );
      if (vehicleExists) {
        console.log("Auto-selecting vehicle:", vehicleExists.label);
        setSelectedVehicle(vehicleIdFromUrl);
      }
    }
  }, [vehicleIdFromUrl, vehicleData, selectedVehicle]);

  useEffect(() => {
    if (
      selectedVehicle &&
      fromDate &&
      toDate &&
      isFromDashboardRef.current &&
      vehicleIdFromUrl
    ) {
      isFromDashboardRef.current = false;
    }
  }, [selectedVehicle, fromDate, toDate, vehicleIdFromUrl]);

  const handleVehicleChange = (vehicleId: string) => {
    console.log("Vehicle change to:", vehicleId);
    setSelectedVehicle(vehicleId);
  };

  const handleDateFilter = useMemo(
    () => (startDate: Date | null, endDate: Date | null) => {
      console.log("Manual date filter change");
      const formattedStart = formatDateToYYYYMMDD(startDate);
      const formattedEnd = formatDateToYYYYMMDD(endDate);
      setFromDate(formattedStart + "T00:00:00.000Z");
      setToDate(formattedEnd + "T23:59:59.000Z");
    },
    []
  );

  const handleShow = async () => {
    if (!selectedVehicle) {
      alert("Please select a vehicle.");
      return;
    }

    if (!fromDate || !toDate) {
      alert("Please select a valid date range.");
      return;
    }

    try {
      console.log("Manual show button clicked");
      setLoading(true);

      const response = await api.get(
        `/device-history-playback?uniqueId=${selectedVehicle}&from=${fromDate}&to=${toDate}`
      );

      // const history = response.deviceHistory || [];
      const history = deviceWithTrip || []; // Array<Array<Point>>
      setTrips(history);
      // setData(history.flat());

      // Default to overall playback
      const overall = history.flat();
      setActivePlayback(overall);
      setSelectedTripIndex(null);


      setPlaybackProgress(0);
      setThrottledProgress(0);
    } catch (error) {
      console.error("Error fetching history data:", error);
      alert("Failed to fetch data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
              searchPlaceholder="Search vehicles..."
              emptyMessage="No vehicles found"
              width="w-[300px]"
            />
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
            {loading ? (
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
            )}
          </div>

          {/* ✅ Metrics Section with Speed Graph */}
          <div className="w-full">
            <div className="lg:col-span-2">
              <Card className="p-4 bg-[var(--gradient-panel)] rounded-t-none border-border shadow-[var(--shadow-panel)] space-y-3">
                {/* Info Row */}
                {currentData && activePlayback.length > 1 && (
                  <div className="flex gap-5 items-center">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Gauge className="w-4 h-4" />
                      <span>Speed</span>
                      <span className="bg-gray-200 px-2 py-1 rounded-sm">
                        {currentData.speed.toFixed(1)} kmph
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Clock className="w-4 h-4" />
                      <span>Timestamp</span>
                      <span className="bg-gray-200 px-2 py-1 rounded-sm">
                        {date === "Invalid Date"
                          ? "-- : --"
                          : `${date} ${time}`}
                      </span>
                    </div>
                  </div>
                )}

                {activePlayback.length > 1 && (
                  <div className="w-full h-[1px] bg-gray-300"></div>
                )}

                {/* Speed vs Timeline Graph */}
                {!isMapExpanded && activePlayback && activePlayback.length > 1 && (
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
