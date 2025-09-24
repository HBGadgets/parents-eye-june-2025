"use client";

import React, { useState, useEffect } from "react";
import ReportFilter from "@/components/report-filters/Report-Filter";
import { type ColumnDef, VisibilityState } from "@tanstack/react-table";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";
import { api } from "@/services/apiService";
import ResponseLoader from "@/components/ResponseLoader";
import { reverseGeocode } from "@/util/reverse-geocode";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FaPause } from "react-icons/fa";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  subDays,
  format,
} from "date-fns";

interface IdleReportData {
  id: string;
  sn: number;
  deviceName: string;
  vehicleStatus: string;
  startTime: string;
  duration: string;
  location: string;
  coordinates: string;
  endTime: string;
}

const IdleReportPage: React.FC = () => {
  const [data, setData] = useState<IdleReportData[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<any[]>([]);
  const [currentFilters, setCurrentFilters] = useState<any>(null);

  const columns: ColumnDef<IdleReportData>[] = [
    { accessorKey: "sn", header: "SN" },
    { accessorKey: "deviceName", header: "Vehicle Name", size: 250 },
    {
      accessorKey: "vehicleStatus",
      header: "Vehicle Status",
      size: 200,
      cell: ({ row }) => {
        const status = row.original.vehicleStatus?.toLowerCase();
        let iconColor = "text-yellow-500";
        let tooltipText = "Idle";

        if (status?.includes("engine idle")) {
          iconColor = "text-orange-500";
          tooltipText = "Engine Idle";
        } else if (status?.includes("stationary")) {
          iconColor = "text-yellow-600";
          tooltipText = "Stationary";
        }

        return (
          <div className="flex justify-center">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <FaPause
                    className={`text-lg cursor-pointer ${iconColor}`}
                  />
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
      accessorKey: "startTime",
      header: "Start Time ↑",
      size: 280,
      cell: ({ row }) =>
        row.original.startTime
          ? new Date(row.original.startTime).toLocaleString()
          : "-",
    },
    { accessorKey: "duration", header: "Duration", size: 180 },
    {
      accessorKey: "location",
      header: "Location",
      size: 350,
      cell: ({ row }) =>
        row.original.location !== "Loading..."
          ? row.original.location
          : "-",
    },
    {
      accessorKey: "coordinates",
      header: "Co-ordinates",
      size: 200,
      cell: ({ row }) => {
        const coords = row.original.coordinates.split(",");
        const lat = parseFloat(coords[0].trim()).toFixed(6);
        const lng = parseFloat(coords[1].trim()).toFixed(6);
        return `${lat}, ${lng}`;
      },
    },
    {
      accessorKey: "endTime",
      header: "End Time",
      size: 280,
      cell: ({ row }) =>
        row.original.endTime
          ? new Date(row.original.endTime).toLocaleString()
          : "-",
    },
  ];

  const formatDate = (date: Date) => format(date, "yyyy-MM-dd");

  const resolvePeriodRange = (period: string) => {
    const now = new Date();

    switch (period) {
      case "Today":
        return {
          from: formatDate(now),
          to: formatDate(now),
        };
      case "This Week":
        return {
          from: formatDate(startOfWeek(now)),
          to: formatDate(endOfWeek(now)),
        };
      case "Last 7 Days":
        return {
          from: formatDate(subDays(now, 7)),
          to: formatDate(now),
        };
      case "This Month":
        return {
          from: formatDate(startOfMonth(now)),
          to: formatDate(endOfMonth(now)),
        };
      default:
        return null;
    }
  };

  const fetchIdleReportData = async (
    filters: any,
    paginationState: any,
    sortingState: any
  ) => {
    if (!filters) return;
    setIsLoading(true);
    try {
      // Build query parameters one by one to avoid formatting issues
      const queryParams = new URLSearchParams();
      
      // Add deviceIds (make sure it's a string)
      if (filters.deviceId) {
        queryParams.append("deviceIds", filters.deviceId.toString());
      }
      
      // Add pagination parameters
      queryParams.append("page", (paginationState.pageIndex + 1).toString());
      queryParams.append("limit", paginationState.pageSize.toString());
      queryParams.append("period", filters.period || "Custom");

      // Handle date ranges
      let from = "";
      let to = "";

      if (filters.period === "Custom") {
        if (filters.startDate && filters.endDate) {
          from = formatDate(new Date(filters.startDate));
          to = formatDate(new Date(filters.endDate));
        }
      } else {
        const range = resolvePeriodRange(filters.period || "Today");
        if (range) {
          from = range.from;
          to = range.to;
        }
      }

      // Validate dates
      if (!from || !to) {
        alert("Please select a valid period (from & to are required).");
        setIsLoading(false);
        return;
      }

      
      queryParams.append("from", from);
      queryParams.append("to", to);

      // Add sorting if available
      if (sortingState?.length) {
        const sort = sortingState[0];
        queryParams.append("sortBy", sort.id);
        queryParams.append("sortOrder", sort.desc ? "desc" : "asc");
      }

      const finalUrl = `/report/idle-report?${queryParams.toString()}`;
      console.log("Final API URL:", finalUrl);
      console.log("Query Parameters:", Object.fromEntries(queryParams.entries()));

      const response = await api.get(finalUrl);
      const json = response.data;

      console.log("API Response:", json);

      // Check if response is successful
      if (json.success === false) {
        throw new Error(json.message || "API request failed");
      }

      if (!json || (Array.isArray(json) && json.length === 0)) {
        setData([]);
        setTotalCount(0);
        return;
      }

      // Handle different response structures
      let responseData = json;
      let total = 0;

      // If response has data property (common in paginated APIs)
      if (json.data && Array.isArray(json.data)) {
        responseData = json.data;
        total = json.total || json.totalCount || json.data.length;
      } else if (Array.isArray(json)) {
        responseData = json;
        total = json.length;
      } else {
        responseData = [json];
        total = 1;
      }

      const dataArray = Array.isArray(responseData) ? responseData : [responseData];
      
      console.log("👉 Processed data:", dataArray);

      const initialTransformed = dataArray.map(
        (item: any, index: number) => ({
          id: item.deviceId || item.id || `row-${index}`,
          sn: paginationState.pageIndex * paginationState.pageSize + index + 1,
          deviceName: item.deviceName || filters.deviceName || "Unknown Device",
          vehicleStatus: item.vehicleStatus || item.status || "Idle",
          startTime: item.startDateTime || item.startTime || item.createdAt,
          duration: item.duration || item.time || "N/A",
          location: "Loading...",
          coordinates: item.location || item.coordinates || item.latLng || "21.991253888888888, 78.92976777777777",
          endTime: item.endDateTime || item.endTime || item.updatedAt,
        })
      );

      setData(initialTransformed);
      setTotalCount(total);

      // Resolve addresses in background
      const transformedWithAddresses = await Promise.all(
        initialTransformed.map(async (item) => {
          try {
            const [lat, lon] = item.coordinates
              .split(",")
              .map((c: string) => parseFloat(c.trim()));
            
            if (isNaN(lat) || isNaN(lon)) {
              return { ...item, location: "Invalid coordinates" };
            }

            const address = await reverseGeocode(lat, lon);
            return { ...item, location: address };
          } catch (error) {
            console.error("Reverse geocoding error:", error);
            return { ...item, location: "Address not found" };
          }
        })
      );
      
      setData(transformedWithAddresses);
    } catch (error: any) {
      console.error(" Error fetching idle report data:", error);
      setData([]);
      setTotalCount(0);
      
      // Detailed error handling
      if (error.response) {
        console.error("Error response data:", error.response.data);
        console.error("Error response status:", error.response.status);
        alert(`Error ${error.response.status}: ${error.response.data?.message || error.response.data?.error || "Request failed"}`);
      } else if (error.request) {
        console.error("No response received:", error.request);
        alert("Network error: Could not connect to server. Please check your connection.");
      } else {
        console.error("Error message:", error.message);
        alert(`Error: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentFilters && showTable) {
      fetchIdleReportData(currentFilters, pagination, sorting);
    }
  }, [pagination, sorting, currentFilters, showTable]);

  const handleFilterSubmit = async (filters: any) => {
    
    if (!filters.deviceId) {
      alert("Please select a device");
      return;
    }
    
 
    if (filters.deviceId.toString().trim() === "") {
      alert("Please select a valid device");
      return;
    }

    
    if (filters.period === "Custom" && (!filters.startDate || !filters.endDate)) {
      alert("Please select both start and end dates for custom period");
      return;
    }

    
    if (filters.period === "Custom") {
      const startDate = new Date(filters.startDate);
      const endDate = new Date(filters.endDate);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        alert("Please select valid dates");
        return;
      }
    }

    setPagination({ pageIndex: 0, pageSize: 10 });
    setSorting([]);
    setCurrentFilters(filters);
    setShowTable(true);
    
    // Use setTimeout to ensure state updates before API call
    setTimeout(() => {
      fetchIdleReportData(filters, { pageIndex: 0, pageSize: 10 }, []);
    }, 0);
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
    emptyMessage: "No idle reports found",
    pageSizeOptions: [5, 10, 20, 30, 50],
    enableSorting: true,
    showSerialNumber: false,
  });

  return (
    <div>
      <ResponseLoader isLoading={isLoading} />
      <h1 className="text-xl font-bold mb-4">Idle Reports</h1>
      <ReportFilter
        onFilterSubmit={handleFilterSubmit}
        columns={table.getAllColumns()}
        showColumnVisibility
        className="mb-6"
      />
      {showTable && <section className="mb-4">{tableElement}</section>}
    </div>
  );
};

export default IdleReportPage;