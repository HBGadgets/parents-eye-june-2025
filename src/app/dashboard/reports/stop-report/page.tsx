"use client";

import React, { useState, useEffect, useCallback } from "react";
import { VisibilityState } from "@tanstack/react-table";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";
import ResponseLoader from "@/components/ResponseLoader";
import DownloadProgress from "@/components/DownloadProgress";
import {
  ReportFilter,
  FilterValues,
} from "@/components/report-filters/Report-Filter";
// import { getStopReportColumns } from "@/components/columns/stopReportColumns";
import { reverseGeocodeMapTiler } from "@/hooks/useReverseGeocoding";
import { useExport } from "@/hooks/useExport";
import { api } from "@/services/apiService";
// import { useStopReport } from "@/hooks/reports/useStopReport";
import { StopReport } from "@/interface/modal";
import { toast } from "sonner";
import { getStopReportColumns } from "@/components/columns/columns";
import { useStopReport } from "@/hooks/reports/useStopReport";

const StopReportPage: React.FC = () => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadLabel, setDownloadLabel] = useState("");

  const [tableData, setTableData] = useState<StopReport[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [showTable, setShowTable] = useState(false);

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const [sorting, setSorting] = useState<any[]>([]);
  const lastProcessedRef = React.useRef<string>("");

  const updateProgress = (percent: number, label: string) => {
    setDownloadProgress(percent);
    setDownloadLabel(label);
  };

  const columns = getStopReportColumns();
  const { exportToPDF, exportToExcel } = useExport();

  const [apiFilters, setApiFilters] = useState<Record<string, any>>({
    schoolId: undefined,
    branchId: undefined,
    uniqueId: undefined,
    from: undefined,
    to: undefined,
  });

  const { data, isFetching } = useStopReport({
    pagination,
    sorting,
    filters: apiFilters,
    hasGenerated,
  });

  const stopReport = data?.data ?? [];
  const totalStopReport = data?.total ?? 0;

  const handleFilterSubmit = useCallback((filters: FilterValues) => {
    if (!filters.deviceId || !filters.from || !filters.to) {
      alert("Please select a vehicle and date range");
      return;
    }

    setPagination({ pageIndex: 0, pageSize: 10 });
    setSorting([]);

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

  useEffect(() => {
    if (!stopReport.length) {
      if (tableData.length !== 0) setTableData([]);
      return;
    }

    const hash = JSON.stringify(stopReport);
    if (lastProcessedRef.current === hash) return;
    lastProcessedRef.current = hash;

    const enrich = async () => {
      const enriched = await enrichStopReportWithAddress(stopReport);
      setTableData(enriched);
    };

    enrich();
  }, [stopReport]);

  const enrichStopReportWithAddress = async (
    rows: StopReport[]
  ): Promise<StopReport[]> => {
    return Promise.all(
      rows.map(async (row) => {
        const location = await reverseGeocodeMapTiler(
          row.latitude,
          row.longitude
        );
        const arrival = new Date(row.arrivalTime).getTime();
        const departure = new Date(row.departureTime).getTime();

        const diffMs = Math.max(departure - arrival, 0);

        const hours = Math.floor(diffMs / 3600000);
        const minutes = Math.floor((diffMs % 3600000) / 60000);
        const seconds = Math.floor((diffMs % 60000) / 1000);

        const haltTime = `${hours}H ${minutes}M ${seconds}S`;

        const arrivalTime = new Date(row.arrivalTime).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      })

      const departureTime = new Date(row.departureTime).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      })
        return {
          ...row,
          location,
          haltTime,
          arrivalTime,
          departureTime,
        };
      })
    );
  };

  const fetchStopReportForExport = async (): Promise<StopReport[]> => {
    const res = await api.get("/report/stop-report", {
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

  const prepareExportData = async (data: StopReport[]) => {
    return Promise.all(
      data.map(async (item) => {
        const startTime = new Date(item.startTime).toLocaleString("en-GB", {
          hour12: true,
          timeZone: "UTC",
        });

        const endTime = new Date(item.endTime).toLocaleString("en-GB", {
          hour12: true,
          timeZone: "UTC",
        });

        const coordinates = `${item.latitude}, ${item.longitude}`;

        return {
          ...item,
          startTime,
          endTime,
          coordinates,
        };
      })
    );
  };

  const exportColumns = [
    { key: "name", header: "Vehicle No" },
    { key: "arrivalTime", header: "Start Time" },
    { key: "departureTime", header: "End Time" },
    { key: "haltTime", header: "Duration" },
    { key: "location", header: "Location" },
    { key: "coordinates", header: "Coordinates" },
  ];

  const handleExport = async (type: "pdf" | "excel") => {
    try {
      setIsDownloading(true);
      updateProgress(5, "Fetching report data");

      let exportData = await fetchStopReportForExport();

      updateProgress(30, "Resolving locations");
      exportData = await enrichStopReportWithAddress(exportData);

      updateProgress(60, "Preparing report");
      const preparedData = await prepareExportData(exportData);

      updateProgress(85, `Generating ${type.toUpperCase()}`);

      if (type === "pdf") {
        await exportToPDF(preparedData, exportColumns, {
          title: "Vehicle Stop Report",
        });
      } else {
        exportToExcel(preparedData, exportColumns, {
          title: "Vehicle Stop Report",
        });
      }

      updateProgress(100, "Download complete");
    } catch (err) {
      console.error(err);
      toast.error("Failed to export report");
    } finally {
      setTimeout(() => {
        setIsDownloading(false);
        setDownloadProgress(0);
        setDownloadLabel("");
      }, 500);
    }
  };

  const { table, tableElement } = CustomTableServerSidePagination({
    data: tableData,
    columns,
    pagination,
    totalCount: totalStopReport,
    loading: isFetching,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    sorting,
    columnVisibility,
    onColumnVisibilityChange: setColumnVisibility,
    pageSizeOptions: [5, 10, 20, 50, 100, "All"],
    enableSorting: true,
    showSerialNumber: true,
    enableVirtualization: true,
    estimatedRowHeight: 50,
    overscan: 10,
    maxHeight: "600px",
  });

  return (
    <div className="p-6">
      <ResponseLoader isLoading={isFetching} />

      <DownloadProgress
        open={isDownloading}
        progress={downloadProgress}
        label={downloadLabel}
      />

      <div className="space-y-3">
        <ReportFilter
          onSubmit={handleFilterSubmit}
          table={table}
          config={{
            showSchool: true,
            showBranch: true,
            showDevice: true,
            showDateRange: true,
            showSubmitButton: true,
            submitButtonText: isFetching ? "Generating..." : "Generate",
            submitButtonDisabled: isFetching,
            cardTitle: "Stop Report",
            showExport: true,
            exportOptions: ["excel", "pdf"],
          }}
          onExportClick={(type) => handleExport(type)}
        />

        {showTable && <section>{tableElement}</section>}
      </div>
    </div>
  );
};

export default StopReportPage;
