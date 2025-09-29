"use client";
import { ColumnVisibilitySelector } from "@/components/column-visibility-selector";
import VehicleMap from "@/components/dashboard/VehicleMap";
import ResponseLoader from "@/components/ResponseLoader";
import {
  ColumnDef,
  CustomTableServerSidePagination,
} from "@/components/ui/customTable(serverSidePagination)";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import SearchComponent from "@/components/ui/SearchOnlydata";
import { useLiveDeviceData } from "@/hooks/livetrack/useLiveDeviceData";
import { useReverseGeocode } from "@/hooks/useReverseGeocoding";
import { DeviceData } from "@/types/socket";
import { calculateTimeSince } from "@/util/calculateTimeSince";
import { Locate, MoveLeft, MoveRight } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type ViewState = "split" | "tableExpanded" | "mapExpanded";

export default function DashboardPage() {
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [viewState, setViewState] = useState<ViewState>("split");
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<DeviceData | null>(null);
  const { addresses, loadingAddresses, queueForGeocoding } =
    useReverseGeocode();
  const statusColors: Record<string, string> = {
    Running: "bg-green-500 hover:bg-green-600 focus:ring-green-200",
    Idle: "bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-200",
    Stopped: "bg-red-500 hover:bg-red-600 focus:ring-red-200",
    Inactive: "bg-gray-500 hover:bg-gray-600 focus:ring-gray-200",
    New: "bg-blue-500 hover:bg-blue-600 focus:ring-blue-200",
    Total: "bg-purple-500 hover:bg-purple-600 focus:ring-purple-200",
  };

  const {
    devices,
    counts,
    filters,
    isLoading,
    error,
    isConnected,
    isAuthenticated,
    updateFilters,
    refreshData,
    clearError,
  } = useLiveDeviceData();

  const queueVisibleDevicesForGeocoding = useCallback(() => {
    if (devices && devices.length > 0) {
      // Only queue visible devices (current page)
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

  // Queue selected device for high priority geocoding - extracted with useCallback
  const queueSelectedDeviceForGeocoding = useCallback(() => {
    if (selectedDevice && selectedDevice.latitude && selectedDevice.longitude) {
      queueForGeocoding(
        selectedDevice.deviceId,
        selectedDevice.latitude,
        selectedDevice.longitude,
        true // High priority
      );
    }
  }, [selectedDevice, queueForGeocoding]);

  useEffect(() => {
    console.log("position data", devices);
  }, [devices]);

  const columns: ColumnDef<DeviceData>[] = [
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const vehicle = row.original;
        const vehicleStatus = useMemo(() => {
          const lastUpdateTime = new Date(vehicle.lastUpdate).getTime();
          const currentTime = new Date().getTime();
          const timeDifference = currentTime - lastUpdateTime;
          const thirtyFiveHoursInMs = 35 * 60 * 60 * 1000;

          if (timeDifference > thirtyFiveHoursInMs) return "inactive";

          const speedLimit = parseFloat(vehicle.speedLimit) || 60;
          if (vehicle.speed > speedLimit) return "overspeeding";

          const runningConditions = [
            vehicle.speed > 5,
            vehicle.attributes.motion === true,
            vehicle.attributes.ignition === true,
          ];
          const idleConditions = [
            vehicle.speed < 5,
            vehicle.attributes.motion === false,
            vehicle.attributes.ignition === true,
          ];
          const stoppedConditions = [
            vehicle.speed < 5,
            vehicle.attributes.motion === false,
            vehicle.attributes.ignition === false,
          ];

          const trueConditionsCount = runningConditions.filter(Boolean).length;
          const trueIdleConditionsCount = idleConditions.filter(Boolean).length;
          const trueStoppedConditionsCount =
            stoppedConditions.filter(Boolean).length;

          if (trueStoppedConditionsCount >= 2) return "stopped";
          if (trueConditionsCount >= 2) return "running";
          if (trueIdleConditionsCount >= 2) return "idle";
          return "noData";
        }, [
          vehicle.speed,
          vehicle.speedLimit,
          vehicle.lastUpdate,
          vehicle.attributes.motion,
          vehicle.attributes.ignition,
        ]);

        const imageUrl = useMemo(() => {
          const statusToImageUrl = {
            running: "/bus/side-view/green-bus.svg",
            idle: "/bus/side-view/yellow-bus.svg",
            stopped: "/bus/side-view/red-bus.svg",
            inactive: "/bus/side-view/grey-bus.svg",
            overspeeding: "/bus/side-view/orange-bus.svg",
            noData: "/bus/side-view/blue-bus.svg",
          };
          return statusToImageUrl[vehicleStatus] || statusToImageUrl.inactive;
        }, [vehicleStatus]);

        return (
          <div>
            <img src={imageUrl} alt="school bus status" />
          </div>
        );
      },
      meta: { flex: 1, minWidth: 150 },
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "name",
      header: "vehicle",
      accessorFn: (row) => row.name ?? "N/A",
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
      id: "address",
      header: "Location",
      cell: ({ row }) => {
        const device = row.original;
        const deviceId = device.deviceId;
        const address = addresses[deviceId];
        const isLoading = loadingAddresses[deviceId];

        if (isLoading) {
          return (
            <div className="flex items-center space-x-2 text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              <span className="text-sm">Loading...</span>
            </div>
          );
        }

        if (address) {
          return (
            <div className="flex items-start space-x-2 max-w-xs">
              <span className="text-sm text-gray-700 leading-tight break-words">
                {address}
              </span>
            </div>
          );
        }

        if (device.latitude && device.longitude) {
          return (
            <div className="flex items-center space-x-2 text-gray-500">
              <span className="text-sm">
                {device.latitude.toFixed(6)}, {device.longitude.toFixed(6)}
              </span>
            </div>
          );
        }

        return <span className="text-gray-400 text-sm">No location</span>;
      },
      meta: {
        wrapConfig: {
          wrap: "break-word",
          maxWidth: "300px",
        },
      },
      enableHiding: true,
      enableSorting: false,
    },
    {
      id: "lastUpdate",
      header: "Last Update",
      cell: ({ row }) => {
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
      cell: ({ row }) => {
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
      cell: ({ row }) => {
        const batteryLevel = row.original.batteryLevel ?? 0;
        const batteryPercentage = Math.min(Math.max(batteryLevel, 20), 100);

        // Create 5 segments (20% each)
        const segments = 4;
        const filledSegments = Math.ceil(batteryPercentage / (100 / segments));

        const getSegmentColor = (segmentIndex: number, totalFilled: number) => {
          if (segmentIndex >= totalFilled) return "bg-gray-200";

          if (totalFilled <= 2) return "bg-red-500"; // Critical (0-20%)
          if (totalFilled <= 3) return "bg-orange-500"; // Low (21-40%)
          if (totalFilled <= 3) return "bg-yellow-500"; // Medium (41-60%)
          return "bg-green-500"; // Good (61-100%)
        };

        return (
          <div className="flex items-center space-x-2 rotate-[-90deg] relative bottom-4">
            {/* Battery Shell with Segments - Reduced Size */}
            <div className="relative flex">
              <div className="flex space-x-0.5 p-0.5 border border-gray-400 bg-white">
                {[...Array(segments)].map((_, index) => (
                  <div
                    key={index}
                    className={`w-1 h-2 rounded-sm transition-colors duration-200 ${getSegmentColor(
                      index,
                      filledSegments
                    )}`}
                  />
                ))}
              </div>
              {/* Battery Tip - Reduced Size */}
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
      cell: ({ row }) => {
        const device = row.original;
        const cellTowers = device.gsmSignal || 0;
        const towerCount = Math.min(cellTowers, 5); // Cap at 5 as mentioned

        // Generate signal bars based on tower count (0-5)
        const renderSignalBars = (count: number) => {
          const bars = [];
          const maxBars = 5;

          for (let i = 1; i <= maxBars; i++) {
            const isActive = i <= count;
            const height = `${i * 3 + 6}px`; // Progressive height: 9px, 12px, 15px, 18px, 21px

            bars.push(
              <div
                key={i}
                className={`w-1.5 rounded-sm transition-colors duration-200 ${
                  isActive
                    ? count <= 1
                      ? "bg-red-500" // Very weak (1 tower)
                      : count <= 2
                      ? "bg-yellow-500" // Weak (2 towers)
                      : count <= 3
                      ? "bg-green-400" // Good (3 towers)
                      : "bg-green-600" // Strong (4-5 towers)
                    : "bg-gray-200" // Inactive bars
                }`}
                style={{ height }}
              />
            );
          }

          return bars;
        };

        // Get signal strength label
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
            {/* Signal bars visualization */}
            <div
              className="flex items-end space-x-0.5"
              title={`${towerCount} cell towers detected`}
            >
              {renderSignalBars(towerCount)}
            </div>

            {/* Tower count and label */}
            <div className="flex flex-col">
              <span className={`text-xs font-medium ${signalInfo.color}`}>
                {signalInfo.label}
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
      cell: ({ row }) => {
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
      accessorFn: (row) => row.speed?.toFixed(2) ?? "N/A",
      meta: { flex: 1, minWidth: 100, maxWidth: 200 },
      enableHiding: true,
      enableSorting: true,
    },
    // {
    //   id: "todaysDistance",
    //   header: "Today's Distance (km)",
    //   accessorFn: (row) => row.distance?.toFixed(2) ?? "N/A",
    //   meta: {
    //     wrapConfig: {
    //       wrap: "break-word",
    //       maxWidth: "200px",
    //     },
    //   },
    //   enableHiding: true,
    //   enableSorting: true,
    // },
    // {
    //   id: "totalDistance",
    //   header: "Total Distance (km)",
    //   accessorFn: (row) => row.totalDistance?.toFixed(2) ?? "N/A",
    //   meta: {
    //     wrapConfig: {
    //       wrap: "break-word",
    //       maxWidth: "200px",
    //     },
    //   },
    //   enableHiding: true,
    //   enableSorting: true,
    // },
    {
      id: "ig",
      header: "Ignition",
      cell: ({ row }) => {
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
              stroke-width="0"
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
      // Small timeout to ensure drawer has opened
      const timer = setTimeout(() => {
        document.body.style.pointerEvents = "auto";
      }, 0);

      return () => {
        clearTimeout(timer);
        // Reset to default when drawer closes
        document.body.style.pointerEvents = "";
      };
    } else {
      // Ensure body pointer events are reset when drawer closes
      document.body.style.pointerEvents = "";
    }
  }, [isDrawerOpen]);

  // Handler for table row clicks
  const handleRowClick = useCallback((device: DeviceData) => {
    setSelectedVehicleId(device.deviceId);
    setSelectedDevice(device);
    setIsDrawerOpen(true);
  }, []);

  // ✅ Function to get row styling based on selection
  const getRowClassName = useCallback(
    (device: DeviceData) => {
      const baseClasses =
        "cursor-pointer transition-colors duration-200 hover:bg-gray-50";
      const selectedClasses =
        "bg-blue-100 hover:bg-blue-200 border-l-4 border-blue-500";

      return device.deviceId === selectedVehicleId
        ? `${baseClasses} ${selectedClasses}`
        : baseClasses;
    },
    [selectedVehicleId]
  );

  // Handle view state changes - Simple toggle pattern
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
      // Batch state updates for better performance
      setSelectedVehicleId(device.deviceId);
      setSelectedDevice(device);
      setIsDrawerOpen(true);

      // Queue for high priority geocoding
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

  // Effect for queueing visible devices
  useEffect(() => {
    queueVisibleDevicesForGeocoding();
  }, [queueVisibleDevicesForGeocoding]);

  // Effect for queueing selected device
  useEffect(() => {
    queueSelectedDeviceForGeocoding();
  }, [queueSelectedDeviceForGeocoding]);
  // Get dynamic classes based on view state
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

  const visibleDevices = useMemo(() => {
    if (!devices || devices.length === 0) return [];

    const startIndex = pagination.pageIndex * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;
    return devices.slice(startIndex, endIndex);
  }, [devices, pagination.pageIndex, pagination.pageSize]);

  // server side pagination table instance
  const { table, tableElement } = CustomTableServerSidePagination({
    data: devices || [],
    columns,
    pagination,
    totalCount: devices?.total || 0,
    loading: isLoading,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    sorting,
    columnVisibility,
    onColumnVisibilityChange: setColumnVisibility,
    emptyMessage: "No students found",
    pageSizeOptions: [5, 10, 20, 30, 50],
    enableSorting: true,
    showSerialNumber: true,
    onRowClick: handleDeviceSelection,
    selectedRowId: selectedVehicleId,
    getRowId: (row: DeviceData) => row.deviceId, // Extract device ID
    selectedRowClassName:
      "bg-blue-100 hover:bg-blue-200 border-l-4 border-blue-500", // Custom selected style
  });

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
      `}</style>
      <ResponseLoader isLoading={isLoading} />
      <div>
        <div className="flex justify-between">
          <div className="flex items-center gap-3">
            <Input placeholder="Search bus number" className="flex-1" />
            <ColumnVisibilitySelector
              columns={table.getAllColumns()}
              buttonVariant="outline"
              buttonSize="default"
            />
          </div>

          {/* Device/Status Count */}
          <div className="flex gap-3 mb-2">
            {counts.map((countObj, index) => {
              const [key, value] = Object.entries(countObj)[0];
              const label = key.charAt(0).toUpperCase() + key.slice(1);
              return (
                <button
                  key={index}
                  className={`
          inline-flex items-center justify-center
          ${statusColors[label]}
          text-white font-semibold text-sm
          px-4 py-2.5 rounded-lg
          shadow-md hover:shadow-lg
          transform transition-all duration-200 ease-in-out
          hover:scale-105 active:scale-95
          focus:outline-none focus:ring-4 focus:ring-opacity-50
          border-0
          min-w-[120px]
          cursor-pointer
          select-none
          relative
          overflow-hidden
          group
        `}
                  type="button"
                  aria-label={`${label} count: ${value}`}
                >
                  {/* Shimmer effect on hover */}
                  <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:translate-x-full transition-transform duration-700 ease-out" />

                  {/* Content */}
                  <span className="relative z-10 flex items-center gap-2">
                    {/* Text content */}
                    <span className="font-medium">{label}</span>

                    {/* Count badge */}
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
          {/* Split Layout with Arrow Controls */}
          <div className="flex gap-2 h-[600px]">
            {/* Left Side - Table */}

            <section className={`overflow-auto ${getTableClass}`}>
              {viewState !== "mapExpanded" && (
                <div className="h-full">{tableElement}</div>
              )}
            </section>

            {/* Arrow Controls */}
            <div className="flex flex-col justify-center items-center bg-gray-100 rounded-lg p-2 space-y-2">
              {/* Left Arrow - Expand Map */}
              <button
                onClick={handleExpandMap}
                className={`p-2 rounded-full border border-gray-300 hover:bg-gray-200 transition-colors duration-200 cursor-pointer ${
                  viewState === "mapExpanded"
                    ? "bg-blue-100 border-blue-300 text-blue-600"
                    : "bg-white text-gray-600"
                }`}
                title={viewState === "mapExpanded" ? "Show both" : "Expand map"}
              >
                <MoveLeft className="w-4 h-4" />
              </button>

              {/* Divider */}
              <div className="h-px w-8 bg-gray-300"></div>

              {/* Right Arrow - Expand Table */}
              <button
                onClick={handleExpandTable}
                className={`p-2 rounded-full border border-gray-300 hover:bg-gray-200 transition-colors duration-200 cursor-pointer ${
                  viewState === "tableExpanded"
                    ? "bg-blue-100 border-blue-300 text-blue-600"
                    : "bg-white text-gray-600"
                }`}
                title={
                  viewState === "tableExpanded" ? "Show both" : "Expand table"
                }
              >
                <MoveRight className="w-4 h-4" />
              </button>
            </div>

            {/* Right Side - Map */}
            <section className={`${getMapClass} rounded-lg overflow-hidden`}>
              {viewState !== "tableExpanded" && (
                <VehicleMap
                  vehicles={devices}
                  height="100%"
                  // onVehicleClick={handleVehicleClick}
                  autoFitBounds={false}
                  showTrails={false} // Set to true if you want to show vehicle paths
                  clusterMarkers={devices.length > 100} // Enable clustering for many vehicles
                  zoom={6}
                  selectedVehicleId={selectedVehicleId}
                  onVehicleSelect={setSelectedVehicleId}
                />
              )}
            </section>
          </div>
        </div>
      </div>
      {/* Drawer */}
      <div>
        <Drawer
          open={isDrawerOpen}
          onOpenChange={setIsDrawerOpen}
          modal={false}
        >
          {/* <DrawerTrigger>Open</DrawerTrigger> */}
          <DrawerPortal>
            <DrawerOverlay className="pointer-events-none bg-transparent" />
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle className="flex justify-between items-center">
                  {selectedDevice && `${selectedDevice.name}`}
                  <div className="mr-4">
                    <button className="rounded-sm mr-1 text-primary border border-primary px-2 py-1 hover:bg-primary hover:text-white transition-colors duration-200 cursor-pointer">
                      Track
                    </button>
                    <button className="rounded-sm mr-1 text-primary border border-primary px-2 py-1 hover:bg-primary hover:text-white transition-colors duration-200 cursor-pointer">
                      History
                    </button>
                  </div>
                </DrawerTitle>

                <DrawerClose
                  className="absolute top-10 right-1 rounded-sm text-white border border-primary px-2 py-1 bg-primary hover:bg-[#b4931b] transition-colors duration-200 cursor-pointer"
                  aria-label="Close"
                >
                  X
                </DrawerClose>
              </DrawerHeader>
              <div className="h-px bg-primary"></div>
              <div className="p-4 space-y-4">
                {selectedDevice ? (
                  <>
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <label className="flex items-center gap-2">
                          <img
                            src="/dashboard-icons/speed.svg"
                            className="w-6"
                            alt=""
                          />{" "}
                          <span className="text-stone-600">Speed</span>
                        </label>
                        <p className="ml-8">
                          {selectedDevice?.speed.toFixed(2) + " km/h" || "N/A"}
                        </p>
                      </div>
                      <div>
                        <label className="flex items-center gap-2">
                          <img
                            src="/dashboard-icons/odometer.svg"
                            className="w-6"
                            alt=""
                          />{" "}
                          <span className="text-stone-600">Odometer</span>
                        </label>
                        <p className="ml-8">
                          {(
                            selectedDevice?.attributes?.totalDistance / 1000
                          ).toFixed(2) + " km/h" || "N/A"}
                        </p>
                      </div>
                      <div>
                        <label className="flex items-center gap-2">
                          <img
                            src="/dashboard-icons/todays-distance.svg"
                            className="w-6"
                            alt=""
                          />{" "}
                          <span className="text-stone-600">
                            Today's Distance
                          </span>
                        </label>
                        <p className="ml-8">
                          {(
                            selectedDevice?.attributes?.todayDistance / 1000
                          ).toFixed(2) + " km/h" || "N/A"}
                        </p>
                      </div>
                      <div>
                        <label className="flex items-center gap-2">
                          <img
                            src="/dashboard-icons/todays-distance.svg"
                            className="w-6"
                            alt=""
                          />{" "}
                          <span className="text-stone-600">Co-ordinates</span>
                        </label>
                        <Link
                          href={`https://www.google.com/maps?q=${selectedDevice?.latitude},${selectedDevice?.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          <p className="ml-8 text-blue-700">
                            {`${selectedDevice?.latitude}, ${selectedDevice?.longitude}` ||
                              "N/A"}
                          </p>
                        </Link>
                      </div>
                      <div>
                        <label className="flex items-center gap-2">
                          <img
                            src="/dashboard-icons/last-update.svg"
                            className="w-6"
                            alt=""
                          />{" "}
                          <span className="text-stone-600">Last Update</span>
                        </label>

                        <p className="ml-8 ">
                          {`${new Date(
                            selectedDevice.lastUpdate
                          ).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}` || "N/A"}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <p>No device selected</p>
                )}
              </div>
            </DrawerContent>
          </DrawerPortal>
        </Drawer>
      </div>
    </>
  );
}
