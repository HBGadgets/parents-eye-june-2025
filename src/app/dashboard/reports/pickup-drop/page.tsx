"use client";

import React, { useCallback, useEffect, useState, useMemo } from "react";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";
import { TravelTable } from "@/components/travel-summary/TravelTable";
import DateRangeFilter from "@/components/ui/DateRangeFilter";
import type { ColumnDef } from "@tanstack/table-core";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { api } from "@/services/apiService";
import { useExport } from "@/hooks/useExport";
import ResponseLoader from "@/components/ResponseLoader";
import { ColumnVisibilitySelector } from "@/components/column-visibility-selector";
import { Combobox } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  useSchoolDropdown,
  useBranchDropdown,
  useRouteDropdown,
  useDeviceDropdown,
} from "@/hooks/useDropdown";
import { FilterX, Download, Search, X } from "lucide-react";
import { FaPlus, FaMinus } from "react-icons/fa";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { formatDateToYYYYMMDD } from "@/util/formatDate";
import { useDebounce } from "@/hooks/useDebounce";

type VisibilityState = Record<string, boolean>;

type DecodedToken = {
  role: string;
  schoolId?: string;
  id?: string;
  branchId?: string;
  username?: string;
};

export interface PickupDropRecord {
  _id: string;
  pickup: boolean;
  drop: boolean;
  pickupTime?: string;
  dropTime?: string;
  createdAt?: string;
}

export interface StudentDetail {
  _id: string;
  studentName: string;
  className: string;
  rollNumber: string;
  parentName: string;
  contact: string;
  pickupAddress: string;
  pickupDateTime: string;
  dropAddress: string;
  dropDateTime: string;
  scheduledPickupTime?: string;
  scheduledDropTime?: string;
  isPickedUp: boolean;
  isDropped: boolean;
  totalPickupDropRecords: number;
  pickupDropRecords: PickupDropRecord[];
  status: "present" | "pending" | "absent";
  schoolName?: string;
  branchName?: string;
  [key: string]: unknown;
}

export interface VehicleRow {
  id: string;
  sn: number;
  deviceId?: string;
  vehicleName: string;
  deviceName?: string;
  uniqueId?: string;
  routeNumber: string;
  driverName: string;
  totalStudents: number;
  totalPickedUp: number;
  totalDropped: number;
  totalNotPickedUp: number;
  totalNotDropped: number;
  schoolName: string;
  branchName: string;
  students: StudentDetail[];
  // Expansion fields (modeled after travel-summary)
  isDetailTable?: boolean;
  detailData?: StudentDetail[];
  isEmpty?: boolean;
  isLoading?: boolean;
  [key: string]: unknown;
}

const getRecordDate = (record: any): string | null => {
  if (!record || typeof record !== "object") return null;
  const timeStr = record.pickupTime || record.dropTime || record.createdAt;
  if (!timeStr || timeStr === "1970-01-01T00:00:00.000Z") return null;
  try {
    let str = String(timeStr).trim();
    if (str.includes("T") && !str.endsWith("Z") && !str.includes("+") && !str.includes("-", 10)) {
      str += "Z";
    }
    const d = new Date(str);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().split("T")[0]; // YYYY-MM-DD
  } catch {
    return null;
  }
};

const formatTimeOnly = (dateString?: string): string => {
  if (!dateString || dateString === "1970-01-01T00:00:00.000Z") return "-";
  try {
    const str = String(dateString).trim();
    if (/^\d{1,2}:\d{2}\s*(?:AM|PM)?$/i.test(str)) {
      return str;
    }
    let parseStr = str;
    if (parseStr.includes("T") && !parseStr.endsWith("Z") && !parseStr.includes("+") && !parseStr.includes("-", 10)) {
      parseStr += "Z";
    }
    const date = new Date(parseStr);
    if (isNaN(date.getTime())) return str;
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "UTC",
    });
  } catch {
    return "-";
  }
};

const formatDateHeader = (dateKey: string): string => {
  try {
    const parts = dateKey.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(Date.UTC(year, month, day));
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      });
    }
    return dateKey;
  } catch {
    return dateKey;
  }
};

const formatDateTime = (dateString: string): string => {
  if (!dateString || dateString === "1970-01-01T00:00:00.000Z") return "-";
  try {
    let str = String(dateString).trim();
    if (str.includes("T") && !str.endsWith("Z") && !str.includes("+") && !str.includes("-", 10)) {
      str += "Z";
    }
    const date = new Date(str);
    if (isNaN(date.getTime())) return "-";
    const formattedDate = date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC",
    });
    const formattedTime = date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "UTC",
    });
    return `${formattedDate}, ${formattedTime}`;
  } catch (error) {
    console.error("Error formatting date:", error);
    return "-";
  }
};

const getStatusColor = (status: string) => {
  const colors = {
    present: "bg-green-100 text-green-800",
    pending: "bg-yellow-100 text-yellow-800",
    absent: "bg-red-100 text-red-800",
  };
  return colors[status.toLowerCase() as keyof typeof colors] || "bg-gray-100 text-gray-800";
};

interface UsePickupDropDataParams {
  pagination: { pageIndex: number; pageSize: number };
  sorting: any[];
  search?: string;
  studentName?: string;
  period?: string;
  from?: string | null;
  to?: string | null;
  schoolId?: string;
  branchId?: string;
  routeObjId?: string;
  deviceObjId?: string;
}

