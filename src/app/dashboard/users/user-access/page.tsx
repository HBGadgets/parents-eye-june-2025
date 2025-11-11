"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";
import { ColumnVisibilitySelector } from "@/components/column-visibility-selector";
import { FloatingMenu } from "@/components/floatingMenu";
import ResponseLoader from "@/components/ResponseLoader";
import { Alert } from "@/components/Alert";
import DateRangeFilter from "@/components/ui/DateRangeFilter";
import { useSchoolData } from "@/hooks/useSchoolData";
import { useBranchData } from "@/hooks/useBranchData";
import { useExport } from "@/hooks/useExport";
import { api } from "@/services/apiService";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef, SortingState, VisibilityState } from "@tanstack/react-table";
import { ChevronDown, X } from "lucide-react";
import SearchComponent from "@/components/ui/SearchOnlydata";
import { Combobox } from "@/components/ui/combobox";

interface BranchGroupAccess {
  _id: string;
  username: string;
  password: string;
  mobileNo: string;
  branchGroupName: string;
  schoolId?: { _id: string; schoolName: string };
  AssignedBranch?: { _id: string; branchName: string }[];
  createdAt?: string;
}

interface SelectOption {
  label: string;
  value: string;
}

// Table Branch Dropdown Component
const TableBranchDropdown: React.FC<{
  assignedBranches: { _id: string; branchName: string }[];
  branchOptions: SelectOption[];
  onBranchesUpdate: (branchIds: string[]) => void;
  userId: string;
}> = ({ assignedBranches, branchOptions, onBranchesUpdate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedBranches(assignedBranches.map((b) => b._id));
  }, [assignedBranches]);

  const allSelected =
    selectedBranches.length === branchOptions.length && branchOptions.length > 0;
  const selectedCount = selectedBranches.length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleBranchToggle = (branchId: string) => {
    const newSelectedBranches = selectedBranches.includes(branchId)
      ? selectedBranches.filter((id) => id !== branchId)
      : [...selectedBranches, branchId];
    setSelectedBranches(newSelectedBranches);
    onBranchesUpdate(newSelectedBranches);
  };

  const handleSelectAll = () => {
    const newSelectedBranches = allSelected
      ? []
      : branchOptions.map((branch) => branch.value);
    setSelectedBranches(newSelectedBranches);
    onBranchesUpdate(newSelectedBranches);
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full border border-gray-300 rounded px-3 py-2 text-left bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-sm min-h-[42px] flex items-center justify-between"
      >
        <span className="text-gray-700">Assign Branches</span>
        <ChevronDown
          className={`h-4 w-4 text-gray-500 transition-transform flex-shrink-0 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 left-0 mt-1 w-60 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-200 bg-yellow-50 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Assign Branches</span>
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-xs text-yellow-700 hover:text-yellow-900 font-medium"
            >
              {allSelected ? "Deselect All" : "Select All"}
            </button>
          </div>

          <div className="max-h-48 overflow-y-auto">
            {branchOptions.length > 0 ? (
              branchOptions.map((branch) => (
                <label
                  key={branch.value}
                  className="flex items-center px-3 py-2 hover:bg-yellow-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedBranches.includes(branch.value)}
                    onChange={() => handleBranchToggle(branch.value)}
                    className="h-4 w-4 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                  />
                  <span className="ml-3 text-sm text-gray-700">{branch.label}</span>
                </label>
              ))
            ) : (
              <div className="px-3 py-3 text-center text-sm text-gray-500">
                No branches available
              </div>
            )}
          </div>

          <div className="px-3 py-2 border-t border-gray-200 bg-yellow-50 flex justify-between items-center text-xs text-gray-600">
            <span>{selectedCount} branch(es) selected</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-yellow-700 hover:text-yellow-900 font-medium"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Form Branch Dropdown Component
const BranchDropdown: React.FC<{
  selectedBranches: string[];
  branchOptions: SelectOption[];
  onBranchToggle: (branchId: string) => void;
  onSelectAll: () => void;
}> = ({ selectedBranches, branchOptions, onBranchToggle, onSelectAll }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const allSelected =
    selectedBranches.length === branchOptions.length && branchOptions.length > 0;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const removeBranch = (branchId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onBranchToggle(branchId);
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full border border-gray-300 rounded px-3 py-2 text-left bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-sm min-h-[42px] flex items-center justify-between"
      >
        <div className="flex flex-wrap gap-1 flex-1">
          {selectedBranches.length > 0 ? (
            selectedBranches.slice(0, 3).map((branchId) => {
              const branch = branchOptions.find((b) => b.value === branchId);
              return branch ? (
                <span
                  key={branchId}
                  className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full"
                >
                  {branch.label}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-yellow-900 transition-colors"
                    onClick={(e) => removeBranch(branchId, e)}
                  />
                </span>
              ) : null;
            })
          ) : (
            <span className="text-gray-500">Select branches</span>
          )}
          {selectedBranches.length > 3 && (
            <span className="inline-flex items-center bg-yellow-50 text-yellow-700 text-xs px-2 py-1 rounded-full">
              +{selectedBranches.length - 3} more
            </span>
          )}
        </div>
        <ChevronDown
          className={`h-4 w-4 text-gray-500 transition-transform flex-shrink-0 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 left-0 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-200 bg-yellow-50">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Branches</span>
              <button
                type="button"
                onClick={onSelectAll}
                className="text-xs text-yellow-700 hover:text-yellow-900 font-medium"
              >
                {allSelected ? "Deselect All" : "Select All"}
              </button>
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto">
            {branchOptions.length > 0 ? (
              branchOptions.map((branch) => (
                <label
                  key={branch.value}
                  className="flex items-center px-3 py-2 hover:bg-yellow-50 cursor-pointer group"
                >
                  <div className="flex items-center h-4">
                    <input
                      type="checkbox"
                      checked={selectedBranches.includes(branch.value)}
                      onChange={() => onBranchToggle(branch.value)}
                      className="h-4 w-4 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                    />
                  </div>
                  <span className="ml-3 text-sm text-gray-700 flex-1">{branch.label}</span>
                </label>
              ))
            ) : (
              <div className="px-3 py-3 text-center text-sm text-gray-500">
                No branches available
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function UserAccessPage() {
  const queryClient = useQueryClient();
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [branchGroupsData, setBranchGroupsData] = useState<{
    data: BranchGroupAccess[];
    total: number;
  }>({ data: [], total: 0 });
  const [filteredData, setFilteredData] = useState<BranchGroupAccess[]>([]);
  const [allData, setAllData] = useState<BranchGroupAccess[]>([]); // Store all data for client-side filtering
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [editTarget, setEditTarget] = useState<BranchGroupAccess | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BranchGroupAccess | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editSelectedBranches, setEditSelectedBranches] = useState<string[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<string | null>(null);
  const [editSelectedSchool, setEditSelectedSchool] = useState<string | null>(null);

  const { exportToPDF, exportToExcel } = useExport();
  const { data: schoolData } = useSchoolData();
  const { data: branchDataFromHook } = useBranchData();
  const branchData =
    branchDataFromHook && branchDataFromHook.length > 0 ? branchDataFromHook : [];

  const schoolOptions: SelectOption[] =
    schoolData?.map((s) => ({ label: s.schoolName, value: s._id })) || [];
  const branchOptions: SelectOption[] =
    branchData?.map((b) => ({ label: b.branchName, value: b._id })) || [];

  // ✅ Modified fetch logic - fetch all data without filters initially
  const fetchBranchGroups = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get<BranchGroupAccess[]>(`/branchGroup`);
      setBranchGroupsData({ data: response, total: response.length });
      setAllData(response); // Store all data
      setFilteredData(response); // Initialize filtered data with all data
    } catch (err) {
      setError("Failed to load user data.");
      setBranchGroupsData({ data: [], total: 0 });
      setAllData([]);
      setFilteredData([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBranchGroups();
  }, [fetchBranchGroups]);

  // ✅ Apply date range and search filters client-side
  useEffect(() => {
    let filtered = [...allData];

    // Apply date range filter
    if (dateRange.start || dateRange.end) {
      filtered = filtered.filter(item => {
        if (!item.createdAt) return false;
        
        const itemDate = new Date(item.createdAt);
        let startMatch = true;
        let endMatch = true;

        if (dateRange.start) {
          startMatch = itemDate >= new Date(dateRange.start.setHours(0, 0, 0, 0));
        }

        if (dateRange.end) {
          const endOfDay = new Date(dateRange.end.setHours(23, 59, 59, 999));
          endMatch = itemDate <= endOfDay;
        }

        return startMatch && endMatch;
      });
    }

    // Apply search filter
    if (globalFilter.trim()) {
      const searchTerm = globalFilter.toLowerCase();
      filtered = filtered.filter(item => 
        item.username?.toLowerCase().includes(searchTerm) ||
        item.branchGroupName?.toLowerCase().includes(searchTerm) ||
        item.mobileNo?.toLowerCase().includes(searchTerm) ||
        item.schoolId?.schoolName?.toLowerCase().includes(searchTerm)
      );
    }

    setFilteredData(filtered);
  }, [allData, dateRange, globalFilter]);

  // Handle search results - now works with date range
  const handleSearchResults = useCallback((results: BranchGroupAccess[]) => {
    setFilteredData(results);
  }, []);

  // Handle search input change
  const handleSearchChange = useCallback((searchTerm: string) => {
    setGlobalFilter(searchTerm);
  }, []);

  // Handle date range change
  const handleDateRangeChange = useCallback((start: Date | null, end: Date | null) => {
    setDateRange({ start, end });
  }, []);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (newBranchGroup: any) => api.post("/branchGroup", newBranchGroup),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branchGroups"] });
      setIsAddDialogOpen(false);
      setSelectedBranches([]);
      setSelectedSchool(null);
      fetchBranchGroups();
    },
    onError: (err: any) => setError(err.response?.data?.message || "Failed to add branch group"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/branchGroup/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branchGroups"] });
      setIsEditDialogOpen(false);
      setEditTarget(null);
      setEditSelectedBranches([]);
      setEditSelectedSchool(null);
      fetchBranchGroups();
    },
    onError: (err: any) => setError(err.response?.data?.message || "Failed to update branch group"),
  });

  const updateBranchesMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await api.put(`/branchGroup/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branchGroups"] });
      fetchBranchGroups();
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || "Failed to update branches");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/branchGroup/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branchGroups"] });
      setDeleteTarget(null);
      fetchBranchGroups();
    },
    onError: (err: any) => setError(err.response?.data?.message || "Failed to delete branch group"),
  });

  // Handlers
  const handleBranchToggle = (branchId: string) => {
    setSelectedBranches(prev => prev.includes(branchId) ? prev.filter(id => id !== branchId) : [...prev, branchId]);
  };

  const handleEditBranchToggle = (branchId: string) => {
    setEditSelectedBranches(prev => prev.includes(branchId) ? prev.filter(id => id !== branchId) : [...prev, branchId]);
  };

  const handleSelectAll = () => {
    setSelectedBranches(selectedBranches.length === branchOptions.length ? [] : branchOptions.map(b => b.value));
  };

  const handleEditSelectAll = () => {
    setEditSelectedBranches(editSelectedBranches.length === branchOptions.length ? [] : branchOptions.map(b => b.value));
  };

  const handleTableBranchesUpdate = useCallback((userId: string, branchIds: string[]) => {
    updateBranchesMutation.mutate({
      id: userId,
      data: { AssignedBranch: branchIds }
    });
  }, [updateBranchesMutation]);

  const handleSchoolChange = (schoolId: string | null) => {
    setSelectedSchool(schoolId);
    // Reset branches when school changes
    setSelectedBranches([]);
  };

  const handleEditSchoolChange = (schoolId: string | null) => {
    setEditSelectedSchool(schoolId);
    // Reset branches when school changes
    setEditSelectedBranches([]);
  };

  const handleAddUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newBranchGroup = {
      username: formData.get("username") as string,
      password: formData.get("password") as string,
      mobileNo: formData.get("mobileNo") as string,
      schoolId: selectedSchool,
      branchGroupName: formData.get("branchGroupName") as string,
      AssignedBranch: selectedBranches,
    };
    await createMutation.mutateAsync(newBranchGroup);
  };

  const handleEditUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editTarget) return;
    const formData = new FormData(e.currentTarget);
    const updatedBranchGroup = {
      username: formData.get("username") as string,
      password: formData.get("password") as string,
      mobileNo: formData.get("mobileNo") as string,
      schoolId: editSelectedSchool || editTarget.schoolId?._id,
      branchGroupName: formData.get("branchGroupName") as string,
      AssignedBranch: editSelectedBranches,
    };
    await updateMutation.mutateAsync({ id: editTarget._id, data: updatedBranchGroup });
  };

  const handleDelete = () => deleteTarget && deleteMutation.mutate(deleteTarget._id);

  // Reset form when dialog closes
  useEffect(() => {
    if (!isAddDialogOpen) {
      setSelectedBranches([]);
      setSelectedSchool(null);
    }
  }, [isAddDialogOpen]);

  // Setup edit data when edit target changes
  useEffect(() => {
    if (editTarget && isEditDialogOpen) {
      setEditSelectedBranches(
        editTarget.AssignedBranch 
          ? editTarget.AssignedBranch.map(b => b._id)
          : []
      );
      setEditSelectedSchool(editTarget.schoolId?._id || null);
    }
  }, [editTarget, isEditDialogOpen]);

  // Reset edit state when dialog closes
  useEffect(() => {
    if (!isEditDialogOpen) {
      setEditSelectedBranches([]);
      setEditSelectedSchool(null);
      setEditTarget(null);
    }
  }, [isEditDialogOpen]);

  // Columns with branches assign column
  const columns: ColumnDef<BranchGroupAccess>[] = useMemo(() => [
    { id: "sno", header: "S.No.", cell: ({ row }) => row.index + 1 },
    { id: "username", header: "User Name", accessorFn: (row) => row.username || "N/A" },
    { id: "branchGroupName", header: "Group Name", accessorFn: (row) => row.branchGroupName || "N/A" },
    { id: "password", header: "Password", accessorFn: (row) => row.password || "N/A" },
    { id: "mobileNo", header: "Mobile No", accessorFn: (row) => row.mobileNo || "N/A" },
    { id: "schoolName", header: "School Name", accessorFn: (row) => row.schoolId?.schoolName || "N/A" },
    { id: "createdAt", header: "Registration Date", accessorFn: (row) => row.createdAt ? new Date(row.createdAt).toLocaleDateString("en-GB") : "N/A" },
    {
      id: "assignedBranches", 
      header: "Assigned Branches",
      cell: ({ row }) => {
        const branches = row.original.AssignedBranch || [];
        return (
          <div className="min-w-[200px]">
            <TableBranchDropdown
              assignedBranches={branches}
              branchOptions={branchOptions}
              onBranchesUpdate={(branchIds) => 
                handleTableBranchesUpdate(row.original._id, branchIds)
              }
              userId={row.original._id}
            />
          </div>
        );
      },
      size: 300,
    },
    {
      id: "action", header: "Action", cell: ({ row }) => (
        <div className="flex gap-2">
          <button className="bg-yellow-400 hover:bg-yellow-500 text-[#733e0a] font-semibold py-1 px-3 rounded-md text-sm"
            onClick={() => { 
              setEditTarget(row.original); 
              setIsEditDialogOpen(true); 
            }}>
            Edit
          </button>
          <button className="bg-red-500 hover:bg-red-600 text-white font-semibold py-1 px-3 rounded-md text-sm"
            onClick={() => setDeleteTarget(row.original)}>
            Delete
          </button>
        </div>
      ),
    },
  ], [branchOptions, handleTableBranchesUpdate]);

  const columnsForExport = useMemo(() => [
    { key: "username", header: "User Name" },
    { key: "branchGroupName", header: "Group Name" },
    { key: "password", header: "Password" },
    { key: "mobileNo", header: "Mobile No" },
    { key: "schoolId.schoolName", header: "School Name" },
    {
      key: "createdAt",
      header: "Registration Date",
      formatter: (value?: string) => value ? new Date(value).toLocaleDateString("en-GB") : "N/A",
    },
    {
      key: "AssignedBranch", 
      header: "Assigned Branches",
      formatter: (branches: { branchName: string }[]) =>
        Array.isArray(branches) ? branches.map(b => b.branchName).join(", ") : "N/A",
    },
  ], []);

  const { table, tableElement } = CustomTableServerSidePagination({
    data: filteredData || [],
    columns,
    pagination,
    totalCount: filteredData.length || 0,
    loading: isLoading,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    sorting,
    columnVisibility,
    onColumnVisibilityChange: setColumnVisibility,
    emptyMessage: error || "No branch groups found",
    pageSizeOptions: [10],
    enableSorting: true,
    showSerialNumber: false,
  });

  return (
    <main>
      <ResponseLoader isLoading={isLoading || createMutation.isPending || updateMutation.isPending || deleteMutation.isPending || updateBranchesMutation.isPending} />
      {error && <div className="text-red-600 p-2 border border-red-300 bg-red-50 mb-4 rounded">{error}</div>}

      <header className="flex items-center justify-between mb-4">
        <section className="flex space-x-4">
          <SearchComponent
            data={allData} 
            displayKey={["username", "branchGroupName", "mobileNo", "schoolId.schoolName"]}
            onResults={handleSearchResults}
            onSearchChange={handleSearchChange} 
            className="w-[300px] mb-4"
          />
          <DateRangeFilter 
            onDateRangeChange={handleDateRangeChange} 
            title="Search by Registration Date" 
          />
          <ColumnVisibilitySelector columns={table?.getAllColumns() || []} buttonVariant="outline" buttonSize="default" />
        </section>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild><Button variant="default">Add Branch Group</Button></DialogTrigger>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleAddUser} className="space-y-4">
              <DialogHeader><DialogTitle>Add Branch Group</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <Label htmlFor="username">User Name</Label>
                <Input id="username" name="username" placeholder="Enter username" required />
                
                <Label htmlFor="branchGroupName">Branch Group Name</Label>
                <Input id="branchGroupName" name="branchGroupName" placeholder="Enter branch group name" required />
                
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" placeholder="Enter password" required />
                
                <Label htmlFor="mobileNo">Mobile No</Label>
                <Input id="mobileNo" name="mobileNo" placeholder="Enter mobile no" required />
                
                <Label htmlFor="schoolId">School</Label>
                <Combobox
                  items={schoolOptions}
                  value={selectedSchool}
                  onValueChange={handleSchoolChange}
                  placeholder="Select School"
                  searchPlaceholder="Search Schools..."
                  emptyMessage="No schools found"
                />
                
                <Label htmlFor="assignedBranches">Assigned Branches</Label>
                <BranchDropdown 
                  selectedBranches={selectedBranches} 
                  branchOptions={branchOptions} 
                  onBranchToggle={handleBranchToggle} 
                  onSelectAll={handleSelectAll} 
                />
                {selectedBranches.length > 0 && (
                  <div className="text-sm text-gray-600">Selected: {selectedBranches.length} branch(es)</div>
                )}
              </div>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "Saving..." : "Save Group"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </header>
      
      <div className="w-full">{tableElement}</div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          {editTarget && (
            <form onSubmit={handleEditUser} className="space-y-4">
              <DialogHeader><DialogTitle>Edit Branch Group</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <Label htmlFor="edit-username">User Name</Label>
                <Input id="edit-username" name="username" defaultValue={editTarget.username} required />
                
                <Label htmlFor="edit-branchGroupName">Branch Group Name</Label>
                <Input id="edit-branchGroupName" name="branchGroupName" defaultValue={editTarget.branchGroupName} required />
                
                <Label htmlFor="edit-password">Password</Label>
                <Input id="edit-password" name="password" type="password" defaultValue={editTarget.password} required />
                
                <Label htmlFor="edit-mobileNo">Mobile No</Label>
                <Input id="edit-mobileNo" name="mobileNo" defaultValue={editTarget.mobileNo || ""} required />
                
                <Label htmlFor="edit-schoolId">School</Label>
                <Combobox
                  items={schoolOptions}
                  value={editSelectedSchool}
                  onValueChange={handleEditSchoolChange}
                  placeholder="Select School"
                  searchPlaceholder="Search Schools..."
                  emptyMessage="No schools found"
                />
                
                <Label htmlFor="edit-assignedBranches">Assigned Branches</Label>
                <BranchDropdown 
                  selectedBranches={editSelectedBranches} 
                  branchOptions={branchOptions} 
                  onBranchToggle={handleEditBranchToggle} 
                  onSelectAll={handleEditSelectAll} 
                />
                {editSelectedBranches.length > 0 && (
                  <div className="text-sm text-gray-600">Selected: {editSelectedBranches.length} branch(es)</div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={updateMutation.isPending}>{updateMutation.isPending ? "Updating..." : "Update Group"}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {deleteTarget && (
        <Alert<BranchGroupAccess>
          title="Are you absolutely sure?"
          description={`This will permanently delete the branch group "${deleteTarget?.branchGroupName}" and all associated data.`}
          actionButton={() => handleDelete()}
          target={deleteTarget}
          setTarget={setDeleteTarget}
          butttonText="Delete"
        />
      )}

      <FloatingMenu
        onExportPdf={() => exportToPDF(filteredData, columnsForExport, { title: "Branch Group Access Report", companyName: "Parents Eye", metadata: { Total: `${filteredData.length} groups` } })}
        onExportExcel={() => exportToExcel(filteredData, columnsForExport, { title: "Branch Group Access Report", companyName: "Parents Eye", metadata: { Total: `${filteredData.length} groups` } })}
      />
    </main>
  );
}