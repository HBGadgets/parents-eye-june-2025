"use client";

import React, { useCallback, useEffect, useState, useRef, useMemo } from "react";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";
import SearchComponent from "@/components/ui/SearchOnlydata";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import DateRangeFilter from "@/components/ui/DateRangeFilter";
import { FloatingMenu } from "@/components/floatingMenu";
import { getCoreRowModel, useReactTable, VisibilityState, type ColumnDef, PaginationState, SortingState } from "@tanstack/react-table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/apiService";
import { useExport } from "@/hooks/useExport";
import { formatDate } from "@/util/formatDate";
import { Alert } from "@/components/Alert";
import ResponseLoader from "@/components/ResponseLoader";
import { CustomFilter } from "@/components/ui/CustomFilter";
import { ColumnVisibilitySelector } from "@/components/column-visibility-selector";
import { useSchoolData } from "@/hooks/useSchoolData";
import { useBranchData } from "@/hooks/useBranchData";
import { useInfiniteDeviceData } from "@/hooks/useInfiniteDeviceData";
import { Driver } from "@/interface/modal";
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

interface DriverResponse {
  success: boolean;
  page: number;
  limit: number;
  totalDrivers: number;
  totalPages: number;
  drivers: Driver[];
}

interface SelectOption {
  label: string;
  value: string;
}

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

// Helper functions
const getId = (obj: any): string => {
  if (!obj) return "";
  if (typeof obj === "string") return obj;
  return obj._id || "";
};