const usePickupDropData = ({
  pagination,
  sorting,
  search,
  studentName,
  period = "Custom",
  from,
  to,
  schoolId,
  branchId,
  routeObjId,
  deviceObjId,
}: UsePickupDropDataParams) => {
  return useQuery({
    queryKey: [
      "vehicle-wise-pickup-drop-data",
      pagination,
      sorting,
      search,
      studentName,
      period,
      from,
      to,
      schoolId,
      branchId,
      routeObjId,
      deviceObjId,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        period: period || "Custom",
        page: (pagination.pageIndex + 1).toString(),
        limit: pagination.pageSize.toString(),
      });

      if (from) {
        params.append("from", from);
      }

      if (to) {
        params.append("to", to);
      }

      const trimmedSearch = (search || studentName || "").trim();
      if (trimmedSearch) {
        params.append("search", trimmedSearch);
        params.append("studentName", trimmedSearch);
      }

      if (sorting.length > 0) {
        params.append("sortBy", sorting[0].id);
        params.append("sortOrder", sorting[0].desc ? "desc" : "asc");
      }

      if (schoolId) {
        params.append("schoolId", schoolId);
      }
      if (branchId) {
        params.append("branchId", branchId);
      }
      if (routeObjId) {
        params.append("routeObjId", routeObjId);
      }
      if (deviceObjId) {
        params.append("deviceObjId", deviceObjId);
      }

      const response: any = await api.get(`/report/vehicle-wise-pickup-drop?${params.toString()}`);

      let rawVehicles: any[] = [];
      if (response?.data) {
        if (Array.isArray(response.data)) {
          rawVehicles = response.data;
        } else if (typeof response.data === "object" && response.data !== null) {
          rawVehicles = Object.values(response.data);
        }
      } else if (Array.isArray(response?.results)) {
        rawVehicles = response.results;
      } else if (Array.isArray(response)) {
        rawVehicles = response;
      }

      // Filter out non-vehicle metadata entries like dateRange
      const validVehicles = rawVehicles.filter(
        (v) =>
          v &&
          typeof v === "object" &&
          (v.vehicleName ||
            v.deviceName ||
            v.deviceId ||
            v.uniqueId ||
            v.route ||
            Array.isArray(v.students))
      );

      const parsedVehicles: VehicleRow[] = validVehicles.map((vehicle: any, index: number) => {
        const vName =
          vehicle.vehicleName?.trim() ||
          vehicle.deviceName?.trim() ||
          vehicle.name?.trim() ||
          "-";

        const rNumber =
          vehicle.route?.routeNumber ||
          vehicle.route?.routeName ||
          vehicle.routeNumber ||
          "-";

        let dName = "-";
        if (vehicle.driver) {
          if (typeof vehicle.driver === "object") {
            dName = vehicle.driver.driverName || vehicle.driver.name || "-";
          } else if (typeof vehicle.driver === "string") {
            dName = vehicle.driver;
          }
        }

        const vSchool =
          vehicle.school?.schoolName ||
          vehicle.schoolName ||
          vehicle.students?.[0]?.school?.schoolName ||
          "-";

        const vBranch =
          vehicle.branch?.branchName ||
          vehicle.branchName ||
          vehicle.students?.[0]?.branch?.branchName ||
          "-";

        const rawStudentsList: any[] = Array.isArray(vehicle.students)
          ? vehicle.students
          : vehicle.students && typeof vehicle.students === "object"
          ? Object.values(vehicle.students)
          : [];

        const students: StudentDetail[] = rawStudentsList.map((student: any, sIdx: number) => {
          const studentName =
            student.childName ||
            student.studentName ||
            student.name ||
            student.parent?.parentName ||
            "-";

          const className = student.className
            ? `${student.className}${student.section ? ` - ${student.section}` : ""}`
            : student.section || "-";

          const rollNumber = student.rollNumber || "-";

          const parentName = student.parent?.parentName || "-";

          const contact =
            student.parent?.mobileNo ||
            student.mobileNo ||
            student.contact ||
            "-";

          const pickupAddress =
            (typeof student.pickupGeofence === "object"
              ? student.pickupGeofence?.name ||
                student.pickupGeofence?.geofenceName ||
                student.pickupGeofence?.address
              : student.pickupGeofence) ||
            student.pickupGeofenceName ||
            student.pickupAddress ||
            "-";

          const dropAddress =
            (typeof student.dropGeofence === "object"
              ? student.dropGeofence?.name ||
                student.dropGeofence?.geofenceName ||
                student.dropGeofence?.address
              : student.dropGeofence) ||
            student.dropGeofenceName ||
            student.dropAddress ||
            "-";

          const rawPickupDropRecords: PickupDropRecord[] = Array.isArray(student.pickupDropRecords)
            ? student.pickupDropRecords
            : student.pickupDropRecords && typeof student.pickupDropRecords === "object"
            ? Object.values(student.pickupDropRecords)
            : [];
          const hasPickupRecords = rawPickupDropRecords.length > 0;
          const firstRecord = hasPickupRecords ? rawPickupDropRecords[0] : null;

          let pickupDateTime = "-";
          if (firstRecord?.pickupTime && firstRecord.pickupTime !== "1970-01-01T00:00:00.000Z") {
            pickupDateTime = formatDateTime(firstRecord.pickupTime);
          } else if (student.scheduledPickupTime) {
            pickupDateTime = student.scheduledPickupTime;
          } else if (student.isPickedUp || firstRecord?.pickup) {
            pickupDateTime = "Picked Up";
          }

          let dropDateTime = "-";
          if (firstRecord?.dropTime && firstRecord.dropTime !== "1970-01-01T00:00:00.000Z") {
            dropDateTime = formatDateTime(firstRecord.dropTime);
          } else if (student.scheduledDropTime) {
            dropDateTime = student.scheduledDropTime;
          } else if (student.isDropped || firstRecord?.drop) {
            dropDateTime = "Pending Drop";
          }

          const isPickedUp = Boolean(student.isPickedUp || firstRecord?.pickup || rawPickupDropRecords.some((r) => r.pickup));
          const isDropped = Boolean(student.isDropped || firstRecord?.drop || rawPickupDropRecords.some((r) => r.drop));

          const status: "present" | "pending" | "absent" = isPickedUp
            ? "present"
            : isDropped
            ? "pending"
            : "absent";

          return {
            _id: student._id || `${vehicle.deviceId || vName}-${sIdx}`,
            studentName,
            className,
            rollNumber,
            parentName,
            contact,
            pickupAddress,
            pickupDateTime,
            dropAddress,
            dropDateTime,
            scheduledPickupTime: student.scheduledPickupTime || "-",
            scheduledDropTime: student.scheduledDropTime || "-",
            isPickedUp,
            isDropped,
            totalPickupDropRecords: student.totalPickupDropRecords ?? rawPickupDropRecords.length,
            pickupDropRecords: rawPickupDropRecords,
            status,
            schoolName: student.school?.schoolName || vSchool,
            branchName: student.branch?.branchName || vBranch,
          };
        });

        const totalStudents = vehicle.totalStudents ?? students.length;
        const totalPickedUp =
          vehicle.totalPickedUp ?? students.filter((s) => s.isPickedUp).length;
        const totalDropped =
          vehicle.totalDropped ?? students.filter((s) => s.isDropped).length;
        const totalNotPickedUp =
          vehicle.totalNotPickedUp ?? Math.max(0, totalStudents - totalPickedUp);
        const totalNotDropped =
          vehicle.totalNotDropped ?? Math.max(0, totalStudents - totalDropped);

        const vehicleId = vehicle.deviceId || vehicle._id || `${vName}-${index}`;

        return {
          id: `vehicle-${vehicleId}`,
          sn: index + 1 + pagination.pageIndex * pagination.pageSize,
          deviceId: vehicle.deviceId,
          vehicleName: vName,
          deviceName: vehicle.deviceName,
          uniqueId: vehicle.uniqueId,
          routeNumber: rNumber,
          driverName: dName,
          totalStudents,
          totalPickedUp,
          totalDropped,
          totalNotPickedUp,
          totalNotDropped,
          schoolName: vSchool,
          branchName: vBranch,
          students,
        };
      });

      const total =
        response?.total ??
        response?.totalCount ??
        response?.data?.total ??
        parsedVehicles.length;

      const totalPages =
        response?.totalPages ??
        response?.data?.totalPages ??
        (Math.ceil(total / pagination.pageSize) || 1);

      return {
        vehicles: parsedVehicles,
        total,
        totalPages,
        dateRange: response?.dateRange,
      };
    },
    placeholderData: keepPreviousData,
  });
};

