"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { bleService } from "@/services/api/bleService";
import { useDebounce } from "@/hooks/useDebounce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DateRangeFilter from "@/components/ui/DateRangeFilter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Search,
  RefreshCw,
  X,
  ExternalLink,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
  BellRing,
  MapPin,
  User,
  Phone,
  CheckCircle2,
  Calendar,
  Filter,
  Shield,
} from "lucide-react";
import { toast } from "sonner";

export interface GeofenceAlertItem {
  _id: string;
  fenceName: string;
  eventType: "ENTER" | "EXIT" | string;
  schoolName?: string;
  branchName?: string;
  childName?: string;
  parentName?: string;
  parentMobile?: string;
  sn?: string;
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
  distanceFromCenter?: number;
  childId?: {
    _id: string;
    childName?: string;
    parentId?: {
      _id: string;
      parentName?: string;
      mobileNo?: string;
    };
  } | string;
  notifiedParents?: Array<{
    parentName?: string;
    tokensSentCount?: number;
    [key: string]: any;
  }>;
  createdAt: string;
  [key: string]: any;
}

interface GeofenceAlertHistoryViewProps {
  filterDevice?: any | null;
  onBack: () => void;
}

export default function GeofenceAlertHistoryView({
  filterDevice,
  onBack,
}: GeofenceAlertHistoryViewProps) {
  const [alerts, setAlerts] = useState<GeofenceAlertItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(20);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Filters
  const [search, setSearch] = useState<string>("");
  const debouncedSearch = useDebounce(search, 400);
  const [selectedFenceId, setSelectedFenceId] = useState<string>("ALL");
  const [availableFences, setAvailableFences] = useState<Array<{ _id: string; name: string }>>([]);
  const [isLoadingFences, setIsLoadingFences] = useState<boolean>(false);
  const [eventType, setEventType] = useState<"ALL" | "ENTER" | "EXIT">("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });

  // Reset to first page when debounced search query changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  // Extract filter device details if present
  const rawDev = filterDevice?.rawBleDevice || filterDevice;
  const filterChild =
    typeof rawDev?.childId === "object"
      ? rawDev?.childId
      : typeof filterDevice?.childId === "object"
      ? filterDevice?.childId
      : null;

  const childId =
    filterChild?._id ||
    (typeof rawDev?.childId === "string" ? rawDev?.childId : null) ||
    (typeof filterDevice?.childId === "string" ? filterDevice?.childId : null);

  const childName =
    filterChild?.childName ||
    filterDevice?.childName ||
    rawDev?.childName ||
    "";

  const sn =
    filterDevice?.uniqueId ||
    filterDevice?.imei ||
    rawDev?.sn ||
    rawDev?.uniqueId ||
    "";

  const schoolId =
    typeof rawDev?.schoolId === "object"
      ? rawDev?.schoolId?._id
      : rawDev?.schoolId || filterDevice?.schoolId;
  const branchId =
    typeof rawDev?.branchId === "object"
      ? rawDev?.branchId?._id
      : rawDev?.branchId || filterDevice?.branchId;

  // Preload any geofence attached directly to the device
  useEffect(() => {
    const preloaded: Array<{ _id: string; name: string }> = [];
    const gf =
      rawDev?.geofence ||
      rawDev?.geofenceId ||
      filterDevice?.geofence ||
      filterDevice?.geofenceId;
    if (gf && typeof gf === "object" && (gf._id || gf.id)) {
      preloaded.push({
        _id: String(gf._id || gf.id),
        name: String(gf.geofenceName || gf.name || "Geofence"),
      });
    }
    const gfs = rawDev?.geofences || filterDevice?.geofences;
    if (Array.isArray(gfs)) {
      gfs.forEach((item: any) => {
        if (item && typeof item === "object" && (item._id || item.id)) {
          const id = String(item._id || item.id);
          if (!preloaded.some((p) => p._id === id)) {
            preloaded.push({
              _id: id,
              name: String(item.geofenceName || item.name || "Geofence"),
            });
          }
        }
      });
    }
    if (preloaded.length > 0) {
      setAvailableFences(preloaded);
    }
  }, [rawDev, filterDevice]);

  // Fetch student's geofences
  useEffect(() => {
    let isMounted = true;
    const loadFences = async () => {
      try {
        setIsLoadingFences(true);
        const params: Record<string, any> = { limit: 100 };
        if (childId) params.childId = childId;
        if (sn) params.sn = sn;
        if (schoolId) params.schoolId = schoolId;
        if (branchId) params.branchId = branchId;

        let res = await bleService.getBleGeofences(params);
        let list: any[] =
          res?.fences ||
          res?.data?.fences ||
          (Array.isArray(res?.data) ? res.data : []) ||
          (Array.isArray(res) ? res : []);

        // Fallback search if empty with strict parameters
        if (list.length === 0 && (sn || (childName && childName !== "Child"))) {
          const fallbackRes = await bleService.getBleGeofences({
            limit: 100,
            search: sn || (childName !== "Child" ? childName : undefined),
          });
          const fallbackList =
            fallbackRes?.fences ||
            fallbackRes?.data?.fences ||
            (Array.isArray(fallbackRes?.data) ? fallbackRes.data : []) ||
            (Array.isArray(fallbackRes) ? fallbackRes : []);
          if (fallbackList.length > 0) {
            list = fallbackList;
          }
        }

        if (isMounted) {
          const mapped = list
            .filter((f: any) => f && (f._id || f.id))
            .map((f: any) => ({
              _id: String(f._id || f.id),
              name: String(f.name || f.geofenceName || f.fenceName || "Unnamed Geofence"),
            }));

          const uniqueMap = new Map<string, string>();
          mapped.forEach((m: { _id: string; name: string }) => uniqueMap.set(m._id, m.name));

          const uniqueList = Array.from(uniqueMap.entries()).map(([_id, name]) => ({
            _id,
            name,
          }));
          setAvailableFences(uniqueList);
        }
      } catch (e) {
        console.warn("Failed to load geofences for alert history:", e);
      } finally {
        if (isMounted) setIsLoadingFences(false);
      }
    };

    loadFences();
    return () => {
      isMounted = false;
    };
  }, [childId, sn, childName, schoolId, branchId]);

  // Today in YYYY-MM-DD local format to block future dates
  const today = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  // Fetch alert history
  const fetchAlertHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, any> = {
        page,
        limit,
      };

      if (childId) params.childId = childId;
      if (sn) params.sn = sn;
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (eventType !== "ALL") params.eventType = eventType;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (selectedFenceId !== "ALL") {
        params.fenceId = selectedFenceId;
        params.geofenceId = selectedFenceId;
        const matchingFence = availableFences.find((f) => f._id === selectedFenceId);
        if (matchingFence?.name) {
          params.fenceName = matchingFence.name;
        }
      }

      const res = await bleService.getBleGeofenceAlerts(params);
      let list: GeofenceAlertItem[] =
        res?.alerts ||
        res?.data?.alerts ||
        (Array.isArray(res?.data) ? res.data : []) ||
        (Array.isArray(res) ? res : []);

      // If backend did not filter by fenceId, apply client-side safeguard
      if (selectedFenceId !== "ALL") {
        const matchingFence = availableFences.find((f) => f._id === selectedFenceId);
        const targetName = (matchingFence?.name || "").toLowerCase().trim();

        const hasMismatched = list.some((a) => {
          const fid = String(
            (typeof a.fenceId === "object" ? a.fenceId?._id : a.fenceId) ||
            (typeof a.geofenceId === "object" ? a.geofenceId?._id : a.geofenceId) ||
            (typeof a.geofence === "object" ? a.geofence?._id : a.geofence) ||
            ""
          );
          const fname = (a.fenceName || a.geofenceName || "").toLowerCase().trim();
          return (fid && fid !== selectedFenceId) || (targetName && fname && fname !== targetName);
        });

        if (hasMismatched) {
          list = list.filter((a) => {
            const fid = String(
              (typeof a.fenceId === "object" ? a.fenceId?._id : a.fenceId) ||
              (typeof a.geofenceId === "object" ? a.geofenceId?._id : a.geofenceId) ||
              (typeof a.geofence === "object" ? a.geofence?._id : a.geofence) ||
              ""
            );
            const fname = (a.fenceName || a.geofenceName || "").toLowerCase().trim();
            if (fid && fid === selectedFenceId) return true;
            if (targetName && fname && fname === targetName) return true;
            return false;
          });
        }
      }

      const totalCount =
        selectedFenceId !== "ALL" && list.length !== (res?.total ?? res?.data?.total)
          ? list.length
          : res?.total ?? res?.data?.total ?? list.length;
      const pagesCount =
        res?.totalPages ??
        res?.data?.totalPages ??
        Math.max(1, Math.ceil(totalCount / limit));

      setAlerts(list);
      setTotal(totalCount);
      setTotalPages(pagesCount);
    } catch (err: any) {
      console.error("Failed to fetch geofence alert history:", err);
      toast.error("Failed to load geofence alerts", {
        description:
          err?.response?.data?.message || err?.message || "Server error",
      });
      setAlerts([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [
    page,
    limit,
    childId,
    sn,
    debouncedSearch,
    eventType,
    startDate,
    endDate,
    selectedFenceId,
    availableFences,
  ]);

  useEffect(() => {
    fetchAlertHistory();
  }, [fetchAlertHistory]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchAlertHistory();
  };

  const handleDateRangeChange = (start: Date | null, end: Date | null) => {
    setDateRange({ start, end });
    const startStr = start
      ? `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`
      : "";
    const endStr = end
      ? `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`
      : "";
    setStartDate(startStr);
    setEndDate(endStr);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearch("");
    setSelectedFenceId("ALL");
    setEventType("ALL");
    setDateRange({ start: null, end: null });
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    search.trim() ||
      eventType !== "ALL" ||
      startDate ||
      endDate ||
      selectedFenceId !== "ALL"
  );

  const formatDate = (isoString: string) => {
    if (!isoString) return "-";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return isoString;
    }
  };

  const formatTime = (isoString: string) => {
    if (!isoString) return "-";
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
    } catch {
      return "";
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 space-y-4">
      {/* Top Navigation & Context Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onBack}
            className="gap-1.5 h-9 text-xs font-medium cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to GeoTags</span>
          </Button>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Geofence Alert History
              </h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                {total} {total === 1 ? "Alert" : "Alerts"}
              </span>
            </div>

            {filterDevice && (
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                <span>Filter applied:</span>
                {childName && (
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {childName}
                  </span>
                )}
                {sn && (
                  <span className="font-mono text-slate-400">
                    (SN: {sn})
                  </span>
                )}
                {selectedFenceId !== "ALL" && (
                  <span className="inline-flex items-center gap-1 font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                    <Shield className="w-3 h-3 text-amber-600" />
                    {availableFences.find((f) => f._id === selectedFenceId)?.name || "Selected Geofence"}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
            className="gap-2 h-9 text-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Filter Controls Tile */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Universal Search */}
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder="Search fence, child, parent, address..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
              }}
              className="pl-9 pr-8 h-9 text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus-visible:ring-amber-500"
            />
            {search !== debouncedSearch ? (
              <Loader2 className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-amber-500 animate-spin" />
            ) : search ? (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </div>

          {/* Student Geofence Dropdown Filter */}
          <div className="w-[180px] sm:w-[220px]">
            <Select
              value={selectedFenceId}
              onValueChange={(val) => {
                setSelectedFenceId(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-full text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus-visible:ring-amber-500">
                <div className="flex items-center gap-1.5 truncate">
                  <Shield className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <SelectValue placeholder="All Geofences" />
                </div>
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="ALL" className="text-xs">
                  All Geofences {availableFences.length > 0 ? `(${availableFences.length})` : ""}
                </SelectItem>
                {availableFences.map((fence) => (
                  <SelectItem key={fence._id} value={fence._id} className="text-xs">
                    {fence.name}
                  </SelectItem>
                ))}
                {availableFences.length === 0 && (
                  <div className="px-2 py-1.5 text-xs text-slate-400 italic">
                    {isLoadingFences ? "Loading geofences..." : "No geofences found"}
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Event Type Toggle */}
          <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-900 h-9">
            <button
              type="button"
              onClick={() => {
                setEventType("ALL");
                setPage(1);
              }}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                eventType === "ALL"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              All Events
            </button>
            <button
              type="button"
              onClick={() => {
                setEventType("ENTER");
                setPage(1);
              }}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                eventType === "ENTER"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Enter</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEventType("EXIT");
                setPage(1);
              }}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                eventType === "EXIT"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Exit</span>
            </button>
          </div>

          {/* DateRangeFilter Preset Dropdown */}
          <div className="w-[200px] sm:w-[240px] [&>button]:h-9 [&>button]:text-xs [&>button]:bg-slate-50 [&>button]:dark:bg-slate-900 [&>button]:border-slate-200 [&>button]:dark:border-slate-700">
            <DateRangeFilter
              onDateRangeChange={handleDateRangeChange}
              title="Search by Date"
              defaultStartDate={dateRange.start}
              defaultEndDate={dateRange.end}
            />
          </div>

          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="h-9 text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              Clear Filters
            </Button>
          )}
        </div>

        <div className="text-xs text-slate-400 font-mono self-center xl:self-auto">
          Showing {alerts.length} of {total} records
        </div>
      </div>

      {/* Full Page Table Section (No Map) */}
      <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 overflow-x-auto overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-semibold sticky top-0 z-10">
              <tr>
                <th className="py-3 px-4 whitespace-nowrap">Event</th>
                <th className="py-3 px-4 whitespace-nowrap">Geofence Name</th>
                <th className="py-3 px-4 whitespace-nowrap">Child</th>
                <th className="py-3 px-4 whitespace-nowrap">Parent & Contact</th>
                <th className="py-3 px-4 whitespace-nowrap">Serial Number (SN)</th>
                <th className="py-3 px-4 whitespace-nowrap">Distance</th>
                <th className="py-3 px-4 min-w-[200px]">Recorded Location</th>
                <th className="py-3 px-4 whitespace-nowrap">Notification Status</th>
                <th className="py-3 px-4 whitespace-nowrap text-right">Date & Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
                      <span>Loading geofence alerts...</span>
                    </div>
                  </td>
                </tr>
              ) : alerts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                        <BellRing className="w-5 h-5" />
                      </div>
                      <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
                        No Geofence Alerts Found
                      </p>
                      <p className="text-xs text-slate-400">
                        {hasActiveFilters
                          ? "No records match the selected filter criteria. Try resetting your search or dates."
                          : "No geofence entry or exit events recorded for the selected device."}
                      </p>
                      {hasActiveFilters && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleClearFilters}
                          className="mt-2 text-xs"
                        >
                          Clear Filters
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                alerts.map((alert) => {
                  const isExit = (alert.eventType || "").toUpperCase() === "EXIT";
                  const lat = Number(alert.location?.lat);
                  const lng = Number(alert.location?.lng);
                  const hasCoords =
                    !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;

                  return (
                    <tr
                      key={alert._id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors"
                    >
                      {/* Event Type */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                            isExit
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {isExit ? (
                            <ArrowUpRight className="w-3 h-3 text-rose-600" />
                          ) : (
                            <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                          )}
                          <span>{isExit ? "EXIT" : "ENTER"}</span>
                        </span>
                      </td>

                      {/* Fence Name */}
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {alert.fenceName || "Perimeter"}
                      </td>

                      {/* Child */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {alert.childName ? (
                          <div className="flex items-center gap-1.5 font-medium">
                            <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span>{alert.childName}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Parent & Contact */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {alert.parentName ? (
                          <div>
                            <div className="font-medium text-slate-800 dark:text-slate-200">
                              {alert.parentName}
                            </div>
                            {alert.parentMobile && (
                              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                <span>{alert.parentMobile}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Tag SN */}
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {alert.sn || "-"}
                      </td>

                      {/* Distance */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {alert.distanceFromCenter != null ? (
                          <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {alert.distanceFromCenter}m from center
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Recorded Location Address + Google Maps Link (No embedded map) */}
                      <td className="py-3 px-4">
                        <div className="flex items-start gap-1.5 max-w-sm">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="line-clamp-2 text-slate-700 dark:text-slate-300">
                              {alert.location?.address || "GPS Location logged"}
                            </div>
                            {hasCoords && (
                              <a
                                href={`https://www.google.com/maps?q=${lat},${lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 hover:underline mt-0.5"
                                title="Open in Google Maps"
                              >
                                <span>{lat.toFixed(5)}, {lng.toFixed(5)}</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Notification Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {alert.notifiedParents && alert.notifiedParents.length > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>
                              Notified (
                              {alert.notifiedParents
                                .map((p) => p.parentName || "Parent")
                                .join(", ")}
                              )
                            </span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">No push log</span>
                        )}
                      </td>

                      {/* Date & Time */}
                      <td className="py-3 px-4 whitespace-nowrap text-right">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {formatTime(alert.createdAt)}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {formatDate(alert.createdAt)}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Server-Side Pagination Bar */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span>
              Page {page} of {totalPages} ({total} total alerts)
            </span>
            <div className="flex items-center gap-1.5">
              <span>Rows per page:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="h-8 text-xs rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2 cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 px-3 text-xs cursor-pointer gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages || isLoading}
              onClick={() => setPage((p) => p + 1)}
              className="h-8 px-3 text-xs cursor-pointer gap-1"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
