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
import { useReport } from "@/hooks/reports/useReport";
import { useQueryClient } from "@tanstack/react-query";
import { reverseGeocodeMapTiler } from "@/hooks/useReverseGeocoding";
import { useExport } from "@/hooks/useExport";
import { StatusReport } from "@/interface/modal";
import { api } from "@/services/apiService";

const StatusReportPage: React.FC = () => {
  // Table state
  const queryClient = useQueryClient();
  const [tableData, setTableData] = useState<StatusReport[]>([]);

  const [shouldFetch, setShouldFetch] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [showTable, setShowTable] = useState(false);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState<any[]>([]);
  const lastProcessedRef = React.useRef<string>("");

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
  const { statusReport, totalStatusReport, isFetchingStatusReport } = useReport(
    pagination,
    apiFilters,
    sorting,
    "status",
    hasGenerated
  );
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

    setShouldFetch(true);
    setHasGenerated(true);

    // Show table
    setShowTable(true);
  }, []);

  useEffect(() => {
    if (!isFetchingStatusReport && shouldFetch) {
      setShouldFetch(false);
    }
  }, [isFetchingStatusReport, shouldFetch]);

  useEffect(() => {
    if (shouldFetch && hasGenerated) {
      queryClient.invalidateQueries({
        queryKey: ["status-report"],
      });
    }
  }, [shouldFetch, hasGenerated, queryClient]);

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

        return {
          ...item,
          startTime,
          endTime,
          // startAddress,
          // endAddress,
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

  const exportColumns = [
    { key: "name", header: "Vehicle No" },
    { key: "vehicleStatus", header: "Status" },
    { key: "startTime", header: "Start Time" },
    { key: "startLocation", header: "Start Location" },
    { key: "time", header: "Duration" },
    { key: "distance", header: "Distance (KM)" },
    { key: "maxSpeed", header: "Max Speed" },
    { key: "endTime", header: "End Time" },
    { key: "endLocation", header: "End Location" },
  ];

  const handleExportPDF = async () => {
    let exportData = await fetchStatusReportForExport();
    exportData = await enrichStatusReportWithAddress(exportData);
    console.log("exportData", exportData);
    const preparedData = await prepareExportData(exportData);

    exportToPDF(preparedData, exportColumns, {
      title: "Vehicle Status Report",
      metadata: {
        Period: "01 Jan 2026 - 01 Jan 2026",
        Branch: "Nagpur",
      },
    });
  };

  const handleExportExcel = async () => {
    let exportData = await fetchStatusReportForExport();
    exportData = await enrichStatusReportWithAddress(exportData);
    console.log("exportData", exportData);
    const preparedData = await prepareExportData(exportData);

    exportToExcel(preparedData, exportColumns, {
      title: "Vehicle Status Report",
    });
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
    pageSizeOptions: [5, 10, 20, 30, 50],
    enableSorting: true,
    showSerialNumber: true,
  });

  return (
    <div className="p-6">
      <ResponseLoader isLoading={isFetchingStatusReport} />

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
