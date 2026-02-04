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
import { useBranchDropdown, useSchoolDropdown } from "@/hooks/useDropdown";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ListFilter, X } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { Combobox } from "@/components/ui/combobox";

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
  const authRequestRef = useRef(false);
  const authRequestTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    routeName?: string;
    routeObjId?: string;
    schoolId?: string;
    branchId?: string;
  }>({
    uniqueId: 0,
    name: "",
    routeName: "",
    routeObjId: "",
    schoolId: "",
    branchId: "",
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

  const statusColors: Record<string, { default: string; active: string }> = {
    Running: {
      default:
        "bg-white text-green-600 border border-green-400 hover:bg-[#63be77] hover:text-white",
      active: "bg-[#63be77] text-white border border-green-400",
    },
    Overspeed: {
      default:
        "bg-white text-[#df6c1a] border border-[#df6c1a] hover:bg-[#df6c1a] hover:text-white",
      active: "bg-[#df6c1a] text-white border border-[#df6c1a]",
    },
    Idle: {
      default:
        "bg-white text-[#ffb20e] border border-[#ffb20e] hover:bg-[#ffb20e] hover:text-white",
      active: "bg-[#ffb20e] text-white border border-[#ffb20e]",
    },
    Stopped: {
      default:
        "bg-white text-[#ee6464] border border-[#ee6464] hover:bg-[#ee6464] hover:text-white",
      active: "bg-[#ee6464] text-white border border-[#ee6464]",
    },
    Inactive: {
      default:
        "bg-white text-[#949494] border border-[#949494] hover:bg-[#949494] hover:text-white",
      active: "bg-[#949494] text-white border border-[#949494]",
    },
    New: {
      default:
        "bg-white text-[#2196f3] border border-[#2196f3] hover:bg-[#2196f3] hover:text-white",
      active: "bg-[#2196f3] text-white border border-[#2196f3]",
    },
    Total: {
      default:
        "bg-white text-[#4eb4e1] border border-[#4eb4e1] hover:bg-[#4eb4e1] hover:text-white",
      active: "bg-[#4eb4e1] text-white border border-[#4eb4e1]",
    },
  };

  const {
    devices,
    counts,
    isLoading,
    updateFilters,
    currentPage,
    limit,
    isConnected,
    isAuthenticated,
    filters,
  } = useLiveDeviceData();

  const { decodedToken } = useAuthStore();
  const rawRole = (decodedToken?.role || "").toLowerCase();

  const userRole = useMemo(() => {
    if (["superadmin", "super_admin", "admin", "root"].includes(rawRole)) return "superadmin";
    if (["school", "schooladmin"].includes(rawRole)) return "school";
    if (["branch", "branchadmin"].includes(rawRole)) return "branch";
    if (["branchgroup"].includes(rawRole)) return "branchGroup";
    return rawRole;
  }, [rawRole]);

  console.log("🚀 ~ DashboardClient ~ userRole:", userRole, "rawRole:", rawRole);

  const userSchoolId = decodedToken?.schoolId || (userRole === "school" ? decodedToken?.id : undefined);

  const [isSchoolDropdownOpen, setIsSchoolDropdownOpen] = useState(false);
  const { data: schoolData } = useSchoolDropdown(isSchoolDropdownOpen);

  // Set initial filters based on role
  useEffect(() => {
    if (userRole === "school" || userRole === "branchGroup") {
      updateFilters({ schoolId: userSchoolId });
    }
  }, [userRole, userSchoolId, updateFilters]);

  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const { data: branchData } = useBranchDropdown(
    filters.schoolId,
    isBranchDropdownOpen,
    !filters.schoolId
  );

  console.log("🚀 ~ DashboardClient ~ filters:", filters);

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

  useEffect(() => {
    if (!isConnected || !isAuthenticated) {
      authRequestRef.current = false;
      if (authRequestTimeoutRef.current) {
        clearTimeout(authRequestTimeoutRef.current);
        authRequestTimeoutRef.current = null;
      }
      return;
    }

    if (authRequestRef.current) {
      return;
    }

    authRequestRef.current = true;
    authRequestTimeoutRef.current = setTimeout(() => {
      updateFilters({ page: filters.page, limit: filters.limit });
    }, 1000);

    return () => {
      if (authRequestTimeoutRef.current) {
        clearTimeout(authRequestTimeoutRef.current);
        authRequestTimeoutRef.current = null;
      }
    };
  }, [
    isConnected,
    isAuthenticated,
    updateFilters,
    filters.page,
    filters.limit,
  ]);

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

  const handleOpenLiveTrack = (uniqueId: number, name: string, routeName?: string, routeObjId?: string, schoolId?: string, branchId?: string) => {
    setOpen(true);
    setSelectedImei({ uniqueId, name, routeName, routeObjId, schoolId, branchId });
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
    pageSizeOptions: [5, 10, 20, 30, 50, 100, 500, "All"],
    enableSorting: true,
    showSerialNumber: true,
    onRowClick: handleDeviceSelection,
    selectedRowId: selectedVehicleId,
    getRowId: (row: DeviceData) => row.deviceId,
    selectedRowClassName:
      "bg-blue-100 hover:bg-blue-200 border-l-4 border-blue-500",
    // Enable virtualization
    enableVirtualization: true,
    estimatedRowHeight: 20,
    overscan: 5,
    maxHeight: "calc(100vh - 200px)",
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
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 mb-4">
            <div className="flex items-center gap-2 sm:gap-3 w-full lg:w-auto">
              <Input
                placeholder="Search bus number or name..."
                className="flex-1 min-w-0 lg:min-w-[200px] xl:min-w-[250px]"
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
              <ColumnVisibilitySelector
                columns={table.getAllColumns()}
                buttonVariant="outline"
                buttonSize="default"
              />

              {userRole !== "branch" && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-10 gap-2 ml-2 cursor-pointer">
                      <ListFilter className="h-4 w-4" />
                      Filters
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" align="end">
                    <div className="space-y-4">
                      {/* School Dropdown */}
                      {userRole === "superadmin" && (
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm leading-none mb-2">School</h4>
                          <Combobox
                            items={[
                              { label: "All Schools", value: "all" },
                              ...(schoolData?.map((school: any) => ({
                                label: school.schoolName,
                                value: school._id,
                              })) || []),
                            ]}
                            value={filters.schoolId || "all"}
                            onValueChange={(value) =>
                              updateFilters({
                                schoolId: value === "all" ? undefined : value,
                                branchId: undefined, // Reset branch when school changes
                              })
                            }
                            onOpenChange={setIsSchoolDropdownOpen}
                            placeholder="Select School"
                            searchPlaceholder="Search school..."
                            width="w-full"
                          />
                        </div>
                      )}

                      {/* Branch Dropdown */}
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm leading-none mb-2">Branch</h4>
                        <Combobox
                          items={[
                            { label: "All Branches", value: "all" },
                            ...(branchData?.map((branch: any) => ({
                              label: branch.branchName,
                              value: branch._id,
                            })) || []),
                          ]}
                          value={filters.branchId || "all"}
                          onValueChange={(value) =>
                            updateFilters({ branchId: value === "all" ? undefined : value })
                          }
                          onOpenChange={setIsBranchDropdownOpen}
                          placeholder="Select Branch"
                          searchPlaceholder="Search branch..."
                          width="w-full"
                        />
                      </div>

                      {/* Clear Filters Button */}
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-muted-foreground hover:text-foreground cursor-pointer"
                        onClick={() =>
                          updateFilters({
                            schoolId:
                              userRole === "school" || userRole === "branchGroup"
                                ? userSchoolId
                                : undefined,
                            branchId: undefined,
                          })
                        }
                      >
                        <X className="mr-2 h-4 w-4" />
                        Clear Filters
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              )}

              {/* Added margin for spacing */}
              <div className="ml-4"></div>
            </div>

            {/* Device/Status Count Buttons with Filtering */}
            <div className="flex flex-wrap gap-2 w-full lg:w-auto">
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
                      ${isActive
                        ? statusColors[label].active
                        : statusColors[label].default
                      }
                      font-semibold text-[9px] sm:text-[10px]
                      px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg
                      shadow-md hover:shadow-lg
                      transform transition-all duration-200 ease-in-out
                      hover:scale-105 active:scale-95
                      focus:outline-none focus:ring-4 focus:ring-opacity-50
                      min-w-[40px] sm:min-w-[60px] max-w-[100px]
                      cursor-pointer
                      select-none
                      relative
                      overflow-hidden
                      group
                      ${isActive
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
            <div className="flex flex-col lg:flex-row gap-2 lg:gap-0 h-auto lg:h-[80vh] xl:h-[85vh]">
              <section className={`overflow-auto min-h-[300px] lg:min-h-0 ${getTableClass}`}>
                {viewState === "mapExpanded" && (
                  <div className="absolute top-1/2 left-0 z-50 hidden lg:block">
                    <button
                      onClick={handleExpandTable}
                      className={`p-2 rounded-full border border-gray-300 hover:bg-primary transition-all duration-200 cursor-pointer shadow-lg hover:shadow-xl hover:-translate-y-0.5  ${viewState === "mapExpanded"
                        ? "bg-blue-100"
                        : "bg-white text-gray-600"
                        }`}
                      title={"Expand table"}
                    >
                      <ChevronsRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {viewState !== "mapExpanded" && <div className="min-h-[300px] lg:min-h-0">{tableElement}</div>}
              </section>

              {/* Arrow Controls - hidden on mobile */}
              {!["tableExpanded", "mapExpanded"].includes(viewState) && (
                <div className="hidden lg:flex flex-col justify-center items-center space-y-2 z-50 absolute top-1/2 right-[48.5%]">
                  <button
                    onClick={handleExpandMap}
                    className={`p-2 rounded-full border border-gray-300 hover:bg-primary transition-all duration-200 cursor-pointer shadow-lg hover:shadow-xl hover:-translate-y-0.5 [animation-duration:_300ms] [animation:_fadeIn_300ms_ease-in_forwards] ${viewState === "mapExpanded"
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
                    className={`p-2 rounded-full border border-gray-300 hover:bg-primary transition-all duration-200 cursor-pointer shadow-lg hover:shadow-xl hover:-translate-y-0.5  [animation-duration:_500ms] [animation:_fadeIn_300ms_ease-in_forwards] ${viewState === "tableExpanded"
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
              <section className={`${getMapClass} rounded-lg overflow-hidden min-h-[300px] lg:min-h-0`}>
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
                    activeFilter={activeStatus}
                  />
                )}
                {viewState === "tableExpanded" && (
                  <div className="absolute top-1/2 right-2 z-50 hidden lg:block">
                    <button
                      onClick={handleExpandMap}
                      className={`p-2 rounded-full border border-gray-300 hover:bg-primary transition-all duration-200 cursor-pointer shadow-lg hover:shadow-xl hover:-translate-y-0.5  ${viewState === "mapExpanded"
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
