"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  ReportFilter,
  FilterValues,
} from "@/components/report-filters/Report-Filter";
import { VisibilityState } from "@tanstack/react-table";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";
import ResponseLoader from "@/components/ResponseLoader";
import { useReport } from "@/hooks/reports/useReport";
import { getRouteReportColumns } from "@/components/columns/columns";
import { useQueryClient } from "@tanstack/react-query";

const RouteReportPage: React.FC = () => {
  // Table state
  const queryClient = useQueryClient();
  const [shouldFetch, setShouldFetch] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [showTable, setShowTable] = useState(false);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState<any[]>([]);

  // Filter state for API
  const [apiFilters, setApiFilters] = useState<Record<string, any>>({
    schoolId: undefined,
    branchId: undefined,
    uniqueId: undefined,
    from: undefined,
    to: undefined,
  });

  // Fetch report data using the hook
  const { routeReport, totalRouteReport, isFetchingRouteReport } = useReport(
    pagination,
    apiFilters,
    sorting,
    "route",
    hasGenerated
  );

  // Column definitions
  const columns = getRouteReportColumns();

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
    if (!isFetchingRouteReport && shouldFetch) {
      setShouldFetch(false);
    }
  }, [isFetchingRouteReport, shouldFetch]);

  useEffect(() => {
    if (shouldFetch && hasGenerated) {
      queryClient.invalidateQueries({
        queryKey: ["route-report"],
      });
    }
  }, [shouldFetch, hasGenerated, queryClient]);

  // Table configuration
  const { table, tableElement } = CustomTableServerSidePagination({
    data: routeReport,
    columns,
    pagination,
    totalCount: totalRouteReport,
    loading: isFetchingRouteReport,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    sorting,
    columnVisibility,
    onColumnVisibilityChange: setColumnVisibility,
    emptyMessage: isFetchingRouteReport
      ? "Loading report data..."
      : "No data available for the selected filters",
    pageSizeOptions: [5, 10, 20, 30, 50],
    enableSorting: true,
    showSerialNumber: true,
  });

  return (
    <div className="p-6">
      <ResponseLoader isLoading={isFetchingRouteReport} />

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
          submitButtonText: isFetchingRouteReport ? "Generating..." : "Generate",
          submitButtonDisabled: isFetchingRouteReport,
          dateRangeTitle: "Select Date Range",
          dateRangeMaxDays: 300,
          cardTitle: "Route Report",
        }}
      />

      {/* Table - Always render when showTable is true */}
      {showTable && <section className="mb-4">{tableElement}</section>}
    </div>
  );
};

export default RouteReportPage;
