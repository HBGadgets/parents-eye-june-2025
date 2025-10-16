"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ReportFilter,
  DateRange,
  FilterValues,
} from "@/components/report-filters/Report-Filter";
import {
  VisibilityState,
  type ColumnDef,
  PaginationState,
  SortingState,
} from "@tanstack/react-table";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";
import ResponseLoader from "@/components/ResponseLoader";
import { reverseGeocode } from "@/util/reverse-geocode";
import { FaPlay, FaPlus, FaMinus } from "react-icons/fa";
import { TravelTable } from "@/components/travel-summary/TravelTable";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DayWiseTrip {
  date: string;
  deviceId: number;
  startTime: string;
  endTime: string;
  distance: string;
  startLatitude: number;
  startLongitude: number;
  endLatitude: number;
  endLongitude: number;
  maxSpeed: number;
  avgSpeed: number;
  workingHours: string;
  runningTime: string;
  stopTime: string;
  idleTime: string;
}

interface TravelReportData {
  id: string;
  sn: number;
  vehicleNumber: string;
  startAddress: string;
  startCoordinates: { lat: number; lng: number };
  totalDistance: number;
  runningTime: string;
  idleTime: string;
  stopTime: string;
  endAddress: string;
  endCoordinates: { lat: number; lng: number };
  maxSpeed: number;
  avgSpeed: number;
  deviceId: string;
  dayWiseTrips: DayWiseTrip[];
}

interface TravelTableData {
  id: string;
  reportDate: string;
  ignitionStart: string;
  startLocation: string;
  startCoordinates: string;
  distance: string;
  running: string;
  idle: string;
  stop: string;
  totalWorkingHours: string;
  maxSpeed: string;
  avgSpeed: string;
  endLocation: string;
  endCoordinates: string;
  ignitionStop: string;
  play?: string;
}

interface ExpandedRowData extends TravelReportData {
  isLoading?: boolean;
  isDetailTable?: boolean;
  isEmpty?: boolean;
  detailData?: TravelTableData[];
}

