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
// import SubscriptionExpiry from "@/components/dashboard/SubscriptionExpiry/SubscriptionExpiry";
import { getLiveVehicleColumns } from "@/components/columns/columns";
import { RouteTimeline } from "@/components/dashboard/route/route-timeline";
import { useSubscriptionExpiry } from "@/hooks/subscription/useSubscription";
import { SubscriptionExpiry } from "@/components/dashboard/SubscriptionExpiry/SubscriptionExpiry";

type ViewState = "split" | "tableExpanded" | "mapExpanded";
type StatusFilter = "all" | "running" | "idle" | "stopped" | "inactive" | "new";

// Local storage key for subscription popup
const SUBSCRIPTION_POPUP_KEY = "subscription_popup_shown";

export default function DashboardClient() {
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
    uniqueId: number;
    name: string;
  }>({
    uniqueId: 0,
    name: "",
  });
  const [isRouteTimelineOpen, setIsRouteTimelineOpen] = useState(false);
  const [routeTimelineData, setRouteTimelineData] = useState<{
    uniqueId: string;
    deviceName: string;
    routeObjId?: string;
  } | null>(null);

  const handleOpenRouteTimeline = useCallback(
    (uniqueId: string, deviceName: string, routeObjId?: string) => {
      setRouteTimelineData({ uniqueId, deviceName, routeObjId });
      setIsRouteTimelineOpen(true);
    },
    []
  );

  // Active status filter
  const [activeStatus, setActiveStatus] = useState<StatusFilter>("all");

  // Subscription expiry popup state
  const [showSubscriptionPopup, setShowSubscriptionPopup] = useState(false);

  const { addresses, loadingAddresses, queueForGeocoding } =
    useReverseGeocode();

  const statusColors: Record<string, string> = {
    Running:
      "bg-green-400 text-green-700 hover:bg-green-500 transition-all rounded-lg shadow-sm hover:shadow",
    Overspeed:
      "bg-orange-400 text-orange-700 hover:bg-orange-500 transition-all rounded-lg shadow-sm hover:shadow",
    Idle: "bg-yellow-200 text-yellow-700 hover:bg-yellow-200 transition-all rounded-lg shadow-sm hover:shadow",
    Stopped:
      "bg-red-400 text-red-700 hover:bg-red-500 transition-all rounded-lg shadow-sm hover:shadow",
    Inactive:
      "bg-gray-400 text-gray-700 hover:bg-gray-500 transition-all rounded-lg shadow-sm hover:shadow",
    New: "bg-blue-400 text-blue-700 hover:bg-blue-500 transition-all rounded-lg shadow-sm hover:shadow",
    Total:
      "bg-purple-400 text-purple-700 hover:bg-purple-500 transition-all rounded-lg shadow-sm hover:shadow",
  };

  const { devices, counts, isLoading, updateFilters, currentPage, limit } =
    useLiveDeviceData();

  const { expiredBranches, expiredBranchesCount } = useSubscriptionExpiry(
    showSubscriptionPopup
  );
  // console.log(
  //   "🚀 ~ file: DashboardClient.tsx:261 ~ expiredBranchesCount:",
  //   expiredBranchesCount
  // );
  // console.log(
  //   "🚀 ~ file: DashboardClient.tsx:261 ~ expiredBranches:",
  //   expiredBranches
  // );

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

  // Combined useEffect for cleanup and subscription popup logic
  useEffect(() => {
    // Check localStorage to see if popup has been shown before
    const hasPopupBeenShown = localStorage.getItem(SUBSCRIPTION_POPUP_KEY);
    updateFilters({ page: 1, limit: 10, filter: "all", searchTerm: "" });

    if (!hasPopupBeenShown) {
      // If no value exists in localStorage, show the popup
      setShowSubscriptionPopup(true);
    } else {
      // If value exists, don't show the popup
      setShowSubscriptionPopup(false);
    }

    // Cleanup function for debounce timer
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

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
  const columns = getLiveVehicleColumns();

  useEffect(() => {
    if (isDrawerOpen) {
      const timer = setTimeout(() => {
        document.body.style.pointerEvents = "auto";
      }, 0);

      return () => {
        clearTimeout(timer);
        // document.body.style.pointerEvents = "";
      };
    } else {
      document.body.style.pointerEvents = "auto";
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

  const handleOpenLiveTrack = (uniqueId: number, name: string) => {
    setOpen(true);
    setSelectedImei({ uniqueId, name });
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

      onOpenRouteTimeline: handleOpenRouteTimeline,
    };
  }, [
    isDrawerOpen,
    setIsDrawerOpen,
    selectedDevice,
    addresses,
    loadingAddresses,
    handleOpenLiveTrack,

    handleOpenRouteTimeline,
  ]);

  const handleCloseSubscriptionPopup = () => {
    setShowSubscriptionPopup(false);
    // Mark that popup has been shown - this will persist across page navigation
    localStorage.setItem(SUBSCRIPTION_POPUP_KEY, "true");
  };

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

      {/* Main Dashboard Content */}
      <div className="relative min-h-screen bg-white">
        {/* Dashboard Content - Always visible in background */}
        <div>
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3 flex-1">
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

              {/* Added margin for spacing */}
              <div className="ml-4"></div>
            </div>

            {/* Device/Status Count Buttons with Filtering */}
            <div className="flex gap-3">
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

                  <button
                    onClick={handleExpandTable}
                    className={`p-2 rounded-full border border-gray-300 hover:bg-primary transition-all duration-200 cursor-pointer shadow-lg hover:shadow-xl hover:-translate-y-0.5  [animation-duration:_500ms] [animation:_fadeIn_300ms_ease-in_forwards] ${
                      viewState === "tableExpanded"
                        ? "bg-blue-100"
                        : "bg-white text-gray-600"
                    }`}
                    title={
                      viewState === "tableExpanded"
                        ? "Show both"
                        : "Expand table"
                    }
                  >
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

        <RouteTimeline
          isOpen={isRouteTimelineOpen}
          onOpenChange={setIsRouteTimelineOpen}
          uniqueId={routeTimelineData?.uniqueId}
          deviceName={routeTimelineData?.deviceName}
        />

        {/* Subscription Expiry Popup - Fixed to bottom-right corner */}
        {showSubscriptionPopup && (
          <SubscriptionExpiry
            isOpen={showSubscriptionPopup}
            onClose={handleCloseSubscriptionPopup}
            branches={expiredBranches}
          />
        )}
      </div>
    </>
  );
}
