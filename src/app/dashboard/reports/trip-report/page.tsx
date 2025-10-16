"use client";

import React, { useState, useEffect } from "react";
import ReportFilter from "@/components/report-filters/Report-Filter";
import { VisibilityState, type ColumnDef } from "@tanstack/react-table";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";
import { api } from "@/services/apiService";
import ResponseLoader from "@/components/ResponseLoader";
import { reverseGeocode } from "@/util/reverse-geocode";
import { FaPlay } from "react-icons/fa";

// ✅ Tooltip imports
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  const [data, setData] = useState<TripReportData[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showTable, setShowTable] = useState(false);

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState([]);
  const [currentFilters, setCurrentFilters] = useState<any>(null);

  const columns: ColumnDef<TripReportData>[] = [
    { accessorKey: "sn", header: "SN" },
    { accessorKey: "vehicleName", header: "Vehicle Name", size: 200 },
    { accessorKey: "startTime", header: "Start Time", size: 200 },
    {
      accessorKey: "startAddress",
      header: "Start Address",
      size: 300,
      cell: ({ row }) => {
        const startAddress = row.original.startAddress;
        return startAddress && startAddress !== "Loading..." ? startAddress : "-";
      },
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
      cell: ({ row }) => {
        const endAddress = row.original.endAddress;
        return endAddress && endAddress !== "Loading..." ? endAddress : "-";
      },
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

    // ✅ Updated "Play" column with tooltip
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
              <TooltipContent
                side="top"
                className="bg-black/80 text-white font-bold rounded-md px-3 py-2 shadow-lg"
              >
                <p>Click to see playback history</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      ),
    },
  ];

  const fetchTripReportData = async (filters: any, paginationState: any, sortingState: any) => {
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
      deviceList.forEach((d: any) => {
        deviceMap[d.deviceId] = d.name;
      });

      const json = tripRes.data;

      if (!json || (Array.isArray(json) && json.length === 0)) {
        setData([]);
        setTotalCount(0);
        return;
      }

      const dataArray = Array.isArray(json) ? json : [json];

      const initialTransformed: TripReportData[] = dataArray.map((item: any, index: number) => {
        const sn = paginationState.pageIndex * paginationState.pageSize + index + 1;
        return {
          id: item._id || `row-${index}`,
          sn,
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
        };
      });

      setData(initialTransformed);
      setTotalCount(tripRes.total || initialTransformed.length);

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
          } catch (error) {
            console.error("Error reverse geocoding:", error);
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

      if (error.response) {
        alert(
          `Error ${error.response.status}: ${
            error.response.data?.error || error.response.data?.message
          }`
        );
      } else if (error.request) {
        alert("Network error. Please check your connection and try again.");
      } else {
        alert(`Error: ${error.message}`);
      }

      setData([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentFilters && showTable) {
      fetchTripReportData(currentFilters, pagination, sorting);
    }
  }, [pagination, sorting, currentFilters, showTable]);

  const handleFilterSubmit = async (filters: any) => {
    if (!filters.deviceId) {
      alert("Please select a device before generating the report");
      return;
    }
    if (!filters.startDate || !filters.endDate) {
      alert("Please select both start and end dates");
      return;
    }

    setPagination({ pageIndex: 0, pageSize: 10 });
    setSorting([]);
    setCurrentFilters(filters);
    setShowTable(true);

    await fetchTripReportData(filters, { pageIndex: 0, pageSize: 10 }, []);
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
    emptyMessage: "No trip reports found",
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
        showColumnVisibility={true}
        className="mb-6"
        // Add these props to disable infinite scrolling
        vehicleMetaData={[]}
        selectedVehicle=""
        onVehicleChange={() => {}}
        searchTerm=""
        onSearchChange={() => {}}
      />

      {showTable && <section className="mb-4">{tableElement}</section>}
    </div>
  );
};

export default TripReportPage;