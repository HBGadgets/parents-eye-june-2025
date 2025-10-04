"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import ReportFilter from "@/components/report-filters/Report-Filter";
import { type ColumnDef, VisibilityState } from "@tanstack/react-table";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";
import { api } from "@/services/apiService";
import ResponseLoader from "@/components/ResponseLoader";
import { reverseGeocode } from "@/util/reverse-geocode";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FaPowerOff } from "react-icons/fa";
import { useDeviceData } from "@/hooks/useDeviceData";

interface StatusReportData {
  id: string;
  sn: number;
  deviceName: string;
  vehicleStatus: string;
  ignitionOff: string;
  ignitionOn: string;
  duration: string;
  startLocation: string;
  startCoordinates: string;
  endLocation: string;
  endCoordinates: string;
  distance: number;
  maxSpeed: number;
}

const StatusReportPage: React.FC = () => {
  const [data, setData] = useState<StatusReportData[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState<any[]>([]);
  const [currentFilters, setCurrentFilters] = useState<any>(null);
  
  // Infinite scroll states for vehicle selection
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [selectedVehicleName, setSelectedVehicleName] = useState("");

  const { 
    data: vehicleData, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage,
    isLoading: vehiclesLoading 
  } = useDeviceData({ searchTerm });

  // Flatten all pages of vehicle data
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

  // Handle infinite scroll for vehicle combobox
  const handleVehicleReachEnd = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Handle search functionality
  const handleSearchChange = useCallback((search: string) => {
    setSearchTerm(search);
  }, []);

  const handleVehicleChange = useCallback((value: string) => {
    setSelectedVehicle(value);
    // Find the selected vehicle name
    const selected = vehicleMetaData.find(vehicle => vehicle.value === value);
    setSelectedVehicleName(selected?.label || "");
  }, [vehicleMetaData]);

  const columns: ColumnDef<StatusReportData>[] = [
    { accessorKey: "sn", header: "SN" },
    { accessorKey: "deviceName", header: "Vehicle Name", size: 250 },
    {
      accessorKey: "vehicleStatus",
      header: "Vehicle Status",
      size: 200,
      cell: ({ row }) => {
        const status = row.original.vehicleStatus?.toLowerCase();
        let iconColor = "text-gray-500", tooltipText = "Unknown";
        if (status?.includes("ignition off")) {
          iconColor = "text-red-500"; tooltipText = "Ignition Off";
        } else if (status?.includes("ignition on")) {
          iconColor = "text-green-500"; tooltipText = "Ignition On";
        } else if (status?.includes("idle")) {
          iconColor = "text-yellow-500"; tooltipText = "Idle";
        }
        return (
          <div className="flex justify-center">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <FaPowerOff className={`text-lg cursor-pointer ${iconColor}`} />
                </TooltipTrigger>
                <TooltipContent className="bg-black/80 text-white font-bold rounded-md px-3 py-2 shadow-lg">
                  <p>{tooltipText}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        );
      },
    },
    {
      accessorKey: "ignitionOff", header: "Ignition Off", size: 280,
      cell: ({ row }) => row.original.ignitionOff ? new Date(row.original.ignitionOff).toLocaleString() : "-"
    },
    {
      accessorKey: "ignitionOn", header: "Ignition On", size: 280,
      cell: ({ row }) => row.original.ignitionOn ? new Date(row.original.ignitionOn).toLocaleString() : "-"
    },
    { accessorKey: "duration", header: "Duration", size: 180 },
    {
      accessorKey: "startLocation", header: "Start Address", size: 300,
      cell: ({ row }) => row.original.startLocation !== "Loading..." ? row.original.startLocation : "-"
    },
    {
      accessorKey: "startCoordinates", header: "Start Coordinates", size: 200,
      cell: ({ row }) => {
        const coords = row.original.startCoordinates.split(",");
        const lat = parseFloat(coords[0].trim()).toFixed(6);
        const lng = parseFloat(coords[1].trim()).toFixed(6);
        return `${lat}, ${lng}`;
      }
    },
    {
      accessorKey: "endLocation", header: "End Address", size: 300,
      cell: ({ row }) => row.original.endLocation !== "Loading..." ? row.original.endLocation : "-"
    },
    {
      accessorKey: "endCoordinates", header: "End Coordinates", size: 200,
      cell: ({ row }) => {
        const coords = row.original.endCoordinates.split(",");
        const lat = parseFloat(coords[0].trim()).toFixed(6);
        const lng = parseFloat(coords[1].trim()).toFixed(6);
        return `${lat}, ${lng}`;
      }
    },
    { header: "Total Distance (km)", accessorFn: row => row.distance?.toFixed(2) ?? "0.00", size: 150 },
    { header: "Maximum Speed (km/h)", accessorFn: row => row.maxSpeed?.toFixed(2) ?? "0.00", size: 150 },
  ];

  const fetchStatusReportData = async (filters: any, paginationState: any, sortingState: any) => {
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
      const response = await api.get(`report/status?${queryParams.toString()}`);
      const json = response.data;

      if (!json || (Array.isArray(json) && json.length === 0)) {
        setData([]);
        setTotalCount(0);
        return;
      }

      const dataArray = Array.isArray(json) ? json : [json];
      const initialTransformed = dataArray.map((item: any, index: number) => ({
        id: item.deviceId || `row-${index}`,
        sn: (paginationState.pageIndex * paginationState.pageSize) + index + 1,
        deviceName: filters.deviceName,
        vehicleStatus: item.vehicleStatus,
        ignitionOff: item.startDateTime,
        ignitionOn: item.endDateTime,
        duration: item.time,
        startLocation: "Loading...",
        startCoordinates: item.startLocation || "21.991253888888888, 78.92976777777777",
        endLocation: "Loading...",
        endCoordinates: item.endLocation || "21.991253888888888, 78.92976777777777",
        distance: item.distance,
        maxSpeed: item.maxSpeed,
      }));

      setData(initialTransformed);
      setTotalCount(response.total || initialTransformed.length);

      const transformedWithAddresses = await Promise.all(
        initialTransformed.map(async (item) => {
          const [lat1, lon1] = item.startCoordinates.split(",").map((c: string) => parseFloat(c.trim()));
          const [lat2, lon2] = item.endCoordinates.split(",").map((c: string) => parseFloat(c.trim()));
          const [startAddress, endAddress] = await Promise.all([
            reverseGeocode(lat1, lon1).catch(() => item.startCoordinates),
            reverseGeocode(lat2, lon2).catch(() => item.endCoordinates),
          ]);
          return { ...item, startLocation: startAddress, endLocation: endAddress };
        })
      );
      setData(transformedWithAddresses);
    } catch (error: any) {
      console.error("Error fetching status report data:", error);
      setData([]);
      setTotalCount(0);
      alert(error.response?.data?.error || error.message || "Network error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentFilters && showTable) fetchStatusReportData(currentFilters, pagination, sorting);
  }, [pagination, sorting, currentFilters, showTable]);

  const handleFilterSubmit = async (filters: any) => {
    // Use the selected vehicle from the combobox
    if (!selectedVehicle || !filters.startDate || !filters.endDate) {
      alert("Please select a vehicle and both dates");
      return;
    }
    
    const updatedFilters = {
      ...filters,
      deviceId: selectedVehicle,
      deviceName: selectedVehicleName
    };
    
    setPagination({ pageIndex: 0, pageSize: 10 });
    setSorting([]);
    setCurrentFilters(updatedFilters);
    setShowTable(true);
    await fetchStatusReportData(updatedFilters, { pageIndex: 0, pageSize: 10 }, []);
  };

  const { table, tableElement } = CustomTableServerSidePagination({
    data, columns, pagination, totalCount, loading: isLoading,
    onPaginationChange: setPagination, onSortingChange: setSorting, sorting,
    columnVisibility, onColumnVisibilityChange: setColumnVisibility,
    emptyMessage: "No status reports found", pageSizeOptions: [5, 10, 20, 30, 50],
    enableSorting: true, showSerialNumber: false,
  });

  return (
    <div>
      <ResponseLoader isLoading={isLoading} />

      <ReportFilter
        onFilterSubmit={handleFilterSubmit}
        columns={table.getAllColumns()}
        showColumnVisibility
        className="mb-6"
        // Pass the infinite scroll combobox props
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

export default StatusReportPage;