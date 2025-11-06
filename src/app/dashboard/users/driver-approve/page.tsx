"use client";

import React, { useCallback, useEffect, useState, useRef, useMemo } from "react";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CustomTable, CellContent } from "@/components/ui/CustomTable";
import SearchComponent from "@/components/ui/SearchOnlydata";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import DateRangeFilter from "@/components/ui/DateRangeFilter";
import { FloatingMenu } from "@/components/floatingMenu";
import { getCoreRowModel, useReactTable, VisibilityState, type ColumnDef } from "@tanstack/react-table";
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

interface SelectOption {
  label: string;
  value: string;
}

// Status Dropdown Component
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        className={`px-3 py-1 border rounded-full text-sm font-medium ${getStatusColor(currentStatus)} ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'
        }`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        {currentStatus || "Pending"}
      </button>
      
      {isOpen && !disabled && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[120px]">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                currentStatus === option.value ? 'bg-blue-50 text-blue-600' : ''
              }`}
              onClick={() => handleStatusSelect(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
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
  role,
  isSuperAdmin,
  isSchoolRole,
  isBranchRole,
  userSchoolId,
  userBranchId,
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

// Custom hook for form state management
const useDriverForm = (initialData?: Driver, role?: string, isSuperAdmin?: boolean, isSchoolRole?: boolean) => {
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
      setDevice(initialData.deviceObjId?._id || initialData.deviceObjId || "");
    }
  }, [initialData, isSuperAdmin, isSchoolRole]);

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

// Edit Driver Dialog Component - MOVED OUTSIDE MAIN COMPONENT
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
  userSchoolIdForBranch,
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
      updatedData.schoolId = userSchoolId;  // Use userSchoolId directly
      updatedData.branchId = userBranchId;  // Use userBranchId directly
    }

    handleEditSave(updatedData);
  };

  if (!editTarget) return null;

  return (
    <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
      <DialogContent className="sm:max-w-[600px]">
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
            role=""
            isSuperAdmin={isSuperAdmin}
            isSchoolRole={isSchoolRole}
            isBranchRole={isBranchRole}
            userSchoolId={userSchoolId}
            userBranchId={userBranchId}
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

// Add Driver Dialog Component - MOVED OUTSIDE MAIN COMPONENT
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
  userSchoolIdForBranch,
  handleSubmit,
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
      data.schoolId = userSchoolId;  // Use userSchoolId directly
      data.branchId = userBranchId;  // Use userBranchId directly
    }

    console.log("Submitting driver data:", data);

    await addDriverMutation.mutateAsync(data);
  };
  return (
    <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="default">Add Driver</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
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
            role=""
            isSuperAdmin={isSuperAdmin}
            isSchoolRole={isSchoolRole}
            isBranchRole={isBranchRole}
            userSchoolId={userSchoolId}
            userBranchId={userBranchId}
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
  const [userSchoolName, setUserSchoolName] = useState<string | null>(null);


  useEffect(() => {
    
    console.log("[School Id]: ", userSchoolId);
  }, [userSchoolId]);

  // Role checks - MOVED BEFORE HOOK CALLS
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
        console.log("[Decoded Token]: ", decoded);
        
        const role = (decoded?.role || "").toLowerCase();
        setRole(role);

        // Handle schoolId based on role
        if (role === "school" || role === "schooladmin") {
          // For school role, use 'id' field from token
          setUserSchoolId(decoded?.id || null);
          console.log("[School Role] Using schoolId from 'id' field:", decoded?.id);
        } else if (role === "branch" || role === "branchadmin") {
          // For branch role, use 'schoolId' field from token
          setUserSchoolId(decoded?.schoolId || null);
          console.log("[Branch Role] Using schoolId from 'schoolId' field:", decoded?.schoolId);
        } else {
          // For superadmin or other roles, use schoolId if available
          setUserSchoolId(decoded?.schoolId || null);
          console.log("[Other Role] Using schoolId from 'schoolId' field:", decoded?.schoolId);
        }

        // Handle branchId - for branch role, use 'id' field as branchId
        if (role === "branch" || role === "branchadmin") {
          setUserBranchId(decoded?.id || null);
          console.log("[Branch Role] Using branchId from 'id' field:", decoded?.id);
        } else {
          setUserBranchId(decoded?.branchId || null);
          console.log("[Other Role] Using branchId from 'branchId' field:", decoded?.branchId);
        }
        
        // Handle schoolName
        setUserSchoolName(decoded?.schoolName || null);

        console.log("[Final User Info]:", {
          role,
          userSchoolId,
          userBranchId,
          userSchoolName
        });
      }
    }, []);


  // Data hooks - MOVED AFTER STATE DECLARATIONS
  const { data: schoolData } = useSchoolData({
    enabled: isSuperAdmin
  });

  const { data: branchData, isLoading: branchLoading } = useBranchData();

  // Form hooks - MOVED AFTER ALL USE STATE DECLARATIONS
  const addForm = useDriverForm(undefined, normalizedRole, isSuperAdmin, isSchoolRole);
  const editForm = useDriverForm(editTarget || undefined, normalizedRole, isSuperAdmin, isSchoolRole);

  // Get drivers based on role
  const { data: drivers, isLoading } = useQuery<Driver[]>({
    queryKey: ["drivers", normalizedRole, userSchoolId, userBranchId],
    queryFn: async () => {
      let url = "/driver";
      if (isSchoolRole && userSchoolId) {
        url += `?schoolId=${userSchoolId}`;
      } else if (isBranchRole && userBranchId) {
        url += `?branchId=${userBranchId}`;
      }
      return await api.get<Driver[]>(url);
    },
    enabled: !!normalizedRole,
  });

  // Set initial values for forms based on role
  useEffect(() => {
    if (isSchoolRole && userSchoolId) {
      addForm.setSchool(userSchoolId);
    }
    if (isBranchRole && userBranchId) {
      addForm.setBranch(userBranchId);
    }
  }, [isSchoolRole, isBranchRole, userSchoolId, userBranchId, addForm]);

  // Get schoolId for branch role from branchData
  const userSchoolIdForBranch = useMemo(() => {
    if (isBranchRole && userBranchId && branchData) {
      const userBranch = branchData.find(b => b._id === userBranchId);
      console.log("[userSchoolIdForBranch] Found branch:", userBranch);
      console.log("[userSchoolIdForBranch] Result:", userBranch?.schoolId?._id || userBranch?.schoolId || null);
      return userBranch?.schoolId?._id || userBranch?.schoolId || null;
    }
    return null;
  }, [isBranchRole, userBranchId, branchData]);

  // Device data for add dialog - Proper schoolId handling for school role
  const addDeviceQuery = useInfiniteDeviceData({
    role: normalizedRole as any,
    schoolId: isSuperAdmin 
      ? addForm.school || undefined 
      : isSchoolRole 
      ? userSchoolId || undefined
      : isBranchRole
      ? userSchoolId || undefined  // Use userSchoolId directly for branch role
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

  // Device data for edit dialog - Proper schoolId handling for school role
  const editDeviceQuery = useInfiniteDeviceData({
    role: normalizedRole as any,
    schoolId: isSuperAdmin 
      ? editForm.school || undefined 
      : isSchoolRole 
      ? userSchoolId || undefined
      : isBranchRole
      ? userSchoolId || undefined  // Use userSchoolId directly for branch role
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

  // Helper function to get ID from object or string
  const getId = useCallback((obj: any): string => {
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

  // Branch options for all roles
  const getFilteredBranchOptions = useCallback((schoolId: string) => {
    if (!branchData) return [];
    let filteredBranches = branchData;
    
    if (isSchoolRole && userSchoolId) {
      filteredBranches = branchData.filter(branch => getId(branch.schoolId) === userSchoolId);
    } else if (isBranchRole && userBranchId) {
      filteredBranches = branchData.filter(branch => branch._id === userBranchId);
    } else if (isSuperAdmin && schoolId) {
      filteredBranches = branchData.filter(branch => getId(branch.schoolId) === schoolId);
    }
    
    return filteredBranches.filter(branch => branch._id && branch.branchName).map(branch => ({
      label: branch.branchName, value: branch._id
    }));
  }, [branchData, isSuperAdmin, isSchoolRole, isBranchRole, userSchoolId, userBranchId, getId]);

  const addBranchOptions = useMemo(() => 
    getFilteredBranchOptions(addForm.school), 
    [getFilteredBranchOptions, addForm.school]
  );

  const editBranchOptions = useMemo(() => 
    getFilteredBranchOptions(editForm.school), 
    [getFilteredBranchOptions, editForm.school]
  );

  const getDeviceItems = useCallback((deviceData: any) => {
    if (!deviceData?.pages?.length) return [];
    return deviceData.pages.flatMap((pg: any) => {
      const list = pg.devices ?? pg.data ?? [];
      return list.filter((d: any) => d._id && d.name).map((d: any) => ({ label: d.name, value: d._id }));
    });
  }, []);

  // Set filtered data
  useEffect(() => {
    if (drivers) {
      setFilteredData(drivers);
    }
  }, [drivers]);

  // Auto-select first branch for school role if not selected yet
  useEffect(() => {
    if (isSchoolRole && addBranchOptions.length > 0 && !addForm.branch && !branchLoading) {
      addForm.setBranch(addBranchOptions[0].value);
    }
  }, [isSchoolRole, addBranchOptions, addForm, branchLoading]);

  // Approve/reject mutation
  const approveMutation = useMutation({
    mutationFn: async (driver: { _id: string; isApproved: "Approved" | "Rejected" }) => 
      await api.post(`/driver/approve/${driver._id}`, { isApproved: driver.isApproved }),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ["drivers"] });
      const previousDrivers = queryClient.getQueryData<Driver[]>(["drivers"]);

      queryClient.setQueryData<Driver[]>(["drivers"], (old) =>
        old?.map(d => 
          d._id === variables._id 
            ? { ...d, isApproved: variables.isApproved }
            : d
        ) || []
      );

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
        setFilteredData(context.previousDrivers);
      }
      alert("Failed to update driver status.");
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      alert(`Driver ${variables.isApproved.toLowerCase()} successfully.`);
    },
  });

  // Mutations
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
      queryClient.setQueryData<Driver[]>(["drivers"], (old) =>
        old?.map(d => 
          d._id === variables.driverId 
            ? { ...d, ...variables.data }
            : d
        ) || []
      );
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

  // Handle status change with dropdown
  const handleStatusChange = useCallback((driver: Driver, newStatus: "Approved" | "Rejected") => {
    if (!driver._id) return;
    
    approveMutation.mutate({ 
      _id: driver._id, 
      isApproved: newStatus 
    });
  }, [approveMutation]);

  // Handle edit save
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

  // Handle form submission
  const handleSubmit = useCallback(async (data: any) => {
    await addDriverMutation.mutateAsync(data);
  }, [addDriverMutation]);

  // Table columns with proper cell rendering
  const columns: ColumnDef<Driver, CellContent>[] = useMemo(() => [
    {
      header: "Driver Name",
      accessorFn: (row) => ({ type: "text", value: row.driverName ?? "" }),
      meta: { flex: 1, minWidth: 200, maxWidth: 300 },
      enableHiding: true,
    },
    ...(isSuperAdmin ? [{
      header: "School Name",
      accessorFn: (row) => ({ type: "text", value: row.schoolId?.schoolName ?? "--" }),
      meta: { flex: 1, minWidth: 200, maxWidth: 300 },
      enableHiding: true,
    }] : []),
    ...((isSuperAdmin || isSchoolRole) ? [{
      header: "Branch Name",
      accessorFn: (row) => ({ type: "text", value: row.branchId?.branchName ?? "--" }),
      meta: { flex: 1, minWidth: 200, maxWidth: 300 },
      enableHiding: true,
    }] : []),
    {
      header: "Device Name",
      accessorFn: (row) => ({ type: "text", value: row.deviceObjId?.name ?? "--" }),
      meta: { flex: 1, minWidth: 200, maxWidth: 300 },
      enableHiding: true,
    },
    {
      header: "Mobile",
      accessorFn: (row) => ({ type: "text", value: row.mobileNo ?? "" }),
      meta: { flex: 1, minWidth: 150, maxWidth: 300 },
      enableHiding: true,
    },
    {
      header: "Username",
      accessorFn: (row) => ({ type: "text", value: row.username ?? "" }),
      meta: { flex: 1, minWidth: 150, maxWidth: 300 },
      enableHiding: true,
    },
    {
      header: "Password",
      accessorFn: (row) => ({ type: "text", value: row.password ?? "" }),
      meta: { flex: 1, minWidth: 150, maxWidth: 300 },
      enableHiding: true,
    },
    {
      header: "Registration Date",
      accessorFn: (row) => ({ type: "text", value: formatDate(row.createdAt) ?? "" }),
      meta: { flex: 1, minWidth: 200 },
      enableHiding: true,
    },
    {
      header: "Status",
      accessorFn: (row) => ({ 
        type: "text", 
        value: row.isApproved ?? "Pending",
        className: row.isApproved === "Approved" ? "text-green-600 font-semibold" : 
                  row.isApproved === "Rejected" ? "text-red-600 font-semibold" : 
                  "text-yellow-600 font-semibold"
      }),
      meta: { flex: 1, minWidth: 120, maxWidth: 150 },
      enableHiding: true,
    },
    {
      header: "Approve/Reject",
      accessorFn: (row) => ({
        type: "custom",
        render: () => (
          <StatusDropdown
            currentStatus={row.isApproved || "Pending"}
            onStatusChange={(status) => handleStatusChange(row, status)}
            disabled={approveMutation.isPending}
          />
        ),
      }),
      meta: { flex: 1, minWidth: 150, maxWidth: 200 },
      enableSorting: false,
      enableHiding: true,
    },
    {
      header: "Action",
      accessorFn: (row) => ({
        type: "group",
        items: [
          {
            type: "button",
            label: "Edit",
            onClick: () => {
              setEditTarget(row);
              setEditDialogOpen(true);
            },
            className: "cursor-pointer",
            disabled: updateDriverMutation.isPending,
          },
          {
            type: "button",
            label: "Delete",
            onClick: () => setDeleteTarget(row),
            className: "text-red-600 cursor-pointer",
            disabled: deleteDriverMutation.isPending,
          },
        ],
      }),
      meta: { flex: 1.5, minWidth: 150, maxWidth: 200 },
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

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { columnVisibility },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <main>
      <ResponseLoader isLoading={isLoading || branchLoading} />

      <header className="flex items-center justify-between mb-4">
        <section className="flex space-x-4">
          <SearchComponent
            data={drivers || []}
            displayKey={["driverName", "username", "email", "mobileNo"]}
            onResults={setFilteredData}
            className="w-[300px] mb-4"
          />
          <DateRangeFilter
            onDateRangeChange={(start, end) => {
              if (!drivers || (!start && !end)) {
                setFilteredData(drivers || []);
                return;
              }
              const filtered = drivers.filter(d => {
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
            originalData={drivers}
            filterFields={["isApproved"]}
            onFilter={setFilteredData}
            placeholder="Filter by Approval"
            valueFormatter={(v) => v ? v.toString().charAt(0).toUpperCase() + v.toString().slice(1).toLowerCase() : ""}
          />
          <ColumnVisibilitySelector columns={table.getAllColumns()} />
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
            userSchoolIdForBranch={userSchoolIdForBranch}
            handleSubmit={handleSubmit}
            getDeviceItems={getDeviceItems}
            closeButtonRef={closeButtonRef}
          />
        </section>
      </header>

      <section className="mb-4">
        <CustomTable
          data={filteredData}
          columns={columns}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
          pageSizeArray={[10, 20, 50]}
          maxHeight={600}
          minHeight={200}
          showSerialNumber={true}
          noDataMessage="No drivers found"
          isLoading={isLoading}
        />
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
        userSchoolIdForBranch={userSchoolIdForBranch}
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