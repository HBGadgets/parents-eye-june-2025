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
import { CustomTable, CellContent } from "@/components/ui/CustomTable";
import { DynamicEditDialog, FieldConfig } from "@/components/ui/EditModal";
import SearchComponent from "@/components/ui/SearchOnlydata";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import DateRangeFilter from "@/components/ui/DateRangeFilter";
import { FloatingMenu } from "@/components/floatingMenu";
import { useSchoolData } from "@/hooks/useSchoolData";
import { useBranchData } from "@/hooks/useBranchData";
import { useParents } from "@/hooks/useParents";
import {
  getCoreRowModel,
  useReactTable,
  VisibilityState,
  type ColumnDef,
  SortingState,
  PaginationState,
} from "@tanstack/react-table";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/apiService";
import { useExport } from "@/hooks/useExport";
import { formatDate } from "@/util/formatDate";
import { Alert } from "@/components/Alert";
import ResponseLoader from "@/components/ResponseLoader";
import { ColumnVisibilitySelector } from "@/components/column-visibility-selector";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";
import Cookies from "js-cookie";

// Parent interface
interface Parent {
  _id: string;
  parentName: string;
  mobileNo: string;
  email: string;
  username: string;
  password: string;
  schoolId?: {
    _id: string;
    schoolName: string;
  };
  branchId?: {
    _id: string;
    branchName: string;
  };
  isActive?: boolean;
  createdAt: string;
  updatedAt?: string;
}

interface selectOption {
  label: string;
  value: string;
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

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData, TValue> {
    flex?: number;
    minWidth?: number;
    maxWidth?: number;
    sortable?: boolean;
  }
}

