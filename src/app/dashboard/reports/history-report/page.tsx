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
import { Menu, Gauge, Clock, MapPinOff, Save, Check, RotateCcw, ZoomIn, List, Activity, Search, MapPin, Eye, BatteryCharging, Car, ExternalLink } from "lucide-react";
import {
  Tooltip as UITooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useDeviceDropdownWithUniqueIdForHistory } from "@/hooks/useDropdown";
import { bleService } from "@/services/api/bleService";
import { SpeedTimelineGraph, type SpeedTimelineGraphHandle } from "@/components/history/SpeedGraph";
import type { VehicleMapHandle } from "@/components/history/vehicle-map";
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
import { useQueryClient, useQuery } from "@tanstack/react-query";
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
// Cast to preserve ref forwarding (next/dynamic strips ref by default)
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
}) as any;

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
  const router = useRouter();
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
    const finalUniqueId = selectedVehicle || uniqueIdFromUrl;
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
  // Base playback before graph range selection filter
  const [basePlayback, setBasePlayback] = useState<any[]>([]);
  // What map is currently playing
  const [activePlayback, setActivePlayback] = useState<any[]>([]);
  // Is custom range selection active on graph
  const [isRangeFiltered, setIsRangeFiltered] = useState(false);
  // null = overall playback
  // number = trip index
  const [selectedTripIndex, setSelectedTripIndex] = useState<number | null>(
    null
  );
  const searchParams = useSearchParams();
  const uniqueIdFromUrl = searchParams.get("uniqueId");
  const deviceCategoryFromUrl = searchParams.get("deviceCategory");
  const [stopAddressMap, setStopAddressMap] = useState<StopAddressMap>({});

  const isInitialBle =
    deviceCategoryFromUrl === "BLE" ||
    (uniqueIdFromUrl ? String(uniqueIdFromUrl).startsWith("GeoTag-") : false);
  const [deviceType, setDeviceType] = useState<"VEHICLE" | "BLE">(
    isInitialBle ? "BLE" : "VEHICLE"
  );
  const isGeoTagMode = deviceType === "BLE";

  // Only query BLE devices when in GeoTag mode (prevents calling /api/ble-devices on default vehicle mode)
  const { data: bleDevicesData, isLoading: bleDevicesLoading } = useQuery({
    queryKey: ["ble-devices-history-dropdown"],
    queryFn: () => bleService.getBleDevices({ limit: 1000 }),
    enabled: isGeoTagMode,
    staleTime: 5 * 60 * 1000,
  });

  const { data: vehicleData, isLoading: vehiclesLoading } =
    useDeviceDropdownWithUniqueIdForHistory();

  const combinedVehicleData = useMemo(() => {
    const list: any[] = Array.isArray(vehicleData) ? [...vehicleData] : [];
    if (
      uniqueIdFromUrl &&
      !list.some((v) => String(v.uniqueId) === String(uniqueIdFromUrl))
    ) {
      const isBleTarget =
        deviceCategoryFromUrl === "BLE" ||
        String(uniqueIdFromUrl).toLowerCase().startsWith("geotag");
      if (!isBleTarget) {
        list.push({
          uniqueId: uniqueIdFromUrl,
          name: uniqueIdFromUrl,
          category: deviceCategoryFromUrl || "CAR",
          isBle: false,
        });
      }
    }
    return list;
  }, [vehicleData, uniqueIdFromUrl, deviceCategoryFromUrl]);

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
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [bottomView, setBottomView] = useState<"packets" | "graph">("packets");
  const [packetSearch, setPacketSearch] = useState("");
  const [bleGraphMetric, setBleGraphMetric] = useState<"speed" | "battery">("speed");
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Ble dropdown items for GeoTag mode
  const bleDropdownItems = useMemo(() => {
    const devices = bleDevicesData?.devices || [];
    const list = devices.map((d: any) => {
      const devId = d.deviceId != null ? String(d.deviceId) : String(d.sn || d.uniqueId);
      const displayLabel = d.name
        ? `${d.name} (${d.sn || devId})`
        : d.sn
        ? `${d.sn} (ID: ${devId})`
        : String(devId);
      return {
        value: devId,
        label: displayLabel,
      };
    });
    const isBleTarget =
      deviceCategoryFromUrl === "BLE" ||
      (uniqueIdFromUrl ? String(uniqueIdFromUrl).toLowerCase().startsWith("geotag") : false);

    if (
      uniqueIdFromUrl &&
      isBleTarget &&
      !list.some((item) => String(item.value) === String(uniqueIdFromUrl))
    ) {
      list.unshift({
        value: String(uniqueIdFromUrl),
        label: String(uniqueIdFromUrl),
      });
    }
    return list;
  }, [bleDevicesData, uniqueIdFromUrl, deviceCategoryFromUrl]);

  // Vehicle dropdown items for Vehicle mode
  const vehicleDropdownItems = useMemo(() => {
    if (!combinedVehicleData || !Array.isArray(combinedVehicleData)) return [];
    return combinedVehicleData
      .filter(
        (v: any) =>
          v.category !== "BLE" &&
          !v.isBle &&
          !String(v.uniqueId).startsWith("GeoTag-")
      )
      .map((vehicle: any) => ({
        value: String(vehicle.uniqueId),
        label: vehicle.name || String(vehicle.uniqueId),
      }));
  }, [combinedVehicleData]);

  const dropdownItems = isGeoTagMode ? bleDropdownItems : vehicleDropdownItems;

  // ✅ Track raw progress and throttled progress separately
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [throttledProgress, setThrottledProgress] = useState(0);
  const progressUpdateRef = useRef<number | undefined>(undefined);

  // ✅ Refs for direct DOM manipulation (avoids React re-renders during playback)
  const playbackProgressRef = useRef(0);
  const speedRef = useRef<HTMLSpanElement>(null);
  const timestampRef = useRef<HTMLSpanElement>(null);
  const distanceCoveredRef = useRef<HTMLSpanElement>(null);
  // ✅ Ref for imperative red-dot seek on the speed graph
  const graphRef = useRef<SpeedTimelineGraphHandle>(null);
  // ✅ Ref for imperative map marker seek (graph click -> map)
  const vehicleMapRef = useRef<VehicleMapHandle>(null);

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

  const selectedVehicleObj = useMemo(() => {
    const targetId = selectedVehicle || uniqueIdFromUrl;
    if (!targetId) return null;
    if (isGeoTagMode) {
      const devices = bleDevicesData?.devices || [];
      const found = devices.find(
        (d: any) =>
          String(d.deviceId) === String(targetId) ||
          String(d.sn).toLowerCase() === String(targetId).toLowerCase() ||
          String(d.uniqueId).toLowerCase() === String(targetId).toLowerCase() ||
          String(d._id) === String(targetId)
      );
      if (found) {
        const resolvedDeviceId =
          (found as any).deviceId != null ? String((found as any).deviceId) : undefined;
        return {
          uniqueId: resolvedDeviceId || found.sn || found.uniqueId,
          deviceId: resolvedDeviceId,
          sn: found.sn,
          name: found.name || found.sn || String(targetId),
          category: found.category || "BLE",
          isBle: true,
          rawDevice: found,
        };
      }
      return {
        uniqueId: targetId,
        deviceId: /^\d+$/.test(String(targetId)) ? String(targetId) : undefined,
        name: String(targetId),
        category: "BLE",
        isBle: true,
      };
    }
    if (!combinedVehicleData || !Array.isArray(combinedVehicleData)) return null;
    return (
      combinedVehicleData.find(
        (v: any) => String(v.uniqueId) === String(targetId)
      ) || null
    );
  }, [isGeoTagMode, bleDevicesData, combinedVehicleData, selectedVehicle, uniqueIdFromUrl]);

  const isCurrentBle = useMemo(() => {
    if (isGeoTagMode) return true;
    return Boolean(
      selectedVehicleObj?.category === "BLE" ||
      selectedVehicleObj?.category === "GeoTag" ||
      selectedVehicleObj?.isBle ||
      (selectedVehicle && String(selectedVehicle).startsWith("GeoTag-"))
    );
  }, [isGeoTagMode, selectedVehicleObj, selectedVehicle]);

  const selectedVehicleName =
    (historyReport as any)?.name || selectedVehicleObj?.name || selectedVehicle || "";
  const selectedVehicleImei = selectedVehicleObj?.uniqueId
    ? String(selectedVehicleObj.uniqueId)
    : selectedVehicle || "";

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
    ? currentData.locationTimeIST
      ? {
          date: currentData.locationTimeIST.split(" ")[0] || "",
          time: currentData.locationTimeIST.split(" ").slice(1).join(" ") || "",
        }
      : formatDateTime(currentData.createdAt)
    : { date: "-- : --", time: "-- : --" };

  const isBatteryMode = isCurrentBle && bleGraphMetric === "battery";

  const baseChartData = useMemo(() => {
    if (!activePlayback || activePlayback.length === 0) {
      return {
        labels: [],
        speeds: [],
        baseDataset: {
          label: isBatteryMode ? "Battery (%)" : "Speed (km/h)",
          data: [],
          borderColor: isBatteryMode ? "rgb(34, 197, 94)" : "rgb(59, 130, 246)",
          backgroundColor: isBatteryMode ? "rgba(34, 197, 94, 0.1)" : "rgba(59, 130, 246, 0.1)",
          borderWidth: 1.5,
          pointRadius: 0,
          pointHoverRadius: 0,
          tension: 0.1,
          fill: true,
        },
      };
    }

    const labels = activePlayback.map((item) => {
      if (item.locationTimeIST) {
        return item.locationTimeIST;
      }
      const date = new Date(item.createdAt);
      return date.toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: isCurrentBle ? undefined : "UTC",
      });
    });

    const values = isBatteryMode
      ? activePlayback.map((item) => Number(item.battery ?? item.attributes?.battery ?? 100))
      : activePlayback.map((item) => Number(item.speed || 0));

    return {
      labels,
      speeds: values,
      baseDataset: {
        label: isBatteryMode ? "Battery (%)" : "Speed (km/h)",
        data: values,
        borderColor: isBatteryMode ? "rgb(34, 197, 94)" : "rgb(59, 130, 246)",
        backgroundColor: isBatteryMode ? "rgba(34, 197, 94, 0.1)" : "rgba(59, 130, 246, 0.1)",
        borderWidth: 1.5,
        pointRadius: 0,
        pointHoverRadius: 0,
        tension: 0.1,
        fill: true,
      },
    };
  }, [activePlayback, isBatteryMode]);

  const filteredPackets = useMemo(() => {
    if (!activePlayback || activePlayback.length === 0) return [];
    if (!packetSearch.trim()) {
      return activePlayback.map((item, idx) => ({ item, originalIndex: idx }));
    }
    const q = packetSearch.toLowerCase();
    return activePlayback
      .map((item, idx) => ({ item, originalIndex: idx }))
      .filter(({ item, originalIndex }) => {
        const addr = (
          item.address ||
          item.attributes?.address ||
          item.rawBlePoint?.address ||
          ""
        ).toLowerCase();
        const time = (item.createdAt || "").toLowerCase();
        const sn = String(item.deviceId || "").toLowerCase();
        const coords = `${item.latitude},${item.longitude}`;
        return (
          addr.includes(q) ||
          time.includes(q) ||
          sn.includes(q) ||
          coords.includes(q) ||
          String(originalIndex + 1).includes(q)
        );
      });
  }, [activePlayback, packetSearch]);

  const handlePacketClick = (index: number) => {
    if (!activePlayback || activePlayback.length === 0) return;
    const progress = (index / Math.max(1, activePlayback.length - 1)) * 100;
    handlePlaybackProgress(progress);
    setPlaybackProgress(progress);
    vehicleMapRef.current?.seekToProgress(progress);
  };

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
              const val = context.parsed.y;
              if (isBatteryMode) {
                return `Battery: ${val}%`;
              }
              return `Speed: ${val.toFixed(1)} km/h`;
            },
            afterLabel: (context: any) => {
              const item = activePlayback[context.dataIndex];
              const addr = item?.address || item?.attributes?.address;
              return addr ? `📍 ${addr}` : "";
            },
          },
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          titleColor: "white",
          bodyColor: "white",
          borderColor: isBatteryMode ? "rgb(34, 197, 94)" : "rgb(239, 68, 68)",
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
            text: isBatteryMode ? "Battery (%)" : "Speed (km/h)",
            font: { size: 12 },
          },
          beginAtZero: true,
          min: 0,
          max: isBatteryMode ? 100 : undefined,
          suggestedMax: isBatteryMode ? 100 : 80,
          ticks: {
            font: { size: 10 },
            stepSize: isBatteryMode ? 20 : 10,
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
          // Move the map marker
          vehicleMapRef.current?.seekToProgress(newProgress);
          // Update DOM metrics (speed, timestamp, distance) + red dot imperatively
          handlePlaybackProgress(newProgress);
          // Also sync React progress state so displayIndex and throttledProgress align
          setPlaybackProgress(newProgress);
        }
      },
    }),
    [activePlayback]
  );

  const handleVehicleChange = (vehicleId?: string) => {
    console.log("Vehicle change to:", vehicleId);
    setSelectedVehicle(vehicleId || "");
  };

  const handleDateFilter = useCallback(
    (startDate: Date | null, endDate: Date | null) => {
      if (!startDate || !endDate) return;
      const fromIso = startDate.toISOString();
      const toIso = endDate.toISOString();

      setFromDate(fromIso);
      setToDate(toIso);

      const targetId = selectedVehicle || uniqueIdFromUrl;
      if (targetId && hasGenerated) {
        const foundBle = (bleDevicesData?.devices || []).find(
          (d: any) =>
            String(d.deviceId) === String(targetId) ||
            String(d.sn).toLowerCase() === String(targetId).toLowerCase() ||
            String(d.uniqueId).toLowerCase() === String(targetId).toLowerCase() ||
            String(d._id) === String(targetId)
        );
        const resolvedDeviceId = isCurrentBle
          ? (foundBle as any)?.deviceId != null
            ? String((foundBle as any).deviceId)
            : selectedVehicleObj?.deviceId
          : undefined;

        setApiFilters({
          uniqueId: resolvedDeviceId || String(targetId),
          deviceId: resolvedDeviceId,
          from: fromIso,
          to: toIso,
          period: "Custom",
          isBle: isCurrentBle,
          deviceCategory: isCurrentBle ? "BLE" : undefined,
        });
      }
    },
    [selectedVehicle, uniqueIdFromUrl, hasGenerated, isCurrentBle, bleDevicesData, selectedVehicleObj]
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
        endTime: nextTrip ? nextTrip[0].createdAt : endPoint.createdAt,
        duration: formatDurationHMS(stopDurationMs),
        distanceFromPrev,
        lat: endPoint.latitude,
        lng: endPoint.longitude,
      };
    });
  }, [trips]);

  const getTodayUtcRange = () => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    return {
      from: start.toISOString(),
      to: end.toISOString(),
      startDate: start,
      endDate: end,
    };
  };

  const handleShow = () => {
    const finalUniqueId = selectedVehicle || uniqueIdFromUrl;
    if (!finalUniqueId) {
      toast.error(isGeoTagMode ? "Please select a GeoTag" : "Please select a vehicle");
      return;
    }

    const { from: todayFrom, to: todayTo } = getTodayUtcRange();
    const finalFrom = fromDate || todayFrom;
    const finalTo = toDate || todayTo;

    const foundBle = (bleDevicesData?.devices || []).find(
      (d: any) =>
        String(d.deviceId) === String(finalUniqueId) ||
        String(d.sn).toLowerCase() === String(finalUniqueId).toLowerCase() ||
        String(d.uniqueId).toLowerCase() === String(finalUniqueId).toLowerCase() ||
        String(d._id) === String(finalUniqueId)
    );
    const resolvedDeviceId = isCurrentBle
      ? (foundBle as any)?.deviceId != null
        ? String((foundBle as any).deviceId)
        : selectedVehicleObj?.deviceId
      : undefined;

    setApiFilters({
      uniqueId: resolvedDeviceId || String(finalUniqueId),
      deviceId: resolvedDeviceId,
      from: finalFrom,
      to: finalTo,
      period: "Custom",
      isBle: isCurrentBle,
      deviceCategory: isCurrentBle ? "BLE" : undefined,
    });
    setHasGenerated(true);
  };

  const hasSyncedFromUrl = useRef(false);

  const handleModeChange = (mode: "VEHICLE" | "BLE") => {
    if (deviceType === mode) return;
    hasSyncedFromUrl.current = true;
    setDeviceType(mode);
    setSelectedVehicle("");
    setHasGenerated(false);
    setTrips([]);
    setBasePlayback([]);
    setActivePlayback([]);
    setSelectedTripIndex(null);
    setPlaybackProgress(0);
    setThrottledProgress(0);
    // Remove query params from URL so stale ?uniqueId=... does not override user selection
    router.replace("/dashboard/reports/history-report");
  };

  // Ensure default date range is initialized on initial page load
  useEffect(() => {
    if (!defaultDateRange) {
      const today = getTodayUtcRange();
      setFromDate(today.from);
      setToDate(today.to);
      setDefaultDateRange({
        startDate: today.startDate,
        endDate: today.endDate,
      });
    }
  }, [defaultDateRange]);

  // Sync uniqueId from URL with dropdown selection and set today's date (only once on initial mount)
  useEffect(() => {
    if (hasSyncedFromUrl.current) return;
    if (uniqueIdFromUrl) {
      hasSyncedFromUrl.current = true;
      const isBleTarget =
        deviceCategoryFromUrl === "BLE" ||
        String(uniqueIdFromUrl).toLowerCase().startsWith("geotag");

      setDeviceType(isBleTarget ? "BLE" : "VEHICLE");

      const { from, to, startDate, endDate } = getTodayUtcRange();

      let resolvedDeviceId: string | undefined = undefined;
      if (isBleTarget) {
        const foundBle = (bleDevicesData?.devices || []).find(
          (d: any) =>
            String(d.deviceId) === String(uniqueIdFromUrl) ||
            String(d.sn).toLowerCase() === String(uniqueIdFromUrl).toLowerCase() ||
            String(d.uniqueId).toLowerCase() === String(uniqueIdFromUrl).toLowerCase() ||
            String(d._id) === String(uniqueIdFromUrl)
        );
        resolvedDeviceId =
          (foundBle as any)?.deviceId != null
            ? String((foundBle as any).deviceId)
            : undefined;
      }

      const activeId = resolvedDeviceId || String(uniqueIdFromUrl);
      setSelectedVehicle(activeId);

      setApiFilters({
        uniqueId: activeId,
        deviceId: resolvedDeviceId,
        from,
        to,
        period: "Custom",
        isBle: isBleTarget,
        deviceCategory: isBleTarget ? "BLE" : undefined,
      });

      setFromDate(from);
      setToDate(to);

      setDefaultDateRange({
        startDate,
        endDate,
      });

      setHasGenerated(true);
    }
  }, [uniqueIdFromUrl, deviceCategoryFromUrl, bleDevicesData]);

  // Auto-sync deviceId when BLE devices finish loading
  useEffect(() => {
    if (isCurrentBle && selectedVehicleObj?.deviceId) {
      const devId = String(selectedVehicleObj.deviceId);
      setSelectedVehicle((prev) => {
        if (prev && !/^\d+$/.test(prev)) return devId;
        return prev || devId;
      });
      setApiFilters((prev) => {
        if (prev.uniqueId && (prev.deviceId !== devId || !/^\d+$/.test(String(prev.uniqueId)))) {
          return { ...prev, uniqueId: devId, deviceId: devId };
        }
        return prev;
      });
    }
  }, [isCurrentBle, selectedVehicleObj?.deviceId]);

  useEffect(() => {
    if (!historyReport) return;
    const history =
      historyReport.deviceDataByTrips ||
      historyReport.data?.deviceDataByTrips ||
      (Array.isArray(historyReport.data) ? historyReport.data : null) ||
      (Array.isArray(historyReport) ? historyReport : null);

    if (!history) return;

    // Ensure history is trips array (array of arrays)
    const normalizedTrips: any[][] = Array.isArray(history)
      ? history.length === 0
        ? []
        : Array.isArray(history[0])
        ? history
        : [history]
      : [];

    setTrips(normalizedTrips);
    const flat = normalizedTrips.flat();
    setBasePlayback(flat);
    setActivePlayback(flat);
    setIsRangeFiltered(false);
    setSelectedTripIndex(null);
    setPlaybackProgress(0);
    setThrottledProgress(0);
  }, [historyReport]);

  const handleRangeSelect = useCallback(
    (startIndex: number, endIndex: number) => {
      const source = activePlayback.length > 0 ? activePlayback : basePlayback;
      if (!source || source.length === 0) return;

      const sliced = source.slice(startIndex, endIndex + 1);
      if (sliced.length > 1) {
        setActivePlayback(sliced);
        setIsRangeFiltered(true);
        setPlaybackProgress(0);
        setThrottledProgress(0);
        toast.info(`Filtered timeline to ${sliced.length} data points`);
      }
    },
    [activePlayback, basePlayback]
  );

  const handleResetRange = useCallback(() => {
    const defaultSource =
      selectedTripIndex !== null && trips[selectedTripIndex]
        ? trips[selectedTripIndex]
        : trips.flat();

    setBasePlayback(defaultSource);
    setActivePlayback(defaultSource);
    setIsRangeFiltered(false);
    setPlaybackProgress(0);
    setThrottledProgress(0);
    toast.info("Reset to full trip timeline");
  }, [trips, selectedTripIndex]);

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

      // ✅ Imperatively move the red dot on the speed graph
      graphRef.current?.seekToIndex(idx);
    },
    [activePlayback]
  );

  return (
    <>
      <section>
        {/* Filters */}
        <header className="flex flex-col gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Mode Switcher Toggle: Vehicles vs GeoTags */}
            <div className="inline-flex items-center bg-muted/60 p-1 rounded-lg border border-border shadow-xs">
              <button
                type="button"
                onClick={() => handleModeChange("VEHICLE")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  !isGeoTagMode
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Car className="h-3.5 w-3.5" />
                Vehicles
              </button>
              <button
                type="button"
                onClick={() => handleModeChange("BLE")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  isGeoTagMode
                    ? "bg-background text-primary shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <img
                  src="/geotag-icon/crtag.png"
                  alt="GeoTag"
                  className="w-3.5 h-3.5 object-contain"
                />
                GeoTags
              </button>
            </div>

            <Combobox
              items={dropdownItems}
              value={selectedVehicle}
              onValueChange={handleVehicleChange}
              placeholder={isGeoTagMode ? "Select GeoTag" : "Select Vehicle"}
              className="cursor-pointer"
              searchPlaceholder={isGeoTagMode ? "Search GeoTags..." : "Search vehicles..."}
              emptyMessage={
                isGeoTagMode
                  ? bleDevicesLoading
                    ? "Loading GeoTags..."
                    : "No GeoTags found"
                  : vehiclesLoading
                  ? "Loading vehicles..."
                  : "No vehicles found"
              }
              width="w-[300px]"
            />
            <div className="flex gap-3">
              <DateRangeFilter
                onDateRangeChange={handleDateFilter}
                title="Select Date Range"
                maxDays={7}
                defaultStartDate={defaultDateRange?.startDate}
                defaultEndDate={defaultDateRange?.endDate}
                showTime={true}
              />
              <Button className="cursor-pointer" onClick={handleShow}>
                Show
              </Button>
              {hasGenerated && historyReport && !isCurrentBle && (
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
        {!isCurrentBle && (
          <div>
            <Button
              className="fixed top-[225px] right-0 z-[9999] rounded-l-full rounded-r-none w-[68px] bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-[var(--shadow-panel)]"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu />
            </Button>
          </div>
        )}

        {/* Main Content */}
        <div className="space-y-3">
          {/* Map Section */}
          <div className="w-full">
            {isFetching ? (
              <div
                className={`relative z-0 isolate w-full mt-3 transition-all duration-300 ease-in-out ${isMapExpanded
                  ? "h-[100vh] md:h-[80vh] lg:h-[90vh]"
                  : "h-[50vh] md:h-[25vh] lg:h-[40vh]"
                  }`}
              >
                <FullScreenSpinner />
                <VehicleMap
                  data={metaPosition}
                  currentIndex={displayIndex}
                  isExpanded={isMapExpanded}
                  onProgressChange={setPlaybackProgress}
                  deviceCategory={isCurrentBle ? "BLE" : deviceCategoryFromUrl || "CAR"}
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
                className={`relative z-0 isolate w-full mt-3 transition-all duration-300 ease-in-out ${isMapExpanded
                  ? "h-[80vh] md:h-[60vh] lg:h-[70vh]"
                  : "h-[60vh] md:h-[45vh] lg:h-[55vh]"
                  }`}
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
                    ref={vehicleMapRef}
                    data={activePlayback}
                    stops={showStopsOnMap ? derivedStops : []}
                    activeStopId={activeStopId}
                    onStopClick={(id: number) => setActiveStopId(id)}
                    currentIndex={displayIndex}
                    isExpanded={isMapExpanded}
                    onProgressChange={handlePlaybackProgress}
                    stopAddressMap={stopAddressMap}
                    deviceCategory={isCurrentBle ? "BLE" : deviceCategoryFromUrl || "CAR"}
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
                    {/* Speed / Battery */}
                    {isCurrentBle ? (
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <span className="font-semibold text-slate-700">Battery</span>
                        <span className="bg-green-100 text-green-700 font-bold px-2 py-1 rounded-sm">
                          {currentData.battery ?? currentData.attributes?.battery ?? 100}%
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Gauge className="w-4 h-4" />
                        <span>Speed</span>
                        <span ref={speedRef} className="bg-gray-200 px-2 py-1 rounded-sm">
                          {currentData.speed.toFixed(1)} kmph
                        </span>
                      </div>
                    )}

                    {/* Address for BLE */}
                    {isCurrentBle && (currentData.address || currentData.attributes?.address) && (
                      <UITooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1.5 text-muted-foreground text-xs max-w-xs truncate cursor-pointer hover:text-blue-600 transition-colors">
                            <span className="font-semibold text-slate-700 dark:text-slate-200">Location:</span>
                            <span className="truncate text-slate-600 dark:text-slate-300 flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              <span className="truncate">{currentData.address || currentData.attributes?.address}</span>
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          align="start"
                          className="max-w-xs p-3 text-xs bg-slate-900 text-white shadow-xl rounded-lg border border-slate-800 z-[9999] text-left pointer-events-auto"
                        >
                          <div className="space-y-1.5">
                            <div className="font-semibold text-slate-100 flex items-center justify-between gap-2 border-b border-slate-700/60 pb-1">
                              <span className="flex items-center gap-1.5 text-blue-300">
                                <MapPin className="w-3.5 h-3.5" />
                                <span>Current Location</span>
                              </span>
                              <a
                                href={`https://www.google.com/maps?q=${currentData.latitude},${currentData.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-0.5"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <span>Google Maps</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                            <p className="text-slate-200 leading-relaxed text-[11px] whitespace-normal break-words">
                              {currentData.address || currentData.attributes?.address}
                            </p>
                            <div className="text-[10px] text-slate-400 font-mono pt-0.5 flex items-center justify-between gap-2 border-t border-slate-800/80">
                              <span>Lat: {Number(currentData.latitude).toFixed(6)}</span>
                              <span>Lng: {Number(currentData.longitude).toFixed(6)}</span>
                            </div>
                          </div>
                        </TooltipContent>
                      </UITooltip>
                    )}

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
                    {/* Filtered Range Indicator Badge */}
                    {isRangeFiltered && (
                      <div className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 px-2.5 py-1 rounded-md text-xs font-medium border border-blue-300 dark:border-blue-700 border-dashed">
                        <ZoomIn className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>Timeline Range Filtered ({activePlayback.length} points)</span>
                        <button
                          type="button"
                          onClick={handleResetRange}
                          className="ml-1 px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                          title="Reset to full trip timeline (or double-click graph)"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Reset Timeline
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {activePlayback.length > 0 && (
                  <div className="w-full h-[1px] bg-gray-200 dark:bg-gray-800 my-1"></div>
                )}

                {/* ✅ GeoTag Mode: Show the list of all data packets */}
                {isCurrentBle && !isMapExpanded && activePlayback && activePlayback.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <img src="/geotag-icon/crtag.png" alt="GeoTag" className="w-4 h-4 object-contain inline-block shrink-0" />
                          GeoTag Data Packets ({activePlayback.length})
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-muted-foreground hidden sm:inline">
                          Showing {filteredPackets.length} of {activePlayback.length} packets
                        </span>
                        <div className="relative w-64">
                          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                          <input
                            type="text"
                            placeholder="Filter packets by address, time..."
                            value={packetSearch}
                            onChange={(e) => setPacketSearch(e.target.value)}
                            className="w-full text-xs pl-8 pr-3 py-1 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Data Packets Table */}
                    <div className="w-full border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-xs bg-white dark:bg-slate-900">
                      <div className="max-h-[320px] overflow-y-auto overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 z-10 font-semibold shadow-xs">
                            <tr>
                              <th className="py-2 px-3 text-center w-12">#</th>
                              <th className="py-2 px-3 whitespace-nowrap">Timestamp</th>
                              <th className="py-2 px-3 whitespace-nowrap">Battery</th>
                              <th className="py-2 px-3 whitespace-nowrap">Speed</th>
                              <th className="py-2 px-3 whitespace-nowrap">Accuracy</th>
                              <th className="py-2 px-3 whitespace-nowrap">Coordinates</th>
                              <th className="py-2 px-3 min-w-[200px]">Address / Location</th>
                              <th className="py-2 px-3 text-right whitespace-nowrap w-20">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-normal">
                            {filteredPackets.length === 0 ? (
                              <tr>
                                <td colSpan={8} className="py-6 text-center text-muted-foreground">
                                  No data packets found matching &quot;{packetSearch}&quot;
                                </td>
                              </tr>
                            ) : (
                              filteredPackets.map(({ item, originalIndex }) => {
                                const isCurrent = originalIndex === displayIndex;
                                const timeFormatted = formatDateTime(item.createdAt || item.deviceTime);
                                const address =
                                  item.address ||
                                  item.attributes?.address ||
                                  item.rawBlePoint?.address ||
                                  "Location address not available";
                                const batteryVal =
                                  item.battery ?? item.attributes?.battery ?? item.rawBlePoint?.battery ?? 100;
                                const batteryStatus =
                                  item.attributes?.batteryStatus ?? item.rawBlePoint?.batteryStatus ?? "OK";
                                const accuracy =
                                  item.attributes?.accuracy ?? item.rawBlePoint?.accuracy;
                                const confidence =
                                  item.attributes?.confidence ?? item.rawBlePoint?.confidence;

                                return (
                                  <tr
                                    key={`packet-${originalIndex}-${item.createdAt}`}
                                    onClick={() => handlePacketClick(originalIndex)}
                                    className={`transition-colors cursor-pointer text-slate-700 dark:text-slate-300 ${
                                      isCurrent
                                        ? "bg-blue-50/90 dark:bg-blue-950/40 border-l-4 border-l-blue-600 font-semibold"
                                        : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                    }`}
                                  >
                                    {/* Packet Number */}
                                    <td className="py-2 px-3 text-center">
                                      <div className="flex items-center justify-center gap-1">
                                        {isCurrent && (
                                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                                        )}
                                        <span className="font-mono text-slate-500 text-[11px]">
                                          {originalIndex + 1}
                                        </span>
                                      </div>
                                    </td>

                                    {/* Timestamp */}
                                    <td className="py-2 px-3 whitespace-nowrap font-medium text-slate-900 dark:text-slate-100">
                                      {item.locationTimeIST || `${timeFormatted.date} ${timeFormatted.time}`}
                                    </td>

                                    {/* Battery */}
                                    <td className="py-2 px-3 whitespace-nowrap">
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                        <BatteryCharging className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                        {batteryVal}% ({batteryStatus})
                                      </span>
                                    </td>

                                    {/* Speed */}
                                    <td className="py-2 px-3 whitespace-nowrap">
                                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                                        {(item.speed || 0).toFixed(1)}
                                      </span>{" "}
                                      <span className="text-[11px] text-muted-foreground">km/h</span>
                                    </td>

                                    {/* Accuracy & Confidence */}
                                    <td className="py-2 px-3 whitespace-nowrap text-slate-600 dark:text-slate-400 text-[11px]">
                                      {accuracy ? (
                                        <span>
                                          ±{accuracy}m{confidence ? ` (c:${confidence})` : ""}
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground">---</span>
                                      )}
                                    </td>

                                    {/* Coordinates */}
                                    <td className="py-2 px-3 whitespace-nowrap font-mono text-[11px] text-slate-600 dark:text-slate-400">
                                      {Number(item.latitude).toFixed(6)}, {Number(item.longitude).toFixed(6)}
                                    </td>

                                    {/* Address / Location */}
                                    <td className="py-2 px-3 max-w-sm truncate" onClick={(e) => e.stopPropagation()}>
                                      <UITooltip>
                                        <TooltipTrigger asChild>
                                          <a
                                            href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 truncate text-blue-600 hover:text-blue-800 hover:underline group max-w-[260px]"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0 group-hover:scale-110 transition-transform" />
                                            <span className="truncate">{address}</span>
                                            <ExternalLink className="w-3 h-3 text-blue-400 group-hover:text-blue-600 shrink-0 ml-0.5" />
                                          </a>
                                        </TooltipTrigger>
                                        <TooltipContent
                                          side="top"
                                          align="start"
                                          className="max-w-xs p-3 text-xs bg-slate-900 text-white shadow-xl rounded-lg border border-slate-800 z-[9999] text-left pointer-events-auto"
                                        >
                                          <div className="space-y-1.5">
                                            <div className="font-semibold text-slate-100 flex items-center justify-between gap-2 border-b border-slate-700/60 pb-1">
                                              <span className="flex items-center gap-1.5 text-blue-300">
                                                <MapPin className="w-3.5 h-3.5" />
                                                <span>Location Details</span>
                                              </span>
                                              <a
                                                href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-[11px] text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-0.5"
                                                onClick={(e) => e.stopPropagation()}
                                              >
                                                <span>Google Maps</span>
                                                <ExternalLink className="w-3 h-3" />
                                              </a>
                                            </div>
                                            <p className="text-slate-200 leading-relaxed text-[11px] whitespace-normal break-words">
                                              {address}
                                            </p>
                                            <div className="text-[10px] text-slate-400 font-mono pt-0.5 flex items-center justify-between gap-2 border-t border-slate-800/80">
                                              <span>Lat: {Number(item.latitude).toFixed(6)}</span>
                                              <span>Lng: {Number(item.longitude).toFixed(6)}</span>
                                            </div>
                                          </div>
                                        </TooltipContent>
                                      </UITooltip>
                                    </td>

                                    {/* Action button */}
                                    <td className="py-2 px-3 text-right whitespace-nowrap">
                                      <Button
                                        size="sm"
                                        variant={isCurrent ? "default" : "outline"}
                                        className={`h-6 px-2 text-[11px] gap-1 cursor-pointer ${
                                          isCurrent ? "bg-blue-600 text-white" : "hover:bg-primary hover:text-white"
                                        }`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handlePacketClick(originalIndex);
                                        }}
                                      >
                                        <Eye className="w-3 h-3" />
                                        Seek
                                      </Button>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* ✅ Regular Vehicle Mode: Standard Speed vs Timeline Graph */}
                {!isCurrentBle && !isMapExpanded && activePlayback && activePlayback.length > 1 && (
                  <div style={{ height: "180px" }}>
                    <SpeedTimelineGraph
                      ref={graphRef}
                      data={chartData}
                      options={chartOptions}
                      onHoverSeek={() => { }}
                      isExpanded={isMapExpanded}
                      onRangeSelect={handleRangeSelect}
                      onResetRange={handleResetRange}
                    />
                  </div>
                )}
              </Card>
            </div>
          </div>

          {/* Sliding Side Bar */}
          {!isCurrentBle && (
            <TripsSidebar
              trips={trips}
              selectedTripIndex={selectedTripIndex}
              isOpen={isSidebarOpen}
              fromDate={fromDate}
              toDate={toDate}
              selectedVehicle={selectedVehicleName}
              selectedVehicleImei={selectedVehicleImei}
              onClose={() => setIsSidebarOpen(false)}
              onTripSelect={(index) => {
                setSelectedTripIndex(index);
                setBasePlayback(trips[index]);
                setActivePlayback(trips[index]);
                setIsRangeFiltered(false);
                setPlaybackProgress(0);
              }}
              onOverallSelect={() => {
                setSelectedTripIndex(null);
                const flat = trips.flat();
                setBasePlayback(flat);
                setActivePlayback(flat);
                setIsRangeFiltered(false);
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
          )}
        </div>
      </section>

      {/* Visual Color Picker Modal Overlay */}
      {!isCurrentBle && isColorModalOpen && (
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
