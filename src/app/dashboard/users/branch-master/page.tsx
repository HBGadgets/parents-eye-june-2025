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
import { DynamicEditDialog, FieldConfig } from "@/components/ui/EditModal";
import SearchComponent from "@/components/ui/SearchOnlydata";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import DateRangeFilter from "@/components/ui/DateRangeFilter";
import { FloatingMenu } from "@/components/floatingMenu";
import {
  type ColumnDef,
  PaginationState,
  SortingState,
  VisibilityState,
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

export default function BranchMaster() {
  const queryClient = useQueryClient();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [filteredData, setFilteredData] = useState<branch[]>([]);
  const [filterResults, setFilterResults] = useState<branch[]>([]);
  const [accessTarget, setAccessTarget] = useState<branch | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<branch | null>(null);
  const [editTarget, setEditTarget] = useState<branch | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
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

  // Server-side pagination state
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [totalCount, setTotalCount] = useState(0);

  // Get user info from token
  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      const decoded = getDecodedToken(token);
      console.log("[Branch Master - Decoded Token]: ", decoded);
      
      const role = (decoded?.role || "").toLowerCase();
      setRole(role);

      // Handle schoolId based on role
      if (role === "school" || role === "schooladmin") {
        setUserSchoolId(decoded?.id || null);
      } else if (role === "branch" || role === "branchadmin") {
        setUserSchoolId(decoded?.schoolId || null);
      } else {
        setUserSchoolId(decoded?.schoolId || null);
      }

      // Handle branchId - for branch role, use 'id' field as branchId
      if (role === "branch" || role === "branchadmin") {
        setUserBranchId(decoded?.id || null);
      } else {
        setUserBranchId(decoded?.branchId || null);
      }
      
      setUserSchoolName(decoded?.schoolName || null);
    }
  }, []);

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

  // Fetch ALL branch data first (since backend doesn't support pagination)
  const {
    data: allBranches,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["branchs", userSchoolId, userBranchId],
    queryFn: async () => {
      // Build query parameters for role-based filtering
      const params = new URLSearchParams();

      // For school and branch roles, add filter parameters
      if (isSchoolRole && userSchoolId) {
        params.append('schoolId', userSchoolId);
      } else if (isBranchRole && userBranchId) {
        params.append('branchId', userBranchId);
      }

      const queryString = params.toString();
      const url = queryString ? `/branch?${queryString}` : '/branch';
      
      const res = await api.get(url);
      
      // Handle different API response structures
      if (res && typeof res === 'object') {
        // If response has branches property
        if (res.branches && Array.isArray(res.branches)) {
          return res.branches;
        }
        // If response is directly an array
        else if (Array.isArray(res)) {
          return res;
        }
        // If response has data property
        else if (res.data && Array.isArray(res.data)) {
          return res.data;
        }
      }
      
      // Fallback: return empty array
      return [];
    },
    enabled: !((isSchoolRole && !userSchoolId) || (isBranchRole && !userBranchId)),
  });

  // Apply client-side pagination to the fetched data
  const paginatedData = useMemo(() => {
    if (!allBranches) return [];
    
    const startIndex = pagination.pageIndex * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;
    
    return allBranches.slice(startIndex, endIndex);
  }, [allBranches, pagination.pageIndex, pagination.pageSize]);

  // Apply client-side sorting
  const sortedAndPaginatedData = useMemo(() => {
    if (!paginatedData.length) return [];

    if (sorting.length > 0) {
      const sort = sorting[0];
      const sorted = [...paginatedData].sort((a, b) => {
        let aValue: any = a;
        let bValue: any = b;
        
        // Handle nested properties like schoolId.schoolName
        if (sort.id.includes('.')) {
          const keys = sort.id.split('.');
          aValue = keys.reduce((obj, key) => obj?.[key], a);
          bValue = keys.reduce((obj, key) => obj?.[key], b);
        } else {
          aValue = a[sort.id as keyof branch];
          bValue = b[sort.id as keyof branch];
        }

        // Handle null/undefined values
        if (aValue == null) return sort.desc ? 1 : -1;
        if (bValue == null) return sort.desc ? -1 : 1;

        // Compare values
        if (aValue < bValue) return sort.desc ? 1 : -1;
        if (aValue > bValue) return sort.desc ? -1 : 1;
        return 0;
      });
      
      return sorted;
    }
    
    return paginatedData;
  }, [paginatedData, sorting]);

  // Update filtered data when branches change
  useEffect(() => {
    if (allBranches) {
      setTotalCount(allBranches.length);
      setFilterResults(allBranches);
      
      // Initially show paginated data
      setFilteredData(sortedAndPaginatedData);
    } else {
      setFilteredData([]);
      setFilterResults([]);
      setTotalCount(0);
    }
  }, [allBranches, sortedAndPaginatedData]);

  // School data - Convert to Combobox format with role-based filtering
  const schoolOptions = useMemo(() => {
    if (!schoolData) return [];
    
    let filteredSchools = schoolData;
    
    // Filter schools based on role
    if (isSchoolRole && userSchoolId) {
      filteredSchools = schoolData.filter(s => s._id === userSchoolId);
    } else if (isBranchRole && userSchoolId) {
      filteredSchools = schoolData.filter(s => s._id === userSchoolId);
    }
    
    return filteredSchools.filter((s) => s._id && s.schoolName)
      .map((s) => ({ 
        label: s.schoolName, 
        value: s._id 
      }));
  }, [schoolData, isSchoolRole, isBranchRole, userSchoolId]);

  // Set default school for school and branch roles
  useEffect(() => {
    if ((isSchoolRole || isBranchRole) && userSchoolId && !school) {
      setSchool(userSchoolId);
    }
  }, [isSchoolRole, isBranchRole, userSchoolId, school]);

  // Define the columns for the table
  const columns: ColumnDef<branch>[] = [
    {
      header: "Branch Name",
      accessorKey: "branchName",
      cell: ({ row }) => row.original.branchName ?? "",
      meta: { flex: 1, minWidth: 200, maxWidth: 300 },
      enableHiding: true,
    },
    ...(isSuperAdmin ? [{
      header: "School Name",
      accessorKey: "schoolId.schoolName",
      cell: ({ row }) => row.original.schoolId?.schoolName ?? "",
      meta: { flex: 1, minWidth: 200, maxWidth: 300 },
      enableHiding: true,
    }] : []),
    {
      header: "Mobile",
      accessorKey: "mobileNo",
      cell: ({ row }) => row.original.mobileNo ?? "",
      meta: { flex: 1, minWidth: 150, maxWidth: 300 },
      enableHiding: true,
    },
    {
      header: "Username",
      accessorKey: "username",
      cell: ({ row }) => row.original.username ?? "",
      meta: { flex: 1, minWidth: 150, maxWidth: 300 },
      enableHiding: true,
    },
    {
      header: "Password",
      accessorKey: "password",
      cell: ({ row }) => row.original.password ?? "",
      meta: { flex: 1, minWidth: 150, maxWidth: 300 },
      enableHiding: true,
    },
    {
      header: "Registration Date",
      accessorKey: "createdAt",
      cell: ({ row }) => formatDate(row.original.createdAt) ?? "",
      meta: { flex: 1, minWidth: 150, maxWidth: 300 },
      enableHiding: true,
    },
    {
      header: "Expiration Date",
      accessorKey: "subscriptionExpirationDate",
      cell: ({ row }) => 
        row.original.subscriptionExpirationDate
          ? formatDate(row.original.subscriptionExpirationDate)
          : "---",
      meta: { flex: 1, minWidth: 150, maxWidth: 300 },
      enableHiding: true,
    },
    ...((isSuperAdmin || isSchoolRole) ? [{
      header: "Access",
      id: "access",
      cell: ({ row }) => (
        <button
          onClick={() => setAccessTarget(row.original)}
          disabled={accessMutation.isPending}
          className={`w-38 text-center text-sm bg-yellow-400 hover:bg-yellow-500 font-semibold rounded-full px-4 py-2 ${
            row.original.fullAccess ? "text-red-600" : "text-emerald-600"
          }`}
        >
          {row.original.fullAccess ? "Grant Limited Access" : "Grant Full Access"}
        </button>
      ),
      meta: { flex: 1.5, minWidth: 150, maxWidth: 200 },
      enableSorting: false,
      enableHiding: true,
    }] : []),
    {
      header: "Action",
      id: "actions",
      cell: ({ row }) => (
        <div className="flex space-x-2">
          <button
            onClick={() => {
              setEditTarget(row.original);
              setEditDialogOpen(true);
            }}
            disabled={accessMutation.isPending}
            className="px-3 py-1 bg-yellow-400 text-black rounded hover:bg-yellow-500"
          >
            Edit
          </button>
          {((isSuperAdmin || isSchoolRole)) && (
            <button
              onClick={() => setDeleteTarget(row.original)}
              disabled={deletebranchMutation.isPending}
              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Delete
            </button>
          )}
        </div>
      ),
      meta: { flex: 1.5, minWidth: 150, maxWidth: 200 },
      enableSorting: false,
      enableHiding: true,
    },
  ];

  // Columns for export
  const columnsForExport = [
    { key: "branchName", header: "Branch Name" },
    ...(isSuperAdmin ? [{ key: "schoolId.schoolName", header: "School Name" }] : []),
    { key: "mobileNo", header: "Mobile" },
    { key: "email", header: "Email" },
    { key: "username", header: "Branch Username" },
    { key: "password", header: "Branch Password" },
    { key: "subscriptionExpirationDate", header: "Expiration Date" },
    { key: "createdAt", header: "Registration Date" },
    ...((isSuperAdmin || isSchoolRole) ? [{
      key: "fullAccess",
      header: "Access Level",
      formatter: (val: boolean) => (val ? "Full Access" : "Limited Access"),
    }] : []),
  ];

  // Define the fields for the edit dialog
  const getBranchFieldConfigs = (schoolOptions: { label: string; value: string }[]): FieldConfig[] => [
    {
      label: "Branch Name",
      key: "branchName",
      type: "text",
      required: true,
    },
    ...(isSuperAdmin ? [{
      label: "School Name",
      key: "schoolId",
      type: "select",
      required: true,
      options: schoolOptions,
    }] : []),
    {
      label: "Mobile Number",
      key: "mobileNo",
      type: "text",
      required: true,
      transformInput: (value) => String(value),
    },
    {
      label: "Username",
      key: "username",
      type: "text",
      required: true,
    },
    {
      label: "Password",
      key: "password",
      type: "text",
      required: true,
    },
    ...((isSuperAdmin || isSchoolRole) ? [{
      label: "Expiration Date",
      key: "subscriptionExpirationDate",
      type: "date",
      isProtected: true,
      disabled: false,
      onFocus: () => {
        if (!isVerified) {
          setCurrentProtectedField("subscriptionExpirationDate");
          setIsVerificationDialogOpen(true);
        }
      }
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branchs"] });
    },
  });

  // Mutation for Access control
  const accessMutation = useMutation({
    mutationFn: async (branch: { _id: string; fullAccess: boolean }) => {
      return await api.put(`/branch/accessgrant/${branch._id}`, {
        fullAccess: branch.fullAccess,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branchs"] });
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
      setIsVerified(false);
      alert("Branch updated successfully.");
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branchs"] });
      alert("Branch deleted successfully.");
    },
    onError: (err) => {
      alert("Failed to delete branch.\nerror: " + err);
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
    
    // Role-based school selection
    let selectedSchool = school;
    if (isSchoolRole || isBranchRole) {
      selectedSchool = userSchoolId || "";
    }
    
    if (!selectedSchool) {
      alert("Please select a school");
      return;
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
      fullAccess: form.fullAccess.checked,
    };

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
      if (!allBranches || (!start && !end)) {
        setFilteredData(sortedAndPaginatedData);
        return;
      }

      const filtered = allBranches.filter((branch) => {
        if (!branch.createdAt) return false;

        const createdDate = new Date(branch.createdAt);
        return (!start || createdDate >= start) && (!end || createdDate <= end);
      });

      // Apply pagination to filtered results
      const startIndex = pagination.pageIndex * pagination.pageSize;
      const endIndex = startIndex + pagination.pageSize;
      const paginatedFiltered = filtered.slice(startIndex, endIndex);
      
      setFilteredData(paginatedFiltered);
    },
    [allBranches, sortedAndPaginatedData, pagination]
  );

  const handleCustomFilter = useCallback((filtered: branch[]) => {
    setFilteredData(filtered);
  }, []);

  // Handle pagination change
  const handlePaginationChange = useCallback((newPagination: PaginationState) => {
    setPagination(newPagination);
  }, []);

  // Handle sorting change
  const handleSortingChange = useCallback((newSorting: SortingState) => {
    setSorting(newSorting);
  }, []);

  // Use the tableElement from the component
  const { tableElement } = CustomTableServerSidePagination({
    data: filteredData,
    columns,
    pagination,
    totalCount,
    loading: isLoading,
    onPaginationChange: handlePaginationChange,
    onSortingChange: handleSortingChange,
    sorting,
    pageSizeOptions: [10, 20, 50],
    maxHeight: "600px",
    showSerialNumber: true,
    emptyMessage: "No branches found",
    enableSorting: true,
    manualSorting: true,
    manualPagination: true,
    columnVisibility,
    onColumnVisibilityChange: setColumnVisibility,
  });

  return (
    <main>
      <ResponseLoader isLoading={isLoading} />

      <header className="flex items-center justify-between mb-4">
        <section className="flex space-x-4">
          <SearchComponent
            data={filterResults}
            displayKey={["branchName", "username", "email", "mobileNo"]}
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
            columns={[]}
            buttonVariant="outline"
            buttonSize="default"
          />
        </section>

        <section>
          {(isSuperAdmin || isSchoolRole) && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="default">Add Branch</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <DialogHeader>
                    <DialogTitle>Add Branch</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="grid gap-2">
                      <Label htmlFor="branchName">Branch Name</Label>
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
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="Enter email address"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="branchMobile">Mobile No</Label>
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
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        name="username"
                        type="text"
                        placeholder="Enter username"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="password">Password</Label>
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

                    <div className="flex items-center gap-3 mt-6">
                      <input
                        type="checkbox"
                        id="fullAccess"
                        name="fullAccess"
                        className="h-5 w-5"
                      />
                      <Label htmlFor="fullAccess">Full Access</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button ref={closeButtonRef} variant="outline">
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button type="submit" disabled={addbranchMutation.isPending}>
                      {addbranchMutation.isPending ? "Saving..." : "Save Branch"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </section>
      </header>

      <section className="mb-4">
        {tableElement}
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
              dialogClassName="max-w-sm"
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
              dialogClassName="max-w-sm"
            />
          )}
        </div>
      </section>
      
      <section>
        {editTarget && (
          <DynamicEditDialog
            data={{
              ...editTarget,
              schoolId: editTarget.schoolId._id,
            }}
            isOpen={editDialogOpen}
            onClose={() => {
              setEditDialogOpen(false);
              setEditTarget(null);
              setIsVerified(false)
            }}
            onSave={handleSave}
            fields={getBranchFieldConfigs(schoolOptions)}
            title="Edit Branch"
            description="Update the branch information below. Fields marked with * are required."
            avatarConfig={{
              imageKey: "logo",
              nameKeys: ["branchName"],
            }}
          />
        )}
      </section>
      
      <section>
        <FloatingMenu
          onExportPdf={() => {
            exportToPDF(filterResults, columnsForExport, {
              title: "Branch Master Report",
              companyName: "Parents Eye",
              metadata: {
                Total: `${filterResults.length} branches`,
              },
            });
          }}
          onExportExcel={() => {
            exportToExcel(filterResults, columnsForExport, {
              title: "Branch Master Report",
              companyName: "Parents Eye",
              metadata: {
                Total: `${filterResults.length} branches`,
              },
            });
          }}
        />
      </section>
    </main>
  );
}