"use client";
import { useMemo, useEffect, useState, useCallback } from "react";
import { Combobox } from "@/components/ui/combobox";
import DateRangeFilter from "@/components/ui/DateRangeFilter";
import { useBranchData } from "@/hooks/useBranchData";
import { useDeviceData } from "@/hooks/useDeviceData";
import { useSchoolData } from "@/hooks/useSchoolData";
import { getDecodedToken } from "@/lib/jwt";
import Cookies from "js-cookie";
import { PlaybackControls } from "@/components/history/playback-controls";
import VehicleMap from "@/components/history/vehicle-map";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

type UserRole = "superAdmin" | "school" | "branchGroup" | "branch" | null;

export default function HistoryReport() {
  const { data: vehicleData } = useDeviceData();
  const { data: schoolData } = useSchoolData();
  const { data: branchData } = useBranchData();
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [selectedSchool, setSelectedSchool] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isGraphControlling, setIsGraphControlling] = useState(false); // Track if graph is controlling playback
  const [isMapExpanded, setIsMapExpanded] = useState(false);
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
  const [loading, setLoading] = useState(false);

  const currentData = data[currentIndex];

  useEffect(() => {
    const token = Cookies.get("token");
    const decoded = token ? getDecodedToken(token) : null;
    const role = decoded?.role;
    if (
      typeof role === "string" &&
      ["superAdmin", "school", "branchGroup", "branch"].includes(role)
    ) {
      setUserRole(role as UserRole);
    }
  }, []);

  // *****************************************For Filter (Start)***********************************************************//

  const schoolMetaData = useMemo(
    () =>
      Array.isArray(schoolData)
        ? schoolData.map((school) => ({
            value: school._id,
            label: school.schoolName,
          }))
        : [],
    [schoolData]
  );

  const branchMetaData = useMemo(() => {
    if (!Array.isArray(branchData)) return [];
    return branchData
      .filter((branch) =>
        userRole === "superAdmin"
          ? branch?.schoolId?._id === selectedSchool
          : true
      )
      .map((branch) => ({
        value: branch._id,
        label: branch.branchName,
      }));
  }, [branchData, userRole, selectedSchool]);

  const vehicleMetaData = useMemo(() => {
    if (!Array.isArray(vehicleData)) return [];
    return vehicleData
      .filter((vehicle) =>
        userRole === "superAdmin" || userRole === "school"
          ? vehicle?.branchId?._id === selectedBranch
          : true
      )
      .map((vehicle) => ({
        value: vehicle._id,
        label: vehicle.name,
      }));
  }, [vehicleData, userRole, selectedBranch]);

  const handleDateFilter = useMemo(
    () => (startDate: Date | null, endDate: Date | null) => {
      console.log("Selected Date Range:", startDate, endDate);
    },
    []
  );

  // *****************************************Auto Play Functionality (Start)***********************************************************//

  useEffect(() => {
    if (!isPlaying || currentIndex >= data.length - 1 || isGraphControlling)
      return;

    let animationFrameId: number;
    let lastTime = performance.now();
    const frameInterval = 1000 / playbackSpeed; // ms between frames

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
    setIsGraphControlling(false); // Resume normal playback
  }, [isPlaying]);

  const handleSeek = useCallback((index: number) => {
    setCurrentIndex(index);
    setIsGraphControlling(false); // Manual seek, resume normal behavior
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

  // *****************************************Auto Play Functionality (End)***********************************************************//

  const handleShow = () => {
    const url =
      "https://vts.credencetracker.com/backend/history/device-history-playback";
    const bearerToken =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InNhaXNodSIsImlkIjoiNjcxMzY1M2I2MTNjZjJkMmM1MzJlZDBlIiwidXNlcnMiOmZhbHNlLCJzdXBlcmFkbWluIjp0cnVlLCJ1c2VyIjpudWxsLCJyb2xlIjoic3VwZXJhZG1pbiIsImlhdCI6MTc1Nzc0NTE1MH0.rP639lrm5Z_LvgfIQ1czKR91Ftw7O_ZGAzijWsLZPic";

    const payload = {
      period: "Last Seven Days",
      from: "2025-09-10T00:01:00.000Z",
      to: "2025-09-17T11:37:04.248Z",
      deviceId: "3028",
    };

    setLoading(true);

    axios
      .post(url, payload, {
        headers: {
          Authorization: `Bearer ${bearerToken}`,
          "Content-Type": "application/json",
        },
      })
      .then((response) => {
        // const sortedData = [...response.data.deviceHistory].sort(
        //   (a, b) =>
        //     new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        // );
        setData(response.data.deviceHistory);
        setLoading(false);
        setCurrentIndex(0); // Reset to start
        console.log(response.data.deviceHistory);
      })
      .catch((error) => {
        console.error(error);
        setLoading(false);
      });
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
            {userRole === "superAdmin" && (
              <>
                <Combobox
                  items={schoolMetaData}
                  value={selectedSchool}
                  onValueChange={setSelectedSchool}
                  placeholder="Select School"
                  emptyMessage="No schools found"
                  width="w-[300px]"
                />
                <Combobox
                  items={branchMetaData}
                  value={selectedBranch}
                  onValueChange={setSelectedBranch}
                  placeholder="Select Branch"
                  emptyMessage="No branches found"
                  width="w-[300px]"
                />
              </>
            )}

            {userRole === "school" && (
              <>
                <Combobox
                  items={branchMetaData}
                  value={selectedBranch}
                  onValueChange={setSelectedBranch}
                  placeholder="Select Branch"
                  emptyMessage="No branches found"
                  width="w-[300px]"
                />
              </>
            )}

            <Combobox
              items={vehicleMetaData}
              value={selectedVehicle}
              onValueChange={setSelectedVehicle}
              placeholder="Select Vehicle"
              emptyMessage="No vehicles found"
              width="w-[300px]"
            />

            <DateRangeFilter
              onDateRangeChange={handleDateFilter}
              title="Search by Request Date"
            />

            <Button className="cursor-pointer" onClick={handleShow}>
              Show
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <div className="space-y-3">
          {/* Map Section */}
          <div className="w-full">
            {loading ? (
              <div className="flex flex-col space-y-3">
                <Skeleton className="h-[125px] w-[250px] rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
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
        </div>
      </section>
    </>
  );
}