export default function ParentsMaster() {
  const queryClient = useQueryClient();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Server-side table states
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState<string>("");
  const [dateRange, setDateRange] = useState<{
    start: Date | null;
    end: Date | null;
  }>({
    start: null,
    end: null,
  });

  // Existing states
  const [deleteTarget, setDeleteTarget] = useState<Parent | null>(null);
  const [editTarget, setEditTarget] = useState<Parent | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  // Add school and branch state hooks with search states
  const [school, setSchool] = useState<string>("");
  const [schoolSearch, setSchoolSearch] = useState("");
  const { data: schoolData } = useSchoolData();
  
  const [branch, setBranch] = useState<string>("");
  const [branchSearch, setBranchSearch] = useState("");
  const { data: branchData } = useBranchData();
  
  const [debouncedName, setDebouncedName] = useState("");

  // Search states
  const [filteredData, setFilteredData] = useState<Parent[]>([]);
  const [filterResults, setFilterResults] = useState<Parent[]>([]);

  // Role-based states
  const [role, setRole] = useState<string | null>(null);
  const [userSchoolId, setUserSchoolId] = useState<string | null>(null);
  const [userBranchId, setUserBranchId] = useState<string | null>(null);
  const [userSchoolName, setUserSchoolName] = useState<string | null>(null);

  const { exportToPDF, exportToExcel } = useExport();

  // Get user info from token
  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      const decoded = getDecodedToken(token);
      console.log("[Parent Master - Decoded Token]: ", decoded);
      
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

      console.log("[Parent Master - Final User Info]:", {
        role,
        userSchoolId,
        userBranchId,
        userSchoolName
      });
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

  // Use the custom hook for fetching parents data with role-based filtering
  const {
    data: parentsData,
    isLoading,
    error,
    isError,
    isFetching,
  } = useParents({
    pagination,
    sorting,
    name: debouncedName,
    // Add role-based filters
    ...(isSchoolRole && userSchoolId && { schoolId: userSchoolId }),
    ...(isBranchRole && userBranchId && { branchId: userBranchId }),
  });

  // Initialize filtered data when parents data changes
  useEffect(() => {
    if (parentsData?.data) {
      setFilteredData(parentsData.data);
      setFilterResults(parentsData.data);
    }
  }, [parentsData?.data]);

  // School options - Convert to Combobox format with role-based filtering
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

  // Branch options - Convert to Combobox format with role-based filtering
  const branchOptions = useMemo(() => {
    if (!branchData) return [];
    
    let filteredBranches = branchData;
    
    // Filter branches based on role
    if (isSchoolRole && userSchoolId) {
      filteredBranches = branchData.filter(b => b.schoolId?._id === userSchoolId);
    } else if (isBranchRole && userBranchId) {
      // For branch role, they should only see their own branch
      filteredBranches = branchData.filter(b => b._id === userBranchId);
    }
    
    return filteredBranches.filter((b) => b._id && b.branchName)
      .map((b) => ({ 
        label: b.branchName, 
        value: b._id 
      }));
  }, [branchData, isSchoolRole, isBranchRole, userSchoolId, userBranchId]);

  // Filtered branch options based on selected school
  const filteredBranchOptions = useMemo(() => {
    if (!school || !branchData) return [];
    
    let branches = branchData.filter((branch) => branch.schoolId?._id === school);
    
    // Additional role-based filtering
    if (isBranchRole && userBranchId) {
      branches = branches.filter(b => b._id === userBranchId);
    }
    
    return branches.map((branch) => ({
      label: branch.branchName,
      value: branch._id,
    }));
  }, [school, branchData, isBranchRole, userBranchId]);

  // Set default school for school and branch roles
  useEffect(() => {
    if ((isSchoolRole || isBranchRole) && userSchoolId && !school) {
      setSchool(userSchoolId);
    }
  }, [isSchoolRole, isBranchRole, userSchoolId, school]);

  // Set default branch for branch role
  useEffect(() => {
    if (isBranchRole && userBranchId && !branch) {
      setBranch(userBranchId);
    }
  }, [isBranchRole, userBranchId, branch]);

  // Reset branch when school changes
  useEffect(() => {
    if (school && !isBranchRole) {
      setBranch("");
      setBranchSearch("");
    }
  }, [school, isBranchRole]);

  // Define the columns for the table with role-based visibility
  const columns: ColumnDef<Parent>[] = [
    {
      id: "name",
      header: "Parents Name",
      accessorFn: (row) => row.parentName || "N/A",
      enableHiding: true,
      enableSorting: true,
    },
    ...(isSuperAdmin ? [{
      id: "schoolName",
      header: "School Name",
      accessorFn: (row) => row.schoolId?.schoolName || "N/A",
      enableHiding: true,
      enableSorting: true,
    }] : []),
    {
      id: "branchName",
      header: "Branch Name",
      accessorFn: (row) => row.branchId?.branchName || "N/A",
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "email",
      header: "Email",
      accessorFn: (row) => row.email || "N/A",
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "mobileNo",
      header: "Mobile No",
      accessorFn: (row) => row.mobileNo || "N/A",
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "username",
      header: "User Name",
      accessorFn: (row) => row.username || "N/A",
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "password",
      header: "Password",
      accessorFn: (row) => row.password || "N/A",
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "status",
      header: "Status",
      accessorFn: (row) => row.isActive ? "Active" : "Inactive",
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditTarget(row.original);
              setEditDialogOpen(true);
            }}
            className="cursor-pointer bg-[#f3c623] hover:bg-[#D3A80C]"
          >
            Edit
          </Button>
          {(isSuperAdmin || isSchoolRole) && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteTarget(row.original)}
              className="cursor-pointer hover:bg-red-700"
            >
              Delete
            </Button>
          )}
        </div>
      ),
    },
  ];

  // Columns for export with role-based visibility
  const columnsForExport = [
    { key: "parentName", header: "Parent Name" },
    ...(isSuperAdmin ? [{ key: "schoolId.schoolName", header: "School Name" }] : []),
    { key: "branchId.branchName", header: "Branch Name" },
    { key: "mobileNo", header: "Mobile" },
    { key: "email", header: "Email" },
    { key: "username", header: "Username" },
    { key: "password", header: "Password" },
    {
      key: "isActive",
      header: "Status",
      formatter: (value: boolean) => (value ? "Active" : "Inactive"),
    },
    {
      key: "createdAt",
      header: "Created At",
      formatter: (value: string) => new Date(value).toLocaleDateString("en-GB"),
    },
  ];

  // Define the fields for the edit dialog with role-based configuration
  const getParentFieldConfigs = (schoolOptions: selectOption[], branchOptions: selectOption[]): FieldConfig[] => [
    { label: "Parent Name", key: "parentName", type: "text", required: true },
    ...(isSuperAdmin ? [{
      label: "School Name",
      key: "schoolId",
      type: "select",
      required: true,
      options: schoolOptions,
    }] : []),
    {
      label: "Branch Name",
      key: "branchId",
      type: "select",
      required: true,
      options: branchOptions,
      ...((isSchoolRole && userSchoolId) && { 
        filterBy: "schoolId", 
        filterValue: userSchoolId 
      }),
      ...(isBranchRole && { disabled: true }),
    },
    { label: "Mobile Number", key: "mobileNo", type: "text", required: true },
    { label: "Email", key: "email", type: "email", required: true },
    { label: "Username", key: "username", type: "text", required: true },
    { label: "Password", key: "password", type: "text", required: true },
    { label: "Active Status", key: "isActive", type: "checkbox" },
  ];

  // Mutation to add a new parent
  const addParentMutation = useMutation({
    mutationFn: async (newParent: any) => {
      const parent = await api.post("/parent", newParent);
      return parent.parent;
    },
    onSuccess: () => {
      // Invalidate and refetch parents data
      queryClient.invalidateQueries({ queryKey: ["parents"] });
      alert("Parent added successfully.");
    },
    onError: (err) => {
      alert("Failed to add parent.\nerror: " + err);
    },
  });

  // Mutation for edit parent data
  const updateParentMutation = useMutation({
    mutationFn: async ({
      parentId,
      data,
    }: {
      parentId: string;
      data: Partial<Parent>;
    }) => {
      return await api.put(`/parent/${parentId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parents"] });
      setEditDialogOpen(false);
      setEditTarget(null);
      alert("Parent updated successfully.");
    },
    onError: (err) => {
      alert("Failed to update parent.\nerror: " + err);
    },
  });

  // Mutation to delete parent(s)
  const deleteParentMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      return await api.mulDelete("/parent", { ids });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parents"] });
      alert("Parent(s) deleted successfully!");
    },
    onError: (err) => {
      alert("Failed to delete parent(s).\nerror: " + err);
    },
  });

  // Handle search results
  const handleSearchResults = useCallback((results: Parent[]) => {
    setFilteredData(results);
  }, []);

  // Handle search with debounce
  const handleSearch = useCallback((searchTerm: string) => {
    setGlobalFilter(searchTerm);
    setPagination((prev) => ({ ...prev, pageIndex: 0 })); // Reset to first page
  }, []);

  // Handle pagination changes (especially page size changes)
  const handlePaginationChange = useCallback((updater: any) => {
    setPagination((prev) => {
      const newPagination =
        typeof updater === "function" ? updater(prev) : updater;

      // If page size changed, reset to first page
      if (newPagination.pageSize !== prev.pageSize) {
        return { ...newPagination, pageIndex: 0 };
      }

      return newPagination;
    });
  }, []);

  // Handle save action for edit parent
  const handleSave = (updatedData: Partial<Parent>) => {
    if (!editTarget) return;

    const changedFields: Partial<Record<keyof Parent, unknown>> = {};

    for (const key in updatedData) {
      const newValue = updatedData[key as keyof Parent];
      const oldValue = editTarget[key as keyof Parent];

      if (newValue !== undefined && newValue !== oldValue) {
        changedFields[key as keyof Parent] = newValue;
      }
    }

    if (Object.keys(changedFields).length === 0) {
      console.log("No changes detected.");
      return;
    }

    updateParentMutation.mutate({
      parentId: editTarget._id,
      data: changedFields,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    // Role-based school and branch selection
    let selectedSchool = school;
    let selectedBranch = branch;

    if (isSchoolRole || isBranchRole) {
      selectedSchool = userSchoolId || "";
    }
    if (isBranchRole) {
      selectedBranch = userBranchId || "";
    }

    if (!selectedSchool) {
      alert("Please select a school");
      return;
    } else if (!selectedBranch) {
      alert("Please select a branch");
      return;
    }

    const data = {
      parentName: formData.get("parentName") as string,
      mobileNo: formData.get("contactNo") as string,
      email: formData.get("parentEmail") as string,
      username: formData.get("username") as string,
      password: formData.get("password") as string,
      schoolId: selectedSchool,
      branchId: selectedBranch,
      isActive: formData.get("isActive") === "on",
    };

    try {
      await addParentMutation.mutateAsync(data);
      closeButtonRef.current?.click();
      form.reset();
      
      // Reset school and branch selection for super admin only
      if (isSuperAdmin) {
        setSchool("");
        setSchoolSearch("");
        setBranch("");
        setBranchSearch("");
      }
    } catch (err) {
      // Error handled in mutation
    }
  };

  const handleDateFilter = useCallback(
    (start: Date | null, end: Date | null) => {
      setDateRange({ start, end });
      setPagination((prev) => ({ ...prev, pageIndex: 0 })); // Reset to first page
    },
    []
  );

  // Create table instance with server-side features
  const { table, tableElement } = CustomTableServerSidePagination({
    data: filteredData || [],
    columns,
    pagination,
    totalCount: parentsData?.total || 0,
    loading: isLoading || isFetching,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    sorting,
    columnVisibility,
    onColumnVisibilityChange: setColumnVisibility,
    emptyMessage: "No parents found",
    pageSizeOptions: [5, 10, 20, 30, 50],
    enableSorting: true,
    showSerialNumber: true,
  });

  return (
    <main>
      {/* Progress loader at the top */}
      <ResponseLoader isLoading={isLoading || isFetching} />

      <header className="flex items-center justify-between mb-4">
        <section className="flex space-x-4">
          {/* Search component */}
          <SearchComponent
            data={filterResults}
            displayKey={["parentName", "mobileNo", "email", "username", "schoolId.schoolName", "branchId.branchName"]}
            onResults={handleSearchResults}
            className="w-[300px] mb-4"
          />
          
          {/* Column visibility selector */}
          <ColumnVisibilitySelector
            columns={table.getAllColumns()}
            buttonVariant="outline"
            buttonSize="default"
          />
        </section>

        {/* Add Parent - Only show for super admin, school admin, and branch admin */}
        {(isSuperAdmin || isSchoolRole || isBranchRole) && (
          <section>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="default">Add Parent</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <DialogHeader>
                    <DialogTitle>Add Parent</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="grid gap-2">
                      <Label htmlFor="parentName">Parent Name</Label>
                      <Input
                        id="parentName"
                        name="parentName"
                        placeholder="Enter parent name"
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
                      <Label htmlFor="branchId">Branch *</Label>
                      <Combobox 
                        items={filteredBranchOptions} 
                        value={branch} 
                        onValueChange={setBranch}
                        placeholder={
                          !school && isSuperAdmin
                            ? "Select school first"
                            : filteredBranchOptions.length
                            ? "Search branch..." 
                            : "No branches available"
                        }
                        searchPlaceholder="Search branches..." 
                        emptyMessage={
                          !school && isSuperAdmin
                            ? "Please select a school first" 
                            : filteredBranchOptions.length === 0 
                              ? "No branches found for this school" 
                              : "No branches match your search"
                        }
                        width="w-full" 
                        disabled={(!school && isSuperAdmin) || isBranchRole}
                        onSearchChange={setBranchSearch} 
                        searchValue={branchSearch} 
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="parentEmail">Email</Label>
                      <Input
                        id="parentEmail"
                        name="parentEmail"
                        type="email"
                        placeholder="Enter email address"
                        required
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="contactNo">Mobile No</Label>
                      <Input
                        id="contactNo"
                        name="contactNo"
                        type="tel"
                        placeholder="Enter mobile number"
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

                    <div className="flex items-center gap-3 mt-6">
                      <input
                        type="checkbox"
                        id="isActive"
                        name="isActive"
                        className="h-3 w-3"
                        defaultChecked
                      />
                      <Label htmlFor="isActive">Active Status</Label>
                    </div>
                  </div>

                  <DialogFooter>
                    <DialogClose asChild>
                      <Button ref={closeButtonRef} variant="outline">
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button type="submit" disabled={addParentMutation.isPending}>
                      {addParentMutation.isPending ? "Saving..." : "Save Parent"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </section>
        )}
      </header>

      {/* Table component with server-side functionality */}
      <section className="mb-4">
        {tableElement}
      </section>

      {/* Alert Boxes */}
      <section>
        <div>
          {deleteTarget && (
            <Alert<Parent>
              title="Are you absolutely sure?"
              description={`This will permanently delete ${deleteTarget?.parentName} and all associated data.`}
              actionButton={(target) => {
                deleteParentMutation.mutate([target._id]);
                setDeleteTarget(null);
              }}
              target={deleteTarget}
              setTarget={setDeleteTarget}
              butttonText="Delete"
            />
          )}
        </div>
      </section>

      {/* Edit Dialog */}
      <section>
        {editTarget && (
          <DynamicEditDialog
            data={{
              ...editTarget,
              schoolId: editTarget.schoolId?._id,
              branchId: editTarget.branchId?._id,
            }}
            isOpen={editDialogOpen}
            onClose={() => {
              setEditDialogOpen(false);
              setEditTarget(null);
            }}
            onSave={handleSave}
            fields={getParentFieldConfigs(schoolOptions, branchOptions)}
            title="Edit Parent"
            description="Update the parent information below. Fields marked with * are required."
            avatarConfig={{
              imageKey: "avatar",
              nameKeys: ["parentName"],
            }}
          />
        )}
      </section>

      {/* Floating Menu */}
      <section>
        <FloatingMenu
          onExportPdf={() => {
            exportToPDF(filteredData, columnsForExport, {
              title: "Parents Master Report",
              companyName: "Parents Eye",
              metadata: {
                Total: `${filteredData.length} parents`,
              },
            });
          }}
          onExportExcel={() => {
            exportToExcel(filteredData, columnsForExport, {
              title: "Parents Master Report",
              companyName: "Parents Eye",
              metadata: {
                Total: `${filteredData.length} parents`,
              },
            });
          }}
        />
      </section>
    </main>
  );
}