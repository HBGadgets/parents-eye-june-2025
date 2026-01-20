"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  ReportFilter,
  FilterValues,
  DateRange,
} from "@/components/report-filters/Report-Filter";
import {
  VisibilityState,
  type ColumnDef,
  PaginationState,
  SortingState,
} from "@tanstack/react-table";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";
import ResponseLoader from "@/components/ResponseLoader";
import { useReport } from "@/hooks/reports/useReport";
import { FaPlay, FaPlus, FaMinus } from "react-icons/fa";
import { TravelTable } from "@/components/travel-summary/TravelTable";
import { useExport } from "@/hooks/useExport";
import { api } from "@/services/apiService";
import DownloadProgress from "@/components/DownloadProgress";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DayWiseTrips, TravelSummaryReport } from "@/interface/modal";
import { useQueryClient } from "@tanstack/react-query";
import { reverseGeocodeMapTiler } from "@/hooks/useReverseGeocoding";
import { PlaybackHistoryDrawer } from "@/components/travel-summary/playback-history-drawer";

///////////////////////////////DEMO DATA INTERFACES///////////////////////////////
import { deviceWithTrip } from "@/data/playback-nested";
///////////////////////////////DEMO DATA INTERFACES///////////////////////////////

// Interface for nested table data (transformed from DayWiseTrips)
interface TravelDetailTableData {
  id: string;
  uniqueId: number;
  vehicleName: string;
  reportDate: string;
  ignitionStart: string;
  startLocation: string;
  startCoordinates: string;
  distance: string;
  running: string;
  idle: string;
  stopped: string;
  overspeed: string;
  maxSpeed: string;
  avgSpeed: string;
  endLocation: string;
  endCoordinates: string;
  ignitionStop: string;
  play?: string;
}

// Extended interface for expanded row data
interface ExpandedRowData extends TravelSummaryReport {
  id: string;
  sn: number;
  isLoading?: boolean;
  isDetailTable?: boolean;
  isEmpty?: boolean;
  detailData?: TravelDetailTableData[];
}

