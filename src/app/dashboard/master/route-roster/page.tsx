"use client";

import React, { useState, useMemo, useEffect } from "react";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Bus,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Search,
  SlidersHorizontal,
  Plus,
  Pencil,
  Route as RouteIcon,
  CheckCircle2,
  Clock,
  Phone,
  MoreHorizontal,
  Trash2,
  Power,
  Loader2,
  Waypoints,
  X,
} from "lucide-react";
import {
  rosterService,
  RosterItem,
  RosterShift,
  CreateRosterPayload,
  UpdateRosterPayload,
  UpdateShiftPayload,
} from "@/services/api/rosterService";
import { useAuthStore } from "@/store/authStore";
import {
  useSchoolDropdown,
  useBranchDropdown,
  useDeviceDropdown,
  useRouteDropdown,
} from "@/hooks/useDropdown";
import { useDebounce } from "@/hooks/useDebounce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";

// Route badge color palette for shifts
const ROUTE_COLORS = [
  {
    bg: "bg-[#dbeafe] text-[#1d4ed8] border-blue-200/60",
    bar: "bg-[#dbeafe] text-[#1d4ed8]",
    dot: "bg-blue-500",
  },
  {
    bg: "bg-[#fef3c7] text-[#b45309] border-amber-200/60",
    bar: "bg-[#fef3c7] text-[#b45309]",
    dot: "bg-amber-500",
  },
  {
    bg: "bg-[#f3e8ff] text-[#7e22ce] border-purple-200/60",
    bar: "bg-[#f3e8ff] text-[#7e22ce]",
    dot: "bg-purple-500",
  },
  {
    bg: "bg-[#ffe4e6] text-[#be123c] border-rose-200/60",
    bar: "bg-[#ffe4e6] text-[#be123c]",
    dot: "bg-rose-500",
  },
  {
    bg: "bg-[#d1fae5] text-[#047857] border-emerald-200/60",
    bar: "bg-[#d1fae5] text-[#047857]",
    dot: "bg-emerald-500",
  },
  {
    bg: "bg-[#e0f2fe] text-[#0369a1] border-sky-200/60",
    bar: "bg-[#e0f2fe] text-[#0369a1]",
    dot: "bg-sky-500",
  },
];

const DRIVER_AVATAR_COLORS = [
  "bg-purple-100 text-purple-700",
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-rose-100 text-rose-700",
  "bg-amber-100 text-amber-700",
  "bg-indigo-100 text-indigo-700",
];

interface DecodedToken {
  role?: string;
  id?: string;
  schoolId?: string;
  branchId?: string;
  username?: string;
  exp?: number;
}

