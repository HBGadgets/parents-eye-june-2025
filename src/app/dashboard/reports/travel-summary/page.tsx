"use client";

import React, { useState, useEffect } from "react";
import ReportFilter from "@/components/report-filters/Report-Filter";
import { VisibilityState, type ColumnDef } from "@tanstack/react-table";
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

interface TravelReportData {
  id: string;
  sn: number;
  vehicleNumber: string;
  startTime: string;               // when trip started
  startAddress: string;
  startCoordinates: { lat: number; lng: number };
  totalDistance: number;           // in km
  runningTime: string;             // e.g. “2H 10M 5S”
  idleTime: string;                // analogous
  stopTime: string;                // analogous
  endTime: string;
  endAddress: string;
  endCoordinates: { lat: number; lng: number };
  maxSpeed: number;                // km/h
  avgSpeed: number;                // km/h
}

const TravelReportPage: React.FC = () => {
  const [data, setData] = useState<TravelReportData[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showTable, setShowTable] = useState(false);

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState<any[]>([]);
  const [currentFilters, setCurrentFilters] = useState<any>(null);

  // Utility: format duration in “XH YM ZS”
  const formatDuration = (secondsTotal: number): string => {
    if (secondsTotal <= 0) return "0s";
    const h = Math.floor(secondsTotal / 3600);
    const m = Math.floor((secondsTotal % 3600) / 60);
    const s = secondsTotal % 60;
    return `${h}H ${m}M ${s}S`;
  };

  const columns: ColumnDef<TravelReportData>[] = [
    { accessorKey: "sn", header: "SN", size: 80 },
    { accessorKey: "vehicleNumber", header: "Vehicle Number", size: 200 },
    {
      accessorKey: "startAddress",
      header: "Start Address",
      size: 300,
      cell: ({ row }) => {
        const addr = row.original.startAddress;
        return addr && addr !== "Loading..." ? addr : "-";
      },
    },
    {
      accessorKey: "startCoordinates",
      header: "Start Coordinate",
      size: 180,
      cell: ({ row }) => {
        const coords = row.original.startCoordinates;
        if (!coords) return "-";
        return `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
      },
    },
    {
      accessorKey: "totalDistance",
      header: "Total Distance (km)",
      size: 150,
      cell: ({ row }) => row.original.totalDistance?.toFixed(2) ?? "0.00",
    },
    {
      accessorKey: "runningTime",
      header: "Running Time",
      size: 180,
      cell: ({ row }) => row.original.runningTime ?? "0s",
    },
    {
      accessorKey: "idleTime",
      header: "Idle Time",
      size: 180,
      cell: ({ row }) => row.original.idleTime ?? "0s",
    },
    {
      accessorKey: "stopTime",
      header: "Stop Time",
      size: 180,
      cell: ({ row }) => row.original.stopTime ?? "0s",
    },
    {
      accessorKey: "endAddress",
      header: "End Address",
      size: 300,
      cell: ({ row }) => {
        const addr = row.original.endAddress;
        return addr && addr !== "Loading..." ? addr : "-";
      },
    },
    {
      accessorKey: "endCoordinates",
      header: "End Coordinate",
      size: 180,
      cell: ({ row }) => {
        const coords = row.original.endCoordinates;
        if (!coords) return "-";
        return `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
      },
    },
    {
      accessorKey: "maxSpeed",
      header: "Max Speed (km/h)",
      size: 150,
      cell: ({ row }) => row.original.maxSpeed?.toFixed(2) ?? "0.00",
    },
    {
      accessorKey: "avgSpeed",
      header: "Avg Speed (km/h)",
      size: 150,
      cell: ({ row }) => row.original.avgSpeed?.toFixed(2) ?? "0.00",
    },
    // Play icon with tooltip
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

  const fetchTravelReportData = async (filters: any, paginationState: { pageIndex: number; pageSize: number }, sortingState: any[]) => {
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

      // Fetch data from API
      const [deviceRes, travelRes] = await Promise.all([
        api.get("/device"),
        api.get(`/report/travel-report?${queryParams.toString()}`),
      ]);

      const deviceList = deviceRes.data || [];
      const deviceMap: Record<string, string> = {};
      deviceList.forEach((d: any) => {
        deviceMap[d.deviceId] = d.name;
      });

      const json = travelRes.data;

      if (!json || (Array.isArray(json) && json.length === 0)) {
        setData([]);
        setTotalCount(0);
        return;
      }

      const dataArray = Array.isArray(json) ? json : [json];

      // Transform raw data
      const initialTransformed: TravelReportData[] = dataArray.map((item: any, index: number) => {
        const sn = paginationState.pageIndex * paginationState.pageSize + index + 1;

        // Placeholder: you might receive runningSeconds, idleSeconds, stopSeconds in API. If not, you will need logic to compute from timestamps.
        const runningSeconds = item.runningSeconds ?? 0;
        const idleSeconds = item.idleSeconds ?? 0;
        const stopSeconds = item.stopSeconds ?? 0;

        return {
          id: item._id || `row-${index}`,
          sn,
          vehicleNumber: deviceMap[item.deviceId] || filters.vehicleNumber || item.deviceId,
          startTime: new Date(item.startTime).toLocaleString(),
          startAddress: "Loading...",
          startCoordinates: { lat: item.startLatitude, lng: item.startLongitude },
          totalDistance: item.totalDistance ?? 0,
          runningTime: formatDuration(runningSeconds),
          idleTime: formatDuration(idleSeconds),
          stopTime: formatDuration(stopSeconds),
          endTime: new Date(item.endTime).toLocaleString(),
          endAddress: "Loading...",
          endCoordinates: { lat: item.endLatitude, lng: item.endLongitude },
          maxSpeed: item.maxSpeed ?? 0,
          avgSpeed: item.avgSpeed ?? 0,
        };
      });

      setData(initialTransformed);
      setTotalCount(travelRes.total ?? initialTransformed.length);

      // Reverse geocode both start & end addresses
      const withAddresses = await Promise.all(
        initialTransformed.map(async (item) => {
          try {
            const [startAddr, endAddr] = await Promise.all([
              reverseGeocode(item.startCoordinates.lat, item.startCoordinates.lng),
              reverseGeocode(item.endCoordinates.lat, item.endCoordinates.lng),
            ]);
            return {
              ...item,
              startAddress: startAddr || "Address not found",
              endAddress: endAddr || "Address not found",
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

      setData(withAddresses);

    } catch (error: any) {
      console.error("Error fetching travel report data:", error);
      // handle error messages similarly
      setData([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentFilters && showTable) {
      fetchTravelReportData(currentFilters, pagination, sorting);
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

    await fetchTravelReportData(filters, { pageIndex: 0, pageSize: 10 }, []);
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
    emptyMessage: "No travel reports found",
    pageSizeOptions: [5, 10, 20, 30, 50],
    enableSorting: true,
    showSerialNumber: false,
  });

  return (
    <div>
      <ResponseLoader isLoading={isLoading} />

      <h1 className="text-xl font-bold mb-4">Travel Reports</h1>

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

export default TravelReportPage;

