"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import ReportFilter from "@/components/report-filters/Report-Filter";
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
  const [data, setData] = useState<EventReportData[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState<any[]>([]);
  const [currentFilters, setCurrentFilters] = useState<any>(null);

  // Vehicle dropdown states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [selectedVehicleName, setSelectedVehicleName] = useState("");

  // Hook for infinite scroll + search
  const {
    data: vehicleData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useDeviceData({ searchTerm });

  // Flatten vehicles
  const allVehicles = useMemo(() => {
    if (!vehicleData?.pages) return [];
    return vehicleData.pages.flat();
  }, [vehicleData]);

  // Format for dropdown
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

  const handleVehicleChange = useCallback(
    (value: string) => {
      setSelectedVehicle(value);
      const selected = vehicleMetaData.find((v) => v.value === value);
      setSelectedVehicleName(selected?.label || "");
    },
    [vehicleMetaData]
  );

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
        <div
          className="text-sm max-w-xs truncate"
          title={row.original.message}
        >
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

      const response = await api.get(
        `report/event?${queryParams.toString()}`
      );
      const json = response.data;

      if (!json || (Array.isArray(json) && json.length === 0)) {
        setData([]);
        setTotalCount(0);
        return;
      }

      const dataArray = Array.isArray(json) ? json : [json];
      const initialTransformed = dataArray.map((item: any, index: number) => ({
        id: item.id || item.eventId || `row-${index}`,
        sn:
          paginationState.pageIndex * paginationState.pageSize + index + 1,
        vehicleName: filters.deviceName,
        notification:
          item.notification || item.eventType || item.alertType || "Event",
        location: "Loading...",
        message:
          item.message || item.description || item.details || "",
        dateTime: item.dateTime || item.timestamp || item.createdAt,
        coordinates:
          item.coordinates ||
          item.location ||
          (item.lat && item.lng ? `${item.lat},${item.lng}` : "") ||
          "21.991253888888888, 78.92976777777777",
      }));

      setData(initialTransformed);
      setTotalCount(response.total || initialTransformed.length);

      // ✅ Reverse geocoding (same pattern as StatusReportPage)
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

  useEffect(() => {
    if (currentFilters && showTable) {
      fetchEventReportData(currentFilters, pagination, sorting);
    }
  }, [pagination, sorting, currentFilters, showTable]);

  const handleFilterSubmit = async (filters: any) => {
    if (!selectedVehicle || !filters.startDate || !filters.endDate) {
      alert("Please select a vehicle and both dates");
      return;
    }

    const updatedFilters = {
      ...filters,
      deviceId: selectedVehicle,
      deviceName: selectedVehicleName,
    };

    setPagination({ pageIndex: 0, pageSize: 10 });
    setSorting([]);
    setCurrentFilters(updatedFilters);
    setShowTable(true);
    await fetchEventReportData(updatedFilters, { pageIndex: 0, pageSize: 10 }, []);
  };

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
    <div>
      <ResponseLoader isLoading={isLoading} />

      <ReportFilter
        onFilterSubmit={handleFilterSubmit}
        columns={table.getAllColumns()}
        showColumnVisibility
        className="mb-6"
        vehicleMetaData={vehicleMetaData}
        selectedVehicle={selectedVehicle}
        onVehicleChange={handleVehicleChange}
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
