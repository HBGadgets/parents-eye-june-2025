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
import { CustomTable, CellContent } from "@/components/ui/CustomTable";
import { DynamicEditDialog, FieldConfig } from "@/components/ui/EditModal";
import SearchComponent from "@/components/ui/SearchOnlydata";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import DateRangeFilter from "@/components/ui/DateRangeFilter";
import { FloatingMenu } from "@/components/floatingMenu";
import {
  getCoreRowModel,
  useReactTable,
  VisibilityState,
  type ColumnDef,
} from "@tanstack/react-table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/apiService";
import { Supervisor } from "@/interface/modal";
import { useExport } from "@/hooks/useExport";
import { formatDate } from "@/util/formatDate";
import { Alert } from "@/components/Alert";
import ResponseLoader from "@/components/ResponseLoader";
import { CustomFilter } from "@/components/ui/CustomFilter";
import { ColumnVisibilitySelector } from "@/components/column-visibility-selector";
import { useSchoolData } from "@/hooks/useSchoolData";
import { useBranchData } from "@/hooks/useBranchData";
import { useInfiniteDeviceData } from "@/hooks/useInfiniteDeviceData";
import Cookies from "js-cookie";
import { getDecodedToken } from "@/lib/jwt";

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData, TValue> {
    flex?: number;
    minWidth?: number;
    maxWidth?: number;
  }
}

interface SupervisorResponse {
  total: number;
  page: number;
  totalPages: number;
  supervisors: Supervisor[];
}

interface SelectOption {
  label: string;
  value: string;
}

interface Route {
  _id: string;
  routeNumber: string;
  routeName?: string;
  branchId?: string | { _id: string };
  deviceObjId?: string | { _id: string; name: string };
}

interface RouteResponse {
  routes: Route[];
  total: number;
  page: number;
  totalPages: number;
}

// Helper functions
const getId = (obj: any): string => {
  if (!obj) return "";
  if (typeof obj === "string") return obj;
  return obj._id || "";
};

const extractData = (data: any, fallbackKeys: string[] = []): any[] => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  for (const key of fallbackKeys) {
    if (data[key] && Array.isArray(data[key])) return data[key];
  }
  return [];
};

