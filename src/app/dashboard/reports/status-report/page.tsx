"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  ReportFilter,
  FilterValues,
} from "@/components/report-filters/Report-Filter";
import { VisibilityState } from "@tanstack/react-table";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";
import ResponseLoader from "@/components/ResponseLoader";
import { getStatusReportColumns } from "@/components/columns/columns";
import { useQueryClient } from "@tanstack/react-query";
import { reverseGeocodeMapTiler } from "@/hooks/useReverseGeocoding";
import { useExport } from "@/hooks/useExport";
import { GetStatusReportResponse, StatusReport } from "@/interface/modal";
import { api } from "@/services/apiService";
import DownloadProgress from "@/components/DownloadProgress";
import { useStatusReport } from "@/hooks/reports/useStatusReport";
import { toast } from "sonner";

const StatusReportPage: React.FC = () => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadLabel, setDownloadLabel] = useState("");

  // Table state
  const queryClient = useQueryClient();
  const [tableData, setTableData] = useState<StatusReport[]>([]);

  // const [shouldFetch, setShouldFetch] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [showTable, setShowTable] = useState(false);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 1000,
  });
  const [sorting, setSorting] = useState<any[]>([]);
  const lastProcessedRef = React.useRef<string>("");
  const updateProgress = (percent: number, label: string) => {
    setDownloadProgress(percent);
    setDownloadLabel(label);
  };

  // Column definitions
  const columns = getStatusReportColumns();
  // Export
  const { exportToPDF, exportToExcel } = useExport();
  // Filter state for API
  const [apiFilters, setApiFilters] = useState<Record<string, any>>({
    schoolId: undefined,
    branchId: undefined,
    uniqueId: undefined,
    from: undefined,
    to: undefined,
  });

  // Fetch report data using the hook
  const { data, isFetching: isFetchingStatusReport } = useStatusReport({
    pagination,
    sorting,
    filters: apiFilters,
    hasGenerated,
  });
  const statusReport = data?.data;
  const totalStatusReport = data?.total || 0;
  useEffect(() => {
    console.log("RAW STATUS REPORT", statusReport);
    console.log("TABLE DATA", tableData);
  }, [statusReport, tableData]);

  // Handle filter submission
  const handleFilterSubmit = useCallback((filters: FilterValues) => {
    // console.log("✅ Filter submitted:", filters);

    if (!filters.deviceId || !filters.from || !filters.to) {
      alert("Please select a vehicle and date range");
      return;
    }

    // Reset pagination when filters change
    setPagination({ pageIndex: 0, pageSize: 10 });
    setSorting([]);

    // Set API filters
    setApiFilters({
      schoolId: filters.schoolId,
      branchId: filters.branchId,
      uniqueId: filters.deviceId,
      from: filters.from,
      to: filters.to,
      period: "Custom",
    });

    // setShouldFetch(true);
    setHasGenerated(true);

    // Show table
    setShowTable(true);
  }, []);

  useEffect(() => {
    if (!statusReport?.length) {
      if (tableData.length !== 0) setTableData([]);
      return;
    }
    const currentHash = JSON.stringify(statusReport);
    if (lastProcessedRef.current === currentHash) return;
    lastProcessedRef.current = currentHash;
    const enrich = async () => {
      const enriched = await enrichStatusReportWithAddress(statusReport);
      setTableData(enriched);
    };

    enrich();
  }, [statusReport]);

  const fetchStatusReportForExport = async (): Promise<StatusReport[]> => {
    const res = await api.get("/report/status", {
      uniqueId: apiFilters.uniqueId,
      from: apiFilters.from,
      to: apiFilters.to,
      period: "Custom",
      page: 1,
      limit: "all",
      sortBy: sorting?.[0]?.id,
      sortOrder: sorting?.[0]?.desc ? "desc" : "asc",
    });
    return res.data ?? [];
  };

  const prepareExportData = async (data: any[]) => {
    return Promise.all(
      data.map(async (item) => {
        const startTime = new Date(item.startDateTime).toLocaleString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
          timeZone: "UTC",
        });

        const endTime = new Date(item.endDateTime).toLocaleString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
          timeZone: "UTC",
        });

        const distance =
          item.distance != null ? (item.distance / 1000).toFixed(2) : "0.00";

        const startCoordinates = `${item.startCoordinate.latitude}, ${item.startCoordinate.longitude}`;
        const endCoordinates = `${item.endCoordinate.latitude}, ${item.endCoordinate.longitude}`;

        return {
          ...item,
          startTime,
          endTime,
          startCoordinates,
          endCoordinates,
          distance,
        };
      })
    );
  };

  const enrichStatusReportWithAddress = async (
    rows: StatusReport[]
  ): Promise<StatusReport[]> => {
    return Promise.all(
      rows.map(async (row) => {
        const [startLocation, endLocation] = await Promise.all([
          reverseGeocodeMapTiler(
            row.startCoordinate.latitude,
            row.startCoordinate.longitude
          ),
          reverseGeocodeMapTiler(
            row.endCoordinate.latitude,
            row.endCoordinate.longitude
          ),
        ]);

        return {
          ...row,
          startLocation,
          endLocation,
        };
      })
    );
  };

  // Define columns for export report
  const exportColumns = [
    { key: "name", header: "Vehicle No" },
    { key: "vehicleStatus", header: "Status" },
    { key: "startTime", header: "Start Time" },
    { key: "startLocation", header: "Start Location" },
    { key: "startCoordinates", header: "Start Coordinates" },
    { key: "time", header: "Duration" },
    { key: "distance", header: "Distance (KM)" },
    { key: "maxSpeed", header: "Max Speed (KM/H)" },
    { key: "endTime", header: "End Time" },
    { key: "endLocation", header: "End Location" },
    { key: "endCoordinates", header: "End Coordinates" },
  ];

  const handleExportPDF = async () => {
    try {
      setIsDownloading(true);
      updateProgress(5, "Fetching report data");

      let exportData = await fetchStatusReportForExport();

      updateProgress(30, "Resolving locations");
      exportData = await enrichStatusReportWithAddress(exportData);

      updateProgress(60, "Preparing report");
      const preparedData = await prepareExportData(exportData);

      updateProgress(85, "Generating PDF");
      await exportToPDF(preparedData, exportColumns, {
        title: "Vehicle Status Report",
      });

      updateProgress(100, "Download complete");
    } catch (err) {
      console.error(err);
      alert("Failed to export PDF");
    } finally {
      setTimeout(() => {
        setIsDownloading(false);
        setDownloadProgress(0);
        setDownloadLabel("");
      }, 500);
    }
  };

  const handleExportExcel = async () => {
    try {
      setIsDownloading(true);
      updateProgress(5, "Fetching report data");
      let exportData = await fetchStatusReportForExport();

      updateProgress(30, "Resolving locations");
      exportData = await enrichStatusReportWithAddress(exportData);

      updateProgress(60, "Preparing report");
      const preparedData = await prepareExportData(exportData);

      updateProgress(85, "Generating PDF");
      exportToExcel(preparedData, exportColumns, {
        title: "Vehicle Status Report",
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

  // Table configuration
  const { table, tableElement } = CustomTableServerSidePagination({
    data: tableData,
    columns,
    pagination,
    totalCount: totalStatusReport,
    loading: isFetchingStatusReport,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    sorting,
    columnVisibility,
    onColumnVisibilityChange: setColumnVisibility,
    emptyMessage: isFetchingStatusReport
      ? "Loading report data..."
      : totalStatusReport === 0
      ? "No data available for the selected filters"
      : "Wait for it....🫣",
    pageSizeOptions: [5, 10, 20, 30, 50, 100, 200, 500, "All"],
    enableSorting: true,
    showSerialNumber: true,
    // Enable virtualization
    enableVirtualization: true,
    estimatedRowHeight: 50,
    overscan: 10,
    maxHeight: "600px",
  });

  return (
    <div className="p-6">
      <ResponseLoader isLoading={isFetchingStatusReport} />

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
          submitButtonText: isFetchingStatusReport
            ? "Generating..."
            : "Generate",
          submitButtonDisabled: isFetchingStatusReport,
          dateRangeTitle: "Select Date Range",
          dateRangeMaxDays: 90,
          cardTitle: "Status Report",
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

      {/* Table - Always render when showTable is true */}
      {showTable && <section className="mb-4">{tableElement}</section>}
    </div>
  );
};

export default StatusReportPage;
