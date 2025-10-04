"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import ReportFilter from "@/components/report-filters/Report-Filter";
import { type ColumnDef, VisibilityState } from "@tanstack/react-table";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";
import { api } from "@/services/apiService";
import ResponseLoader from "@/components/ResponseLoader";
import { reverseGeocode } from "@/util/reverse-geocode";
import { useDeviceData } from "@/hooks/useDeviceData";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
// ✅ FIX: Changed import to FaPowerOff, as requested
import { FaPowerOff } from "react-icons/fa"; 
import { format } from "date-fns";

interface IdleReportData {
  id: string;
  sn: number;
  deviceName: string;
  vehicleStatus: string;
  idleStartTime: string;
  idleEndTime: string;
  duration: string;
  location: string;
  coordinates: string;
}

const IdleReportPage: React.FC = () => {
  const [data, setData] = useState<IdleReportData[]>([]);
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

  const columns: ColumnDef<IdleReportData>[] = [
    { accessorKey: "sn", header: "SN" },
    { accessorKey: "deviceName", header: "Vehicle Name", size: 250 },
    {
      accessorKey: "vehicleStatus",
      header: "Vehicle Status",
      size: 200,
      cell: ({ row }) => {
        // ✅ FIX: Use FaPowerOff with yellow color and "Idle" text
        const iconColor = "text-yellow-500";
        const tooltipText = "Idle";
        const IconComponent = FaPowerOff; // Use the imported FaPowerOff icon

        return (
          <div className="flex justify-center">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <IconComponent className={`text-lg cursor-pointer ${iconColor}`} />
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
      accessorKey: "idleStartTime",
      header: "Start Time ↑",
      size: 280,
      cell: ({ row }) =>
        row.original.idleStartTime
          ? new Date(row.original.idleStartTime).toLocaleString()
          : "-",
    },
    {
      accessorKey: "duration",
      header: "Duration",
      size: 180,
      cell: ({ row }) => (row.original.duration ? row.original.duration : "-"),
    },
    {
      accessorKey: "location",
      header: "Location",
      size: 350,
      cell: ({ row }) =>
        row.original.location !== "Loading..." ? row.original.location : "-",
    },
    {
      accessorKey: "coordinates",
      header: "Coordinates",
      size: 200,
      cell: ({ row }) => {
        const coords = row.original.coordinates.split(",");
        const lat = parseFloat(coords[0].trim()).toFixed(6);
        const lng = parseFloat(coords[1].trim()).toFixed(6);
        return `${lat}, ${lng}`;
      },
    },
    {
      accessorKey: "idleEndTime",
      header: "End Time",
      size: 280,
      cell: ({ row }) =>
        row.original.idleEndTime
          ? new Date(row.original.idleEndTime).toLocaleString()
          : "-",
    },
  ];

  const formatDate = (date: Date) => format(date, "yyyy-MM-dd");

  const fetchIdleReportData = async (filters: any, paginationState: any, sortingState: any) => {
    if (!filters) return;
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();

      queryParams.append("period", "Custom");

      if (filters.deviceId) queryParams.append("deviceIds", filters.deviceId.toString());

      if (!filters.startDate || !filters.endDate) {
        alert("Please select both start and end dates");
        setIsLoading(false);
        return;
      }

      const from = formatDate(new Date(filters.startDate));
      const to = formatDate(new Date(filters.endDate));
      queryParams.append("from", from);
      queryParams.append("to", to);

      if (sortingState?.length) {
        const sort = sortingState[0];
        queryParams.append("sortBy", sort.id);
        queryParams.append("sortOrder", sort.desc ? "desc" : "asc");
      }

      console.log("API URL:", `/report/idle-report?${queryParams}`);

      const response = await api.get(`/report/idle-report?${queryParams}`);
      
      console.log("Full API Response:", response);
      console.log("Response.data:", response.data);
      
      // Handle the nested data structure correctly
      let json = response.data;
      
      // If response.data has a 'data' property, use that
      if (json && json.data) {
        console.log("Using json.data");
      } else {
        console.log("Using json directly");
        json = { data: response.data, success: true };
      }
      
      console.log("Processed JSON:", json);
      console.log("JSON.data:", json.data);

      if (json.success === false) throw new Error(json.message || "API request failed");

      // Flatten the nested structure
      let flatIdleEvents: any[] = [];
      
      if (json.data && Array.isArray(json.data)) {
        console.log("Processing devices, count:", json.data.length);
        
        json.data.forEach((device: any, deviceIndex: number) => {
          console.log(`Device ${deviceIndex}:`, device);
          console.log(`Device ${deviceIndex} idleArray:`, device.idleArray);
          
          if (device.idleArray && Array.isArray(device.idleArray)) {
            console.log(`Device ${deviceIndex} idleArray length:`, device.idleArray.length);
            
            device.idleArray.forEach((idleEvent: any, eventIndex: number) => {
              // Skip null/undefined entries
              if (!idleEvent) {
                console.log(`Skipping null/undefined event at index ${eventIndex}`);
                return;
              }
              
              console.log(`Adding idle event ${eventIndex}:`, idleEvent);
              flatIdleEvents.push({
                ...idleEvent,
                deviceId: device.deviceId,
              });
            });
          } else {
            console.log(`Device ${deviceIndex} has no valid idleArray`);
          }
        });
      } else {
        console.log("json.data is not an array or is missing");
      }

      console.log("Flattened idle events count:", flatIdleEvents.length);
      console.log("Flattened idle events:", flatIdleEvents);

      if (flatIdleEvents.length === 0) {
        console.warn("No idle events found after flattening");
        setData([]);
        setTotalCount(0);
        setIsLoading(false);
        return;
      }

      // Apply client-side pagination
      const startIndex = paginationState.pageIndex * paginationState.pageSize;
      const endIndex = startIndex + paginationState.pageSize;
      const paginatedEvents = flatIdleEvents.slice(startIndex, endIndex);

      console.log("Pagination - startIndex:", startIndex, "endIndex:", endIndex);
      console.log("Paginated events:", paginatedEvents);
      console.log("Paginated events length:", paginatedEvents.length);

      const initialTransformed = paginatedEvents.map((item: any, index: number) => {
        console.log(`Transforming item ${index}:`, item);
        return {
          id: `${item.deviceId}-${item.idleStartTime}-${index}`,
          sn: startIndex + index + 1,
          deviceName: filters.deviceName || "Unknown Device",
          vehicleStatus: "Idle",
          idleStartTime: item.idleStartTime,
          idleEndTime: item.idleEndTime,
          duration: item.duration || "N/A",
          location: "Loading...",
          coordinates: `${item.latitude}, ${item.longitude}`,
        };
      });

      console.log("Initial transformed data:", initialTransformed);
      console.log("Initial transformed data length:", initialTransformed.length);

      setData(initialTransformed);
      setTotalCount(flatIdleEvents.length);
      
      console.log("Data set in state, totalCount:", flatIdleEvents.length);

      // Fetch addresses asynchronously
      const transformedWithAddresses = await Promise.all(
        initialTransformed.map(async (item) => {
          try {
            const [lat, lon] = item.coordinates.split(",").map((c: string) => parseFloat(c.trim()));
            if (isNaN(lat) || isNaN(lon)) return { ...item, location: "Invalid coordinates" };
            const address = await reverseGeocode(lat, lon);
            return { ...item, location: address };
          } catch (error) {
            console.error("Reverse geocode error:", error);
            return { ...item, location: "Address not found" };
          }
        })
      );
      
      console.log("Data with addresses:", transformedWithAddresses);
      setData(transformedWithAddresses);
    } catch (error: any) {
      console.error("Error fetching idle report data:", error);
      console.error("Error details:", error?.response?.data);
      alert(error?.response?.data?.message || error.message || "Unknown error");
      setData([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentFilters && showTable) {
      fetchIdleReportData(currentFilters, pagination, sorting);
    }
  }, [pagination, sorting]);

  const handleFilterSubmit = async (filters: any) => {
    if (!selectedVehicle || !filters.startDate || !filters.endDate) {
      alert("Please select a vehicle and a date range");
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

    await fetchIdleReportData(updatedFilters, { pageIndex: 0, pageSize: 10 }, []);
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

  console.log("Rendering table with data:", data);
  console.log("Data length in render:", data.length);

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

export default IdleReportPage;