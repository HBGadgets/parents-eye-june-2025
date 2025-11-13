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
import { useSchoolData } from "@/hooks/useSchoolData";
import { branch } from "@/interface/modal";
import { useExport } from "@/hooks/useExport";
import { formatDate } from "@/util/formatDate";
import { Alert } from "@/components/Alert";
import ResponseLoader from "@/components/ResponseLoader";
import { CustomFilter } from "@/components/ui/CustomFilter";
import { ColumnVisibilitySelector } from "@/components/column-visibility-selector";
import { DatePicker } from "@/components/ui/datePicker";
import Cookies from "js-cookie";

type branchAccess = {
  _id: string;
  branchName: string;
  fullAccess: boolean;
};
interface SchoolMinimal {
  _id: string;
  schoolName: string;
}

// Interface for decoded token
interface DecodedToken {
  userId: string;
  role: string;
  schoolId?: string;
  branchId?: string;
  id?: string;
  schoolName?: string;
  [key: string]: any;
}

// Helper function to decode JWT token
const getDecodedToken = (token: string): DecodedToken | null => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

// Helper function to get token from storage
const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return Cookies.get("token") || localStorage.getItem('token') || sessionStorage.getItem('token');
  }
  return null;
};

// Custom Branch Edit Dialog Component
const BranchEditDialog = ({ 
  data, 
  isOpen, 
  onClose, 
  onSave, 
  schoolOptions,
  isVerified,
  onVerificationRequired,
  isSuperAdmin,
  isSchoolRole,
  updatebranchMutation
}: {
  data: any;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  schoolOptions: { label: string; value: string }[];
  isVerified: boolean;
  onVerificationRequired: (field: string) => void;
  isSuperAdmin: boolean;
  isSchoolRole: boolean;
  updatebranchMutation: any;
}) => {
  const [formData, setFormData] = useState(data);
  const [expirationDate, setExpirationDate] = useState<Date | null>(
    data.subscriptionExpirationDate ? new Date(data.subscriptionExpirationDate) : null
  );

  useEffect(() => {
    setFormData(data);
    setExpirationDate(data.subscriptionExpirationDate ? new Date(data.subscriptionExpirationDate) : null);
  }, [data]);

  const handleSave = () => {
    const updatedData = {
      ...formData,
      subscriptionExpirationDate: expirationDate ? expirationDate.toISOString().split('T')[0] : null
    };
    onSave(updatedData);
  };

  const handleFieldChange = (key: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleDateFocus = () => {
    if (!isVerified) {
      onVerificationRequired("subscriptionExpirationDate");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Branch</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Branch Name */}
            <div className="grid gap-2">
              <Label htmlFor="edit-branchName">Branch Name *</Label>
              <Input
                id="edit-branchName"
                value={formData.branchName || ""}
                onChange={(e) => handleFieldChange("branchName", e.target.value)}
                required
              />
            </div>

            {/* School Name (for superadmin only) */}
            {isSuperAdmin && (
              <div className="grid gap-2">
                <Label htmlFor="edit-schoolId">School *</Label>
                <Combobox 
                  items={schoolOptions} 
                  value={formData.schoolId} 
                  onValueChange={(value) => handleFieldChange("schoolId", value)}
                  placeholder="Select school..." 
                  width="w-full"
                />
              </div>
            )}

            {/* Mobile Number */}
            <div className="grid gap-2">
              <Label htmlFor="edit-mobileNo">Mobile Number *</Label>
              <Input
                id="edit-mobileNo"
                value={formData.mobileNo || ""}
                onChange={(e) => handleFieldChange("mobileNo", e.target.value)}
                required
              />
            </div>

            {/* Email */}
            <div className="grid gap-2">
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email || ""}
                onChange={(e) => handleFieldChange("email", e.target.value)}
                required
              />
            </div>

            {/* Username */}
            <div className="grid gap-2">
              <Label htmlFor="edit-username">Username *</Label>
              <Input
                id="edit-username"
                value={formData.username || ""}
                onChange={(e) => handleFieldChange("username", e.target.value)}
                required
              />
            </div>

            {/* Password */}
            <div className="grid gap-2">
              <Label htmlFor="edit-password">Password *</Label>
              <Input
                id="edit-password"
                value={formData.password || ""}
                onChange={(e) => handleFieldChange("password", e.target.value)}
                required
              />
            </div>

            {/* Expiration Date */}
            {(isSuperAdmin || isSchoolRole) && (
              <div className="grid gap-2">
                <Label htmlFor="edit-expirationDate">Expiration Date</Label>
                <DatePicker
                  selected={expirationDate}
                  onChange={setExpirationDate}
                  onFocus={handleDateFocus}
                  placeholderText="Select expiration date"
                  className="w-full"
                  disabled={!isVerified}
                />
              </div>
            )}

            {/* Full Access Checkbox */}
            {(isSuperAdmin || isSchoolRole) && (
              <div className="flex items-center gap-3 mt-2">
                <input
                  type="checkbox"
                  id="edit-fullAccess"
                  checked={formData.fullAccess || false}
                  onChange={(e) => handleFieldChange("fullAccess", e.target.checked)}
                  className="h-5 w-5"
                />
                <Label htmlFor="edit-fullAccess">Full Access</Label>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updatebranchMutation.isPending}>
            {updatebranchMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default function BranchMaster() {
  const queryClient = useQueryClient();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [filteredData, setFilteredData] = useState<branch[]>([]);
  const [filterResults, setFilterResults] = useState<branch[]>([]);
  const [accessTarget, setAccessTarget] = useState<branch | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<branch | null>(null);
  const [editTarget, setEditTarget] = useState<branch | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const { exportToPDF, exportToExcel } = useExport();
  const { data: schoolData } = useSchoolData();
  const [school, setSchool] = useState<string>("");
  const [schoolSearch, setSchoolSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isVerificationDialogOpen, setIsVerificationDialogOpen] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [currentProtectedField, setCurrentProtectedField] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [userSchoolId, setUserSchoolId] = useState<string | null>(null);
  const [userBranchId, setUserBranchId] = useState<string | null>(null);
  const [userSchoolName, setUserSchoolName] = useState<string | null>(null);


  // Get user info from token
  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      const decoded = getDecodedToken(token);
      console.log("[Branch Master - Decoded Token]: ", decoded);
      
      const role = (decoded?.role || "").toLowerCase();
      setRole(role);

      // Handle schoolId based on role 
      if (role === "school" || role === "schooladmin" /* || role === "branchgroup" */) {
        // For school and branchGroup roles, use 'id' field from token as schoolId
        setUserSchoolId(decoded?.id || null);
        console.log(`[${role} Role] Using schoolId from 'id' field:`, decoded?.id);
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

      console.log("[Branch Master - Final User Info]:", {
        role,
        userSchoolId: decoded?.id || decoded?.schoolId,
        userBranchId,
        userSchoolName
      });
    }
  }, []);

  const normalizedRole = useMemo(() => {
    const r = (role || "").toLowerCase();
    if (["superadmin", "super_admin", "admin", "root"].includes(r)) return "superAdmin";
    if (["school", "schooladmin"].includes(r)) return "school";
    if (["branch", "branchadmin"].includes(r)) return "branch";
    // if (["branchgroup"].includes(r)) return "branchGroup"; 
    return undefined;
  }, [role]);

  const isSuperAdmin = normalizedRole === "superAdmin";
  const isSchoolRole = normalizedRole === "school";
  const isBranchRole = normalizedRole === "branch";
  // const isBranchGroup = normalizedRole === "branchGroup"; 
  // Fetch branch data with role-based filtering
  const {
    data: branchs,
    isLoading,
    isError,
    error,
  } = useQuery<branch[]>({
    queryKey: ["branchs"],
    queryFn: async () => {
      const res = await api.get<branch[]>("/branch");
      return res;
    },
  });

  // Filter branches based on user role
  const filteredBranches = useMemo(() => {
    if (!branchs) return [];
    
    if (isSchoolRole && userSchoolId) {
      return branchs.filter((branch) => branch.schoolId._id === userSchoolId);
    } else if (isBranchRole && userBranchId) {
      // For branch role, they should only see their own branch
      return branchs.filter((branch) => branch._id === userBranchId);
    }
    return branchs;
  }, [branchs, isSchoolRole, isBranchRole, userSchoolId, userBranchId]);

  // School data - Convert to Combobox format with role-based filtering
  const schoolOptions = useMemo(() => {
    if (!schoolData) return [];
    
    let filteredSchools = schoolData;
    
    // Filter schools based on role
    if ((isSchoolRole /* || isBranchGroup */) && userSchoolId) {
      filteredSchools = schoolData.filter(s => s._id === userSchoolId);
    } else if (isBranchRole && userSchoolId) {
      filteredSchools = schoolData.filter(s => s._id === userSchoolId);
    }
    
    return filteredSchools.filter((s) => s._id && s.schoolName)
      .map((s) => ({ 
        label: s.schoolName, 
        value: s._id 
      }));
  }, [schoolData, isSchoolRole, isBranchRole, /* isBranchGroup, */ userSchoolId]);

  // Set default school for school, branch, and branch group roles
  useEffect(() => {
    if ((isSchoolRole || isBranchRole /* || isBranchGroup */) && userSchoolId && !school) {
      setSchool(userSchoolId);
      console.log("[Branch Master - Setting Default School]:", {
        role: normalizedRole,
        userSchoolId,
        // isBranchGroup
      });
    }
  }, [isSchoolRole, isBranchRole, /* isBranchGroup, */ userSchoolId, school]);

  useEffect(() => {
    if (filteredBranches && filteredBranches.length > 0) {
      setFilteredData(filteredBranches);
      setFilterResults(filteredBranches);
    } else {
      setFilteredData([]);
      setFilterResults([]);
    }
  }, [filteredBranches]);

  // Define the columns for the table
  const columns: ColumnDef<branch, CellContent>[] = [
    {
      header: "Branch Name",
      accessorFn: (row) => ({
        type: "text",
        value: row.branchName ?? "",
      }),
      meta: { flex: 1, minWidth: 200, maxWidth: 320 },
      enableHiding: true,
    },
    ...(isSuperAdmin ? [{
      header: "School Name",
      accessorFn: (row) => ({
        type: "text",
        value: row.schoolId.schoolName ?? "",
      }),
      meta: { flex: 1, minWidth: 200, maxWidth: 300 },
      enableHiding: true,
    }] : []),
    {
      header: "Mobile",
      accessorFn: (row) => ({
        type: "text",
        value: row.mobileNo ?? "",
      }),
      meta: { flex: 1, minWidth: 150, maxWidth: 300 },
      enableHiding: true,
    },
    {
      header: "Username",
      accessorFn: (row) => ({
        type: "text",
        value: row.username ?? "",
      }),
      meta: { flex: 1, minWidth: 150, maxWidth: 300 },
      enableHiding: true,
    },
    {
      header: "Password",
      accessorFn: (row) => ({
        type: "text",
        value: row.password ?? "",
      }),
      meta: { flex: 1, minWidth: 150, maxWidth: 300 },
      enableHiding: true,
    },
    {
      header: "Registration Date",
      accessorFn: (row) => ({
        type: "text",
        value: formatDate(row.createdAt) ?? "",
      }),
      meta: { flex: 1, minWidth: 150, maxWidth: 300 },
      enableHiding: true,
    },
    {
      header: "Expiration Date",
      accessorFn: (row) => ({
        type: "text",
        value: row.subscriptionExpirationDate
          ? formatDate(row.subscriptionExpirationDate)
          : "---",
      }),
      meta: { flex: 1, minWidth: 150, maxWidth: 300 },
      enableHiding: true,
    },
    ...((isSuperAdmin || isSchoolRole) ? [{
      header: "Access",
      accessorFn: (row) => ({
        type: "group",
        items: [
          {
            type: "button",
            label: row.fullAccess
              ? "Grant Limited Access"
              : "Grant Full Access",
            onClick: () => setAccessTarget(row),
            disabled: accessMutation.isPending,
            className: `w-38 text-center text-sm bg-yellow-400 hover:bg-yellow-500 font-semibold rounded-full px-4 py-2 ${
              row.fullAccess ? "text-red-600" : "text-emerald-600"
            }`,
          },
        ],
      }),
      meta: { flex: 1.5, minWidth: 230},
      enableSorting: false,
      enableHiding: true,
    }] : []),
    {
      header: "Action",
      accessorFn: (row) => ({
        type: "group",
        items: [
          {
            type: "button",
            label: "Edit",
            className:
              "bg-yellow-400 hover:bg-yellow-500 text-[#733e0a] font-semibold py-1 px-3 rounded-md cursor-pointer transition-colors duration-200",
            onClick: () => {
              setEditTarget(row);
              setEditDialogOpen(true);
            },
            disabled: accessMutation.isPending,
          },
          ...((isSuperAdmin || isSchoolRole)
            ? [
                {
                  type: "button",
                  label: "Delete",
                  className:
                    "bg-yellow-400 hover:bg-yellow-500 text-red-600 font-semibold py-1 px-3 rounded-md cursor-pointer transition-colors duration-200",
                  onClick: () => setDeleteTarget(row),
                  disabled: deletebranchMutation.isPending,
                },
              ]
            : []),
        ],
      }),
      meta: { 
        flex: 1.5, 
        minWidth: 200,  // ← Set fixed min width
        maxWidth: 200,  // ← Set fixed max width
        width: 200      // ← Add explicit width
      },
      enableSorting: false,
      enableHiding: true,
    }
  ];

  // Columns for export
  const columnsForExport = [
    { key: "branchName", header: "Branch Name" },
    ...(isSuperAdmin ? [{ key: "schoolId.schoolName", header: "School Name" }] : []),
    { key: "mobileNo", header: "Mobile" },
    { key: "email", header: "Email" },
    { key: "username", header: "branch Username" },
    { key: "password", header: "branch Password" },
    { key: "subscriptionExpirationDate", header: "Expiration Date" },
    { key: "createdAt", header: "Registration Date" },
    ...((isSuperAdmin || isSchoolRole) ? [{
      key: "fullAccess",
      header: "Access Level",
      formatter: (val: boolean) => (val ? "Full Access" : "Limited Access"),
    }] : []),
  ];

  const handleVerificationSuccess = () => {
    setIsVerified(true);
    setIsVerificationDialogOpen(false);
  };

  // Mutation to add a new branch
  const addbranchMutation = useMutation({
    mutationFn: async (newbranch: any) => {
      const branch = await api.post("/branch", newbranch);
      return branch.branch;
    },
    onSuccess: (createdbranch, variables) => {
      const school = schoolData?.find(s => s._id === variables.schoolId);
      const newBranchWithSchool: branch = {
        ...createdbranch,
        password: variables.password,
        schoolId: {
          _id: createdbranch.schoolId,
          schoolName: school?.schoolName || "Unknown School"
        }
      };

      queryClient.setQueryData<branch[]>(["branchs"], (oldbranchs = []) => {
        return [...oldbranchs, newBranchWithSchool];
      });
    },
  });

  // Mutation for Access control
  const accessMutation = useMutation({
    mutationFn: async (branch: { _id: string; fullAccess: boolean }) => {
      return await api.put(`/branch/accessgrant/${branch._id}`, {
        fullAccess: branch.fullAccess,
      });
    },
    onSuccess: (updated, variables) => {
      queryClient.setQueryData<branch[]>(["branchs"], (oldData) =>
        oldData?.map((branch) =>
          branch._id === variables._id
            ? { ...branch, fullAccess: variables.fullAccess }
            : branch
        )
      );
      alert("Access updated successfully.");
    },
    onError: (err) => {
      alert("Failed to update access.\nerror: " + err);
    },
  });

  // Mutation for edit branch data
  const updatebranchMutation = useMutation({
    mutationFn: async ({
      branchId,
      data,
    }: {
      branchId: string;
      data: Partial<branch>;
    }) => {
      return await api.put(`/branch/${branchId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branchs'] });
      setEditDialogOpen(false);
      setEditTarget(null);
      setIsVerified(false); // Reset verification state
      alert("branch updated successfully.");
    },
    onError: (err) => {
      alert("Failed to update branch.\nerror: " + err);
    },
  });

  // Mutation to delete a branch
  const deletebranchMutation = useMutation({
    mutationFn: async (branchId: string) => {
      return await api.delete(`/branch/${branchId}`);
    },
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData<branch[]>(["branchs"], (oldData) =>
        oldData?.filter((branch) => branch._id !== deletedId)
      );
      alert("branch deleted successfully.");
    },
    onError: (err) => {
      alert("Failed to delete student.\nerror: " + err);
    },
  });

  // Handle search
  const handleSearchResults = useCallback((results: branch[]) => {
    setFilteredData(results);
  }, []);

  // Handle save action for edit branch
  const handleSave = (updatedData: Partial<branch>) => {
    if (!editTarget) return;

    const changedFields: Partial<Record<keyof branch, unknown>> = {};
    const flatEditTarget = {
      ...editTarget,
      schoolId: editTarget.schoolId._id,
    };

    for (const key in updatedData) {
      const newValue = updatedData[key as keyof branch];
      const oldValue = flatEditTarget[key as keyof branch];

      if (newValue !== undefined && newValue !== oldValue) {
        changedFields[key as keyof branch] = newValue;
      }
    }

    if (Object.keys(changedFields).length === 0) {
      console.log("No changes detected.");
      return;
    }

    updatebranchMutation.mutate({
      branchId: editTarget._id,
      data: changedFields,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    
    // Role-based school selection - FIXED for branchGroup
    // let selectedSchool = school;
    
    // if (isSchoolRole || isBranchRole || isBranchGroup) {
    //   selectedSchool = userSchoolId || "";
    //   console.log("[Branch Master - School Selection]:", {
    //     role: normalizedRole,
    //     userSchoolId,
    //     selectedSchool,
    //     isBranchGroup
    //   });
    // }
    
    // Validate school selection with better error info
    if (!selectedSchool) {
      console.error("[Branch Master - School Selection Error]:", {
        role: normalizedRole,
        userSchoolId,
        // isBranchGroup,
        school,
        token: getAuthToken() ? 'present' : 'missing'
      });
      
      if (isSuperAdmin) {
        alert("Please select a school");
        return;
      } else {
        alert(`School information not found for ${normalizedRole} role. Please contact administrator.`);
        return;
      }
    }

    const formattedDate = selectedDate
      ? selectedDate.toLocaleDateString('en-CA')
      : "";

    const data = {
      branchName: form.branchName.value,
      schoolId: selectedSchool,
      mobileNo: form.branchMobile.value,
      username: form.username.value,
      password: form.password.value,
      email: form.email.value,
      subscriptionExpirationDate: formattedDate,
      fullAccess: isSuperAdmin || isSchoolRole ? form.fullAccess?.checked : false,
    };

    console.log("[Branch Master - Submitting Branch Data]:", {
      data,
      role: normalizedRole,
      userSchoolId,
      // isBranchGroup,
      selectedSchool
    });

    try {
      await addbranchMutation.mutateAsync(data);
      closeButtonRef.current?.click();
      form.reset();
      if (isSuperAdmin) {
        setSchool("");
        setSchoolSearch("");
      }
      setSelectedDate(null);
      alert("Branch added successfully.");
    } catch (err: any) {
      alert(`Failed to add branch: ${err.response?.data?.message || err.message}`);
    }
  };
  const handleDateFilter = useCallback(
    (start: Date | null, end: Date | null) => {
      if (!filteredBranches || (!start && !end)) {
        setFilteredData(filteredBranches || []);
        return;
      }

      const filtered = filteredBranches.filter((branch) => {
        if (!branch.createdAt) return false;

        const createdDate = new Date(branch.createdAt);
        return (!start || createdDate >= start) && (!end || createdDate <= end);
      });

      setFilteredData(filtered);
    },
    [filteredBranches]
  );

  const handleCustomFilter = useCallback((filtered: branch[]) => {
    setFilteredData(filtered);
  }, []);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { columnVisibility },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <main>
      <ResponseLoader isLoading={isLoading} />

      <header className="flex items-center justify-between mb-4">
        <section className="flex space-x-4">
          <SearchComponent
            data={filterResults}
            displayKey={["branchName", "username", "email", "branchMobile"]}
            onResults={handleSearchResults}
            className="w-[300px] mb-4"
          />
          <DateRangeFilter
            onDateRangeChange={handleDateFilter}
            title="Search by Registration Date"
          />
          {((isSuperAdmin || isSchoolRole)) && (
            <CustomFilter
              data={filterResults}
              originalData={filterResults}
              filterFields={["fullAccess"]}
              onFilter={handleCustomFilter}
              placeholder={"Filter by Access"}
              className="w-[180px]"
              valueFormatter={(value) =>
                value ? "Full Access" : "Limited Access"
              }
              booleanToLable={"fullAccess"}
              trueValue={"Full Access"}
              falseValue={"Limited Access"}
            />
          )}
          <ColumnVisibilitySelector
            columns={table.getAllColumns()}
            buttonVariant="outline"
            buttonSize="default"
          />
        </section>

        <section>
          {(isSuperAdmin || isSchoolRole /* || isBranchGroup */) && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="default">Add branch</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <DialogHeader>
                    <DialogTitle>Add branch</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="grid gap-2">
                      <Label htmlFor="branchName">Branch Name *</Label>
                      <Input
                        id="branchName"
                        name="branchName"
                        placeholder="Enter branch name"
                        required
                      />
                    </div>
                    
                    {/* Show School field only for superadmin */}
                    {isSuperAdmin && (
                      <div className="grid gap-2">
                        <Label htmlFor="schoolId">School *</Label>
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
                    
                    {/* Show school info for non-superadmin roles */}
                    {(isSchoolRole /* || isBranchGroup */) && userSchoolName && (
                      <div className="grid gap-2">
                        <Label htmlFor="schoolInfo">School</Label>
                        <Input
                          id="schoolInfo"
                          value={userSchoolName}
                          disabled
                          className="bg-gray-100"
                          placeholder="Your assigned school"
                        />
                        <input 
                          type="hidden" 
                          name="schoolId" 
                          value={userSchoolId || ""} 
                        />
                        <p className="text-xs text-gray-500">
                          School is automatically assigned to your account
                        </p>
                      </div>
                    )}

                    <div className="grid gap-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="Enter email address"
                        required
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="branchMobile">Mobile No *</Label>
                      <Input
                        id="branchMobile"
                        name="branchMobile"
                        type="tel"
                        placeholder="Enter branch mobile number"
                        pattern="[0-9]{10}"
                        maxLength={10}
                        autoComplete="tel"
                        required
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="username">Username *</Label>
                      <Input
                        id="username"
                        name="username"
                        type="text"
                        placeholder="Enter username"
                        required
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="password">Password *</Label>
                      <Input
                        id="password"
                        name="password"
                        type="text"
                        placeholder="Enter password"
                        required
                      />
                    </div>
                    
                    {/* DatePicker for Expiration Date */}
                    <div className="grid gap-2">
                      <Label htmlFor="expirationDate">Expiration Date</Label>
                      <DatePicker
                        selected={selectedDate}
                        onChange={setSelectedDate}
                        placeholderText="Select expiration date"
                        className="w-full"
                      />
                    </div>

                    {/* Full Access checkbox - only for superadmin and school roles */}
                    {(isSuperAdmin || isSchoolRole) && (
                      <div className="flex items-center gap-3 mt-6">
                        <input
                          type="checkbox"
                          id="fullAccess"
                          name="fullAccess"
                          className="h-5 w-5"
                        />
                        <Label htmlFor="fullAccess">Full Access</Label>
                      </div>
                    )}
                  </div>
                  
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button ref={closeButtonRef} variant="outline">
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button type="submit" disabled={addbranchMutation.isPending}>
                      {addbranchMutation.isPending ? "Saving..." : "Save branch"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </section>
      </header>

      <section className="mb-4">
        <CustomTable
          data={filteredData || []}
          columns={columns}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
          pageSizeArray={[10, 20, 50]}
          maxHeight={600}
          minHeight={200}
          showSerialNumber={true}
          noDataMessage="No branchs found"
          isLoading={isLoading}
        />
      </section>

      <section>
        <div>
          {((isSuperAdmin || isSchoolRole)) && (
            <Alert<branchAccess>
              title="Are you absolutely sure?"
              description={`You are about to give ${accessTarget?.branchName} ${
                accessTarget?.fullAccess ? "limited" : "full"
              } access.`}
              actionButton={(target) => {
                accessMutation.mutate({
                  _id: target._id,
                  fullAccess: !target.fullAccess,
                });
              }}
              target={accessTarget}
              setTarget={setAccessTarget}
              butttonText="Confirm"
              dialogClassName="max-w-sm" // Reduced width
            />
          )}
        </div>

        <div>
            {deleteTarget && (
              <Alert<branch>
                title="Are you absolutely sure?"
                description={`This will permanently delete ${deleteTarget?.branchName} and all associated data.`}
                actionButton={(target) => {
                  deletebranchMutation.mutate(target._id);
                  setDeleteTarget(null);
                }}
                target={deleteTarget}
                setTarget={setDeleteTarget}
                butttonText="Delete"
                dialogClassName="w-80" // Fixed width of 320px
              />
            )}
          </div>
      </section>
      
      <section>
        {editTarget && (
          <BranchEditDialog
            data={{
              ...editTarget,
              schoolId: editTarget.schoolId._id,
            }}
            isOpen={editDialogOpen}
            onClose={() => {
              setEditDialogOpen(false);
              setEditTarget(null);
              setIsVerified(false);
            }}
            onSave={handleSave}
            schoolOptions={schoolOptions}
            isVerified={isVerified}
            onVerificationRequired={(field) => {
              setCurrentProtectedField(field);
              setIsVerificationDialogOpen(true);
            }}
            isSuperAdmin={isSuperAdmin}
            isSchoolRole={isSchoolRole}
            updatebranchMutation={updatebranchMutation}
          />
        )}
      </section>
      
      <section>
        <FloatingMenu
          onExportPdf={() => {
            exportToPDF(filteredData, columnsForExport, {
              title: "branch Master Report",
              companyName: "Parents Eye",
              metadata: {
                Total: `${filteredData.length} branchs`,
              },
            });
          }}
          onExportExcel={() => {
            exportToExcel(filteredData, columnsForExport, {
              title: "branch Master Report",
              companyName: "Parents Eye",
              metadata: {
                Total: `${filteredData.length} branchs`,
              },
            });
          }}
        />
      </section>
    </main>
  );
}