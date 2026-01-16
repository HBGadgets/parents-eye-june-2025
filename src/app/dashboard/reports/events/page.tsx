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
import { FaPlay, FaPlus, FaMinus, FaMapMarkedAlt } from "react-icons/fa";
import { TravelTable } from "@/components/travel-summary/TravelTable";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DayWiseTrips,
  AlertsAndEventsReport,
  RouteShiftRow,
  Events,
} from "@/interface/modal";
import { useQueryClient } from "@tanstack/react-query";
import { PlaybackHistoryDrawer } from "@/components/travel-summary/playback-history-drawer";

interface AlertsAndEventsDetailTableData {
  id: string;
  uniqueId: string;
  name: string;
  deviceName: string;
  eventType: string;
  eventTime: string;
  geofenceAddress?: string;
  latitude?: number;
  longitude?: number;
  eventArray: Events[];
}

interface ExpandedRowData extends AlertsAndEventsReport {
  id: string;
  sn: number;
  isLoading?: boolean;
  isDetailTable?: boolean;
  isEmpty?: boolean;
  eventArray?: AlertsAndEventsDetailTableData[];
}

const AlertsAndEventsReportPage: React.FC = () => {
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
    Record<string, AlertsAndEventsDetailTableData[]>
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
    alertsAndEventsReport,
    totalAlertsAndEventsReport,
    isFetchingAlertsAndEventsReport,
  } = useReport(pagination, apiFilters, sorting, "alerts-events", hasGenerated);

  const transformEventsData = useCallback(
    (row: AlertsAndEventsReport): AlertsAndEventsDetailTableData[] => {
      return row.eventArray?.map((event, index) => ({
        id: `${row.uniqueId}-${index}-${event.eventTime}`,
        uniqueId: row.uniqueId,
        name: row.name ?? "-",
        deviceName: row.deviceName,
        eventType: event.eventType,
        eventTime: new Date(event.eventTime).toLocaleString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
          timeZone: "UTC",
        }),
        geofenceAddress: event.geofenceAddress ?? "-",
        latitude: event.latitude,
        longitude: event.longitude,
        coordinates: `${event.latitude}, ${event.longitude}`,
      }));
    },
    []
  );

  // Toggle row expansion
  const toggleRowExpansion = useCallback(
    (rowId: string, rowData: AlertsAndEventsReport) => {
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

        console.log("row data: ", rowData);
        // Load detailed data if not already loaded
        if (!detailedData[rowId] && rowData) {
          try {
            // console.log("🔄 Transforming dayWiseTrips:", rowData.dayWiseTrips);
            const transformedDetails = transformEventsData(rowData);
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
    [expandedRows, detailedData, transformEventsData, detailTableStates]
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
    const transformed = alertsAndEventsReport.map(
      (item: AlertsAndEventsReport, index: number) => ({
        ...item,
        uniqueId: item.uniqueId,
        id: `row-${item.uniqueId}-${index}`,
        sn: pagination.pageIndex * pagination.pageSize + index + 1,
      })
    );
    // console.log("📊 Transformed report data:", transformed);
    return transformed;
  }, [alertsAndEventsReport, pagination]);

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
            eventArray: detailedData[row.id],
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

  const alertsAndEventsDetailColumns: ColumnDef<AlertsAndEventsDetailTableData>[] =
    useMemo(
      () => [
        {
          accessorKey: "eventTime",
          header: "Event Time",
          size: 120,
        },
        {
          accessorKey: "eventType",
          header: "Event Type",
          size: 120,
        },
        {
          accessorKey: "coordinates",
          header: "Coordinates",
          meta: { wrapConfig: { wrap: "wrap", maxWidth: "160px" } },
          size: 180,
          cell: ({ row }: { row: any }) => {
            if (
              row.original.isLoading ||
              row.original.isDetailTable ||
              row.original.isEmpty
            )
              return null;
            const lat = row.original?.latitude || "--";
            const lng = row.original?.longitude || "--";

            if (!lat && !lng) return "--";

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
          accessorKey: "geofenceAddress",
          header: "Address",
          size: 100,
        },
      ],
      []
    );

  const getRouteMapUrl = (
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number
  ) => {
    return `https://www.google.com/maps/dir/?api=1&origin=${startLat},${startLng}&destination=${endLat},${endLng}&travelmode=driving`;
  };

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
          console.log(row.original);

          const isExpanded = expandedRows.has(row.original.id);
          const hasEvents =
            Array.isArray(row.original.eventArray) &&
            row.original.eventArray.length > 0;

          // Don't show expand button if no day-wise trips
          if (!hasEvents) return null;
          console.log("DETAIL ROW DATA →", detailedData[row.original.id]);

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
        accessorKey: "deviceName",
        header: "Vehicle Number",
        size: 200,
        cell: ({ row }) => {
          // Detail table rendering
          if (row.original.isDetailTable && row.original.eventArray) {
            const parentRowId = row.original.id.replace("-details", "");
            const detailState = detailTableStates[parentRowId] || {
              pagination: { pageIndex: 0, pageSize: 10 },
              sorting: [],
            };

            return (
              <div className="col-span-full w-full">
                <div className="w-full bg-gray-50 rounded p-4 my-2">
                  <h3 className="text-sm font-semibold mb-2 text-gray-700">
                    Event details for {row.original.deviceName}
                  </h3>
                  <TravelTable
                    data={row.original.eventArray}
                    columns={alertsAndEventsDetailColumns}
                    pagination={detailState.pagination}
                    totalCount={row.original.eventArray.length}
                    onPaginationChange={(newPagination) =>
                      handleDetailPaginationChange(parentRowId, newPagination)
                    }
                    onSortingChange={(newSorting) =>
                      handleDetailSortingChange(parentRowId, newSorting)
                    }
                    sorting={detailState.sorting}
                    enableSorting={false}
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
          return row.original.deviceName;
        },
      },
      {
        accessorKey: "eventNo.",
        header: "No of Events",
        cell: ({ row }) => {
          if (
            row.original.isLoading ||
            row.original.isDetailTable ||
            row.original.isEmpty
          )
            return null;
          return row.original.eventArray?.length || "-";
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
      alertsAndEventsDetailColumns,
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
    if (!isFetchingAlertsAndEventsReport && shouldFetch) {
      setShouldFetch(false);
    }
  }, [isFetchingAlertsAndEventsReport, shouldFetch]);

  useEffect(() => {
    if (shouldFetch && hasGenerated) {
      queryClient.invalidateQueries({
        queryKey: ["alerts-events-report"],
      });
    }
  }, [shouldFetch, hasGenerated, queryClient]);

  // Table configuration
  const { table, tableElement } = CustomTableServerSidePagination({
    data: expandedDataArray,
    columns,
    pagination,
    totalCount: totalAlertsAndEventsReport,
    loading: isFetchingAlertsAndEventsReport,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    sorting,
    columnVisibility,
    onColumnVisibilityChange: setColumnVisibility,
    emptyMessage: isFetchingAlertsAndEventsReport
      ? "Loading report data..."
      : "No data available for the selected filters",
    pageSizeOptions: [5, 10, 20, 30, 50],
    enableSorting: false,
    showSerialNumber: false,
    // Enable virtualization
    enableVirtualization: true,
    estimatedRowHeight: 50,
    overscan: 5,
    maxHeight: "600px",
  });

  return (
    <div className="p-6">
      <ResponseLoader isLoading={isFetchingAlertsAndEventsReport} />

      {/* Filter Component */}
      <ReportFilter
        onSubmit={handleFilterSubmit}
        table={table}
        className="mb-6"
        config={{
          showSchool: true,
          showBranch: true,
          showDevice: true,
          showDateRange: true,
          showSubmitButton: true,
          submitButtonText: isFetchingAlertsAndEventsReport
            ? "Generating..."
            : "Generate",
          submitButtonDisabled: isFetchingAlertsAndEventsReport,
          dateRangeTitle: "Select Date Range",
          dateRangeMaxDays: 90,
          cardTitle: "Alerts and Events Report",
          arrayFormat: "comma",
          arraySeparator: ",",
          multiSelectDevice: true,
          showBadges: true,
          maxBadges: 2,
        }}
      />

      {/* Table */}
      {showTable && <section className="mb-4">{tableElement}</section>}
    </div>
  );
};

export default AlertsAndEventsReportPage;
