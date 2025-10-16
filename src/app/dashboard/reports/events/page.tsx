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
import { reverseGeocode } from "@/util/reverse-geocode";
import { useDeviceData } from "@/hooks/useDeviceData";

interface EventReportData {
  id: string;
  sn: number;
  vehicleName: string;
  notification: string;
  location: string;
  message: string;
  dateTime: string;
  coordinates: string;
}

const EventReportPage: React.FC = () => {
  // Table states
  const [data, setData] = useState<EventReportData[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState<any[]>([]);
  const [currentFilters, setCurrentFilters] = useState<any>(null);

  // Filter states (consistent with StatusReport)
  const [selectedSchool, setSelectedSchool] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: null,
    endDate: null,
  });

  // Vehicle data with infinite scroll
  const [searchTerm, setSearchTerm] = useState("");
  const {
    data: vehicleData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useDeviceData({ searchTerm });

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

  // Columns
  const columns: ColumnDef<EventReportData>[] = [
    { accessorKey: "sn", header: "SN" },
    { accessorKey: "vehicleName", header: "Vehicle Name", size: 250 },
    {
      accessorKey: "notification",
      header: "Notification",
      size: 200,
      cell: ({ row }) => (
        <div className="text-sm font-medium">{row.original.notification}</div>
      ),
    },
    {
      accessorKey: "location",
      header: "Location",
      size: 350,
      cell: ({ row }) =>
        row.original.location !== "Loading..." ? row.original.location : "-",
    },
    {
      accessorKey: "message",
      header: "Message",
      size: 300,
      cell: ({ row }) => (
        <div className="text-sm max-w-xs truncate" title={row.original.message}>
          {row.original.message || "-"}
        </div>
      ),
    },
    {
      accessorKey: "dateTime",
      header: "Date/Time",
      size: 280,
      cell: ({ row }) =>
        row.original.dateTime
          ? new Date(row.original.dateTime).toLocaleString()
          : "-",
    },
  ];

  // API Fetch
  const fetchEventReportData = async (
    filters: any,
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
        period: "Custom",
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

      const response = await api.get(`report/event?${queryParams.toString()}`);
      const json = response.data;

      if (!json || (Array.isArray(json) && json.length === 0)) {
        setData([]);
        setTotalCount(0);
        return;
      }

      const dataArray = Array.isArray(json) ? json : [json];
      const initialTransformed = dataArray.map((item: any, index: number) => ({
        id: item.id || item.eventId || `row-${index}`,
        sn: paginationState.pageIndex * paginationState.pageSize + index + 1,
        vehicleName: filters.deviceName,
        notification:
          item.notification || item.eventType || item.alertType || "Event",
        location: "Loading...",
        message: item.message || item.description || item.details || "",
        dateTime: item.dateTime || item.timestamp || item.createdAt,
        coordinates:
          item.coordinates ||
          item.location ||
          (item.lat && item.lng ? `${item.lat},${item.lng}` : "") ||
          "21.991253888888888, 78.92976777777777",
      }));

      setData(initialTransformed);
      setTotalCount(response.total || initialTransformed.length);

      const transformedWithAddresses = await Promise.all(
        initialTransformed.map(async (item) => {
          if (item.coordinates && item.coordinates !== "Loading...") {
            const [lat, lon] = item.coordinates
              .split(",")
              .map((c: string) => parseFloat(c.trim()));
            if (!isNaN(lat) && !isNaN(lon)) {
              const address = await reverseGeocode(lat, lon).catch(
                () => item.coordinates
              );
              return { ...item, location: address };
            }
          }
          return { ...item, location: "Location not available" };
        })
      );
      setData(transformedWithAddresses);
    } catch (error: any) {
      console.error("Error fetching event report data:", error);
      setData([]);
      setTotalCount(0);
      alert(error.response?.data?.error || error.message || "Network error");
    } finally {
      setIsLoading(false);
    }
  };

  // Refetch when table state changes
  useEffect(() => {
    if (currentFilters && showTable) {
      fetchEventReportData(currentFilters, pagination, sorting);
    }
  }, [pagination, sorting, currentFilters, showTable]);

  // Filter submission (same pattern as StatusReport)
  const handleFilterSubmit = useCallback(
    async (filters: FilterValues) => {
      console.log("✅ Event filter submitted:", filters);
      console.log("📊 Current selections:", {
        school: selectedSchool,
        branch: selectedBranch,
        device: selectedDevice,
        deviceName,
        dateRange,
      });

      if (!selectedDevice || !dateRange.startDate || !dateRange.endDate) {
        alert("Please select a vehicle and both dates");
        return;
      }

      const updatedFilters = {
        ...filters,
        deviceId: selectedDevice,
        deviceName,
      };

      setPagination({ pageIndex: 0, pageSize: 10 });
      setSorting([]);
      setCurrentFilters(updatedFilters);
      setShowTable(true);

      await fetchEventReportData(updatedFilters, { pageIndex: 0, pageSize: 10 }, []);
    },
    [selectedSchool, selectedBranch, selectedDevice, deviceName, dateRange]
  );

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
    emptyMessage: "No event reports found",
    pageSizeOptions: [5, 10, 20, 30, 50],
    enableSorting: true,
    showSerialNumber: false,
  });

  return (
    <div className="p-6">
      <ResponseLoader isLoading={isLoading} />
      <header>
        <h1 className="text-2xl font-bold mb-4">Event Report</h1>
      </header>

      {/* ✅ Unified Report Filter (same structure as StatusReportPage) */}
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

      {showTable && <section className="mb-4">{tableElement}</section>}
    </div>
  );
};

export default EventReportPage;
