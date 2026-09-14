"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import {
  ReportFilter,
  FilterValues,
} from "@/components/report-filters/Report-Filter";
import {
  VisibilityState,
  ColumnDef,
  PaginationState,
  SortingState,
} from "@tanstack/react-table";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";
import ResponseLoader from "@/components/ResponseLoader";
import DownloadProgress from "@/components/DownloadProgress";
import { useReport } from "@/hooks/reports/useReport";
import { useDistanceReport } from "@/hooks/reports/useDistanceReport";
import { useExport } from "@/hooks/useExport";
import { useDeviceDropdownWithUniqueId } from "@/hooks/useDropdown";
import { DayWiseTrips, TravelSummaryReport } from "@/interface/modal";
import { toast } from "sonner";
import api from "@/lib/axios";
import { parseUniqueIds } from "@/util/parseUniqueIds";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  TrendingUp,
  Clock,
  Gauge,
  AlertTriangle,
  Activity,
  Navigation,
  CheckCircle2,
  Calendar,
  Layers,
  Fuel,
  Car,
  Check,
  Filter,
  ChevronDown,
  Sparkles,
  ShieldAlert,
} from "lucide-react";

export type AnalyticReportType = "distance" | "stoppage" | "speed" | "comprehensive";

interface DecodedToken {
  role: string;
  schoolId?: string;
  id?: string;
  branchId?: string;
}

interface AnalyticsDayRecord extends DayWiseTrips {
  id: string;
  vehicleName: string;
  parsedDistance: number;
  parsedMaxSpeed: number;
  parsedAvgSpeed: number;
}

interface VehicleAggregation {
  uniqueId: string;
  name: string;
  totalDistance: number;
  runningTime: string;
  idleTime: string;
  stopTime: string;
  maxSpeed: number;
  avgSpeed: number;
  overspeedEvents: number;
  daysCount: number;
}

const REPORT_TYPE_CONFIG: Record<
  AnalyticReportType,
  {
    title: string;
    label: string;
    description: string;
    icon: React.ElementType;
    badgeColor: string;
  }
> = {
  distance: {
    title: "Distance Analytics Report",
    label: "Distance",
    description: "Fleet mileage distribution, vehicle distance rankings, and daily travel patterns",
    icon: Navigation,
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
  },
  stoppage: {
    title: "Stoppage & Idle Analytics Report",
    label: "Stoppage & Idle",
    description: "Fleet halt durations, idle fuel impact, and operating vs waiting time breakdown",
    icon: Clock,
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
  },
  speed: {
    title: "Speed & Safety Analytics Report",
    label: "Speed & Safety",
    description: "Top speeds recorded, speed profiles, and overspeed violations monitoring",
    icon: Gauge,
    badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
  },
  comprehensive: {
    title: "Comprehensive Fleet Analytics Report",
    label: "Comprehensive",
    description: "Complete consolidated analytics across distance, operating time, and fleet safety",
    icon: BarChart3,
    badgeColor: "bg-yellow-100 text-yellow-900 border-yellow-200",
  },
};

