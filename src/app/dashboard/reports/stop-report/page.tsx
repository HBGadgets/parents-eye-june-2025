"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import ReportFilter from "@/components/report-filters/Report-Filter";
import { VisibilityState, type ColumnDef } from "@tanstack/react-table";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";
import { api } from "@/services/apiService";
import ResponseLoader from "@/components/ResponseLoader";
import { FaPowerOff } from "react-icons/fa";
import { reverseGeocode } from "@/util/reverse-geocode";
import { useDeviceData } from "@/hooks/useDeviceData";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StopReportData {
  id: string;
  sn: number;
  deviceName: string;
  stopAddress: string;
  stopCoordinates: { lat: number; lng: number };
  duration: string;
  arrivalTime: string;
  departureTime: string;
  ignition: boolean;
  speed: number;
}

const StopReportPage: React.FC = () => {
  const [data, setData] = useState<StopReportData[]>([]);
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
    isLoading: vehiclesLoading,
  } = useDeviceData({ searchTerm });

  // Flatten all pages of vehicles
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

  // Infinite scroll trigger
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

  const columns: ColumnDef<StopReportData>[] = [
    { accessorKey: "sn", header: "SN" },
    { accessorKey: "deviceName", header: "Vehicle Name", size: 200 },
    {
      accessorKey: "ignition",
      header: "Ignition",
      size: 120,
      cell: ({ row }) => {
        const ignition = row.original.ignition;
        const iconColor = ignition ? "text-green-500" : "text-red-500";
        const tooltipText = ignition ? "Ignition On" : "Ignition Off";

        return (
          <div className="flex justify-center">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <FaPowerOff className={`text-xl cursor-pointer ${iconColor}`} />
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
    { accessorKey: "arrivalTime", header: "Start Time", size: 200 },
    { accessorKey: "departureTime", header: "End Time", size: 200 },
    { accessorKey: "duration", header: "Duration", size: 180 },
    {
      accessorKey: "speed",
      header: "Speed (km/h)",
      size: 150,
      cell: ({ row }) => row.original.speed?.toFixed(2) ?? "0.00",
    },
    {
      accessorKey: "stopAddress",
      header: "Location",
      size: 300,
      cell: ({ row }) =>
        row.original.stopAddress && row.original.stopAddress !== "Loading..."
          ? row.original.stopAddress
          : "-",
    },
    {
      accessorKey: "stopCoordinates",
      header: "Coordinates",
      size: 180,
      cell: ({ row }) => {
        const coords = row.original.stopCoordinates;
        if (!coords) return "-";
        return `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
      },
    },
  ];

  const calculateDuration = (start: string, end: string): string => {
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const diff = endTime - startTime;
    if (diff <= 0) return "0s";

    const seconds = Math.floor(diff / 1000);
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    return `${h}H ${m}M ${s}S`;
  };

  const fetchStopReportData = async (
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

      const response = await api.get(`/report/stop-report?${queryParams}`);
      const json = response.data;

      if (!json || (Array.isArray(json) && json.length === 0)) {
        setData([]);
        setTotalCount(0);
        return;
      }

      const dataArray = Array.isArray(json) ? json : [json];

      const initialTransformed: StopReportData[] = dataArray.map(
        (item: any, index: number) => {
          const sn =
            paginationState.pageIndex * paginationState.pageSize + index + 1;
          return {
            id: item._id || `row-${index}`,
            sn,
            deviceName: filters.deviceName,
            stopAddress: "Loading...",
            stopCoordinates: { lat: item.latitude, lng: item.longitude },
            arrivalTime: new Date(item.arrivalTime).toLocaleString(),
            departureTime: new Date(item.departureTime).toLocaleString(),
            duration: calculateDuration(item.arrivalTime, item.departureTime),
            ignition: item.ignition,
            speed: item.speed || 0,
          };
        }
      );

      setData(initialTransformed);
      setTotalCount(response.total || initialTransformed.length);

      const transformedWithAddresses = await Promise.all(
        initialTransformed.map(async (item) => {
          try {
            const address = await reverseGeocode(
              item.stopCoordinates.lat,
              item.stopCoordinates.lng
            );
            return { ...item, stopAddress: address };
          } catch (err) {
            return { ...item, stopAddress: "Address not found" };
          }
        })
      );

      setData(transformedWithAddresses);
    } catch (error: any) {
      console.error("Error fetching stop report data:", error);
      alert(error.response?.data?.error || error.message || "Network error");
      setData([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentFilters && showTable) {
      fetchStopReportData(currentFilters, pagination, sorting);
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

    await fetchStopReportData(updatedFilters, { pageIndex: 0, pageSize: 10 }, []);
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
    emptyMessage: "No stop reports found",
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

export default StopReportPage;
