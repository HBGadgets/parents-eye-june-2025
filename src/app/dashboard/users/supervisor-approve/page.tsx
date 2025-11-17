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
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";
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
  PaginationState,
  SortingState,
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
import ReactDOM from 'react-dom';

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData, TValue> {
    flex?: number;
    minWidth?: number;
    maxWidth?: number;
    wrapConfig?: {
      wrap?: "wrap" | "nowrap" | "ellipsis" | "break-word" | "break-all";
      maxWidth?: string;
      minWidth?: string;
    };
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

// Helper function to safely get device name
const getDeviceName = (supervisor: Supervisor): string => {
  // First try to get device from supervisor's deviceObjId
  if (supervisor.deviceObjId) {
    if (typeof supervisor.deviceObjId === 'object' && supervisor.deviceObjId !== null) {
      return supervisor.deviceObjId.name || "--";
    }
  }
  
  // Then try to get device from route's deviceObjId
  if (supervisor.routeObjId && typeof supervisor.routeObjId === 'object' && supervisor.routeObjId !== null) {
    const routeDeviceObj = supervisor.routeObjId.deviceObjId;
    if (routeDeviceObj && typeof routeDeviceObj === 'object' && routeDeviceObj !== null) {
      return routeDeviceObj.name || "--";
    }
  }
  
  return "--";
};

// UPDATED: Proper paginated API call
const useSupervisorsData = ({ 
  enabled = true, 
  schoolId, 
  branchId,
  page = 1,
  limit = 10
}: { 
  enabled?: boolean; 
  schoolId?: string | null; 
  branchId?: string | null;
  page?: number;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ["supervisors", schoolId, branchId, page, limit],
    queryFn: async () => {
      let url = `/supervisor?page=${page}&limit=${limit}`;
      if (schoolId) url += `&schoolId=${schoolId}`;
      if (branchId) url += `&branchId=${branchId}`;
      
      const response = await api.get<SupervisorResponse>(url);
      return {
        supervisors: response.supervisors || [],
        total: response.total || 0,
        page: response.page || 1,
        totalPages: response.totalPages || 1
      };
    },
    enabled: enabled,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
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
    enabled: enabled,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

const useSupervisorForm = (initialData?: Supervisor, role?: string, isSuperAdmin?: boolean, isSchoolRole?: boolean, isBranchRole?: boolean, userBranchId?: string) => {
  const [school, setSchool] = useState("");
  const [schoolSearch, setSchoolSearch] = useState("");
  const [branch, setBranch] = useState("");
  const [branchSearch, setBranchSearch] = useState("");
  const [route, setRoute] = useState("");
  const [routeSearch, setRouteSearch] = useState("");
  const [device, setDevice] = useState("");
  const [deviceSearch, setDeviceSearch] = useState("");

  useEffect(() => {
    if (initialData) {
      if (isSuperAdmin) setSchool(initialData.schoolId?._id || initialData.schoolId || "");
      if (isSuperAdmin || isSchoolRole) setBranch(initialData.branchId?._id || initialData.branchId || "");
      if (isBranchRole && userBranchId) setBranch(userBranchId);
      setRoute(initialData.routeObjId?._id || initialData.routeObjId || "");
      setDevice(initialData.deviceObjId?._id || initialData.deviceObjId || "");
    }
  }, [initialData, isSuperAdmin, isSchoolRole, isBranchRole, userBranchId]);

  const resetForm = () => {
    if (isSuperAdmin) {
      setSchool("");
      setSchoolSearch("");
    }
    if (isSuperAdmin || isSchoolRole) {
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
      setBranch("");
      setBranchSearch("");
    }
  }, [school]);

  const handleBranchChange = useCallback((newBranch: string) => {
    const prevBranch = branch;
    setBranch(newBranch);
    if (newBranch !== prevBranch && prevBranch !== "") {
      setRoute("");
      setRouteSearch("");
    }
  }, [branch]);

  const handleRouteChange = useCallback((newRoute: string) => {
    const prevRoute = route;
    setRoute(newRoute);
    if (newRoute !== prevRoute && prevRoute !== "") {
      setDevice("");
      setDeviceSearch("");
    }
  }, [route]);

  return {
    school,
    setSchool: isSuperAdmin ? handleSchoolChange : () => {},
    schoolSearch,
    setSchoolSearch: isSuperAdmin ? setSchoolSearch : () => {},
    branch,
    setBranch: (isSuperAdmin || isSchoolRole) ? handleBranchChange : () => {},
    branchSearch,
    setBranchSearch: (isSuperAdmin || isSchoolRole) ? setBranchSearch : () => {},
    route,
    setRoute: handleRouteChange,
    routeSearch,
    setRouteSearch,
    device,
    setDevice,
    deviceSearch,
    setDeviceSearch,
    resetForm
  };
};

// Status Dropdown Component - FIXED VERSION
const StatusDropdown = ({ 
  currentStatus, 
  onStatusChange, 
  disabled = false 
}: { 
  currentStatus: string; 
  onStatusChange: (status: "Approved" | "Rejected") => void;
  disabled?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const statusOptions = [
    { label: "Approved", value: "Approved" as const },
    { label: "Rejected", value: "Rejected" as const },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Approved": return "text-green-600 bg-green-100 border-green-200";
      case "Rejected": return "text-red-600 bg-red-100 border-red-200";
      default: return "text-yellow-600 bg-yellow-100 border-yellow-200";
    }
  };

  const handleStatusSelect = (status: "Approved" | "Rejected") => {
    if (status !== currentStatus) {
      onStatusChange(status);
    }
    setIsOpen(false);
  };

  // Improved click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close dropdown when scrolling
  useEffect(() => {
    const handleScroll = () => {
      setIsOpen(false);
    };

    if (isOpen) {
      window.addEventListener('scroll', handleScroll, true);
    }

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  // Render dropdown with better positioning
  const renderDropdown = () => {
    if (!isOpen || disabled || !buttonRef.current) return null;

    const buttonRect = buttonRef.current.getBoundingClientRect();
    
    return ReactDOM.createPortal(
      <div 
        ref={dropdownRef}
        className="fixed bg-white border border-gray-200 rounded-md shadow-lg z-[9999] min-w-[120px] py-1"
        style={{
          left: buttonRect.left,
          top: buttonRect.bottom + 4,
        }}
      >
        {statusOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 transition-colors ${
              currentStatus === option.value ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'
            }`}
            onClick={() => handleStatusSelect(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>,
      document.body
    );
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        ref={buttonRef}
        type="button"
        className={`px-3 py-1 border rounded-full text-sm font-medium transition-colors ${getStatusColor(currentStatus)} ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'
        }`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        {currentStatus || "Pending"}
      </button>
      
      {renderDropdown()}
    </div>
  );
};

// Reusable Form Component
const SupervisorForm = ({ 
  formData, 
  onInputChange, 
  school, 
  setSchool,
  schoolSearch,
  setSchoolSearch,
  branch, 
  setBranch,
  branchSearch,
  setBranchSearch,
  route, 
  setRoute,
  routeSearch,
  setRouteSearch,
  device, 
  setDevice,
  deviceSearch,
  setDeviceSearch,
  schoolOptions,
  branchOptions,
  routeItems,
  deviceItems,
  isFetchingRoutes,
  hasNextPage,
  fetchNextPage,
  isFetchingNextPage,
  isFetching,
  usernameError,
  isSuperAdmin,
  isSchoolRole,
  isBranchRole,
}: any) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div className="grid gap-2">
      <Label htmlFor="supervisorName">Supervisor Name</Label>
      <Input
        id="supervisorName"
        name="supervisorName"
        value={formData?.supervisorName}
        onChange={onInputChange}
        placeholder="Enter supervisor name"
        required
      />
    </div>
    
    {isSuperAdmin && (
      <div className="grid gap-2">
        <Label>School *</Label>
        <Combobox 
          items={schoolOptions} 
          value={school} 
          onValueChange={setSchool}
          placeholder="Search school..." 
          searchPlaceholder="Search schools..." 
          emptyMessage="No school found."
          width="w-full" 
          onSearchChange={setSchoolSearch} 
          searchValue={schoolSearch} 
        />
      </div>
    )}

    {(isSuperAdmin || isSchoolRole) && (
      <div className="grid gap-2">
        <Label>Branch *</Label>
        <Combobox 
          items={branchOptions} 
          value={branch} 
          onValueChange={setBranch}
          placeholder={
            isSuperAdmin 
              ? !school ? "Select school first" : branchOptions.length ? "Search branch..." : "No branches available"
              : branchOptions.length ? "Search branch..." : "Loading branches..."
          }
          searchPlaceholder="Search branches..." 
          emptyMessage={
            isSuperAdmin 
              ? !school ? "Please select a school first" : branchOptions.length === 0 ? "No branches found for this school" : "No branches match your search"
              : "No branches found for your school"
          }
          width="w-full" 
          disabled={isSuperAdmin && !school}
          onSearchChange={setBranchSearch} 
          searchValue={branchSearch} 
        />
      </div>
    )}

    <div className="grid gap-2">
      <Label>Route Number *</Label>
      <Combobox 
        items={routeItems} 
        value={route} 
        onValueChange={setRoute}
        placeholder={
          isSuperAdmin 
            ? !school ? "Select school first" : !branch ? "Select branch first" : "Search route..."
            : isSchoolRole
            ? !branch ? "Select branch first" : "Search route..."
            : "Search route..."
        }
        searchPlaceholder="Search routes..." 
        emptyMessage={
          isSuperAdmin 
            ? !school ? "Please select a school first" : !branch ? "Please select a branch first" : "No routes found"
            : isSchoolRole
            ? !branch ? "Please select a branch first" : "No routes found"
            : "No routes found"
        }
        width="w-full" 
        disabled={isSuperAdmin ? !branch : isSchoolRole ? !branch : false}
        onSearchChange={setRouteSearch} 
        searchValue={routeSearch}
        isLoadingMore={isFetchingRoutes}
      />
    </div>

    <div className="grid gap-2">
      <Label>Assign Device</Label>
      <Combobox 
        items={deviceItems} 
        value={device} 
        onValueChange={setDevice}
        placeholder={!route ? "Select route first" : "Search device..."}
        searchPlaceholder="Search devices..." 
        emptyMessage={!route ? "Please select a route first" : "No devices found"}
        width="w-full" 
        disabled={!route}
        onSearchChange={setDeviceSearch} 
        searchValue={deviceSearch}
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
        value={formData?.email}
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
        value={formData?.mobileNo}
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
        value={formData?.username}
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
        value={formData?.password}
        onChange={onInputChange}
        placeholder="Enter password"
        required
      />
    </div>
  </div>
);

// Add Supervisor Dialog Component
const AddSupervisorDialog = ({ 
  addDialogOpen, 
  setAddDialogOpen, 
  addForm,
  schoolOptions,
  addBranchOptions,
  addRouteQuery,
  addDeviceQuery,
  addSupervisorMutation,
  isSuperAdmin,
  isSchoolRole,
  isBranchRole,
  userSchoolId,
  userBranchId,
  getRouteItems,
  getDeviceItems,
  closeButtonRef
}: any) => {
  const [formData, setFormData] = useState({
    supervisorName: "",
    mobileNo: "",
    username: "",
    password: "",
    email: ""
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (isSuperAdmin && (!addForm.school || !addForm.branch)) {
      alert("Please select School and Branch");
      return;
    }
    if (isSchoolRole && !addForm.branch) {
      alert("Please select Branch");
      return;
    }
    if (!addForm.route) {
      alert("Please select Route");
      return;
    }

    const data: any = {
      supervisorName: formData.supervisorName,
      mobileNo: formData.mobileNo,
      username: formData.username,
      password: formData.password,
      email: formData.email,
      routeObjId: addForm.route,
      deviceObjId: addForm.device || undefined,
    };

    if (isSuperAdmin) {
      data.schoolId = addForm.school;
      data.branchId = addForm.branch;
    } else if (isSchoolRole) {
      data.schoolId = userSchoolId;
      data.branchId = addForm.branch;
    } else if (isBranchRole) {
      data.schoolId = userSchoolId;
      data.branchId = userBranchId;
    }

    await addSupervisorMutation.mutateAsync(data);
  };

  return (
    <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="default">Add Supervisor</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Add Supervisor</DialogTitle>
          </DialogHeader>
          <SupervisorForm
            formData={formData}
            onInputChange={handleInputChange}
            school={addForm.school}
            setSchool={addForm.setSchool}
            schoolSearch={addForm.schoolSearch}
            setSchoolSearch={addForm.setSchoolSearch}
            branch={addForm.branch}
            setBranch={addForm.setBranch}
            branchSearch={addForm.branchSearch}
            setBranchSearch={addForm.setBranchSearch}
            route={addForm.route}
            setRoute={addForm.setRoute}
            routeSearch={addForm.routeSearch}
            setRouteSearch={addForm.setRouteSearch}
            device={addForm.device}
            setDevice={addForm.setDevice}
            deviceSearch={addForm.deviceSearch}
            setDeviceSearch={addForm.setDeviceSearch}
            schoolOptions={schoolOptions}
            branchOptions={addBranchOptions}
            routeItems={getRouteItems(addRouteQuery.data)}
            deviceItems={getDeviceItems(addDeviceQuery.data, addRouteQuery.data, addForm.route)}
            isFetchingRoutes={addRouteQuery.isLoading || addRouteQuery.isFetching}
            hasNextPage={addDeviceQuery.hasNextPage}
            fetchNextPage={addDeviceQuery.fetchNextPage}
            isFetchingNextPage={addDeviceQuery.isFetchingNextPage}
            isFetching={addDeviceQuery.isFetching}
            usernameError=""
            isSuperAdmin={isSuperAdmin}
            isSchoolRole={isSchoolRole}
            isBranchRole={isBranchRole}
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button ref={closeButtonRef} variant="outline" onClick={() => {
                addForm.resetForm();
                setFormData({ supervisorName: "", mobileNo: "", username: "", password: "", email: "" });
              }}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={addSupervisorMutation.isPending}>
              {addSupervisorMutation.isPending ? "Saving..." : "Save Supervisor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Edit Supervisor Dialog Component
const EditSupervisorDialog = ({ 
  editTarget, 
  editDialogOpen, 
  setEditDialogOpen, 
  setEditTarget,
  editForm,
  schoolOptions,
  editBranchOptions,
  editRouteQuery,
  editDeviceQuery,
  updateSupervisorMutation,
  isSuperAdmin,
  isSchoolRole,
  isBranchRole,
  userSchoolId,
  userBranchId,
  handleEditSave,
  getRouteItems,
  getDeviceItems
}: any) => {
  const [formData, setFormData] = useState({
    supervisorName: "",
    mobileNo: "",
    username: "",
    password: "",
    email: "",
  });
  const [usernameError, setUsernameError] = useState("");

  useEffect(() => {
    if (editTarget) {
      setFormData({
        supervisorName: editTarget.supervisorName || "",
        mobileNo: editTarget.mobileNo || "",
        username: editTarget.username || "",
        password: editTarget.password || "",
        email: editTarget.email || "",
      });

      if (editTarget.deviceObjId) {
        const deviceId = typeof editTarget.deviceObjId === 'object' 
          ? editTarget.deviceObjId._id 
          : editTarget.deviceObjId;
        
        if (deviceId) {
          setTimeout(() => {
            editForm.setDevice(deviceId);
          }, 0);
        }
      }

      if (!editTarget.deviceObjId && editTarget.routeObjId) {
        const routeDeviceId = typeof editTarget.routeObjId === 'object' && 
                             typeof editTarget.routeObjId.deviceObjId === 'object'
          ? editTarget.routeObjId.deviceObjId._id
          : typeof editTarget.routeObjId === 'object' 
            ? editTarget.routeObjId.deviceObjId
            : null;
        
        if (routeDeviceId) {
          setTimeout(() => {
            editForm.setDevice(routeDeviceId);
          }, 0);
        }
      }
    }
  }, [editTarget, editForm]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'username') setUsernameError("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSuperAdmin && (!editForm.school || !editForm.branch)) {
      alert("Please select School and Branch");
      return;
    }
    if (isSchoolRole && !editForm.branch) {
      alert("Please select Branch");
      return;
    }
    if (!editForm.route) {
      alert("Please select Route");
      return;
    }
    if (!formData.username.trim()) {
      setUsernameError("Username is required");
      return;
    }

    const updatedData: any = {
      ...formData,
      routeObjId: editForm.route,
      deviceObjId: editForm.device || undefined,
    };

    if (isSuperAdmin) {
      updatedData.schoolId = editForm.school;
      updatedData.branchId = editForm.branch;
    } else if (isSchoolRole) {
      updatedData.schoolId = userSchoolId;
      updatedData.branchId = editForm.branch;
    } else if (isBranchRole) {
      updatedData.schoolId = userSchoolId;
      updatedData.branchId = userBranchId;
    }

    handleEditSave(updatedData);
  };

  if (!editTarget) return null;

  return (
    <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Edit Supervisor</DialogTitle>
          </DialogHeader>
          <SupervisorForm
            formData={formData}
            onInputChange={handleInputChange}
            school={editForm.school}
            setSchool={editForm.setSchool}
            schoolSearch={editForm.schoolSearch}
            setSchoolSearch={editForm.setSchoolSearch}
            branch={editForm.branch}
            setBranch={editForm.setBranch}
            branchSearch={editForm.branchSearch}
            setBranchSearch={editForm.setBranchSearch}
            route={editForm.route}
            setRoute={editForm.setRoute}
            routeSearch={editForm.routeSearch}
            setRouteSearch={editForm.setRouteSearch}
            device={editForm.device}
            setDevice={editForm.setDevice}
            deviceSearch={editForm.deviceSearch}
            setDeviceSearch={editForm.setDeviceSearch}
            schoolOptions={schoolOptions}
            branchOptions={editBranchOptions}
            routeItems={getRouteItems(editRouteQuery.data)}
            deviceItems={getDeviceItems(editDeviceQuery.data, editRouteQuery.data, editForm.route)}
            isFetchingRoutes={editRouteQuery.isLoading || editRouteQuery.isFetching}
            hasNextPage={editDeviceQuery.hasNextPage}
            fetchNextPage={editDeviceQuery.fetchNextPage}
            isFetchingNextPage={editDeviceQuery.isFetchingNextPage}
            isFetching={editDeviceQuery.isFetching}
            usernameError={usernameError}
            isSuperAdmin={isSuperAdmin}
            isSchoolRole={isSchoolRole}
            isBranchRole={isBranchRole}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => {
              setEditDialogOpen(false);
              setEditTarget(null);
              editForm.resetForm();
            }}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateSupervisorMutation.isPending}>
              {updateSupervisorMutation.isPending ? "Updating..." : "Update Supervisor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default function SupervisorApprove() {
  const queryClient = useQueryClient();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [filteredData, setFilteredData] = useState<Supervisor[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Supervisor | null>(null);
  const [editTarget, setEditTarget] = useState<Supervisor | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const { exportToPDF, exportToExcel } = useExport();
  const [role, setRole] = useState<string | null>(null);
  const [userSchoolId, setUserSchoolId] = useState<string | null>(null);
  const [userBranchId, setUserBranchId] = useState<string | null>(null);
  
  // UPDATED: Enhanced pagination state for server-side pagination
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [totalRecords, setTotalRecords] = useState(0);

  // Role checks
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

  // Get user info from token
  useEffect(() => {
    const token = Cookies.get("token");
    if (token) {
      const decoded = getDecodedToken(token);
      setRole(decoded?.role || "");

      if (["school", "schooladmin"].includes((decoded?.role || "").toLowerCase())) {
        setUserSchoolId(decoded?.id || null);
      } else {
        setUserSchoolId(decoded?.schoolId || null);
      }

      if (["branch", "branchadmin"].includes((decoded?.role || "").toLowerCase())) {
        setUserBranchId(decoded?.id || null);
      } else {
        setUserBranchId(decoded?.branchId || null);
      }
    }
  }, []);

  // Data hooks
  const { data: schoolData } = useSchoolData({ enabled: isSuperAdmin });
  const { data: branchData, isLoading: branchLoading } = useBranchData();

  // Form hooks
  const addForm = useSupervisorForm(undefined, normalizedRole, isSuperAdmin, isSchoolRole, isBranchRole, userBranchId);
  const editForm = useSupervisorForm(editTarget || undefined, normalizedRole, isSuperAdmin, isSchoolRole, isBranchRole, userBranchId);

  // UPDATED: Paginated API call for supervisors
  const { data: supervisorsData, isLoading } = useSupervisorsData({
    enabled: !!normalizedRole,
    schoolId: isSchoolRole ? userSchoolId : isBranchRole ? userSchoolId : undefined,
    branchId: isBranchRole ? userBranchId : undefined,
    page: pagination.pageIndex + 1, // Convert to 1-based for backend
    limit: pagination.pageSize,
  });

  // UPDATED: Set filtered data and pagination info
  useEffect(() => {
    if (supervisorsData) {
      setFilteredData(supervisorsData.supervisors);
      setTotalRecords(supervisorsData.total);
    }
  }, [supervisorsData]);

  // Set initial values for forms based on role
  useEffect(() => {
    if (isSchoolRole && userSchoolId) addForm.setSchool(userSchoolId);
    if (isBranchRole && userBranchId) addForm.setBranch(userBranchId);
  }, [isSchoolRole, isBranchRole, userSchoolId, userBranchId, addForm]);

  // Get schoolId for branch role from branchData
  const userSchoolIdForBranch = useMemo(() => {
    if (isBranchRole && userBranchId && branchData) {
      const userBranch = branchData.find(b => b._id === userBranchId);
      return userBranch?.schoolId?._id || userBranch?.schoolId || null;
    }
    return null;
  }, [isBranchRole, userBranchId, branchData]);

  // Helper functions
  const getIdHelper = useCallback((obj: any): string => {
    if (!obj) return "";
    if (typeof obj === "string") return obj;
    return obj._id || "";
  }, []);

  // Get route device IDs
  const getRouteDeviceIds = useCallback((routeData: any, routeId: string): string[] => {
    if (!routeData || !routeId) return [];
    const routes = extractData(routeData, ["routes", "data"]);
    const selectedRoute = routes.find((r: Route) => r._id === routeId);
    
    if (selectedRoute?.deviceObjId) {
      const deviceId = getIdHelper(selectedRoute.deviceObjId);
      return deviceId ? [deviceId] : [];
    }
    
    return [];
  }, [getIdHelper]);

  // Route data queries
  const addRouteQuery = useRouteData({ 
    branchId: isBranchRole ? userBranchId : addForm.branch,
    search: addForm.routeSearch,
    enabled: isBranchRole ? !!userBranchId : !!addForm.branch
  });

  const editRouteQuery = useRouteData({ 
    branchId: isBranchRole ? userBranchId : editForm.branch,
    search: editForm.routeSearch,
    enabled: isBranchRole ? !!userBranchId : !!editForm.branch
  });

  // Device data queries
  const addDeviceQuery = useInfiniteDeviceData({
    role: normalizedRole as any,
    schoolId: isSuperAdmin ? addForm.school || undefined : userSchoolId || undefined,
    branchId: isSuperAdmin ? addForm.branch || undefined : userBranchId || undefined,
    deviceObjId: getRouteDeviceIds(addRouteQuery.data, addForm.route),
    search: addForm.deviceSearch,
    limit: 20,
    enabled: !!addForm.route
  });

  const editDeviceQuery = useInfiniteDeviceData({
    role: normalizedRole as any,
    schoolId: isSuperAdmin ? editForm.school || undefined : userSchoolId || undefined,
    branchId: isSuperAdmin ? editForm.branch || undefined : userBranchId || undefined,
    deviceObjId: getRouteDeviceIds(editRouteQuery.data, editForm.route),
    search: editForm.deviceSearch,
    limit: 20,
    enabled: !!editForm.route
  });

  // Memoized school options
  const schoolOptions: SelectOption[] = useMemo(() => {
    if (!schoolData) return [];
    let filteredSchools = schoolData;
    
    if (isSchoolRole && userSchoolId) {
      filteredSchools = schoolData.filter(s => s._id === userSchoolId);
    } else if (isBranchRole && userSchoolIdForBranch) {
      filteredSchools = schoolData.filter(s => s._id === userSchoolIdForBranch);
    }
    
    return Array.from(new Map(filteredSchools.filter(s => s._id && s.schoolName).map(s => [s._id, { label: s.schoolName, value: s._id }])).values());
  }, [schoolData, isSchoolRole, isBranchRole, userSchoolId, userSchoolIdForBranch]);

  // Branch options
  const getFilteredBranchOptions = useCallback((schoolId: string) => {
    if (!branchData) return [];
    let filteredBranches = branchData;
    
    if (isSchoolRole && userSchoolId) {
      filteredBranches = branchData.filter(branch => getIdHelper(branch.schoolId) === userSchoolId);
    } else if (isBranchRole && userBranchId) {
      filteredBranches = branchData.filter(branch => branch._id === userBranchId);
    } else if (isSuperAdmin && schoolId) {
      filteredBranches = branchData.filter(branch => getIdHelper(branch.schoolId) === schoolId);
    }
    
    return filteredBranches.filter(branch => branch._id && branch.branchName).map(branch => ({
      label: branch.branchName, value: branch._id
    }));
  }, [branchData, isSuperAdmin, isSchoolRole, isBranchRole, userSchoolId, userBranchId, getIdHelper]);

  const addBranchOptions = useMemo(() => 
    getFilteredBranchOptions(addForm.school), 
    [getFilteredBranchOptions, addForm.school]
  );

  const editBranchOptions = useMemo(() => 
    getFilteredBranchOptions(editForm.school), 
    [getFilteredBranchOptions, editForm.school]
  );

  // Route items
  const getRouteItems = useCallback((routeData: any) => {
    if (!routeData) return [];
    
    let routes = [];
    if (routeData.routes && Array.isArray(routeData.routes)) {
      routes = routeData.routes;
    } else if (routeData.data && Array.isArray(routeData.data)) {
      routes = routeData.data;
    } else if (Array.isArray(routeData)) {
      routes = routeData;
    }
    
    return routes
      .filter((r: Route) => r._id && r.routeNumber)
      .map((r: Route) => ({ 
        label: r.routeNumber + (r.routeName ? ` - ${r.routeName}` : ''), 
        value: r._id 
      }));
  }, []);

  // Device items
  const getDeviceItems = useCallback((deviceData: any, routeData: any, routeId: string) => {
    if (routeData && routeId) {
      const routes = extractData(routeData, ["routes", "data"]);
      const selectedRoute = routes.find((r: Route) => r._id === routeId);
      
      if (selectedRoute?.deviceObjId) {
        const deviceId = getIdHelper(selectedRoute.deviceObjId);
        const deviceName = typeof selectedRoute.deviceObjId === 'object' 
          ? selectedRoute.deviceObjId.name 
          : 'Assigned Device';
        
        if (deviceId) {
          return [{ label: deviceName, value: deviceId }];
        }
      }
      return [];
    }
    
    return [];
  }, [getIdHelper]);

  // Mutations
  const approveMutation = useMutation({
    mutationFn: async (supervisor: { _id: string; status: "Approved" | "Rejected" }) => 
      await api.post(`/supervisor/approve/${supervisor._id}`, { status: supervisor.status }),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ["supervisors"] });
      const previousSupervisors = queryClient.getQueryData<any>(["supervisors"]);

      queryClient.setQueryData<any>(["supervisors"], (old) => {
        if (!old) return old;
        return {
          ...old,
          supervisors: old.supervisors?.map((s: Supervisor) => 
            s._id === variables._id 
              ? { ...s, status: variables.status }
              : s
          ) || []
        };
      });

      setFilteredData(prev => 
        prev.map(s => 
          s._id === variables._id 
            ? { ...s, status: variables.status }
            : s
        )
      );

      return { previousSupervisors };
    },
    onError: (err, variables, context) => {
      if (context?.previousSupervisors) {
        queryClient.setQueryData(["supervisors"], context.previousSupervisors);
        setFilteredData(context.previousSupervisors?.supervisors || []);
      }
      alert("Failed to update supervisor status.");
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["supervisors"] });
      alert(`Supervisor ${variables.status.toLowerCase()} successfully.`);
    },
  });

  const addSupervisorMutation = useMutation({
    mutationFn: async (newSupervisor: any) => await api.post("/supervisor", newSupervisor),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supervisors"] });
      alert("Supervisor added successfully.");
      setAddDialogOpen(false);
      addForm.resetForm();
      if (closeButtonRef.current) closeButtonRef.current.click();
    },
    onError: (error: any) => alert(`Failed to add supervisor: ${error.response?.data?.message || error.message}`),
  });

  const updateSupervisorMutation = useMutation({
    mutationFn: async ({ supervisorId, data }: { supervisorId: string; data: Partial<Supervisor> }) => {
      if (data.username && editTarget && data.username === editTarget.username) {
        const { username, ...dataWithoutUsername } = data;
        return await api.put(`/supervisor/${supervisorId}`, dataWithoutUsername);
      }
      return await api.put(`/supervisor/${supervisorId}`, data);
    },
    onSuccess: (updatedSupervisor, variables) => {
      queryClient.setQueryData<any>(["supervisors"], (old) => {
        if (!old) return old;
        return {
          ...old,
          supervisors: old.supervisors?.map((s: Supervisor) => 
            s._id === variables.supervisorId 
              ? { ...s, ...variables.data }
              : s
          ) || []
        };
      });
      setFilteredData(prev => 
        prev.map(s => 
          s._id === variables.supervisorId 
            ? { ...s, ...variables.data }
            : s
        )
      );
      setEditDialogOpen(false);
      setEditTarget(null);
      editForm.resetForm();
      alert("Supervisor updated successfully.");
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message;
      alert(msg.includes("username") ? "Username may already be taken." : `Failed to update supervisor: ${msg}`);
    },
  });

  const deleteSupervisorMutation = useMutation({
    mutationFn: async (supervisorId: string) => await api.delete(`/supervisor/${supervisorId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supervisors"] });
      setFilteredData(prev => prev.filter(s => s._id !== deleteTarget?._id));
      setDeleteTarget(null);
      alert("Supervisor deleted successfully.");
    },
    onError: () => alert("Failed to delete supervisor."),
  });

  // Event handlers
  const handleStatusChange = useCallback((supervisor: Supervisor, newStatus: "Approved" | "Rejected") => {
    if (!supervisor._id) return;
    approveMutation.mutate({ _id: supervisor._id, status: newStatus });
  }, [approveMutation]);

  const handleEditSave = useCallback((updatedData: Partial<Supervisor>) => {
    if (!editTarget) return;

    const changedFields: Partial<Supervisor> = {};
    const flatTarget = {
      ...editTarget,
      schoolId: editTarget.schoolId?._id || editTarget.schoolId,
      branchId: editTarget.branchId?._id || editTarget.branchId,
      routeObjId: editTarget.routeObjId?._id || editTarget.routeObjId,
      deviceObjId: editTarget.deviceObjId?._id || editTarget.deviceObjId,
    };

    for (const key in updatedData) {
      const newVal = updatedData[key as keyof Supervisor];
      const oldVal = flatTarget[key as keyof Supervisor];
      if (newVal !== undefined && newVal !== oldVal) {
        if (key === 'username' && newVal === editTarget.username) continue;
        changedFields[key as keyof Supervisor] = newVal;
      }
    }

    if (Object.keys(changedFields).length === 0) {
      alert("No changes detected.");
      return;
    }

    updateSupervisorMutation.mutate({ supervisorId: editTarget._id, data: changedFields });
  }, [editTarget, updateSupervisorMutation]);

  // UPDATED: Handle pagination change for server-side
  const handlePaginationChange = useCallback((newPagination: PaginationState) => {
    setPagination(newPagination);
  }, []);

  // UPDATED: Handle sorting change
  const handleSortingChange = useCallback((newSorting: SortingState) => {
    setSorting(newSorting);
    // You can implement server-side sorting here if needed
  }, []);

  // Table columns with FIXED device name accessor
  const columns: ColumnDef<Supervisor>[] = useMemo(() => [
    {
      header: "Supervisor Name",
      accessorFn: (row) => row.supervisorName ?? "",
      meta: { 
        flex: 1, 
        minWidth: 200, 
        maxWidth: 300,
        wrapConfig: { wrap: "ellipsis" }
      },
      enableHiding: true,
    },
    ...(isSuperAdmin ? [{
      header: "School Name",
      accessorFn: (row) => row.schoolId?.schoolName ?? "--",
      meta: { 
        flex: 1, 
        minWidth: 200, 
        maxWidth: 300,
        wrapConfig: { wrap: "ellipsis" }
      },
      enableHiding: true,
    }] : []),
    ...((isSuperAdmin || isSchoolRole) ? [{
      header: "Branch Name",
      accessorFn: (row) => row.branchId?.branchName ?? "--",
      meta: { 
        flex: 1, 
        minWidth: 200, 
        maxWidth: 300,
        wrapConfig: { wrap: "ellipsis" }
      },
      enableHiding: true,
    }] : []),
    {
      header: "Route Number",
      accessorFn: (row) => row.routeObjId?.routeNumber ?? "--",
      meta: { 
        flex: 1, 
        minWidth: 150, 
        maxWidth: 200,
        wrapConfig: { wrap: "nowrap" }
      },
      enableHiding: true,
    },
    {
      header: "Assigned Device",
      accessorFn: (row) => getDeviceName(row),
      meta: { 
        flex: 1, 
        minWidth: 150, 
        maxWidth: 200,
        wrapConfig: { wrap: "ellipsis" }
      },
      enableHiding: true,
    },
    {
      header: "Mobile",
      accessorFn: (row) => row.mobileNo ?? "",
      meta: { 
        flex: 1, 
        minWidth: 150, 
        maxWidth: 300,
        wrapConfig: { wrap: "nowrap" }
      },
      enableHiding: true,
    },
    {
      header: "Username",
      accessorFn: (row) => row.username ?? "",
      meta: { 
        flex: 1, 
        minWidth: 150, 
        maxWidth: 300,
        wrapConfig: { wrap: "ellipsis" }
      },
      enableHiding: true,
    },
    {
      header: "Password",
      accessorFn: (row) => row.password ?? "",
      meta: { 
        flex: 1, 
        minWidth: 150, 
        maxWidth: 300,
        wrapConfig: { wrap: "ellipsis" }
      },
      enableHiding: true,
    },
    {
      header: "Registration Date",
      accessorFn: (row) => formatDate(row.createdAt) ?? "",
      meta: { 
        flex: 1, 
        minWidth: 200,
        wrapConfig: { wrap: "nowrap" }
      },
      enableHiding: true,
    },
    {
      header: "Status",
      accessorFn: (row) => row.status ?? "Pending",
      meta: { 
        flex: 1, 
        minWidth: 120, 
        maxWidth: 150,
        wrapConfig: { wrap: "nowrap" }
      },
      enableHiding: true,
    },
    {
      header: "Approve/Reject",
      accessorFn: (row) => row,
      cell: ({ row }) => (
        <StatusDropdown
          currentStatus={row.original.status || "Pending"}
          onStatusChange={(status) => handleStatusChange(row.original, status)}
          disabled={approveMutation.isPending}
        />
      ),
      meta: { 
        flex: 1, 
        minWidth: 150, 
        maxWidth: 200,
        wrapConfig: { wrap: "nowrap" }
      },
      enableSorting: false,
      enableHiding: true,
    },
    {
      header: "Action",
      accessorFn: (row) => row,
      cell: ({ row }) => (
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditTarget(row.original);
              setEditDialogOpen(true);
            }}
            disabled={updateSupervisorMutation.isPending}
            className="cursor-pointer bg-yellow-400 hover:bg-yellow-500 text-[#733e0a] font-semibold py-1.5 px-4 rounded-md text-sm"
          >
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteTarget(row.original)}
            disabled={deleteSupervisorMutation.isPending}
            className="cursor-pointer bg-yellow-400 hover:bg-yellow-500 text-red-600 font-semibold py-1.5 px-4 rounded-md text-sm"
          >
            Delete
          </Button>
        </div>
      ),
      meta: { 
        flex: 1.5, 
        minWidth: 150, 
        maxWidth: 220,
        wrapConfig: { wrap: "nowrap" }
      },
      enableSorting: false,
      enableHiding: true,
    },
  ], [isSuperAdmin, isSchoolRole, handleStatusChange, approveMutation.isPending, updateSupervisorMutation.isPending, deleteSupervisorMutation.isPending]);

  const columnsForExport = useMemo(() => [
    { key: "supervisorName", header: "Supervisor Name" },
    { key: "mobileNo", header: "Mobile" },
    { key: "username", header: "Username" },
    { key: "password", header: "Password" },
    ...(isSuperAdmin ? [{ key: "schoolId.schoolName", header: "School Name" }] : []),
    ...((isSuperAdmin || isSchoolRole) ? [{ key: "branchId.branchName", header: "Branch Name" }] : []),
    { key: "routeObjId.routeNumber", header: "Route Number" },
    { key: "deviceObjId.name", header: "Assigned Device" },
    { key: "status", header: "Status" },
    { key: "createdAt", header: "Registration Date" },
  ], [isSuperAdmin, isSchoolRole]);

  // FIX: Create a proper table instance for ColumnVisibilitySelector
  const tableForVisibility = useReactTable({
    data: filteredData,
    columns,
    state: {
      columnVisibility,
    },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
  });

  // FIX: Use the CustomTableServerSidePagination component properly
  const { tableElement } = CustomTableServerSidePagination({
    data: filteredData,
    columns,
    pagination,
    totalCount: totalRecords,
    loading: isLoading,
    onPaginationChange: handlePaginationChange,
    onSortingChange: handleSortingChange,
    sorting,
    emptyMessage: "No supervisors found",
    pageSizeOptions: [10, 20, 50, 100],
    enableSorting: true,
    manualSorting: true,
    manualPagination: true,
    showSerialNumber: true,
    serialNumberHeader: "SN",
    maxHeight: "600px",
    columnVisibility,
    onColumnVisibilityChange: setColumnVisibility,
    enableRowClick: false,
    defaultTextWrap: "nowrap",
    enableColumnWrapping: true,
  });

  return (
    <main>
      <ResponseLoader isLoading={isLoading || branchLoading} />

      <header className="flex items-center justify-between mb-4">
        <section className="flex space-x-4">
          <SearchComponent
            data={supervisorsData?.supervisors || []}
            displayKey={["supervisorName", "username", "email", "mobileNo"]}
            onResults={setFilteredData}
            className="w-[300px] mb-4"
          />
          <DateRangeFilter
            onDateRangeChange={(start, end) => {
              if (!supervisorsData?.supervisors || (!start && !end)) {
                setFilteredData(supervisorsData?.supervisors || []);
                return;
              }
              const filtered = supervisorsData.supervisors.filter(s => {
                if (!s.createdAt) return false;
                const date = new Date(s.createdAt);
                return (!start || date >= start) && (!end || date <= end);
              });
              setFilteredData(filtered);
            }}
            title="Search by Registration Date"
          />
          <CustomFilter
            data={filteredData}
            originalData={supervisorsData?.supervisors}
            filterFields={["status"]}
            onFilter={setFilteredData}
            placeholder="Filter by Status"
            valueFormatter={(v) => v ? v.toString().charAt(0).toUpperCase() + v.toString().slice(1).toLowerCase() : ""}
          />
          {/* FIX: Pass table columns instead of raw column definitions */}
          <ColumnVisibilitySelector columns={tableForVisibility.getAllLeafColumns()} />
        </section>

        <section>
          <AddSupervisorDialog
            addDialogOpen={addDialogOpen}
            setAddDialogOpen={setAddDialogOpen}
            addForm={addForm}
            schoolOptions={schoolOptions}
            addBranchOptions={addBranchOptions}
            addRouteQuery={addRouteQuery}
            addDeviceQuery={addDeviceQuery}
            addSupervisorMutation={addSupervisorMutation}
            isSuperAdmin={isSuperAdmin}
            isSchoolRole={isSchoolRole}
            isBranchRole={isBranchRole}
            userSchoolId={userSchoolId}
            userBranchId={userBranchId}
            getRouteItems={getRouteItems}
            getDeviceItems={(deviceData: any) => getDeviceItems(deviceData, addRouteQuery.data, addForm.route)}
            closeButtonRef={closeButtonRef}
          />
        </section>
      </header>

      <section className="mb-4">
        {/* FIX: Render only the tableElement, not the entire object */}
        {tableElement}
      </section>

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
          className="max-w-md w-full"
        />
      )}

      <EditSupervisorDialog
        editTarget={editTarget}
        editDialogOpen={editDialogOpen}
        setEditDialogOpen={setEditDialogOpen}
        setEditTarget={setEditTarget}
        editForm={editForm}
        schoolOptions={schoolOptions}
        editBranchOptions={editBranchOptions}
        editRouteQuery={editRouteQuery}
        editDeviceQuery={editDeviceQuery}
        updateSupervisorMutation={updateSupervisorMutation}
        isSuperAdmin={isSuperAdmin}
        isSchoolRole={isSchoolRole}
        isBranchRole={isBranchRole}
        userSchoolId={userSchoolId}
        userBranchId={userBranchId}
        handleEditSave={handleEditSave}
        getRouteItems={getRouteItems}
        getDeviceItems={(deviceData: any) => getDeviceItems(deviceData, editRouteQuery.data, editForm.route)}
      />

      <FloatingMenu
        onExportPdf={() => exportToPDF(filteredData, columnsForExport, {
          title: "Supervisor Master Report",
          companyName: "Parents Eye",
          metadata: { Total: `${filteredData.length} supervisors` },
        })}
        onExportExcel={() => exportToExcel(filteredData, columnsForExport, {
          title: "Supervisor Master Report",
          companyName: "Parents Eye",
          metadata: { Total: `${filteredData.length} supervisors` },
        })}
      />
    </main>
  );
}