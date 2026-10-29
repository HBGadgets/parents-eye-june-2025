"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { bleService } from "@/services/api/bleService";
import { BleDevice } from "@/interface/ble";
import { getBleDeviceColumns } from "@/components/columns/columns";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RefreshCw,
  Download,
  FileSpreadsheet,
  FileText,
  Search,
  X,
  ListFilter,
  Pencil,
  Loader2,
} from "lucide-react";
import { useExport } from "@/hooks/useExport";
import { toast } from "sonner";
import { format } from "date-fns";
import { useSchoolDropdown, useBranchDropdown } from "@/hooks/useDropdown";
import { supervisorService } from "@/services/api/supervisorService";
import { studentService } from "@/services/api/studentService";
import { useAuthStore } from "@/store/authStore";
import { Combobox, ComboboxItem } from "@/components/ui/combobox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function GeoTagMasterPage() {
  const [devices, setDevices] = useState<BleDevice[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");

  const [selectedSchoolId, setSelectedSchoolId] = useState<string | undefined>();
  const [selectedBranchId, setSelectedBranchId] = useState<string | undefined>();

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const [sorting, setSorting] = useState<any[]>([]);

  const { decodedToken, role } = useAuthStore();
  const userRole = (role || decodedToken?.role || "").toLowerCase();

  // Filter school dropdown
  const [isSchoolDropdownOpen, setIsSchoolDropdownOpen] = useState(false);
  const { data: schoolData = [] } = useSchoolDropdown(true);

  // Filter branch dropdown
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const { data: branchData = [] } = useBranchDropdown(
    selectedSchoolId,
    isBranchDropdownOpen || !!selectedSchoolId
  );

  // Edit modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingDevice, setEditingDevice] = useState<any | null>(null);
  const [editName, setEditName] = useState<string>("");
  const [editSchoolId, setEditSchoolId] = useState<string>("none");
  const [editBranchId, setEditBranchId] = useState<string>("none");
  const [editSupervisorId, setEditSupervisorId] = useState<string>("none");
  const [editChildId, setEditChildId] = useState<string>("none");
  const [editSubscriptionEndDate, setEditSubscriptionEndDate] = useState<string>("");
  const [editStatus, setEditStatus] = useState<"active" | "inactive">("active");
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Edit modal branch options
  const { data: editBranchData = [] } = useBranchDropdown(
    editSchoolId && editSchoolId !== "none" ? editSchoolId : undefined,
    isEditModalOpen && editSchoolId !== "none"
  );

  // Dynamic branch supervisors and students for edit modal
  const [branchSupervisors, setBranchSupervisors] = useState<any[]>([]);
  const [branchStudents, setBranchStudents] = useState<any[]>([]);
  const [isLoadingBranchData, setIsLoadingBranchData] = useState<boolean>(false);

  useEffect(() => {
    if (!isEditModalOpen || !editBranchId || editBranchId === "none") {
      setBranchSupervisors([]);
      setBranchStudents([]);
      return;
    }

    let isMounted = true;
    setIsLoadingBranchData(true);

    Promise.allSettled([
      supervisorService.getSupervisor({ branchId: editBranchId, limit: 100 }),
      studentService.getStudents({ branchId: editBranchId, limit: 100 }),
    ]).then(([supResult, stuResult]) => {
      if (!isMounted) return;
      if (supResult.status === "fulfilled") {
        const resSup: any = supResult.value;
        const sups =
          resSup?.data ||
          resSup?.supervisors ||
          (Array.isArray(resSup) ? resSup : []);
        setBranchSupervisors(Array.isArray(sups) ? sups : []);
      }
      if (stuResult.status === "fulfilled") {
        const resStu: any = stuResult.value;
        const stus =
          resStu?.children ||
          resStu?.data ||
          (Array.isArray(resStu) ? resStu : []);
        setBranchStudents(Array.isArray(stus) ? stus : []);
      }
      setIsLoadingBranchData(false);
    });

    return () => {
      isMounted = false;
    };
  }, [isEditModalOpen, editBranchId]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch devices
  const fetchDevices = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await bleService.getBleDevices({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: debouncedSearch.trim() || undefined,
        schoolId: selectedSchoolId,
        branchId: selectedBranchId,
        sortBy: sorting[0]?.id || "createdAt",
        sortOrder: sorting[0]?.desc ? "desc" : "asc",
      });

      if (res && res.success) {
        setDevices(res.devices || []);
        setTotalCount(res.total || 0);
      } else {
        setDevices([]);
        setTotalCount(0);
      }
    } catch (err: any) {
      console.error("Failed to load BLE GeoTag devices:", err);
      toast.error("Failed to load GeoTag devices", {
        description: err?.response?.data?.message || err?.message || "Server error",
      });
      setDevices([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [
    pagination.pageIndex,
    pagination.pageSize,
    debouncedSearch,
    selectedSchoolId,
    selectedBranchId,
    sorting,
  ]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await bleService.syncBleDevices();
      toast.success("Devices synced successfully");
    } catch (err: any) {
      console.error("Failed to sync BLE devices:", err);
      toast.error("Failed to sync devices", {
        description:
          err?.response?.data?.message || err?.message || "Sync failed",
      });
    } finally {
      fetchDevices();
    }
  };

  // Map devices for table
  const mappedDevices = useMemo(() => {
    return devices.map((tag) => {
      const lat = Number(tag.lastLocation?.lat) || 0;
      const lng = Number(tag.lastLocation?.lng) || 0;
      const isValidCoord = !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
      const isOnline = tag.status === "active" || tag.isActive;

      return {
        _id: tag._id,
        deviceId: tag._id,
        uniqueId: tag.uniqueId || tag.sn,
        imei: tag.sn || tag.uniqueId,
        sim: tag.mac || "",
        mac: tag.mac || "",
        name: tag.name || tag.sn || "BLE GeoTag",
        status: isOnline ? "running" : "inactive",
        address: tag.lastLocation?.address || "",
        latitude: isValidCoord ? lat : undefined,
        longitude: isValidCoord ? lng : undefined,
        lat: isValidCoord ? lat : undefined,
        lng: isValidCoord ? lng : undefined,
        batteryLevel: tag.battery ?? 100,
        batteryStatus: tag.batteryStatus || "OK",
        lastUpdate: tag.lastUpdate || tag.updatedAt || tag.createdAt || "",
        updatedAt: tag.lastUpdate || tag.updatedAt || tag.createdAt || "",
        schoolName:
          typeof tag.schoolId === "object"
            ? tag.schoolId?.schoolName
            : undefined,
        branchName:
          typeof tag.branchId === "object"
            ? tag.branchId?.branchName
            : undefined,
        childName:
          typeof tag.childId === "object"
            ? tag.childId?.childName
            : typeof tag.childId === "string"
            ? tag.childId
            : undefined,
        child: typeof tag.childId === "object" ? tag.childId : undefined,
        childId: tag.childId,
        category: tag.category || "BLE",
        model: tag.model || "GeoTag",
        rawBleDevice: tag,
      };
    });
  }, [devices]);

  // Open Edit Dialog
  const handleOpenEdit = useCallback((dev: any) => {
    const raw = dev?.rawBleDevice || dev;
    setEditingDevice(raw);
    setEditName(raw?.name || raw?.sn || "");

    const sId =
      typeof raw?.schoolId === "object"
        ? raw?.schoolId?._id
        : raw?.schoolId || "";
    const bId =
      typeof raw?.branchId === "object"
        ? raw?.branchId?._id
        : raw?.branchId || "";
    const supId =
      typeof raw?.supervisorId === "object"
        ? raw?.supervisorId?._id
        : raw?.supervisorId || "";
    const chId =
      typeof raw?.childId === "object"
        ? raw?.childId?._id
        : raw?.childId || "";

    setEditSchoolId(sId || "none");
    setEditBranchId(bId || "none");
    setEditSupervisorId(supId || "none");
    setEditChildId(chId || "none");
    setEditStatus(raw?.status === "inactive" ? "inactive" : "active");

    if (raw?.subscriptionEndDate) {
      try {
        const d = new Date(raw.subscriptionEndDate);
        if (!isNaN(d.getTime())) {
          setEditSubscriptionEndDate(d.toISOString().split("T")[0]);
        } else {
          setEditSubscriptionEndDate("");
        }
      } catch {
        setEditSubscriptionEndDate("");
      }
    } else {
      setEditSubscriptionEndDate("");
    }

    setIsEditModalOpen(true);
  }, []);

  // Save Edit GeoTag Hierarchy & Data
  const handleSaveEdit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingDevice) return;

    const targetId = editingDevice._id || editingDevice.deviceId || editingDevice.id;
    if (!targetId) {
      toast.error("Device ID not found");
      return;
    }

    setIsSaving(true);
    try {
      const payload: {
        name?: string;
        schoolId: string | null;
        branchId: string | null;
        supervisorId: string | null;
        childId: string | null;
        subscriptionEndDate: string | null;
        status: string;
      } = {
        name: editName.trim() || undefined,
        schoolId: editSchoolId && editSchoolId !== "none" ? editSchoolId : null,
        branchId: editBranchId && editBranchId !== "none" ? editBranchId : null,
        supervisorId: editSupervisorId && editSupervisorId !== "none" ? editSupervisorId : null,
        childId: editChildId && editChildId !== "none" ? editChildId : null,
        subscriptionEndDate: editSubscriptionEndDate
          ? new Date(editSubscriptionEndDate).toISOString()
          : null,
        status: editStatus,
      };

      const res = await bleService.updateBleDeviceAssignment(targetId, payload);
      if (res && (res.success || res._id || res.message)) {
        toast.success(res.message || "BLE Device assignment updated successfully");
        setIsEditModalOpen(false);
        setEditingDevice(null);
        fetchDevices();
      } else {
        toast.error(res?.message || "Failed to update BLE Device");
      }
    } catch (err: any) {
      console.error("Failed to update GeoTag:", err);
      toast.error(err?.response?.data?.message || err?.message || "Failed to update GeoTag");
    } finally {
      setIsSaving(false);
    }
  };

  // Dropdown options for Edit Modal
  const editSchoolOptions: ComboboxItem[] = useMemo(() => {
    const options: ComboboxItem[] = [{ label: "None (Unassigned)", value: "none" }];
    if (editingDevice?.schoolId) {
      const rawSchool = editingDevice.schoolId;
      const sId = typeof rawSchool === "object" ? rawSchool._id : rawSchool;
      const sName = typeof rawSchool === "object" ? rawSchool.schoolName : undefined;
      if (sId && !schoolData.some((s: any) => s._id === sId)) {
        options.push({ label: sName || "Current School", value: sId });
      }
    }
    (schoolData || []).forEach((s: any) => {
      options.push({ label: s.schoolName, value: s._id });
    });
    return options;
  }, [editingDevice, schoolData]);

  const editBranchOptions: ComboboxItem[] = useMemo(() => {
    const options: ComboboxItem[] = [{ label: "None (Unassigned)", value: "none" }];
    if (editingDevice?.branchId) {
      const rawBranch = editingDevice.branchId;
      const bId = typeof rawBranch === "object" ? rawBranch._id : rawBranch;
      const bName = typeof rawBranch === "object" ? rawBranch.branchName : undefined;
      if (bId && !editBranchData.some((b: any) => b._id === bId)) {
        options.push({ label: bName || "Current Branch", value: bId });
      }
    }
    (editBranchData || []).forEach((b: any) => {
      options.push({ label: b.branchName, value: b._id });
    });
    return options;
  }, [editingDevice, editBranchData]);

  const supervisorOptions: ComboboxItem[] = useMemo(() => {
    const options: ComboboxItem[] = [{ label: "None (Unassigned)", value: "none" }];
    if (editingDevice?.supervisorId) {
      const rawSup = editingDevice.supervisorId;
      const supId = typeof rawSup === "object" ? rawSup._id : rawSup;
      const supName = typeof rawSup === "object" ? rawSup.supervisorName : undefined;
      if (supId && !branchSupervisors.some((s: any) => s._id === supId)) {
        options.push({ label: supName || "Current Supervisor", value: supId });
      }
    }
    branchSupervisors.forEach((s: any) => {
      options.push({ label: s.supervisorName, value: s._id });
    });
    return options;
  }, [editingDevice, branchSupervisors]);

  const studentOptions: ComboboxItem[] = useMemo(() => {
    const options: ComboboxItem[] = [{ label: "None (Unassigned)", value: "none" }];
    if (editingDevice?.childId) {
      const rawChild = editingDevice.childId;
      const chId = typeof rawChild === "object" ? rawChild._id : rawChild;
      const chName =
        typeof rawChild === "object"
          ? `${rawChild.childName}${rawChild.className ? ` (${rawChild.className})` : ""}`
          : undefined;
      if (chId && !branchStudents.some((c: any) => c._id === chId)) {
        options.push({ label: chName || "Current Child", value: chId });
      }
    }
    branchStudents.forEach((c: any) => {
      options.push({
        label: `${c.childName || "Student"}${c.className ? ` (${c.className})` : ""}`,
        value: c._id,
      });
    });
    return options;
  }, [editingDevice, branchStudents]);

  // Columns: Replace History action button with Edit button
  const columns = useMemo(
    () =>
      getBleDeviceColumns(
        undefined,
        undefined,
        (dev) => handleOpenEdit(dev)
      ),
    [handleOpenEdit]
  );

  const { tableElement } = CustomTableServerSidePagination({
    data: mappedDevices,
    columns,
    pagination,
    totalCount,
    loading: isLoading,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    sorting,
    emptyMessage: "No GeoTag devices found",
    pageSizeOptions: [5, 10, 20, 30, 50, 100],
    enableSorting: true,
    showSerialNumber: true,
    getRowId: (row) => row.deviceId ?? row.uniqueId,
  });

  // Export handlers
  const { exportToPDF, exportToExcel } = useExport();

  const exportColumns = useMemo(
    () => [
      { key: "name", header: "Device Name" },
      { key: "uniqueId", header: "Serial Number (SN)" },
      { key: "mac", header: "MAC Address" },
      { key: "status", header: "Status" },
      { key: "batteryLevel", header: "Battery (%)" },
      { key: "childName", header: "Assigned Child" },
      { key: "schoolName", header: "School" },
      { key: "branchName", header: "Branch" },
      { key: "address", header: "Last Known Address" },
      { key: "lastUpdate", header: "Last Update" },
    ],
    []
  );

  const fetchExportData = useCallback(async () => {
    const res = await bleService.getBleDevices({
      page: 1,
      limit: Math.max(totalCount, 500),
      search: debouncedSearch.trim() || undefined,
      schoolId: selectedSchoolId,
      branchId: selectedBranchId,
    });
    if (!res || !res.devices) return [];
    return res.devices.map((tag) => ({
      name: tag.name || tag.sn || "BLE GeoTag",
      uniqueId: tag.uniqueId || tag.sn || "-",
      mac: tag.mac || "-",
      status: tag.status || (tag.isActive ? "Active" : "Inactive"),
      batteryLevel: tag.battery ?? "-",
      childName:
        typeof tag.childId === "object" ? tag.childId?.childName : "-",
      schoolName:
        typeof tag.schoolId === "object" ? tag.schoolId?.schoolName : "-",
      branchName:
        typeof tag.branchId === "object" ? tag.branchId?.branchName : "-",
      address: tag.lastLocation?.address || "-",
      lastUpdate: tag.lastUpdate
        ? format(new Date(tag.lastUpdate), "PPpp")
        : "-",
    }));
  }, [totalCount, debouncedSearch, selectedSchoolId, selectedBranchId]);

  const handleExportExcel = async () => {
    try {
      const data = await fetchExportData();
      await exportToExcel(data, exportColumns, {
        filename: "geotag-master-report",
        title: "BLE GeoTag Master Devices Report",
        metadata: {
          "Total Devices": String(data.length),
          "Generated On": format(new Date(), "PPpp"),
        },
      });
      toast.success("Excel exported successfully");
    } catch (e: any) {
      toast.error("Export failed: " + (e?.message || e));
    }
  };

  const handleExportPdf = async () => {
    try {
      const data = await fetchExportData();
      await exportToPDF(data, exportColumns, {
        filename: "geotag-master-report",
        title: "BLE GeoTag Master Devices Report",
        metadata: {
          "Total Devices": String(data.length),
          "Generated On": format(new Date(), "PPpp"),
        },
      });
      toast.success("PDF exported successfully");
    } catch (e: any) {
      toast.error("Export failed: " + (e?.message || e));
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 space-y-4 p-4 md:p-6 bg-slate-50/50 dark:bg-slate-900/50">
      {/* Search Bar & Action Controls Tile */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by tag name, SN, MAC, or child..."
            className="pl-9 pr-9 h-10 w-full"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Action Controls & Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* School & Branch Filters for SuperAdmin */}
          {userRole === "superadmin" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-10 gap-2 cursor-pointer">
                  <ListFilter className="h-4 w-4" />
                  Filter
                  {(selectedSchoolId || selectedBranchId) && (
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4 space-y-3" align="end">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    School
                  </label>
                  <Combobox
                    items={[
                      { label: "All Schools", value: "all" },
                      ...(schoolData?.map((school: any) => ({
                        label: school.schoolName,
                        value: school._id,
                      })) || []),
                    ]}
                    value={selectedSchoolId || "all"}
                    onValueChange={(val) => {
                      setSelectedSchoolId(val === "all" ? undefined : val);
                      setSelectedBranchId(undefined);
                      setPagination((p) => ({ ...p, pageIndex: 0 }));
                    }}
                    onOpenChange={setIsSchoolDropdownOpen}
                    placeholder="Select School"
                    searchPlaceholder="Search school..."
                    width="w-full"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Branch
                  </label>
                  <Combobox
                    items={[
                      { label: "All Branches", value: "all" },
                      ...(branchData?.map((branch: any) => ({
                        label: branch.branchName,
                        value: branch._id,
                      })) || []),
                    ]}
                    value={selectedBranchId || "all"}
                    onValueChange={(val) => {
                      setSelectedBranchId(val === "all" ? undefined : val);
                      setPagination((p) => ({ ...p, pageIndex: 0 }));
                    }}
                    onOpenChange={setIsBranchDropdownOpen}
                    placeholder="Select Branch"
                    searchPlaceholder="Search branch..."
                    width="w-full"
                  />
                </div>

                {(selectedSchoolId || selectedBranchId) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-red-600 hover:text-red-700"
                    onClick={() => {
                      setSelectedSchoolId(undefined);
                      setSelectedBranchId(undefined);
                      setPagination((p) => ({ ...p, pageIndex: 0 }));
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </PopoverContent>
            </Popover>
          )}

          {/* Refresh Button */}
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
            className="gap-2 h-10 cursor-pointer"
            title="Refresh Devices"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>

          {/* Export Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="gap-2 h-10 cursor-pointer"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-44 p-2" align="end">
              <div className="flex flex-col gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start gap-2 text-xs w-full"
                  onClick={handleExportExcel}
                >
                  <FileSpreadsheet className="h-4 w-4 text-green-600" />
                  Export Excel
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start gap-2 text-xs w-full"
                  onClick={handleExportPdf}
                >
                  <FileText className="h-4 w-4 text-red-600" />
                  Export PDF
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Table Section */}
      <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden p-2">
        {tableElement}
      </div>

      {/* Edit GeoTag Dialog */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl p-6">
          <DialogHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-amber-600" />
                  Edit GeoTag Assignment
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-1">
                  Update tag details and assign to school, branch, supervisor, or child.
                </DialogDescription>
              </div>
              {editingDevice?.sn && (
                <span className="px-2.5 py-1 text-xs font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700">
                  {editingDevice.sn}
                </span>
              )}
            </div>
          </DialogHeader>

          <form onSubmit={handleSaveEdit} className="space-y-4 pt-2">
            {/* Tag Name & Status in 2 columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="tagName" className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Tag / Device Name
                </Label>
                <Input
                  id="tagName"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Rohan's Bag Tag"
                  className="h-9 text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Device Status
                </Label>
                <Select
                  value={editStatus}
                  onValueChange={(val: "active" | "inactive") => setEditStatus(val)}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* School & Branch in 2 columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  School
                </Label>
                <Combobox
                  items={editSchoolOptions}
                  value={editSchoolId}
                  onValueChange={(val) => {
                    const newSchool = val || "none";
                    setEditSchoolId(newSchool);
                    setEditBranchId("none");
                    setEditSupervisorId("none");
                    setEditChildId("none");
                  }}
                  placeholder="Select School"
                  searchPlaceholder="Search school..."
                  width="w-full"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Branch
                </Label>
                <Combobox
                  items={editBranchOptions}
                  value={editBranchId}
                  onValueChange={(val) => {
                    const newBranch = val || "none";
                    setEditBranchId(newBranch);
                    setEditSupervisorId("none");
                    setEditChildId("none");
                  }}
                  disabled={!editSchoolId || editSchoolId === "none"}
                  placeholder={
                    !editSchoolId || editSchoolId === "none"
                      ? "Select School first"
                      : "Select Branch"
                  }
                  searchPlaceholder="Search branch..."
                  width="w-full"
                />
              </div>
            </div>

            {/* Supervisor & Child Assignment in 2 columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Assigned Supervisor
                  </Label>
                  {isLoadingBranchData && (
                    <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                  )}
                </div>
                <Combobox
                  items={supervisorOptions}
                  value={editSupervisorId}
                  onValueChange={(val) => setEditSupervisorId(val || "none")}
                  disabled={!editBranchId || editBranchId === "none"}
                  placeholder={
                    !editBranchId || editBranchId === "none"
                      ? "Select Branch first"
                      : "Select Supervisor (Optional)"
                  }
                  searchPlaceholder="Search supervisor..."
                  width="w-full"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Assigned Child / Student
                  </Label>
                  {isLoadingBranchData && (
                    <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                  )}
                </div>
                <Combobox
                  items={studentOptions}
                  value={editChildId}
                  onValueChange={(val) => setEditChildId(val || "none")}
                  disabled={!editBranchId || editBranchId === "none"}
                  placeholder={
                    !editBranchId || editBranchId === "none"
                      ? "Select Branch first"
                      : "Select Child (Optional)"
                  }
                  searchPlaceholder="Search child..."
                  width="w-full"
                />
              </div>
            </div>

            {/* Subscription End Date */}
            <div className="space-y-1.5">
              <Label htmlFor="subEndDate" className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Subscription End Date (Optional)
              </Label>
              <Input
                id="subEndDate"
                type="date"
                value={editSubscriptionEndDate}
                onChange={(e) => setEditSubscriptionEndDate(e.target.value)}
                className="h-9 text-sm"
              />
              <p className="text-[11px] text-slate-400">
                Leave empty to unassign or clear subscription expiry.
              </p>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving || !editName.trim()}
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
