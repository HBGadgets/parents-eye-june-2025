"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import ReportFilter from "@/components/report-filters/Report-Filter";
import {
  getCoreRowModel,
  useReactTable,
  VisibilityState,
  type ColumnDef,
} from "@tanstack/react-table";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";
import { api } from "@/services/apiService";
import ResponseLoader from "@/components/ResponseLoader";
import { useDeviceData } from "@/hooks/useDeviceData";

// Define Geofence Report Data type
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
  const [data, setData] = useState<GeofenceReportData[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState<any[]>([]);
  const [currentFilters, setCurrentFilters] = useState<any>(null);

  // vehicle selection state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [selectedVehicleName, setSelectedVehicleName] = useState("");

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

  const handleVehicleChange = useCallback(
    (value: string) => {
      setSelectedVehicle(value.toString());
      const selected = vehicleMetaData.find((v) => v.value === value);
      setSelectedVehicleName(selected?.label || "");
    },
    [vehicleMetaData]
  );

  // Table columns for Geofence Report
  const columns: ColumnDef<GeofenceReportData>[] = [
    { accessorKey: "sn", header: "SN" },
    { accessorKey: "name", header: "Name" },
    { accessorKey: "type", header: "Type" },
    { accessorKey: "message", header: "Message" },
    { accessorKey: "location", header: "Location" },
    { accessorKey: "createdAt", header: "Created At" },
  ];

  const fetchGeofenceReportData = async (filters: any, paginationState: any, sortingState: any) => {
    if (!filters) return;
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();

      if (filters.deviceId) queryParams.append("deviceId", filters.deviceId.toString());
      if (filters.schoolId) queryParams.append("schoolId", filters.schoolId);
      if (filters.branchId) queryParams.append("branchId", filters.branchId);

      if (filters.startDate) {
        queryParams.append("startDate", filters.startDate.toISOString());
      }
      if (filters.endDate) {
        queryParams.append("endDate", filters.endDate.toISOString());
      }

      // Add pagination parameters
      queryParams.append("page", (paginationState.pageIndex + 1).toString());
      queryParams.append("limit", paginationState.pageSize.toString());

      // Add sorting if available
      if (sortingState?.length) {
        const sort = sortingState[0];
        queryParams.append("sortBy", sort.id);
        queryParams.append("sortOrder", sort.desc ? "desc" : "asc");
      }

      console.log("Geofence API URL:", `/api/geofence-reports?${queryParams}`);

      const response = await fetch(`/api/geofence-reports?${queryParams}`);
      const json = await response.json();

      // Transform the data
      const transformed: GeofenceReportData[] = json.data.map(
        (item: any, index: number) => ({
          id: item._id || `row-${index}`,
          sn: paginationState.pageIndex * paginationState.pageSize + index + 1,
          name: item.name,
          type: item.type,
          message: item.message,
          location: item.location,
          createdAt: new Date(item.createdAt).toLocaleString(),
        })
      );

      setData(transformed);
      setTotalCount(json.totalCount || json.data.length);
      setShowTable(true);
    } catch (error) {
      console.error("Error fetching geofence report data:", error);
      setData([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentFilters && showTable) {
      fetchGeofenceReportData(currentFilters, pagination, sorting);
    }
  }, [pagination, sorting]);

  const handleFilterSubmit = async (filters: any) => {
    const updatedFilters = {
      ...filters,
      deviceId: selectedVehicle,
    };

    setPagination({ pageIndex: 0, pageSize: 10 });
    setSorting([]);
    setCurrentFilters(updatedFilters);
    setShowTable(true);

    await fetchGeofenceReportData(updatedFilters, { pageIndex: 0, pageSize: 10 }, []);
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
    emptyMessage: "No geofence reports found",
    pageSizeOptions: [10, 20, 50],
    enableSorting: true,
    showSerialNumber: false,
  });

  return (
    <div>
      <ResponseLoader isLoading={isLoading} />      
      {/* Reuse ReportFilter with device data integration */}
      <ReportFilter
        onFilterSubmit={handleFilterSubmit}
        columns={table.getAllColumns()}
        showColumnVisibility={true}
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

      {/* Show table only after submit */}
      {showTable && <section className="mb-4">{tableElement}</section>}

      {/* Loading state */}
      {isLoading && !showTable && (
        <div className="flex justify-center items-center py-8">
          <div className="text-lg">Loading geofence report data...</div>
        </div>
      )}
    </div>
  );
};

export default GeofenceReportPage;