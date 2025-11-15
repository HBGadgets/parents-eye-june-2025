"use client";

import React, { useCallback, useEffect, useState, useRef, useMemo } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DynamicEditDialog, FieldConfig } from "@/components/ui/EditModal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import { FloatingMenu } from "@/components/floatingMenu";
import { Badge } from "@/components/ui/badge";
import { XCircle } from "lucide-react";
import { useSchoolData } from "@/hooks/useSchoolData";
import { useBranchData } from "@/hooks/useBranchData";
import { useInfiniteDeviceData } from "@/hooks/useInfiniteDeviceData";
import { type ColumnDef, SortingState, VisibilityState } from "@tanstack/react-table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/apiService";
import { useExport } from "@/hooks/useExport";
import { Alert } from "@/components/Alert";
import ResponseLoader from "@/components/ResponseLoader";
import { ColumnVisibilitySelector } from "@/components/column-visibility-selector";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";
import { SearchBar } from "@/components/search-bar/SearchBarPagination";
import Cookies from "js-cookie";

interface Route {
  _id: string;
  routeNumber: string;
  deviceObjId?: any;
  schoolId?: any;
  branchId?: any;
  createdAt: string;
}

interface SelectOption {
  label: string;
  value: string;
}

interface DecodedToken {
  role: string;
  id?: string;
  schoolId?: string;
  branchId?: string;
  schoolName?: string;
  AssignedBranch?: Array<{ _id: string; branchName: string }>;
}

