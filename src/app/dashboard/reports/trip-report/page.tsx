"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  ReportFilter,
  FilterValues,
} from "@/components/report-filters/Report-Filter";
import { VisibilityState } from "@tanstack/react-table";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";
import ResponseLoader from "@/components/ResponseLoader";
import { GetTripReportColumns } from "@/components/columns/columns";
import { useQueryClient } from "@tanstack/react-query";
import { reverseGeocodeMapTiler } from "@/hooks/useReverseGeocoding";
import { useExport } from "@/hooks/useExport";
import { api } from "@/services/apiService";
import DownloadProgress from "@/components/DownloadProgress";
import { useTripReport } from "@/hooks/reports/useTripReport";
import { toast } from "sonner";

interface TripReport {
  _id: string;
  uniqueId: number | string;
  name: string;
  startTime: string;
  endTime: string;
  startAddress?: string;
  endAddress?: string;
  startLatitude: number | string;
  startLongitude: number | string;
  endLatitude: number | string;
  endLongitude: number | string;
  duration: string;
  distance: string | number;
  maxSpeed: number;
  avgSpeed?: number;
  [key: string]: unknown;
}

interface TripReport {
  _id: string;
  uniqueId: number | string;
  name: string;
  startTime: string;
  endTime: string;
  startAddress?: string;
  endAddress?: string;
  startLatitude: number | string;
  startLongitude: number | string;
  endLatitude: number | string;
  endLongitude: number | string;
  duration: string;
  distance: string | number;
  maxSpeed: number;
  avgSpeed?: number;
  [key: string]: unknown;
}