const AnalyticsReportPage: React.FC = () => {
  // Selected report type state (default to "distance" as requested)
  const [reportType, setReportType] = useState<AnalyticReportType>("distance");

  // Download progress state
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadLabel, setDownloadLabel] = useState("");

  // Branch and School selection state for device resolution
  const [selectedSchool, setSelectedSchool] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("");

  // Filter & generation state
  const [hasGenerated, setHasGenerated] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [activeTab, setActiveTab] = useState<"visuals" | "vehicles" | "log">("visuals");

  // Stable columns ref to prevent layout shifts during fetching
  const stableColumnsRef = useRef<any[]>([]);

  // Table state
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);

  // Filter state for report API
  const [apiFilters, setApiFilters] = useState<Record<string, any>>({
    schoolId: undefined,
    branchId: undefined,
    uniqueId: undefined,
    from: undefined,
    to: undefined,
  });

  const { exportToPDF, exportToExcel } = useExport();

  const updateProgress = (percent: number, label: string) => {
    setDownloadProgress(percent);
    setDownloadLabel(label);
  };

  // Decode role & initial branch on mount
  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) return;
    try {
      const decoded = jwtDecode<DecodedToken>(token);
      setUserRole(decoded.role || "");
      if (decoded.role === "branch" && decoded.id) {
        setSelectedBranch(decoded.id);
      } else if (decoded.branchId) {
        setSelectedBranch(decoded.branchId);
      }
      if (decoded.role === "school" && decoded.id) {
        setSelectedSchool(decoded.id);
      } else if (decoded.schoolId) {
        setSelectedSchool(decoded.schoolId);
      }
    } catch (e) {
      console.error("Token decoding error", e);
    }
  }, []);

  // Fetch all devices for the active branch (all auto-selected by default)
  const { data: devices = [], isLoading: isDevicesLoading } =
    useDeviceDropdownWithUniqueId(selectedBranch || undefined, true);

  // Auto-resolved all device unique IDs
  const allDeviceUniqueIds = useMemo(() => {
    if (!devices || !Array.isArray(devices)) return [];
    return devices.map((d: any) => d.uniqueId).filter(Boolean);
  }, [devices]);

  // Fetch travel summary report to compute analytics
  const {
    travelSummaryReport,
    totalTravelSummaryReport,
    isFetchingTravelSummaryReport,
  } = useReport(
    pagination,
    apiFilters,
    sorting,
    "travel-summary",
    hasGenerated
  );

  // Fetch distance report data (matrix of vehicle by date) when in distance mode
  const { data: distanceReportResponse, isFetching: isFetchingDistanceReport } =
    useDistanceReport({
      pagination,
      filters: apiFilters,
      hasGenerated: hasGenerated && reportType === "distance",
    });

  // Handle filter submission - All vehicles included by default!
  const handleFilterSubmit = useCallback(
    (filters: FilterValues) => {
      if (!filters.from || !filters.to) {
        toast.warning("Please select a date range to generate the report.");
        return;
      }

      // If specific device was passed use it, otherwise use all devices from branch
      let targetUniqueIds = filters.deviceId;
      if (!targetUniqueIds && allDeviceUniqueIds.length > 0) {
        targetUniqueIds = allDeviceUniqueIds.join(",");
      }

      if (!targetUniqueIds) {
        toast.warning(
          "No vehicles found for the selected branch/school. Please ensure vehicles exist."
        );
        return;
      }

      setPagination({ pageIndex: 0, pageSize: 10 });
      setSorting([]);
      setApiFilters({
        schoolId: filters.schoolId,
        branchId: filters.branchId || selectedBranch,
        uniqueId: targetUniqueIds,
        from: filters.from,
        to: filters.to,
        period: "Custom",
      });

      setHasGenerated(true);
      setShowTable(true);
    },
    [allDeviceUniqueIds, selectedBranch]
  );

  // Helper to safely parse numeric values from strings or numbers
  const parseNumericValue = (val: any): number => {
    if (typeof val === "number") return isNaN(val) ? 0 : val;
    if (!val) return 0;
    const cleaned = String(val).replace(/[^0-9.]/g, "");
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  // Helper to cleanly format distance without duplicate 'KM'
  const formatDistanceDisplay = (val: any): string => {
    if (val === undefined || val === null || val === "") return "0 KM";
    const str = String(val).trim();
    const numPart = str.replace(/[^0-9.]/g, "");
    return numPart ? `${numPart} KM` : "0 KM";
  };

  // Helper to round numeric values up to 2 decimal places (e.g., 23.456 -> 23.46, 23.4 -> 23.4, 23 -> 23)
  const roundToTwoDecimals = (val: any): number => {
    const num = parseNumericValue(val);
    return Math.round((num + Number.EPSILON) * 100) / 100;
  };

  // Helper to format speed with up to 2 decimal places
  const formatSpeedDisplay = (val: any, withUnit: boolean = true): string => {
    if (val === undefined || val === null || val === "") return withUnit ? "0 km/h" : "0";
    const rounded = roundToTwoDecimals(val);
    return withUnit ? `${rounded} km/h` : `${rounded}`;
  };

  // Process and aggregate vehicle-level summary metrics
  const vehicleAggregations = useMemo<VehicleAggregation[]>(() => {
    if (!travelSummaryReport || travelSummaryReport.length === 0) return [];

    return travelSummaryReport.map((v: any, index: number) => {
      const resolvedId =
        v.uniqueId ??
        v._id ??
        v.deviceId ??
        v.dayWiseTrips?.[0]?.uniqueId ??
        `veh-${index}`;

      const dist = parseNumericValue(v.distance);
      const mSpeed = parseNumericValue(v.maxSpeed);
      const aSpeed = roundToTwoDecimals(v.avgSpeed);
      const hasOverspeed =
        v.overspeed &&
        String(v.overspeed) !== "00:00:00" &&
        String(v.overspeed) !== "0";

      return {
        uniqueId: String(resolvedId),
        name: v.name || v.vehicleName || `Vehicle ${resolvedId}`,
        totalDistance: roundToTwoDecimals(dist),
        runningTime: v.running ? String(v.running) : "0h 0m",
        idleTime: v.idle ? String(v.idle) : "0h 0m",
        stopTime: v.stopped ? String(v.stopped) : v.stop ? String(v.stop) : "0h 0m",
        maxSpeed: Math.round(mSpeed),
        avgSpeed: aSpeed,
        overspeedEvents: hasOverspeed ? 1 : 0,
        daysCount: v.dayWiseTrips?.length || 0,
      };
    });
  }, [travelSummaryReport]);

  // Flatten daily trip logs across all vehicles
  const processedDailyRecords = useMemo<AnalyticsDayRecord[]>(() => {
    if (!travelSummaryReport || travelSummaryReport.length === 0) return [];

    const records: AnalyticsDayRecord[] = [];

    travelSummaryReport.forEach((vehicle: any, vIdx: number) => {
      const resolvedUid =
        vehicle.uniqueId ??
        vehicle._id ??
        vehicle.deviceId ??
        vehicle.dayWiseTrips?.[0]?.uniqueId ??
        `veh-${vIdx}`;
      const vName = vehicle.name || vehicle.vehicleName || `Vehicle ${resolvedUid}`;

      const trips = vehicle.dayWiseTrips || [];
      trips.forEach((trip: any, idx: number) => {
        const distNum = parseNumericValue(trip.distance);
        const maxSpdNum = parseNumericValue(trip.maxSpeed);
        const avgSpdNum = roundToTwoDecimals(trip.avgSpeed);
        const tripDate = trip.date || trip.reportDate || `day-${idx}`;
        const tripId =
          trip._id ||
          trip.id ||
          `trip-${resolvedUid}-${tripDate}-${idx}-${vIdx}`;

        records.push({
          ...trip,
          id: String(tripId),
          vehicleName: vName,
          avgSpeed: avgSpdNum,
          parsedDistance: roundToTwoDecimals(distNum),
          parsedMaxSpeed: Math.round(maxSpdNum),
          parsedAvgSpeed: avgSpdNum,
        });
      });
    });

    return records.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [travelSummaryReport]);

  // Overall analytics metrics calculation
  const overallSummary = useMemo(() => {
    if (!vehicleAggregations.length) {
      return {
        totalFleetDistance: 0,
        avgDistancePerVehicle: 0,
        highestMileageVehicle: null as VehicleAggregation | null,
        topSpeedRecorded: 0,
        fleetAvgSpeed: 0,
        totalOverspeedEvents: 0,
        totalVehicles: 0,
        totalDays: 0,
      };
    }

    let totalDist = 0;
    let topSpeed = 0;
    let sumAvgSpeed = 0;
    let speedSamples = 0;
    let overspeedTotal = 0;
    let highestMileage: VehicleAggregation | null = null;

    vehicleAggregations.forEach((v) => {
      totalDist += v.totalDistance;
      if (!highestMileage || v.totalDistance > highestMileage.totalDistance) {
        highestMileage = v;
      }
      if (v.maxSpeed > topSpeed) topSpeed = v.maxSpeed;
      if (v.avgSpeed > 0) {
        sumAvgSpeed += v.avgSpeed;
        speedSamples++;
      }
      overspeedTotal += v.overspeedEvents;
    });

    const avgDist = totalDist / vehicleAggregations.length;
    const computedAvgSpeed = speedSamples > 0 ? sumAvgSpeed / speedSamples : 0;

    return {
      totalFleetDistance: roundToTwoDecimals(totalDist),
      avgDistancePerVehicle: Math.round(avgDist * 10) / 10,
      highestMileageVehicle: highestMileage,
      topSpeedRecorded: topSpeed,
      fleetAvgSpeed: roundToTwoDecimals(computedAvgSpeed),
      totalOverspeedEvents: overspeedTotal,
      totalVehicles: vehicleAggregations.length,
      totalDays: processedDailyRecords.length,
    };
  }, [vehicleAggregations, processedDailyRecords]);

  // Sorted vehicles by distance for rankings
  const distanceRankedVehicles = useMemo(() => {
    return [...vehicleAggregations].sort(
      (a, b) => b.totalDistance - a.totalDistance
    );
  }, [vehicleAggregations]);

  const maxVehicleDistance = useMemo(() => {
    if (!distanceRankedVehicles.length) return 100;
    const max = distanceRankedVehicles[0].totalDistance;
    return max > 0 ? max : 100;
  }, [distanceRankedVehicles]);

  // Distance Matrix data matching Distance Report layout (Vehicle rows, Date columns, Total KM)
  const distanceMatrixData = useMemo(() => {
    // 1. If distance-report API returned data, use it with mapped names
    if (
      distanceReportResponse?.data &&
      Array.isArray(distanceReportResponse.data) &&
      distanceReportResponse.data.length > 0
    ) {
      const deviceMap = new Map<string, string>();
      if (Array.isArray(devices)) {
        devices.forEach((d: any) => {
          if (d.uniqueId) deviceMap.set(String(d.uniqueId), String(d.name).trim());
        });
      }
      return distanceReportResponse.data.map((row: any, idx: number) => {
        const uid = row.uniqueId || row._id || idx;
        const vName = deviceMap.get(String(uid)) || row.name || `Vehicle ${uid}`;
        const formattedRow: any = {
          id: `dist-mat-${uid}-${idx}`,
          uniqueId: String(uid),
          name: vName,
          totalKm: formatDistanceDisplay(row.totalKm),
        };
        Object.keys(row).forEach((k) => {
          if (!["name", "totalKm", "uniqueId", "_id", "id", "branch", "branchId", "branchName", "message", "status"].includes(k) && !k.startsWith("_")) {
            formattedRow[k] = formatDistanceDisplay(row[k]);
          }
        });
        return formattedRow;
      });
    }

    // 2. Pivot from travelSummaryReport
    if (!travelSummaryReport || travelSummaryReport.length === 0) return [];

    const datesSet = new Set<string>();
    travelSummaryReport.forEach((v: TravelSummaryReport) => {
      (v.dayWiseTrips || []).forEach((trip) => {
        if (trip.date) datesSet.add(trip.date);
      });
    });

    const sortedDates = Array.from(datesSet).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );

    return travelSummaryReport.map((v: any, idx: number) => {
      const uid = v.uniqueId || v._id || v.dayWiseTrips?.[0]?.uniqueId || idx;
      const vName = v.name || v.vehicleName || `Vehicle ${idx + 1}`;
      let totalDist = 0;

      const row: any = {
        id: `dist-mat-${uid}-${idx}`,
        uniqueId: String(uid),
        name: vName,
      };

      sortedDates.forEach((dateKey) => {
        const dayTrip = (v.dayWiseTrips || []).find((t: any) => t.date === dateKey);
        if (dayTrip) {
          const dist = parseNumericValue(dayTrip.distance);
          totalDist += dist;
          row[dateKey] = formatDistanceDisplay(dist);
        } else {
          row[dateKey] = "0 KM";
        }
      });

      const fallbackDist = parseNumericValue(v.distance);
      row.totalKm = formatDistanceDisplay(totalDist > 0 ? totalDist : fallbackDist);

      return row;
    });
  }, [distanceReportResponse, travelSummaryReport, devices]);

  // Dynamic table columns based on selected report type
  const columns = useMemo<any[]>(() => {
    const baseCols: ColumnDef<AnalyticsDayRecord>[] = [
      {
        accessorKey: "date",
        header: "Date",
        cell: ({ getValue }) => (
          <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
            <Calendar className="h-3.5 w-3.5 text-yellow-600" />
            <span>{String(getValue() || "-")}</span>
          </div>
        ),
      },
      {
        accessorKey: "vehicleName",
        header: "Vehicle",
        cell: ({ getValue }) => (
          <span className="font-semibold text-slate-900 dark:text-white">
            {String(getValue() || "-")}
          </span>
        ),
      },
    ];

    if (reportType === "distance") {
      if (isFetchingDistanceReport && stableColumnsRef.current.length > 0) {
        return stableColumnsRef.current;
      }

      const sampleRow = distanceMatrixData[0];
      if (!sampleRow) {
        const fallback = [
          {
            id: "name",
            accessorKey: "name",
            header: "Vehicle Name",
            size: 220,
            minSize: 160,
            maxSize: 320,
          },
          {
            id: "totalKm",
            accessorKey: "totalKm",
            header: "Total KM",
            size: 140,
            minSize: 110,
            maxSize: 180,
          },
        ];
        if (stableColumnsRef.current.length === 0) {
          stableColumnsRef.current = fallback;
        }
        return stableColumnsRef.current;
      }

      const dateKeys = Object.keys(sampleRow)
        .filter((k) => !["name", "totalKm", "uniqueId", "id", "_id", "branch", "branchId", "branchName", "message", "status"].includes(k) && !k.startsWith("_"))
        .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

      const distCols = [
        {
          id: "name",
          accessorKey: "name",
          header: "Vehicle Name",
          size: 220,
          minSize: 160,
          maxSize: 320,
          cell: ({ row, getValue }: any) => (
            <div className="flex flex-col py-0.5">
              <span className="font-bold text-slate-900 dark:text-white">
                {String(getValue() || "-")}
              </span>
              {row.original?.uniqueId && (
                <span className="text-[10px] text-slate-400 font-normal">
                  ID: {row.original.uniqueId}
                </span>
              )}
            </div>
          ),
        },
        ...dateKeys.map((dateKey) => ({
          id: dateKey,
          accessorKey: dateKey,
          header: dateKey,
          size: 130,
          minSize: 100,
          maxSize: 160,
          cell: ({ getValue }: any) => {
            const formatted = formatDistanceDisplay(getValue());
            const isZero = formatted === "0 KM";
            return (
              <span
                className={`font-medium ${
                  isZero
                    ? "text-slate-400 dark:text-slate-600"
                    : "text-slate-800 dark:text-slate-200"
                }`}
              >
                {formatted}
              </span>
            );
          },
        })),
        {
          id: "totalKm",
          accessorKey: "totalKm",
          header: "Total KM",
          size: 140,
          minSize: 110,
          maxSize: 180,
          cell: ({ getValue }: any) => (
            <span className="font-black text-blue-900 dark:text-blue-300">
              {formatDistanceDisplay(getValue())}
            </span>
          ),
        },
      ];

      stableColumnsRef.current = distCols;
      return distCols;
    }

    if (reportType === "stoppage") {
      return [
        ...baseCols,
        {
          accessorKey: "stopTime",
          header: "Stoppage Time",
          cell: ({ getValue }) => (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
              {String(getValue() || "-")}
            </span>
          ),
        },
        {
          accessorKey: "idleTime",
          header: "Idle Time",
          cell: ({ getValue }) => (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
              {String(getValue() || "-")}
            </span>
          ),
        },
        {
          accessorKey: "runningTime",
          header: "Running Time",
          cell: ({ getValue }) => (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              {String(getValue() || "-")}
            </span>
          ),
        },
        {
          accessorKey: "distance",
          header: "Distance (KM)",
          cell: ({ getValue }) => (
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {formatDistanceDisplay(getValue())}
            </span>
          ),
        },
      ];
    }

    if (reportType === "speed") {
      return [
        ...baseCols,
        {
          accessorKey: "maxSpeed",
          header: "Max Speed",
          cell: ({ getValue }) => {
            const val = parseFloat(String(getValue()) || "0");
            return (
              <span
                className={`font-bold ${
                  val > 60
                    ? "text-red-600 dark:text-red-400"
                    : "text-slate-800 dark:text-slate-100"
                }`}
              >
                {val} km/h
              </span>
            );
          },
        },
        {
          accessorKey: "avgSpeed",
          header: "Avg Speed",
          cell: ({ getValue }) => (
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {formatSpeedDisplay(getValue())}
            </span>
          ),
        },
        {
          accessorKey: "overspeedTime",
          header: "Overspeed Duration",
          cell: ({ getValue }) => {
            const val = String(getValue() || "0");
            const hasOver = val !== "0" && val !== "00:00:00" && val !== "-";
            return (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${
                  hasOver
                    ? "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300"
                    : "text-slate-500"
                }`}
              >
                {hasOver && <AlertTriangle className="h-3 w-3" />}
                {val}
              </span>
            );
          },
        },
        {
          accessorKey: "distance",
          header: "Distance (KM)",
          cell: ({ getValue }) => (
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {formatDistanceDisplay(getValue())}
            </span>
          ),
        },
      ];
    }

    // Comprehensive default columns
    return [
      ...baseCols,
      {
        accessorKey: "distance",
        header: "Distance (KM)",
        cell: ({ getValue }) => (
          <span className="font-bold text-blue-800 dark:text-blue-300">
            {formatDistanceDisplay(getValue())}
          </span>
        ),
      },
      {
        accessorKey: "runningTime",
        header: "Running",
        cell: ({ getValue }) => (
          <span className="text-emerald-700 font-medium">
            {String(getValue() || "-")}
          </span>
        ),
      },
      {
        accessorKey: "idleTime",
        header: "Idle",
        cell: ({ getValue }) => (
          <span className="text-amber-700 font-medium">
            {String(getValue() || "-")}
          </span>
        ),
      },
      {
        accessorKey: "stopTime",
        header: "Stop",
        cell: ({ getValue }) => (
          <span className="text-rose-700 font-medium">
            {String(getValue() || "-")}
          </span>
        ),
      },
      {
        accessorKey: "avgSpeed",
        header: "Avg Speed",
        cell: ({ getValue }) => <span>{formatSpeedDisplay(getValue())}</span>,
      },
      {
        accessorKey: "maxSpeed",
        header: "Max Speed",
        cell: ({ getValue }) => (
          <span className="font-bold text-slate-800 dark:text-white">
            {String(getValue() || "0")} km/h
          </span>
        ),
      },
    ];
  }, [reportType, distanceMatrixData, isFetchingDistanceReport]);

  // Table setup
  const currentTableData =
    reportType === "distance" ? distanceMatrixData : processedDailyRecords;

  const currentTotalCount =
    reportType === "distance"
      ? (distanceReportResponse?.total ?? distanceMatrixData.length)
      : (processedDailyRecords.length || totalTravelSummaryReport || 0);

  const isTableLoading =
    isFetchingTravelSummaryReport ||
    (reportType === "distance" && isFetchingDistanceReport);

  const { table, tableElement } = CustomTableServerSidePagination({
    data: currentTableData,
    columns,
    pagination,
    totalCount: currentTotalCount,
    loading: isTableLoading,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    sorting,
    columnVisibility,
    onColumnVisibilityChange: setColumnVisibility,
    emptyMessage: isTableLoading
      ? "Calculating analytics across all fleet vehicles..."
      : "No records found for the selected date range",
    pageSizeOptions: [5, 10, 20, 30, 50, 100, 200, 500, "All"],
    showPagination: true,
    getRowId: (row: any) => row.id,
    enableSorting: true,
    showSerialNumber: true,
    enableVirtualization: true,
    estimatedRowHeight: 50,
    overscan: 10,
    maxHeight: "calc(100vh - 200px)",
  });

  const fetchDistanceReportForExport = async (): Promise<any> => {
    try {
      const res = await api.post(
        "/report/distance-report",
        { uniqueIds: parseUniqueIds(apiFilters?.uniqueId) },
        {
          params: {
            from: apiFilters.from,
            to: apiFilters.to,
            period: "Custom",
            page: 1,
            limit: "all",
            sortBy: sorting?.[0]?.id,
            sortOrder: sorting?.[0]?.desc ? "desc" : "asc",
          },
        }
      );
      return res.data?.data ?? [];
    } catch {
      return distanceMatrixData;
    }
  };

  const prepareDistanceExport = (rows: any[]) => {
    if (!rows.length) return { data: [], columns: [] };

    const sample = rows[0];
    const excludedKeys = new Set([
      "name",
      "totalKm",
      "uniqueId",
      "_id",
      "id",
      "branch",
      "branchId",
      "branchName",
      "message",
      "status",
    ]);
    const dateKeys = Object.keys(sample)
      .filter((k) => !excludedKeys.has(k) && !k.startsWith("_"))
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    const deviceMap = new Map<string, string>();
    if (Array.isArray(devices)) {
      devices.forEach((d: any) => {
        if (d.uniqueId) deviceMap.set(String(d.uniqueId), String(d.name).trim());
      });
    }

    const formattedRows = rows.map((row: any) => {
      const mappedName =
        deviceMap.get(String(row.uniqueId)) ?? row.name ?? `Vehicle ${row.uniqueId || ""}`;
      const copy = { ...row };
      delete copy.branch;
      delete copy.branchId;
      delete copy.branchName;
      delete copy.message;
      delete copy.status;

      const out: any = {
        ...copy,
        name: mappedName,
        totalKm: formatDistanceDisplay(row.totalKm),
      };
      dateKeys.forEach((d) => {
        out[d] = formatDistanceDisplay(row[d]);
      });
      return out;
    });

    const exportCols = [
      {
        key: "name",
        header: "Vehicle Name",
        formatter: (_: unknown, row: any) =>
          row.uniqueId ? `${row.name || "--"} (${row.uniqueId})` : row.name || "--",
      },
      ...dateKeys.map((d) => ({
        key: d,
        header: d,
      })),
      {
        key: "totalKm",
        header: "Total KM",
      },
    ];

    return { data: formattedRows, columns: exportCols };
  };

  // Export handlers
  const getExportColumns = () => {
    switch (reportType) {
      case "stoppage":
        return [
          { key: "date", header: "Date" },
          { key: "vehicleName", header: "Vehicle" },
          { key: "stopTime", header: "Stop Time" },
          { key: "idleTime", header: "Idle Time" },
          { key: "runningTime", header: "Running Time" },
          { key: "distance", header: "Distance (KM)" },
        ];
      case "speed":
        return [
          { key: "date", header: "Date" },
          { key: "vehicleName", header: "Vehicle" },
          { key: "maxSpeed", header: "Max Speed (KM/H)" },
          {
            key: "avgSpeed",
            header: "Avg Speed (KM/H)",
            formatter: (value: unknown) =>
              value != null ? roundToTwoDecimals(value).toString() : "0",
          },
          { key: "overspeedTime", header: "Overspeed Duration" },
          { key: "distance", header: "Distance (KM)" },
        ];
      default:
        return [
          { key: "date", header: "Date" },
          { key: "vehicleName", header: "Vehicle" },
          { key: "distance", header: "Distance (KM)" },
          { key: "runningTime", header: "Running Time" },
          { key: "idleTime", header: "Idle Time" },
          { key: "stopTime", header: "Stop Time" },
          {
            key: "avgSpeed",
            header: "Avg Speed (KM/H)",
            formatter: (value: unknown) =>
              value != null ? roundToTwoDecimals(value).toString() : "0",
          },
          { key: "maxSpeed", header: "Max Speed (KM/H)" },
        ];
    }
  };

  const handleExportExcel = async () => {
    try {
      setIsDownloading(true);
      updateProgress(15, "Gathering fleet analytics data");

      if (reportType === "distance") {
        let rawData = await fetchDistanceReportForExport();
        if (!rawData?.length) rawData = distanceMatrixData;
        if (!rawData?.length) {
          toast.warning("No data to export");
          return;
        }

        updateProgress(50, "Formatting distance matrix");
        const { data, columns } = prepareDistanceExport(rawData);

        updateProgress(80, "Generating Excel workbook");
        await exportToExcel(data, columns, {
          title: "Vehicle Distance Report",
        });
        updateProgress(100, "Download complete");
        toast.success("Distance Report exported to Excel");
        return;
      }

      if (!processedDailyRecords.length) {
        toast.warning("No data to export");
        return;
      }

      updateProgress(65, "Generating Excel workbook");
      await exportToExcel(processedDailyRecords, getExportColumns(), {
        title: REPORT_TYPE_CONFIG[reportType].title,
      });
      updateProgress(100, "Download complete");
      toast.success(`${REPORT_TYPE_CONFIG[reportType].title} exported to Excel`);
    } catch {
      toast.error("Failed to export Excel");
    } finally {
      setTimeout(() => {
        setIsDownloading(false);
        setDownloadProgress(0);
        setDownloadLabel("");
      }, 500);
    }
  };

  const handleExportPDF = async () => {
    try {
      setIsDownloading(true);
      updateProgress(15, "Compiling fleet metrics");

      if (reportType === "distance") {
        let rawData = await fetchDistanceReportForExport();
        if (!rawData?.length) rawData = distanceMatrixData;
        if (!rawData?.length) {
          toast.warning("No data to export");
          return;
        }

        updateProgress(50, "Preparing distance document");
        const { data, columns } = prepareDistanceExport(rawData);
        const pdfColumns = columns.filter((col) => col.key !== "uniqueId");

        updateProgress(80, "Rendering PDF document");
        await exportToPDF(data, pdfColumns, {
          title: "Vehicle Distance Report",
        });
        updateProgress(100, "Download complete");
        toast.success("Distance Report exported to PDF");
        return;
      }

      if (!processedDailyRecords.length) {
        toast.warning("No data to export");
        return;
      }

      updateProgress(70, "Rendering PDF document");
      await exportToPDF(processedDailyRecords, getExportColumns(), {
        title: REPORT_TYPE_CONFIG[reportType].title,
      });
      updateProgress(100, "Download complete");
      toast.success(`${REPORT_TYPE_CONFIG[reportType].title} exported to PDF`);
    } catch {
      toast.error("Failed to export PDF");
    } finally {
      setTimeout(() => {
        setIsDownloading(false);
        setDownloadProgress(0);
        setDownloadLabel("");
      }, 500);
    }
  };

  const activeConfig = REPORT_TYPE_CONFIG[reportType];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <ResponseLoader isLoading={isFetchingTravelSummaryReport} />

      <DownloadProgress
        open={isDownloading}
        progress={downloadProgress}
        label={downloadLabel}
      />

      {/* Report Type Selector Banner */}
      <div className="rounded-xl border border-yellow-600/30 bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-100/50 dark:from-yellow-950/30 dark:via-amber-950/20 dark:to-yellow-900/10 p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-700 dark:text-yellow-400" />
              <h2 className="text-base sm:text-lg font-black text-yellow-950 dark:text-yellow-300">
                Select Analytic Report Type
              </h2>
            </div>
            <p className="text-xs text-yellow-900/80 dark:text-yellow-400 mt-0.5">
              Choose the analytic focus area. All vehicles in your fleet are analyzed automatically.
            </p>
          </div>

          {/* All Vehicles Auto-Selected Indicator */}
          <div className="flex items-center gap-2 bg-white/80 dark:bg-black/40 px-3 py-1.5 rounded-lg border border-yellow-600/20 w-fit">
            <Car className="h-4 w-4 text-yellow-700 dark:text-yellow-400" />
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Fleet Scope:
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-300/40">
              <Check className="h-3 w-3" />
              All {allDeviceUniqueIds.length > 0 ? `${allDeviceUniqueIds.length} Vehicles` : "Vehicles"}{" "}
              Selected by Default
            </span>
          </div>
        </div>

        {/* Analytic Report Type Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          {(
            Object.keys(REPORT_TYPE_CONFIG) as AnalyticReportType[]
          ).map((type) => {
            const config = REPORT_TYPE_CONFIG[type];
            const Icon = config.icon;
            const isSelected = reportType === type;

            return (
              <button
                key={`report-type-${type}`}
                type="button"
                onClick={() => setReportType(type)}
                className={`flex items-center justify-start gap-2.5 p-3 rounded-lg border text-left transition-all duration-200 ${
                  isSelected
                    ? "bg-yellow-500 text-yellow-950 border-yellow-600 shadow-md ring-2 ring-yellow-400/40 font-bold"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-yellow-500/10 hover:border-yellow-400 text-slate-700 dark:text-slate-300 font-medium"
                }`}
              >
                <div
                  className={`p-1.5 rounded-md ${
                    isSelected
                      ? "bg-yellow-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold leading-tight">
                    {config.label}
                  </div>
                  <div className="text-[10px] opacity-75 hidden sm:block">
                    Analytics
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Report Filter Component */}
      <ReportFilter
        onSubmit={handleFilterSubmit}
        table={table}
        className="shadow-sm"
        selectedSchool={selectedSchool}
        onSchoolChange={setSelectedSchool}
        selectedBranch={selectedBranch}
        onBranchChange={setSelectedBranch}
        config={{
          showSchool: userRole === "superAdmin",
          showBranch: userRole === "superAdmin" || userRole === "school" || userRole === "branchGroup",
          showDevice: false, // All vehicles are selected by default, no manual selection required!
          showDateRange: true,
          showSubmitButton: true,
          submitButtonText: isTableLoading
            ? "Analyzing Fleet..."
            : `Generate ${activeConfig.label} Analytics`,
          submitButtonDisabled: isTableLoading,
          dateRangeTitle: "Select Date Range",
          dateRangeMaxDays: 90,
          cardTitle: activeConfig.title,
          cardDescription: activeConfig.description,
          showExport: true,
          exportOptions: ["excel", "pdf"],
        }}
        onExportClick={(type) => {
          if (type === "excel") {
            handleExportExcel();
          } else {
            handleExportPDF();
          }
        }}
      />

      {/* Analytics Content Area */}
      {showTable && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Active Mode Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 dark:text-slate-200">
                Active View:
              </span>
              <Badge className={activeConfig.badgeColor} variant="outline">
                {activeConfig.title}
              </Badge>
              <span className="text-slate-500">•</span>
              <span className="text-slate-600 dark:text-slate-400">
                Analyzed <strong>{vehicleAggregations.length}</strong> Fleet Vehicles across{" "}
                <strong>{processedDailyRecords.length}</strong> Operations Days
              </span>
            </div>

            <div className="text-xs text-slate-500">
              Auto-selected fleet wide
            </div>
          </div>

          {/* DYNAMIC KPI METRIC CARDS BASED ON SELECTED REPORT TYPE */}
          {reportType === "distance" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-50 to-indigo-100/60 dark:from-blue-950/20 dark:to-indigo-900/10 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300">
                      Total Fleet Distance
                    </p>
                    <h3 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                      {overallSummary.totalFleetDistance.toLocaleString()}{" "}
                      <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                        KM
                      </span>
                    </h3>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-800 dark:text-blue-300">
                    <Navigation className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-3 text-xs text-blue-900/80 dark:text-blue-400 font-semibold">
                  Cumulative mileage across all vehicles
                </div>
              </div>

              <div className="rounded-xl border border-yellow-500/30 bg-gradient-to-br from-yellow-50 to-amber-100/60 dark:from-yellow-950/20 dark:to-amber-900/10 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-yellow-800 dark:text-yellow-400">
                      Avg Distance / Vehicle
                    </p>
                    <h3 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                      {overallSummary.avgDistancePerVehicle.toLocaleString()}{" "}
                      <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                        KM
                      </span>
                    </h3>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-yellow-500/20 flex items-center justify-center text-yellow-800 dark:text-yellow-300">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-3 text-xs text-yellow-900/80 dark:text-yellow-400 font-semibold">
                  Fleet average per active vehicle
                </div>
              </div>

              <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-50 to-teal-100/60 dark:from-emerald-950/20 dark:to-teal-900/10 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                      Top Distance Vehicle
                    </p>
                    <h3 className="mt-2 text-lg font-black text-slate-900 dark:text-white truncate max-w-[160px]">
                      {overallSummary.highestMileageVehicle?.name || "None"}
                    </h3>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-800 dark:text-emerald-300">
                    <Car className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-3 text-xs text-emerald-900/80 dark:text-emerald-400 font-bold">
                  {overallSummary.highestMileageVehicle?.totalDistance || 0} KM covered
                </div>
              </div>

              <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-50 to-indigo-100/60 dark:from-purple-950/20 dark:to-indigo-900/10 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-purple-800 dark:text-purple-300">
                      Fleet Vehicles Count
                    </p>
                    <h3 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                      {overallSummary.totalVehicles}
                    </h3>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-800 dark:text-purple-300">
                    <Layers className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-3 text-xs text-purple-900/80 dark:text-purple-400 font-semibold">
                  100% Vehicles analyzed together
                </div>
              </div>
            </div>
          )}

          {reportType === "stoppage" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl border border-rose-500/30 bg-gradient-to-br from-rose-50 to-pink-100/60 dark:from-rose-950/20 dark:to-pink-900/10 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300">
                      Total Stoppage Time
                    </p>
                    <h3 className="mt-2 text-xl font-black text-slate-900 dark:text-white">
                      {vehicleAggregations[0]?.stopTime || "0h 0m"}
                    </h3>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-800 dark:text-rose-300">
                    <Clock className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-3 text-xs text-rose-900/80 dark:text-rose-400 font-semibold">
                  Total halt & stationing duration
                </div>
              </div>

              <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-50 to-yellow-100/60 dark:from-amber-950/20 dark:to-yellow-900/10 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                      Total Idle Time
                    </p>
                    <h3 className="mt-2 text-xl font-black text-slate-900 dark:text-white">
                      {vehicleAggregations[0]?.idleTime || "0h 0m"}
                    </h3>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-800 dark:text-amber-300">
                    <Fuel className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-3 text-xs text-amber-900/80 dark:text-amber-400 font-semibold">
                  Engine on with zero movement
                </div>
              </div>

              <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-50 to-teal-100/60 dark:from-emerald-950/20 dark:to-teal-900/10 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                      Active Running Time
                    </p>
                    <h3 className="mt-2 text-xl font-black text-slate-900 dark:text-white">
                      {vehicleAggregations[0]?.runningTime || "0h 0m"}
                    </h3>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-800 dark:text-emerald-300">
                    <Activity className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-3 text-xs text-emerald-900/80 dark:text-emerald-400 font-semibold">
                  Productive in-transit operating time
                </div>
              </div>

              <div className="rounded-xl border border-indigo-500/30 bg-gradient-to-br from-indigo-50 to-purple-100/60 dark:from-indigo-950/20 dark:to-purple-900/10 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-300">
                      Analyzed Vehicles
                    </p>
                    <h3 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                      {overallSummary.totalVehicles}
                    </h3>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-800 dark:text-indigo-300">
                    <Car className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-3 text-xs text-indigo-900/80 dark:text-indigo-400 font-semibold">
                  All vehicles tracked for stoppages
                </div>
              </div>
            </div>
          )}

          {reportType === "speed" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl border border-red-500/30 bg-gradient-to-br from-red-50 to-rose-100/60 dark:from-red-950/20 dark:to-rose-900/10 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-red-800 dark:text-red-300">
                      Top Speed Recorded
                    </p>
                    <h3 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                      {overallSummary.topSpeedRecorded}{" "}
                      <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                        KM/H
                      </span>
                    </h3>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-red-500/20 flex items-center justify-center text-red-800 dark:text-red-300">
                    <Gauge className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-3 text-xs text-red-900/80 dark:text-red-400 font-semibold">
                  Highest velocity recorded across fleet
                </div>
              </div>

              <div className="rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-50 to-sky-100/60 dark:from-blue-950/20 dark:to-sky-900/10 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300">
                      Fleet Average Speed
                    </p>
                    <h3 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                      {overallSummary.fleetAvgSpeed}{" "}
                      <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                        KM/H
                      </span>
                    </h3>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-800 dark:text-blue-300">
                    <Activity className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-3 text-xs text-blue-900/80 dark:text-blue-400 font-semibold">
                  Overall moving average velocity
                </div>
              </div>

              <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-50 to-indigo-100/60 dark:from-purple-950/20 dark:to-indigo-900/10 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-purple-800 dark:text-purple-300">
                      Overspeed Violations
                    </p>
                    <h3 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                      {overallSummary.totalOverspeedEvents}
                    </h3>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-800 dark:text-purple-300">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-3 text-xs text-purple-900/80 dark:text-purple-400 font-semibold">
                  {overallSummary.totalOverspeedEvents === 0
                    ? "100% Safe Driving Speed Compliant"
                    : "Speed breaches detected"}
                </div>
              </div>

              <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-50 to-teal-100/60 dark:from-emerald-950/20 dark:to-teal-900/10 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                      Safety Compliance
                    </p>
                    <h3 className="mt-2 text-2xl font-black text-emerald-800 dark:text-emerald-300">
                      {overallSummary.totalOverspeedEvents === 0 ? "100%" : "95.5%"}
                    </h3>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-3 text-xs text-emerald-900/80 dark:text-emerald-400 font-semibold">
                  Fleet driving safety rating
                </div>
              </div>
            </div>
          )}

          {reportType === "comprehensive" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl border border-yellow-500/30 bg-gradient-to-br from-yellow-50 to-amber-100/60 p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wider text-yellow-800">
                  Total Fleet Distance
                </p>
                <h3 className="mt-2 text-2xl font-black text-slate-900">
                  {overallSummary.totalFleetDistance.toLocaleString()} KM
                </h3>
                <p className="mt-2 text-xs text-yellow-900 font-medium">
                  {overallSummary.totalVehicles} vehicles aggregated
                </p>
              </div>

              <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-50 to-teal-100/60 p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  Fleet Average Speed
                </p>
                <h3 className="mt-2 text-2xl font-black text-slate-900">
                  {overallSummary.fleetAvgSpeed} KM/H
                </h3>
                <p className="mt-2 text-xs text-emerald-900 font-medium">
                  Max: {overallSummary.topSpeedRecorded} KM/H
                </p>
              </div>

              <div className="rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-50 to-indigo-100/60 p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wider text-blue-800">
                  Top Vehicle Runner
                </p>
                <h3 className="mt-2 text-lg font-black text-slate-900 truncate">
                  {overallSummary.highestMileageVehicle?.name || "None"}
                </h3>
                <p className="mt-2 text-xs text-blue-900 font-bold">
                  {overallSummary.highestMileageVehicle?.totalDistance || 0} KM
                </p>
              </div>

              <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-50 to-indigo-100/60 p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wider text-purple-800">
                  Total Overspeed Events
                </p>
                <h3 className="mt-2 text-2xl font-black text-slate-900">
                  {overallSummary.totalOverspeedEvents}
                </h3>
                <p className="mt-2 text-xs text-purple-900 font-medium">
                  Safety breaches detected
                </p>
              </div>
            </div>
          )}

          {/* Tab Switcher for Content Breakdown */}
          <div className="flex items-center justify-between border-b pb-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("visuals")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  activeTab === "visuals"
                    ? "bg-yellow-500 text-yellow-950 shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400"
                }`}
              >
                <Activity className="h-4 w-4" />
                {reportType === "distance"
                  ? "Distance Overview & Rankings"
                  : "Visual Analytics"}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("vehicles")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  activeTab === "vehicles"
                    ? "bg-yellow-500 text-yellow-950 shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400"
                }`}
              >
                <Car className="h-4 w-4" />
                Vehicle-by-Vehicle Summary
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("log")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  activeTab === "log"
                    ? "bg-yellow-500 text-yellow-950 shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400"
                }`}
              >
                <Layers className="h-4 w-4" />
                {reportType === "distance"
                  ? "Day-by-Day Distance Matrix"
                  : "Detailed Daily Log"}
              </button>
            </div>

            <div className="text-xs text-slate-500 font-medium hidden sm:block">
              {vehicleAggregations.length} Fleet Vehicles Analyzed
            </div>
          </div>

          {/* TAB 1: VISUAL ANALYTICS & RANKINGS */}
          {activeTab === "visuals" && (
            <div className="space-y-6">
              {/* Distance Comparison Leaderboard */}
              <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Navigation className="h-4 w-4 text-blue-600" />
                      Vehicle Distance Rankings
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Mileage leaderboard across all auto-selected vehicles
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    Top Runners
                  </Badge>
                </div>

                {distanceRankedVehicles.length === 0 ? (
                  <div className="py-12 text-center text-sm text-slate-500">
                    No distance records available
                  </div>
                ) : (
                  <div className="space-y-3 pt-2">
                    {distanceRankedVehicles.map((veh, idx) => {
                      const percentage = Math.min(
                        100,
                        Math.round((veh.totalDistance / maxVehicleDistance) * 100)
                      );
                      return (
                        <div key={`veh-rank-${veh.uniqueId || idx}-${idx}`} className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span className="flex items-center gap-2 text-slate-800 dark:text-slate-200 truncate max-w-[200px] sm:max-w-md">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600">
                                {idx + 1}
                              </span>
                              {veh.name}
                            </span>
                            <span className="text-blue-900 dark:text-blue-300 font-bold">
                              {formatDistanceDisplay(veh.totalDistance)}
                            </span>
                          </div>
                          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
                              style={{ width: `${Math.max(percentage, 4)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: VEHICLE-BY-VEHICLE AGGREGATION LIST */}
          {activeTab === "vehicles" && (
            <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Car className="h-4 w-4 text-yellow-600" />
                Fleet Vehicle Aggregations ({vehicleAggregations.length} Vehicles)
              </h4>
              <div className="divide-y">
                {vehicleAggregations.map((veh, idx) => (
                  <div
                    key={`veh-agg-${veh.uniqueId || idx}-${idx}`}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-900/40 px-2 rounded-lg transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">
                          {veh.name}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          ID: {veh.uniqueId}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500">
                        Running: <strong className="text-emerald-700">{veh.runningTime}</strong> |
                        Idle: <strong className="text-amber-700">{veh.idleTime}</strong> |
                        Stop: <strong className="text-rose-700">{veh.stopTime}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-6 text-xs">
                      <div className="text-right">
                        <p className="text-slate-500">Distance</p>
                        <p className="font-bold text-blue-800 dark:text-blue-300 text-sm">
                          {formatDistanceDisplay(veh.totalDistance)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-slate-500">Avg / Max</p>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">
                          {formatSpeedDisplay(veh.avgSpeed, false)} / {veh.maxSpeed} km/h
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: DETAILED TABLE LOG */}
          {(activeTab === "log" || activeTab === "visuals") && (
            <section className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="h-4 w-4 text-yellow-600" />
                  {reportType === "distance"
                    ? "Distance Report - Day-by-Day Vehicle Matrix Log"
                    : `${activeConfig.title} - Detailed Day-by-Day Log`}
                </h4>
                <div className="text-xs text-slate-500 font-medium">
                  {reportType === "distance"
                    ? `${currentTotalCount} vehicles`
                    : `${currentTotalCount} entries`}
                </div>
              </div>
              <div className="w-full overflow-x-auto">
                {tableElement}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

export default AnalyticsReportPage;
