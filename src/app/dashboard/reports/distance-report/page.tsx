"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  ReportFilter,
  FilterValues,
} from "@/components/report-filters/Report-Filter";
import { VisibilityState } from "@tanstack/react-table";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";
import ResponseLoader from "@/components/ResponseLoader";
import { useReport } from "@/hooks/reports/useReport";
import { useQueryClient } from "@tanstack/react-query";
import DownloadProgress from "@/components/DownloadProgress";
import { useExport } from "@/hooks/useExport";
import api from "@/lib/axios";
import { parseUniqueIds } from "@/util/parseUniqueIds";
import { useDistanceReport } from "@/hooks/reports/useDistanceReport";
import { set } from "lodash";
import { toast } from "sonner";

const DistanceReportPage: React.FC = () => {
  // Table state
  const queryClient = useQueryClient();
  const [shouldFetch, setShouldFetch] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [showTable, setShowTable] = useState(false);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState<any[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadLabel, setDownloadLabel] = useState("");

  const updateProgress = (percent: number, label: string) => {
    setDownloadProgress(percent);
    setDownloadLabel(label);
  };

  // Store stable columns to prevent shifting during loading
  const stableColumnsRef = useRef<any[]>([]);

  // Filter state for API
  const [apiFilters, setApiFilters] = useState<Record<string, any>>({
    schoolId: undefined,
    branchId: undefined,
    uniqueId: undefined,
    from: undefined,
    to: undefined,
  });

  // Fetch report data using the hook
  const { data, isFetching: isFetchingDistanceReport } = useDistanceReport({
    pagination,
    filters: apiFilters,
    hasGenerated,
  });

  const distanceReport = data?.data;
  const totalDistanceReport = data?.total;

  const { exportToPDF, exportToExcel } = useExport();

  // Handle filter submission
  const handleFilterSubmit = useCallback((filters: FilterValues) => {
    console.log("✅ Filter submitted:", filters);

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
    if (!isFetchingDistanceReport && shouldFetch) {
      setShouldFetch(false);
    }
  }, [isFetchingDistanceReport, shouldFetch]);

  useEffect(() => {
    if (shouldFetch && hasGenerated) {
      queryClient.invalidateQueries({
        queryKey: ["distance-report"],
      });
    }
  }, [shouldFetch, hasGenerated, queryClient]);

  const fetchDistanceReportForExport = async (): Promise<any> => {
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
  };

  const prepareDistanceExport = (rows: any[]) => {
    if (!rows.length) return { data: [], columns: [] };

    const sample = rows[0];
    const dateKeys = Object.keys(sample).filter(
      (k) => !["name", "totalKm"].includes(k)
    );

    const columns = [
      { key: "name", header: "Vehicle Name" },
      ...dateKeys.map((d) => ({ key: d, header: d })),
      { key: "totalKm", header: "Total KM" },
    ];

    return { data: rows, columns };
  };

  const handleExportPDF = async () => {
    try {
      setIsDownloading(true);
      updateProgress(5, "Fetching distance data");

      const rawData = await fetchDistanceReportForExport();

      updateProgress(40, "Preparing report");
      const { data, columns } = prepareDistanceExport(rawData);

      updateProgress(75, "Generating PDF");
      await exportToPDF(data, columns, {
        title: "Vehicle Distance Report",
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
      }, 800);
    }
  };

  const handleExportExcel = async () => {
    try {
      setIsDownloading(true);
      updateProgress(5, "Fetching report data");
      const exportData = await fetchDistanceReportForExport();

      updateProgress(60, "Resolving locations");
      const { data, columns } = prepareDistanceExport(exportData);

      updateProgress(85, "Generating Excel");
      exportToExcel(data, columns, {
        title: "Vehicle Distance Report",
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

  const columns = React.useMemo(() => {
    if (isFetchingDistanceReport && stableColumnsRef.current.length > 0) {
      return stableColumnsRef.current;
    }

    if (!distanceReport?.[0]) {
      const fallbackColumns = [
        {
          id: "name",
          accessorKey: "name",
          header: "Vehicle Name",
          size: 200,
          minSize: 150,
          maxSize: 300,
        },
      ];

      if (stableColumnsRef.current.length === 0) {
        stableColumnsRef.current = fallbackColumns;
      }

      return stableColumnsRef.current;
    }

    const rawRow = distanceReport[0];
    const dateKeys = Object.keys(rawRow).filter(
      (k) => !["name", "totalKm"].includes(k)
    );

    const newColumns = [
      {
        id: "name",
        accessorKey: "name",
        header: "Vehicle Name",
        size: 200,
        minSize: 150,
        maxSize: 300,
      },
      ...dateKeys.map((date) => ({
        id: date,
        accessorKey: date,
        header: date,
        size: 120,
        minSize: 100,
        maxSize: 150,
      })),
      {
        id: "totalKm",
        accessorKey: "totalKm",
        header: "Total KM",
        size: 120,
        minSize: 100,
        maxSize: 150,
      },
    ];

    stableColumnsRef.current = newColumns;
    return newColumns;
  }, [distanceReport, isFetchingDistanceReport]);

  // Table configuration
  const { table, tableElement } = CustomTableServerSidePagination({
    data: distanceReport ?? [],
    columns,
    pagination,
    totalCount: totalDistanceReport,
    loading: isFetchingDistanceReport,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    sorting,
    columnVisibility,
    onColumnVisibilityChange: setColumnVisibility,
    emptyMessage: isFetchingDistanceReport
      ? "Loading report data..."
      : totalDistanceReport === 0
      ? "No data available for the selected filters"
      : "Wait for it....🫣",
    pageSizeOptions: [5, 10, 20, 30, 50, 100, 200, 500, "All"],
    enableSorting: true,
    showSerialNumber: true,
  });

  return (
    <div className="p-6">
      <ResponseLoader isLoading={isFetchingDistanceReport} />

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
          submitButtonText: isFetchingDistanceReport
            ? "Generating..."
            : "Generate",
          submitButtonDisabled: isFetchingDistanceReport,
          dateRangeTitle: "Select Date Range",
          dateRangeMaxDays: 90,
          cardTitle: "Distance Report",
          arrayFormat: "comma",
          arraySeparator: ",",
          multiSelectDevice: true,
          showBadges: true,
          maxBadges: 2,
          showExport: true,
          exportOptions: ["excel", "pdf"],
        }}
        onExportClick={(type) => {
          if (type === "pdf") handleExportPDF();
          else handleExportExcel();
        }}
      />

      {/* Table - Stable container with fixed dimensions */}
      {showTable && (
        <section className="mb-4 min-h-[400px]">
          <div className="w-full overflow-x-auto">{tableElement}</div>
        </section>
      )}
    </div>
  );
};

export default DistanceReportPage;