export default function PickupDropMaster() {
  // ---------------- Auth & Roles ----------------
  const [decodedToken, setDecodedToken] = useState<DecodedToken>({ role: "" });
  const role = decodedToken.role || "";

  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) return;

    try {
      const decoded = jwtDecode<DecodedToken>(token);
      setDecodedToken(decoded);
    } catch (err) {
      console.error("Token decode failed", err);
    }
  }, []);

  const roleLower = role.toLowerCase();
  const isSuperAdmin = roleLower === "superadmin";
  const isSchool = roleLower === "school";
  const isBranch = roleLower === "branch";
  const isBranchGroup = roleLower === "branchgroup";

  const tokenSchoolId = useMemo(
    () => (isSchool ? decodedToken.id : decodedToken.schoolId),
    [isSchool, decodedToken.id, decodedToken.schoolId]
  );

  const tokenBranchId = useMemo(
    () => (isBranch ? decodedToken.id : decodedToken.branchId),
    [isBranch, decodedToken.id, decodedToken.branchId]
  );

  // ---------------- Filter State ----------------
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 400);

  const [filterSchoolId, setFilterSchoolId] = useState<string | undefined>();
  const [filterBranchId, setFilterBranchId] = useState<string | undefined>();
  const [filterRouteId, setFilterRouteId] = useState<string | undefined>();
  const [filterDeviceId, setFilterDeviceId] = useState<string | undefined>();

  // Date Range State (defaults: 1st of month to today)
  const defaultDateRange = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      startDate: startOfMonth,
      endDate: now,
      from: formatDateToYYYYMMDD(startOfMonth),
      to: formatDateToYYYYMMDD(now),
    };
  }, []);

  const [dateRange, setDateRange] = useState<{
    startDate: Date | null;
    endDate: Date | null;
    from: string | null;
    to: string | null;
  }>({
    startDate: defaultDateRange.startDate,
    endDate: defaultDateRange.endDate,
    from: defaultDateRange.from,
    to: defaultDateRange.to,
  });

  // Lazy fetching dropdown triggers
  const [shouldFetchBranches, setShouldFetchBranches] = useState(false);
  const [shouldFetchRoutes, setShouldFetchRoutes] = useState(false);
  const [shouldFetchDevices, setShouldFetchDevices] = useState(false);

  // Apply Role Defaults
  useEffect(() => {
    if (isSchool && tokenSchoolId) {
      setFilterSchoolId(tokenSchoolId);
      setShouldFetchBranches(true);
    } else if (isBranchGroup && tokenSchoolId) {
      setFilterSchoolId(tokenSchoolId);
      setShouldFetchBranches(true);
    }
    if (isBranch && tokenBranchId) {
      setFilterBranchId(tokenBranchId);
      setShouldFetchRoutes(true);
      setShouldFetchDevices(true);
    }
  }, [isSchool, isBranch, isBranchGroup, tokenSchoolId, tokenBranchId]);

  // Derived effective IDs
  const effectiveSchoolId = filterSchoolId || (isSchool || isBranchGroup ? tokenSchoolId : undefined);
  const effectiveBranchId = filterBranchId || (isBranch ? tokenBranchId : undefined);

  // ---------------- Dropdown Queries ----------------
  const { data: schools = [], isLoading: isLoadingSchools } = useSchoolDropdown(isSuperAdmin);

  const { data: branches = [], isLoading: isLoadingBranches } = useBranchDropdown(
    effectiveSchoolId,
    isSuperAdmin ? Boolean(filterSchoolId) || shouldFetchBranches : true,
    isBranchGroup
  );

  const { data: routes = [], isLoading: isLoadingRoutes } = useRouteDropdown(
    effectiveBranchId,
    Boolean(effectiveBranchId) || shouldFetchRoutes
  );

  const { data: devices = [], isLoading: isLoadingDevices } = useDeviceDropdown(
    effectiveBranchId,
    Boolean(effectiveBranchId) || shouldFetchDevices
  );

  // ---------------- Dropdown Items ----------------
  const schoolItems = useMemo(
    () =>
      (Array.isArray(schools) ? schools : []).map((s: any) => ({
        label: s.schoolName || s.name || "Unknown School",
        value: s._id,
      })),
    [schools]
  );

  const branchItems = useMemo(
    () =>
      (Array.isArray(branches) ? branches : []).map((b: any) => ({
        label: b.branchName || b.name || "Unknown Branch",
        value: b._id,
      })),
    [branches]
  );

  const routeItems = useMemo(() => {
    const list: any[] = Array.isArray(routes)
      ? routes
      : (routes as any)?.data || [];
    return list.map((r: any) => ({
      label: r.routeNumber
        ? r.routeName
          ? `${r.routeNumber} - ${r.routeName}`
          : String(r.routeNumber)
        : r.routeName || r.name || "Unknown Route",
      value: r._id,
    }));
  }, [routes]);

  const deviceItems = useMemo(() => {
    const list: any[] = Array.isArray(devices)
      ? devices
      : (devices as any)?.data || [];
    return list.map((d: any) => ({
      label: d.name || d.deviceName || d.uniqueId || d.plateNumber || "Unknown Vehicle",
      value: d._id,
    }));
  }, [devices]);

  // ---------------- Filter Handlers ----------------
  const handleSchoolChange = (val?: string) => {
    setFilterSchoolId(val || undefined);
    setFilterBranchId(undefined);
    setFilterRouteId(undefined);
    setFilterDeviceId(undefined);
    if (val) {
      setShouldFetchBranches(true);
    }
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const handleBranchChange = (val?: string) => {
    setFilterBranchId(val || undefined);
    setFilterRouteId(undefined);
    setFilterDeviceId(undefined);
    if (val) {
      setShouldFetchRoutes(true);
      setShouldFetchDevices(true);
    }
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const handleRouteChange = (val?: string) => {
    setFilterRouteId(val || undefined);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const handleDeviceChange = (val?: string) => {
    setFilterDeviceId(val || undefined);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const handleDateFilter = useCallback(
    (start: Date | null, end: Date | null) => {
      setDateRange({
        startDate: start,
        endDate: end,
        from: formatDateToYYYYMMDD(start),
        to: formatDateToYYYYMMDD(end),
      });
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    },
    []
  );

  const handleClearFilters = useCallback(() => {
    setSearchInput("");
    if (isSuperAdmin) {
      setFilterSchoolId(undefined);
    }
    if (isSuperAdmin || isSchool || isBranchGroup) {
      setFilterBranchId(undefined);
    }
    setFilterRouteId(undefined);
    setFilterDeviceId(undefined);
    setDateRange({
      startDate: defaultDateRange.startDate,
      endDate: defaultDateRange.endDate,
      from: defaultDateRange.from,
      to: defaultDateRange.to,
    });
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [isSuperAdmin, isSchool, isBranchGroup, defaultDateRange]);

  const hasActiveFilters = useMemo(() => {
    return (
      Boolean(searchInput.trim()) ||
      (isSuperAdmin && Boolean(filterSchoolId)) ||
      ((isSuperAdmin || isSchool || isBranchGroup) && Boolean(filterBranchId)) ||
      Boolean(filterRouteId) ||
      Boolean(filterDeviceId) ||
      dateRange.from !== defaultDateRange.from ||
      dateRange.to !== defaultDateRange.to
    );
  }, [
    searchInput,
    isSuperAdmin,
    isSchool,
    isBranchGroup,
    filterSchoolId,
    filterBranchId,
    filterRouteId,
    filterDeviceId,
    dateRange,
    defaultDateRange,
  ]);

  // ---------------- Table & Pagination ----------------
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const [sorting, setSorting] = useState<any[]>([]);

  // ---------------- Master-Detail Expansion State ----------------
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const { exportToPDF, exportToExcel } = useExport();

  // Export Modal State
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"excel" | "pdf">("excel");
  const [exportPointType, setExportPointType] = useState<"both" | "pickup" | "drop">("both");

  // Reset pagination when debounced search changes
  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [debouncedSearch]);

  const {
    data: pickupDropResponse,
    isLoading,
    isFetching,
  } = usePickupDropData({
    pagination,
    sorting,
    search: debouncedSearch,
    studentName: debouncedSearch,
    period: "Custom",
    from: dateRange.from,
    to: dateRange.to,
    schoolId: effectiveSchoolId,
    branchId: effectiveBranchId,
    routeObjId: filterRouteId,
    deviceObjId: filterDeviceId,
  });

  const toggleRowExpansion = useCallback((rowId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  }, []);

  // Filter vehicles and students based on local search input
  const filteredVehicles = useMemo(() => {
    const rawVehicles = pickupDropResponse?.vehicles || [];
    const query = searchInput.trim().toLowerCase();
    if (!query) return rawVehicles;

    return rawVehicles.filter((v) => {
      const vehicleMatches =
        String(v.vehicleName || "").toLowerCase().includes(query) ||
        String(v.routeNumber || "").toLowerCase().includes(query) ||
        String(v.driverName || "").toLowerCase().includes(query) ||
        String(v.schoolName || "").toLowerCase().includes(query) ||
        String(v.branchName || "").toLowerCase().includes(query);

      if (vehicleMatches) return true;

      // Check if any student in this vehicle matches
      const studentMatches = v.students?.some((s: any) => {
        return (
          String(s.studentName || "").toLowerCase().includes(query) ||
          String(s.rollNumber || "").toLowerCase().includes(query) ||
          String(s.className || "").toLowerCase().includes(query) ||
          String(s.parentName || "").toLowerCase().includes(query) ||
          String(s.contact || "").toLowerCase().includes(query) ||
          String(s.pickupAddress || "").toLowerCase().includes(query) ||
          String(s.dropAddress || "").toLowerCase().includes(query) ||
          String(s.status || "").toLowerCase().includes(query)
        );
      });

      return Boolean(studentMatches);
    });
  }, [pickupDropResponse?.vehicles, searchInput]);

  // Auto-expand matching vehicles when searching
  useEffect(() => {
    if (searchInput.trim()) {
      const matchingIds = new Set<string>();
      filteredVehicles.forEach((v) => {
        if (v.students && v.students.length > 0) {
          matchingIds.add(v.id);
        }
      });
      setExpandedRows(matchingIds);
    }
  }, [searchInput, filteredVehicles]);

  // Build the flattened expanded row array (mirrors travel-summary createExpandedData)
  const expandedDataArray = useMemo(() => {
    const result: VehicleRow[] = [];
    filteredVehicles.forEach((vehicleRow) => {
      result.push(vehicleRow);

      if (expandedRows.has(vehicleRow.id)) {
        if (vehicleRow.students && vehicleRow.students.length > 0) {
          result.push({
            ...vehicleRow,
            id: `${vehicleRow.id}-details`,
            isDetailTable: true,
            detailData: vehicleRow.students,
          });
        } else {
          result.push({
            ...vehicleRow,
            id: `${vehicleRow.id}-empty`,
            isEmpty: true,
          });
        }
      }
    });
    return result;
  }, [filteredVehicles, expandedRows]);

  const totalCount = useMemo(() => {
    if (searchInput.trim()) {
      if (debouncedSearch && pickupDropResponse?.total !== undefined) {
        return pickupDropResponse.total;
      }
      return filteredVehicles.length;
    }
    return pickupDropResponse?.total || filteredVehicles.length;
  }, [searchInput, debouncedSearch, pickupDropResponse?.total, filteredVehicles.length]);

  // Unique dates from all students' pickupDropRecords across vehicles
  const reportDates = useMemo(() => {
    const dates = new Set<string>();
    filteredVehicles.forEach((v) => {
      (v.students || []).forEach((s: any) => {
        (s.pickupDropRecords || []).forEach((r: any) => {
          const d = getRecordDate(r);
          if (d) dates.add(d);
        });
      });
    });

    // If a single date is selected in the filter, guarantee it appears as a column
    if (dateRange.from && dateRange.to && dateRange.from === dateRange.to) {
      dates.add(dateRange.from);
    }

    return Array.from(dates).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  }, [filteredVehicles, dateRange.from, dateRange.to]);

  // Nested Detail Table Columns (for Students inside Vehicle) with dynamic Date columns
  const studentDetailColumns: ColumnDef<StudentDetail>[] = useMemo(() => {
    const baseCols: ColumnDef<StudentDetail>[] = [
      {
        accessorKey: "studentName",
        header: "Student Name",
        cell: ({ row }) => (
          <span className="font-semibold text-gray-900 whitespace-nowrap">
            {row.original.studentName}
          </span>
        ),
      },
      {
        accessorKey: "className",
        header: "Class & Sec",
        cell: ({ row }) => (
          <span className="whitespace-nowrap">{row.original.className || "-"}</span>
        ),
      },
      {
        accessorKey: "pickupAddress",
        header: "Pickup Location",
        cell: ({ row }) => (
          <span
            className="text-xs truncate max-w-[150px] inline-block"
            title={row.original.pickupAddress}
          >
            {row.original.pickupAddress || "-"}
          </span>
        ),
      },
      {
        accessorKey: "dropAddress",
        header: "Drop Location",
        cell: ({ row }) => (
          <span
            className="text-xs truncate max-w-[150px] inline-block"
            title={row.original.dropAddress}
          >
            {row.original.dropAddress || "-"}
          </span>
        ),
      },
      {
        accessorKey: "scheduledPickupTime",
        header: "Sched. Pickup",
        cell: ({ row }) => (
          <span className="text-xs whitespace-nowrap font-medium text-gray-600">
            {row.original.scheduledPickupTime || "-"}
          </span>
        ),
      },
      {
        accessorKey: "scheduledDropTime",
        header: "Sched. Drop",
        cell: ({ row }) => (
          <span className="text-xs whitespace-nowrap font-medium text-gray-600">
            {row.original.scheduledDropTime || "-"}
          </span>
        ),
      },
    ];

    if (reportDates.length > 0) {
      reportDates.forEach((dateKey) => {
        baseCols.push({
          id: `date_${dateKey}`,
          header: formatDateHeader(dateKey),
          size: 155,
          cell: ({ row }) => {
            const student = row.original;
            const records = (student.pickupDropRecords || []).filter(
              (r: any) => getRecordDate(r) === dateKey
            );

            if (!records || records.length === 0) {
              return <span className="text-gray-300 font-normal text-xs">-</span>;
            }

            const pickupRec = records.find((r: any) => r.pickup || r.pickupTime);
            const dropRec = records.find((r: any) => r.drop || r.dropTime);

            const isPickup = Boolean(pickupRec?.pickup || records.some((r: any) => r.pickup));
            const pickupTimeStr = pickupRec?.pickupTime
              ? formatTimeOnly(pickupRec.pickupTime)
              : isPickup
              ? "Yes"
              : "-";

            const isDrop = Boolean(dropRec?.drop || records.some((r: any) => r.drop));
            const dropTimeStr = dropRec?.dropTime
              ? formatTimeOnly(dropRec.dropTime)
              : isDrop
              ? "Yes"
              : "-";

            return (
              <div className="flex flex-col items-center justify-center gap-1 py-1 text-xs min-w-[135px]">
                <div className="flex items-center gap-1.5 w-full justify-between px-1">
                  <span className="font-semibold text-gray-600 text-[11px]">Pickup:</span>
                  {isPickup || pickupTimeStr !== "-" ? (
                    <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-800 font-medium text-[11px] whitespace-nowrap">
                      {pickupTimeStr}
                    </span>
                  ) : (
                    <span className="text-gray-400 font-normal">-</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 w-full justify-between px-1">
                  <span className="font-semibold text-gray-600 text-[11px]">Drop:</span>
                  {isDrop || dropTimeStr !== "-" ? (
                    <span className="px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 font-medium text-[11px] whitespace-nowrap">
                      {dropTimeStr}
                    </span>
                  ) : (
                    <span className="text-gray-400 font-normal">-</span>
                  )}
                </div>
              </div>
            );
          },
        });
      });
    } else {
      baseCols.push(
        {
          accessorKey: "pickupDateTime",
          header: "Pickup Time",
          cell: ({ row }) => (
            <span className="text-xs whitespace-nowrap">{row.original.pickupDateTime || "-"}</span>
          ),
        },
        {
          accessorKey: "dropDateTime",
          header: "Drop Time",
          cell: ({ row }) => (
            <span className="text-xs whitespace-nowrap">{row.original.dropDateTime || "-"}</span>
          ),
        }
      );
    }

    return baseCols;
  }, [reportDates]);

  // Main Vehicle Table Columns (with Expandable master-detail cell)
  const columns: ColumnDef<VehicleRow>[] = useMemo(
    () => [
      {
        id: "expand",
        header: "",
        size: 50,
        cell: ({ row }) => {
          if (row.original.isDetailTable || row.original.isEmpty || row.original.isLoading) {
            return null;
          }
          const isExpanded = expandedRows.has(row.original.id);
          const hasStudents = (row.original.students?.length || 0) > 0;

          if (!hasStudents) {
            return <div className="flex justify-center text-gray-300 text-xs">-</div>;
          }

          return (
            <div className="flex justify-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleRowExpansion(row.original.id);
                }}
                className="p-1 hover:bg-gray-100 rounded transition-colors cursor-pointer"
                aria-label={isExpanded ? "Collapse row" : "Expand row"}
              >
                <span
                  className={`inline-flex items-center justify-center transition-all duration-300 ease-in-out ${
                    isExpanded ? "rotate-180 scale-110" : "rotate-0 scale-100"
                  }`}
                >
                  {isExpanded ? (
                    <FaMinus className="text-red-500 text-sm" />
                  ) : (
                    <FaPlus className="text-green-500 text-sm" />
                  )}
                </span>
              </button>
            </div>
          );
        },
        enableSorting: false,
        enableHiding: false,
      },
      {
        id: "sn",
        header: "SN",
        size: 60,
        cell: ({ row }) => {
          if (row.original.isDetailTable || row.original.isEmpty || row.original.isLoading) {
            return null;
          }
          return row.original.sn;
        },
        enableSorting: false,
        enableHiding: false,
      },
      {
        id: "vehicleNumber",
        accessorKey: "vehicleName",
        header: "Vehicle Number",
        size: 220,
        cell: ({ row }) => {
          // Nested Detail Table Rendering
          if (row.original.isDetailTable && row.original.detailData) {
            return (
              <div className="col-span-full w-full">
                <div className="w-full bg-gray-50 rounded-lg p-4 my-2 border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                      <span>
                        Students for Vehicle:{" "}
                        <span className="font-bold text-amber-600">{row.original.vehicleName}</span>
                      </span>
                      <span className="text-xs font-normal text-gray-500">
                        ({row.original.detailData.length}{" "}
                        {row.original.detailData.length === 1 ? "student" : "students"})
                      </span>
                    </h3>
                  </div>
                  <TravelTable
                    data={row.original.detailData}
                    columns={studentDetailColumns as any}
                    totalCount={row.original.detailData.length}
                    emptyMessage="No students found for this vehicle"
                    showSerialNumber={true}
                    maxHeight="350px"
                  />
                </div>
              </div>
            );
          }

          if (row.original.isEmpty) {
            return (
              <div className="col-span-full w-full">
                <div className="p-4 bg-gray-50 rounded text-center text-gray-500 border my-2">
                  No students assigned to {row.original.vehicleName}
                </div>
              </div>
            );
          }

          return (
            <span className="font-semibold text-gray-900">{row.original.vehicleName}</span>
          );
        },
        enableSorting: true,
        enableHiding: false,
      },
      {
        id: "routeNumber",
        accessorKey: "routeNumber",
        header: "Route",
        cell: ({ row }) => {
          if (row.original.isDetailTable || row.original.isEmpty || row.original.isLoading) return null;
          return <span className="font-medium text-gray-800">{row.original.routeNumber || "-"}</span>;
        },
        enableSorting: true,
      },
      {
        id: "driverName",
        accessorKey: "driverName",
        header: "Driver",
        cell: ({ row }) => {
          if (row.original.isDetailTable || row.original.isEmpty || row.original.isLoading) return null;
          return row.original.driverName || "-";
        },
        enableSorting: true,
      },
      ...(isSuperAdmin || isSchool
        ? [
            {
              id: "schoolName",
              accessorKey: "schoolName",
              header: "School",
              cell: ({ row }: { row: any }) => {
                if (row.original.isDetailTable || row.original.isEmpty || row.original.isLoading) {
                  return null;
                }
                return row.original.schoolName || "-";
              },
              enableSorting: true,
            },
          ]
        : []),
      ...(isSuperAdmin || isSchool || isBranch || isBranchGroup
        ? [
            {
              id: "branchName",
              accessorKey: "branchName",
              header: "Branch",
              cell: ({ row }: { row: any }) => {
                if (row.original.isDetailTable || row.original.isEmpty || row.original.isLoading) {
                  return null;
                }
                return row.original.branchName || "-";
              },
              enableSorting: true,
            },
          ]
        : []),
      {
        id: "totalStudents",
        accessorKey: "totalStudents",
        header: "Total Students",
        cell: ({ row }) => {
          if (row.original.isDetailTable || row.original.isEmpty || row.original.isLoading) return null;
          return (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
              {row.original.totalStudents ?? 0}
            </span>
          );
        },
        enableSorting: true,
      },
      {
        id: "totalPickedUp",
        accessorKey: "totalPickedUp",
        header: "Picked Up",
        cell: ({ row }) => {
          if (row.original.isDetailTable || row.original.isEmpty || row.original.isLoading) return null;
          return (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
              {row.original.totalPickedUp ?? 0}
            </span>
          );
        },
        enableSorting: true,
      },
      {
        id: "totalDropped",
        accessorKey: "totalDropped",
        header: "Dropped",
        cell: ({ row }) => {
          if (row.original.isDetailTable || row.original.isEmpty || row.original.isLoading) return null;
          return (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-800">
              {row.original.totalDropped ?? 0}
            </span>
          );
        },
        enableSorting: true,
      },
      {
        id: "totalNotPickedUp",
        accessorKey: "totalNotPickedUp",
        header: "Not Picked",
        cell: ({ row }) => {
          if (row.original.isDetailTable || row.original.isEmpty || row.original.isLoading) return null;
          return (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
              {row.original.totalNotPickedUp ?? 0}
            </span>
          );
        },
        enableSorting: true,
      },
      {
        id: "totalNotDropped",
        accessorKey: "totalNotDropped",
        header: "Not Dropped",
        cell: ({ row }) => {
          if (row.original.isDetailTable || row.original.isEmpty || row.original.isLoading) return null;
          return (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
              {row.original.totalNotDropped ?? 0}
            </span>
          );
        },
        enableSorting: true,
      },
    ],
    [
      expandedRows,
      studentDetailColumns,
      toggleRowExpansion,
      isSuperAdmin,
      isSchool,
      isBranch,
      isBranchGroup,
    ]
  );

  // ---------------- Export Data Generator (Supports Both, Only Pickup, Only Drop) ----------------
  const getExportPayload = useCallback(
    (type: "both" | "pickup" | "drop") => {
      // 1. Vehicle Master Columns
      const masterCols = [
        { key: "sn", header: "S.No." },
        { key: "vehicleName", header: "Vehicle Number" },
        { key: "routeNumber", header: "Route" },
        { key: "driverName", header: "Driver" },
        ...(isSuperAdmin || isSchool ? [{ key: "schoolName", header: "School" }] : []),
        ...(roleLower !== "student" ? [{ key: "branchName", header: "Branch" }] : []),
        { key: "totalStudents", header: "Total Students" },
        ...(type === "both" || type === "pickup"
          ? [
              { key: "totalPickedUp", header: "Total Picked Up" },
              { key: "totalNotPickedUp", header: "Not Picked Up" },
            ]
          : []),
        ...(type === "both" || type === "drop"
          ? [
              { key: "totalDropped", header: "Total Dropped" },
              { key: "totalNotDropped", header: "Not Dropped" },
            ]
          : []),
      ];

      // 2. Nested Student Columns
      const nestedCols: any[] = [
        { key: "studentName", header: "Student Name" },
        { key: "className", header: "Class" },
      ];

      if (type === "both" || type === "pickup") {
        nestedCols.push(
          { key: "pickupAddress", header: "Pickup Location" },
          { key: "scheduledPickupTime", header: "Sched. Pickup" }
        );
      }

      if (type === "both" || type === "drop") {
        nestedCols.push(
          { key: "dropAddress", header: "Drop Location" },
          { key: "scheduledDropTime", header: "Sched. Drop" }
        );
      }

      if (reportDates.length > 0) {
        reportDates.forEach((dateKey) => {
          const dateLabel = formatDateHeader(dateKey);
          nestedCols.push({
            key: `date_${dateKey}`,
            header: dateLabel,
          });
        });
      } else {
        if (type === "both") {
          nestedCols.push({ key: "pickupDropDateTime", header: "Pickup / Drop Time" });
        } else if (type === "pickup") {
          nestedCols.push({ key: "pickupDateTime", header: "Pickup Time" });
        } else {
          nestedCols.push({ key: "dropDateTime", header: "Drop Time" });
        }
      }

      // 3. Data Transformation
      const data = filteredVehicles.map((v) => {
        const enrichedStudents = (v.students || []).map((s: any) => {
          const studentExport: any = {
            studentName: s.studentName,
            className: s.className,
          };

          if (type === "both" || type === "pickup") {
            studentExport.pickupAddress = s.pickupAddress;
            studentExport.scheduledPickupTime = s.scheduledPickupTime;
            studentExport.pickupDateTime = s.pickupDateTime;
          }

          if (type === "both" || type === "drop") {
            studentExport.dropAddress = s.dropAddress;
            studentExport.scheduledDropTime = s.scheduledDropTime;
            studentExport.dropDateTime = s.dropDateTime;
          }

          const fallbackPickup =
            s.pickupDateTime && s.pickupDateTime !== "-" ? s.pickupDateTime : "-";
          const fallbackDrop =
            s.dropDateTime && s.dropDateTime !== "-" ? s.dropDateTime : "-";

          if (type === "both") {
            studentExport.pickupDropDateTime =
              fallbackPickup === "-" && fallbackDrop === "-"
                ? "-"
                : `Pickup: ${fallbackPickup}\nDrop: ${fallbackDrop}`;
          }

          reportDates.forEach((dateKey) => {
            const records = (s.pickupDropRecords || []).filter(
              (r: any) => getRecordDate(r) === dateKey
            );
            const pickupRec = records.find((r: any) => r.pickup || r.pickupTime);
            const dropRec = records.find((r: any) => r.drop || r.dropTime);

            const isPickup = Boolean(pickupRec?.pickup || records.some((r: any) => r.pickup));
            const isDrop = Boolean(dropRec?.drop || records.some((r: any) => r.drop));

            const pickupTimeStr = pickupRec?.pickupTime
              ? formatTimeOnly(pickupRec.pickupTime)
              : isPickup
              ? "Yes"
              : "-";

            const dropTimeStr = dropRec?.dropTime
              ? formatTimeOnly(dropRec.dropTime)
              : isDrop
              ? "Yes"
              : "-";

            if (type === "both") {
              if (pickupTimeStr === "-" && dropTimeStr === "-") {
                studentExport[`date_${dateKey}`] = "-";
              } else {
                studentExport[`date_${dateKey}`] = `Pickup: ${pickupTimeStr}\nDrop: ${dropTimeStr}`;
              }
            } else if (type === "pickup") {
              studentExport[`date_${dateKey}`] =
                pickupTimeStr !== "-" ? `Pickup: ${pickupTimeStr}` : "-";
            } else {
              studentExport[`date_${dateKey}`] =
                dropTimeStr !== "-" ? `Drop: ${dropTimeStr}` : "-";
            }
          });

          return studentExport;
        });

        const vExport: any = {
          sn: v.sn,
          vehicleName: v.vehicleName,
          routeNumber: v.routeNumber,
          driverName: v.driverName,
          schoolName: v.schoolName,
          branchName: v.branchName,
          totalStudents: v.totalStudents,
          students: enrichedStudents,
        };

        if (type === "both" || type === "pickup") {
          vExport.totalPickedUp = v.totalPickedUp;
          vExport.totalNotPickedUp = v.totalNotPickedUp;
        }

        if (type === "both" || type === "drop") {
          vExport.totalDropped = v.totalDropped;
          vExport.totalNotDropped = v.totalNotDropped;
        }

        return vExport;
      });

      const reportTitle =
        type === "pickup"
          ? "Vehicle Wise Pickup Report"
          : type === "drop"
          ? "Vehicle Wise Drop Report"
          : "Vehicle Wise Pickup & Drop Report";

      return {
        columns: masterCols,
        nestedCols,
        data,
        reportTitle,
      };
    },
    [filteredVehicles, reportDates, isSuperAdmin, isSchool, roleLower]
  );

  // Restore pointer-events when export dialog closes (prevents Radix UI overlay lock bug)
  useEffect(() => {
    if (!exportModalOpen) {
      const resetPointerEvents = () => {
        document.body.style.pointerEvents = "";
      };
      resetPointerEvents();
      const t1 = setTimeout(resetPointerEvents, 50);
      const t2 = setTimeout(resetPointerEvents, 150);
      const t3 = setTimeout(resetPointerEvents, 300);
      const t4 = setTimeout(resetPointerEvents, 600);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(t4);
      };
    }
  }, [exportModalOpen]);

  const handleConfirmExport = () => {
    // 1. Close dialog immediately so UI starts transition
    setExportModalOpen(false);

    // 2. Clear pointer-events and scroll locks immediately
    document.body.style.pointerEvents = "";

    // 3. Prepare export payload
    const { data, columns, nestedCols, reportTitle } = getExportPayload(exportPointType);
    const filePrefix =
      exportPointType === "pickup"
        ? "vehicle_pickup_report"
        : exportPointType === "drop"
        ? "vehicle_drop_report"
        : "vehicle_pickup_drop_report";

    // 4. Delay file download slightly to let dialog unmount and release overlay focus cleanly
    setTimeout(async () => {
      document.body.style.pointerEvents = "";

      try {
        if (exportFormat === "excel") {
          await exportToExcel(data, columns, {
            filename: filePrefix,
            title: reportTitle,
            nestedTable: {
              dataKey: "students",
              columns: nestedCols,
              title: "Student Details",
            },
          });
        } else {
          await exportToPDF(data, columns, {
            filename: filePrefix,
            title: reportTitle,
            nestedTable: {
              dataKey: "students",
              columns: nestedCols,
              title: "Student Details",
            },
          });
        }
      } finally {
        document.body.style.pointerEvents = "";
        setTimeout(() => {
          document.body.style.pointerEvents = "";
        }, 100);
      }
    }, 150);
  };

  // Main Table setup with virtualization disabled for variable height expandable rows
  const { table, tableElement } = CustomTableServerSidePagination({
    data: expandedDataArray,
    columns,
    pagination,
    totalCount: totalCount,
    loading: isLoading || isFetching,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    sorting,
    columnVisibility,
    onColumnVisibilityChange: setColumnVisibility,
    emptyMessage: "No vehicle pickup & drop records found",
    pageSizeOptions: [5, 10, 20, 30, 50, 100, "All"],
    enableSorting: true,
    showSerialNumber: false,
    enableVirtualization: false,
    maxHeight: "calc(100vh - 200px)",
  });

  return (
    <main>
      <ResponseLoader isLoading={isLoading} />

      <header className="flex flex-wrap items-center justify-between gap-2.5 mb-4">
        {/* Left Controls: Search, Date Filter, and Entity Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="relative w-[220px]">
            <input
              type="text"
              placeholder="Search..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-9 w-full rounded-md border border-[#e0c868] bg-[#FFE58A] px-3 py-1 pr-8 text-sm outline-none placeholder:text-gray-500 focus:ring-1 focus:ring-amber-400"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center">
              {searchInput ? (
                <button
                  type="button"
                  onClick={() => setSearchInput("")}
                  className="cursor-pointer text-gray-500 hover:text-gray-700"
                  title="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : (
                <Search className="h-4 w-4 text-gray-500 pointer-events-none" />
              )}
            </div>
          </div>

          {/* Date Filter */}
          <div className="w-[210px]">
            <DateRangeFilter
              onDateRangeChange={handleDateFilter}
              defaultStartDate={defaultDateRange.startDate}
              defaultEndDate={defaultDateRange.endDate}
              title="Search by Date"
            />
          </div>

          {/* School Filter (SuperAdmin only) */}
          {isSuperAdmin && (
            <Combobox
              items={schoolItems}
              value={filterSchoolId}
              onValueChange={handleSchoolChange}
              onOpenChange={(open) => {
                if (open) setShouldFetchBranches(true);
              }}
              placeholder="Filter School"
              searchPlaceholder="Search School..."
              className="cursor-pointer"
              width="w-[140px]"
              emptyMessage={isLoadingSchools ? "Loading..." : "No schools found"}
            />
          )}

          {/* Branch Filter */}
          {(isSuperAdmin || isSchool || isBranchGroup) && (
            <Combobox
              items={branchItems}
              value={filterBranchId}
              onValueChange={handleBranchChange}
              onOpenChange={(open) => {
                if (open) {
                  setShouldFetchBranches(true);
                  setShouldFetchRoutes(true);
                  setShouldFetchDevices(true);
                }
              }}
              placeholder="Filter Branch"
              searchPlaceholder="Search Branch..."
              className="cursor-pointer"
              width="w-[140px]"
              emptyMessage={isLoadingBranches ? "Loading..." : "No branches found"}
              disabled={isSuperAdmin && !filterSchoolId}
            />
          )}

          {/* Route Filter */}
          <Combobox
            items={routeItems}
            value={filterRouteId}
            onValueChange={handleRouteChange}
            onOpenChange={(open) => {
              if (open) setShouldFetchRoutes(true);
            }}
            placeholder="Filter Route"
            searchPlaceholder="Search Route..."
            className="cursor-pointer"
            width="w-[130px]"
            emptyMessage={isLoadingRoutes ? "Loading..." : "No routes found"}
            disabled={!effectiveBranchId}
          />

          {/* Vehicle Filter */}
          <Combobox
            items={deviceItems}
            value={filterDeviceId}
            onValueChange={handleDeviceChange}
            onOpenChange={(open) => {
              if (open) setShouldFetchDevices(true);
            }}
            placeholder="Filter Vehicle"
            searchPlaceholder="Search Vehicle..."
            className="cursor-pointer"
            width="w-[130px]"
            emptyMessage={isLoadingDevices ? "Loading..." : "No vehicles found"}
            disabled={!effectiveBranchId}
          />

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              className="gap-1.5 shrink-0 cursor-pointer h-9 px-2.5 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              title="Clear all filters"
            >
              <FilterX className="h-4 w-4" />
              Clear
            </Button>
          )}
        </div>

        {/* Right Controls: Column Visibility & Export */}
        <div className="flex items-center gap-2.5 ml-auto shrink-0">
          <ColumnVisibilitySelector
            columns={table.getAllColumns()}
            buttonVariant="outline"
            buttonSize="default"
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="default"
                className="cursor-pointer gap-2"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setExportFormat("excel");
                  setExportModalOpen(true);
                }}
                className="cursor-pointer"
              >
                Export to Excel
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setExportFormat("pdf");
                  setExportModalOpen(true);
                }}
                className="cursor-pointer"
              >
                Export to PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <section className="mb-4">{tableElement}</section>

      {/* Export Options Dialog */}
      <Dialog
        open={exportModalOpen}
        onOpenChange={(open) => {
          setExportModalOpen(open);
          if (!open) {
            document.body.style.pointerEvents = "";
            setTimeout(() => {
              document.body.style.pointerEvents = "";
            }, 50);
          }
        }}
      >
        <DialogContent
          className="sm:max-w-[440px]"
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            document.body.style.pointerEvents = "";
          }}
        >
          <DialogHeader>
            <DialogTitle>Export Report</DialogTitle>
            <DialogDescription>
              Choose which points to include in the exported {exportFormat === "excel" ? "Excel" : "PDF"} report:
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <RadioGroup
              value={exportPointType}
              onValueChange={(val: any) => setExportPointType(val)}
              className="gap-2.5"
            >
              <div
                className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                  exportPointType === "both"
                    ? "border-primary bg-primary/5"
                    : "border-gray-200 hover:bg-gray-50/80"
                }`}
                onClick={() => setExportPointType("both")}
              >
                <RadioGroupItem value="both" id="export-both" className="mt-0.5" />
                <Label htmlFor="export-both" className="cursor-pointer flex-1">
                  <div className="font-semibold text-gray-900 text-sm">
                    Both Pickup & Drop Points
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Includes all pickup and drop locations, scheduled times, and records.
                  </div>
                </Label>
              </div>

              <div
                className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                  exportPointType === "pickup"
                    ? "border-primary bg-primary/5"
                    : "border-gray-200 hover:bg-gray-50/80"
                }`}
                onClick={() => setExportPointType("pickup")}
              >
                <RadioGroupItem value="pickup" id="export-pickup" className="mt-0.5" />
                <Label htmlFor="export-pickup" className="cursor-pointer flex-1">
                  <div className="font-semibold text-gray-900 text-sm">
                    Only Pickup Points
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Includes only pickup locations, scheduled pickup times, and pickup records.
                  </div>
                </Label>
              </div>

              <div
                className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                  exportPointType === "drop"
                    ? "border-primary bg-primary/5"
                    : "border-gray-200 hover:bg-gray-50/80"
                }`}
                onClick={() => setExportPointType("drop")}
              >
                <RadioGroupItem value="drop" id="export-drop" className="mt-0.5" />
                <Label htmlFor="export-drop" className="cursor-pointer flex-1">
                  <div className="font-semibold text-gray-900 text-sm">
                    Only Drop Points
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Includes only drop locations, scheduled drop times, and drop records.
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setExportModalOpen(false)}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmExport}
              className="cursor-pointer gap-2"
            >
              <Download className="h-4 w-4" />
              Export {exportFormat === "excel" ? "Excel" : "PDF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
