"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { ReportFilter } from "@/components/report-filters/Report-Filter";
import { VisibilityState, ColumnDef } from "@tanstack/react-table";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";
import ResponseLoader from "@/components/ResponseLoader";
import { useStoppageSummaryReport } from "@/hooks/reports/useStoppageSummaryReport";
import { FaPlus, FaMinus } from "react-icons/fa";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TravelTable } from "@/components/travel-summary/TravelTable";
import { reverseGeocodeMapTiler } from "@/hooks/useReverseGeocoding";
import { useQueryClient } from "@tanstack/react-query";
import { useDeviceDropdownWithUniqueIdForHistory } from "@/hooks/useDropdown";
import { useExport } from "@/hooks/useExport";
import DownloadProgress from "@/components/DownloadProgress";
import { reportService } from "@/services/api/reportService";
import { toast } from "sonner";

// --- Types ---

interface Stop {
  stopStart: string;
  stopEnd: string;
  haltTime: string;
  haltSecs: number;
  latitude: number;
  longitude: number;
  distanceFromPrev: number;
  [key: string]: unknown;
}

interface DayWiseStop {
  date: string;
  totalStops: number;
  totalHaltTime: string;
  stops: Stop[];
}

interface ReportData {
  uniqueId: number;
  name: string;
  totalDistance: number;
  totalStopTime: string;
  dayWiseStops: DayWiseStop[];
  [key: string]: unknown;
}

// Flattened detail data for the nested table
interface StopDetailTableData {
  id: string;
  date: string;
  stopStart: string;
  stopEnd: string;
  haltTime: string;
  latitude: number;
  longitude: number;
  coordinates: string;
  address: string;
  distanceFromPrev: string;
  [key: string]: unknown;
}

interface ExpandedRowData extends ReportData {
  id: string;
  sn: number;
  isLoading?: boolean;
  isDetailTable?: boolean; // Used for Level 2 (Day Wise Table) container
  isEmpty?: boolean;
}

// --- Helper Functions ---