// Custom hooks
const useRouteData = ({ branchId, search, enabled = true }: { branchId?: string; search?: string; enabled?: boolean }) => {
  return useQuery({
    queryKey: ["routes", branchId, search],
    queryFn: async () => {
      let url = `/route?limit=100`;
      if (branchId) url += `&branchId=${branchId}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      return await api.get<RouteResponse>(url);
    },
    enabled: enabled && !!branchId,
    staleTime: 5 * 60 * 1000,
  });
};

const useSupervisorForm = (initialData?: Supervisor, role?: string, userSchoolId?: string, userBranchId?: string) => {
  const [school, setSchool] = useState("");
  const [schoolSearch, setSchoolSearch] = useState("");
  const [branch, setBranch] = useState("");
  const [branchSearch, setBranchSearch] = useState("");
  const [route, setRoute] = useState("");
  const [routeSearch, setRouteSearch] = useState("");
  const [device, setDevice] = useState("");
  const [deviceSearch, setDeviceSearch] = useState("");

  // Auto-set values based on role
  useEffect(() => {
    if (role === "school" && userSchoolId) {
      setSchool(userSchoolId);
    }
    if (role === "branch" && userBranchId) {
      setBranch(userBranchId);
    }
  }, [role, userSchoolId, userBranchId]);

  useEffect(() => {
    if (initialData) {
      setSchool(getId(initialData.schoolId));
      setBranch(getId(initialData.branchId));
      setRoute(getId(initialData.routeObjId));
      setDevice(getId(initialData.deviceObjId));
    }
  }, [initialData]);

  const resetForm = () => {
    // Don't reset school/branch if they're set by role
    if (role !== "school") {
      setSchool(""); 
      setSchoolSearch("");
    }
    if (role !== "branch") {
      setBranch(""); 
      setBranchSearch("");
    }
    setRoute(""); 
    setRouteSearch("");
    setDevice(""); 
    setDeviceSearch("");
  };

  const handleSchoolChange = useCallback((newSchool: string) => {
    const prevSchool = school;
    setSchool(newSchool);
    if (newSchool !== prevSchool && prevSchool !== "") {
      setBranch(""); setBranchSearch("");
      setRoute(""); setRouteSearch("");
      setDevice(""); setDeviceSearch("");
    }
  }, [school]);

  const handleBranchChange = useCallback((newBranch: string) => {
    const prevBranch = branch;
    setBranch(newBranch);
    if (newBranch !== prevBranch && prevBranch !== "") {
      setRoute(""); setRouteSearch("");
      setDevice(""); setDeviceSearch("");
    }
  }, [branch]);

  const handleRouteChange = useCallback((newRoute: string) => {
    const prevRoute = route;
    setRoute(newRoute);
    if (newRoute !== prevRoute && prevRoute !== "") {
      setDevice(""); setDeviceSearch("");
    }
  }, [route]);

  return {
    school, setSchool: handleSchoolChange, schoolSearch, setSchoolSearch,
    branch, setBranch: handleBranchChange, branchSearch, setBranchSearch,
    route, setRoute: handleRouteChange, routeSearch, setRouteSearch,
    device, setDevice, deviceSearch, setDeviceSearch, resetForm
  };
};

const fetchAllSupervisors = async (filters?: { schoolId?: string; branchId?: string }): Promise<Supervisor[]> => {
  let allSupervisors: Supervisor[] = [];
  let currentPage = 1;
  let totalPages = 1;

  do {
    let url = `/supervisor?page=${currentPage}`;
    if (filters?.schoolId) url += `&schoolId=${filters.schoolId}`;
    if (filters?.branchId) url += `&branchId=${filters.branchId}`;

    const response = await api.get<SupervisorResponse>(url);
    const data = response;
    
    if (data.supervisors?.length > 0) {
      allSupervisors = [...allSupervisors, ...data.supervisors];
    }
    
    totalPages = data.totalPages;
    currentPage++;
    
    if (currentPage <= totalPages) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  } while (currentPage <= totalPages);

  return allSupervisors;
};

// Reusable Components
const SupervisorForm = ({ 
  formData, onInputChange, formState, onFormStateChange, 
  schoolOptions, branchOptions, routeItems, deviceItems,
  isFetchingRoutes, hasNextPage, fetchNextPage, isFetchingNextPage, isFetching,
  usernameError, role, userSchoolId, userBranchId 
}: any) => {
  const isSuperAdmin = ["admin", "superadmin", "super_admin", "root"].includes((role || "").toLowerCase());
  const isSchoolRole = ["school", "schooladmin"].includes((role || "").toLowerCase());
  const isBranchRole = ["branch", "branchadmin"].includes((role || "").toLowerCase());

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="grid gap-2">
        <Label htmlFor="supervisorName">Supervisor Name</Label>
        <Input
          id="supervisorName"
          name="supervisorName"
          value={formData?.supervisorName || ""}
          onChange={onInputChange}
          placeholder="Enter supervisor name"
          required
        />
      </div>
      
      {/* School Selector - Only show for Super Admin */}
      {isSuperAdmin && (
        <div className="grid gap-2">
          <Label>School *</Label>
          <Combobox 
            items={schoolOptions} 
            value={formState.school} 
            onValueChange={onFormStateChange.setSchool}
            placeholder="Search school..." 
            searchPlaceholder="Search schools..." 
            emptyMessage="No school found."
            width="w-full" 
            onSearchChange={onFormStateChange.setSchoolSearch} 
            searchValue={formState.schoolSearch} 
          />
        </div>
      )}

      {/* Branch Selector - Show for Super Admin and School roles */}
      {(isSuperAdmin || isSchoolRole) && (
        <div className="grid gap-2">
          <Label>Branch *</Label>
          <Combobox 
            items={branchOptions} 
            value={formState.branch} 
            onValueChange={onFormStateChange.setBranch}
            placeholder={
              isSuperAdmin && !formState.school ? "Select school first" : 
              branchOptions.length ? "Search branch..." : "No branches available"
            }
            searchPlaceholder="Search branches..." 
            emptyMessage={
              isSuperAdmin && !formState.school ? "Please select a school first" : 
              branchOptions.length === 0 ? "No branches found for this school" : "No branches match your search"
            }
            width="w-full" 
            disabled={isSuperAdmin && !formState.school}
            onSearchChange={onFormStateChange.setBranchSearch} 
            searchValue={formState.branchSearch} 
          />
        </div>
      )}

      <div className="grid gap-2">
        <Label>Route Number *</Label>
        <Combobox 
          items={routeItems} 
          value={formState.route} 
          onValueChange={onFormStateChange.setRoute}
          placeholder={
            (isSuperAdmin && !formState.school) ? "Select school first" : 
            ((isSuperAdmin || isSchoolRole) && !formState.branch) ? "Select branch first" : 
            "Search route..."
          }
          searchPlaceholder="Search routes..." 
          emptyMessage={
            (isSuperAdmin && !formState.school) ? "Please select a school first" : 
            ((isSuperAdmin || isSchoolRole) && !formState.branch) ? "Please select a branch first" : 
            routeItems.length === 0 ? "No routes found for this branch" : "No routes match your search"
          }
          width="w-full" 
          disabled={!formState.branch}
          onSearchChange={onFormStateChange.setRouteSearch} 
          searchValue={formState.routeSearch}
          isLoadingMore={isFetchingRoutes}
        />
      </div>

      <div className="grid gap-2">
        <Label>Assign Device</Label>
        <Combobox 
          items={deviceItems} 
          value={formState.device} 
          onValueChange={onFormStateChange.setDevice}
          placeholder={
            (isSuperAdmin && !formState.school) ? "Select school first" : 
            ((isSuperAdmin || isSchoolRole) && !formState.branch) ? "Select branch first" : 
            !formState.route ? "Select route first" : 
            deviceItems.length ? "Search device..." : "No device assigned to this route"
          }
          searchPlaceholder="Search devices..." 
          emptyMessage={
            (isSuperAdmin && !formState.school) ? "Please select a school first" : 
            ((isSuperAdmin || isSchoolRole) && !formState.branch) ? "Please select a branch first" : 
            !formState.route ? "Please select a route first" : 
            deviceItems.length === 0 ? "No device assigned to this route" : "No devices match your search"
          }
          width="w-full" 
          disabled={!formState.route}
          onSearchChange={onFormStateChange.setDeviceSearch} 
          searchValue={formState.deviceSearch}
          onReachEnd={() => {
            if (hasNextPage && !isFetchingNextPage && !isFetching) {
              fetchNextPage();
            }
          }}
          isLoadingMore={isFetchingNextPage}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          value={formData?.email || ""}
          onChange={onInputChange}
          placeholder="Enter email address"
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="mobileNo">Mobile No</Label>
        <Input
          id="mobileNo"
          name="mobileNo"
          type="tel"
          value={formData?.mobileNo || ""}
          onChange={onInputChange}
          placeholder="Enter mobile number"
          pattern="[0-9]{10}"
          maxLength={10}
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          name="username"
          value={formData?.username || ""}
          onChange={onInputChange}
          placeholder="Enter username"
          required
          className={usernameError ? "border-red-500" : ""}
        />
        {usernameError && <p className="text-red-500 text-sm">{usernameError}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="text"
          value={formData?.password || ""}
          onChange={onInputChange}
          placeholder="Enter password"
          required
        />
      </div>
    </div>
  );
};

export default function SupervisorApprove() {
  const queryClient = useQueryClient();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const { exportToPDF, exportToExcel } = useExport();
  const [filteredData, setFilteredData] = useState<Supervisor[]>([]);
  const [filterResults, setFilterResults] = useState<Supervisor[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Supervisor | null>(null);
  const [editTarget, setEditTarget] = useState<Supervisor | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  
  // Form data state
  const [formData, setFormData] = useState({
    supervisorName: "",
    email: "",
    mobileNo: "",
    username: "",
    password: ""
  });

  // Role-based state
  const [role, setRole] = useState<string | null>(null);
  const [userSchoolId, setUserSchoolId] = useState<string | null>(null);
  const [userBranchId, setUserBranchId] = useState<string | null>(null);

  // Determine role type
  const normalizedRole = useMemo(() => {
    const r = (role || "").toLowerCase();
    if (["superadmin", "super_admin", "admin", "root"].includes(r)) return "superAdmin";
    if (["school", "schooladmin"].includes(r)) return "school";
    if (["branch", "branchadmin"].includes(r)) return "branch";
    return undefined;
  }, [role]);

  const isSuperAdmin = normalizedRole === "superAdmin";
  const isSchoolRole = normalizedRole === "school";
  const isBranchRole = normalizedRole === "branch";

  // Form hooks with role-based initialization
  const addForm = useSupervisorForm(undefined, normalizedRole, userSchoolId, userBranchId);
  const editForm = useSupervisorForm(editTarget || undefined, normalizedRole, userSchoolId, userBranchId);

  // Data hooks
  const { data: schoolData, isLoading: schoolsLoading } = useSchoolData();
  const { data: branchData, isLoading: branchesLoading } = useBranchData();

  // Get user info from token
  useEffect(() => {
    const token = Cookies.get("token");
    if (token) {
      const decoded = getDecodedToken(token);
      setRole((decoded?.role || "").toLowerCase());
      setUserSchoolId(decoded?.schoolId || null);
      setUserBranchId(decoded?.branchId || null);
    }
  }, []);

  // Auto-set form values based on role
  useEffect(() => {
    if (isSchoolRole && userSchoolId) {
      addForm.setSchool(userSchoolId);
    }
    if (isBranchRole && userBranchId) {
      addForm.setBranch(userBranchId);
    }
  }, [isSchoolRole, isBranchRole, userSchoolId, userBranchId, addForm.setSchool, addForm.setBranch]);

  // FIXED: Route queries with proper role-based branch selection
  // For branch role, we need to get the user's branch ID and use it directly
  const getBranchIdForRouteQuery = useCallback((formBranch: string, roleType: string | undefined, userBranch: string | null) => {
    if (roleType === "branch" && userBranch) {
      return userBranch;
    }
    return formBranch;
  }, []);

  const addRouteBranchId = getBranchIdForRouteQuery(addForm.branch, normalizedRole, userBranchId);
  const editRouteBranchId = getBranchIdForRouteQuery(editForm.branch, normalizedRole, userBranchId);

  // FIXED: Enable route queries for branch role even when form.branch is empty
  const shouldEnableAddRouteQuery = useMemo(() => {
    if (isBranchRole && userBranchId) return true;
    return !!addRouteBranchId;
  }, [isBranchRole, userBranchId, addRouteBranchId]);

  const shouldEnableEditRouteQuery = useMemo(() => {
    if (isBranchRole && userBranchId) return true;
    return !!editRouteBranchId;
  }, [isBranchRole, userBranchId, editRouteBranchId]);

  const addRouteQuery = useRouteData({ 
    branchId: isBranchRole ? userBranchId : addRouteBranchId, 
    search: addForm.routeSearch,
    enabled: shouldEnableAddRouteQuery
  });

  const editRouteQuery = useRouteData({ 
    branchId: isBranchRole ? userBranchId : editRouteBranchId, 
    search: editForm.routeSearch,
    enabled: shouldEnableEditRouteQuery
  });

  // Get route device IDs for filtering
  const getRouteDeviceObjIds = useCallback((routeData: any, routeId: string): string[] => {
    if (!routeData || !routeId) return [];
    
    const routes = extractData(routeData, ["routes", "data"]);
    const selectedRoute = routes.find((r: Route) => r._id === routeId);
    
    if (selectedRoute?.deviceObjId) {
      const deviceId = getId(selectedRoute.deviceObjId);
      return deviceId ? [deviceId] : [];
    }
    
    return [];
  }, []);

  const getAssignedDeviceForRoute = useCallback((routeData: any, routeId: string): SelectOption | null => {
    if (!routeData || !routeId) return null;
    
    const routes = extractData(routeData, ["routes", "data"]);
    const selectedRoute = routes.find((r: Route) => r._id === routeId);
    
    if (selectedRoute?.deviceObjId) {
      const deviceId = getId(selectedRoute.deviceObjId);
      const deviceName = typeof selectedRoute.deviceObjId === 'object' 
        ? selectedRoute.deviceObjId.name 
        : 'Assigned Device';
      
      return deviceId ? { label: deviceName, value: deviceId } : null;
    }
    
    return null;
  }, []);

  const getCurrentAssignedDevice = useCallback((supervisor: Supervisor): SelectOption | null => {
    if (!supervisor?.deviceObjId) return null;
    
    const deviceId = getId(supervisor.deviceObjId);
    const deviceName = typeof supervisor.deviceObjId === 'object' 
      ? supervisor.deviceObjId.name 
      : 'Assigned Device';
    
    return deviceId ? { label: deviceName, value: deviceId } : null;
  }, []);

  // Device queries - filtered by route's assigned device
  const addDeviceQuery = useInfiniteDeviceData({
    role: (normalizedRole || "").toLowerCase() as any,
    deviceObjId: getRouteDeviceObjIds(addRouteQuery.data, addForm.route),
    search: addForm.deviceSearch,
    limit: 20,
    enabled: !!addForm.route
  });

  const editDeviceQuery = useInfiniteDeviceData({
    role: (normalizedRole || "").toLowerCase() as any,
    deviceObjId: getRouteDeviceObjIds(editRouteQuery.data, editForm.route),
    search: editForm.deviceSearch,
    limit: 20,
    enabled: !!editForm.route
  });

  // Supervisor data with role-based filtering
  const supervisorFilters = useMemo(() => {
    const filters: { schoolId?: string; branchId?: string } = {};
    if (isSchoolRole && userSchoolId) filters.schoolId = userSchoolId;
    if (isBranchRole && userBranchId) filters.branchId = userBranchId;
    return filters;
  }, [isSchoolRole, isBranchRole, userSchoolId, userBranchId]);

  const { data: supervisors, isLoading } = useQuery<Supervisor[]>({
    queryKey: ["supervisors", supervisorFilters],
    queryFn: () => fetchAllSupervisors(supervisorFilters),
    staleTime: 5 * 60 * 1000,
  });

  // Options and items with role-based filtering
  const schoolOptions: SelectOption[] = useMemo(() => {
    if (!schoolData) return [];
    let filteredSchools = schoolData;
    
    // For school role, only show user's school
    if (isSchoolRole && userSchoolId) {
      filteredSchools = schoolData.filter(s => s._id === userSchoolId);
    }
    // For branch role, get school from user's branch
    else if (isBranchRole && userBranchId && branchData) {
      const userBranch = branchData.find(b => b._id === userBranchId);
      if (userBranch?.schoolId) {
        const schoolId = getId(userBranch.schoolId);
        filteredSchools = schoolData.filter(s => s._id === schoolId);
      }
    }
    
    return Array.from(new Map(filteredSchools.filter(s => s._id && s.schoolName).map(s => [s._id, { label: s.schoolName, value: s._id }])).values());
  }, [schoolData, isSchoolRole, isBranchRole, userSchoolId, userBranchId, branchData]);

  const getFilteredBranchOptions = useCallback((schoolId: string) => {
    if (!branchData) return [];
    let filteredBranches = branchData;
    
    // For school role, only show branches from user's school
    if (isSchoolRole && userSchoolId) {
      filteredBranches = branchData.filter(branch => getId(branch.schoolId) === userSchoolId);
    }
    // For branch role, only show user's branch
    else if (isBranchRole && userBranchId) {
      filteredBranches = branchData.filter(branch => branch._id === userBranchId);
    }
    // For super admin, filter by selected school
    else if (isSuperAdmin && schoolId) {
      filteredBranches = branchData.filter(branch => getId(branch.schoolId) === schoolId);
    }
    
    return filteredBranches.filter(branch => branch._id && branch.branchName).map(branch => ({
      label: branch.branchName, value: branch._id
    }));
  }, [branchData, isSuperAdmin, isSchoolRole, isBranchRole, userSchoolId, userBranchId]);

  const getRouteItems = (routeData: any) => useMemo(() => {
    const routes = extractData(routeData, ["routes", "data"]);
    return routes.filter((r: Route) => r._id && r.routeNumber).map((r: Route) => ({ 
      label: r.routeNumber + (r.routeName ? ` - ${r.routeName}` : ''), value: r._id 
    }));
  }, [routeData]);

  const getDeviceItems = (deviceData: any, routeData: any, routeId: string, currentDevice?: SelectOption | null) => useMemo(() => {
    const assignedDevice = getAssignedDeviceForRoute(routeData, routeId);
    const devices: SelectOption[] = [];
    
    if (assignedDevice) {
      devices.push(assignedDevice);
    }
    
    if (currentDevice && !devices.some(d => d.value === currentDevice.value)) {
      devices.push(currentDevice);
    }
    
    return devices;
  }, [deviceData, routeData, routeId, getAssignedDeviceForRoute, currentDevice]);

  const addDeviceItems = getDeviceItems(addDeviceQuery.data, addRouteQuery.data, addForm.route);
  const editDeviceItems = getDeviceItems(
    editDeviceQuery.data, 
    editRouteQuery.data, 
    editForm.route,
    editTarget ? getCurrentAssignedDevice(editTarget) : null
  );

  const addRouteItems = getRouteItems(addRouteQuery.data);
  const editRouteItems = getRouteItems(editRouteQuery.data);

  // Get branch options for forms
  const addBranchOptions = getFilteredBranchOptions(addForm.school);
  const editBranchOptions = getFilteredBranchOptions(editForm.school);

  useEffect(() => {
    if (supervisors?.length) {
      setFilteredData(supervisors);
      setFilterResults(supervisors);
    }
  }, [supervisors]);

  // Form input handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Mutations
  const addSupervisorMutation = useMutation({
    mutationFn: async (newSupervisor: any) => {
      const response = await api.post("/supervisor", newSupervisor);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supervisors'] });
      alert("Supervisor added successfully.");
      closeButtonRef.current?.click();
      addForm.resetForm();
      setFormData({
        supervisorName: "",
        email: "",
        mobileNo: "",
        username: "",
        password: ""
      });
    },
    onError: (error: any) => {
      alert(`Failed to add supervisor: ${error.response?.data?.message || error.message}`);
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (supervisor: { _id: string; status: "Approved" | "Rejected" }) => {
      return await api.post(`/supervisor/approve/${supervisor._id}`, { status: supervisor.status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supervisors'] });
      alert("Access updated successfully.");
    },
    onError: (err: any) => {
      alert("Failed to update access.\nerror: " + err.message);
    },
  });

  const updateSupervisorMutation = useMutation({
    mutationFn: async ({ supervisorId, data }: { supervisorId: string; data: Partial<Supervisor> }) => {
      return await api.put(`/supervisor/${supervisorId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supervisors'] });
      setEditDialogOpen(false);
      setEditTarget(null);
      editForm.resetForm();
      alert("Supervisor updated successfully.");
    },
    onError: (err: any) => {
      alert("Failed to update supervisor.\nerror: " + err.message);
    },
  });

  const deleteSupervisorMutation = useMutation({
    mutationFn: async (supervisorId: string) => {
      return await api.delete(`/supervisor/${supervisorId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supervisors'] });
      alert("Supervisor deleted successfully.");
    },
    onError: (err: any) => {
      alert("Failed to delete supervisor.\nerror: " + err.message);
    },
  });

  // Event handlers
  const handleSearchResults = useCallback((results: Supervisor[]) => {
    setFilteredData(results);
  }, []);

  const handleDateFilter = useCallback((start: Date | null, end: Date | null) => {
    if (!supervisors || (!start && !end)) {
      setFilteredData(supervisors || []);
      return;
    }
    const filtered = supervisors.filter((supervisor) => {
      if (!supervisor.createdAt) return false;
      const createdDate = new Date(supervisor.createdAt);
      return (!start || createdDate >= start) && (!end || createdDate <= end);
    });
    setFilteredData(filtered);
  }, [supervisors]);

  const handleCustomFilter = useCallback((filtered: Supervisor[]) => {
    setFilteredData(filtered);
  }, []);

  // FIXED: Handle form submission with proper role-based data
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    console.log("Form submission started", {
      role: normalizedRole,
      userSchoolId,
      userBranchId,
      formSchool: addForm.school,
      formBranch: addForm.branch,
      formRoute: addForm.route,
      formData
    });

    // Role-based validation
    if (isSuperAdmin && !addForm.school) {
      alert("Please select School");
      return;
    }
    if ((isSuperAdmin || isSchoolRole) && !addForm.branch) {
      alert("Please select Branch");
      return;
    }
    if (!addForm.route) {
      alert("Please select Route");
      return;
    }

    // FIXED: Determine school and branch IDs based on role with proper fallbacks
    let schoolId = "";
    let branchId = "";

    if (isSuperAdmin) {
      schoolId = addForm.school;
      branchId = addForm.branch;
    } else if (isSchoolRole) {
      schoolId = userSchoolId || "";
      branchId = addForm.branch;
    } else if (isBranchRole) {
      // For branch role, we need to get school ID from the branch
      if (userBranchId && branchData) {
        const userBranch = branchData.find(b => b._id === userBranchId);
        if (userBranch?.schoolId) {
          schoolId = getId(userBranch.schoolId);
        }
      }
      branchId = userBranchId || "";
    }

    console.log("Determined IDs:", { schoolId, branchId });

    if (!schoolId) {
      alert("School information is missing");
      return;
    }
    if (!branchId) {
      alert("Branch information is missing");
      return;
    }

    // Validate required fields
    if (!formData.supervisorName || !formData.mobileNo || !formData.username || !formData.password || !formData.email) {
      alert("Please fill all required fields");
      return;
    }

    const data = {
      supervisorName: formData.supervisorName,
      mobileNo: formData.mobileNo,
      username: formData.username,
      password: formData.password,
      email: formData.email,
      schoolId: schoolId,
      branchId: branchId,
      routeObjId: addForm.route,
      deviceObjId: addForm.device || undefined,
    };

    console.log("Submitting data:", data);
    
    try {
      await addSupervisorMutation.mutateAsync(data);
    } catch (error) {
      console.error("Submission error:", error);
    }
  };

  const handleSave = (updatedData: Partial<Supervisor>) => {
    if (!editTarget) return;

    const changedFields: Partial<Record<keyof Supervisor, unknown>> = {};
    const editTargetFlat = {
      ...editTarget,
      schoolId: getId(editTarget.schoolId),
      branchId: getId(editTarget.branchId),
      routeObjId: getId(editTarget.routeObjId),
      deviceObjId: getId(editTarget.deviceObjId),
    };

    for (const key in updatedData) {
      const newValue = updatedData[key as keyof Supervisor];
      const oldValue = editTargetFlat[key as keyof typeof editTargetFlat];
      if (newValue !== undefined && newValue !== oldValue) {
        changedFields[key as keyof Supervisor] = newValue;
      }
    }

    if (Object.keys(changedFields).length === 0) {
      alert("No changes detected.");
      return;
    }

    updateSupervisorMutation.mutate({ supervisorId: editTarget._id, data: changedFields });
  };

  const handleEditFieldChange = (key: string, value: string) => {
    if (key === "schoolId") {
      editForm.setSchool(value);
      editForm.setBranch(""); editForm.setRoute(""); editForm.setDevice("");
    } else if (key === "branchId") {
      editForm.setBranch(value);
      editForm.setRoute(""); editForm.setDevice("");
    } else if (key === "routeObjId") {
      editForm.setRoute(value);
      editForm.setDevice("");
    } else if (key === "deviceObjId") {
      editForm.setDevice(value);
    }
  };

  // Table configuration
  const columns: ColumnDef<Supervisor, CellContent>[] = useMemo(() => [
    {
      header: "Supervisor Name", accessorFn: (row) => ({ type: "text", value: row.supervisorName ?? "" }),
      meta: { flex: 1, minWidth: 200, maxWidth: 300 }, enableHiding: true,
    },
    {
      header: "School Name", accessorFn: (row) => ({ type: "text", value: typeof row.schoolId === 'object' ? row.schoolId?.schoolName ?? "--" : "--" }),
      meta: { flex: 1, minWidth: 200, maxWidth: 300 }, enableHiding: true,
    },
    {
      header: "Branch Name", accessorFn: (row) => ({ type: "text", value: typeof row.branchId === 'object' ? row.branchId?.branchName ?? "--" : "--" }),
      meta: { flex: 1, minWidth: 200, maxWidth: 300 }, enableHiding: true,
    },
    {
      header: "Route Number", accessorFn: (row) => ({ type: "text", value: typeof row.routeObjId === 'object' ? row.routeObjId?.routeNumber ?? "--" : "--" }),
      meta: { flex: 1, minWidth: 150, maxWidth: 200 }, enableHiding: true,
    },
    {
      header: "Assigned Device", accessorFn: (row) => { 
        const deviceName = typeof row.deviceObjId === 'object' ? row.deviceObjId?.name : "--";
        const routeDeviceName = typeof row.routeObjId === 'object' && typeof row.routeObjId.deviceObjId === 'object' 
          ? row.routeObjId.deviceObjId.name 
          : "--";
        
        const displayName = deviceName !== "--" ? deviceName : routeDeviceName;
        return { type: "text", value: displayName };
      },
      meta: { flex: 1, minWidth: 150, maxWidth: 200 }, enableHiding: true,
    },
    {
      header: "Mobile", accessorFn: (row) => ({ type: "text", value: row.mobileNo ?? "" }),
      meta: { flex: 1, minWidth: 150, maxWidth: 300 }, enableHiding: true,
    },
    {
      header: "Username", accessorFn: (row) => ({ type: "text", value: row.username ?? "" }),
      meta: { flex: 1, minWidth: 150, maxWidth: 300 }, enableHiding: true,
    },
    {
      header: "Password", accessorFn: (row) => ({ type: "text", value: row.password ?? "" }),
      meta: { flex: 1, minWidth: 150, maxWidth: 300 }, enableHiding: true,
    },
    {
      header: "Registration Date", accessorFn: (row) => ({ type: "text", value: formatDate(row.createdAt) ?? "" }),
      meta: { flex: 1, minWidth: 200 }, enableHiding: true,
    },
    {
      header: "Status", accessorFn: (row) => ({ type: "text", value: row.status ?? "Pending" }),
      meta: { flex: 1, minWidth: 120, maxWidth: 150 }, enableHiding: true,
    },
    {
      header: "Approve/Reject", accessorFn: (row) => ({
        type: "group", items: row.status === "Pending" ? [
          { type: "button", label: "Approve", onClick: () => approveMutation.mutate({ _id: row._id, status: "Approved" }), disabled: approveMutation.isPending, className: "flex-shrink-0 text-xs w-20 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-full px-2 py-1 mr-1" },
          { type: "button", label: "Reject", onClick: () => approveMutation.mutate({ _id: row._id, status: "Rejected" }), disabled: approveMutation.isPending, className: "flex-shrink-0 text-xs w-20 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-full px-2 py-1" },
        ] : [
          { type: "button", label: row.status === "Approved" ? "Approved" : "Rejected", onClick: () => {}, disabled: true, className: `flex-shrink-0 text-xs w-24 ${row.status === "Approved" ? "bg-green-300 text-green-800" : "bg-red-300 text-red-800"} font-semibold rounded-full px-2 py-1` },
        ],
      }), meta: { flex: 1, minWidth: 180, maxWidth: 200 }, enableSorting: false, enableHiding: true,
    },
    {
      header: "Action", accessorFn: (row) => ({
        type: "group", items: [
          { type: "button", label: "Edit", onClick: () => { setEditTarget(row); setEditDialogOpen(true); }, className: "cursor-pointer", disabled: updateSupervisorMutation.isPending },
          { type: "button", label: "Delete", onClick: () => setDeleteTarget(row), className: "text-red-600 cursor-pointer", disabled: deleteSupervisorMutation.isPending },
        ],
      }), meta: { flex: 1.5, minWidth: 150, maxWidth: 200 }, enableSorting: false, enableHiding: true,
    },
  ], []);

  const columnsForExport = useMemo(() => [
    { key: "supervisorName", header: "Supervisor Name" },
    { key: "mobileNo", header: "Mobile" },
    { key: "username", header: "Supervisor Username" },
    { key: "password", header: "Supervisor Password" },
    { key: "schoolId.schoolName", header: "School Name" },
    { key: "branchId.branchName", header: "Branch Name" },
    { key: "routeObjId.routeNumber", header: "Route Number" },
    { key: "deviceObjId.name", header: "Assigned Device" },
    { key: "status", header: "Status" },
    { key: "createdAt", header: "Registration Date" },
  ], []);

  const table = useReactTable({
    data: filteredData, columns, state: { columnVisibility },
    onColumnVisibilityChange: setColumnVisibility, getCoreRowModel: getCoreRowModel(),
  });

  const editData = editTarget ? {
    _id: editTarget._id, supervisorName: editTarget.supervisorName || "",
    mobileNo: editTarget.mobileNo || "", username: editTarget.username || "",
    password: editTarget.password || "", email: editTarget.email || "",
    schoolId: getId(editTarget.schoolId), branchId: getId(editTarget.branchId),
    routeObjId: getId(editTarget.routeObjId), deviceObjId: getId(editTarget.deviceObjId),
  } : null;

  const supervisorFieldConfigs: FieldConfig[] = useMemo(() => [
    { label: "Supervisor Name", key: "supervisorName", type: "text", required: true },
    { label: "Email", key: "email", type: "text", required: true },
    { label: "Mobile Number", key: "mobileNo", type: "text", required: true },
    ...(isSuperAdmin ? [{ label: "School Name", key: "schoolId", type: "select", required: true, options: schoolOptions }] : []),
    ...((isSuperAdmin || isSchoolRole) ? [{ label: "Branch Name", key: "branchId", type: "select", required: true, options: editBranchOptions, disabled: isSuperAdmin && !editForm.school }] : []),
    { label: "Route Number", key: "routeObjId", type: "select", required: true, options: editRouteItems, disabled: !editForm.branch },
    { label: "Assign Device", key: "deviceObjId", type: "select", required: false, options: editDeviceItems, disabled: !editForm.route },
    { label: "Username", key: "username", type: "text", required: true },
    { label: "Password", key: "password", type: "text", required: true },
  ], [schoolOptions, editBranchOptions, editForm.school, editForm.branch, editForm.route, editRouteItems, editDeviceItems, isSuperAdmin, isSchoolRole]);

  return (
    <main>
      <ResponseLoader isLoading={isLoading} />

      <header className="flex items-center justify-between mb-4">
        <section className="flex space-x-4">
          <SearchComponent data={filterResults} displayKey={["supervisorName", "username", "email", "mobileNo"]} onResults={handleSearchResults} className="w-[300px] mb-4" />
          <DateRangeFilter onDateRangeChange={handleDateFilter} title="Search by Registration Date" />
          <CustomFilter data={filteredData} originalData={supervisors} filterFields={["status"]} onFilter={handleCustomFilter} placeholder={"Filter by Status"} valueFormatter={(value) => {
            if (!value) return "";
            const formatted = value.toString().toLowerCase();
            if (formatted === "rejected") return "Rejected";
            if (formatted === "approved") return "Approved";
            if (formatted === "pending") return "Pending";
            return value;
          }} />
          <ColumnVisibilitySelector columns={table.getAllColumns()} buttonVariant="outline" buttonSize="default" />
        </section>

        <section>
          <Dialog>
            <DialogTrigger asChild><Button variant="default">Add Supervisor</Button></DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleSubmit} className="space-y-4">
                <DialogHeader><DialogTitle>Add Supervisor</DialogTitle></DialogHeader>
                <SupervisorForm
                  formData={formData}
                  onInputChange={handleInputChange}
                  formState={{
                    school: addForm.school, schoolSearch: addForm.schoolSearch,
                    branch: addForm.branch, branchSearch: addForm.branchSearch,
                    route: addForm.route, routeSearch: addForm.routeSearch,
                    device: addForm.device, deviceSearch: addForm.deviceSearch
                  }}
                  onFormStateChange={{
                    setSchool: addForm.setSchool, setSchoolSearch: addForm.setSchoolSearch,
                    setBranch: addForm.setBranch, setBranchSearch: addForm.setBranchSearch,
                    setRoute: addForm.setRoute, setRouteSearch: addForm.setRouteSearch,
                    setDevice: addForm.setDevice, setDeviceSearch: addForm.setDeviceSearch
                  }}
                  schoolOptions={schoolOptions}
                  branchOptions={addBranchOptions}
                  routeItems={addRouteItems}
                  deviceItems={addDeviceItems}
                  isFetchingRoutes={addRouteQuery.isLoading || addRouteQuery.isFetching}
                  hasNextPage={addDeviceQuery.hasNextPage}
                  fetchNextPage={addDeviceQuery.fetchNextPage}
                  isFetchingNextPage={addDeviceQuery.isFetchingNextPage}
                  isFetching={addDeviceQuery.isFetching}
                  usernameError={""}
                  role={normalizedRole}
                  userSchoolId={userSchoolId}
                  userBranchId={userBranchId}
                />
                <DialogFooter>
                  <DialogClose asChild>
                    <Button ref={closeButtonRef} variant="outline" onClick={() => {
                      addForm.resetForm();
                      setFormData({
                        supervisorName: "",
                        email: "",
                        mobileNo: "",
                        username: "",
                        password: ""
                      });
                    }}>Cancel</Button>
                  </DialogClose>
                  <Button type="submit" disabled={addSupervisorMutation.isPending}>
                    {addSupervisorMutation.isPending ? "Saving..." : "Save Supervisor"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </section>
      </header>

      <section className="mb-4">
        <CustomTable
          data={filteredData || []} columns={columns} columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility} pageSizeArray={[10, 20, 50, 100]}
          maxHeight={600} minHeight={200} showSerialNumber={true}
          noDataMessage="No supervisors found" isLoading={isLoading}
        />
      </section>

      <section>
        {deleteTarget && (
          <Alert<Supervisor>
            title="Are you absolutely sure?"
            description={`This will permanently delete ${deleteTarget?.supervisorName} and all associated data.`}
            actionButton={(target) => {
              deleteSupervisorMutation.mutate(target._id);
              setDeleteTarget(null);
            }}
            target={deleteTarget}
            setTarget={setDeleteTarget}
            butttonText="Delete"
          />
        )}
      </section>
      
      <section>
        {editTarget && editData && (
          <DynamicEditDialog
            data={editData} isOpen={editDialogOpen}
            onClose={() => { setEditDialogOpen(false); setEditTarget(null); editForm.resetForm(); }}
            onSave={handleSave} onFieldChange={handleEditFieldChange}
            fields={supervisorFieldConfigs} title="Edit Supervisor"
            description="Update the supervisor information below. Fields marked with * are required."
            avatarConfig={{ imageKey: "logo", nameKeys: ["supervisorName"] }}
          />
        )}
      </section>
      
      <section>
        <FloatingMenu
          onExportPdf={() => {
            exportToPDF(filteredData, columnsForExport, {
              title: "Supervisor Master Report",
              companyName: "Parents Eye",
              metadata: { Total: `${filteredData.length} supervisors` },
            });
          }}
          onExportExcel={() => {
            exportToExcel(filteredData, columnsForExport, {
              title: "Supervisor Master Report",
              companyName: "Parents Eye",
              metadata: { Total: `${filteredData.length} supervisors` },
            });
          }}
        />
      </section>
    </main>
  );
}