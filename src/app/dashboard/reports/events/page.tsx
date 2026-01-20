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
import { useExport } from "@/hooks/useExport";
import { api } from "@/services/apiService";
import DownloadProgress from "@/components/DownloadProgress";
import { toast } from "sonner";
import { reverseGeocodeMapTiler } from "@/hooks/useReverseGeocoding";
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

  // Table data with enriched addresses
  const [tableData, setTableData] = useState<AlertsAndEventsReport[]>([]);
  const lastProcessedRef = React.useRef<string>("");

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

  // Export hook
  const { exportToPDF, exportToExcel } = useExport();

  // Update progress helper
  const updateProgress = (percent: number, label: string) => {
    setDownloadProgress(percent);
    setDownloadLabel(label);
  };

  // Enrich events data with addresses
  const enrichEventsReportWithAddress = async (
    rows: AlertsAndEventsReport[]
  ): Promise<AlertsAndEventsReport[]> => {
    return Promise.all(
      rows.map(async (row) => {
        // Enrich nested eventArray with addresses
        let enrichedEventArray = row.eventArray || [];
        if (row.eventArray?.length) {
          enrichedEventArray = await Promise.all(
            row.eventArray.map(async (event) => {
              let address = event.geofenceAddress || "-";

              // Fetch address if coordinates exist but no address
              if (!event.geofenceAddress && event.latitude && event.longitude) {
                address = await reverseGeocodeMapTiler(
                  Number(event.latitude),
                  Number(event.longitude)
                ) || "-";
              }

              return {
                ...event,
                geofenceAddress: address,
              };
            })
          );
        }

        return {
          ...row,
          eventArray: enrichedEventArray,
        };
      })
    );
  };

  // Effect to enrich data with addresses when alertsAndEventsReport changes
  useEffect(() => {
    if (!alertsAndEventsReport?.length) {
      if (tableData.length !== 0) setTableData([]);
      return;
    }
    const currentHash = JSON.stringify(alertsAndEventsReport);
    if (lastProcessedRef.current === currentHash) return;
    lastProcessedRef.current = currentHash;

    const enrich = async () => {
      const enriched = await enrichEventsReportWithAddress(alertsAndEventsReport);
      setTableData(enriched);
    };

    enrich();
  }, [alertsAndEventsReport]);

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
    const transformed = tableData.map(
      (item: AlertsAndEventsReport, index: number) => ({
        ...item,
        uniqueId: item.uniqueId,
        id: `row-${item.uniqueId}-${index}`,
        sn: pagination.pageIndex * pagination.pageSize + index + 1,
      })
    );
    return transformed;
  }, [tableData, pagination]);

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

  // Fetch events report data for export
  const fetchEventsReportForExport = async (): Promise<AlertsAndEventsReport[]> => {
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
      limit: String(totalAlertsAndEventsReport || 1000),
      ...(sorting?.[0]?.id && { sortBy: sorting[0].id }),
      ...(sorting?.[0]?.id && { sortOrder: sorting[0].desc ? "desc" : "asc" }),
    }).toString();
    
    const res = await api.post(`/report/allevents?${queryParams}`, {
      uniqueId: uniqueIdArray,
    });
    return res?.data ?? [];
  };

  // Prepare export data - format dates and values
  const prepareExportData = (data: AlertsAndEventsReport[]) => {
    return data.map((item) => {
      return {
        ...item,
        vehicleName: item.deviceName || item.name || "-",
        eventCount: item.eventArray?.length || 0,
      };
    });
  };

  // Export columns definition
  const exportColumns = [
    { key: "vehicleName", header: "Vehicle Number" },
    { key: "eventCount", header: "Number of Events" },
  ];

  // Nested table columns for event data
  const nestedExportColumns = [
    { key: "eventTime", header: "Event Time", formatter: (value: unknown) => value ? new Date(value as string).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true, timeZone: "UTC" }) : "--" },
    { key: "eventType", header: "Event Type" },
    { key: "latitude", header: "Latitude", formatter: (value: unknown) => value != null ? String(value) : "--" },
    { key: "longitude", header: "Longitude", formatter: (value: unknown) => value != null ? String(value) : "--" },
    { key: "geofenceAddress", header: "Address" },
  ];

  // Handle PDF export
  const handleExportPDF = async () => {
    try {
      setIsDownloading(true);
      updateProgress(5, "Fetching report data");

      let exportData = await fetchEventsReportForExport();

      updateProgress(30, "Resolving addresses");
      exportData = await enrichEventsReportWithAddress(exportData);

      updateProgress(60, "Preparing report");
      const preparedData = prepareExportData(exportData);

      updateProgress(85, "Generating PDF");
      await exportToPDF(preparedData, exportColumns, {
        title: "Alerts and Events Report",
        nestedTable: {
          dataKey: "eventArray",
          columns: nestedExportColumns,
          title: "Event Details",
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

      let exportData = await fetchEventsReportForExport();

      updateProgress(30, "Resolving addresses");
      exportData = await enrichEventsReportWithAddress(exportData);

      updateProgress(60, "Preparing report");
      const preparedData = prepareExportData(exportData);

      updateProgress(85, "Generating Excel");
      exportToExcel(preparedData, exportColumns, {
        title: "Alerts and Events Report",
        nestedTable: {
          dataKey: "eventArray",
          columns: nestedExportColumns,
          title: "Event Details",
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
      ? "Loading report data..." : totalAlertsAndEventsReport === 0 ? "Wait for it...🫣"
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
          // showExport: true,
          // exportOptions: ["excel", "pdf"],
        }}
        // onExportClick={(type) => {
        //   if (type === "excel") {
        //     handleExportExcel();
        //   } else {
        //     handleExportPDF();
        //   }
        // }}
      />

      {/* Table */}
      {showTable && <section className="mb-4">{tableElement}</section>}
    </div>
  );
};

export default AlertsAndEventsReportPage;