const TripReportPage: React.FC = () => {
  // Download progress state
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadLabel, setDownloadLabel] = useState("");

  // Table state
  const queryClient = useQueryClient();
  const [tableData, setTableData] = useState<TripReport[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [showTable, setShowTable] = useState(false);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState<any[]>([]);
  const lastProcessedRef = React.useRef<string>("");

  // Progress update helper
  const updateProgress = (percent: number, label: string) => {
    setDownloadProgress(percent);
    setDownloadLabel(label);
  };

  // Column definitions
  const columns = GetTripReportColumns();
  
  // Export hook
  const { exportToPDF, exportToExcel } = useExport();

  // Filter state for API
  const [apiFilters, setApiFilters] = useState<Record<string, any>>({
    schoolId: undefined,
    branchId: undefined,
    uniqueId: undefined,
    from: undefined,
    to: undefined,
  });

  // Fetch report data using the dedicated hook
  const { data, isFetching: isFetchingTripReport } = useTripReport({
    pagination,
    sorting,
    filters: apiFilters,
    hasGenerated,
  });
  const tripReport = data?.data as TripReport[] | undefined;
  const totalTripReport = data?.total || 0;

  // Handle filter submission
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

  // Helper to check if an "address" is actually just coordinates (failed geocoding)
  const isCoordinateAddress = (address: string | undefined): boolean => {
    if (!address) return true;
    const coordPattern = /^-?\d+\.?\d*,\s*-?\d+\.?\d*$/;
    return coordPattern.test(address.trim());
  };

  // Process rows in small chunks to avoid 429
  const enrichTripReportWithAddress = async (
    rows: TripReport[],
    onProgress?: (index: number) => void
  ): Promise<TripReport[]> => {
    const result: TripReport[] = [];
    const CONCURRENCY_LIMIT = 3; // Reduced concurrency to be safe

    for (let i = 0; i < rows.length; i += CONCURRENCY_LIMIT) {
      const chunk = rows.slice(i, i + CONCURRENCY_LIMIT);
      const enrichedChunk = await Promise.all(
        chunk.map(async (row, idx) => {
          let startAddress = row.startAddress || "-";
          let endAddress = row.endAddress || "-";

          const needsStartAddress = isCoordinateAddress(row.startAddress);
          if (needsStartAddress && row.startLatitude && row.startLongitude) {
            try {
              startAddress = await reverseGeocodeMapTiler(
                Number(row.startLatitude),
                Number(row.startLongitude)
              ) || row.startAddress || "-";
            } catch (err) {
              console.error("Failed to fetch start address:", err);
            }
          }

          const needsEndAddress = isCoordinateAddress(row.endAddress);
          if (needsEndAddress && row.endLatitude && row.endLongitude) {
            try {
              endAddress = await reverseGeocodeMapTiler(
                Number(row.endLatitude),
                Number(row.endLongitude)
              ) || row.endAddress || "-";
            } catch (err) {
              console.error("Failed to fetch end address:", err);
            }
          }

          if (onProgress) onProgress(i + idx);

          return { ...row, startAddress, endAddress };
        })
      );
      result.push(...enrichedChunk);
    }
    return result;
  };

  // Effect to enrich data with addresses when tripReport changes
  useEffect(() => {
    if (!tripReport?.length) {
      if (tableData.length !== 0) setTableData([]);
      return;
    }
    const currentHash = JSON.stringify(tripReport);
    if (lastProcessedRef.current === currentHash) return;
    lastProcessedRef.current = currentHash;

    const enrich = async () => {
      const enriched = await enrichTripReportWithAddress(tripReport);
      setTableData(enriched);
    };

    enrich();
  }, [tripReport]);

  // Fetch trip report data for export (all data)
  const fetchTripReportForExport = async (): Promise<TripReport[]> => {
    const res = await api.get("/report/trip-summary-report", {
      uniqueId: apiFilters.uniqueId,
      from: apiFilters.from,
      to: apiFilters.to,
      period: "Custom",
      page: 1,
      limit: "all",
      sortBy: sorting?.[0]?.id,
      sortOrder: sorting?.[0]?.desc ? "desc" : "asc",
    }) as { data: TripReport[] };
    return res.data ?? [];
  };

  // Prepare export data - format dates and values
  const prepareExportData = async (data: TripReport[]) => {
    return Promise.all(
      data.map(async (item) => {
        const startTime = new Date(item.startTime).toLocaleString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
          timeZone: "UTC",
        });

        const endTime = new Date(item.endTime).toLocaleString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
          timeZone: "UTC",
        });

        const startCoordinates = `${item.startLatitude}, ${item.startLongitude}`;
        const endCoordinates = `${item.endLatitude}, ${item.endLongitude}`;
        // parseFloat handles strings like "4.10 KM" by extracting the numeric part
        const distanceNum = typeof item.distance === 'string' 
          ? parseFloat(item.distance) 
          : Number(item.distance);
        const distance = !isNaN(distanceNum) ? distanceNum.toFixed(2) : "0.00";
        const maxSpeed = item.maxSpeed != null ? `${item.maxSpeed} km/h` : "0 km/h";

        return {
          ...item,
          startTime,
          endTime,
          startCoordinates,
          endCoordinates,
          distance,
          maxSpeed,
          startAddress: item.startAddress || "-",
          endAddress: item.endAddress || "-",
        };
      })
    );
  };

  // Define columns for export report
  const exportColumns = [
    { key: "name", header: "Vehicle No" },
    { key: "startTime", header: "Start Time" },
    { key: "startAddress", header: "Start Address" },
    { key: "startCoordinates", header: "Start Coordinates" },
    { key: "endTime", header: "End Time" },
    { key: "endAddress", header: "End Address" },
    { key: "endCoordinates", header: "End Coordinates" },
    { key: "duration", header: "Duration" },
    { key: "distance", header: "Distance (KM)" },
    { key: "maxSpeed", header: "Max Speed" },
  ];

  // Handle PDF export
  const handleExportPDF = async () => {
    try {
      setIsDownloading(true);
      updateProgress(5, "Fetching report data");

      let exportData = await fetchTripReportForExport();
      console.log("exportData", exportData)

      updateProgress(30, "Resolving locations");
      exportData = await enrichTripReportWithAddress(exportData, (index) => {
        const percent = 30 + Math.floor((index / exportData.length) * 30);
        updateProgress(percent, `Resolving location ${index + 1}/${exportData.length}`);
      });

      updateProgress(60, "Preparing report");
      const preparedData = await prepareExportData(exportData);

      updateProgress(85, "Generating PDF");
      await exportToPDF(preparedData, exportColumns, {
        title: "Trip Report",
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

      let exportData = await fetchTripReportForExport();

      updateProgress(30, "Resolving locations");
      exportData = await enrichTripReportWithAddress(exportData, (index) => {
        const percent = 30 + Math.floor((index / exportData.length) * 30);
        updateProgress(percent, `Resolving location ${index + 1}/${exportData.length}`);
      });

      updateProgress(60, "Preparing report");
      const preparedData = await prepareExportData(exportData);

      updateProgress(85, "Generating Excel");
      exportToExcel(preparedData, exportColumns, {
        title: "Trip Report",
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
    totalCount: totalTripReport,
    loading: isFetchingTripReport,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    sorting,
    columnVisibility,
    onColumnVisibilityChange: setColumnVisibility,
    emptyMessage: isFetchingTripReport
      ? "Loading report data..."
      : totalTripReport === 0
      ? "No data available for the selected filters"
      : "Wait for it....🫣",
    pageSizeOptions: [5, 10, 20, 30, 50, 100, "All"],
    enableSorting: true,
    showSerialNumber: true,
    // Enable virtualization
    enableVirtualization: true,
    estimatedRowHeight: 50,
    overscan: 5,
    maxHeight: "600px",
  });

  return (
    <div className="p-6">
      <ResponseLoader isLoading={isFetchingTripReport} />

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
          submitButtonText: isFetchingTripReport ? "Generating..." : "Generate",
          submitButtonDisabled: isFetchingTripReport,
          dateRangeTitle: "Select Date Range",
          dateRangeMaxDays: 90,
          cardTitle: "Trip Report",
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

export default TripReportPage;
