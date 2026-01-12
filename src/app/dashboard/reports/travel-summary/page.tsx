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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DayWiseTrips, TravelSummaryReport } from "@/interface/modal";
import { useQueryClient } from "@tanstack/react-query";
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

  // Transform day-wise trips data for nested table
  const transformDayWiseData = useCallback(
    (
      dayWiseTrips: DayWiseTrips[],
      vehicleName: string
    ): TravelDetailTableData[] => {
      return dayWiseTrips.map((trip, index) => ({
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
        startLocation: trip.startAddress || "-",
        startCoordinates:
          trip.startLatitude && trip.startLongitude ? (
            <a
              href={`https://www.google.com/maps?q=${trip.startLatitude},${trip.startLongitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline hover:text-blue-800"
            >
              {trip.startLatitude}, {trip.startLongitude}
            </a>
          ) : (
            "-"
          ),
        distance: trip.distance,
        running: trip.runningTime,
        idle: trip.idleTime,
        stopped: trip.stopTime,
        overspeed: trip.overspeedTime,
        maxSpeed: trip.maxSpeed,
        avgSpeed: trip.avgSpeed,
        endLocation: trip.endAddress || "-",
        endCoordinates: `${trip.endLatitude}, ${trip.endLongitude}` || "-",
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
      }));
    },
    []
  );

  // Toggle row expansion
  const toggleRowExpansion = useCallback(
    (rowId: string, rowData: TravelSummaryReport) => {
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
            const transformedDetails = transformDayWiseData(
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
    const transformed = travelSummaryReport.map(
      (item: TravelSummaryReport, index: number) => ({
        ...item,
        uniqueId: item.dayWiseTrips?.[0]?.uniqueId,
        id: `row-${item.uniqueId}-${index}`,
        sn: pagination.pageIndex * pagination.pageSize + index + 1,
      })
    );
    // console.log("📊 Transformed report data:", transformed);
    return transformed;
  }, [travelSummaryReport, pagination]);

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
      { accessorKey: "startLocation", header: "Start Location", size: 250 },
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
      { accessorKey: "overspeed", header: "Overspeed", size: 120 },
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
      { accessorKey: "endLocation", header: "End Location", size: 250 },
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
        size: 300,
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
        size: 180,
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
      {
        accessorKey: "overspeed",
        header: "Overspeed Time",
        size: 150,
        cell: ({ row }) => {
          if (
            row.original.isLoading ||
            row.original.isDetailTable ||
            row.original.isEmpty
          )
            return null;
          return row.original.overspeed || "0D, 0H, 0M, 0S";
        },
      },
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
        size: 300,
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
        size: 180,
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
      ? "Loading report data..."
      : "No data available for the selected filters",
    pageSizeOptions: [5, 10, 20, 30, 50],
    enableSorting: false,
    showSerialNumber: false,
  });

  return (
    <div className="p-6">
      <ResponseLoader isLoading={isFetchingTravelSummaryReport} />

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