// FIXED: Proper paginated API call for drivers that matches your backend response
const useDriversData = ({ 
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
    queryKey: ["drivers", schoolId, branchId, page, limit],
    queryFn: async () => {
      let url = `/driver?page=${page}&limit=${limit}`;
      if (schoolId) url += `&schoolId=${schoolId}`;
      if (branchId) url += `&branchId=${branchId}`;
      
      console.log("Fetching drivers from:", url);
      
      // FIXED: Properly handle the backend response structure
      const response = await api.get<DriverResponse>(url);
      
      console.log("Drivers API Response:", response);
      
      return {
        drivers: response.drivers || [],
        total: response.totalDrivers || 0,
        page: response.page || 1,
        totalPages: response.totalPages || 1,
        success: response.success
      };
    },
    enabled: enabled,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

// Custom hook for form state management
const useDriverForm = (initialData?: Driver, role?: string, isSuperAdmin?: boolean, isSchoolRole?: boolean, isBranchRole?: boolean, userBranchId?: string) => {
  const [school, setSchool] = useState("");
  const [schoolSearch, setSchoolSearch] = useState("");
  const [branch, setBranch] = useState("");
  const [branchSearch, setBranchSearch] = useState("");
  const [device, setDevice] = useState("");
  const [deviceSearch, setDeviceSearch] = useState("");

  useEffect(() => {
    if (initialData) {
      if (isSuperAdmin) {
        setSchool(initialData.schoolId?._id || initialData.schoolId || "");
      }
      if (isSuperAdmin || isSchoolRole) {
        setBranch(initialData.branchId?._id || initialData.branchId || "");
      }
      if (isBranchRole && userBranchId) {
        setBranch(userBranchId);
      }
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
      setDevice("");
      setDeviceSearch("");
    }
  }, [branch]);

  return {
    school,
    setSchool: isSuperAdmin ? handleSchoolChange : () => {},
    schoolSearch,
    setSchoolSearch: isSuperAdmin ? setSchoolSearch : () => {},
    branch,
    setBranch: (isSuperAdmin || isSchoolRole) ? handleBranchChange : () => {},
    branchSearch,
    setBranchSearch: (isSuperAdmin || isSchoolRole) ? setBranchSearch : () => {},
    device,
    setDevice,
    deviceSearch,
    setDeviceSearch,
    resetForm
  };
};

// Reusable Form Component
const DriverForm = ({ 
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
  device, 
  setDevice,
  deviceSearch,
  setDeviceSearch,
  schoolOptions,
  branchOptions,
  deviceItems,
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
      <Label htmlFor="driverName">Driver Name</Label>
      <Input
        id="driverName"
        name="driverName"
        value={formData?.driverName}
        onChange={onInputChange}
        placeholder="Enter driver name"
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
      <Label>Device *</Label>
      <Combobox 
        items={deviceItems} 
        value={device} 
        onValueChange={setDevice}
        placeholder={
          isSuperAdmin 
            ? !school ? "Select school first" : !branch ? "Select branch first" : "Search device..."
            : isSchoolRole
            ? !branch ? "Select branch first" : "Search device..."
            : isBranchRole
            ? "Search device..."
            : "Search device..."
        }
        searchPlaceholder="Search devices..." 
        emptyMessage={
          isSuperAdmin 
            ? !school ? "Please select a school first" : !branch ? "Please select a branch first" : "No devices found"
            : isSchoolRole
            ? !branch ? "Please select a branch first" : "No devices found"
            : isBranchRole
            ? "No devices found"
            : "No devices found"
        }
        width="w-full" 
        disabled={
          isSuperAdmin ? !branch : 
          isSchoolRole ? !branch : 
          isBranchRole ? false : false
        }
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

// Edit Driver Dialog Component
const EditDriverDialog = ({ 
  editTarget, 
  editDialogOpen, 
  setEditDialogOpen, 
  setEditTarget,
  editForm,
  schoolOptions,
  editBranchOptions,
  editDeviceQuery,
  updateDriverMutation,
  isSuperAdmin,
  isSchoolRole,
  isBranchRole,
  userSchoolId,
  userBranchId,
  handleEditSave,
  getDeviceItems
}: any) => {
  const [formData, setFormData] = useState({
    driverName: "",
    mobileNo: "",
    username: "",
    password: "",
    email: "",
  });
  const [usernameError, setUsernameError] = useState("");

  // Initialize form data when editTarget changes
  useEffect(() => {
    if (editTarget) {
      setFormData({
        driverName: editTarget.driverName || "",
        mobileNo: editTarget.mobileNo || "",
        username: editTarget.username || "",
        password: editTarget.password || "",
        email: editTarget.email || "",
      });
    }
  }, [editTarget]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'username') setUsernameError("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Role-based validation
    if (isSuperAdmin && (!editForm.school || !editForm.branch)) {
      alert("Please select School and Branch");
      return;
    }
    if (isSchoolRole && !editForm.branch) {
      alert("Please select Branch");
      return;
    }
    if (!editForm.device) {
      alert("Please select Device");
      return;
    }
    if (!formData.username.trim()) {
      setUsernameError("Username is required");
      return;
    }

    const updatedData: any = {
      ...formData,
      deviceObjId: editForm.device,
    };

    // Proper role-based ID assignment for edit
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
            <DialogTitle>Edit Driver</DialogTitle>
          </DialogHeader>
          <DriverForm
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
            device={editForm.device}
            setDevice={editForm.setDevice}
            deviceSearch={editForm.deviceSearch}
            setDeviceSearch={editForm.setDeviceSearch}
            schoolOptions={schoolOptions}
            branchOptions={editBranchOptions}
            deviceItems={getDeviceItems(editDeviceQuery.data)}
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
            <Button type="submit" disabled={updateDriverMutation.isPending}>
              {updateDriverMutation.isPending ? "Updating..." : "Update Driver"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Add Driver Dialog Component
const AddDriverDialog = ({ 
  addDialogOpen, 
  setAddDialogOpen, 
  addForm,
  schoolOptions,
  addBranchOptions,
  addDeviceQuery,
  addDriverMutation,
  isSuperAdmin,
  isSchoolRole,
  isBranchRole,
  userSchoolId,
  userBranchId,
  getDeviceItems,
  closeButtonRef
}: any) => {
  const [formData, setFormData] = useState({
    driverName: "",
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
    
    // Role-based validation
    if (isSuperAdmin && (!addForm.school || !addForm.branch)) {
      alert("Please select School and Branch");
      return;
    }
    if (isSchoolRole && !addForm.branch) {
      alert("Please select Branch");
      return;
    }
    if (!addForm.device) {
      alert("Please select Device");
      return;
    }

    const data: any = {
      driverName: formData.driverName,
      mobileNo: formData.mobileNo,
      username: formData.username,
      password: formData.password,
      email: formData.email,
      deviceObjId: addForm.device,
    };

    // Proper role-based ID assignment
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

    console.log("Submitting driver data:", data);

    await addDriverMutation.mutateAsync(data);
  };

  return (
    <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="default">Add Driver</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Add Driver</DialogTitle>
          </DialogHeader>
          <DriverForm
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
            device={addForm.device}
            setDevice={addForm.setDevice}
            deviceSearch={addForm.deviceSearch}
            setDeviceSearch={addForm.setDeviceSearch}
            schoolOptions={schoolOptions}
            branchOptions={addBranchOptions}
            deviceItems={getDeviceItems(addDeviceQuery.data)}
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
                setFormData({
                  driverName: "",
                  mobileNo: "",
                  username: "",
                  password: "",
                  email: ""
                });
              }}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={addDriverMutation.isPending}>
              {addDriverMutation.isPending ? "Saving..." : "Save Driver"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default function DriverApprove() {
  const queryClient = useQueryClient();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [filteredData, setFilteredData] = useState<Driver[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Driver | null>(null);
  const [editTarget, setEditTarget] = useState<Driver | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const { exportToPDF, exportToExcel } = useExport();
  const [role, setRole] = useState<string | null>(null);
  const [userSchoolId, setUserSchoolId] = useState<string | null>(null);
  const [userBranchId, setUserBranchId] = useState<string | null>(null);
  
  // FIXED: Enhanced pagination state for server-side pagination
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

  // FIXED: Use the proper useDriversData hook with correct pagination
  const { data: driversData, isLoading } = useDriversData({
    enabled: !!normalizedRole,
    schoolId: isSchoolRole ? userSchoolId : isBranchRole ? null : null,
    branchId: isBranchRole ? userBranchId : null,
    page: pagination.pageIndex + 1, // Convert to 1-based for API
    limit: pagination.pageSize,
  });

  // Form hooks
  const addForm = useDriverForm(undefined, normalizedRole, isSuperAdmin, isSchoolRole, isBranchRole, userBranchId);
  const editForm = useDriverForm(editTarget || undefined, normalizedRole, isSuperAdmin, isSchoolRole, isBranchRole, userBranchId);

  // FIXED: Set filtered data and pagination info correctly
  useEffect(() => {
    if (driversData) {
      setFilteredData(driversData.drivers || []);
      setTotalRecords(driversData.total || 0);
      console.log("Drivers data set:", driversData.drivers?.length, "total:", driversData.total);
    }
  }, [driversData]);

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

  // Helper function to get ID from object or string
  const getIdHelper = useCallback((obj: any): string => {
    if (!obj) return "";
    if (typeof obj === "string") return obj;
    return obj._id || "";
  }, []);

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

  // Device data for add dialog
  const addDeviceQuery = useInfiniteDeviceData({
    role: normalizedRole as any,
    schoolId: isSuperAdmin 
      ? addForm.school || undefined 
      : isSchoolRole 
      ? userSchoolId || undefined
      : isBranchRole
      ? userSchoolId || undefined
      : undefined,
    branchId: isSuperAdmin 
      ? addForm.branch || undefined 
      : isSchoolRole 
      ? addForm.branch || undefined 
      : isBranchRole
      ? userBranchId || undefined
      : undefined,
    search: addForm.deviceSearch,
    limit: 20,
  });

  // Device data for edit dialog
  const editDeviceQuery = useInfiniteDeviceData({
    role: normalizedRole as any,
    schoolId: isSuperAdmin 
      ? editForm.school || undefined 
      : isSchoolRole 
      ? userSchoolId || undefined
      : isBranchRole
      ? userSchoolId || undefined
      : undefined,
    branchId: isSuperAdmin 
      ? editForm.branch || undefined 
      : isSchoolRole 
      ? editForm.branch || undefined 
      : isBranchRole
      ? userBranchId || undefined
      : undefined,
    search: editForm.deviceSearch,
    limit: 20,
  });

  const getDeviceItems = useCallback((deviceData: any) => {
    if (!deviceData?.pages?.length) return [];
    return deviceData.pages.flatMap((pg: any) => {
      const list = pg.devices ?? pg.data ?? [];
      return list.filter((d: any) => d._id && d.name).map((d: any) => ({ label: d.name, value: d._id }));
    });
  }, []);

  // Mutations
  const approveMutation = useMutation({
    mutationFn: async (driver: { _id: string; isApproved: "Approved" | "Rejected" }) => 
      await api.post(`/driver/approve/${driver._id}`, { isApproved: driver.isApproved }),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ["drivers"] });
      const previousDrivers = queryClient.getQueryData<any>(["drivers"]);

      queryClient.setQueryData<any>(["drivers"], (old) => {
        if (!old) return old;
        return {
          ...old,
          drivers: old.drivers?.map((d: Driver) => 
            d._id === variables._id 
              ? { ...d, isApproved: variables.isApproved }
              : d
          ) || []
        };
      });

      setFilteredData(prev => 
        prev.map(d => 
          d._id === variables._id 
            ? { ...d, isApproved: variables.isApproved }
            : d
        )
      );

      return { previousDrivers };
    },
    onError: (err, variables, context) => {
      if (context?.previousDrivers) {
        queryClient.setQueryData(["drivers"], context.previousDrivers);
        setFilteredData(context.previousDrivers?.drivers || []);
      }
      alert("Failed to update driver status.");
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      alert(`Driver ${variables.isApproved.toLowerCase()} successfully.`);
    },
  });

  const addDriverMutation = useMutation({
    mutationFn: async (newDriver: any) => await api.post("/driver", newDriver),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      alert("Driver added successfully.");
      setAddDialogOpen(false);
      addForm.resetForm();
      if (closeButtonRef.current) {
        closeButtonRef.current.click();
      }
    },
    onError: (error: any) => alert(`Failed to add driver: ${error.response?.data?.message || error.message}`),
  });

  // Update driver mutation
  const updateDriverMutation = useMutation({
    mutationFn: async ({ driverId, data }: { driverId: string; data: Partial<Driver> }) => {
      if (data.username && editTarget && data.username === editTarget.username) {
        const { username, ...dataWithoutUsername } = data;
        return await api.put(`/driver/${driverId}`, dataWithoutUsername);
      }
      return await api.put(`/driver/${driverId}`, data);
    },
    onSuccess: (updatedDriver, variables) => {
      queryClient.setQueryData<any>(["drivers"], (old) => {
        if (!old) return old;
        return {
          ...old,
          drivers: old.drivers?.map((d: Driver) => 
            d._id === variables.driverId 
              ? { ...d, ...variables.data }
              : d
          ) || []
        };
      });
      setFilteredData(prev => 
        prev.map(d => 
          d._id === variables.driverId 
            ? { ...d, ...variables.data }
            : d
        )
      );
      setEditDialogOpen(false);
      setEditTarget(null);
      editForm.resetForm();
      alert("Driver updated successfully.");
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message;
      alert(msg.includes("username") ? "Username may already be taken." : `Failed to update driver: ${msg}`);
    },
  });

  const deleteDriverMutation = useMutation({
    mutationFn: async (driverId: string) => await api.delete(`/driver/${driverId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      setFilteredData(prev => prev.filter(d => d._id !== deleteTarget?._id));
      setDeleteTarget(null);
      alert("Driver deleted successfully.");
    },
    onError: () => alert("Failed to delete driver."),
  });

  // Event handlers
  const handleStatusChange = useCallback((driver: Driver, newStatus: "Approved" | "Rejected") => {
    if (!driver._id) return;
    approveMutation.mutate({ 
      _id: driver._id, 
      isApproved: newStatus 
    });
  }, [approveMutation]);

  const handleEditSave = useCallback((updatedData: Partial<Driver>) => {
    if (!editTarget) return;

    const changedFields: Partial<Driver> = {};
    const flatTarget = {
      ...editTarget,
      schoolId: editTarget.schoolId?._id || editTarget.schoolId,
      branchId: editTarget.branchId?._id || editTarget.branchId,
      deviceObjId: editTarget.deviceObjId?._id || editTarget.deviceObjId,
    };

    for (const key in updatedData) {
      const newVal = updatedData[key as keyof Driver];
      const oldVal = flatTarget[key as keyof Driver];
      if (newVal !== undefined && newVal !== oldVal) {
        if (key === 'username' && newVal === editTarget.username) continue;
        changedFields[key as keyof Driver] = newVal;
      }
    }

    if (Object.keys(changedFields).length === 0) {
      alert("No changes detected.");
      return;
    }

    updateDriverMutation.mutate({ driverId: editTarget._id, data: changedFields });
  }, [editTarget, updateDriverMutation]);

  // FIXED: Handle pagination change for server-side
  const handlePaginationChange = useCallback((newPagination: PaginationState) => {
    setPagination(newPagination);
  }, []);

  // FIXED: Handle sorting change
  const handleSortingChange = useCallback((newSorting: SortingState) => {
    setSorting(newSorting);
    // You can implement server-side sorting here if needed
  }, []);

  // Table columns
  const columns: ColumnDef<Driver>[] = useMemo(() => [
    {
      header: "Driver Name",
      accessorFn: (row) => row.driverName ?? "",
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
      header: "Device Name",
      accessorFn: (row) => row.deviceObjId?.name ?? "--",
      meta: { 
        flex: 1, 
        minWidth: 200, 
        maxWidth: 300,
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
      accessorFn: (row) => row.isApproved ?? "Pending",
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
          currentStatus={row.original.isApproved || "Pending"}
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
            className="cursor-pointer bg-yellow-400 hover:bg-yellow-500 text-[#733e0a] font-semibold py-1.5 px-4 rounded-md text-sm"
            disabled={updateDriverMutation.isPending}
          >
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteTarget(row.original)}
            disabled={deleteDriverMutation.isPending}
            className="cursor-pointer bg-yellow-400 hover:bg-yellow-500 text-red-600 font-semibold py-1.5 px-4 rounded-md text-sm"
          >
            Delete
          </Button>
        </div>
      ),
      meta: { 
        flex: 1.5, 
        minWidth: 150, 
        maxWidth: 200,
        wrapConfig: { wrap: "nowrap" }
      },
      enableSorting: false,
      enableHiding: true,
    },
  ], [isSuperAdmin, isSchoolRole, handleStatusChange, approveMutation.isPending, updateDriverMutation.isPending, deleteDriverMutation.isPending]);

  const columnsForExport = useMemo(() => [
    { key: "driverName", header: "Driver Name" },
    { key: "mobileNo", header: "Mobile" },
    { key: "username", header: "Username" },
    { key: "password", header: "Password" },
    ...(isSuperAdmin ? [{ key: "schoolId.schoolName", header: "School Name" }] : []),
    ...((isSuperAdmin || isSchoolRole) ? [{ key: "branchId.branchName", header: "Branch Name" }] : []),
    { key: "deviceObjId.name", header: "Device Name" },
    { key: "isApproved", header: "Status" },
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

  // FIXED: Use the CustomTableServerSidePagination component properly
  const { tableElement } = CustomTableServerSidePagination({
    data: filteredData,
    columns,
    pagination,
    totalCount: totalRecords,
    loading: isLoading,
    onPaginationChange: handlePaginationChange,
    onSortingChange: handleSortingChange,
    sorting,
    emptyMessage: "No drivers found",
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
            data={driversData?.drivers || []}
            displayKey={["driverName", "username", "email", "mobileNo"]}
            onResults={setFilteredData}
            className="w-[300px] mb-4"
          />
          <DateRangeFilter
            onDateRangeChange={(start, end) => {
              if (!driversData?.drivers || (!start && !end)) {
                setFilteredData(driversData?.drivers || []);
                return;
              }
              const filtered = driversData.drivers.filter(d => {
                if (!d.createdAt) return false;
                const date = new Date(d.createdAt);
                return (!start || date >= start) && (!end || date <= end);
              });
              setFilteredData(filtered);
            }}
            title="Search by Registration Date"
          />
          <CustomFilter
            data={filteredData}
            originalData={driversData?.drivers}
            filterFields={["isApproved"]}
            onFilter={setFilteredData}
            placeholder="Filter by Approval"
            valueFormatter={(v) => v ? v.toString().charAt(0).toUpperCase() + v.toString().slice(1).toLowerCase() : ""}
          />
          {/* FIX: Pass table columns instead of raw column definitions */}
          <ColumnVisibilitySelector columns={tableForVisibility.getAllLeafColumns()} />
        </section>

        <section>
          <AddDriverDialog
            addDialogOpen={addDialogOpen}
            setAddDialogOpen={setAddDialogOpen}
            addForm={addForm}
            schoolOptions={schoolOptions}
            addBranchOptions={addBranchOptions}
            addDeviceQuery={addDeviceQuery}
            addDriverMutation={addDriverMutation}
            isSuperAdmin={isSuperAdmin}
            isSchoolRole={isSchoolRole}
            isBranchRole={isBranchRole}
            userSchoolId={userSchoolId}
            userBranchId={userBranchId}
            getDeviceItems={getDeviceItems}
            closeButtonRef={closeButtonRef}
          />
        </section>
      </header>

      <section className="mb-4">
        {/* FIX: Render only the tableElement, not the entire object */}
        {tableElement}
      </section>

      {deleteTarget && (
        <Alert<Driver>
          title="Are you absolutely sure?"
          description={`This will permanently delete ${deleteTarget?.driverName} and all associated data.`}
          actionButton={(target) => {
            deleteDriverMutation.mutate(target._id);
            setDeleteTarget(null);
          }}
          target={deleteTarget}
          setTarget={setDeleteTarget}
          butttonText="Delete"
          className="max-w-md w-full"
        />
      )}

      <EditDriverDialog
        editTarget={editTarget}
        editDialogOpen={editDialogOpen}
        setEditDialogOpen={setEditDialogOpen}
        setEditTarget={setEditTarget}
        editForm={editForm}
        schoolOptions={schoolOptions}
        editBranchOptions={editBranchOptions}
        editDeviceQuery={editDeviceQuery}
        updateDriverMutation={updateDriverMutation}
        isSuperAdmin={isSuperAdmin}
        isSchoolRole={isSchoolRole}
        isBranchRole={isBranchRole}
        userSchoolId={userSchoolId}
        userBranchId={userBranchId}
        handleEditSave={handleEditSave}
        getDeviceItems={getDeviceItems}
      />

      <FloatingMenu
        onExportPdf={() => exportToPDF(filteredData, columnsForExport, {
          title: "Driver Master Report",
          companyName: "Parents Eye",
          metadata: { Total: `${filteredData.length} drivers` },
        })}
        onExportExcel={() => exportToExcel(filteredData, columnsForExport, {
          title: "Driver Master Report",
          companyName: "Parents Eye",
          metadata: { Total: `${filteredData.length} drivers` },
        })}
      />
    </main>
  );
}