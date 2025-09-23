"use client";

import React, { useState, useEffect } from "react";
import ReportFilter from "@/components/report-filters/Report-Filter";
import { type ColumnDef, VisibilityState } from "@tanstack/react-table";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";
import { api } from "@/services/apiService";
import ResponseLoader from "@/components/ResponseLoader";
import { reverseGeocode } from "@/util/reverse-geocode";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FaPause } from "react-icons/fa";

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
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
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
                  <FaPause className={`text-lg cursor-pointer ${iconColor}`} />
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
        row.original.startTime ? new Date(row.original.startTime).toLocaleString() : "-",
    },
    { accessorKey: "duration", header: "Duration", size: 180 },
    {
      accessorKey: "location",
      header: "Location",
      size: 350,
      cell: ({ row }) =>
        row.original.location !== "Loading..." ? row.original.location : "-",
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
        row.original.endTime ? new Date(row.original.endTime).toLocaleString() : "-",
    },
  ];

  const fetchIdleReportData = async (filters: any, paginationState: any, sortingState: any) => {
    if (!filters) return;
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        deviceIds: filters.deviceId,
        period: filters.period || "This Month", // default period
        page: (paginationState.pageIndex + 1).toString(),
        limit: paginationState.pageSize.toString(),
      });

      // Only send from/to if "Custom" period is chosen
      if (filters.period === "Custom" && filters.startDate && filters.endDate) {
        queryParams.append("from", new Date(filters.startDate).toISOString());
        queryParams.append("to", new Date(filters.endDate).toISOString());
      }

      if (sortingState?.length) {
        const sort = sortingState[0];
        queryParams.append("sortBy", sort.id);
        queryParams.append("sortOrder", sort.desc ? "desc" : "asc");
      }

      const response = await api.get(`report/idle-report?${queryParams.toString()}`);
      const json = response.data;

      if (!json || (Array.isArray(json) && json.length === 0)) {
        setData([]);
        setTotalCount(0);
        return;
      }

      const dataArray = Array.isArray(json) ? json : [json];
      const initialTransformed = dataArray.map((item: any, index: number) => ({
        id: item.deviceId || `row-${index}`,
        sn: paginationState.pageIndex * paginationState.pageSize + index + 1,
        deviceName: filters.deviceName,
        vehicleStatus: item.vehicleStatus || "Idle",
        startTime: item.startDateTime,
        duration: item.duration || item.time,
        location: "Loading...",
        coordinates:
          item.location || item.coordinates || "21.991253888888888, 78.92976777777777",
        endTime: item.endDateTime,
      }));

      setData(initialTransformed);
      setTotalCount(response.total || initialTransformed.length);

      const transformedWithAddresses = await Promise.all(
        initialTransformed.map(async (item) => {
          const [lat, lon] = item.coordinates
            .split(",")
            .map((c: string) => parseFloat(c.trim()));
          const address = await reverseGeocode(lat, lon).catch(() => item.coordinates);
          return { ...item, location: address };
        })
      );
      setData(transformedWithAddresses);
    } catch (error: any) {
      console.error("Error fetching idle report data:", error);
      setData([]);
      setTotalCount(0);
      alert(error.response?.data?.error || error.message || "Network error");
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
    if (filters.period === "Custom" && (!filters.startDate || !filters.endDate)) {
      alert("Please select both start and end dates for custom period");
      return;
    }
    setPagination({ pageIndex: 0, pageSize: 10 });
    setSorting([]);
    setCurrentFilters(filters);
    setShowTable(true);
    await fetchIdleReportData(filters, { pageIndex: 0, pageSize: 10 }, []);
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