const getDecodedToken = (token: string): DecodedToken | null => {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

const getAuthToken = () => {
  if (typeof window !== "undefined") {
    return Cookies.get("token") || localStorage.getItem("token") || sessionStorage.getItem("token");
  }
  return null;
};

const FilterBadge = ({ label, value, onRemove }: { label: string; value: string; onRemove: () => void }) => (
  <Badge variant="secondary" className="flex items-center gap-1 bg-blue-100 text-blue-800 border-blue-200">
    <span className="text-xs">{label}: {value}</span>
    <button onClick={onRemove} className="ml-1 rounded-full hover:bg-blue-200 p-0.5" type="button">
      <XCircle className="w-3 h-3" />
    </button>
  </Badge>
);

export default function RoutesMaster() {
  const queryClient = useQueryClient();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: false }]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [filters, setFilters] = useState({ school: "", branch: "" });
  const [deleteTarget, setDeleteTarget] = useState<Route | null>(null);
  const [editTarget, setEditTarget] = useState<Route | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [school, setSchool] = useState("");
  const [schoolSearch, setSchoolSearch] = useState("");
  const [branch, setBranch] = useState("");
  const [branchSearch, setBranchSearch] = useState("");
  const [device, setDevice] = useState("");
  const [deviceSearch, setDeviceSearch] = useState("");
  const [role, setRole] = useState<string | null>(null);
  const [userSchoolId, setUserSchoolId] = useState<string | null>(null);
  const [userBranchId, setUserBranchId] = useState<string | null>(null);
  const [userSchoolName, setUserSchoolName] = useState<string | null>(null);

  const { exportToPDF, exportToExcel } = useExport();

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    const decoded = getDecodedToken(token);
    const r = decoded?.role?.toLowerCase() || "";
    setRole(r);
    setUserSchoolName(decoded?.schoolName || null);

    if (["school", "schooladmin"].includes(r)) {
      const schoolId = decoded?.id || decoded?.schoolId || null;
      setUserSchoolId(schoolId);
      if (schoolId) setFilters(prev => ({ ...prev, school: schoolId }));
    } else {
      setUserSchoolId(decoded?.schoolId || null);
    }

    if (["branch", "branchadmin"].includes(r)) {
      const branchId = decoded?.id || decoded?.branchId || null;
      setUserBranchId(branchId);
      if (branchId) setFilters(prev => ({ ...prev, branch: branchId }));
    } else {
      setUserBranchId(decoded?.branchId || null);
    }

    if (r === "branchgroup" && decoded?.AssignedBranch?.length) {
      setUserBranchId(decoded.AssignedBranch[0]._id);
      setFilters(prev => ({ ...prev, branch: decoded.AssignedBranch[0]._id }));
    }
  }, []);

  const normalizedRole = useMemo(() => {
    const r = (role || "").toLowerCase();
    if (["superadmin", "super_admin", "admin", "root"].includes(r)) return "superAdmin";
    if (["school", "schooladmin"].includes(r)) return "school";
    if (["branch", "branchadmin"].includes(r)) return "branch";
    if (["branchgroup"].includes(r)) return "branchGroup";
    return undefined;
  }, [role]);

  const isSuperAdmin = normalizedRole === "superAdmin";
  const isSchoolRole = normalizedRole === "school";
  const isBranchRole = normalizedRole === "branch";
  const isBranchGroupRole = normalizedRole === "branchGroup";

  const { data: schoolData } = useSchoolData();
  const { data: branchData } = useBranchData();

  const {
    data: deviceData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching: isFetchingDevices,
  } = useInfiniteDeviceData({
    role: normalizedRole as any,
    branchId: branch || undefined,
    search: deviceSearch,
    limit: 20,
  });

  const routeFilters = useMemo(
    () => ({
      ...(debouncedSearchTerm && { search: debouncedSearchTerm.trim() }),
      ...(filters.school && { schoolId: filters.school }),
      ...(filters.branch && { branchId: filters.branch }),
    }),
    [debouncedSearchTerm, filters]
  );

  const { data: routesData, isLoading, isFetching } = useQuery({
    queryKey: ["routes", pagination.pageIndex, pagination.pageSize, sorting, routeFilters],
    queryFn: async () => {
      const params: any = {
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        ...(sorting.length > 0 && {
          sortBy: sorting[0].id,
          sortOrder: sorting[0].desc ? "desc" : "asc",
        }),
        ...routeFilters,
      };

      const res = await api.get("/route", params);
      return res?.data 
        ? { data: res.data, total: res.total || res.data.length } 
        : { data: [], total: 0 };
    },
  });

  const routes = routesData?.data || [];
  const totalCount = routesData?.total || 0;

  const deviceItems = useMemo(() => {
    if (!deviceData?.pages?.length) return [];
    return deviceData.pages.flatMap((pg: any) => {
      const list = pg.devices ?? pg.data ?? [];
      return list.map((d: any) => ({
        label: d.deviceName || d.name || "Device",
        value: d._id,
      }));
    });
  }, [deviceData]);

  const enrichedDeviceItems = useMemo(() => {
    if (!editTarget) return deviceItems;
    const deviceId = typeof editTarget.deviceObjId === "object" ? editTarget.deviceObjId?._id : editTarget.deviceObjId;
    if (deviceItems.some((d) => d.value === deviceId)) return deviceItems;

    return [
      {
        label: (typeof editTarget.deviceObjId === "object" && (editTarget.deviceObjId.deviceName || editTarget.deviceObjId.name)) || "Device",
        value: deviceId,
      },
      ...deviceItems,
    ];
  }, [deviceItems, editTarget]);

  const getDeviceName = useCallback((route: Route) => {
    if (!route.deviceObjId) return "N/A";
    if (typeof route.deviceObjId === "object") {
      return route.deviceObjId.deviceName || route.deviceObjId.name || "Device";
    }
    for (const page of deviceData?.pages || []) {
      const list = page.devices ?? page.data ?? [];
      const found = list.find((d: any) => d._id === route.deviceObjId);
      if (found) return found.deviceName || found.name || "Device";
    }
    return "Device Not Found";
  }, [deviceData]);

  const schoolOptions = useMemo(() => {
    if (!schoolData) return [];
    return schoolData.map((s: any) => ({ label: s.schoolName || `School ${s._id}`, value: s._id }));
  }, [schoolData]);

  const filterBranchOptions = useMemo(() => {
    if (!branchData) return [];
    if (isBranchRole && userBranchId) {
      const userBranch = branchData.find((b: any) => b._id === userBranchId);
      return userBranch ? [{ label: userBranch.branchName, value: userBranch._id }] : [];
    }
    if (filters.school) {
      return branchData
        .filter((b: any) => {
          const schoolId = typeof b.schoolId === "object" ? b.schoolId?._id : b.schoolId;
          return schoolId === filters.school;
        })
        .map((b: any) => ({ label: b.branchName, value: b._id }));
    }
    if (isSchoolRole && userSchoolId) {
      return branchData
        .filter((b: any) => {
          const schoolId = typeof b.schoolId === "object" ? b.schoolId?._id : b.schoolId;
          return schoolId === userSchoolId;
        })
        .map((b: any) => ({ label: b.branchName, value: b._id }));
    }
    return branchData.map((b: any) => ({ label: b.branchName, value: b._id }));
  }, [branchData, filters.school, isSchoolRole, userSchoolId, isBranchRole, userBranchId]);

  const addFormBranchOptions = useMemo(() => {
    if (!branchData) return [];
    if (isBranchRole && userBranchId) {
      const userBranch = branchData.find((b: any) => b._id === userBranchId);
      return userBranch ? [{ label: userBranch.branchName, value: userBranch._id }] : [];
    }
    if (school) {
      return branchData
        .filter((b: any) => {
          const schoolId = typeof b.schoolId === "object" ? b.schoolId?._id : b.schoolId;
          return schoolId === school;
        })
        .map((b: any) => ({ label: b.branchName, value: b._id }));
    }
    if ((isSchoolRole || isBranchGroupRole) && userSchoolId) {
      return branchData
        .filter((b: any) => {
          const schoolId = typeof b.schoolId === "object" ? b.schoolId?._id : b.schoolId;
          return schoolId === userSchoolId;
        })
        .map((b: any) => ({ label: b.branchName, value: b._id }));
    }
    return branchData.map((b: any) => ({ label: b.branchName, value: b._id }));
  }, [branchData, school, isSchoolRole, userSchoolId, isBranchRole, userBranchId, isBranchGroupRole]);

  const activeFilters = useMemo(() => {
    const active: Array<{ key: string; label: string; value: string }> = [];
    if (filters.school && isSuperAdmin) {
      const schoolObj = schoolOptions.find((s) => s.value === filters.school);
      active.push({ key: "school", label: "School", value: schoolObj?.label || filters.school });
    }
    if (filters.branch && !isBranchRole) {
      const branchObj = filterBranchOptions.find((b) => b.value === filters.branch);
      active.push({ key: "branch", label: "Branch", value: branchObj?.label || filters.branch });
    }
    return active;
  }, [filters, schoolOptions, filterBranchOptions, isSuperAdmin, isBranchRole]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [filters.school, filters.branch]);

  const handleDeviceReachEnd = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && !isFetchingDevices && branch) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, isFetchingDevices, branch, fetchNextPage]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (deviceItems.length > 0 && deviceItems.length < 20 && hasNextPage && !isFetchingNextPage && branch) {
        fetchNextPage();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [deviceItems.length, hasNextPage, isFetchingNextPage, branch, fetchNextPage]);

  useEffect(() => {
    if ((isSchoolRole || isBranchGroupRole) && userSchoolId && !school) {
      setSchool(userSchoolId);
    }
  }, [isSchoolRole, isBranchGroupRole, userSchoolId, school]);

  useEffect(() => {
    if ((isBranchRole || isBranchGroupRole) && userBranchId && !branch) {
      setBranch(userBranchId);
    }
  }, [isBranchRole, isBranchGroupRole, userBranchId, branch]);

  useEffect(() => {
    if (school && (isSchoolRole || isBranchGroupRole)) {
      setBranch("");
      setBranchSearch("");
    }
  }, [school, isSchoolRole, isBranchGroupRole]);

  useEffect(() => {
    setDevice("");
    setDeviceSearch("");
  }, [branch]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => {
      const newFilters = { ...prev, [key]: value };
      if (key === "school") newFilters.branch = "";
      return newFilters;
    });
  };

  const clearFilter = (filterKey: string) => {
    setFilters((prev) => {
      const newFilters = { ...prev };
      if (filterKey === "school") {
        newFilters.school = isSchoolRole && userSchoolId ? userSchoolId : "";
        newFilters.branch = "";
      } else if (filterKey === "branch") {
        newFilters.branch = isBranchRole && userBranchId ? userBranchId : "";
      }
      return newFilters;
    });
  };

  const clearFilters = () => {
    const newFilters = { school: "", branch: "" };
    if (isSchoolRole && userSchoolId) newFilters.school = userSchoolId;
    if (isBranchRole && userBranchId) newFilters.branch = userBranchId;
    setFilters(newFilters);
  };

  const isSearchActive = searchTerm.trim() !== "";
  const isFilterActive = Object.values(filters).some(Boolean);

  const columns: ColumnDef<Route>[] = useMemo(() => [
    {
      id: "routeNumber",
      header: "Route Number",
      accessorFn: (row) => row.routeNumber || "N/A",
      enableSorting: true,
    },
    {
      id: "deviceName",
      header: "Device Name",
      accessorFn: (row) => getDeviceName(row),
      enableSorting: true,
    },
    ...(isSuperAdmin ? [{
      id: "schoolName",
      header: "School Name",
      accessorFn: (row: Route) => {
        if (row.schoolId && typeof row.schoolId === "object") return row.schoolId.schoolName || "N/A";
        const s = schoolData?.find((sc: any) => sc._id === row.schoolId);
        return s ? s.schoolName : "N/A";
      },
      enableSorting: true,
    }] : []),
    {
      id: "branchName",
      header: "Branch Name",
      accessorFn: (row) => {
        if (row.branchId && typeof row.branchId === "object") return row.branchId.branchName || "N/A";
        const b = branchData?.find((br: any) => br._id === row.branchId);
        return b ? b.branchName : "N/A";
      },
      enableSorting: true,
    },
    {
      id: "createdAt",
      header: "Created At",
      accessorFn: (row) => new Date(row.createdAt).toLocaleDateString("en-GB"),
      enableSorting: true,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center justify-center gap-3 py-2">
          <button
            onClick={() => {
              setEditTarget(row.original);
              setEditDialogOpen(true);
            }}
            className="cursor-pointer bg-yellow-400 hover:bg-yellow-500 text-[#733e0a] font-semibold py-1.5 px-4 rounded-md text-sm"
          >
            Edit
          </button>
          {(isSuperAdmin || isSchoolRole || isBranchRole || isBranchGroupRole) && (
            <button
              onClick={() => setDeleteTarget(row.original)}
              className="cursor-pointer bg-yellow-400 hover:bg-yellow-500 text-red-600 font-semibold py-1.5 px-4 rounded-md text-sm"
            >
              Delete
            </button>
          )}
        </div>
      ),
    },
  ], [isSuperAdmin, schoolData, branchData, getDeviceName, isSchoolRole, isBranchRole, isBranchGroupRole]);

  const columnsForExport = [
    { key: "routeNumber", header: "Route Number" },
    { key: "deviceName", header: "Device Name", accessor: (row: Route) => getDeviceName(row) },
    ...(isSuperAdmin ? [{
      key: "schoolName",
      header: "School Name",
      accessor: (row: Route) => row.schoolId && typeof row.schoolId === "object" ? row.schoolId.schoolName || "N/A" : "N/A",
    }] : []),
    {
      key: "branchName",
      header: "Branch Name",
      accessor: (row: Route) => row.branchId && typeof row.branchId === "object" ? row.branchId.branchName || "N/A" : "N/A",
    },
    { key: "createdAt", header: "Created At", formatter: (v: string) => new Date(v).toLocaleDateString("en-GB") },
  ];

  const getRouteFieldConfigs = (
    schoolOptions: SelectOption[],
    branchOptions: SelectOption[],
    deviceOptions: SelectOption[]
  ): FieldConfig[] => {
    const fields: FieldConfig[] = [
      { label: "Route Number", key: "routeNumber", type: "text", required: true },
    ];
    if (isSuperAdmin) fields.push({ label: "School Name", key: "schoolId", type: "select", required: true, options: schoolOptions });
    if (isSuperAdmin || isSchoolRole || isBranchGroupRole) fields.push({ label: "Branch Name", key: "branchId", type: "select", required: true, options: branchOptions });
    fields.push({ label: "Device", key: "deviceObjId", type: "select", required: true, options: deviceOptions });
    return fields;
  };

  const addRouteMutation = useMutation({
    mutationFn: async (newRoute: any) => api.post("/route", newRoute),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routes"] });
      alert("Route added successfully.");
    },
    onError: (err: any) => alert(`Failed to add route.\nError: ${err.message}`),
  });

  const updateRouteMutation = useMutation({
    mutationFn: async ({ routeId, data }: any) => api.put(`/route/${routeId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routes"] });
      setEditDialogOpen(false);
      setEditTarget(null);
      alert("Route updated successfully.");
    },
    onError: (err: any) => alert(`Failed to update route.\nError: ${err.message}`),
  });

  const deleteRouteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/route/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routes"] });
      setDeleteTarget(null);
      alert("Route deleted successfully!");
    },
    onError: (err: any) => alert(`Failed to delete route.\nError: ${err.message}`),
  });

  const handleSave = (updatedData: Partial<Route>) => {
    if (!editTarget) return;
    const changed: any = {};
    for (const key in updatedData) {
      const newVal = updatedData[key as keyof Route];
      let originalVal = editTarget[key as keyof Route];
      if (key === "schoolId" || key === "branchId" || key === "deviceObjId") {
        if (typeof originalVal === "object" && originalVal) originalVal = (originalVal as any)._id;
        if (typeof newVal === "object" && newVal) {
          const normalizedNewVal = (newVal as any)._id;
          if (normalizedNewVal !== originalVal) changed[key] = normalizedNewVal;
          continue;
        }
      }
      if (newVal !== originalVal) changed[key] = newVal;
    }
    if (!Object.keys(changed).length) {
      alert("No changes detected.");
      return;
    }
    updateRouteMutation.mutate({ routeId: editTarget._id, data: changed });
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const form = e.target;
    const data = new FormData(form);
    const token = getAuthToken();
    const decoded = token ? getDecodedToken(token) : null;

    let selectedSchool = school;
    let selectedBranch = branch;

    if (!isSuperAdmin) selectedSchool = decoded?.schoolId || userSchoolId || "";
    if (isBranchRole) selectedBranch = decoded?.id || userBranchId || "";
    else if (isBranchGroupRole) selectedBranch = branch || (decoded?.AssignedBranch?.length ? decoded.AssignedBranch[0]._id : "");

    if (!selectedSchool) { alert("School missing."); return; }
    if (!selectedBranch) { alert("Branch missing."); return; }
    if (!device) { alert("Device missing."); return; }

    const payload = {
      routeNumber: data.get("routeNumber") as string,
      deviceObjId: device,
      schoolId: selectedSchool,
      branchId: selectedBranch,
    };

    await addRouteMutation.mutateAsync(payload);
    closeButtonRef.current?.click();
    form.reset();
    setDevice("");
    setDeviceSearch("");
    if (isSuperAdmin) {
      setSchool("");
      setBranch("");
      setSchoolSearch("");
      setBranchSearch("");
    }
  };

  const handleExportPdf = () => {
    exportToPDF(routes, columnsForExport, {
      title: "Routes Master Report",
      companyName: "Parents Eye",
      metadata: {
        Total: `${totalCount} routes`,
        Search: isSearchActive ? "Filtered results" : "All routes",
        ...(searchTerm && { "Search Term": `"${searchTerm}"` }),
        ...(filters.school && { School: schoolOptions.find((s) => s.value === filters.school)?.label || filters.school }),
        ...(filters.branch && { Branch: filterBranchOptions.find((b) => b.value === filters.branch)?.label || filters.branch }),
        Role: role || "Unknown",
      },
    });
  };

  const handleExportExcel = () => {
    exportToExcel(routes, columnsForExport, {
      title: "Routes Master Report",
      companyName: "Parents Eye",
      metadata: {
        Total: `${totalCount} routes`,
        Search: isSearchActive ? "Filtered results" : "All routes",
        ...(searchTerm && { "Search Term": `"${searchTerm}"` }),
        ...(filters.school && { School: schoolOptions.find((s) => s.value === filters.school)?.label || filters.school }),
        ...(filters.branch && { Branch: filterBranchOptions.find((b) => b.value === filters.branch)?.label || filters.branch }),
        Role: role || "Unknown",
      },
    });
  };

  const { table, tableElement } = CustomTableServerSidePagination({
    data: routes,
    columns,
    pagination,
    totalCount,
    loading: isLoading || isFetching,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    sorting,
    columnVisibility,
    onColumnVisibilityChange: setColumnVisibility,
    emptyMessage: isSearchActive || isFilterActive ? "No routes found matching your search/filter criteria" : "No routes found",
    pageSizeOptions: [5, 10, 20, 30, 50],
    enableSorting: true,
    showSerialNumber: true,
  });

  return (
    <main>
      <ResponseLoader isLoading={isLoading || isFetching} />

      <header className="flex items-center gap-4 mb-4 justify-between">
        <section className="flex space-x-2 items-center">
          <div className="relative">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search by route number..." width="w-[230px]" />
          </div>
          <ColumnVisibilitySelector columns={table?.getAllColumns() || []} buttonVariant="outline" />
          <div className="flex items-center gap-2">
            {isSuperAdmin && (
              <div className="w-33">
                <Combobox items={schoolOptions} value={filters.school} onValueChange={(v) => handleFilterChange("school", v)} placeholder="Select School" searchPlaceholder="Search schools..." emptyMessage="No school found." width="w-full" />
              </div>
            )}
            {!isBranchRole && (
              <div className="w-33">
                <Combobox items={filterBranchOptions} value={filters.branch} onValueChange={(v) => handleFilterChange("branch", v)} placeholder={!isSchoolRole && isSuperAdmin && !filters.school ? "Select School First" : "Select Branch"} searchPlaceholder="Search branches..." emptyMessage="No branch found." width="w-full" disabled={isSuperAdmin && !filters.school} />
              </div>
            )}
          </div>
        </section>

        {(isSuperAdmin || isSchoolRole || isBranchRole || isBranchGroupRole) && (
          <Dialog>
            <DialogTrigger asChild onClick={() => { setDevice(""); setDeviceSearch(""); setSchool(""); setBranch(""); setSchoolSearch(""); setBranchSearch(""); setEditTarget(null); }}>
              <Button variant="default" className="flex items-center gap-2 cursor-pointer">Add Route</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <form onSubmit={handleSubmit} className="space-y-4">
                <DialogHeader><DialogTitle>Add Route</DialogTitle></DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="routeNumber">Route Number *</Label>
                    <Input id="routeNumber" name="routeNumber" placeholder="Enter route number" required />
                  </div>
                  {isSuperAdmin && (
                    <div className="grid gap-2">
                      <Label>School *</Label>
                      <Combobox items={schoolOptions} value={school} onValueChange={(v) => { setSchool(v); setBranch(""); setBranchSearch(""); }} placeholder="Select school..." searchPlaceholder="Search schools..." emptyMessage="No school found" width="w-full" onSearchChange={setSchoolSearch} searchValue={schoolSearch} />
                    </div>
                  )}
                  {(isSuperAdmin || isSchoolRole || isBranchGroupRole) && (
                    <div className="grid gap-2">
                      <Label>Branch *</Label>
                      <Combobox items={addFormBranchOptions} value={branch} onValueChange={setBranch} placeholder={isSchoolRole || isBranchGroupRole ? "Select branch..." : !school ? "Select school first" : "Select branch..."} searchPlaceholder="Search branches..." emptyMessage={isSchoolRole || isBranchGroupRole ? addFormBranchOptions.length === 0 ? "No branches found for your school" : "No branch found" : !school ? "Please select a school first" : "No branches found for this school"} width="w-full" onSearchChange={setBranchSearch} searchValue={branchSearch} disabled={isSuperAdmin && !school} />
                    </div>
                  )}
                  <div className="grid gap-2">
                    <Label>Device *</Label>
                    <Combobox items={deviceItems} value={device} onValueChange={setDevice} placeholder={!branch ? "Select branch first" : "Search device..."} searchPlaceholder="Search devices..." emptyMessage={!branch ? "Select a branch first" : "No device found"} width="w-full" onSearchChange={setDeviceSearch} searchValue={deviceSearch} onReachEnd={handleDeviceReachEnd} isLoadingMore={isFetchingNextPage} disabled={!branch} />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild><Button ref={closeButtonRef} variant="outline">Cancel</Button></DialogClose>
                  <Button type="submit" disabled={addRouteMutation.isPending}>{addRouteMutation.isPending ? "Saving..." : "Save Route"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </header>

      {activeFilters.length > 0 && (
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-700">Active Filters:</span>
          {activeFilters.map((filter) => (
            <FilterBadge key={filter.key} label={filter.label} value={filter.value} onRemove={() => clearFilter(filter.key)} />
          ))}
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 px-2 text-xs text-red-600 hover:text-red-800 hover:bg-red-50">Clear All</Button>
        </div>
      )}

      <section className="mb-4">{tableElement}</section>

      {deleteTarget && (
        <div className="flex justify-center items-center">
          <div className="w-[350px] max-w-[350px]">
            <Alert<Route> title="Are you absolutely sure?" description={`This will permanently delete route ${deleteTarget?.routeNumber || "this route"} and all associated data.`} actionButton={(target) => deleteRouteMutation.mutate(target._id)} target={deleteTarget} setTarget={setDeleteTarget} butttonText="Delete" />
          </div>
        </div>
      )}

      {editTarget && (
        <DynamicEditDialog
          data={{
            ...editTarget,
            schoolId: typeof editTarget.schoolId === "object" ? editTarget.schoolId?._id : editTarget.schoolId,
            branchId: typeof editTarget.branchId === "object" ? editTarget.branchId?._id : editTarget.branchId,
            deviceObjId: typeof editTarget.deviceObjId === "object" ? editTarget.deviceObjId?._id : editTarget.deviceObjId,
          }}
          isOpen={editDialogOpen}
          onClose={() => { setEditDialogOpen(false); setEditTarget(null); }}
          onSave={handleSave}
          fields={getRouteFieldConfigs(schoolOptions, addFormBranchOptions, enrichedDeviceItems).filter((field) => {
            if (field.key === "schoolId" && (isSchoolRole || isBranchRole)) return false;
            if (field.key === "branchId" && isBranchRole) return false;
            return true;
          })}
          title="Edit Route"
          description="Update the route information below."
          loading={updateRouteMutation.isPending}
        />
      )}

      <FloatingMenu onExportPdf={handleExportPdf} onExportExcel={handleExportExcel} />
    </main>
  );
}