function formatDateTime(dateStr: string): string {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// --- Main Component ---

const StoppageSummaryReportPage: React.FC = () => {
  const [hasGenerated, setHasGenerated] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 20,
  });

  const [sorting, setSorting] = useState<any[]>([]);
  const [apiFilters, setApiFilters] = useState<{
    uniqueIds: number[];
    from?: string;
    to?: string;
  }>({
    uniqueIds: [],
    from: undefined,
    to: undefined,
  });

  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadLabel, setDownloadLabel] = useState("");
  const { exportToPDF, exportToExcel } = useExport();

  const updateProgress = (percent: number, label: string) => {
    setDownloadProgress(percent);
    setDownloadLabel(label);
  };

  const queryClient = useQueryClient();

  // Fetch device list for mapping names
  const { data: deviceList } = useDeviceDropdownWithUniqueIdForHistory();

  const deviceMap = useMemo(() => {
    if (!deviceList) return {};

    const items = Array.isArray(deviceList)
      ? deviceList
      : (deviceList as any).data || [];

    if (!Array.isArray(items)) return {};

    return items.reduce((acc: Record<string, string>, device: any) => {
      const id = device.uniqueId || device._id;
      if (id) {
        acc[String(id)] = device.name || "Unknown Device";
      }
      return acc;
    }, {});
  }, [deviceList]);

  // Expansion state
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set()); // Level 1: Vehicles
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set()); // Level 2: Days (key: vehicleId-date)

  // Cache for enriched stops (Level 3 data with addresses)
  const [enrichedDayStops, setEnrichedDayStops] = useState<
    Record<string, StopDetailTableData[]>
  >({});

  // Detail table sorting state per expanded row
  const [detailTableSorting, setDetailTableSorting] = useState<
    Record<string, any[]>
  >({});

  const { data: rawData, isFetching } = useStoppageSummaryReport({
    pagination,
    sorting,
    filters: {
      uniqueId: apiFilters.uniqueIds,
      from: apiFilters.from,
      to: apiFilters.to,
    },
    hasGenerated,
  });

  // Handle API response structure
  const reportDataItems = useMemo(() => {
    if (!rawData) return [];
    if (Array.isArray(rawData)) return rawData;
    if ((rawData as any)?.reportData && Array.isArray((rawData as any).reportData)) {
      return (rawData as any).reportData;
    }
    return (rawData as any)?.data || [];
  }, [rawData]);

  const totalRecords =
    (rawData as any)?.totalCount ||
    (rawData as any)?.total ||
    (rawData as any)?.count ||
    reportDataItems.length;

  // Step 1: Transform ONE day's stops (Level 3 enrichment)
  const transformDayStops = useCallback(
    async (dayDate: string, stops: Stop[]): Promise<StopDetailTableData[]> => {
      const enriched = await Promise.all(
        stops.map(async (stop: Stop, index: number) => {
          let address = "Address not available";
          if (stop.latitude && stop.longitude) {
            address = await reverseGeocodeMapTiler(
              stop.latitude,
              stop.longitude
            );
          }

          return {
            id: `stop-${dayDate}-${index}`,
            date: formatDate(dayDate),
            stopStart: formatDateTime(stop.stopStart),
            stopEnd: formatDateTime(stop.stopEnd),
            haltTime: stop.haltTime,
            latitude: stop.latitude,
            longitude: stop.longitude,
            coordinates: `${(stop.latitude ?? 0).toFixed(5)}, ${(
              stop.longitude ?? 0
            ).toFixed(5)}`,
            address: address,
            distanceFromPrev: `${(stop.distanceFromPrev ?? 0).toFixed(2)} KM`,
          };
        })
      );
      return enriched;
    },
    []
  );

  // Toggle Vehicle Expansion (Level 1)
  const toggleRowExpansion = useCallback(
    (rowId: string) => {
      const newExpandedRows = new Set(expandedRows);
      if (expandedRows.has(rowId)) {
        newExpandedRows.delete(rowId);
      } else {
        newExpandedRows.add(rowId);
      }
      setExpandedRows(newExpandedRows);
    },
    [expandedRows]
  );

  // Toggle Day Expansion (Level 2)
  const toggleDayExpansion = useCallback(
    async (vehicleId: string, day: DayWiseStop) => {
      const dayKey = `${vehicleId}-${day.date}`;
      const newExpandedDays = new Set(expandedDays);

      if (expandedDays.has(dayKey)) {
        newExpandedDays.delete(dayKey);
        setExpandedDays(newExpandedDays);
      } else {
        newExpandedDays.add(dayKey);
        setExpandedDays(newExpandedDays);

        if (!enrichedDayStops[dayKey] && day.stops?.length > 0) {
          try {
            const transformed = await transformDayStops(day.date, day.stops);
            setEnrichedDayStops((prev) => ({
              ...prev,
              [dayKey]: transformed,
            }));
          } catch (err) {
            console.error("Failed to enrich day stops:", err);
          }
        }
      }
    },
    [expandedDays, enrichedDayStops, transformDayStops]
  );

  // Prepare data with IDs (Level 1)
  const transformedReportData = useMemo(() => {
    return reportDataItems.map((item: ReportData, index: number) => ({
      ...item,
      id: `row-${item.uniqueId}`,
      sn: pagination.pageIndex * pagination.pageSize + index + 1,
    }));
  }, [reportDataItems, pagination]);

  // Create final flattened array for the Main Table (Level 1 + Level 2 Container)
  const expandedDataArray = useCallback((): ExpandedRowData[] => {
    const result: ExpandedRowData[] = [];
    transformedReportData.forEach((row: any) => {
      result.push(row);
      if (expandedRows.has(row.id)) {
        result.push({
          ...row,
          id: `${row.id}-details`,
          isDetailTable: true,
        });
      }
    });
    return result;
  }, [transformedReportData, expandedRows]);

  // --- Column Definitions ---

  // Level 3: Detailed Stops Columns
  const stopDetailColumns: ColumnDef<StopDetailTableData>[] = useMemo(
    () => [
      {
        accessorKey: "stopStart",
        header: "Start Time",
        size: 150,
      },
      {
        accessorKey: "stopEnd",
        header: "End Time",
        size: 150,
      },
      {
        accessorKey: "haltTime",
        header: "Duration",
        size: 100,
        cell: (info) => (
          <span className="text-gray-600 font-medium">
            {info.getValue() as string}
          </span>
        ),
      },
      {
        accessorKey: "coordinates",
        header: "Coordinates",
        cell: ({ row }) => (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={`https://www.google.com/maps?q=${row.original.latitude},${row.original.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline hover:text-blue-800 text-xs"
                >
                  {row.original.coordinates}
                </a>
              </TooltipTrigger>
              <TooltipContent className="bg-black/80 text-white">
                <p>View on Google Maps</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ),
      },
      {
        accessorKey: "address",
        header: "Address",
        size: 250,
        cell: ({ row }) => (
          <span
            className="text-gray-600 text-xs block min-w-[200px]"
            title={row.original.address}
          >
            {row.original.address}
          </span>
        ),
        meta: {
          wrapConfig: { wrap: "wrap", maxWidth: "300px" },
        },
      },
      {
        accessorKey: "distanceFromPrev",
        header: "Dist. (Prev)",
        size: 80,
      },
    ],
    []
  );

  // Level 1: Main Table Columns
  const columns: ColumnDef<ExpandedRowData>[] = useMemo(
    () => [
      {
        accessorKey: "sn",
        header: "SN",
        size: 80,
        cell: ({ row }) => {
          if (
            row.original.isDetailTable ||
            row.original.isEmpty ||
            row.original.isLoading
          )
            return null;

          const isExpanded = expandedRows.has(row.original.id);
          const hasStops =
            row.original.dayWiseStops &&
            row.original.dayWiseStops.some(
              (d: DayWiseStop) => d.totalStops > 0
            );

          return (
            <div className="flex items-center gap-2 justify-center">
              <span className="font-medium text-gray-600">
                {row.original.sn}
              </span>
              {hasStops && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleRowExpansion(row.original.id);
                  }}
                  className="p-1 hover:bg-gray-200 rounded-full transition-colors focus:outline-none"
                  title={isExpanded ? "Collapse Details" : "Expand Details"}
                >
                  {isExpanded ? (
                    <FaMinus className="text-red-500 text-xs" />
                  ) : (
                    <FaPlus className="text-green-600 text-xs" />
                  )}
                </button>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "name",
        id: "vehicleNumber",
        header: "Vehicle Number",
        size: 200,
        cell: ({ row }) => {
          // --- RENDER LEVEL 2 (Day Wise Table) ---
          if (row.original.isDetailTable) {
            const parentRow = transformedReportData.find(
              (r: ExpandedRowData) =>
                r.id === row.original.id.replace("-details", "")
            );
            if (!parentRow) return null;

            const dayWiseStops = parentRow.dayWiseStops || [];

            return (
              <div className="w-full bg-gray-50/50 border-l-4 border-blue-500 rounded p-4 my-2 transition-all shadow-inner">
                <div className="mb-3 text-sm font-bold text-gray-800 flex items-center gap-2 border-b pb-2">
                  <span>Day-wise Summary for {parentRow.name}</span>
                  <span className="text-xs font-normal text-gray-500 bg-white px-2 py-0.5 rounded border">
                    {dayWiseStops.length} Days Recorded
                  </span>
                </div>

                {/* Simple Table for Level 2 */}
                <div className="bg-white border rounded-lg overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b">
                      <tr>
                        <th className="px-4 py-2 w-16 text-center">Action</th>
                        <th className="px-4 py-2">Date</th>
                        <th className="px-4 py-2 text-center">Total Stops</th>
                        <th className="px-4 py-2 text-right">Total Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {dayWiseStops.map((day: DayWiseStop, idx: number) => {
                        const dayKey = `${parentRow.id}-${day.date}`;
                        const isDayExpanded = expandedDays.has(dayKey);
                        const hasDayStops = day.totalStops > 0;
                        const enrichedStops = enrichedDayStops[dayKey] || [];
                        const detailSorting = detailTableSorting[dayKey] || [];

                        return (
                          <React.Fragment key={idx}>
                            <tr
                              className={`hover:bg-blue-50/20 transition-colors ${
                                isDayExpanded ? "bg-blue-50" : ""
                              }`}
                            >
                              <td className="px-4 py-3 text-center">
                                {hasDayStops ? (
                                  <button
                                    onClick={() =>
                                      toggleDayExpansion(parentRow.id, day)
                                    }
                                    className="p-1.5 hover:bg-gray-200 rounded-md transition-colors border border-transparent hover:border-gray-300"
                                    title={
                                      isDayExpanded
                                        ? "Collapse Stops"
                                        : "Show Stops"
                                    }
                                  >
                                    {isDayExpanded ? (
                                      <FaMinus className="text-red-500 text-[10px]" />
                                    ) : (
                                      <FaPlus className="text-blue-600 text-[10px]" />
                                    )}
                                  </button>
                                ) : (
                                  <span className="text-gray-300">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 font-medium text-gray-800">
                                {formatDate(day.date)}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                                    day.totalStops > 0
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-gray-100 text-gray-400"
                                  }`}
                                >
                                  {day.totalStops}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right text-gray-600 font-mono text-xs">
                                {day.totalHaltTime}
                              </td>
                            </tr>

                            {/* --- RENDER LEVEL 3 (Details Table) --- */}
                            {isDayExpanded && (
                              <tr>
                                <td
                                  colSpan={4}
                                  className="p-0 border-b bg-gray-50"
                                >
                                  <div className="p-4 pl-12 border-l-4 border-l-blue-200">
                                    {enrichedStops.length > 0 ? (
                                      <div className="rounded-md border overflow-hidden shadow-sm">
                                        <TravelTable
                                          data={enrichedStops}
                                          columns={stopDetailColumns}
                                          totalCount={enrichedStops.length}
                                          sorting={detailSorting}
                                          onSortingChange={(val) =>
                                            setDetailTableSorting((prev) => ({
                                              ...prev,
                                              [dayKey]: val as any[],
                                            }))
                                          }
                                          manualSorting={false}
                                          emptyMessage="No stops found."
                                          showSerialNumber={true}
                                          maxHeight="300px"
                                        />
                                      </div>
                                    ) : (
                                      <div className="text-center py-6 text-gray-500 text-sm animate-pulse bg-white rounded border border-dashed">
                                        Loading details for {formatDate(day.date)}...
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                      {dayWiseStops.length === 0 && (
                        <tr>
                          <td
                            colSpan={4}
                            className="p-4 text-center text-gray-500 italic"
                          >
                            No summary data available for this range.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          }

          if (row.original.isLoading) return null;
          if (row.original.isEmpty) return null;

          const displayName =
            deviceMap[String(row.original.uniqueId)] ||
            row.original.name ||
            row.original.uniqueId;

          return (
            <span
              className="font-semibold text-gray-800 block truncate"
              title={String(displayName)}
            >
              {displayName}
            </span>
          );
        },
      },
      {
        accessorKey: "totalDistance",
        header: "Total Distance (KM)",
        cell: ({ row }) => {
          if (
            row.original.isDetailTable ||
            row.original.isEmpty ||
            row.original.isLoading
          )
            return null;
          return (
            <div className="text-center font-bold bg-gray-100 px-3 py-1 rounded-full w-fit mx-auto text-gray-700 text-xs border border-gray-200">
              {row.original.totalDistance?.toFixed(2) ?? 0}
            </div>
          );
        },
      },
      {
        accessorKey: "totalStopTime",
        header: "Total Stop Time",
        cell: ({ row }) => {
          if (
            row.original.isDetailTable ||
            row.original.isEmpty ||
            row.original.isLoading
          )
            return null;
          return (
            <div className="text-center font-mono text-xs text-gray-600">
              {row.original.totalStopTime}
            </div>
          );
        },
      },
    ],
    [
      expandedRows,
      expandedDays,
      enrichedDayStops,
      detailTableSorting,
      transformedReportData,
      toggleRowExpansion,
      toggleDayExpansion,
      stopDetailColumns,
      deviceMap,
    ]
  );

  // --- Export Logic ---

  const fetchReportForExport = async (): Promise<any[]> => {
    const rawUniqueId = apiFilters.uniqueIds;
    const uniqueIds = Array.isArray(rawUniqueId)
      ? rawUniqueId.map(Number).filter((id) => !Number.isNaN(id))
      : [];

    const params = {
      from: apiFilters.from!,
      to: apiFilters.to!,
      page: 1,
      limit: totalRecords > 0 ? totalRecords : "all",
      sortBy: sorting?.[0]?.id,
      sortOrder: sorting?.[0]?.desc ? "desc" : "asc",
    };

    const res = await reportService.getStoppageSummaryReport({
      uniqueIds,
      ...params,
    });

    let dataArray: any[] = [];
    if (Array.isArray(res)) {
      dataArray = res;
    } else {
      dataArray = (res as any)?.reportData || (res as any)?.data || [];
    }

    return dataArray;
  };

  const prepareExportData = async (data: any[]) => {
    const totalVehicles = data.length;
    const prepared = [];

    for (let i = 0; i < totalVehicles; i++) {
      const vehicle = data[i];
      const vehicleName =
        deviceMap[String(vehicle.uniqueId)] || vehicle.name || vehicle.uniqueId;

      updateProgress(
        40 + (i / totalVehicles) * 40,
        `Processing & Geocoding: ${vehicleName}...`
      );

      const allStops: any[] = [];
      for (const day of vehicle.dayWiseStops || []) {
        for (const stop of day.stops || []) {
          let address = "Address not available";
          if (stop.latitude && stop.longitude) {
            try {
              address = await reverseGeocodeMapTiler(
                stop.latitude,
                stop.longitude
              );
            } catch (err) {
              console.error("Geocoding failed for export:", err);
            }
          }

          allStops.push({
            date: formatDate(day.date),
            stopStart: formatDateTime(stop.stopStart),
            stopEnd: formatDateTime(stop.stopEnd),
            haltTime: stop.haltTime,
            address: address,
            distanceFromPrev: `${(stop.distanceFromPrev ?? 0).toFixed(2)} KM`,
            coordinates: `${(stop.latitude ?? 0).toFixed(5)}, ${(
              stop.longitude ?? 0
            ).toFixed(5)}`,
          });
        }
      }

      prepared.push({
        SN: i + 1,
        "Vehicle Number": vehicleName,
        "Unique ID": vehicle.uniqueId,
        "Total Distance (KM)": vehicle.totalDistance?.toFixed(2) ?? "0",
        "Total Stop Time": vehicle.totalStopTime || "0D, 0H, 0M, 0S",
        details: allStops,
      });
    }
    return prepared;
  };

  const handleExport = async (type: "pdf" | "excel") => {
    if (
      !hasGenerated ||
      !apiFilters.uniqueIds.length ||
      !apiFilters.from ||
      !apiFilters.to
    ) {
      toast.error("Please generate the report first.");
      return;
    }

    try {
      setIsDownloading(true);
      updateProgress(10, "Fetching report data...");

      const rawData = await fetchReportForExport();
      if (!rawData || rawData.length === 0) {
        toast.error("No data found for the selected range.");
        setIsDownloading(false);
        return;
      }

      updateProgress(30, "Preparing report structure...");
      const preparedData = await prepareExportData(rawData);

      updateProgress(85, `Finalizing ${type.toUpperCase()} generation...`);

      const mainExportColumns = [
        { key: "SN", header: "SN", width: 10 },
        { key: "Vehicle Number", header: "Vehicle Number", width: 25 },
        { key: "Unique ID", header: "Unique ID", width: 20 },
        { key: "Total Distance (KM)", header: "Total Distance (KM)", width: 20 },
        { key: "Total Stop Time", header: "Total Stop Time", width: 20 },
      ];

      const nestedColumns = [
        { key: "date", header: "Date", width: 15 },
        { key: "stopStart", header: "Start Time", width: 25 },
        { key: "stopEnd", header: "End Time", width: 25 },
        { key: "haltTime", header: "Duration", width: 15 },
        { key: "address", header: "Address", width: 50 },
        { key: "distanceFromPrev", header: "Dist from Prev", width: 15 },
        { key: "coordinates", header: "Coordinates", width: 25 },
      ];

      const exportConfig = {
        title: "Stoppage Summary Report",
        metadata: {
          "From Date": formatDate(apiFilters.from!),
          "To Date": formatDate(apiFilters.to!),
        },
        nestedTable: {
          dataKey: "details",
          columns: nestedColumns,
          title: "Stop Details",
        },
      };

      if (type === "pdf") {
        await exportToPDF(preparedData, mainExportColumns, exportConfig);
      } else {
        await exportToExcel(preparedData, mainExportColumns, exportConfig);
      }

      updateProgress(100, "Download successful!");
    } catch (error) {
      console.error("Export Error:", error);
      toast.error("An error occurred during export.");
    } finally {
      setTimeout(() => {
        setIsDownloading(false);
        setDownloadProgress(0);
        setDownloadLabel("");
      }, 1000);
    }
  };

  const { tableElement } = CustomTableServerSidePagination({
    data: expandedDataArray(),
    columns,
    pagination,
    totalCount: totalRecords,
    loading: isFetching,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    sorting,
    columnVisibility,
    onColumnVisibilityChange: setColumnVisibility,
    emptyMessage: isFetching
      ? "Loading report data..."
      : "No data available. Generate a report to see details.",
    pageSizeOptions: [20, 30, 40, 50],
    enableSorting: false,
    showSerialNumber: false,
    enableVirtualization: false,
    estimatedRowHeight: 50,
    overscan: 5,
    maxHeight: "calc(100vh - 400px)",
  });

  return (
    <div className="p-4 flex flex-col h-[calc(100vh-10px)] pb-2">
      <ResponseLoader isLoading={isFetching} />

      <DownloadProgress
        open={isDownloading}
        progress={downloadProgress}
        label={downloadLabel}
      />

      <ReportFilter
        onSubmit={(filters) => {
          let ids: number[] = [];
          if (Array.isArray(filters.deviceId)) {
            ids = filters.deviceId.map(Number).filter((id) => !Number.isNaN(id));
          } else if (typeof filters.deviceId === "string" && filters.deviceId.trim()) {
            ids = filters.deviceId
              .split(",")
              .map((s) => Number(s.trim()))
              .filter((id) => !Number.isNaN(id));
          }

          if (!ids.length || !filters.from || !filters.to) {
            alert("Please select vehicle and dates");
            return;
          }
          setApiFilters({
            uniqueIds: ids,
            from: filters.from,
            to: filters.to,
          });
          setHasGenerated(true);
          setExpandedRows(new Set());
          setExpandedDays(new Set());
          setPagination({ pageIndex: 0, pageSize: 20 });
        }}
        className="mb-4 flex-shrink-0"
        config={{
          showSchool: true,
          showBranch: true,
          requireSchool: false,
          requireBranch: false,
          showDevice: true,
          showDateRange: true,
          showSubmitButton: true,
          submitButtonText: isFetching ? "Generating..." : "Generate",
          submitButtonDisabled: isFetching,
          cardTitle: "Stoppage Summary Report",
          multiSelectDevice: true,
          showBadges: true,
          maxBadges: 3,
          arrayFormat: "array",
          showExport: true,
          exportOptions: ["excel", "pdf"],
        }}
        onExportClick={handleExport}
      />

      {hasGenerated && <div>{tableElement}</div>}
    </div>
  );
};

export default StoppageSummaryReportPage;

