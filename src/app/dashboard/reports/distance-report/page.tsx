"use client";

import React, { useState, useCallback, useRef } from "react";
import {
  ReportFilter,
  FilterValues,
} from "@/components/report-filters/Report-Filter";
import { VisibilityState } from "@tanstack/react-table";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";
import ResponseLoader from "@/components/ResponseLoader";
import { useReport } from "@/hooks/reports/useReport";
import { id } from "date-fns/locale";

const DistanceReportPage: React.FC = () => {
  // Table state
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [showTable, setShowTable] = useState(false);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState<any[]>([]);

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
  const { distanceReport, totalDistanceReport, isFetchingDistanceReport } =
    useReport(pagination, apiFilters, "distance");

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

    // Show table
    setShowTable(true);
  }, []);

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
      : "No data available for the selected filters",
    pageSizeOptions: [5, 10, 20, 30, 50],
    enableSorting: true,
    showSerialNumber: true,
  });

  return (
    <div className="p-6">
      <ResponseLoader isLoading={isFetchingDistanceReport} />

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
          submitButtonText: "Generate",
          dateRangeTitle: "Select Date Range",
          dateRangeMaxDays: 300,
          cardTitle: "Distance Report",
          arrayFormat: "comma",
          arraySeparator: ",",
          multiSelectDevice: true,
          showBadges: true,
          maxBadges: 2,
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
