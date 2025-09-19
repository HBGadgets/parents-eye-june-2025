"use client";

import React, { useState, useEffect } from "react";
import ReportFilter from "@/components/report-filters/Report-Filter";
import { VisibilityState, type ColumnDef } from "@tanstack/react-table";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";
import { api } from "@/services/apiService";
import ResponseLoader from "@/components/ResponseLoader";
import { FaPowerOff } from "react-icons/fa";
import { reverseGeocode } from "@/util/reverse-geocode";

// Tooltip components
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

  // Pagination & sorting states
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState([]);

  // Store filters for API calls
  const [currentFilters, setCurrentFilters] = useState<any>(null);

  // Columns definition
  const columns: ColumnDef<StopReportData>[] = [
    { accessorKey: "sn", header: "SN" },
    { accessorKey: "deviceName", header: "Device Name", size: 200 },
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
                <TooltipContent
                  side="top"
                  className="bg-black/80 text-white font-bold rounded-md px-3 py-2 shadow-lg"
                >
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
      cell: ({ row }) => row.original.speed?.toFixed(2) ?? "0.00", // ✅ fixed to 2 digits
    },
    {
      accessorKey: "stopAddress",
      header: "Location",
      size: 300,
      cell: ({ row }) => {
        const stopAddress = row.original.stopAddress;
        return stopAddress && stopAddress !== "Loading..." ? stopAddress : "-";
      },
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

  // Calculate duration between two dates
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

  // Fetch data with filters, pagination, and sorting
  const fetchStopReportData = async (filters: any, paginationState: any, sortingState: any) => {
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

      const [deviceRes, stopRes] = await Promise.all([
        api.get("/device"),
        api.get(`/report/stop-report?${queryParams.toString()}`),
      ]);

      // Map deviceId to deviceName
      const deviceList = deviceRes.data || [];
      const deviceMap: Record<string, string> = {};
      deviceList.forEach((d: any) => {
        deviceMap[d.deviceId] = d.name;
      });

      const json = stopRes.data;

      if (!json || (Array.isArray(json) && json.length === 0)) {
        setData([]);
        setTotalCount(0);
        return;
      }

      const dataArray = Array.isArray(json) ? json : [json];

      // Transform data with serial number & deviceName mapping
      const initialTransformed: StopReportData[] = dataArray.map((item: any, index: number) => {
        const sn = paginationState.pageIndex * paginationState.pageSize + index + 1;
        return {
          id: item._id || `row-${index}`,
          sn,
          deviceName: deviceMap[item.deviceId] || filters.deviceName || item.deviceId,
          stopAddress: "Loading...",
          stopCoordinates: { lat: item.latitude, lng: item.longitude },
          arrivalTime: new Date(item.arrivalTime).toLocaleString(),
          departureTime: new Date(item.departureTime).toLocaleString(),
          duration: calculateDuration(item.arrivalTime, item.departureTime),
          ignition: item.ignition,
          speed: item.speed || 0,
        };
      });

      setData(initialTransformed);
      setTotalCount(stopRes.total || initialTransformed.length); // Better to get total from API if possible

      // Reverse geocode addresses asynchronously
      const transformedWithAddresses = await Promise.all(
        initialTransformed.map(async (item) => {
          try {
            const address = await reverseGeocode(item.stopCoordinates.lat, item.stopCoordinates.lng);
            return { ...item, stopAddress: address };
          } catch (error) {
            console.error("Error reverse geocoding:", error);
            return { ...item, stopAddress: "Address not found" };
          }
        })
      );

      setData(transformedWithAddresses);
    } catch (error: any) {
      console.error("Error fetching stop report data:", error);

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

  // Fetch data on pagination, sorting or filters change
  useEffect(() => {
    if (currentFilters && showTable) {
      fetchStopReportData(currentFilters, pagination, sorting);
    }
  }, [pagination, sorting, currentFilters, showTable]);

  // Handle filter submit
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

    await fetchStopReportData(filters, { pageIndex: 0, pageSize: 10 }, []);
  };

  // Table instance
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
    showSerialNumber: false, // using sn in data instead
  });

  return (
    <div>
      <ResponseLoader isLoading={isLoading} />

      <h1 className="text-xl font-bold mb-4">Stop Reports</h1>

      <ReportFilter
        onFilterSubmit={handleFilterSubmit}
        columns={table.getAllColumns()}
        showColumnVisibility={true}
        className="mb-6"
      />

      {showTable && <section className="mb-4">{tableElement}</section>}
    </div>
  );
};

export default StopReportPage;