export default function RouteRosterPage() {
  const queryClient = useQueryClient();
  const { decodedToken: storeDecodedToken, hydrateAuth } = useAuthStore();
  const [cookieToken, setCookieToken] = useState<DecodedToken>({});

  useEffect(() => {
    hydrateAuth();
    const token = Cookies.get("token");
    if (!token) return;
    try {
      const decoded = jwtDecode<DecodedToken>(token);
      setCookieToken(decoded);
    } catch (err) {
      console.error("Token decode failed", err);
    }
  }, [hydrateAuth]);

  // Combine cookie token and authStore token for absolute reliability
  const userRole =
    cookieToken.role || storeDecodedToken?.role || "";
  const isSuperAdmin =
    userRole === "superAdmin" || userRole.toLowerCase() === "superadmin";

  // ---------------- Role-based Defaults (Matches Report-Filter.tsx) ----------------
  const tokenSchoolId = useMemo(() => {
    const directId = cookieToken.id || storeDecodedToken?.id;
    const directSchoolId = cookieToken.schoolId || storeDecodedToken?.schoolId;
    return userRole === "school" ? (directId || directSchoolId) : directSchoolId;
  }, [userRole, cookieToken.id, cookieToken.schoolId, storeDecodedToken?.id, storeDecodedToken?.schoolId]);

  const tokenBranchId = useMemo(() => {
    const directId = cookieToken.id || storeDecodedToken?.id;
    const directBranchId = cookieToken.branchId || storeDecodedToken?.branchId;
    return userRole === "branch" ? (directId || directBranchId) : directBranchId;
  }, [userRole, cookieToken.id, cookieToken.branchId, storeDecodedToken?.id, storeDecodedToken?.branchId]);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 400);

  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [rosterActiveFilter, setRosterActiveFilter] = useState<string>("ALL");
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("");
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");

  // UI accordion state (expanded by default for all vehicles)
  const [expandedVehicles, setExpandedVehicles] = useState<
    Record<string, boolean>
  >({});

  // Sorting state
  const [sortField, setSortField] = useState<string>("vehicle");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Dialog & Delete states
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [editingRosterId, setEditingRosterId] = useState<string | null>(null);
  const [editingSingleShift, setEditingSingleShift] = useState<{
    rosterId: string;
    shiftId: string;
    routeObjId: string;
    startTime: string;
    endTime: string;
    routeName?: string;
    busName?: string;
    branchId?: string;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "roster" | "shift";
    rosterId: string;
    shiftId?: string;
    name?: string;
  } | null>(null);

  // Restore pointer events when dialogs close (prevents Radix UI overlay pointer-events bug)
  useEffect(() => {
    if (!isAssignDialogOpen && !deleteTarget && !editingSingleShift) {
      const resetPointerEvents = () => {
        document.body.style.pointerEvents = "";
      };
      resetPointerEvents();
      const t1 = setTimeout(resetPointerEvents, 50);
      const t2 = setTimeout(resetPointerEvents, 150);
      const t3 = setTimeout(resetPointerEvents, 300);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [isAssignDialogOpen, deleteTarget, editingSingleShift]);

  // Form states for creating/updating a roster
  const [formSchoolId, setFormSchoolId] = useState("");
  const [formBranchId, setFormBranchId] = useState("");
  const [formDeviceId, setFormDeviceId] = useState("");
  const [formShifts, setFormShifts] = useState<
    { _id?: string; routeObjId: string; startTime: string; endTime: string }[]
  >([{ routeObjId: "", startTime: "06:00", endTime: "09:00" }]);

  // Toolbar filters dropdowns data:
  // Only superAdmin needs schools list
  const { data: schoolsData = [], isLoading: isLoadingSchools } =
    useSchoolDropdown(isSuperAdmin);

  // Determine if branch dropdown should be fetched for filtering:
  // - Never fetch for "branch" role (branch users are already scoped to their branch)
  // - For superAdmin: only fetch when a specific school is selected
  // - For school: fetch when tokenSchoolId is present
  const shouldFetchFilterBranches = useMemo(() => {
    if (userRole === "branch") return false;
    if (isSuperAdmin) return !!selectedSchoolId;
    if (userRole === "school") return !!tokenSchoolId;
    if (userRole === "branchGroup") return true;
    return false;
  }, [userRole, isSuperAdmin, selectedSchoolId, tokenSchoolId]);

  const filterSchoolIdForBranch = isSuperAdmin
    ? selectedSchoolId
    : tokenSchoolId;

  const { data: filterBranchesData = [], isLoading: isLoadingFilterBranches } =
    useBranchDropdown(
      filterSchoolIdForBranch,
      shouldFetchFilterBranches,
      userRole === "branchGroup"
    );

  // Form dropdown data (for Assign Route dialog):
  // ONLY fetch when the dialog is open!
  const shouldFetchFormBranches = useMemo(() => {
    if (!isAssignDialogOpen) return false;
    if (userRole === "branch") return false;
    if (isSuperAdmin) return !!formSchoolId;
    if (userRole === "school") return !!tokenSchoolId;
    if (userRole === "branchGroup") return true;
    return false;
  }, [isAssignDialogOpen, userRole, isSuperAdmin, formSchoolId, tokenSchoolId]);

  const formSchoolIdForBranch = isSuperAdmin
    ? formSchoolId
    : tokenSchoolId;

  const { data: formBranchesData = [], isLoading: isLoadingFormBranches } =
    useBranchDropdown(
      formSchoolIdForBranch,
      shouldFetchFormBranches,
      userRole === "branchGroup"
    );

  // Auto-select single branch for school role in Assign dialog
  useEffect(() => {
    if (
      isAssignDialogOpen &&
      userRole === "school" &&
      formBranchesData.length === 1 &&
      !formBranchId
    ) {
      setFormBranchId(formBranchesData[0]._id);
    }
  }, [isAssignDialogOpen, userRole, formBranchesData, formBranchId]);

  const modalBranchId = useMemo(() => {
    if (isSuperAdmin) return formBranchId;
    if (userRole === "school") return formBranchId;
    if (userRole === "branch") return tokenBranchId;
    return formBranchId || tokenBranchId;
  }, [isSuperAdmin, userRole, formBranchId, tokenBranchId]);

  // Fetch devices and routes whenever Assign dialog is open!
  // For superAdmin: requires formBranchId.
  // For school: requires formBranchId.
  // For branch: uses tokenBranchId.
  const shouldFetchDevicesAndRoutes = useMemo(() => {
    if (!isAssignDialogOpen) return false;
    if (isSuperAdmin) return !!formBranchId;
    if (userRole === "school") return !!formBranchId;
    if (userRole === "branch") return !!tokenBranchId;
    return !!modalBranchId;
  }, [isAssignDialogOpen, isSuperAdmin, userRole, formBranchId, tokenBranchId, modalBranchId]);

  const { data: rawDevicesData, isLoading: isLoadingDevices } =
    useDeviceDropdown(modalBranchId || undefined, shouldFetchDevicesAndRoutes);
  const { data: rawRoutesData, isLoading: isLoadingRoutes } = useRouteDropdown(
    modalBranchId || undefined,
    shouldFetchDevicesAndRoutes
  );

  const devicesData: any[] = useMemo(() => {
    if (Array.isArray(rawDevicesData)) return rawDevicesData;
    if (rawDevicesData && Array.isArray((rawDevicesData as any).data)) {
      return (rawDevicesData as any).data;
    }
    if (rawDevicesData && Array.isArray((rawDevicesData as any).devices)) {
      return (rawDevicesData as any).devices;
    }
    return [];
  }, [rawDevicesData]);

  const routesData: any[] = useMemo(() => {
    if (Array.isArray(rawRoutesData)) return rawRoutesData;
    if (rawRoutesData && Array.isArray((rawRoutesData as any).data)) {
      return (rawRoutesData as any).data;
    }
    if (rawRoutesData && Array.isArray((rawRoutesData as any).routes)) {
      return (rawRoutesData as any).routes;
    }
    return [];
  }, [rawRoutesData]);

  // Single Shift Route Dropdown hook
  const singleShiftBranchId = useMemo(() => {
    if (editingSingleShift?.branchId) return editingSingleShift.branchId;
    if (userRole === "branch") return tokenBranchId;
    return modalBranchId || tokenBranchId || "";
  }, [editingSingleShift?.branchId, userRole, tokenBranchId, modalBranchId]);

  const { data: rawSingleShiftRoutes, isLoading: isLoadingSingleShiftRoutes } =
    useRouteDropdown(
      singleShiftBranchId || undefined,
      !!editingSingleShift && !!singleShiftBranchId
    );

  const singleShiftRoutesData: any[] = useMemo(() => {
    const src = rawSingleShiftRoutes || rawRoutesData;
    if (Array.isArray(src)) return src;
    if (src && Array.isArray((src as any).data)) return (src as any).data;
    if (src && Array.isArray((src as any).routes)) return (src as any).routes;
    return [];
  }, [rawSingleShiftRoutes, rawRoutesData]);

  // Fetch Roster Data from API (GET /api/roster)
  const {
    data: rosterResponse = [],
    isLoading: isRosterLoading,
  } = useQuery<RosterItem[]>({
    queryKey: [
      "rosters",
      debouncedSearch,
      selectedBranchId,
      selectedSchoolId,
      rosterActiveFilter,
    ],
    queryFn: async () => {
      try {
        const params: Record<string, any> = {};
        if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
        if (selectedSchoolId) params.schoolId = selectedSchoolId;
        if (selectedBranchId) params.branchId = selectedBranchId;
        if (rosterActiveFilter === "true" || rosterActiveFilter === "false") {
          params.isActive = rosterActiveFilter;
        }
        const res = await rosterService.getRosters(params);
        if (Array.isArray(res)) return res;
        if (Array.isArray(res?.data)) return res.data;
        return [];
      } catch (err) {
        console.error("Failed to fetch rosters:", err);
        return [];
      }
    },
  });

  const rawRosters: RosterItem[] = useMemo(() => {
    return Array.isArray(rosterResponse) ? rosterResponse : [];
  }, [rosterResponse]);

  // Expand all vehicles initially when rosters load
  useEffect(() => {
    if (rawRosters.length > 0) {
      const initialMap: Record<string, boolean> = {};
      rawRosters.forEach((item) => {
        initialMap[item._id] = true;
      });
      setExpandedVehicles((prev) => ({ ...initialMap, ...prev }));
    }
  }, [rawRosters]);

  // Mutations
  const createRosterMutation = useMutation({
    mutationFn: rosterService.createRoster,
    onSuccess: () => {
      toast.success("Roster saved successfully!");
      setIsAssignDialogOpen(false);
      resetAssignForm();
      document.body.style.pointerEvents = "";
      queryClient.invalidateQueries({ queryKey: ["rosters"] });
    },
    onError: (err: any) => {
      const resData = err?.response?.data;
      if (resData?.rosterId) {
        toast.error(
          resData.message || "Roster already exists for this vehicle."
        );
        setEditingRosterId(resData.rosterId);
      } else {
        toast.error(resData?.message || "Failed to save roster");
      }
    },
  });

  const updateRosterMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateRosterPayload;
    }) => rosterService.updateRoster(id, payload),
    onSuccess: () => {
      toast.success("Shifts updated successfully!");
      setIsAssignDialogOpen(false);
      resetAssignForm();
      document.body.style.pointerEvents = "";
      queryClient.invalidateQueries({ queryKey: ["rosters"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to update shifts");
    },
  });

  const updateShiftMutation = useMutation({
    mutationFn: ({
      rosterId,
      shiftId,
      payload,
    }: {
      rosterId: string;
      shiftId: string;
      payload: UpdateShiftPayload;
    }) => rosterService.updateShift(rosterId, shiftId, payload),
    onSuccess: () => {
      toast.success("Shift updated successfully!");
      setEditingSingleShift(null);
      document.body.style.pointerEvents = "";
      queryClient.invalidateQueries({ queryKey: ["rosters"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to update shift");
    },
  });

  const handleSaveSingleShift = () => {
    if (!editingSingleShift) return;
    if (
      !editingSingleShift.routeObjId ||
      !editingSingleShift.startTime ||
      !editingSingleShift.endTime
    ) {
      toast.error("Please fill in route, start time, and end time");
      return;
    }
    updateShiftMutation.mutate({
      rosterId: editingSingleShift.rosterId,
      shiftId: editingSingleShift.shiftId,
      payload: {
        routeObjId: editingSingleShift.routeObjId,
        startTime: editingSingleShift.startTime,
        endTime: editingSingleShift.endTime,
      },
    });
  };

  const deleteRosterMutation = useMutation({
    mutationFn: (id: string) => rosterService.deleteRoster(id),
    onSuccess: () => {
      toast.success("Vehicle roster deleted successfully");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["rosters"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to delete roster");
    },
  });

  const deleteShiftMutation = useMutation({
    mutationFn: ({
      rosterId,
      shiftId,
    }: {
      rosterId: string;
      shiftId: string;
    }) => rosterService.deleteShift(rosterId, shiftId),
    onSuccess: () => {
      toast.success("Shift deleted successfully");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["rosters"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to delete shift");
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      rosterService.toggleRosterStatus(id, isActive),
    onSuccess: (_, variables) => {
      toast.success(
        variables.isActive
          ? "Roster activated successfully"
          : "Roster deactivated successfully"
      );
      queryClient.invalidateQueries({ queryKey: ["rosters"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to update status");
    },
  });

  // Helper to determine shift status based on time
  const getShiftStatus = (
    startTime: string,
    endTime: string
  ): "Completed" | "In Progress" | "Scheduled" => {
    const [startH, startM] = (startTime || "00:00").split(":").map(Number);
    const [endH, endM] = (endTime || "00:00").split(":").map(Number);
    const startMinutes = (startH || 0) * 60 + (startM || 0);
    const endMinutes = (endH || 0) * 60 + (endM || 0);

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    if (currentMinutes > endMinutes) return "Completed";
    if (currentMinutes >= startMinutes && currentMinutes <= endMinutes)
      return "In Progress";
    return "Scheduled";
  };

  // Helper for route code and description
  const getRouteCode = (routeObjId: any, fallbackIndex: number): string => {
    if (!routeObjId) return `RT-${fallbackIndex + 1}`;
    if (typeof routeObjId === "string") return `RT-${fallbackIndex + 1}`;
    if (routeObjId.routeNumber) {
      return String(routeObjId.routeNumber);
    }
    if (routeObjId.routeName) {
      return String(routeObjId.routeName);
    }
    return `RT-${fallbackIndex + 1}`;
  };

  const getRouteDescription = (routeObjId: any): string => {
    if (!routeObjId || typeof routeObjId === "string") return "—";
    const start =
      typeof routeObjId.startPointGeoId === "object"
        ? routeObjId.startPointGeoId?.geofenceName ||
          routeObjId.startPointGeoId?.address
        : undefined;
    const end =
      typeof routeObjId.endPointGeoId === "object"
        ? routeObjId.endPointGeoId?.geofenceName ||
          routeObjId.endPointGeoId?.address
        : undefined;
    if (start && end) return `${start} → ${end}`;
    if (start) return `From ${start}`;
    if (end) return `To ${end}`;
    if (routeObjId.routeName) return String(routeObjId.routeName);
    if (routeObjId.name) return String(routeObjId.name);
    if (routeObjId.routeNumber) return `Route ${routeObjId.routeNumber}`;
    return "—";
  };

  // Filtered & Sorted Rosters
  const filteredRosters = useMemo(() => {
    return rawRosters
      .map((roster) => {
        // Filter shifts by search query & status
        const matchingShifts = (roster.shifts || []).filter((shift, idx) => {
          const status = getShiftStatus(shift.startTime, shift.endTime);
          if (statusFilter !== "ALL" && status !== statusFilter) return false;

          if (!searchQuery.trim()) return true;
          const q = searchQuery.toLowerCase();
          const busName = roster.deviceObjId?.name?.toLowerCase() || "";
          const code = getRouteCode(shift.routeObjId, idx).toLowerCase();
          const desc = getRouteDescription(shift.routeObjId).toLowerCase();
          const driver = shift.driverObjId?.driverName?.toLowerCase() || "";
          const phone = shift.driverObjId?.mobileNo?.toLowerCase() || "";

          return (
            busName.includes(q) ||
            code.includes(q) ||
            desc.includes(q) ||
            driver.includes(q) ||
            phone.includes(q)
          );
        });

        return {
          ...roster,
          shifts: matchingShifts,
        };
      })
      .filter((roster) => {
        if (!searchQuery.trim() && statusFilter === "ALL") return true;
        const busMatch =
          searchQuery.trim() &&
          roster.deviceObjId?.name
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase());
        return busMatch || roster.shifts.length > 0;
      })
      .sort((a, b) => {
        const nameA = a.deviceObjId?.name || "";
        const nameB = b.deviceObjId?.name || "";
        if (sortField === "vehicle") {
          return sortOrder === "asc"
            ? nameA.localeCompare(nameB)
            : nameB.localeCompare(nameA);
        }
        return 0;
      });
  }, [rawRosters, searchQuery, statusFilter, sortField, sortOrder]);

  const toggleAccordion = (id: string) => {
    setExpandedVehicles((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const resetAssignForm = () => {
    setFormSchoolId("");
    setFormBranchId("");
    setFormDeviceId("");
    setFormShifts([{ routeObjId: "", startTime: "06:00", endTime: "09:00" }]);
    setEditingRosterId(null);
  };

  const handleAddShiftRow = () => {
    setFormShifts((prev) => [
      ...prev,
      { routeObjId: "", startTime: "14:00", endTime: "16:00" },
    ]);
  };

  const handleRemoveShiftRow = (index: number) => {
    if (formShifts.length === 1) return;
    setFormShifts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleOpenAssignForVehicle = (roster: RosterItem) => {
    setEditingRosterId(roster._id);
    if (roster.deviceObjId?._id) {
      setFormDeviceId(roster.deviceObjId._id);
    }
    if (roster.branchId) {
      setFormBranchId(
        typeof roster.branchId === "string"
          ? roster.branchId
          : roster.branchId?._id || ""
      );
    }
    if (roster.schoolId) {
      setFormSchoolId(
        typeof roster.schoolId === "string"
          ? roster.schoolId
          : roster.schoolId?._id || ""
      );
    }
    if (roster.shifts && roster.shifts.length > 0) {
      setFormShifts(
        roster.shifts.map((s) => ({
          _id: s._id,
          routeObjId:
            typeof s.routeObjId === "object" && s.routeObjId?._id
              ? s.routeObjId._id
              : typeof s.routeObjId === "string"
              ? s.routeObjId
              : "",
          startTime: s.startTime || "06:00",
          endTime: s.endTime || "09:00",
        }))
      );
    } else {
      setFormShifts([
        { routeObjId: "", startTime: "06:00", endTime: "09:00" },
      ]);
    }
    setIsAssignDialogOpen(true);
  };

  const handleSaveRoster = () => {
    if (!formDeviceId) {
      toast.error("Please select a vehicle / bus");
      return;
    }
    if (isSuperAdmin && (!formSchoolId || !formBranchId)) {
      toast.error("Please select school and branch");
      return;
    }
    if (userRole === "school" && !formBranchId) {
      toast.error("Please select a branch");
      return;
    }
    const invalidShift = formShifts.find(
      (s) => !s.routeObjId || !s.startTime || !s.endTime
    );
    if (invalidShift) {
      toast.error("Please fill in route, start time, and end time for all shifts");
      return;
    }

    if (editingRosterId) {
      const payload: UpdateRosterPayload = {
        replaceShifts: true,
        shifts: formShifts.map((s) => ({
          ...(s._id ? { _id: s._id } : {}),
          routeObjId: s.routeObjId,
          startTime: s.startTime,
          endTime: s.endTime,
        })),
      };
      updateRosterMutation.mutate({
        id: editingRosterId,
        payload,
      });
    } else {
      const payload: CreateRosterPayload = {
        deviceObjId: formDeviceId,
        shifts: formShifts.map(({ routeObjId, startTime, endTime }) => ({
          routeObjId,
          startTime,
          endTime,
        })),
      };
      createRosterMutation.mutate(payload);
    }
  };

  return (
    <div className="space-y-6 pb-6">
      {/* ------------------- ACTION CONTROLS ------------------- */}
      <div className="flex flex-wrap items-center justify-end gap-2.5">
        {/* SuperAdmin School Filter */}
        {isSuperAdmin && (
          <div className="min-w-[170px]">
            <Select
              value={selectedSchoolId || "ALL"}
              onValueChange={(val) => {
                setSelectedSchoolId(val === "ALL" ? "" : val);
                setSelectedBranchId("");
              }}
            >
              <SelectTrigger className="w-full bg-white text-xs h-9.5 shadow-2xs">
                <SelectValue placeholder="All Schools" />
              </SelectTrigger>
              <SelectContent className="bg-white max-h-60">
                <SelectItem value="ALL" className="text-xs">
                  All Schools
                </SelectItem>
                {(schoolsData || []).map((s: any) => (
                  <SelectItem key={s._id} value={s._id} className="text-xs">
                    {s.schoolName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Branch Filter (for superAdmin and school roles) */}
        {(isSuperAdmin || userRole === "school") && (
          <div className="min-w-[170px]">
            <Select
              value={selectedBranchId || "ALL"}
              onValueChange={(val) =>
                setSelectedBranchId(val === "ALL" ? "" : val)
              }
              disabled={isSuperAdmin && !selectedSchoolId}
            >
              <SelectTrigger className="w-full bg-white text-xs h-9.5 shadow-2xs">
                <SelectValue
                  placeholder={
                    isSuperAdmin && !selectedSchoolId
                      ? "Select school first"
                      : "All Branches"
                  }
                />
              </SelectTrigger>
              <SelectContent className="bg-white max-h-60">
                <SelectItem value="ALL" className="text-xs">
                  All Branches
                </SelectItem>
                {(filterBranchesData || []).map((b: any) => (
                  <SelectItem key={b._id} value={b._id} className="text-xs">
                    {b.branchName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Search Box */}
        <div className="relative min-w-[200px] sm:min-w-[240px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search bus, route, driver..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-xs sm:text-sm placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="bg-white border-gray-200 text-gray-700 hover:bg-slate-50 flex items-center gap-1.5 text-xs sm:text-sm h-9.5 shadow-2xs"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-gray-500" />
              <span>Filters</span>
              {(statusFilter !== "ALL" || rosterActiveFilter !== "ALL") && (
                <span className="w-2 h-2 rounded-full bg-blue-600" />
              )}
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 ml-0.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 bg-white">
            <div className="px-2 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Roster Status
            </div>
            <DropdownMenuItem
              onClick={() => setRosterActiveFilter("ALL")}
              className={
                rosterActiveFilter === "ALL" ? "font-semibold text-blue-600" : ""
              }
            >
              All Rosters
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setRosterActiveFilter("true")}
              className={
                rosterActiveFilter === "true"
                  ? "font-semibold text-emerald-600"
                  : ""
              }
            >
              Active Only
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setRosterActiveFilter("false")}
              className={
                rosterActiveFilter === "false"
                  ? "font-semibold text-slate-600"
                  : ""
              }
            >
              Inactive Only
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <div className="px-2 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Shift Phase
            </div>
            <DropdownMenuItem
              onClick={() => setStatusFilter("ALL")}
              className={
                statusFilter === "ALL" ? "font-semibold text-blue-600" : ""
              }
            >
              All Shifts
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setStatusFilter("Completed")}
              className={
                statusFilter === "Completed"
                  ? "font-semibold text-emerald-600"
                  : ""
              }
            >
              Completed
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setStatusFilter("In Progress")}
              className={
                statusFilter === "In Progress"
                  ? "font-semibold text-amber-600"
                  : ""
              }
            >
              In Progress
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setStatusFilter("Scheduled")}
              className={
                statusFilter === "Scheduled"
                  ? "font-semibold text-blue-600"
                  : ""
              }
            >
              Scheduled
            </DropdownMenuItem>
            {(statusFilter !== "ALL" ||
              rosterActiveFilter !== "ALL" ||
              selectedBranchId ||
              selectedSchoolId) && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    setStatusFilter("ALL");
                    setRosterActiveFilter("ALL");
                    setSelectedBranchId("");
                    setSelectedSchoolId("");
                    setSearchQuery("");
                  }}
                  className="text-red-600 text-xs cursor-pointer font-medium"
                >
                  Clear All Filters
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Assign Route Primary Button */}
        <Button
          onClick={() => {
            resetAssignForm();
            setIsAssignDialogOpen(true);
          }}
          className="bg-[#0b57d0] hover:bg-blue-700 text-white font-medium px-3.5 py-2 rounded-lg flex items-center gap-1.5 text-xs sm:text-sm h-9.5 shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Assign Route</span>
        </Button>
      </div>

      {/* ------------------- ROSTERS TABLE ------------------- */}
      {isRosterLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center justify-center gap-3 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-sm">Loading vehicle rosters...</p>
        </div>
      ) : filteredRosters.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center space-y-3">
          <Bus className="w-12 h-12 text-gray-300 mx-auto" />
          <h3 className="text-base font-semibold text-gray-800">
            No vehicle rosters found
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 max-w-sm mx-auto">
            {searchQuery || selectedBranchId
              ? `No records matching your filters. Try adjusting your search query or filters.`
              : "No route shifting schedules exist yet. Click 'Assign Route' to create your first roster."}
          </p>
          <Button
            onClick={() => {
              resetAssignForm();
              setIsAssignDialogOpen(true);
            }}
            className="bg-[#0b57d0] hover:bg-blue-700 text-white text-xs h-8.5"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Assign Route
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
          <Table className="table-fixed w-full">
            <TableHeader className="bg-slate-50/70 border-b border-slate-200">
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="w-[24%] min-w-[210px] pl-6 py-3 text-xs font-semibold text-slate-600">
                  <span
                    onClick={() => {
                      setSortField("vehicle");
                      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
                    }}
                    className="cursor-pointer select-none hover:text-slate-900"
                  >
                    Vehicle
                  </span>
                </TableHead>
                <TableHead className="w-[18%] min-w-[140px] px-4 py-3 text-xs font-semibold text-slate-600">
                  Time
                </TableHead>
                <TableHead className="w-[20%] min-w-[160px] px-4 py-3 text-xs font-semibold text-slate-600">
                  Route
                </TableHead>
                <TableHead className="w-[18%] min-w-[140px] px-4 py-3 text-xs font-semibold text-slate-600">
                  Driver
                </TableHead>
                <TableHead className="w-[14%] min-w-[130px] px-4 py-3 text-xs font-semibold text-slate-600">
                  Driver Contact
                </TableHead>
                <TableHead className="w-[6%] min-w-[70px] pr-6 py-3 text-right text-xs font-semibold text-slate-600">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRosters.map((roster) => {
                const isExpanded = !!expandedVehicles[roster._id];
                const shifts = roster.shifts || [];

                // Helper to convert HH:mm to minutes
                const timeToMin = (t?: string) => {
                  if (!t) return 0;
                  const [h, m] = t.split(":").map(Number);
                  return (h || 0) * 60 + (m || 0);
                };

                const sortedShifts = [...shifts].sort(
                  (a, b) => timeToMin(a.startTime) - timeToMin(b.startTime)
                );

                const minMinutes =
                  sortedShifts.length > 0
                    ? timeToMin(sortedShifts[0].startTime)
                    : 360; // 06:00
                const maxMinutes =
                  sortedShifts.length > 0
                    ? Math.max(
                        ...sortedShifts.map((s) => timeToMin(s.endTime))
                      )
                    : 1080; // 18:00
                const totalSpan = Math.max(maxMinutes - minMinutes, 60);

                const earliestTimeStr =
                  sortedShifts.length > 0 ? sortedShifts[0].startTime : "06:00";
                const latestTimeStr =
                  sortedShifts.length > 0
                    ? sortedShifts[sortedShifts.length - 1].endTime
                    : "18:00";

                const uniqueRoutesList = Array.from(
                  sortedShifts.reduce((map, s, idx) => {
                    const code = getRouteCode(s.routeObjId, idx);
                    const desc = getRouteDescription(s.routeObjId);
                    if (!map.has(code)) {
                      map.set(code, {
                        code,
                        desc,
                        color: ROUTE_COLORS[idx % ROUTE_COLORS.length],
                      });
                    }
                    return map;
                  }, new Map<string, { code: string; desc: string; color: (typeof ROUTE_COLORS)[0] }>()).values()
                );

                let lastLeft = -15;
                const positionedShifts = sortedShifts.map((shift, idx) => {
                  const startMin = timeToMin(shift.startTime);
                  let rawLeft = ((startMin - minMinutes) / totalSpan) * 100;
                  if (rawLeft < lastLeft + 10) {
                    rawLeft = lastLeft + 10;
                  }
                  const left = Math.max(0.5, Math.min(rawLeft, 88));
                  lastLeft = left;
                  return { shift, left, idx };
                });

                return (
                  <React.Fragment key={roster._id}>
                    {/* VEHICLE GROUP HEADER ROW */}
                    <TableRow
                      onClick={() => toggleAccordion(roster._id)}
                      className="bg-slate-50/50 hover:bg-slate-100/70 border-t-2 border-b border-slate-200/90 cursor-pointer select-none transition-colors"
                    >
                      {/* Column 1: Vehicle Chevron + Icon + Name + Active Route */}
                      <TableCell className="w-[24%] min-w-[210px] pl-6 py-3">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            className="p-1 rounded text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                            aria-label="Toggle vehicle roster details"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>

                          <div className="w-8.5 h-8.5 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-2xs">
                            <Bus className="w-4.5 h-4.5" />
                          </div>

                          <div className="truncate min-w-0">
                            <div className="font-bold text-slate-900 text-sm leading-tight truncate">
                              {roster.deviceObjId?.name || "BUS-UNKNOWN"}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Columns 2-5: Assigned Routes & Shift Timeline Bar */}
                      <TableCell colSpan={4} className="px-4 py-3">
                        {shifts.length > 0 ? (
                          <div className="flex items-center justify-between gap-4 w-full">
                            {/* Assigned Routes Badges */}
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
                                Routes:
                              </span>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {uniqueRoutesList.map((rt, i) => (
                                  <span
                                    key={i}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold border shadow-2xs ${rt.color.bg}`}
                                    title={rt.desc !== "—" ? `${rt.code}: ${rt.desc}` : rt.code}
                                  >
                                    <span>{rt.code}</span>
                                    {rt.desc !== "—" && rt.desc !== rt.code && (
                                      <span className="text-[11px] font-medium opacity-80 max-w-[130px] truncate hidden xl:inline">
                                        {rt.desc}
                                      </span>
                                    )}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Shift Timeline Bar */}
                            <div className="flex items-center gap-2.5 flex-1 max-w-md min-w-[200px]">
                              {/* Start Time */}
                              <span className="text-[11px] font-semibold text-slate-500 shrink-0 select-none">
                                {earliestTimeStr}
                              </span>

                              {/* Timeline Track */}
                              <div className="relative flex-1 h-7 bg-slate-100/90 rounded-full border border-slate-200/80 shadow-inner flex items-center px-1 overflow-hidden">
                                <div className="absolute inset-x-3 top-1/2 -translate-y-1/2 h-px bg-slate-200/90 pointer-events-none" />

                                {positionedShifts.map(({ shift, left, idx }) => {
                                  const code = getRouteCode(
                                    shift.routeObjId,
                                    idx
                                  );
                                  const color =
                                    ROUTE_COLORS[idx % ROUTE_COLORS.length];
                                  return (
                                    <div
                                      key={shift._id || idx}
                                      className={`absolute top-1 bottom-1 px-2.5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-2xs border z-10 transition-transform hover:scale-105 cursor-pointer ${color.bg}`}
                                      style={{ left: `${left}%` }}
                                      title={`${code} (${shift.startTime} – ${shift.endTime})`}
                                    >
                                      <span>{code}</span>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* End Time */}
                              <span className="text-[11px] font-semibold text-slate-500 shrink-0 select-none">
                                {latestTimeStr}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            No shifts assigned
                          </span>
                        )}
                      </TableCell>

                      {/* Column 6: Actions Dropdown & Expand Indicator */}
                      <TableCell
                        className="w-[6%] min-w-[70px] pr-6 py-3 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-400 hover:text-slate-700 cursor-pointer"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-48 bg-white"
                            >
                              <DropdownMenuItem
                                onSelect={() => {
                                  setTimeout(() => {
                                    handleOpenAssignForVehicle(roster);
                                  }, 0);
                                }}
                              >
                                <Pencil className="w-3.5 h-3.5 mr-2 text-blue-600" />
                                <span>Edit Shifts to Bus</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  toggleStatusMutation.mutate({
                                    id: roster._id,
                                    isActive: !roster.isActive,
                                  })
                                }
                              >
                                <Power className="w-3.5 h-3.5 mr-2 text-slate-500" />
                                <span>
                                  {roster.isActive
                                    ? "Deactivate Roster"
                                    : "Activate Roster"}
                                </span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onSelect={() => {
                                  setTimeout(() => {
                                    setDeleteTarget({
                                      type: "roster",
                                      rosterId: roster._id,
                                      name:
                                        roster.deviceObjId?.name ||
                                        "this vehicle",
                                    });
                                  }, 0);
                                }}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-2" />
                                <span>Delete Vehicle Roster</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>

                          <div className="text-slate-400 cursor-pointer">
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* EXPANDED SHIFT ROWS */}
                    {isExpanded && shifts.length === 0 && (
                      <TableRow className="bg-white">
                        <TableCell
                          colSpan={6}
                          className="py-6 text-center text-xs text-slate-400"
                        >
                          No shifts assigned to this vehicle yet.
                        </TableCell>
                      </TableRow>
                    )}

                    {isExpanded &&
                      shifts.map((shift, shiftIndex) => {
                        const routeCode = getRouteCode(
                          shift.routeObjId,
                          shiftIndex
                        );
                        const routeDesc = getRouteDescription(
                          shift.routeObjId
                        );
                        const color =
                          ROUTE_COLORS[shiftIndex % ROUTE_COLORS.length];
                        const driverInitials =
                          shift.driverObjId?.driverName
                            ?.trim()
                            .charAt(0)
                            .toUpperCase() || "—";
                        const avatarColor =
                          DRIVER_AVATAR_COLORS[
                            shiftIndex % DRIVER_AVATAR_COLORS.length
                          ];

                        return (
                          <TableRow
                            key={shift._id || shiftIndex}
                            className="bg-white hover:bg-slate-50/70 border-b border-slate-100 transition-colors"
                          >
                            {/* Sequence Circle directly aligned under Bus Icon */}
                            <TableCell className="w-[24%] min-w-[210px] py-3 pl-6">
                              <div className="flex items-center gap-2.5">
                                <div className="w-6 shrink-0" />
                                <div className="w-3 shrink-0" />
                                <div className="w-8.5 flex items-center justify-center shrink-0">
                                  <div className="w-6 h-6 rounded-full border border-slate-200 text-slate-600 flex items-center justify-center font-semibold text-xs bg-white shadow-2xs">
                                    {shiftIndex + 1}
                                  </div>
                                </div>
                                <div className="truncate min-w-0">
                                  <div className="text-xs font-semibold text-slate-800 truncate">
                                    {roster.deviceObjId?.name || "Bus"}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-medium">
                                    Shift #{shiftIndex + 1}
                                  </div>
                                </div>
                              </div>
                            </TableCell>

                            {/* Time */}
                            <TableCell className="w-[18%] min-w-[140px] py-3 px-4">
                              <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>
                                  {shift.startTime} – {shift.endTime}
                                </span>
                              </div>
                            </TableCell>

                            {/* Route Badge + Route Name */}
                            <TableCell className="w-[20%] min-w-[160px] py-3 px-4">
                              <div className="flex items-center gap-2 truncate">
                                <span
                                  className={`inline-flex px-2.5 py-0.5 rounded-md text-xs font-bold border shrink-0 ${color.bg}`}
                                >
                                  {routeCode}
                                </span>
                                <span
                                  className="truncate text-xs font-medium text-slate-700"
                                  title={routeDesc !== "—" ? routeDesc : `Route ${routeCode}`}
                                >
                                  {routeDesc !== "—" ? routeDesc : `Route ${routeCode}`}
                                </span>
                              </div>
                            </TableCell>

                            {/* Driver */}
                            <TableCell className="w-[18%] min-w-[140px] py-3 px-4">
                              {shift.driverObjId?.driverName ? (
                                <div className="flex items-center gap-2 truncate">
                                  <div
                                    className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs ${avatarColor}`}
                                  >
                                    {driverInitials}
                                  </div>
                                  <span
                                    className="truncate font-medium text-slate-800 text-xs"
                                    title={shift.driverObjId.driverName}
                                  >
                                    {shift.driverObjId.driverName}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-400 text-xs italic">
                                  Unassigned
                                </span>
                              )}
                            </TableCell>

                            {/* Driver Contact */}
                            <TableCell className="w-[15%] min-w-[140px] py-3 px-4">
                              {shift.driverObjId?.mobileNo ? (
                                <div className="flex items-center gap-1.5 truncate text-xs text-slate-600 font-normal">
                                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span
                                    className="truncate"
                                    title={shift.driverObjId.mobileNo}
                                  >
                                    {shift.driverObjId.mobileNo}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-400 text-xs">—</span>
                              )}
                            </TableCell>

                            {/* Actions (DropdownMenu) */}
                            <TableCell className="w-[6%] min-w-[70px] pr-6 py-3 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7 text-slate-400 hover:text-slate-700 bg-white border-slate-200/80 shadow-2xs rounded-md p-0 inline-flex items-center justify-center cursor-pointer"
                                  >
                                    <MoreHorizontal className="w-3.5 h-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="end"
                                  className="w-36 bg-white"
                                >
                                  <DropdownMenuItem
                                    onSelect={() => {
                                      setTimeout(() => {
                                        if (shift._id) {
                                          setEditingSingleShift({
                                            rosterId: roster._id,
                                            shiftId: shift._id,
                                            routeObjId:
                                              typeof shift.routeObjId === "object" && shift.routeObjId?._id
                                                ? shift.routeObjId._id
                                                : typeof shift.routeObjId === "string"
                                                ? shift.routeObjId
                                                : "",
                                            startTime: shift.startTime || "06:00",
                                            endTime: shift.endTime || "09:00",
                                            routeName: routeCode,
                                            busName: roster.deviceObjId?.name || "Bus",
                                            branchId:
                                              typeof roster.branchId === "string"
                                                ? roster.branchId
                                                : roster.branchId?._id || "",
                                          });
                                        } else {
                                          handleOpenAssignForVehicle(roster);
                                        }
                                      }, 0);
                                    }}
                                    className="text-xs"
                                  >
                                    <Pencil className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                                    <span>Edit Shift</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onSelect={() => {
                                      setTimeout(() => {
                                        setDeleteTarget({
                                          type: "shift",
                                          rosterId: roster._id,
                                          shiftId:
                                            shift._id || String(shiftIndex),
                                          name: `Shift (${shift.startTime} - ${shift.endTime})`,
                                        });
                                      }, 0);
                                    }}
                                    className="text-red-600 focus:text-red-600 text-xs"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                                    <span>Delete Shift</span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ------------------- ASSIGN / EDIT ROUTE DIALOG (POST / PUT /api/roster) ------------------- */}
      <Dialog
        open={isAssignDialogOpen}
        onOpenChange={(open) => {
          setIsAssignDialogOpen(open);
          if (!open) {
            resetAssignForm();
            document.body.style.pointerEvents = "";
          }
        }}
      >
        <DialogContent
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            document.body.style.pointerEvents = "";
          }}
          className="max-w-2xl bg-white p-6 max-h-[90vh] overflow-y-auto"
        >
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Bus className="w-5 h-5 text-blue-600" />
              {editingRosterId
                ? "Edit Shifts for Vehicle"
                : "Assign Route to Vehicle"}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              {editingRosterId
                ? "Modify auto-shifting route rules and daily shifts for this vehicle."
                : "Set auto-shifting route rules and daily shifts for a vehicle."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* SuperAdmin: School & Branch Selection */}
            {isSuperAdmin && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-gray-200">
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">
                    School <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={formSchoolId}
                    onValueChange={(val) => {
                      setFormSchoolId(val);
                      setFormBranchId("");
                      setFormDeviceId("");
                    }}
                  >
                    <SelectTrigger className="w-full bg-white text-xs h-9">
                      <SelectValue placeholder="Select School" />
                    </SelectTrigger>
                    <SelectContent className="bg-white max-h-60">
                      {isLoadingSchools ? (
                        <div className="py-2.5 px-3 text-xs text-gray-400 text-center">
                          Loading schools...
                        </div>
                      ) : (schoolsData || []).length === 0 ? (
                        <div className="py-2.5 px-3 text-xs text-gray-400 text-center">
                          No schools found
                        </div>
                      ) : (
                        (schoolsData || []).map((s: any) => (
                          <SelectItem
                            key={s._id}
                            value={s._id}
                            className="text-xs"
                          >
                            {s.schoolName}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">
                    Branch <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={formBranchId}
                    onValueChange={(val) => {
                      setFormBranchId(val);
                      setFormDeviceId("");
                    }}
                    disabled={!formSchoolId}
                  >
                    <SelectTrigger className="w-full bg-white text-xs h-9">
                      <SelectValue
                        placeholder={
                          !formSchoolId
                            ? "Select school first"
                            : isLoadingFormBranches
                            ? "Loading branches..."
                            : "Select Branch"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent className="bg-white max-h-60">
                      {isLoadingFormBranches ? (
                        <div className="py-2.5 px-3 text-xs text-gray-400 text-center">
                          Loading branches...
                        </div>
                      ) : (formBranchesData || []).length === 0 ? (
                        <div className="py-2.5 px-3 text-xs text-gray-400 text-center">
                          No branches found
                        </div>
                      ) : (
                        (formBranchesData || []).map((b: any) => (
                          <SelectItem
                            key={b._id}
                            value={b._id}
                            className="text-xs"
                          >
                            {b.branchName}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* School role: Branch Selection */}
            {!isSuperAdmin && userRole === "school" && (
              <div className="p-3 bg-slate-50 rounded-lg border border-gray-200">
                <label className="text-xs font-semibold text-gray-700 mb-1 block">
                  Branch <span className="text-red-500">*</span>
                </label>
                <Select
                  value={formBranchId}
                  onValueChange={(val) => {
                    setFormBranchId(val);
                    setFormDeviceId("");
                  }}
                >
                  <SelectTrigger className="w-full bg-white text-xs h-9">
                    <SelectValue
                      placeholder={
                        isLoadingFormBranches
                          ? "Loading branches..."
                          : "Select Branch"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="bg-white max-h-60">
                    {isLoadingFormBranches ? (
                      <div className="py-2.5 px-3 text-xs text-gray-400 text-center">
                        Loading branches...
                      </div>
                    ) : (formBranchesData || []).length === 0 ? (
                      <div className="py-2.5 px-3 text-xs text-gray-400 text-center">
                        No branches found
                      </div>
                    ) : (
                      (formBranchesData || []).map((b: any) => (
                        <SelectItem
                          key={b._id}
                          value={b._id}
                          className="text-xs"
                        >
                          {b.branchName}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

              {/* Vehicle Selection */}
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">
                  Select Vehicle (Bus) <span className="text-red-500">*</span>
                </label>
                <Select
                  value={formDeviceId}
                  onValueChange={setFormDeviceId}
                  disabled={
                    !!editingRosterId ||
                    ((isSuperAdmin || userRole === "school") && !formBranchId)
                  }
                >
                <SelectTrigger className="w-full bg-white text-xs h-9.5">
                  <SelectValue
                    placeholder={
                      (isSuperAdmin || userRole === "school") && !formBranchId
                        ? "Select branch first"
                        : isLoadingDevices
                        ? "Loading devices..."
                        : "Choose a bus / device..."
                    }
                  />
                </SelectTrigger>
                <SelectContent className="bg-white max-h-60">
                  {isLoadingDevices ? (
                    <div className="py-2.5 px-3 text-xs text-gray-400 text-center">
                      Loading devices...
                    </div>
                  ) : devicesData.length === 0 ? (
                    <div className="py-2.5 px-3 text-xs text-gray-400 text-center">
                      {(isSuperAdmin || userRole === "school") && !formBranchId
                        ? "Please select branch first"
                        : "No devices found"}
                    </div>
                  ) : (
                    devicesData.map((dev: any) => (
                      <SelectItem
                        key={dev._id}
                        value={dev._id}
                        className="text-xs"
                      >
                        {dev.name
                          ? dev.uniqueId && dev.uniqueId !== dev.name
                            ? `${dev.name} (${dev.uniqueId})`
                            : dev.name
                          : dev.uniqueId || dev._id}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Shifts Section */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-600">
                  Daily Shifts & Route Shifting Rules
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddShiftRow}
                  className="h-7 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  <Plus className="w-3 h-3 mr-1" /> Add Shift
                </Button>
              </div>

              {formShifts.map((shift, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-50/70 border border-gray-200 rounded-lg space-y-2 relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700">
                      Shift #{idx + 1}
                    </span>
                    {formShifts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveShiftRow(idx)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Remove shift"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="text-[11px] text-gray-500 mb-1 block">
                        Assigned Route
                      </label>
                      <Select
                        value={shift.routeObjId}
                        onValueChange={(val) => {
                          const updated = [...formShifts];
                          updated[idx].routeObjId = val;
                          setFormShifts(updated);
                        }}
                      >
                        <SelectTrigger className="w-full bg-white text-xs h-8.5">
                          <SelectValue
                            placeholder={
                              isLoadingRoutes
                                ? "Loading routes..."
                                : "Select Route"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent className="bg-white max-h-60">
                          {isLoadingRoutes ? (
                            <div className="py-2 px-3 text-xs text-gray-400 text-center">
                              Loading routes...
                            </div>
                          ) : routesData.length === 0 ? (
                            <div className="py-2 px-3 text-xs text-gray-400 text-center">
                              No routes found
                            </div>
                          ) : (
                            routesData.map((rt: any) => (
                              <SelectItem
                                key={rt._id}
                                value={rt._id}
                                className="text-xs"
                              >
                                {rt.routeNumber
                                  ? `Route ${rt.routeNumber}`
                                  : rt.routeName || rt.name || "Route"}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-[11px] text-gray-500 mb-1 block">
                        Start Time
                      </label>
                      <Input
                        type="time"
                        value={shift.startTime}
                        onChange={(e) => {
                          const updated = [...formShifts];
                          updated[idx].startTime = e.target.value;
                          setFormShifts(updated);
                        }}
                        className="bg-white text-xs h-8.5"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-gray-500 mb-1 block">
                        End Time
                      </label>
                      <Input
                        type="time"
                        value={shift.endTime}
                        onChange={(e) => {
                          const updated = [...formShifts];
                          updated[idx].endTime = e.target.value;
                          setFormShifts(updated);
                        }}
                        className="bg-white text-xs h-8.5"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsAssignDialogOpen(false);
                resetAssignForm();
                document.body.style.pointerEvents = "";
              }}
              className="text-xs h-9 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveRoster}
              disabled={
                createRosterMutation.isPending || updateRosterMutation.isPending
              }
              className="bg-[#0b57d0] hover:bg-blue-700 text-white text-xs h-9 cursor-pointer"
            >
              {createRosterMutation.isPending ||
              updateRosterMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  {editingRosterId ? "Updating..." : "Saving..."}
                </>
              ) : editingRosterId ? (
                "Update Shifts"
              ) : (
                "Save Roster"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ------------------- DELETE CONFIRMATION ALERT (DELETE /api/roster/:id or DELETE /api/roster/:rosterId/shift/:shiftId) ------------------- */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            document.body.style.pointerEvents = "";
          }
        }}
      >
        <AlertDialogContent
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            document.body.style.pointerEvents = "";
          }}
          className="bg-white"
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 text-base">
              {deleteTarget?.type === "roster"
                ? "Delete Vehicle Roster?"
                : "Delete Shift?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-gray-500">
              Are you sure you want to delete {deleteTarget?.name}? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={
                deleteRosterMutation.isPending || deleteShiftMutation.isPending
              }
              className="text-xs h-8.5"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteTarget) return;
                if (deleteTarget.type === "roster") {
                  deleteRosterMutation.mutate(deleteTarget.rosterId);
                } else if (deleteTarget.shiftId) {
                  deleteShiftMutation.mutate({
                    rosterId: deleteTarget.rosterId,
                    shiftId: deleteTarget.shiftId,
                  });
                }
              }}
              disabled={
                deleteRosterMutation.isPending || deleteShiftMutation.isPending
              }
              className="bg-red-600 hover:bg-red-700 text-white text-xs h-8.5"
            >
              {(deleteRosterMutation.isPending ||
                deleteShiftMutation.isPending) ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ------------------- EDIT SINGLE SHIFT DIALOG (PUT /api/roster/:rosterId/shift/:shiftId) ------------------- */}
      <Dialog
        open={!!editingSingleShift}
        onOpenChange={(open) => {
          if (!open) {
            setEditingSingleShift(null);
            document.body.style.pointerEvents = "";
          }
        }}
      >
        <DialogContent
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            document.body.style.pointerEvents = "";
          }}
          className="max-w-md bg-white p-6"
        >
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Edit Shift
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              {editingSingleShift?.busName
                ? `Update timings or assigned route for ${editingSingleShift.busName}.`
                : "Update shift timings or assigned route."}
            </DialogDescription>
          </DialogHeader>

          {editingSingleShift && (
            <div className="space-y-3.5 py-2">
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">
                  Assigned Route <span className="text-red-500">*</span>
                </label>
                <Select
                  value={editingSingleShift.routeObjId}
                  onValueChange={(val) =>
                    setEditingSingleShift((prev) =>
                      prev ? { ...prev, routeObjId: val } : null
                    )
                  }
                >
                  <SelectTrigger className="w-full bg-white text-xs h-9">
                    <SelectValue
                      placeholder={
                        isLoadingSingleShiftRoutes
                          ? "Loading routes..."
                          : "Select Route"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="bg-white max-h-60">
                    {isLoadingSingleShiftRoutes ? (
                      <div className="py-2.5 px-3 text-xs text-gray-400 text-center">
                        Loading routes...
                      </div>
                    ) : singleShiftRoutesData.length === 0 ? (
                      <div className="py-2.5 px-3 text-xs text-gray-400 text-center">
                        No routes found
                      </div>
                    ) : (
                      singleShiftRoutesData.map((rt: any) => (
                        <SelectItem
                          key={rt._id}
                          value={rt._id}
                          className="text-xs"
                        >
                          {rt.routeNumber
                            ? `Route ${rt.routeNumber}`
                            : rt.routeName || rt.name || "Route"}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">
                    Start Time (24h) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="time"
                    value={editingSingleShift.startTime}
                    onChange={(e) =>
                      setEditingSingleShift((prev) =>
                        prev ? { ...prev, startTime: e.target.value } : null
                      )
                    }
                    className="bg-white text-xs h-9"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">
                    End Time (24h) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="time"
                    value={editingSingleShift.endTime}
                    onChange={(e) =>
                      setEditingSingleShift((prev) =>
                        prev ? { ...prev, endTime: e.target.value } : null
                      )
                    }
                    className="bg-white text-xs h-9"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditingSingleShift(null);
                document.body.style.pointerEvents = "";
              }}
              className="text-xs h-9 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveSingleShift}
              disabled={updateShiftMutation.isPending}
              className="bg-[#0b57d0] hover:bg-blue-700 text-white text-xs h-9 cursor-pointer"
            >
              {updateShiftMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Shift"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
