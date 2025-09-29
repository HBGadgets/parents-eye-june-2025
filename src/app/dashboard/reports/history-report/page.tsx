"use client";
import { useMemo, useEffect, useState, useCallback } from "react";
import { Combobox } from "@/components/ui/combobox";
import DateRangeFilter from "@/components/ui/DateRangeFilter";
import { useDeviceData } from "@/hooks/useDeviceData";
import { PlaybackControls } from "@/components/history/playback-controls";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import FullScreenSpinner from "@/components/RouteLoader";
import { formatDateToYYYYMMDD } from "@/util/formatDate";
import { api } from "@/services/apiService";
import TripsSidebar from "@/components/history/sliding-side-bar";
import { Menu } from "lucide-react";
import dynamic from "next/dynamic";

// Dynamically import VehicleMap with SSR disabled
const VehicleMap = dynamic(() => import("@/components/history/vehicle-map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading map...</p>
      </div>
    </div>
  ),
});

export default function HistoryReport() {
  const [searchTerm, setSearchTerm] = useState("");

  const {
    data: vehicleData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: vehiclesLoading,
  } = useDeviceData({ searchTerm });

  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isGraphControlling, setIsGraphControlling] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [fromDate, setFromDate] = useState<String | null>(null);
  const [toDate, setToDate] = useState<String | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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

  // Flatten all pages of vehicle data
  const allVehicles = useMemo(() => {
    if (!vehicleData?.pages) return [];
    return vehicleData.pages.flat();
  }, [vehicleData]);

  const vehicleMetaData = useMemo(() => {
    if (!Array.isArray(allVehicles)) return [];
    return allVehicles.map((vehicle) => ({
      value: vehicle.deviceId.toString(),
      label: vehicle.name,
    }));
  }, [allVehicles]);

  useEffect(() => {
    console.log("Selected Vehicle ID:", selectedVehicle);
  }, [selectedVehicle]);

  const handleDateFilter = useMemo(
    () => (startDate: Date | null, endDate: Date | null) => {
      const formattedStart = formatDateToYYYYMMDD(startDate);
      const formattedEnd = formatDateToYYYYMMDD(endDate);
      setFromDate(formattedStart + "T00:00:00.000Z");
      setToDate(formattedEnd + "T23:59:59.000Z");
    },
    []
  );

  // Handle infinite scroll for vehicle combobox
  const handleVehicleReachEnd = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Handle search functionality with debounce
  const handleSearchChange = useCallback((search: string) => {
    setSearchTerm(search);
  }, []);

  // *****************************************Auto Play Functionality (Start)***********************************************************//

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
      setLoading(true);
      const response = await api.get(
        `/device-history-playback?deviceId=${selectedVehicle}&from=${fromDate}&to=${toDate}`
      );

      setData(response.deviceHistory);
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
              onValueChange={setSelectedVehicle}
              placeholder="Select Vehicle"
              searchPlaceholder="Search vehicles..."
              emptyMessage="No vehicles found"
              width="w-[300px]"
              infiniteScroll={true}
              limit={20}
              onReachEnd={handleVehicleReachEnd}
              isLoadingMore={isFetchingNextPage}
              onSearchChange={handleSearchChange}
              searchValue={searchTerm}
            />
            <DateRangeFilter
              onDateRangeChange={handleDateFilter}
              title="Select Date Range"
              maxDays={7}
            />

            <Button className="cursor-pointer" onClick={handleShow}>
              Show
            </Button>
          </div>
        </header>

        {/* Sliding Menu Trigger */}
        <div>
          <Button
            className="fixed top-[225px] right-0 z-[9999] rounded-l-full rounded-r-none  w-[68px] bg-[#f3c623] cursor-pointer shadow-[var(--shadow-panel)]"
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
                    ? "h-[600px] md:h-[400px] lg:h-[500px]"
                    : "h-[400px] md:h-[200px] lg:h-[330px]"
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
                    {/* Down arrow with background */}
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
                    ? "h-[600px] md:h-[400px] lg:h-[500px]"
                    : "h-[400px] md:h-[200px] lg:h-[330px]"
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
                    {/* Down arrow with background */}
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

          {/* Controls and Metrics in Responsive Layout */}
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
