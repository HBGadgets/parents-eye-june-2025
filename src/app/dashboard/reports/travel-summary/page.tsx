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
  const [selectedSchool, setSelectedSchool] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: null,
    endDate: null,
  });
  const [playbackOpen, setPlaybackOpen] = useState(false);
  const [playbackPayload, setPlaybackPayload] = useState<{
    uniqueId: number;
    startDate: string;
    endDate: string;
    flatHistory: any[];
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

  // Demo data for testing
  // const DEMO_TRAVEL_SUMMARY_DATA: TravelSummaryReport[] = [
  //   {
  //     uniqueId: "MH12AB1234",
  //     name: "MH 12 AB 1234",
  //     duration: "7D, 14H, 30M",
  //     maxSpeed: "95.5 km/h",
  //     avgSpeed: "42.3 km/h",
  //     distance: "1,245.67 km",
  //     running: "5D, 8H, 45M",
  //     idle: "1D, 2H, 15M",
  //     stopped: "1D, 3H, 30M",
  //     overspeed: "0D, 0H, 45M",
  //     startCoordinates: "21.1458, 79.0882",
  //     startAddress: "Sitabuldi, Nagpur, Maharashtra 440012",
  //     endCoordinates: "19.0760, 72.8777",
  //     endAddress: "Mumbai Central, Mumbai, Maharashtra 400008",
  //     dayWiseTrips: [
  //       {
  //         date: "2025-12-10",
  //         uniqueId: "MH12AB1234",
  //         startTime: "2025-12-10T06:30:00.000Z",
  //         endTime: "2025-12-10T18:45:00.000Z",
  //         maxSpeed: "88.5 km/h",
  //         avgSpeed: "45.2 km/h",
  //         distance: "185.5 km",
  //         running: "0D, 4H, 15M",
  //         idle: "0D, 0H, 30M",
  //         stopped: "0D, 7H, 30M",
  //         overspeed: "0D, 0H, 8M",
  //         startCoordinates: "21.1458, 79.0882",
  //         startAddress: "Sitabuldi, Nagpur, Maharashtra 440012",
  //         endCoordinates: "20.9320, 77.7523",
  //         endAddress: "Akola, Maharashtra 444001",
  //       },
  //       {
  //         date: "2025-12-11",
  //         uniqueId: "MH12AB1234",
  //         startTime: "2025-12-11T07:00:00.000Z",
  //         endTime: "2025-12-11T19:30:00.000Z",
  //         maxSpeed: "95.5 km/h",
  //         avgSpeed: "48.7 km/h",
  //         distance: "245.3 km",
  //         running: "0D, 5H, 20M",
  //         idle: "0D, 0H, 45M",
  //         stopped: "0D, 6H, 25M",
  //         overspeed: "0D, 0H, 15M",
  //         startCoordinates: "20.9320, 77.7523",
  //         startAddress: "Akola, Maharashtra 444001",
  //         endCoordinates: "20.0063, 73.7868",
  //         endAddress: "Nashik, Maharashtra 422001",
  //       },
  //       {
  //         date: "2025-12-12",
  //         uniqueId: "MH12AB1234",
  //         startTime: "2025-12-12T08:15:00.000Z",
  //         endTime: "2025-12-12T16:20:00.000Z",
  //         maxSpeed: "82.3 km/h",
  //         avgSpeed: "39.8 km/h",
  //         distance: "178.9 km",
  //         running: "0D, 4H, 30M",
  //         idle: "0D, 0H, 25M",
  //         stopped: "0D, 3H, 10M",
  //         overspeed: "0D, 0H, 5M",
  //         startCoordinates: "20.0063, 73.7868",
  //         startAddress: "Nashik, Maharashtra 422001",
  //         endCoordinates: "19.0760, 72.8777",
  //         endAddress: "Mumbai Central, Mumbai, Maharashtra 400008",
  //       },
  //     ],
  //   },
  //   {
  //     uniqueId: "MH20CD5678",
  //     name: "MH 20 CD 5678",
  //     duration: "5D, 10H, 15M",
  //     maxSpeed: "78.9 km/h",
  //     avgSpeed: "38.5 km/h",
  //     distance: "856.42 km",
  //     running: "3D, 12H, 30M",
  //     idle: "0D, 18H, 45M",
  //     stopped: "1D, 3H, 0M",
  //     overspeed: "0D, 0H, 12M",
  //     startCoordinates: "18.5204, 73.8567",
  //     startAddress: "Pune Railway Station, Pune, Maharashtra 411001",
  //     endCoordinates: "21.1458, 79.0882",
  //     endAddress: "Sitabuldi, Nagpur, Maharashtra 440012",
  //     dayWiseTrips: [
  //       {
  //         date: "2025-12-10",
  //         uniqueId: "MH20CD5678",
  //         startTime: "2025-12-10T09:00:00.000Z",
  //         endTime: "2025-12-10T17:30:00.000Z",
  //         maxSpeed: "72.4 km/h",
  //         avgSpeed: "42.1 km/h",
  //         distance: "156.8 km",
  //         running: "0D, 3H, 45M",
  //         idle: "0D, 0H, 20M",
  //         stopped: "0D, 4H, 25M",
  //         overspeed: "0D, 0H, 0M",
  //         startCoordinates: "18.5204, 73.8567",
  //         startAddress: "Pune Railway Station, Pune, Maharashtra 411001",
  //         endCoordinates: "19.8762, 75.3433",
  //         endAddress: "Aurangabad, Maharashtra 431001",
  //       },
  //       {
  //         date: "2025-12-11",
  //         uniqueId: "MH20CD5678",
  //         startTime: "2025-12-11T08:30:00.000Z",
  //         endTime: "2025-12-11T20:15:00.000Z",
  //         maxSpeed: "78.9 km/h",
  //         avgSpeed: "36.2 km/h",
  //         distance: "210.5 km",
  //         running: "0D, 5H, 50M",
  //         idle: "0D, 0H, 35M",
  //         stopped: "0D, 5H, 20M",
  //         overspeed: "0D, 0H, 8M",
  //         startCoordinates: "19.8762, 75.3433",
  //         startAddress: "Aurangabad, Maharashtra 431001",
  //         endCoordinates: "20.5937, 78.9629",
  //         endAddress: "Chandrapur, Maharashtra 442401",
  //       },
  //     ],
  //   },
  //   {
  //     uniqueId: "MH31EF9012",
  //     name: "MH 31 EF 9012",
  //     duration: "3D, 8H, 20M",
  //     maxSpeed: "105.2 km/h",
  //     avgSpeed: "52.8 km/h",
  //     distance: "624.18 km",
  //     running: "2D, 4H, 10M",
  //     idle: "0D, 12H, 30M",
  //     stopped: "0D, 15H, 40M",
  //     overspeed: "0D, 1H, 5M",
  //     startCoordinates: "19.0760, 72.8777",
  //     startAddress: "Dadar, Mumbai, Maharashtra 400014",
  //     endCoordinates: "15.2993, 74.1240",
  //     endAddress: "Panaji, Goa 403001",
  //     dayWiseTrips: [
  //       {
  //         date: "2025-12-13",
  //         uniqueId: "MH31EF9012",
  //         startTime: "2025-12-13T05:45:00.000Z",
  //         endTime: "2025-12-13T14:30:00.000Z",
  //         maxSpeed: "105.2 km/h",
  //         avgSpeed: "58.3 km/h",
  //         distance: "342.7 km",
  //         running: "0D, 5H, 52M",
  //         idle: "0D, 0H, 15M",
  //         stopped: "0D, 2H, 38M",
  //         overspeed: "0D, 0H, 42M",
  //         startCoordinates: "19.0760, 72.8777",
  //         startAddress: "Dadar, Mumbai, Maharashtra 400014",
  //         endCoordinates: "16.7050, 74.2433",
  //         endAddress: "Kolhapur, Maharashtra 416001",
  //       },
  //       {
  //         date: "2025-12-14",
  //         uniqueId: "MH31EF9012",
  //         startTime: "2025-12-14T10:00:00.000Z",
  //         endTime: "2025-12-14T18:45:00.000Z",
  //         maxSpeed: "92.7 km/h",
  //         avgSpeed: "47.5 km/h",
  //         distance: "281.5 km",
  //         running: "0D, 5H, 55M",
  //         idle: "0D, 0H, 28M",
  //         stopped: "0D, 2H, 22M",
  //         overspeed: "0D, 0H, 23M",
  //         startCoordinates: "16.7050, 74.2433",
  //         startAddress: "Kolhapur, Maharashtra 416001",
  //         endCoordinates: "15.2993, 74.1240",
  //         endAddress: "Panaji, Goa 403001",
  //       },
  //     ],
  //   },
  // ];

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
    (dayWiseTrips: DayWiseTrips[]): TravelDetailTableData[] => {
      return dayWiseTrips.map((trip, index) => ({
        id: `day-${trip.date}-${index}`,
        uniqueId: trip.uniqueId,
        reportDate: new Date(trip.date).toLocaleDateString(),
        ignitionStart: trip.startTime
          ? new Date(trip.startTime).toLocaleString("en-IN", {
              timeZone: "Asia/Kolkata",
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
              second: "2-digit",
              hour12: true,
            })
          : "-",
        startLocation: trip.startAddress || "-",
        startCoordinates: `${trip.startLatitude}, ${trip.startLongitude}`,
        distance: trip.distance,
        running: trip.runningTime,
        idle: trip.idleTime,
        stopped: trip.stopTime,
        overspeed: trip.overspeedTime,
        maxSpeed: trip.maxSpeed,
        avgSpeed: trip.avgSpeed,
        endLocation: trip.endAddress || "-",
        endCoordinates: `${trip.endLatitude}, ${trip.endLongitude}`,
        ignitionStop: trip.endTime
          ? new Date(trip.endTime).toLocaleString("en-IN", {
              timeZone: "Asia/Kolkata",
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
              second: "2-digit",
              hour12: true,
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
        console.log("➖ Collapsing row:", rowId);
        newExpandedRows.delete(rowId);
      } else {
        // Expand row
        console.log("➕ Expanding row:", rowId);
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
              rowData.dayWiseTrips
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
      console.log(`➡️ Processing row: ${row.id}`);
      // Add main row
      expandedDataArray.push(row);

      // Add detail row if expanded
      if (expandedRows.has(row.id)) {
        console.log(`🔍 Row ${row.id} is expanded, checking detail data...`);
        if (detailedData[row.id]?.length) {
          console.log(`✅ Adding detail table for ${row.id}`);
          expandedDataArray.push({
            ...row,
            id: `${row.id}-details`,
            isDetailTable: true,
            detailData: detailedData[row.id],
          });
        } else {
          console.log(`⚠️ No detail data for ${row.id}`);
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
      { accessorKey: "reportDate", header: "Report Date", size: 120 },
      { accessorKey: "ignitionStart", header: "Ignition Start", size: 180 },
      { accessorKey: "startLocation", header: "Start Location", size: 250 },
      {
        accessorKey: "startCoordinates",
        header: "Start Co-ordinate",
        size: 180,
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
      { accessorKey: "endCoordinates", header: "End Co-ordinate", size: 180 },
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
        cell: ({ row }: { row: any }) => {
          if (
            row.original.isLoading ||
            row.original.isDetailTable ||
            row.original.isEmpty
          )
            return null;
          return `${row.original.startLat}, ${row.original.startLong}` || "-";
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
          return `${row.original.endLat}, ${row.original.endLong}` || "-";
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

    // For demo purposes, just show the table
    // if (!filters.deviceId || !filters.from || !filters.to) {
    //   alert("Please select a vehicle and date range");
    //   return;
    // }

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
    console.log("▶️ Playback clicked for row:", row);
    const history = deviceWithTrip || [];
    const flatHistory = history.flat();
    setPlaybackPayload({
      uniqueId: row.uniqueId,
      startDate: row.reportDate || apiFilters.from,
      endDate: row.reportDate || apiFilters.to,
      flatHistory: flatHistory,
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
        selectedSchool={selectedSchool}
        onSchoolChange={setSelectedSchool}
        selectedBranch={selectedBranch}
        onBranchChange={setSelectedBranch}
        selectedDevice={selectedDevice}
        onDeviceChange={(deviceId, name) => {
          setSelectedDevice(deviceId);
          setDeviceName(name);
        }}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
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
          dateRangeMaxDays: 300,
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
          startDate={playbackPayload.startDate}
          endDate={playbackPayload.endDate}
          flatHistory={playbackPayload.flatHistory}
        />
      )}
    </div>
  );
};

export default TravelSummaryReportPage;
