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
import { FaPlay } from "react-icons/fa";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDeviceData } from "@/hooks/useDeviceData";

interface TripReportData {
  id: string;
  sn: number;
  vehicleName: string;
  startTime: string;
  startAddress: string;
  startCoordinates: { lat: number; lng: number };
  distance: number;
  averageSpeed: number;
  maximumSpeed: number;
  endTime: string;
  endAddress: string;
  endCoordinates: { lat: number; lng: number };
}

const TripReportPage: React.FC = () => {
  // ===== Filter state =====
  const [selectedSchool, setSelectedSchool] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: null,
    endDate: null,
  });

  // ===== Table state =====
  const [data, setData] = useState<TripReportData[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState<any[]>([]);

  // ===== Infinite scroll for vehicles =====
  const [searchTerm, setSearchTerm] = useState("");
  const {
    data: vehicleData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: vehiclesLoading,
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

  // ===== Table columns =====
  const columns: ColumnDef<TripReportData>[] = [
    { accessorKey: "sn", header: "SN" },
    { accessorKey: "vehicleName", header: "Vehicle Name", size: 200 },
    { accessorKey: "startTime", header: "Start Time", size: 200 },
    {
      accessorKey: "startAddress",
      header: "Start Address",
      size: 300,
      cell: ({ row }) =>
        row.original.startAddress && row.original.startAddress !== "Loading..."
          ? row.original.startAddress
          : "-",
    },
    {
      accessorKey: "startCoordinates",
      header: "Start Coordinates",
      size: 180,
      cell: ({ row }) => {
        const coords = row.original.startCoordinates;
        if (!coords) return "-";
        return `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
      },
    },
    {
      accessorKey: "distance",
      header: "Distance (km)",
      size: 150,
      cell: ({ row }) => row.original.distance?.toFixed(2) ?? "0.00",
    },
    {
      accessorKey: "averageSpeed",
      header: "Average Speed (km/h)",
      size: 180,
      cell: ({ row }) => row.original.averageSpeed?.toFixed(2) ?? "0.00",
    },
    {
      accessorKey: "maximumSpeed",
      header: "Maximum Speed (km/h)",
      size: 180,
      cell: ({ row }) => row.original.maximumSpeed?.toFixed(2) ?? "0.00",
    },
    { accessorKey: "endTime", header: "End Time", size: 200 },
    {
      accessorKey: "endAddress",
      header: "End Address",
      size: 300,
      cell: ({ row }) =>
        row.original.endAddress && row.original.endAddress !== "Loading..."
          ? row.original.endAddress
          : "-",
    },
    {
      accessorKey: "endCoordinates",
      header: "End Coordinates",
      size: 180,
      cell: ({ row }) => {
        const coords = row.original.endCoordinates;
        if (!coords) return "-";
        return `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
      },
    },
    {
      id: "play",
      header: "Play",
      size: 100,
      cell: () => (
        <div className="flex justify-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <FaPlay className="text-green-600 text-xl cursor-pointer" />
              </TooltipTrigger>
              <TooltipContent className="bg-black/80 text-white font-bold rounded-md px-3 py-2 shadow-lg">
                <p>Click to see playback history</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      ),
    },
  ];

  // ===== API Fetch =====
  const fetchTripReportData = async (
    filters: FilterValues,
    paginationState: any,
    sortingState: any
  ) => {
    if (!filters) return;
    setIsLoading(true);

    try {
      const fromDate = new Date(filters.startDate).toISOString().split("T")[0];
      const toDate = new Date(filters.endDate).toISOString().split("T")[0];

      const queryParams = new URLSearchParams({
        deviceId: filters.deviceId,
        from: fromDate,
        to: toDate,
        page: (paginationState.pageIndex + 1).toString(),
        limit: paginationState.pageSize.toString(),
      });

      if (sortingState.length > 0) {
        const sort = sortingState[0];
        queryParams.append("sortBy", sort.id);
        queryParams.append("sortOrder", sort.desc ? "desc" : "asc");
      }

      const [deviceRes, tripRes] = await Promise.all([
        api.get("/device"),
        api.get(`/report/trip-report?${queryParams.toString()}`),
      ]);

      const deviceList = deviceRes.data || [];
      const deviceMap: Record<string, string> = {};
      deviceList.forEach((d: any) => (deviceMap[d.deviceId] = d.name));

      const json = tripRes.data;
      if (!json || (Array.isArray(json) && json.length === 0)) {
        setData([]);
        setTotalCount(0);
        return;
      }

      const dataArray = Array.isArray(json) ? json : [json];

      const initialTransformed: TripReportData[] = dataArray.map((item: any, index: number) => ({
        id: item._id || `row-${index}`,
        sn: paginationState.pageIndex * paginationState.pageSize + index + 1,
        vehicleName: deviceMap[item.deviceId] || filters.deviceName || item.deviceId,
        startTime: new Date(item.startTime).toLocaleString(),
        startAddress: "Loading...",
        startCoordinates: { lat: item.startLatitude, lng: item.startLongitude },
        distance: item.distance || 0,
        averageSpeed: item.averageSpeed || 0,
        maximumSpeed: item.maximumSpeed || 0,
        endTime: new Date(item.endTime).toLocaleString(),
        endAddress: "Loading...",
        endCoordinates: { lat: item.endLatitude, lng: item.endLongitude },
      }));

      setData(initialTransformed);
      setTotalCount(tripRes.total || initialTransformed.length);

      // Reverse Geocode
      const transformedWithAddresses = await Promise.all(
        initialTransformed.map(async (item) => {
          try {
            const [startAddress, endAddress] = await Promise.all([
              reverseGeocode(item.startCoordinates.lat, item.startCoordinates.lng),
              reverseGeocode(item.endCoordinates.lat, item.endCoordinates.lng),
            ]);
            return {
              ...item,
              startAddress: startAddress || "Address not found",
              endAddress: endAddress || "Address not found",
            };
          } catch {
            return {
              ...item,
              startAddress: "Address not found",
              endAddress: "Address not found",
            };
          }
        })
      );

      setData(transformedWithAddresses);
    } catch (error: any) {
      console.error("Error fetching trip report data:", error);
      alert(error.response?.data?.error || error.message || "Network error");
      setData([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  // ===== Handle Filter Submit =====
  const handleFilterSubmit = useCallback(
    async (filters: FilterValues) => {
      console.log("✅ Filter submitted:", filters);
      if (!selectedDevice || !dateRange.startDate || !dateRange.endDate) {
        alert("Please select a vehicle and both dates");
        return;
      }

      setPagination({ pageIndex: 0, pageSize: 10 });
      setSorting([]);
      setShowTable(true);

      await fetchTripReportData(filters, { pageIndex: 0, pageSize: 10 }, []);
    },
    [selectedSchool, selectedBranch, selectedDevice, deviceName, dateRange]
  );

  // ===== Refetch on Pagination / Sorting Change =====
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
      fetchTripReportData(filters, pagination, sorting);
    }
  }, [pagination, sorting, showTable, selectedDevice, dateRange]);

  // ===== Table =====
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
    emptyMessage: "No trip reports found",
    pageSizeOptions: [5, 10, 20, 30, 50],
    enableSorting: true,
    showSerialNumber: false,
  });

  return (
    <div className="p-6">
      <ResponseLoader isLoading={isLoading} />
      <header>
        <h1 className="text-2xl font-bold mb-4">Trip Report</h1>
      </header>

      {/* ✅ ReportFilter integrated same as StatusReport */}
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

export default TripReportPage;
