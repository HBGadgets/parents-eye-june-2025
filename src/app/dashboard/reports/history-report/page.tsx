"use client";
import {
  useMemo,
  useEffect,
  useState,
  useCallback,
  useRef,
  Suspense,
} from "react";
import { Combobox } from "@/components/ui/combobox";
import DateRangeFilter from "@/components/ui/DateRangeFilter";
import { PlaybackControls } from "@/components/history/playback-controls";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import FullScreenSpinner from "@/components/RouteLoader";
import { formatDateToYYYYMMDD } from "@/util/formatDate";
import { api } from "@/services/apiService";
import TripsSidebar from "@/components/history/sliding-side-bar";
import { Menu } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useDeviceDropdownWithUniqueIdForHistory } from "@/hooks/useDropdown";

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
  const searchParams = useSearchParams();
  const router = useRouter();
  const vehicleIdFromUrl = searchParams.get("vehicleId");
  const nameFromUrl = searchParams.get("name");
  const branchId = searchParams.get("branchId"); // Get branchId from URL if needed

  // Track if this is initial load from dashboard
  const isFromDashboardRef = useRef(false);
  const hasInitializedRef = useRef(false);

  // Use the new dropdown hook
  const { data: vehicleData, isLoading: vehiclesLoading } =
    useDeviceDropdownWithUniqueIdForHistory();

  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isGraphControlling, setIsGraphControlling] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [fromDate, setFromDate] = useState<String | null>(null);
  const [toDate, setToDate] = useState<String | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Add state for default date range (for UI display)
  const [defaultDateRange, setDefaultDateRange] = useState<{
    startDate: Date;
    endDate: Date;
  } | null>(null);

  const [data, setData] = useState([
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
      createdAt: "2025-09-09T07:36:36.720Z",
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
      createdAt: "2025-09-09T07:36:36.720Z",
    },
  ];

  const [loading, setLoading] = useState(false);
  const currentData = data[currentIndex];

  // Transform dropdown data to combobox format
  const vehicleMetaData = useMemo(() => {
    if (!vehicleData || !Array.isArray(vehicleData)) return [];
    return vehicleData.map((vehicle) => ({
      value: vehicle.uniqueId,
      label: vehicle.name,
    }));
  }, [vehicleData]);

  // Initialize dashboard redirect detection and auto-setup
  useEffect(() => {
    if (!hasInitializedRef.current && vehicleIdFromUrl) {
      isFromDashboardRef.current = true;
      hasInitializedRef.current = true;

      console.log(
        "Detected redirect from dashboard with vehicleId:",
        vehicleIdFromUrl
      );

      // Set today's date range as default when coming from dashboard
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

  // Pre-select vehicle from URL parameter
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

  // Auto-load data ONLY when coming from dashboard
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

  // Handle vehicle selection changes
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

  useEffect(() => {
    if (!isPlaying || currentIndex >= data.length - 1 || isGraphControlling)
      return;

    let animationFrameId: number;
    let lastTime = performance.now();
    const frameInterval = 1000 / playbackSpeed;

    function tick(currentTime: number) {
      const elapsed = currentTime - lastTime;

      if (elapsed >= frameInterval) {
        setCurrentIndex((prev) => {
          const next = prev + 1;
          if (next >= data.length - 1) {
            setIsPlaying(false);
            return Math.min(next, data.length - 1);
          }
          return next;
        });
        lastTime = currentTime;
      }

      animationFrameId = requestAnimationFrame(tick);
    }

    animationFrameId = requestAnimationFrame(tick);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isPlaying, currentIndex, data.length, playbackSpeed, isGraphControlling]);

  const handlePlayPause = useCallback(() => {
    setIsPlaying(!isPlaying);
    setIsGraphControlling(false);
  }, [isPlaying]);

  const handleSeek = useCallback((index: number) => {
    setCurrentIndex(index);
    setIsGraphControlling(false);
  }, []);

  const handlePrevious = () => {
    setCurrentIndex(Math.max(0, currentIndex - 1));
    setIsGraphControlling(false);
  };

  const handleNext = () => {
    const next = Math.min(data.length - 1, currentIndex + 1);
    setCurrentIndex(next);
    setIsGraphControlling(false);
    if (next >= data.length - 1) {
      setIsPlaying(false);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
  };

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

      const history = response.deviceHistory || [];
      setData(history);
    } catch (error) {
      console.error("Error fetching history data:", error);
      alert("Failed to fetch data. Please try again.");
    } finally {
      setLoading(false);
      setCurrentIndex(0);
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
              >
                <FullScreenSpinner />
                <VehicleMap
                  data={metaPosition}
                  currentIndex={currentIndex}
                  isExpanded={isMapExpanded}
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
              >
                <VehicleMap
                  data={data}
                  currentIndex={currentIndex}
                  isExpanded={isMapExpanded}
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

          {/* Controls and Metrics */}
          <div className="w-full">
            <div className="lg:col-span-2">
              <Card className="p-4 bg-[var(--gradient-panel)] rounded-t-none border-border shadow-[var(--shadow-panel)]">
                <PlaybackControls
                  isPlaying={isPlaying}
                  currentIndex={currentIndex}
                  totalPoints={data.length}
                  onPlayPause={handlePlayPause}
                  onSeek={handleSeek}
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                  playbackSpeed={playbackSpeed}
                  onSpeedChange={handleSpeedChange}
                  currentData={currentData}
                  historyData={data}
                  isExpanded={isMapExpanded}
                />
              </Card>
            </div>
          </div>

          {/* Sliding Side Bar */}
          <TripsSidebar
            data={data}
            currentIndex={currentIndex}
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
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
