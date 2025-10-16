"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ReportFilter,
  DateRange,
  FilterValues,
} from "@/components/report-filters/Report-Filter";
import { type ColumnDef, VisibilityState } from "@tanstack/react-table";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";
import { api } from "@/services/apiService";
import ResponseLoader from "@/components/ResponseLoader";
import { useDeviceData } from "@/hooks/useDeviceData";

interface GeofenceReportData {
  id: string;
  sn: number;
  name: string;
  type: string;
  message: string;
  location: string;
  createdAt: string;
}

const GeofenceReportPage: React.FC = () => {
  // ===== Filter State =====
  const [selectedSchool, setSelectedSchool] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: null,
    endDate: null,
  });

  // ===== Table State =====
  const [data, setData] = useState<GeofenceReportData[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState<any[]>([]);

  // ===== Infinite Scroll Vehicle Selection =====
  const [searchTerm, setSearchTerm] = useState("");

  const {
    data: vehicleData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: vehiclesLoading,
  } = useDeviceData({ searchTerm });

  // Flatten paginated results
  const allVehicles = useMemo(() => {
    if (!vehicleData?.pages) return [];
    return vehicleData.pages.flat();
  }, [vehicleData]);

  const vehicleMetaData = useMemo(() => {
    if (!Array.isArray(allVehicles)) return [];
    return allVehicles.map((vehicle) => ({
      value: vehicle.deviceId.toString(),
      label: vehicle.name,
    }));
  }, [allVehicles]);

  const handleVehicleReachEnd = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleSearchChange = useCallback((search: string) => {
    setSearchTerm(search);
  }, []);

  // ===== Table Columns =====
  const columns: ColumnDef<GeofenceReportData>[] = [
    { accessorKey: "sn", header: "SN" },
    { accessorKey: "name", header: "Geofence Name", size: 250 },
    { accessorKey: "type", header: "Type", size: 200 },
    { accessorKey: "message", header: "Message", size: 300 },
    { accessorKey: "location", header: "Location", size: 300 },
    {
      accessorKey: "createdAt",
      header: "Created At",
      size: 250,
      cell: ({ row }) =>
        row.original.createdAt
          ? new Date(row.original.createdAt).toLocaleString()
          : "-",
    },
  ];

  // ===== API Fetch Function =====
  const fetchGeofenceReportData = async (
    filters: FilterValues,
    paginationState: any,
    sortingState: any
  ) => {
    if (!filters) return;
    setIsLoading(true);

    try {
      const fromDate = new Date(filters.startDate).toISOString();
      const toDate = new Date(filters.endDate).toISOString();

      const queryParams = new URLSearchParams({
        deviceId: filters.deviceId,
        schoolId: filters.schoolId || "",
        branchId: filters.branchId || "",
        from: fromDate,
        to: toDate,
        page: (paginationState.pageIndex + 1).toString(),
        limit: paginationState.pageSize.toString(),
      });

      if (sortingState?.length) {
        const sort = sortingState[0];
        queryParams.append("sortBy", sort.id);
        queryParams.append("sortOrder", sort.desc ? "desc" : "asc");
      }

      const response = await api.get(`/report/geofence?${queryParams.toString()}`);
      const json = response.data;

      const arrayData = Array.isArray(json) ? json : [json];
      const transformed: GeofenceReportData[] = arrayData.map(
        (item: any, index: number) => ({
          id: item._id || `row-${index}`,
          sn: paginationState.pageIndex * paginationState.pageSize + index + 1,
          name: item.name || "-",
          type: item.type || "-",
          message: item.message || "-",
          location: item.location || "-",
          createdAt: item.createdAt || "-",
        })
      );

      setData(transformed);
      setTotalCount(response.total || transformed.length);
    } catch (error: any) {
      console.error("Error fetching geofence report data:", error);
      setData([]);
      setTotalCount(0);
      alert(error.response?.data?.error || error.message || "Network error");
    } finally {
      setIsLoading(false);
    }
  };

  // ===== Filter Submit Handler =====
  const handleFilterSubmit = useCallback(
    async (filters: FilterValues) => {
      console.log("✅ Geofence Filter Submitted:", filters);
      console.log("📊 Current Selections:", {
        school: selectedSchool,
        branch: selectedBranch,
        device: selectedDevice,
        deviceName,
        dateRange,
      });

      if (!selectedDevice || !dateRange.startDate || !dateRange.endDate) {
        alert("Please select a vehicle and both start and end dates.");
        return;
      }

      setPagination({ pageIndex: 0, pageSize: 10 });
      setSorting([]);
      setShowTable(true);

      await fetchGeofenceReportData(filters, { pageIndex: 0, pageSize: 10 }, []);
    },
    [selectedSchool, selectedBranch, selectedDevice, deviceName, dateRange]
  );

  // ===== Refetch on Pagination/Sorting Change =====
  useEffect(() => {
    if (showTable && selectedDevice && dateRange.startDate && dateRange.endDate) {
      const filters: FilterValues = {
        schoolId: selectedSchool,
        branchId: selectedBranch,
        deviceId: selectedDevice,
        deviceName,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      };
      fetchGeofenceReportData(filters, pagination, sorting);
    }
  }, [pagination, sorting, showTable, selectedDevice, dateRange]);

  // ===== Table Initialization =====
  const { table, tableElement } = CustomTableServerSidePagination({
    data,
    columns,
    pagination,
    totalCount,
    loading: isLoading,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    sorting,
    columnVisibility,
    onColumnVisibilityChange: setColumnVisibility,
    emptyMessage: "No geofence reports found",
    pageSizeOptions: [5, 10, 20, 30, 50],
    enableSorting: true,
    showSerialNumber: false,
  });

  return (
    <div className="p-6">
      <ResponseLoader isLoading={isLoading} />
      <header>
        <h1 className="text-2xl font-bold mb-4">Geofence Report</h1>
      </header>

      {/* Reusable ReportFilter */}
      <ReportFilter
        onSubmit={handleFilterSubmit}
        className="mb-6"
        selectedSchool={selectedSchool}
        onSchoolChange={setSelectedSchool}
        selectedBranch={selectedBranch}
        onBranchChange={setSelectedBranch}
        selectedDevice={selectedDevice}
        onDeviceChange={(deviceId, name) => {
          setSelectedDevice(deviceId);
          setDeviceName(name);
        }}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        vehicleMetaData={vehicleMetaData}
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        onVehicleReachEnd={handleVehicleReachEnd}
        isFetchingNextPage={isFetchingNextPage}
        hasNextPage={hasNextPage}
      />

      {/* Table */}
      {showTable && <section className="mb-4">{tableElement}</section>}
    </div>
  );
};

export default GeofenceReportPage;