const TravelSummaryReportPage: React.FC = () => {
  // Download progress state
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadLabel, setDownloadLabel] = useState("");

  // Filter state
  const queryClient = useQueryClient();
  const [shouldFetch, setShouldFetch] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [playbackOpen, setPlaybackOpen] = useState(false);
  const [playbackPayload, setPlaybackPayload] = useState<{
    uniqueId: number;
    vehicleName: string;
    startDate: string;
    endDate: string;
  } | null>(null);

  // Table state
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [showTable, setShowTable] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);

  // Expansion state
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [detailedData, setDetailedData] = useState<
    Record<string, TravelDetailTableData[]>
  >({});

  // Detail table pagination & sorting state per expanded row
  const [detailTableStates, setDetailTableStates] = useState<
    Record<
      string,
      {
        pagination: PaginationState;
        sorting: SortingState;
      }
    >
  >({});

  // Filter state for API
  const [apiFilters, setApiFilters] = useState<Record<string, any>>({
    schoolId: undefined,
    branchId: undefined,
    uniqueId: undefined,
    from: undefined,
    to: undefined,
  });
  const [cashedDeviceId, setCashedDeviceId] = useState<
    { _id: string; name: string; uniqueId: string }[] | null
  >(null);
  
  // Table data with enriched addresses
  const [tableData, setTableData] = useState<TravelSummaryReport[]>([]);
  const lastProcessedRef = React.useRef<string>("");

  // Fetch report data using the hook
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

  // Export hook
  const { exportToPDF, exportToExcel } = useExport();

  // Update progress helper
  const updateProgress = (percent: number, label: string) => {
    setDownloadProgress(percent);
    setDownloadLabel(label);
  };

  useEffect(() => {
    const cachedDevices = queryClient.getQueryData<
      { _id: string; name: string; uniqueId: string }[]
    >(["device-dropdown-uniqueId", apiFilters.branchId]);
    setCashedDeviceId(cachedDevices?.data?.data);
  }, [travelSummaryReport]);

  // Enrich travel summary data with addresses (including nested dayWiseTrips)
  const enrichTravelSummaryWithAddress = async (
    rows: TravelSummaryReport[]
  ): Promise<TravelSummaryReport[]> => {
    return Promise.all(
      rows.map(async (row) => {
        // Enrich main row addresses
        let startAddress = "-";
        let endAddress = "-";
        
        if (row.startLat && row.startLong && row.endLat && row.endLong) {
          const [start, end] = await Promise.all([
            reverseGeocodeMapTiler(row.startLat, row.startLong),
            reverseGeocodeMapTiler(row.endLat, row.endLong),
          ]);
          startAddress = start || "-";
          endAddress = end || "-";
        }

        // Enrich nested dayWiseTrips with addresses
        let enrichedDayWiseTrips = row.dayWiseTrips || [];
        if (row.dayWiseTrips?.length) {
          enrichedDayWiseTrips = await Promise.all(
            row.dayWiseTrips.map(async (trip) => {
              let tripStartAddress = trip.startAddress || "-";
              let tripEndAddress = trip.endAddress || "-";

              // Fetch start address if coordinates exist but no address
              if (!trip.startAddress && trip.startLatitude && trip.startLongitude) {
                tripStartAddress = await reverseGeocodeMapTiler(
                  Number(trip.startLatitude),
                  Number(trip.startLongitude)
                ) || "-";
              }

              // Fetch end address if coordinates exist but no address
              if (!trip.endAddress && trip.endLatitude && trip.endLongitude) {
                tripEndAddress = await reverseGeocodeMapTiler(
                  Number(trip.endLatitude),
                  Number(trip.endLongitude)
                ) || "-";
              }

              return {
                ...trip,
                startAddress: tripStartAddress,
                endAddress: tripEndAddress,
              };
            })
          );
        }

        return {
          ...row,
          startAddress,
          endAddress,
          dayWiseTrips: enrichedDayWiseTrips,
        };
      })
    );
  };

  // Effect to enrich data with addresses when travelSummaryReport changes
  useEffect(() => {
    if (!travelSummaryReport?.length) {
      if (tableData.length !== 0) setTableData([]);
      return;
    }
    const currentHash = JSON.stringify(travelSummaryReport);
    if (lastProcessedRef.current === currentHash) return;
    lastProcessedRef.current = currentHash;

    const enrich = async () => {
      const enriched = await enrichTravelSummaryWithAddress(travelSummaryReport);
      setTableData(enriched);
    };

    enrich();
  }, [travelSummaryReport]);

  // Transform day-wise trips data for nested table (with address fetching)
  const transformDayWiseData = useCallback(
    async (
      dayWiseTrips: DayWiseTrips[],
      vehicleName: string
    ): Promise<TravelDetailTableData[]> => {
      return Promise.all(
        dayWiseTrips.map(async (trip, index) => {
          // Fetch addresses for start and end coordinates
          let startLocation = trip.startAddress || "-";
          let endLocation = trip.endAddress || "-";

          // Fetch addresses if coordinates exist but no address
          if (!trip.startAddress && trip.startLatitude && trip.startLongitude) {
            startLocation = await reverseGeocodeMapTiler(
              Number(trip.startLatitude),
              Number(trip.startLongitude)
            ) || "-";
          }

          if (!trip.endAddress && trip.endLatitude && trip.endLongitude) {
            endLocation = await reverseGeocodeMapTiler(
              Number(trip.endLatitude),
              Number(trip.endLongitude)
            ) || "-";
          }

          return {
            id: `day-${trip.date}-${index}`,
            uniqueId: trip.uniqueId,
            vehicleName: vehicleName,
            reportDate: new Date(trip.date).toLocaleDateString(),
            ignitionStart: trip.startTime
              ? new Date(trip.startTime).toLocaleString("en-GB", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: true,
                  timeZone: "UTC",
                })
              : "-",
            startLocation: startLocation,
            startCoordinates:
              trip.startLatitude && trip.startLongitude
                ? `${trip.startLatitude}, ${trip.startLongitude}`
                : "-",
            distance: trip.distance,
            running: trip.runningTime,
            idle: trip.idleTime,
            stopped: trip.stopTime,
            overspeed: trip.overspeedTime,
            workingHours: trip.workingHours,
            maxSpeed: trip.maxSpeed,
            avgSpeed: trip.avgSpeed,
            endLocation: endLocation,
            endCoordinates:
              trip.endLatitude && trip.endLongitude
                ? `${trip.endLatitude}, ${trip.endLongitude}`
                : "-",
            ignitionStop: trip.endTime
              ? new Date(trip.endTime).toLocaleString("en-GB", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: true,
                  timeZone: "UTC",
                })
              : "-",
            play: "▶",
          };
        })
      );
    },
    []
  );

  // Toggle row expansion
  const toggleRowExpansion = useCallback(
    async (rowId: string, rowData: TravelSummaryReport) => {
      // console.log("🔄 Toggling row expansion for:", rowId);
      const newExpandedRows = new Set(expandedRows);

      if (expandedRows.has(rowId)) {
        // Collapse row
        // console.log("➖ Collapsing row:", rowId);
        newExpandedRows.delete(rowId);
      } else {
        // Expand row
        // console.log("➕ Expanding row:", rowId);
        newExpandedRows.add(rowId);

        // Initialize detail table state if not exists
        if (!detailTableStates[rowId]) {
          setDetailTableStates((prev) => ({
            ...prev,
            [rowId]: {
              pagination: { pageIndex: 0, pageSize: 10 },
              sorting: [],
            },
          }));
        }

        // Load detailed data if not already loaded
        if (!detailedData[rowId] && rowData.dayWiseTrips) {
          try {
            // console.log("🔄 Transforming dayWiseTrips:", rowData.dayWiseTrips);
            const transformedDetails = await transformDayWiseData(
              rowData.dayWiseTrips,
              rowData.name
            );
            // console.log("✅ Transformed details:", transformedDetails);
            setDetailedData((prev) => ({
              ...prev,
              [rowId]: transformedDetails,
            }));
          } catch (error) {
            // console.error("❌ Error transforming day-wise data:", error);
            setDetailedData((prev) => ({
              ...prev,
              [rowId]: [],
            }));
          }
        } else {
          // console.log("ℹ️ Detail data already exists for:", rowId);
        }
      }

      setExpandedRows(newExpandedRows);
      // console.log("✅ Updated expandedRows:", Array.from(newExpandedRows));
    },
    [expandedRows, detailedData, transformDayWiseData, detailTableStates]
  );

  // Handle detail table pagination change
  const handleDetailPaginationChange = useCallback(
    (rowId: string, pagination: PaginationState) => {
      setDetailTableStates((prev) => ({
        ...prev,
        [rowId]: {
          ...prev[rowId],
          pagination,
        },
      }));
    },
    []
  );

  // Handle detail table sorting change
  const handleDetailSortingChange = useCallback(
    (rowId: string, sorting: SortingState) => {
      setDetailTableStates((prev) => ({
        ...prev,
        [rowId]: {
          ...prev[rowId],
          sorting,
        },
      }));
    },
    []
  );

  // Transform API data to include row IDs and serial numbers
  const transformedReportData = useMemo(() => {
    const transformed = tableData.map(
      (item: TravelSummaryReport, index: number) => {
        // Resolve uniqueId: prioritize item's own uniqueId, fallback to first dayWiseTrip's uniqueId
        const resolvedUniqueId = item.uniqueId || item.dayWiseTrips?.[0]?.uniqueId;
        
        // Match uniqueId with cachedDeviceId to get the correct vehicle name
        const matchedDevice = cashedDeviceId?.find(
          (device) => String(device.uniqueId) === String(resolvedUniqueId)
        );
        const vehicleName = matchedDevice?.name || item.name || '-';
        
        return {
          ...item,
          uniqueId: resolvedUniqueId,
          name: vehicleName,
          id: `row-${resolvedUniqueId}-${index}`,
          sn: pagination.pageIndex * pagination.pageSize + index + 1,
        };
      }
    );
    // console.log("📊 Transformed report data:", transformed);
    return transformed;
  }, [tableData, pagination, cashedDeviceId]);

  // Create expanded data array with detail rows injected
  const createExpandedData = useCallback((): ExpandedRowData[] => {
    const expandedDataArray: ExpandedRowData[] = [];

    transformedReportData.forEach((row) => {
      // console.log(`➡️ Processing row: ${row.id}`);
      // Add main row
      expandedDataArray.push(row);

      // Add detail row if expanded
      if (expandedRows.has(row.id)) {
        // console.log(`🔍 Row ${row.id} is expanded, checking detail data...`);
        if (detailedData[row.id]?.length) {
          // console.log(`✅ Adding detail table for ${row.id}`);
          expandedDataArray.push({
            ...row,
            id: `${row.id}-details`,
            isDetailTable: true,
            detailData: detailedData[row.id],
          });
        } else {
          // console.log(`⚠️ No detail data for ${row.id}`);
          expandedDataArray.push({
            ...row,
            id: `${row.id}-empty`,
            isEmpty: true,
          });
        }
      }
    });

    // console.log("📋 Final expanded data array:", expandedDataArray);
    return expandedDataArray;
  }, [transformedReportData, expandedRows, detailedData]);

  // Column definitions for nested detail table
  const travelDetailColumns: ColumnDef<TravelDetailTableData>[] = useMemo(
    () => [
      {
        accessorKey: "vehicleName",
        header: "Vehicle No.",
        size: 150,
      },
      { accessorKey: "reportDate", header: "Report Date", size: 120 },
      { accessorKey: "ignitionStart", header: "Ignition Start", size: 180 },
      { accessorKey: "startLocation", header: "Start Location", meta: {
      wrapConfig: { wrap: "wrap", maxWidth: "260px" },
    }, },
      {
        header: "Start Coordinates",
        accessorKey: "startCoordinates",
        cell: ({ getValue }) => {
          const value = getValue<string>();
          if (!value || value === "-") return "-";

          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={`https://www.google.com/maps?q=${value}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline hover:text-blue-800"
                  >
                    {value}
                  </a>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="bg-black/80 text-white font-bold rounded-md px-3 py-2 shadow-lg"
                >
                  <p>Click to see on Google Map</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        },
      },
      { accessorKey: "distance", header: "Distance", size: 100 },
      { accessorKey: "running", header: "Running", size: 120 },
      { accessorKey: "idle", header: "Idle", size: 120 },
      { accessorKey: "stopped", header: "Stopped", size: 120 },
      // { accessorKey: "overspeed", header: "Overspeed", size: 120 },
      {accessorKey: "workingHours", header: "Working Hours", size: 120},

      {
        accessorKey: "maxSpeed",
        cell: ({ row }) => {
          if (
            row.original.isLoading ||
            row.original.isDetailTable ||
            row.original.isEmpty
          )
            return null;
          const maxSpeed = Number(row.original.maxSpeed);
          return Number.isFinite(maxSpeed) ? maxSpeed.toFixed(2) : "0.00";
        },
        header: "Max Speed",
        size: 120,
      },
      {
        accessorKey: "avgSpeed",
        cell: ({ row }) => {
          if (
            row.original.isLoading ||
            row.original.isDetailTable ||
            row.original.isEmpty
          )
            return null;
          const avgSpeed = Number(row.original.avgSpeed);
          return Number.isFinite(avgSpeed) ? avgSpeed.toFixed(2) : "0.00";
        },
        header: "Avg Speed",
        size: 120,
      },
      { accessorKey: "endLocation", header: "End Location", meta: {
      wrapConfig: { wrap: "wrap", maxWidth: "260px" },
    }, },
      {
        accessorKey: "endCoordinates",
        header: "End Co-ordinate",
        cell: ({ getValue }) => {
          const value = getValue<string>();
          if (!value || value === "-") return "-";

          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={`https://www.google.com/maps?q=${value}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline hover:text-blue-800"
                  >
                    {value}
                  </a>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="bg-black/80 text-white font-bold rounded-md px-3 py-2 shadow-lg"
                >
                  <p>Click to see on Google Map</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        },
      },
      { accessorKey: "ignitionStop", header: "Ignition Stop", size: 180 },
      {
        accessorKey: "play",
        header: "Play",
        size: 80,
        cell: ({ row }) => (
          <div className="flex justify-center">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <FaPlay
                    className="text-green-600 text-xl cursor-pointer"
                    onClick={() => handlePlayback(row.original)}
                  />
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="bg-black/80 text-white font-bold rounded-md px-3 py-2 shadow-lg"
                >
                  <p>Click to see playback history</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        ),
      },
    ],
    []
  );

  // Main table column definitions with expansion capability
  const columns: ColumnDef<ExpandedRowData>[] = useMemo(
    () => [
      {
        id: "expand",
        header: "",
        size: 50,
        cell: ({ row }) => {
          if (
            row.original.isLoading ||
            row.original.isDetailTable ||
            row.original.isEmpty
          )
            return null;

          const isExpanded = expandedRows.has(row.original.id);
          const hasDayWiseTrips = row.original.dayWiseTrips?.length > 0;

          // Don't show expand button if no day-wise trips
          if (!hasDayWiseTrips) return null;

          return (
            <div className="flex justify-center">
              <button
                onClick={() =>
                  toggleRowExpansion(row.original.id, row.original)
                }
                className="p-1 hover:bg-gray-100 rounded transition-colors cursor-pointer"
                aria-label={isExpanded ? "Collapse row" : "Expand row"}
              >
                <span
                  className={`inline-flex items-center justify-center transition-all duration-300 ease-in-out
      ${isExpanded ? "rotate-180 scale-110" : "rotate-0 scale-100"}`}
                >
                  {isExpanded ? (
                    <FaMinus className="text-red-500 text-sm transition-opacity duration-200" />
                  ) : (
                    <FaPlus className="text-green-500 text-sm transition-opacity duration-200" />
                  )}
                </span>
              </button>
            </div>
          );
        },
        enableSorting: false,
      },
      {
        accessorKey: "sn",
        header: "SN",
        size: 80,
        cell: ({ row }) => {
          if (
            row.original.isLoading ||
            row.original.isDetailTable ||
            row.original.isEmpty
          )
            return null;
          return row.original.sn;
        },
      },
      {
        id: "vehicleNumber",
        accessorKey: "name",
        header: "Vehicle Number",
        size: 200,
        cell: ({ row }) => {
          // Detail table rendering
          if (row.original.isDetailTable && row.original.detailData) {
            const parentRowId = row.original.id.replace("-details", "");
            const detailState = detailTableStates[parentRowId] || {
              pagination: { pageIndex: 0, pageSize: 10 },
              sorting: [],
            };

            return (
              <div className="col-span-full w-full">
                <div className="w-full bg-gray-50 rounded p-4 my-2">
                  <h3 className="text-sm font-semibold mb-2 text-gray-700">
                    Day-Wise Travel Details for {row.original.name}
                  </h3>
                  <TravelTable
                    data={row.original.detailData}
                    columns={travelDetailColumns}
                    pagination={detailState.pagination}
                    totalCount={row.original.detailData.length}
                    onPaginationChange={(newPagination) =>
                      handleDetailPaginationChange(parentRowId, newPagination)
                    }
                    onSortingChange={(newSorting) =>
                      handleDetailSortingChange(parentRowId, newSorting)
                    }
                    sorting={detailState.sorting}
                    emptyMessage="No detailed data available"
                    pageSizeOptions={[10, 20, 30]}
                    showSerialNumber={true}
                    maxHeight="400px"
                  />
                </div>
              </div>
            );
          }

          // Loading state
          if (row.original.isLoading) {
            return (
              <div className="col-span-full w-full">
                <div className="p-4 bg-gray-50 rounded">
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                    <span className="ml-2 text-gray-600">
                      Loading detailed data...
                    </span>
                  </div>
                </div>
              </div>
            );
          }

          // Empty state
          if (row.original.isEmpty) {
            return (
              <div className="col-span-full w-full">
                <div className="p-4 bg-gray-50 rounded text-center text-gray-500">
                  No detailed data available for {row.original.name}
                </div>
              </div>
            );
          }

          // Normal cell rendering
          return row.original.name;
        },
      },
      {
        accessorKey: "startAddress",
        header: "Start Address",
        meta: {
      wrapConfig: { wrap: "wrap", maxWidth: "260px" },
    },
        cell: ({ row }) => {
          if (
            row.original.isLoading ||
            row.original.isDetailTable ||
            row.original.isEmpty
          )
            return null;
          return row.original.startAddress || "-";
        },
      },
      {
        accessorKey: "startCoordinates",
        header: "Start Coordinate",
        meta: {
      wrapConfig: { wrap: "wrap", maxWidth: "260px" },
    },
        cell: ({ row }) => {
          if (
            row.original.isLoading ||
            row.original.isDetailTable ||
            row.original.isEmpty
          )
            return null;

          const lat = row.original.startLat;
          const lng = row.original.startLong;

          if (!lat || !lng) return "--, --";

          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={`https://www.google.com/maps?q=${lat},${lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline hover:text-blue-800"
                  >
                    {lat}, {lng}
                  </a>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="bg-black/80 text-white font-bold rounded-md px-3 py-2 shadow-lg"
                >
                  <p>Click to see on Google Map</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        },
      },

      {
        accessorKey: "distance",
        header: "Distance",
        size: 150,
        cell: ({ row }) => {
          if (
            row.original.isLoading ||
            row.original.isDetailTable ||
            row.original.isEmpty
          )
            return null;

          const distance = Number(row.original.distance);

          return Number.isFinite(distance) ? distance.toFixed(2) : "0.00";
        },
      },
      {
        accessorKey: "running",
        header: "Running Time",
        size: 180,
        cell: ({ row }) => {
          if (
            row.original.isLoading ||
            row.original.isDetailTable ||
            row.original.isEmpty
          )
            return null;
          return row.original.running || "0D, 0H, 0M, 0S";
        },
      },
      {
        accessorKey: "idle",
        header: "Idle Time",
        size: 180,
        cell: ({ row }) => {
          if (
            row.original.isLoading ||
            row.original.isDetailTable ||
            row.original.isEmpty
          )
            return null;
          return row.original.idle || "0D, 0H, 0M, 0S";
        },
      },
      {
        accessorKey: "stop",
        header: "Stop Time",
        size: 180,

        cell: ({ row }) => {
          if (
            row.original.isLoading ||
            row.original.isDetailTable ||
            row.original.isEmpty
          )
            return null;
          return row.original.stop || "0D, 0H, 0M, 0S";
        },
      },
      // {
      //   accessorKey: "overspeed",
      //   header: "Overspeed Time",
      //   size: 150,
      //   cell: ({ row }) => {
      //     if (
      //       row.original.isLoading ||
      //       row.original.isDetailTable ||
      //       row.original.isEmpty
      //     )
      //       return null;
      //     return row.original.overspeed || "0D, 0H, 0M, 0S";
      //   },
      // },
      {
        accessorKey: "workingHours",
        header: "Working Hours",
        size: 150,
        cell: ({ row }) => {
          if (
            row.original.isLoading ||
            row.original.isDetailTable ||
            row.original.isEmpty
          )
            return null;
          return row.original.workingHours || "0D, 0H, 0M, 0S";
        },
      },

      {
        accessorKey: "maxSpeed",
        header: "Max Speed",
        size: 150,
        cell: ({ row }) => {
          if (
            row.original.isLoading ||
            row.original.isDetailTable ||
            row.original.isEmpty
          )
            return null;
          const maxSpeed = Number(row.original.maxSpeed);
          return Number.isFinite(maxSpeed) ? maxSpeed.toFixed(2) : "0.00";
        },
      },
      {
        accessorKey: "avgSpeed",
        header: "Avg Speed",
        size: 150,
        cell: ({ row }) => {
          if (
            row.original.isLoading ||
            row.original.isDetailTable ||
            row.original.isEmpty
          )
            return null;
          const avgSpeed = Number(row.original.avgSpeed);
          return Number.isFinite(avgSpeed) ? avgSpeed.toFixed(2) : "0.00";
        },
      },
      {
        accessorKey: "endAddress",
        header: "End Address",
        meta: {
      wrapConfig: { wrap: "wrap", maxWidth: "260px" },
    },
        cell: ({ row }) => {
          if (
            row.original.isLoading ||
            row.original.isDetailTable ||
            row.original.isEmpty
          )
            return null;
          return row.original.endAddress || "-";
        },
      },
      {
        accessorKey: "endCoordinates",
        header: "End Coordinate",
       meta: {
      wrapConfig: { wrap: "wrap", maxWidth: "260px" },
    },
        cell: ({ row }) => {
          if (
            row.original.isLoading ||
            row.original.isDetailTable ||
            row.original.isEmpty
          )
            return null;

          const lat = row.original.endLat;
          const lng = row.original.endLong;

          if (!lat || !lng) return "--, --";

          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={`https://www.google.com/maps?q=${lat},${lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline hover:text-blue-800"
                  >
                    {lat}, {lng}
                  </a>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="bg-black/80 text-white font-bold rounded-md px-3 py-2 shadow-lg"
                >
                  <p>Click to see on Google Map</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        },
      },
      {
        id: "play",
        header: "Play",
        size: 100,
        cell: ({ row }) => {
          if (
            row.original.isLoading ||
            row.original.isDetailTable ||
            row.original.isEmpty
          )
            return null;
          return (
            <div className="flex justify-center">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <FaPlay
                      className="text-green-600 text-xl cursor-pointer"
                      onClick={() => handlePlayback(row.original)}
                    />
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="bg-black/80 text-white font-bold rounded-md px-3 py-2 shadow-lg"
                  >
                    <p>Click to see playback history</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          );
        },
      },
    ],
    [
      expandedRows,
      detailedData,
      detailTableStates,
      toggleRowExpansion,
      handleDetailPaginationChange,
      handleDetailSortingChange,
      travelDetailColumns,
    ]
  );

  // Handle filter submission
  const handleFilterSubmit = useCallback((filters: FilterValues) => {
    // console.log("✅ Filter submitted:", filters);

    // Reset all states
    setPagination({ pageIndex: 0, pageSize: 10 });
    setSorting([]);
    setExpandedRows(new Set());
    setDetailedData({});
    setDetailTableStates({});

    // Set API filters
    setApiFilters({
      schoolId: filters.schoolId,
      branchId: filters.branchId,
      uniqueId: filters.deviceId,
      from: filters.from,
      to: filters.to,
      period: "Custom",
    });
    setShouldFetch(true);
    setHasGenerated(true);
    // Show table
    setShowTable(true);
  }, []);

  // Fetch travel summary data for export
  const fetchTravelSummaryForExport = async (): Promise<TravelSummaryReport[]> => {
    // Convert uniqueId to array of numbers
    let uniqueIdArray: number[] = [];
    if (Array.isArray(apiFilters.uniqueId)) {
      uniqueIdArray = apiFilters.uniqueId.map((id: string | number) => Number(id));
    } else if (typeof apiFilters.uniqueId === 'string' && apiFilters.uniqueId) {
      // Handle comma-separated string
      uniqueIdArray = apiFilters.uniqueId.split(',').map((id: string) => Number(id.trim()));
    } else if (apiFilters.uniqueId) {
      uniqueIdArray = [Number(apiFilters.uniqueId)];
    }
    
    // Build query params
    const queryParams = new URLSearchParams({
      from: apiFilters.from,
      to: apiFilters.to,
      period: "Custom",
      page: "1",
      limit: "all",
      ...(sorting?.[0]?.id && { sortBy: sorting[0].id }),
      ...(sorting?.[0]?.id && { sortOrder: sorting[0].desc ? "desc" : "asc" }),
    }).toString();
    
    const res = await api.post(`/report/travel-summary-report?${queryParams}`, {
      uniqueIds: uniqueIdArray,
    });
    // console.log("✅ Export data:", res);
    return res?.reportData ?? [];
  };

  // Prepare export data - format dates and values
  const prepareExportData = async (data: TravelSummaryReport[]) => {
    return data.map((item) => {
      // Match uniqueId with cachedDeviceId to get the correct vehicle name
      const resolvedUniqueId = item.uniqueId || item.dayWiseTrips?.[0]?.uniqueId;
      const matchedDevice = cashedDeviceId?.find(
        (device) => String(device.uniqueId) === String(resolvedUniqueId)
      );
      const vehicleName = matchedDevice?.name || item.name || '-';

      const distance = item.distance != null ? Number(item.distance).toFixed(2) : "0.00";
      const maxSpeed = item.maxSpeed != null ? Number(item.maxSpeed).toFixed(2) : "0.00";
      const avgSpeed = item.avgSpeed != null ? Number(item.avgSpeed).toFixed(2) : "0.00";

      const startCoordinates = item.startLat && item.startLong
        ? `${item.startLat}, ${item.startLong}`
        : "-";
      const endCoordinates = item.endLat && item.endLong
        ? `${item.endLat}, ${item.endLong}`
        : "-";

      return {
        ...item,
        vehicleName,
        distance,
        maxSpeed,
        avgSpeed,
        startCoordinates,
        endCoordinates,
        running: item.running || "0D, 0H, 0M, 0S",
        idle: item.idle || "0D, 0H, 0M, 0S",
        stop: item.stop || "0D, 0H, 0M, 0S",
        workingHours: item.workingHours || "0D, 0H, 0M, 0S",
        startAddress: item.startAddress || "-",
        endAddress: item.endAddress || "-",
      };
    });
  };

  // Export columns definition
  const exportColumns = [
    { key: "vehicleName", header: "Vehicle No" },
    { key: "startAddress", header: "Start Address" },
    { key: "startCoordinates", header: "Start Coordinates" },
    { key: "distance", header: "Distance (KM)" },
    { key: "running", header: "Running Time" },
    { key: "idle", header: "Idle Time" },
    { key: "stop", header: "Stop Time" },
    { key: "workingHours", header: "Working Hours" },
    { key: "maxSpeed", header: "Max Speed (KM/H)" },
    { key: "avgSpeed", header: "Avg Speed (KM/H)" },
    { key: "endAddress", header: "End Address" },
    { key: "endCoordinates", header: "End Coordinates" },
  ];

  // Nested table columns for day-wise trips
  const nestedExportColumns = [
    { key: "date", header: "Date", formatter: (value: unknown) => value ? new Date(value as string).toLocaleDateString() : "--" },
    { key: "startTime", header: "Ignition Start", formatter: (value: unknown) => value ? new Date(value as string).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "UTC" }) : "--" },
    { key: "startAddress", header: "Start Location" },
    { key: "distance", header: "Distance" },
    { key: "runningTime", header: "Running" },
    { key: "idleTime", header: "Idle" },
    { key: "stopTime", header: "Stopped" },
    { key: "workingHours", header: "Working Hours" },
    { key: "maxSpeed", header: "Max Speed", formatter: (value: unknown) => value != null ? Number(value).toFixed(2) : "0.00" },
    { key: "avgSpeed", header: "Avg Speed", formatter: (value: unknown) => value != null ? Number(value).toFixed(2) : "0.00" },
    { key: "endAddress", header: "End Location" },
    { key: "endTime", header: "Ignition Stop", formatter: (value: unknown) => value ? new Date(value as string).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "UTC" }) : "--" },
  ];

  // Handle PDF export
  const handleExportPDF = async () => {
    try {
      setIsDownloading(true);
      updateProgress(5, "Fetching report data");

      let exportData = await fetchTravelSummaryForExport();

      updateProgress(30, "Resolving locations");
      exportData = await enrichTravelSummaryWithAddress(exportData);

      updateProgress(60, "Preparing report");
      const preparedData = await prepareExportData(exportData);

      updateProgress(85, "Generating PDF");
      await exportToPDF(preparedData, exportColumns, {
        title: "Travel Summary Report",
        nestedTable: {
          dataKey: "dayWiseTrips",
          columns: nestedExportColumns,
          title: "Day-Wise Details",
        },
      });

      updateProgress(100, "Download complete");
    } catch (err) {
      console.error(err);
      toast.error("Failed to export PDF");
    } finally {
      setTimeout(() => {
        setIsDownloading(false);
        setDownloadProgress(0);
        setDownloadLabel("");
      }, 500);
    }
  };

  // Handle Excel export
  const handleExportExcel = async () => {
    try {
      setIsDownloading(true);
      updateProgress(5, "Fetching report data");

      let exportData = await fetchTravelSummaryForExport();

      updateProgress(30, "Resolving locations");
      exportData = await enrichTravelSummaryWithAddress(exportData);
      
      console.log("✅ Export data:", exportData);
      updateProgress(60, "Preparing report");
      const preparedData = await prepareExportData(exportData);

      updateProgress(85, "Generating Excel");
      exportToExcel(preparedData, exportColumns, {
        title: "Travel Summary Report",
        nestedTable: {
          dataKey: "dayWiseTrips",
          columns: nestedExportColumns,
          title: "Day-Wise Details",
        },
      });

      updateProgress(100, "Download complete");
    } catch (err) {
      console.error(err);
      toast.error("Failed to export Excel");
    } finally {
      setTimeout(() => {
        setIsDownloading(false);
        setDownloadProgress(0);
        setDownloadLabel("");
      }, 500);
    }
  };

  // Create expanded data array
  const expandedDataArray = createExpandedData();

  useEffect(() => {
    if (!isFetchingTravelSummaryReport && shouldFetch) {
      setShouldFetch(false);
    }
  }, [isFetchingTravelSummaryReport, shouldFetch]);

  useEffect(() => {
    if (shouldFetch && hasGenerated) {
      queryClient.invalidateQueries({
        queryKey: ["travel-summary"],
      });
    }
  }, [shouldFetch, hasGenerated, queryClient]);

  // Handle playback click
  const handlePlayback = (row: any) => {
    const history = deviceWithTrip || [];
    const flatHistory = history.flat();
    setPlaybackPayload({
      uniqueId: row.uniqueId,
      vehicleName: row.name || row.vehicleName,
      startDate: row.reportDate || apiFilters.from,
      endDate: row.reportDate || apiFilters.to,
    });

    setPlaybackOpen(true);
  };

  useEffect(() => {
    console.log("expandedDataArray", expandedDataArray)
  }, [expandedDataArray])

  // Table configuration
  const { table, tableElement } = CustomTableServerSidePagination({
    data: expandedDataArray,
    columns,
    pagination,
    totalCount: totalTravelSummaryReport,
    loading: isFetchingTravelSummaryReport,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    sorting,
    columnVisibility,
    onColumnVisibilityChange: setColumnVisibility,
    emptyMessage: isFetchingTravelSummaryReport
      ? "Loading report data..." : totalTravelSummaryReport === 0 ? "No data available for the selected filters"
      : "Wait for it....🫣",
    pageSizeOptions: [5, 10, 20, 30, 50, 100, "All"],
    enableSorting: false,
    showSerialNumber: false,
    // Virtualization disabled - nested expandable rows have variable heights
    enableVirtualization: false,
    maxHeight: "600px",
  });

  return (
    <div className="p-6">
      <ResponseLoader isLoading={isFetchingTravelSummaryReport} />

      <DownloadProgress
        open={isDownloading}
        progress={downloadProgress}
        label={downloadLabel}
      />

      {/* Filter Component */}
      <ReportFilter
        onSubmit={handleFilterSubmit}
        table={table}
        className="mb-6"
        // ✅ Remove all controlled props - let ReportFilter manage internally
        config={{
          showSchool: true,
          showBranch: true,
          showDevice: true,
          showDateRange: true,
          showSubmitButton: true,
          submitButtonText: isFetchingTravelSummaryReport
            ? "Generating..."
            : "Generate",
          submitButtonDisabled: isFetchingTravelSummaryReport,
          dateRangeTitle: "Select Date Range",
          dateRangeMaxDays: 90,
          cardTitle: "Travel Summary",
          arrayFormat: "comma",
          arraySeparator: ",",
          multiSelectDevice: true,
          showBadges: true,
          maxBadges: 2,
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

      {/* Table */}
      {showTable && <section className="mb-4">{tableElement}</section>}
      {playbackPayload && (
        <PlaybackHistoryDrawer
          open={playbackOpen}
          onOpenChange={setPlaybackOpen}
          uniqueId={playbackPayload.uniqueId}
          vehicleName={playbackPayload.vehicleName}
          startDate={playbackPayload.startDate}
          endDate={playbackPayload.endDate}
        />
      )}
    </div>
  );
};

export default TravelSummaryReportPage;
