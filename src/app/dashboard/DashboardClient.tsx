"use client";

import { useRouter } from "next/navigation";
import { ColumnVisibilitySelector } from "@/components/column-visibility-selector";
import VehicleMap from "@/components/dashboard/VehicleMap";
import ResponseLoader from "@/components/ResponseLoader";
import {
  // ColumnDef,
  CustomTableServerSidePagination,
} from "@/components/ui/customTable(serverSidePagination)";
import { Input } from "@/components/ui/input";
import { useLiveDeviceData } from "@/hooks/livetrack/useLiveDeviceData";
import { useReverseGeocode } from "@/hooks/useReverseGeocoding";
import { DeviceData } from "@/types/socket";
import { calculateTimeSince } from "@/util/calculateTimeSince";
import { ChevronsLeft, ChevronsRight, Locate } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { LiveTrack } from "@/components/dashboard/LiveTrack.tsx/livetrack";
import { BottomDrawer } from "@/components/dashboard/bottom-drawer";

type ViewState = "split" | "tableExpanded" | "mapExpanded";
type StatusFilter = "all" | "running" | "idle" | "stopped" | "inactive" | "new";

export default function DashboardClient() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Local search state (for input value)
  const [searchInput, setSearchInput] = useState<string>("");

  // Debounce timer ref
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const [sorting, setSorting] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [viewState, setViewState] = useState<ViewState>("split");
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(
    null
  );
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<DeviceData | null>(null);
  const [selectedImei, setSelectedImei] = useState<{
    imei: string;
    name: string;
  }>({
    imei: "",
    name: "",
  });

  // Active status filter
  const [activeStatus, setActiveStatus] = useState<StatusFilter>("all");

  const { addresses, loadingAddresses, queueForGeocoding } =
    useReverseGeocode();

  const statusColors: Record<string, string> = {
    Running: "bg-green-500 hover:bg-green-600 focus:ring-green-200",
    Overspeed: "bg-orange-500 hover:bg-orange-600 focus:ring-orange-200",
    Idle: "bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-200",
    Stopped: "bg-red-500 hover:bg-red-600 focus:ring-red-200",
    Inactive: "bg-gray-500 hover:bg-gray-600 focus:ring-gray-200",
    New: "bg-blue-500 hover:bg-blue-600 focus:ring-blue-200",
    Total: "bg-purple-500 hover:bg-purple-600 focus:ring-purple-200",
  };

  const { devices, counts, isLoading, updateFilters, currentPage, limit } =
    useLiveDeviceData();

  // Sync local pagination with store pagination
  const [pagination, setPagination] = useState({
    pageIndex: currentPage - 1,
    pageSize: limit,
  });

  // Update local pagination when store changes
  useEffect(() => {
    setPagination({
      pageIndex: currentPage - 1,
      pageSize: limit,
    });
  }, [currentPage, limit]);

  // **Debounced Search Handler**
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value);

      // Clear existing timer
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }

      // Set new timer (500ms debounce)
      searchDebounceRef.current = setTimeout(() => {
        updateFilters({
          searchTerm: value,
          page: 1,
        });
      }, 500);
    },
    [updateFilters]
  );

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  // **Status Filter Handler**
  const handleStatusFilter = useCallback(
    (status: StatusFilter) => {
      setActiveStatus(status);

      updateFilters({
        filter: status === "all" ? undefined : status,
        page: 1,
      });
    },
    [updateFilters]
  );

  // **Pagination Handler**
  const handlePaginationChange = useCallback(
    (updater: unknown) => {
      const newPagination =
        typeof updater === "function" ? updater(pagination) : updater;

      setPagination(newPagination);

      // Update store with new page
      updateFilters({
        page: newPagination.pageIndex + 1,
        limit: newPagination.pageSize,
      });
    },
    [pagination, updateFilters]
  );

  const queueVisibleDevicesForGeocoding = useCallback(() => {
    if (devices && devices.length > 0) {
      const startIndex = pagination.pageIndex * pagination.pageSize;
      const endIndex = startIndex + pagination.pageSize;
      const visibleDevices = devices.slice(startIndex, endIndex);

      visibleDevices.forEach((device) => {
        if (device.latitude && device.longitude) {
          queueForGeocoding(device.deviceId, device.latitude, device.longitude);
        }
      });
    }
  }, [devices, pagination.pageIndex, pagination.pageSize, queueForGeocoding]);

  const queueSelectedDeviceForGeocoding = useCallback(() => {
    if (selectedDevice && selectedDevice.latitude && selectedDevice.longitude) {
      queueForGeocoding(
        selectedDevice.deviceId,
        selectedDevice.latitude,
        selectedDevice.longitude,
        true
      );
    }
  }, [selectedDevice, queueForGeocoding]);

  // Keep your existing columns array here
  const columns = [
    {
      id: "status",
      header: "Status",
      cell: ({ row }: any) => {
        const vehicle = row.original;
        const vehicleStatus = useMemo(() => {
          const lastUpdateTime = new Date(vehicle.lastUpdate).getTime();
          const currentTime = new Date().getTime();
          const timeDifference = currentTime - lastUpdateTime;
          const thirtyFiveHoursInMs = 35 * 60 * 60 * 1000;

          // Check for overspeeding
          const speedLimit = parseFloat(vehicle.speedLimit) || 60;
          if (vehicle.speed > speedLimit) return "overspeed";

          // Check if vehicle is inactive
          if (vehicle.latitude === 0 && vehicle.longitude === 0)
            return "noData";

          if (timeDifference > thirtyFiveHoursInMs) return "inactive";

          // Extract vehicle attributes
          const { ignition } = vehicle.attributes;
          const speed = vehicle.speed;
          if (ignition === true) {
            if (speed > 5 && speed < speedLimit) {
              return "running";
            } else {
              return "idle";
            }
          } else if (ignition === false) {
            return "stopped";
          }
        }, [
          vehicle.speed,
          vehicle.speedLimit,
          vehicle.lastUpdate,
          vehicle.attributes.ignition,
        ]);

        const imageUrl = useMemo(() => {
          const statusToImageUrl = {
            running: "/bus/side-view/green-bus.svg",
            idle: "/bus/side-view/yellow-bus.svg",
            stopped: "/bus/side-view/red-bus.svg",
            inactive: "/bus/side-view/grey-bus.svg",
            overspeed: "/bus/side-view/orange-bus.svg",
            noData: "/bus/side-view/blue-bus.svg",
          };
          return (
            statusToImageUrl[
              String(vehicleStatus) as keyof typeof statusToImageUrl
            ] || statusToImageUrl.inactive
          );
        }, [vehicleStatus]);

        return (
          <div>
            <img src={imageUrl} className="w-20" alt="school bus status" />
          </div>
        );
      },
      meta: { flex: 1, maxWidth: 80 },
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "name",
      header: "vehicle",
      accessorFn: (row: any) => row.name ?? "N/A",
      meta: {
        wrapConfig: {
          wrap: "break-word",
          maxWidth: "200px",
        },
      },
      enableHiding: true,
      enableSorting: true,
    },
    // {
    //   id: "address",
    //   header: "Location",
    //   cell: ({ row }) => {
    //     const device = row.original;
    //     const deviceId = device.deviceId;
    //     const address = addresses[deviceId];
    //     const isLoading = loadingAddresses[deviceId];

    //     if (isLoading) {
    //       return (
    //         <div className="flex items-center space-x-2 text-gray-500">
    //           <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
    //           <span className="text-sm">Loading...</span>
    //         </div>
    //       );
    //     }

    //     if (address) {
    //       return (
    //         <div className="flex items-start space-x-2 max-w-xs">
    //           <span className="text-sm text-gray-700 leading-tight break-words">
    //             {address}
    //           </span>
    //         </div>
    //       );
    //     }

    //     if (device.latitude && device.longitude) {
    //       return (
    //         <div className="flex items-center space-x-2 text-gray-500">
    //           <span className="text-sm">
    //             {device.latitude.toFixed(6)}, {device.longitude.toFixed(6)}
    //           </span>
    //         </div>
    //       );
    //     }

    //     return <span className="text-gray-400 text-sm">No location</span>;
    //   },
    //   meta: {
    //     wrapConfig: {
    //       wrap: "break-word",
    //       maxWidth: "300px",
    //     },
    //   },
    //   enableHiding: true,
    //   enableSorting: false,
    // },
    {
      id: "lastUpdate",
      header: "Last Update",
      cell: ({ row }: any) => {
        const date = new Date(row.original.lastUpdate);
        return <div>{date.toLocaleString("en-US")}</div>;
      },
      meta: {
        wrapConfig: {
          wrap: "break-word",
          maxWidth: "200px",
        },
      },
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "since",
      header: "Since",
      cell: ({ row }: any) => {
        const timeSince = calculateTimeSince(row.original.lastUpdate);
        return <div>{timeSince}</div>;
      },
      meta: { flex: 1, minWidth: 100, maxWidth: 200 },
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "battery",
      header: "Battery",
      cell: ({ row }: any) => {
        const batteryLevel = row.original.batteryLevel ?? 0;
        const batteryPercentage = Math.min(Math.max(batteryLevel, 20), 100);

        const segments = 4;
        const filledSegments = Math.ceil(batteryPercentage / (100 / segments));

        const getSegmentColor = (segmentIndex: number, totalFilled: number) => {
          if (segmentIndex >= totalFilled) return "bg-gray-200";

          if (totalFilled <= 2) return "bg-red-500";
          if (totalFilled <= 3) return "bg-orange-500";
          if (totalFilled <= 3) return "bg-yellow-500";
          return "bg-green-500";
        };

        return (
          <div className="flex items-center space-x-2 rotate-[-90deg] relative bottom-4">
            <div className="relative flex">
              <div className="flex space-x-0.5 p-0.5 border border-gray-400 bg-white">
                {[...Array(segments)].map((_, index) => (
                  <div
                    key={index}
                    className={`w-[4px] h-2 rounded-sm transition-colors duration-200 ${getSegmentColor(
                      index,
                      filledSegments
                    )}`}
                  />
                ))}
              </div>
              <div className="w-0.5 h-1 bg-gray-400 rounded-r-sm self-center ml-0.5" />
            </div>
          </div>
        );
      },
      meta: { flex: 1, minWidth: 130, maxWidth: 180 },
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "gsm",
      header: "GSM",
      cell: ({ row }: any) => {
        const device = row.original;
        const cellTowers = device.gsmSignal || 0;
        const towerCount = Math.min(cellTowers, 5);

        const renderSignalBars = (count: number) => {
          const bars = [];
          const maxBars = 5;

          for (let i = 1; i <= maxBars; i++) {
            const isActive = i <= count;
            const height = `${i * 3 + 3}px`;

            bars.push(
              <div
                key={i}
                className={`w-1 rounded-sm transition-colors duration-200 ${
                  isActive
                    ? count <= 1
                      ? "bg-red-500"
                      : count <= 2
                      ? "bg-yellow-500"
                      : count <= 3
                      ? "bg-green-400"
                      : "bg-green-600"
                    : "bg-gray-200"
                }`}
                style={{ height }}
              />
            );
          }

          return bars;
        };

        const getSignalLabel = (count: number) => {
          if (count === 0) return { label: "No Signal", color: "text-red-600" };
          if (count === 1) return { label: "Very Weak", color: "text-red-600" };
          if (count === 2) return { label: "Weak", color: "text-yellow-600" };
          if (count === 3) return { label: "Good", color: "text-green-600" };
          if (count >= 4) return { label: "Strong", color: "text-green-700" };
          return { label: "Unknown", color: "text-gray-600" };
        };

        const signalInfo = getSignalLabel(towerCount);

        return (
          <div className="flex items-center space-x-3">
            <div
              className="flex items-end space-x-0.5"
              title={`${towerCount} cell towers detected`}
            >
              {renderSignalBars(towerCount)}
            </div>

            <div className="flex flex-col">
              <span className={`text-xs font-medium ${signalInfo.color}`}>
                {/* {signalInfo.label} */}
              </span>
            </div>
          </div>
        );
      },
      meta: { flex: 1, minWidth: 120, maxWidth: 180 },
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "gps",
      header: "GPS",
      cell: ({ row }: any) => {
        const gps = row.original.attributes.sat;
        return (
          <div className="relative flex items-center justify-center">
            <Locate className="w-8 h-8 text-gray-400" />
            <span className="absolute text-xs font-bold text-gray-700">
              {gps}
            </span>
          </div>
        );
      },
      meta: { flex: 1, minWidth: 100, maxWidth: 200 },
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "speed",
      header: "Speed (km/h)",
      accessorFn: (row: any) => row.speed?.toFixed(2) ?? "N/A",
      meta: { flex: 1, minWidth: 100, maxWidth: 200 },
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "ig",
      header: "Ignition",
      cell: ({ row }: any) => {
        const status = row.original.status || "unknown";
        const statusColor = status ? "green" : "red";
        return (
          <div
            style={{ color: `${statusColor}`, fontSize: "1.1rem" }}
            className="flex items-center justify-center"
          >
            <svg
              stroke="currentColor"
              fill="currentColor"
              strokeWidth="0"
              viewBox="0 0 256 256"
              height="1em"
              width="1em"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M256,120v48a16,16,0,0,1-16,16H227.31L192,219.31A15.86,15.86,0,0,1,180.69,224H103.31A15.86,15.86,0,0,1,92,219.31L52.69,180A15.86,15.86,0,0,1,48,168.69V148H24v24a8,8,0,0,1-16,0V108a8,8,0,0,1,16,0v24H48V80A16,16,0,0,1,64,64h60V40H100a8,8,0,0,1,0-16h64a8,8,0,0,1,0,16H140V64h40.69A15.86,15.86,0,0,1,192,68.69L227.31,104H240A16,16,0,0,1,256,120Z"></path>
            </svg>
          </div>
        );
      },
      meta: { flex: 1, minWidth: 100, maxWidth: 200 },
      enableHiding: true,
      enableSorting: true,
    },
  ];

  useEffect(() => {
    if (isDrawerOpen) {
      const timer = setTimeout(() => {
        document.body.style.pointerEvents = "auto";
      }, 0);

      return () => {
        clearTimeout(timer);
        document.body.style.pointerEvents = "";
      };
    } else {
      document.body.style.pointerEvents = "";
    }
  }, [isDrawerOpen]);

  const handleExpandTable = useCallback(() => {
    if (viewState === "mapExpanded") {
      setViewState("split");
    } else {
      setViewState((prevState) =>
        prevState === "tableExpanded" ? "split" : "tableExpanded"
      );
    }
  }, [viewState]);

  const handleExpandMap = useCallback(() => {
    if (viewState === "tableExpanded") {
      setViewState("split");
    } else {
      setViewState((prevState) =>
        prevState === "mapExpanded" ? "split" : "mapExpanded"
      );
    }
  }, [viewState]);

  const handleDeviceSelection = useCallback(
    (device: DeviceData) => {
      setSelectedVehicleId(device.deviceId);
      setSelectedDevice(device);
      setIsDrawerOpen(true);

      if (device.latitude && device.longitude) {
        queueForGeocoding(
          device.deviceId,
          device.latitude,
          device.longitude,
          true
        );
      }
    },
    [queueForGeocoding]
  );

  const handleOpenLiveTrack = (imei: string, name: string) => {
    setOpen(true);
    setSelectedImei({ imei, name });
  };

  const handleHistoryClick = (deviceId: number) => {
    router.push(
      `/dashboard/reports/history-report?vehicleId=${deviceId}&vehicleName=${selectedDevice?.name}`
    );
  };

  useEffect(() => {
    queueVisibleDevicesForGeocoding();
  }, [queueVisibleDevicesForGeocoding]);

  useEffect(() => {
    queueSelectedDeviceForGeocoding();
  }, [queueSelectedDeviceForGeocoding]);

  const getTableClass = useMemo(() => {
    switch (viewState) {
      case "tableExpanded":
        return "flex-1 transition-all duration-300 ease-in-out";
      case "mapExpanded":
        return "w-0 overflow-hidden transition-all duration-300 ease-in-out";
      default:
        return "flex-1 transition-all duration-300 ease-in-out";
    }
  }, [viewState]);

  const getMapClass = useMemo(() => {
    switch (viewState) {
      case "mapExpanded":
        return "flex-1 transition-all duration-300 ease-in-out";
      case "tableExpanded":
        return "w-0 overflow-hidden transition-all duration-300 ease-in-out";
      default:
        return "flex-1 transition-all duration-300 ease-in-out";
    }
  }, [viewState]);

  // Calculate total count for pagination
  const totalCount = useMemo(() => {
    if (activeStatus === "all") {
      return counts.find((c) => c.total !== undefined)?.total || 0;
    }
    const statusCount = counts.find((c) => c[activeStatus] !== undefined);
    return statusCount ? statusCount[activeStatus] : 0;
  }, [counts, activeStatus]);

  // Server side pagination table instance
  const { table, tableElement } = CustomTableServerSidePagination({
    data: devices || [],
    columns,
    pagination,
    totalCount: totalCount,
    loading: isLoading,
    onPaginationChange: handlePaginationChange,
    onSortingChange: setSorting,
    sorting,
    columnVisibility,
    onColumnVisibilityChange: setColumnVisibility,
    emptyMessage: "No devices found",
    pageSizeOptions: [5, 10, 20, 30, 50],
    enableSorting: true,
    showSerialNumber: true,
    onRowClick: handleDeviceSelection,
    selectedRowId: selectedVehicleId,
    getRowId: (row: DeviceData) => row.deviceId,
    selectedRowClassName:
      "bg-blue-100 hover:bg-blue-200 border-l-4 border-blue-500",
  });

  const bottomDrawerProps = useMemo(() => {
    return {
      isDrawerOpen,
      setIsDrawerOpen,
      selectedDevice,
      addresses,
      loadingAddresses,
      handleOpenLiveTrack,
      handleHistoryClick,
    };
  }, [
    isDrawerOpen,
    setIsDrawerOpen,
    selectedDevice,
    addresses,
    loadingAddresses,
    handleOpenLiveTrack,
    handleHistoryClick,
  ]);

  return (
    <>
      <style jsx>{`
        .table-row-selected {
          background-color: #dbeafe !important;
          border-left: 4px solid #3b82f6 !important;
        }
        .table-row-selected:hover {
          background-color: #bfdbfe !important;
        }
        .table-row-hover:hover {
          background-color: #f9fafb;
        }
        .status-button-active {
          transform: scale(1.05);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
        }
      `}</style>

      <ResponseLoader isLoading={isLoading} />
      <div>
        <div className="flex justify-between">
          <div className="flex items-center gap-3">
            <Input
              placeholder="Search bus number or name..."
              className="flex-1 min-w-[300px]"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
            <ColumnVisibilitySelector
              columns={table.getAllColumns()}
              buttonVariant="outline"
              buttonSize="default"
            />
          </div>

          {/* Device/Status Count Buttons with Filtering */}
          <div className="flex gap-3 mb-2">
            {counts.map((countObj, index) => {
              const [key, value] = Object.entries(countObj)[0];
              const label = key.charAt(0).toUpperCase() + key.slice(1);
              const statusKey = key.toLowerCase() as StatusFilter;
              const isActive =
                activeStatus === (key === "total" ? "all" : statusKey);

              return (
                <button
                  key={index}
                  onClick={() =>
                    handleStatusFilter(key === "total" ? "all" : statusKey)
                  }
                  className={`
                    inline-flex items-center justify-center
                    ${statusColors[label]}
                    text-white font-semibold text-[10px]
                    px-3 py-2.5 rounded-lg
                    shadow-md hover:shadow-lg
                    transform transition-all duration-200 ease-in-out
                    hover:scale-105 active:scale-95
                    focus:outline-none focus:ring-4 focus:ring-opacity-50
                    border-0
                    min-w-[80px]
                    cursor-pointer
                    select-none
                    relative
                    overflow-hidden
                    group
                    ${
                      isActive
                        ? "status-button-active ring-4 ring-blue-300"
                        : ""
                    }
                  `}
                  type="button"
                  aria-label={`${label} count: ${value}`}
                  aria-pressed={isActive}
                >
                  <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:translate-x-full transition-transform duration-700 ease-out" />

                  <span className="relative z-10 flex items-center gap-2">
                    <span className="font-medium">{label}</span>
                    <span className="bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full text-xs font-bold">
                      {value}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Layout */}
        <div className="dashboard">
          <div className="flex gap-0 h-[80vh]">
            <section className={`overflow-auto ${getTableClass}`}>
              {viewState === "mapExpanded" && (
                <div className="absolute top-1/2 left-0 z-50">
                  <button
                    onClick={handleExpandTable}
                    className={`p-2 rounded-full border border-gray-300 hover:bg-primary transition-all duration-200 cursor-pointer shadow-lg hover:shadow-xl hover:-translate-y-0.5  ${
                      viewState === "mapExpanded"
                        ? "bg-blue-100"
                        : "bg-white text-gray-600"
                    }`}
                    title={"Expand table"}
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {viewState !== "mapExpanded" && (
                <div className="h-[80vh]">{tableElement}</div>
              )}
            </section>

            {/* Arrow Controls */}
            {!["tableExpanded", "mapExpanded"].includes(viewState) && (
              <div className="flex flex-col justify-center items-center space-y-2 z-50 absolute top-1/2 right-[48.5%]">
                <button
                  onClick={handleExpandMap}
                  className={`p-2 rounded-full border border-gray-300 hover:bg-primary transition-all duration-200 cursor-pointer shadow-lg hover:shadow-xl hover:-translate-y-0.5 [animation-duration:_300ms] [animation:_fadeIn_300ms_ease-in_forwards] ${
                    viewState === "mapExpanded"
                      ? "bg-blue-100 "
                      : "bg-white text-gray-600"
                  }`}
                  title={
                    viewState === "mapExpanded" ? "Show both" : "Expand map"
                  }
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>

                {/* <div className="h-px w-8 bg-gray-300"></div> */}

                <button
                  onClick={handleExpandTable}
                  className={`p-2 rounded-full border border-gray-300 hover:bg-primary transition-all duration-200 cursor-pointer shadow-lg hover:shadow-xl hover:-translate-y-0.5  [animation-duration:_500ms] [animation:_fadeIn_300ms_ease-in_forwards] ${
                    viewState === "tableExpanded"
                      ? "bg-blue-100"
                      : "bg-white text-gray-600"
                  }`}
                  title={
                    viewState === "tableExpanded" ? "Show both" : "Expand table"
                  }
                >
                  {/* <MoveRight className="w-4 h-4" /> */}
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Right Side - Map */}
            <section className={`${getMapClass} rounded-lg overflow-hidden`}>
              {viewState !== "tableExpanded" && (
                <VehicleMap
                  vehicles={devices}
                  height="100%"
                  autoFitBounds={false}
                  showTrails={false}
                  clusterMarkers={devices.length > 100}
                  zoom={6}
                  selectedVehicleId={selectedVehicleId}
                  onVehicleSelect={setSelectedVehicleId}
                />
              )}
              {viewState === "tableExpanded" && (
                <div className="absolute top-1/2 right-2 z-50">
                  <button
                    onClick={handleExpandMap}
                    className={`p-2 rounded-full border border-gray-300 hover:bg-primary transition-all duration-200 cursor-pointer shadow-lg hover:shadow-xl hover:-translate-y-0.5  ${
                      viewState === "mapExpanded"
                        ? "bg-blue-100 "
                        : "bg-white text-gray-600"
                    }`}
                    title={
                      viewState === "mapExpanded" ? "Show both" : "Expand map"
                    }
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>

      {/* Drawer */}
      <div>
        <BottomDrawer {...bottomDrawerProps} />
      </div>

      <LiveTrack open={open} setOpen={setOpen} selectedImei={selectedImei} />
    </>
  );
}
