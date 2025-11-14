// Fixed version - search only from search bar, no background filtering

"use client";

import React, {
  useCallback,
  useEffect,
  useState,
  useRef,
  useMemo,
} from "react";
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
import SearchComponent from "@/components/ui/SearchOnlydata";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import { FloatingMenu } from "@/components/floatingMenu";
import { useSchoolData } from "@/hooks/useSchoolData";
import { useBranchData } from "@/hooks/useBranchData";
import { useInfiniteDeviceData } from "@/hooks/useInfiniteDeviceData";
import {
  type ColumnDef,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/apiService";
import { useExport } from "@/hooks/useExport";
import { Alert } from "@/components/Alert";
import ResponseLoader from "@/components/ResponseLoader";
import { ColumnVisibilitySelector } from "@/components/column-visibility-selector";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";
import Cookies from "js-cookie";

interface Route {
  _id: string;
  routeNumber: string;
  deviceObjId?: any;
  schoolId?: any;
  branchId?: any;
  isActive?: boolean;
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
  [key: string]: any;
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

export default function RoutesMaster() {
  const queryClient = useQueryClient();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState<string>("");
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });

  const [deleteTarget, setDeleteTarget] = useState<Route | null>(null);
  const [editTarget, setEditTarget] = useState<Route | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const [school, setSchool] = useState(""), [schoolSearch, setSchoolSearch] = useState("");
  const { data: schoolData } = useSchoolData();

  const [branch, setBranch] = useState(""), [branchSearch, setBranchSearch] = useState("");
  const { data: branchData } = useBranchData();

  const [device, setDevice] = useState(""), [deviceSearch, setDeviceSearch] = useState("");

  const [filteredData, setFilteredData] = useState<Route[]>([]);
  const [allRoutesData, setAllRoutesData] = useState<Route[]>([]); // Store all data for client-side filtering

  const [role, setRole] = useState<string | null>(null);
  const [userSchoolId, setUserSchoolId] = useState<string | null>(null);
  const [userBranchId, setUserBranchId] = useState<string | null>(null);
  const [userSchoolName, setUserSchoolName] = useState<string | null>(null);

  const { exportToPDF, exportToExcel } = useExport();

  // Get normalized role for device hook
  const normalizedRole = useMemo(() => {
    const r = (role || "").toLowerCase();
    if (["superadmin", "super_admin", "admin", "root"].includes(r)) return "superAdmin";
    if (["school", "schooladmin"].includes(r)) return "school";
    if (["branch", "branchadmin"].includes(r)) return "branch";
    if (["branchgroup"].includes(r)) return "branchGroup";
    return undefined;
  }, [role]);

  // Use infinite device data hook
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

  // Device items memoized
  const deviceItems = useMemo(() => {
    if (!deviceData?.pages?.length) return [];
    return deviceData.pages.flatMap((pg: any) => {
      const list = pg.devices ?? pg.data ?? [];
      return list.map((d: any) => ({ 
        label: d.deviceName || d.name || "Device", 
        value: d._id 
      }));
    });
  }, [deviceData]);

  // Get device name for display in table
  const getDeviceName = useCallback((route: Route) => {
    if (!route.deviceObjId) return "N/A";
    
    if (typeof route.deviceObjId === "object") {
      return route.deviceObjId.deviceName || route.deviceObjId.name || "Device";
    }
    
    // Find device in the infinite device data
    for (const page of deviceData?.pages || []) {
      const list = page.devices ?? page.data ?? [];
      const found = list.find((d: any) => d._id === route.deviceObjId);
      if (found) {
        return found.deviceName || found.name || "Device";
      }
    }
    
    return "Device Not Found";
  }, [deviceData]);

  // Debounce device search
  useEffect(() => {
    const timer = setTimeout(() => {
      // The search is handled by the hook, we just need to ensure it triggers
    }, 300);
    return () => clearTimeout(timer);
  }, [deviceSearch]);

  // Handle infinite scroll for devices
  const handleDeviceReachEnd = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && !isFetchingDevices && branch) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, isFetchingDevices, branch, fetchNextPage]);

  // Prefetch more devices when needed
  useEffect(() => {
    const timer = setTimeout(() => {
      if (
        deviceItems.length > 0 &&
        deviceItems.length < 20 &&
        hasNextPage &&
        !isFetchingNextPage &&
        branch
      ) {
        fetchNextPage();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [deviceItems.length, hasNextPage, isFetchingNextPage, branch, fetchNextPage]);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    const decoded = getDecodedToken(token);
    const r = decoded?.role?.toLowerCase() || "";

    setRole(r);
    setUserSchoolName(decoded?.schoolName || null);

    if (["school", "schooladmin"].includes(r)) setUserSchoolId(decoded?.id || null);
    else setUserSchoolId(decoded?.schoolId || null);

    if (["branch", "branchadmin"].includes(r)) setUserBranchId(decoded?.id || null);
    else setUserBranchId(decoded?.branchId || null);

    if (r === "branchgroup" && decoded?.AssignedBranch?.length)
      setUserBranchId(decoded.AssignedBranch[0]._id);
  }, []);

  const isSuperAdmin = normalizedRole === "superAdmin";
  const isSchoolRole = normalizedRole === "school";
  const isBranchRole = normalizedRole === "branch";
  const isBranchGroupRole = normalizedRole === "branchGroup";

  // Fetch all data once without filters for client-side search
  const { data: routesData, isLoading, isFetching } = useQuery({
    queryKey: [
      "routes",
      "all", // Remove filters from query key to fetch all data once
    ],
    queryFn: async () => {
      const params: any = {
        page: 1,
        limit: 10, // Fetch all data at once for client-side filtering
      };

      const res = await api.get("/route", params);
      return res?.data ? { data: res.data, total: res.total || res.data.length } : { data: [], total: 0 };
    },
  });

  // Store all data and initialize filtered data
  useEffect(() => {
    if (routesData?.data) {
      setAllRoutesData(routesData.data);
      setFilteredData(routesData.data);
    }
  }, [routesData?.data]);

  const schoolOptions = useMemo(() => {
    if (!schoolData) return [];

    let list = schoolData;

    if ((isSchoolRole || isBranchGroupRole || isBranchRole) && userSchoolId)
      list = list.filter((s) => s._id === userSchoolId);

    return list.map((s) => ({ label: s.schoolName, value: s._id }));
  }, [schoolData, userSchoolId, isSchoolRole, isBranchRole, isBranchGroupRole]);

  const branchOptions = useMemo(() => {
    if (!branchData) return [];

    let list = branchData;

    if (userSchoolId) {
      if (isBranchGroupRole) {
        list = list.filter((b) => b.schoolId?._id === userSchoolId);
      } else if (isSchoolRole) {
        list = list.filter((b) => b.schoolId?._id === userSchoolId);
      }
    }
    
    if (isBranchRole && userBranchId) {
      list = list.filter((b) => b._id === userBranchId);
    }

    return list.map((b) => ({ label: b.branchName, value: b._id }));
  }, [branchData, userSchoolId, userBranchId, isBranchRole, isSchoolRole, isBranchGroupRole]);

  const filteredBranchOptions = useMemo(() => {
    if (!branchData) return [];

    let list = branchData;

    let schoolIdToUse = school;
    
    if (isBranchGroupRole && !school && userSchoolId) {
      schoolIdToUse = userSchoolId;
    }

    if (schoolIdToUse) {
      list = list.filter((b) => b.schoolId?._id === schoolIdToUse);
    }

    if (isBranchRole && userBranchId) {
      list = list.filter((b) => b._id === userBranchId);
    }

    return list.map((b) => ({ label: b.branchName, value: b._id }));
  }, [school, branchData, isBranchRole, userBranchId, isBranchGroupRole, userSchoolId]);

  useEffect(() => {
    if ((isSchoolRole || isBranchGroupRole) && userSchoolId && !school)
      setSchool(userSchoolId);
  }, [isSchoolRole, isBranchGroupRole, userSchoolId]);

  useEffect(() => {
    if ((isBranchRole || isBranchGroupRole) && userBranchId && !branch)
      setBranch(userBranchId);
  }, [isBranchRole, isBranchGroupRole, userBranchId]);

  useEffect(() => {
    if (school && (isSchoolRole || isBranchGroupRole)) {
      setBranch("");
      setBranchSearch("");
    }
  }, [school, isSchoolRole, isBranchGroupRole]);

  useEffect(() => {
    if (isBranchGroupRole && userSchoolId && !school) {
      setSchool(userSchoolId);
    }
  }, [isBranchGroupRole, userSchoolId, school]);

  useEffect(() => {
    if ((isBranchRole || isBranchGroupRole) && userBranchId && !branch) {
      setBranch(userBranchId);
    }
  }, [isBranchRole, isBranchGroupRole, userBranchId, branch]);

  // Reset device when branch changes
  useEffect(() => {
    setDevice("");
    setDeviceSearch("");
  }, [branch]);

  const columns: ColumnDef<Route>[] = [
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
    ...(isSuperAdmin
      ? [
          {
            id: "schoolName",
            header: "School Name",
            accessorFn: (row) => row.schoolId?.schoolName || "N/A",
            enableSorting: true,
          },
        ]
      : []),
    {
      id: "branchName",
      header: "Branch Name",
      accessorFn: (row) => row.branchId?.branchName || "N/A",
      enableSorting: true,
    },
    {
      id: "status",
      header: "Status",
      accessorFn: (row) => (row.isActive ? "Active" : "Inactive"),
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
  ];

  const columnsForExport = [
    { key: "routeNumber", header: "Route Number" },
    {
      key: "deviceName",
      header: "Device Name",
      accessor: (row: Route) => getDeviceName(row),
    },
    ...(isSuperAdmin
      ? [
          {
            key: "schoolName",
            header: "School Name",
            accessor: (row: Route) => row.schoolId?.schoolName || "N/A",
          },
        ]
      : []),
    {
      key: "branchName",
      header: "Branch Name",
      accessor: (row: Route) => row.branchId?.branchName || "N/A",
    },
    {
      key: "isActive",
      header: "Status",
      formatter: (v: boolean) => (v ? "Active" : "Inactive"),
    },
    {
      key: "createdAt",
      header: "Created At",
      formatter: (v: string) => new Date(v).toLocaleDateString("en-GB"),
    },
  ];

  const getRouteFieldConfigs = (
    schoolOptions: SelectOption[],
    branchOptions: SelectOption[],
    deviceOptions: SelectOption[]
  ): FieldConfig[] => {
    const fields: FieldConfig[] = [
      { label: "Route Number", key: "routeNumber", type: "text", required: true },
    ];

    if (isSuperAdmin) {
      fields.push({ label: "School Name", key: "schoolId", type: "select", required: true, options: schoolOptions });
    }

    if (isSuperAdmin || isSchoolRole || isBranchGroupRole) {
      fields.push({ label: "Branch Name", key: "branchId", type: "select", required: true, options: branchOptions });
    }

    fields.push(
      { label: "Device", key: "deviceObjId", type: "select", required: true, options: deviceOptions },
      { label: "Active Status", key: "isActive", type: "checkbox", className: "h-3 w-3" }
    );

    return fields;
  };

  const addRouteMutation = useMutation({
    mutationFn: async (newRoute: any) => api.post("/route", newRoute),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routes"] });
      alert("Route added successfully.");
    },
  });

  const updateRouteMutation = useMutation({
    mutationFn: async ({ routeId, data }: any) => api.put(`/route/${routeId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routes"] });
      setEditDialogOpen(false);
      setEditTarget(null);
      alert("Route updated successfully.");
    },
  });

  const deleteRouteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/route/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routes"] });
      setDeleteTarget(null);
      alert("Route deleted successfully!");
    },
  });

  const handleSave = (updatedData: Partial<Route>) => {
    if (!editTarget) return;

    const changed: any = {};
    for (const key in updatedData) {
      if (updatedData[key as keyof Route] !== editTarget[key as keyof Route])
        changed[key] = updatedData[key as keyof Route];
    }

    if (isBranchRole && userBranchId) changed.branchId = userBranchId;
    if ((isSchoolRole || isBranchGroupRole) && userSchoolId) changed.schoolId = userSchoolId;

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

    let selectedSchool = school;
    let selectedBranch = branch;

    const token = getAuthToken();
    const decoded = token ? getDecodedToken(token) : null;
    const currentRole = decoded?.role?.toLowerCase();

    if (!isSuperAdmin) {
      selectedSchool = decoded?.schoolId || userSchoolId || "";
    }
    
    if (isBranchRole) {
      selectedBranch = decoded?.id || userBranchId || "";
    } else if (isBranchGroupRole) {
      selectedBranch = branch || (decoded?.AssignedBranch?.length ? decoded.AssignedBranch[0]._id : "");
    }

    if (!selectedSchool) {
      alert("School missing.");
      return;
    }
    if (!selectedBranch) {
      alert("Branch missing.");
      return;
    }
    if (!device) {
      alert("Device missing.");
      return;
    }

    const payload = {
      routeNumber: data.get("routeNumber") as string,
      deviceObjId: device,
      schoolId: selectedSchool,
      branchId: selectedBranch,
      isActive: data.get("isActive") === "on",
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

  // Search only from search bar - client side filtering
  const handleSearch = useCallback((results: Route[]) => {
    setFilteredData(results);
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, []);

  // Reset to all data when search is cleared
  const handleSearchClear = useCallback(() => {
    setFilteredData(allRoutesData);
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [allRoutesData]);

  const handlePaginationChange = useCallback((update: any) => {
    setPagination((prev) => {
      const newP = typeof update === "function" ? update(prev) : update;
      return newP.pageSize !== prev.pageSize ? { ...newP, pageIndex: 0 } : newP;
    });
  }, []);

  const handleDateFilter = (start: Date | null, end: Date | null) => {
    setDateRange({ start, end });
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  };

  const { table, tableElement } = CustomTableServerSidePagination({
    data: filteredData || [],
    columns,
    pagination,
    totalCount: filteredData.length, // Use filtered data length for pagination
    loading: isLoading || isFetching,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    sorting,
    columnVisibility,
    onColumnVisibilityChange: setColumnVisibility,
    emptyMessage: "No routes found",
    pageSizeOptions: [5, 10, 20, 30, 50],
    enableSorting: true,
    showSerialNumber: true,
  });

  return (
    <main>
      <ResponseLoader isLoading={isLoading || isFetching} />

      <header className="flex items-center justify-between mb-4">
        <section className="flex space-x-4">
          <SearchComponent
            data={allRoutesData} // Use all data for search
            displayKey={["routeNumber", "deviceObjId.name", "schoolId.schoolName", "branchId.branchName"]}
            onResults={handleSearch}
            onClear={handleSearchClear} // Reset when search is cleared
            className="w-[300px] mb-4"
          />

          <ColumnVisibilitySelector
            columns={table.getAllColumns()}
            buttonVariant="outline"
            buttonSize="default"
          />
        </section>

        {(isSuperAdmin || isSchoolRole || isBranchRole || isBranchGroupRole) && (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="default">Add Route</Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[600px]">
              <form onSubmit={handleSubmit} className="space-y-4">
                <DialogHeader>
                  <DialogTitle>Add Route</DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="routeNumber">Route Number</Label>
                    <Input id="routeNumber" name="routeNumber" placeholder="Enter route number" required />
                  </div>

                  {isSuperAdmin && (
                    <div className="grid gap-2">
                      <Label>School *</Label>
                      <Combobox
                        items={schoolOptions}
                        value={school}
                        onValueChange={setSchool}
                        placeholder="Select school..."
                        searchPlaceholder="Search schools..."
                        emptyMessage="No school found"
                        width="w-full"
                        onSearchChange={setSchoolSearch}
                        searchValue={schoolSearch}
                      />
                    </div>
                  )}

                  {(isSuperAdmin || isSchoolRole || isBranchGroupRole) && (
                    <div className="grid gap-2">
                      <Label>Branch *</Label>
                      <Combobox
                        items={filteredBranchOptions}
                        value={branch}
                        onValueChange={setBranch}
                        placeholder={
                          filteredBranchOptions.length 
                            ? "Select branch..." 
                            : school 
                              ? "No branches found for selected school"
                              : isBranchGroupRole && userSchoolName 
                                ? `No branches found for ${userSchoolName}`
                                : "Select school first"
                        }
                        searchPlaceholder="Search branches..."
                        emptyMessage={
                          filteredBranchOptions.length 
                            ? "No results" 
                            : school
                              ? "No branches found for selected school"
                              : isBranchGroupRole && userSchoolName
                                ? `No branches found for ${userSchoolName}`
                                : "Select school first"
                        }
                        width="w-full"
                        onSearchChange={setBranchSearch}
                        searchValue={branchSearch}
                        disabled={!school && !(isBranchGroupRole && userSchoolId)}
                      />
                    </div>
                  )}

                  <div className="grid gap-2">
                    <Label>Device *</Label>
                    <Combobox
                      items={deviceItems}
                      value={device}
                      onValueChange={setDevice}
                      placeholder={!branch ? "Select branch first" : "Search device..."}
                      searchPlaceholder="Search devices..."
                      emptyMessage={
                        !branch ? "Select a branch first" : "No device found"
                      }
                      width="w-full"
                      onSearchChange={setDeviceSearch}
                      searchValue={deviceSearch}
                      onReachEnd={handleDeviceReachEnd}
                      isLoadingMore={isFetchingNextPage}
                      disabled={!branch}
                    />
                  </div>

                  <div className="flex items-center gap-3 mt-6">
                    <input type="checkbox" id="isActive" name="isActive" className="h-3 w-3" defaultChecked />
                    <Label htmlFor="isActive">Active Status</Label>
                  </div>
                </div>

                <DialogFooter>
                  <DialogClose asChild>
                    <Button ref={closeButtonRef} variant="outline">Cancel</Button>
                  </DialogClose>

                  <Button type="submit" disabled={addRouteMutation.isPending}>
                    {addRouteMutation.isPending ? "Saving..." : "Save Route"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </header>

      <section className="mb-4">{tableElement}</section>

      {deleteTarget && (
        <Alert<Route>
          title="Are you absolutely sure?"
          description={`This will permanently delete route ${deleteTarget?.routeNumber}.`}
          actionButton={(target) => deleteRouteMutation.mutate(target._id)}
          target={deleteTarget}
          setTarget={setDeleteTarget}
          butttonText="Delete"
          className="max-w-sm mx-auto"
          contentClassName="w-full px-4"
        />
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
          onClose={() => {
            setEditDialogOpen(false);
            setEditTarget(null);
          }}
          onSave={handleSave}
          fields={getRouteFieldConfigs(schoolOptions, branchOptions, deviceItems)}
          title="Edit Route"
          description="Update the route information below."
        />
      )}

      <FloatingMenu
        onExportPdf={() =>
          exportToPDF(filteredData, columnsForExport, {
            title: "Routes Master Report",
            companyName: "Parents Eye",
            metadata: { Total: `${filteredData.length} routes` },
          })
        }
        onExportExcel={() =>
          exportToExcel(filteredData, columnsForExport, {
            title: "Routes Master Report",
            companyName: "Parents Eye",
            metadata: { Total: `${filteredData.length} routes` },
          })
        }
      />
    </main>
  );
}