"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  ReportFilter,
  FilterValues,
} from "@/components/report-filters/Report-Filter";
import {
  type VisibilityState,
  type ColumnDef,
  type PaginationState,
  type SortingState,
} from "@tanstack/react-table";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";
import ResponseLoader from "@/components/ResponseLoader";
import { useReport } from "@/hooks/reports/useReport";
import {
  GetGeofenceSummaryColumns,
  GetGeofenceDetailColumns,
} from "@/components/columns/columns";
import { useQueryClient } from "@tanstack/react-query";
import {
  GeofenceGroup,
  GeofenceExpandedRow,
  GeofenceEventFlat,
} from "@/interface/modal";
import { TravelTable } from "@/components/travel-summary/TravelTable";
import { useDeviceDropdownWithUniqueId } from "@/hooks/useDropdown";
import { useExport } from "@/hooks/useExport";
import DownloadProgress from "@/components/DownloadProgress";
import { toast } from "sonner";
import { reportService } from "@/services/api/reportService";
import { parseUniqueIds } from "@/util/parseUniqueIds";

const GeofenceAlertsReportPage: React.FC = () => {
  const queryClient = useQueryClient();

  // Export states
  const { exportToPDF, exportToExcel } = useExport();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadLabel, setDownloadLabel] = useState("");

  // Table state
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [showTable, setShowTable] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [hasGenerated, setHasGenerated] = useState(false);

  // Expansion state
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Filter state for API
  const [apiFilters, setApiFilters] = useState<Record<string, any>>({
    schoolId: undefined,
    branchId: undefined,
    uniqueId: undefined,
    from: undefined,
    to: undefined,
  });

  // Device mapping state
  const { data: devices } = useDeviceDropdownWithUniqueId(
    apiFilters.branchId,
    !!hasGenerated
  );

  // Fetch report data using the hook
  const {
    geofenceAlertsReport,
    totalGeofenceAlertsReport,
    isFetchingGeofenceAlertsReport,
  } = useReport(pagination, apiFilters, sorting, "geofence-alerts", hasGenerated);

  // Group events by uniqueId and map vehicle names
  const groupedGeofenceReport = useMemo((): GeofenceGroup[] => {
    if (!geofenceAlertsReport || !Array.isArray(geofenceAlertsReport)) return [];

    const groups: Record<string, GeofenceGroup> = {};

    geofenceAlertsReport.forEach((item: GeofenceEventFlat) => {
      if (!groups[item.uniqueId]) {
        const matchedDevice = devices?.find(
          (device: any) => String(device.uniqueId) === String(item.uniqueId)
        );

        groups[item.uniqueId] = {
          id: `group-${item.uniqueId}`,
          uniqueId: item.uniqueId,
          vehicleName: matchedDevice?.name || item.uniqueId || "-",
          eventCount: 0,
          events: [],
        };
      }
      groups[item.uniqueId].events.push(item);
      groups[item.uniqueId].eventCount++;
    });

    return Object.values(groups).map((group, index) => ({
      ...group,
      sn: pagination.pageIndex * pagination.pageSize + index + 1,
    }));
  }, [geofenceAlertsReport, devices, pagination.pageIndex, pagination.pageSize]);

  // Toggle row expansion
  const toggleRowExpansion = useCallback((rowId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  }, []);

  // Create expanded data array for the main table
  const expandedTableData = useMemo((): GeofenceExpandedRow[] => {
    const result: GeofenceExpandedRow[] = [];
    groupedGeofenceReport.forEach((group) => {
      result.push(group);
      if (expandedRows.has(group.id)) {
        result.push({
          id: `${group.id}-details`,
          isDetailTable: true,
          detailData: group.events,
          name: group.vehicleName,
          vehicleName: group.vehicleName,
          uniqueId: group.uniqueId,
        });
      }
    });
    return result;
  }, [groupedGeofenceReport, expandedRows]);

  // Handle filter submission
  const handleFilterSubmit = useCallback((filters: FilterValues) => {
    console.log("✅ Filter submitted:", filters);

    if (!filters.deviceId || !filters.from || !filters.to) {
      alert("Please select a vehicle and date range");
      return;
    }

    setPagination({ pageIndex: 0, pageSize: 10 });
    setSorting([]);
    setExpandedRows(new Set());

    setApiFilters({
      schoolId: filters.schoolId,
      branchId: filters.branchId,
      uniqueId: filters.deviceId,
      from: filters.from,
      to: filters.to,
      period: "Custom",
    });

    setHasGenerated(true);
    setShowTable(true);
  }, []);

  const summaryColumns = GetGeofenceSummaryColumns(expandedRows, toggleRowExpansion);
  const detailColumns = GetGeofenceDetailColumns();

  // Custom cell renderer for the main table to handle nested tables
  const mainColumns = useMemo(() => {
    return summaryColumns.map((col: ColumnDef<GeofenceExpandedRow>) => {
      if ("accessorKey" in col && col.accessorKey === "vehicleName") {
        return {
          ...col,
          cell: ({ row }: { row: { original: GeofenceExpandedRow } }) => {
            const data = row.original;

            if ("isDetailTable" in data && data.isDetailTable) {
              return (
                <div className="col-span-full w-full">
                  <div className="w-full bg-gray-50 rounded p-4 my-2">
                    <h3 className="text-sm font-semibold mb-2 text-gray-700">
                      Geofence Events for {data.vehicleName}
                    </h3>
                    <TravelTable
                      data={data.detailData}
                      columns={detailColumns}
                      totalCount={data.detailData.length}
                      emptyMessage="No events found for this device"
                      showSerialNumber={true}
                      maxHeight="400px"
                    />
                  </div>
                </div>
              );
            }

            return "vehicleName" in data ? data.vehicleName : null;
          },
        };
      }
      return col;
    });
  }, [summaryColumns, detailColumns]);

  // Flatten nested geofence event data helper
  const flattenGeofenceData = (data: any) => {
    if (!data || typeof data !== "object") return [];
    const flat: any[] = [];
    for (const uniqueId of Object.keys(data)) {
      const dateMap = data[uniqueId];
      if (!dateMap || typeof dateMap !== "object") continue;
      for (const date of Object.keys(dateMap)) {
        const events = dateMap[date];
        if (!Array.isArray(events)) continue;
        for (const event of events) {
          flat.push({
            uniqueId: event.uniqueId,
            date,
            geofenceName: event.geofenceName,
            address: event.address,
            eventType: event.eventType,
            geoType: event.geoType,
            timestamp: event.timestamp,
            createdAt: event.createdAt,
            center: event.area?.center
              ? `${event.area.center[0]}, ${event.area.center[1]}`
              : "-",
            radius: event.area?.radius ?? 0,
          });
        }
      }
    }
    return flat;
  };

  const updateProgress = (percent: number, label: string) => {
    setDownloadProgress(percent);
    setDownloadLabel(label);
  };

  // Handle PDF and Excel exports
  const handleExport = async (type: "pdf" | "excel") => {
    try {
      setIsDownloading(true);
      updateProgress(10, "Fetching geofence alerts data...");

      // Fetch all pages of report data
      const res = await reportService.getGeofenceAlertsReport({
        uniqueIds: parseUniqueIds(apiFilters.uniqueId),
        from: apiFilters.from,
        to: apiFilters.to,
        page: 1,
        limit: 10000,
      });

      updateProgress(40, "Processing and grouping data...");
      const rawEvents = res?.data ? flattenGeofenceData(res.data) : [];

      // Group by uniqueId like groupedGeofenceReport
      const groups: Record<string, any> = {};
      rawEvents.forEach((item: any) => {
        if (!groups[item.uniqueId]) {
          const matchedDevice = devices?.find(
            (device: any) => String(device.uniqueId) === String(item.uniqueId)
          );
          groups[item.uniqueId] = {
            uniqueId: item.uniqueId,
            vehicleName: matchedDevice?.name || item.uniqueId || "-",
            eventCount: 0,
            events: [],
          };
        }
        groups[item.uniqueId].events.push(item);
        groups[item.uniqueId].eventCount++;
      });

      const preparedData = Object.values(groups).map((group, index) => ({
        ...group,
        sn: index + 1,
      }));

      const exportColumns = [
        { key: "sn", header: "S.No." },
        { key: "vehicleName", header: "Vehicle Name" },
        { key: "eventCount", header: "Total Events" },
      ];

      const nestedExportColumns = [
        { key: "date", header: "Date" },
        { key: "geofenceName", header: "Geofence Name" },
        { key: "address", header: "Address" },
        { key: "eventType", header: "Event Type" },
        { key: "geoType", header: "Geo Type" },
        {
          key: "createdAt",
          header: "Timestamp",
          formatter: (val: any) => {
            if (!val) return "-";
            return new Date(val).toLocaleString("en-GB", {
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
        },
        { key: "center", header: "Coordinates" },
        { key: "radius", header: "Radius (m)" },
      ];

      updateProgress(75, `Generating ${type.toUpperCase()} file...`);

      if (type === "pdf") {
        await exportToPDF(preparedData, exportColumns, {
          title: "Geofence Alerts Report",
          nestedTable: {
            dataKey: "events",
            columns: nestedExportColumns,
            title: "Geofence Events Detail",
          },
        });
      } else {
        await exportToExcel(preparedData, exportColumns, {
          title: "Geofence Alerts Report",
          nestedTable: {
            dataKey: "events",
            columns: nestedExportColumns,
            title: "Geofence Events Detail",
          },
        });
      }

      updateProgress(100, "Download complete!");
    } catch (err) {
      console.error(err);
      toast.error(`Failed to export ${type.toUpperCase()}`);
    } finally {
      setTimeout(() => {
        setIsDownloading(false);
        setDownloadProgress(0);
        setDownloadLabel("");
      }, 500);
    }
  };

  // Table configuration
  const { table, tableElement } = CustomTableServerSidePagination({
    data: expandedTableData,
    columns: mainColumns,
    pagination,
    totalCount: totalGeofenceAlertsReport,
    loading: isFetchingGeofenceAlertsReport,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    sorting,
    columnVisibility,
    onColumnVisibilityChange: setColumnVisibility,
    emptyMessage: isFetchingGeofenceAlertsReport
      ? "Loading report data..."
      : "No data available for the selected filters",
    pageSizeOptions: [5, 10, 20, 30, 50, 100, "All"],
    enableSorting: true,
    showSerialNumber: false, // SN is handled in summary columns
    enableVirtualization: true,
    estimatedRowHeight: 50,
    overscan: 5,
    maxHeight: "600px",
  });

  return (
    <div className="p-6">
      <ResponseLoader isLoading={isFetchingGeofenceAlertsReport} />

      <DownloadProgress
        open={isDownloading}
        progress={downloadProgress}
        label={downloadLabel}
      />

      <ReportFilter
        onSubmit={handleFilterSubmit}
        table={table}
        className="mb-6"
        config={{
          showSchool: true,
          showBranch: true,
          requireSchool: false,
          requireBranch: false,
          showDevice: true,
          showDateRange: true,
          showSubmitButton: true,
          submitButtonText: "Generate",
          dateRangeTitle: "Select Date Range",
          dateRangeMaxDays: 90,
          cardTitle: "Geofence Report",
          arrayFormat: "comma",
          arraySeparator: ",",
          multiSelectDevice: true,
          showBadges: true,
          maxBadges: 2,
          showExport: true,
          exportOptions: ["excel", "pdf"],
        }}
        onExportClick={handleExport}
      />

      {showTable && <section className="mb-4">{tableElement}</section>}
    </div>
  );
};

export default GeofenceAlertsReportPage;
