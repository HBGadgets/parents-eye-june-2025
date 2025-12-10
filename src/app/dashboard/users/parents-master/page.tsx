"use client";

import { getParentsColumns } from "@/components/columns/columns";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";
import { useDebounce } from "@/hooks/useDebounce";
import { useParent } from "@/hooks/useParents";
import { SortingState, PaginationState } from "@tanstack/react-table";
import { useEffect, useMemo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import AddParentForm from "@/components/parent/AddParentForm";
import { Parent } from "@/interface/modal";
import { useSchoolDropdown, useBranchDropdown } from "@/hooks/useDropdown";
import { jwtDecode } from "jwt-decode";
import Cookies from "js-cookie";
import { ColumnVisibilitySelector } from "@/components/column-visibility-selector";
import { SearchBar } from "@/components/search-bar/SearchBarPagination";
import { Combobox } from "@/components/ui/combobox";

type Filters = {
  search?: string;
  schoolId?: string;
  branchId?: string;
};

type DecodedToken = {
  role: string;
  schoolId?: string;
  id?: string;
  branchId?: string;
};

export default function ParentsMaster() {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 500);

  // Filter states - only set when user explicitly selects from dropdown
  const [filterSchoolId, setFilterSchoolId] = useState<string>();
  const [filterBranchId, setFilterBranchId] = useState<string>();

  // Form dropdown states - for dependent dropdown API calls
  const [schoolId, setSchoolId] = useState<string | undefined>();
  const [branchId, setBranchId] = useState<string | undefined>();

  const [decodedToken, setDecodedToken] = useState<DecodedToken>({ role: "" });
  const [showAddParent, setShowAddParent] = useState(false);
  const [selectedParent, setSelectedParent] = useState<Parent | null>(null);

  const role = decodedToken.role || "";

  // ---------------- Decode Token ----------------
  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) return;

    try {
      const decoded = jwtDecode<DecodedToken>(token);
      setDecodedToken(decoded);
    } catch (err) {
      console.error("Token decode failed", err);
    }
  }, []);

  const tokenSchoolId = useMemo(() => {
    if (role === "school") return decodedToken.id;
    if (role === "branchGroup") return decodedToken.schoolId;
    return decodedToken.schoolId;
  }, [role, decodedToken.id, decodedToken.schoolId]);

  const tokenBranchId = useMemo(
    () => (role === "branch" ? decodedToken.id : undefined),
    [role, decodedToken.id]
  );

  const tokenBranchGroupId = useMemo(
    () => (role === "branchGroup" ? decodedToken.id : undefined),
    [role, decodedToken.id]
  );

  // Set form dropdown states based on role to enable dependent dropdowns
  useEffect(() => {
    if (role === "school" && tokenSchoolId) {
      setSchoolId(tokenSchoolId); // Enables branch dropdown to fetch data
    }

    if (role === "branch" && tokenBranchId) {
      setBranchId(tokenBranchId); // Sets branch for form
    }

    if (role === "branchGroup" && tokenBranchGroupId) {
      setBranchId(tokenBranchGroupId); // Sets branch for form
    }
  }, [role, tokenSchoolId, tokenBranchId, tokenBranchGroupId]);

  // Clear branch filter when school filter is cleared
  useEffect(() => {
    if (!filterSchoolId) {
      setFilterBranchId(undefined);
    }
  }, [filterSchoolId]);

  // Filters object - only uses filter states, not form states
  const filters: Filters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      schoolId: filterSchoolId, // Only set when user selects from filter dropdown
      branchId: filterBranchId, // Only set when user selects from filter dropdown
    }),
    [debouncedSearch, filterSchoolId, filterBranchId]
  );

  // Reset pagination when filters change
  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [filters.search, filters.schoolId, filters.branchId]);

  // Determine if dropdowns should fetch based on role
  const shouldFetchSchools = role === "superAdmin";

  // Determine when to fetch branches based on role
  const shouldFetchBranches = useMemo(() => {
    if (role === "branch") return false; // Never fetch for branch role
    if (role === "branchGroup") return true; // Always fetch for branchGroup
    if (role === "school") return !!schoolId; // Fetch when schoolId exists
    if (role === "superAdmin") return !!(filterSchoolId || schoolId); // Fetch when filter is selected or form schoolId exists
    return false;
  }, [role, schoolId, filterSchoolId]);

  // Determine schoolId parameter for branch dropdown
  const branchDropdownSchoolId = useMemo(() => {
    if (role === "branchGroup") return undefined; // No schoolId needed for branchGroup
    return filterSchoolId || schoolId;
  }, [role, filterSchoolId, schoolId]);

  // Fetch schools dropdown (only for superAdmin)
  const { data: schools = [], isLoading: isLoadingSchools } =
    useSchoolDropdown(shouldFetchSchools);

  // Fetch branches dropdown based on selected school or token
  const { data: branches = [], isLoading: isLoadingBranches } =
    useBranchDropdown(
      branchDropdownSchoolId,
      shouldFetchBranches,
      role === "branchGroup"
    );

  const schoolItems = useMemo(
    () =>
      schools.map((s) => ({
        label: s.schoolName!,
        value: s._id,
      })),
    [schools]
  );

  const branchItems = useMemo(
    () =>
      branches.map((b) => ({
        label: b.branchName!,
        value: b._id,
      })),
    [branches]
  );

  const {
    parents,
    total,
    isLoading: isLoadingParents,
    deleteParent,
    createParentAsync,
    updateParent,
    isCreateLoading,
    isUpdateLoading,
    isDeleteLoading,
  } = useParent(pagination, sorting, filters);

  useEffect(() => {
    if (!isLoadingParents) setShowAddParent(false);
  }, [isLoadingParents]);

  const closeModal = useCallback(() => {
    setShowAddParent(false);
    setSelectedParent(null);
  }, []);

  // Handle edit
  const handleEdit = useCallback((parent: Parent) => {
    console.log("Editing parent:", parent);
    setSelectedParent(parent);

    // Extract IDs properly - handle both object and string formats
    const schoolIdValue =
      typeof parent.schoolId === "object"
        ? parent.schoolId?._id
        : parent.schoolId;
    const branchIdValue =
      typeof parent.branchId === "object"
        ? parent.branchId?._id
        : parent.branchId;

    setSchoolId(schoolIdValue);
    setBranchId(branchIdValue);
    setShowAddParent(true);
  }, []);

  // Handle delete
  const handleDelete = useCallback(
    (parent: Parent) => {
      if (confirm("Are you sure you want to delete this parent?")) {
        deleteParent(parent._id);
      }
    },
    [deleteParent]
  );

  // Handle form submission
  const handleFormSubmit = useCallback(
    async (data: {
      parentName: string;
      mobileNo: string;
      email: string;
      username: string;
      password?: string;
      schoolId?: string;
      branchId?: string;
    }) => {
      try {
        if (selectedParent) {
          await updateParent({
            id: selectedParent._id,
            payload: data,
          });
        } else {
          await createParentAsync(data);
        }
        closeModal();
      } catch (error) {
        console.error("Form submission error:", error);
      }
    },
    [selectedParent, updateParent, createParentAsync, closeModal]
  );

  const columns = useMemo(
    () => getParentsColumns(handleEdit, handleDelete),
    [handleEdit, handleDelete]
  );

  const { table, tableElement } = CustomTableServerSidePagination({
    data: parents || [],
    columns,
    pagination,
    totalCount: total,
    loading: isLoadingParents,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    sorting,
    emptyMessage: "No parents found",
    pageSizeOptions: [5, 10, 15, 20, 30, 50, 100, 500, 1000],
    showSerialNumber: true,
    enableSorting: true,
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Parents Master</h2>
      </div>

      {/* Filters and Actions */}
      <div className="flex justify-between items-center my-3 gap-3">
        <div className="flex gap-3 items-center">
          {/* Search Bar */}
          <SearchBar
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search parents..."
            width="w-[280px]"
          />

          {/* Column Visibility */}
          <ColumnVisibilitySelector
            columns={table.getAllColumns()}
            buttonVariant="outline"
            buttonSize="default"
          />

          <div className="flex gap-3 items-center">
            {/* SCHOOL FILTER */}
            {role === "superAdmin" && (
              <Combobox
                items={schoolItems}
                value={filterSchoolId}
                onValueChange={(val) => {
                  setFilterSchoolId(val || undefined);
                  setFilterBranchId(undefined);
                }}
                placeholder="Filter School"
                searchPlaceholder="Search School..."
                width="w-[220px]"
                emptyMessage="No schools found"
              />
            )}

            {/* BRANCH FILTER */}
            {(role === "superAdmin" ||
              role === "school" ||
              role === "branchGroup") && (
              <Combobox
                items={branchItems}
                value={filterBranchId}
                onValueChange={(val) => setFilterBranchId(val || undefined)}
                placeholder="Filter Branch"
                searchPlaceholder="Search Branch..."
                width="w-[220px]"
                emptyMessage="No branches found"
                disabled={role === "superAdmin" && !filterSchoolId}
              />
            )}
          </div>
        </div>

        {/* Add Parent Button */}
        <Button
          className="cursor-pointer"
          onClick={() => {
            setSelectedParent(null);
            setSchoolId(undefined);
            setBranchId(undefined);
            setShowAddParent(true);
          }}
          disabled={isCreateLoading}
        >
          {isCreateLoading ? "Adding..." : "Add Parent"}
        </Button>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 pb-3">{tableElement}</div>

      {/* Dialog with Form */}
      {showAddParent && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <AddParentForm
            onSubmit={handleFormSubmit}
            onClose={closeModal}
            initialData={selectedParent}
            schools={schools}
            branches={branches}
            selectedSchoolId={schoolId}
            selectedBranchId={branchId}
            onSchoolChange={setSchoolId}
            onBranchChange={setBranchId}
            decodedToken={decodedToken}
            isLoadingParents={isLoadingParents}
            isCreating={isCreateLoading}
            isUpdating={isUpdateLoading}
            isDeleting={isDeleteLoading}
          />
        </div>
      )}
    </div>
  );
}
