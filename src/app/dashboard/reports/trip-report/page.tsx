"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  ReportFilter,
  FilterValues,
} from "@/components/report-filters/Report-Filter";
import { VisibilityState } from "@tanstack/react-table";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";
import ResponseLoader from "@/components/ResponseLoader";
import { useReport } from "@/hooks/reports/useReport";
import { GetTripReportColumns } from "@/components/columns/columns";

const TripReportPage: React.FC = () => {
  // Table state
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
  const { tripReport, totalTripReport, isFetchingTripReport } = useReport(
    pagination,
    apiFilters,
    "trip"
  );

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

  // Column definitions
  const columns = GetTripReportColumns();

  // Table configuration
  const { table, tableElement } = CustomTableServerSidePagination({
    data: tripReport,
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
      : "No data available for the selected filters",
    pageSizeOptions: [5, 10, 20, 30, 50],
    enableSorting: true,
    showSerialNumber: true,
  });

  return (
    <div className="p-6">
      <ResponseLoader isLoading={isFetchingTripReport} />

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
          cardTitle: "Trip Report",
        }}
      />

      {/* Table - Always render when showTable is true */}
      {showTable && <section className="mb-4">{tableElement}</section>}
    </div>
  );
};

export default TripReportPage;