const TravelReportPage: React.FC = () => {
  // Filter state (controlled by parent)
  const [selectedSchool, setSelectedSchool] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: null,
    endDate: null,
  });

  // Main table state
  const [data, setData] = useState<TravelReportData[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);

  // Expansion state
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [detailedData, setDetailedData] = useState<
    Record<string, TravelTableData[]>
  >({});

  // Detail table pagination & sorting state per expanded row
  const [detailTableStates, setDetailTableStates] = useState<
    Record<
      string,
      {
        pagination: PaginationState;
        sorting: SortingState;
      }
    >
  >({});

  // Transform dayWiseTrips data for TravelTable component
  const transformDayWiseData = useCallback(
    async (dayWiseTrips: DayWiseTrip[]): Promise<TravelTableData[]> => {
      const transformedData = await Promise.all(
        dayWiseTrips.map(async (trip, index) => {
          let startLocation = "Loading...";
          let endLocation = "Loading...";

          try {
            [startLocation, endLocation] = await Promise.all([
              reverseGeocode(trip.startLatitude, trip.startLongitude),
              reverseGeocode(trip.endLatitude, trip.endLongitude),
            ]);
          } catch (error) {
            startLocation = `${trip.startLatitude.toFixed(
              6
            )}, ${trip.startLongitude.toFixed(6)}`;
            endLocation = `${trip.endLatitude.toFixed(
              6
            )}, ${trip.endLongitude.toFixed(6)}`;
          }

          return {
            id: `day-${trip.date}-${index}`,
            reportDate: new Date(trip.date).toLocaleDateString(),
            ignitionStart: new Date(trip.startTime).toLocaleString(),
            startLocation,
            startCoordinates: `${trip.startLatitude.toFixed(
              6
            )}, ${trip.startLongitude.toFixed(6)}`,
            distance: trip.distance,
            running: trip.runningTime,
            idle: trip.idleTime,
            stop: trip.stopTime,
            totalWorkingHours: trip.workingHours,
            maxSpeed: `${trip.maxSpeed.toFixed(2)} km/h`,
            avgSpeed: `${trip.avgSpeed.toFixed(2)} km/h`,
            endLocation,
            endCoordinates: `${trip.endLatitude.toFixed(
              6
            )}, ${trip.endLongitude.toFixed(6)}`,
            ignitionStop: new Date(trip.endTime).toLocaleString(),
            play: "▶",
          };
        })
      );

      return transformedData;
    },
    []
  );

  const toggleRowExpansion = useCallback(
    async (rowId: string, rowData: TravelReportData) => {
      const newExpandedRows = new Set(expandedRows);

      if (expandedRows.has(rowId)) {
        newExpandedRows.delete(rowId);
      } else {
        newExpandedRows.add(rowId);

        if (!detailTableStates[rowId]) {
          setDetailTableStates((prev) => ({
            ...prev,
            [rowId]: {
              pagination: { pageIndex: 0, pageSize: 10 },
              sorting: [],
            },
          }));
        }

        if (!detailedData[rowId]) {
          try {
            const transformedDetails = await transformDayWiseData(
              rowData.dayWiseTrips || []
            );
            setDetailedData((prev) => ({
              ...prev,
              [rowId]: transformedDetails,
            }));
          } catch (error) {
            console.error("Error transforming day-wise data:", error);
            setDetailedData((prev) => ({
              ...prev,
              [rowId]: [],
            }));
          }
        }
      }

      setExpandedRows(newExpandedRows);
    },
    [expandedRows, detailedData, transformDayWiseData, detailTableStates]
  );

  const handleDetailPaginationChange = useCallback(
    (rowId: string, pagination: PaginationState) => {
      setDetailTableStates((prev) => ({
        ...prev,
        [rowId]: {
          ...prev[rowId],
          pagination,
        },
      }));
    },
    []
  );

  const handleDetailSortingChange = useCallback(
    (rowId: string, sorting: SortingState) => {
      setDetailTableStates((prev) => ({
        ...prev,
        [rowId]: {
          ...prev[rowId],
          sorting,
        },
      }));
    },
    []
  );

  const createExpandedData = useCallback((): ExpandedRowData[] => {
    const expandedDataArray: ExpandedRowData[] = [];
    data.forEach((row) => {
      expandedDataArray.push(row);
      if (expandedRows.has(row.id)) {
        if (detailedData[row.id]?.length) {
          expandedDataArray.push({
            ...row,
            id: `${row.id}-details`,
            isDetailTable: true,
            detailData: detailedData[row.id],
          });
        } else {
          expandedDataArray.push({
            ...row,
            id: `${row.id}-empty`,
            isEmpty: true,
          });
        }
      }
    });
    return expandedDataArray;
  }, [data, expandedRows, detailedData]);

  const travelTableColumns: ColumnDef<TravelTableData>[] = useMemo(
    () => [
      { accessorKey: "reportDate", header: "Report Date", size: 120 },
      { accessorKey: "ignitionStart", header: "Ignition Start", size: 180 },
      { accessorKey: "startLocation", header: "Start Location", size: 250 },
      {
        accessorKey: "startCoordinates",
        header: "Start Co-ordinate",
        size: 180,
      },
      { accessorKey: "distance", header: "Distance", size: 100 },
      { accessorKey: "running", header: "Running", size: 120 },
      { accessorKey: "idle", header: "Idle", size: 120 },
      { accessorKey: "stop", header: "Stop", size: 120 },
      {
        accessorKey: "totalWorkingHours",
        header: "Total Working Hours",
        size: 150,
      },
      { accessorKey: "maxSpeed", header: "Max Speed", size: 120 },
      { accessorKey: "avgSpeed", header: "Avg Speed", size: 120 },
      { accessorKey: "endLocation", header: "End Location", size: 250 },
      { accessorKey: "endCoordinates", header: "End Co-ordinate", size: 180 },
      { accessorKey: "ignitionStop", header: "Ignition Stop", size: 180 },
      {
        accessorKey: "play",
        header: "Play",
        size: 80,
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
    ],
    []
  );

  const columns: ColumnDef<ExpandedRowData>[] = useMemo(
    () => [
      {
        id: "expand",
        header: "",
        size: 50,
        cell: ({ row }) => {
          if (
            row.original.isLoading ||
            row.original.isDetailTable ||
            row.original.isEmpty
          )
            return null;

          const isExpanded = expandedRows.has(row.original.id);

          return (
            <div className="flex justify-center">
              <button
                onClick={() =>
                  toggleRowExpansion(row.original.id, row.original)
                }
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                aria-label={isExpanded ? "Collapse row" : "Expand row"}
              >
                {isExpanded ? (
                  <FaMinus className="text-red-500 text-sm" />
                ) : (
                  <FaPlus className="text-green-500 text-sm" />
                )}
              </button>
            </div>
          );
        },
        enableSorting: false,
      },
      {
        accessorKey: "sn",
        header: "SN",
        size: 80,
        cell: ({ row }) => {
          if (
            row.original.isLoading ||
            row.original.isDetailTable ||
            row.original.isEmpty
          )
            return "";
          return row.original.sn;
        },
      },
      {
        accessorKey: "vehicleNumber",
        header: "Vehicle Number",
        size: 200,
        cell: ({ row }) => {
          if (row.original.isLoading) {
            return (
              <div className="w-full">
                <div className="p-4 bg-gray-50 rounded">
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                    <span className="ml-2 text-gray-600">
                      Loading detailed data...
                    </span>
                  </div>
                </div>
              </div>
            );
          }

          if (row.original.isDetailTable && row.original.detailData) {
            const parentRowId = row.original.id.replace("-details", "");
            const detailState = detailTableStates[parentRowId] || {
              pagination: { pageIndex: 0, pageSize: 10 },
              sorting: [],
            };

            return (
              <div className="w-full">
                <div className="w-full bg-gray-50 rounded p-4">
                  <div className="w-full">
                    <TravelTable
                      data={row.original.detailData}
                      columns={travelTableColumns}
                      pagination={detailState.pagination}
                      totalCount={row.original.detailData.length}
                      onPaginationChange={(newPagination) =>
                        handleDetailPaginationChange(parentRowId, newPagination)
                      }
                      onSortingChange={(newSorting) =>
                        handleDetailSortingChange(parentRowId, newSorting)
                      }
                      sorting={detailState.sorting}
                      emptyMessage="No detailed data available"
                      pageSizeOptions={[10, 20, 30]}
                      showSerialNumber={true}
                      maxHeight="400px"
                    />
                  </div>
                </div>
              </div>
            );
          }

          if (row.original.isEmpty) {
            return (
              <div className="w-full">
                <div className="p-4 bg-gray-50 rounded text-center text-gray-500">
                  No detailed data available for {row.original.vehicleNumber}
                </div>
              </div>
            );
          }

          return row.original.vehicleNumber;
        },
      },
      {
        accessorKey: "startAddress",
        header: "Start Address",
        size: 300,
        cell: ({ row }) => {
          if (
            row.original.isLoading ||
            row.original.isDetailTable ||
            row.original.isEmpty
          )
            return "";
          return row.original.startAddress &&
            row.original.startAddress !== "Loading..."
            ? row.original.startAddress
            : "-";
        },
      },
      {
        accessorKey: "startCoordinates",
        header: "Start Coordinate",
        size: 180,
        cell: ({ row }) => {
          if (
            row.original.isLoading ||
            row.original.isDetailTable ||
            row.original.isEmpty
          )
            return "";
          const coords = row.original.startCoordinates;
          if (!coords) return "-";
          return `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
        },
      },
      {
        accessorKey: "totalDistance",
        header: "Total Distance (km)",
        size: 150,
        cell: ({ row }) => {
          if (
            row.original.isLoading ||
            row.original.isDetailTable ||
            row.original.isEmpty
          )
            return "";
          return typeof row.original.totalDistance === "number"
            ? row.original.totalDistance.toFixed(2)
            : row.original.totalDistance ?? "0.00";
        },
      },
      {
        accessorKey: "runningTime",
        header: "Running Time",
        size: 180,
        cell: ({ row }) => {
          if (
            row.original.isLoading ||
            row.original.isDetailTable ||
            row.original.isEmpty
          )
            return "";
          return row.original.runningTime ?? "0s";
        },
      },
      {
        accessorKey: "idleTime",
        header: "Idle Time",
        size: 180,
        cell: ({ row }) => {
          if (
            row.original.isLoading ||
            row.original.isDetailTable ||
            row.original.isEmpty
          )
            return "";
          return row.original.idleTime ?? "0s";
        },
      },
      {
        accessorKey: "stopTime",
        header: "Stop Time",
        size: 180,
        cell: ({ row }) => {
          if (
            row.original.isLoading ||
            row.original.isDetailTable ||
            row.original.isEmpty
          )
            return "";
          return row.original.stopTime ?? "0s";
        },
      },
      {
        accessorKey: "endAddress",
        header: "End Address",
        size: 300,
        cell: ({ row }) => {
          if (
            row.original.isLoading ||
            row.original.isDetailTable ||
            row.original.isEmpty
          )
            return "";
          return row.original.endAddress &&
            row.original.endAddress !== "Loading..."
            ? row.original.endAddress
            : "-";
        },
      },
      {
        accessorKey: "endCoordinates",
        header: "End Coordinate",
        size: 180,
        cell: ({ row }) => {
          if (
            row.original.isLoading ||
            row.original.isDetailTable ||
            row.original.isEmpty
          )
            return "";
          const coords = row.original.endCoordinates;
          if (!coords) return "-";
          return `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
        },
      },
      {
        accessorKey: "maxSpeed",
        header: "Max Speed (km/h)",
        size: 150,
        cell: ({ row }) => {
          if (
            row.original.isLoading ||
            row.original.isDetailTable ||
            row.original.isEmpty
          )
            return "";
          return typeof row.original.maxSpeed === "number"
            ? row.original.maxSpeed.toFixed(2)
            : row.original.maxSpeed ?? "0.00";
        },
      },
      {
        accessorKey: "avgSpeed",
        header: "Avg Speed (km/h)",
        size: 150,
        cell: ({ row }) => {
          if (
            row.original.isLoading ||
            row.original.isDetailTable ||
            row.original.isEmpty
          )
            return "";
          return typeof row.original.avgSpeed === "number"
            ? row.original.avgSpeed.toFixed(2)
            : row.original.avgSpeed ?? "0.00";
        },
      },
      {
        id: "play",
        header: "Play",
        size: 100,
        cell: ({ row }) => {
          if (
            row.original.isLoading ||
            row.original.isDetailTable ||
            row.original.isEmpty
          )
            return "";
          return (
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
          );
        },
      },
    ],
    [
      expandedRows,
      detailedData,
      detailTableStates,
      toggleRowExpansion,
      handleDetailPaginationChange,
      handleDetailSortingChange,
      travelTableColumns,
    ]
  );

  // Fetch data function
  const fetchTravelReportData = useCallback(
    async (
      filters: FilterValues,
      paginationState: PaginationState,
      sortingState: SortingState
    ) => {
      if (!filters) return;
      setIsLoading(true);

      try {
        // TODO: Replace with actual API call
        // const response = await api.get(`/travel-summary-report`, {
        //   params: {
        //     deviceIds: filters.deviceId,
        //     from: filters.startDate,
        //     to: filters.endDate,
        //   },
        // });

        // Demo data for now
        const demoData = [
          {
            name: deviceName || "MH35AG1931_",
            startLat: 21.423808888888892,
            startLong: 80.195455,
            endLat: 21.44083388888889,
            endLong: 80.21754222222222,
            distance: "1096.47",
            running: "5D, 14H, 0M, 20S",
            idle: "0D, 1H, 56M, 0S",
            stop: "1D, 22H, 35M, 10S",
            maxSpeed: 86.393,
            avgSpeed: 30.82203952,
            dayWiseTrips: [
              {
                date: "2025-09-10",
                deviceId: 6394,
                startTime: "2025-09-10T18:19:07.417Z",
                endTime: "2025-09-10T23:52:37.752Z",
                distance: "15.77 KM",
                startLatitude: 21.423808888888892,
                startLongitude: 80.195455,
                endLatitude: 21.463776111111112,
                endLongitude: 80.18173611111112,
                maxSpeed: 44.2764,
                avgSpeed: 24.98625294117649,
                workingHours: "5h 33m",
                runningTime: "0D, 0H, 34M, 0S",
                stopTime: "0D, 4H, 51M, 20S",
                idleTime: "0D, 0H, 8M, 20S",
              },
              {
                date: "2025-09-11",
                deviceId: 6394,
                startTime: "2025-09-11T00:08:17.737Z",
                endTime: "2025-09-11T17:51:04.017Z",
                distance: "153.18 KM",
                startLatitude: 21.46374888888889,
                startLongitude: 80.18145277777778,
                endLatitude: 21.44003888888889,
                endLongitude: 80.21658277777777,
                maxSpeed: 86.3932,
                avgSpeed: 29.784208307692417,
                workingHours: "17h 42m",
                runningTime: "0D, 6H, 51M, 40S",
                stopTime: "0D, 10H, 41M, 20S",
                idleTime: "0D, 0H, 9M, 40S",
              },
            ],
          },
        ];

        const transformedData: TravelReportData[] = await Promise.all(
          demoData.map(async (item, index) => {
            const sn =
              paginationState.pageIndex * paginationState.pageSize + index + 1;
            let startAddress = "Loading...";
            let endAddress = "Loading...";
            try {
              [startAddress, endAddress] = await Promise.all([
                reverseGeocode(item.startLat, item.startLong),
                reverseGeocode(item.endLat, item.endLong),
              ]);
            } catch {
              startAddress = "Address not found";
              endAddress = "Address not found";
            }

            return {
              id: `row-${index}`,
              sn,
              vehicleNumber: item.name,
              startAddress,
              startCoordinates: { lat: item.startLat, lng: item.startLong },
              totalDistance: parseFloat(item.distance),
              runningTime: item.running,
              idleTime: item.idle,
              stopTime: item.stop,
              endAddress,
              endCoordinates: { lat: item.endLat, lng: item.endLong },
              maxSpeed: item.maxSpeed,
              avgSpeed: item.avgSpeed,
              deviceId: filters.deviceId || `device-${index}`,
              dayWiseTrips: item.dayWiseTrips,
            };
          })
        );

        setData(transformedData);
        setTotalCount(transformedData.length);
      } catch (error) {
        console.error("Error fetching travel report data:", error);
        setData([]);
        setTotalCount(0);
      } finally {
        setIsLoading(false);
      }
    },
    [deviceName]
  );

  // Handle filter submission
  const handleFilterSubmit = useCallback(
    async (filters: FilterValues) => {
      console.log("✅ Filter submitted:", filters);
      console.log("📊 Current selections:", {
        school: selectedSchool,
        branch: selectedBranch,
        device: selectedDevice,
        deviceName,
        dateRange,
      });

      // Reset table state
      setPagination({ pageIndex: 0, pageSize: 10 });
      setSorting([]);
      setShowTable(true);
      setExpandedRows(new Set());
      setDetailedData({});
      setDetailTableStates({});

      // Fetch data
      await fetchTravelReportData(filters, { pageIndex: 0, pageSize: 10 }, []);
    },
    [
      selectedSchool,
      selectedBranch,
      selectedDevice,
      deviceName,
      dateRange,
      fetchTravelReportData,
    ]
  );

  // Refetch when pagination or sorting changes
  useEffect(() => {
    if (
      showTable &&
      selectedDevice &&
      dateRange.startDate &&
      dateRange.endDate
    ) {
      const filters: FilterValues = {
        schoolId: selectedSchool,
        branchId: selectedBranch,
        deviceId: selectedDevice,
        deviceName,
        startDate: dateRange.startDate
          ? new Date(dateRange.startDate).toISOString().split("T")[0]
          : null,
        endDate: dateRange.endDate
          ? new Date(dateRange.endDate).toISOString().split("T")[0]
          : null,
      };
      fetchTravelReportData(filters, pagination, sorting);
    }
  }, [pagination, sorting]);

  const expandedDataArray = createExpandedData();

  const { table, tableElement } = CustomTableServerSidePagination({
    data: expandedDataArray,
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
    <div className="p-6">
      <ResponseLoader isLoading={isLoading} />
      <header>
        <h1 className="text-2xl font-bold mb-4">Travel Summary Report</h1>
      </header>
      {/* Filter Component */}
      <ReportFilter
        onSubmit={handleFilterSubmit}
        className="mb-6"
        // Controlled props
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
      />

      {/* Table */}
      {showTable && <section className="mb-4">{tableElement}</section>}
    </div>
  );
};

export default TravelReportPage;
