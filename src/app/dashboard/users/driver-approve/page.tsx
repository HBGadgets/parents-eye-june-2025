"use client";

import { getDriverColumns } from "@/components/columns/columns";
import { useDebounce } from "@/hooks/useDebounce";
import { useDriver } from "@/hooks/useDriver";
import { useBranchDropdown, useSchoolDropdown } from "@/hooks/useDropdown";
import { SortingState, PaginationState } from "@tanstack/react-table";
import { jwtDecode } from "jwt-decode";
import Cookies from "js-cookie";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";
import { SearchBar } from "@/components/search-bar/SearchBarPagination";
import { Button } from "@/components/ui/button";
import { FilterX } from "lucide-react";
import { Combobox } from "@/components/ui/combobox";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import AddDriverForm from "@/components/driver/add-driver";
import { driverService } from "@/services/api/driverService";
import { toast } from "sonner";

type DecodedToken = {
  role: string;
  schoolId?: string;
  id?: string;
  branchId?: string;
};

type Filters = {
  search?: string;
  schoolId?: string;
  branchId?: string;
  isApproved?: string;
};

export default function Driver() {
  const [showForm, setShowForm] = useState(false);
  const [editingDriver, setEditingDriver] = useState<any>(null);
  // ---------------- Pagination & Sorting ----------------
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);

  // ---------------- Search State ----------------
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 500);

  // ---------------- Filter State ----------------
  const [filterSchoolId, setFilterSchoolId] = useState<string>();
  const [filterBranchId, setFilterBranchId] = useState<string>();
  const [filterStatus, setFilterStatus] = useState<string>();

  // ---------------- Combobox Open States ----------------
  const [schoolOpen, setSchoolOpen] = useState(false);
  const [branchOpen, setBranchOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  // ---------------- Lazy Loading States ----------------
  const [shouldFetchSchools, setShouldFetchSchools] = useState(false);
  const [shouldFetchBranches, setShouldFetchBranches] = useState(false);

  // ---------------- Auth ----------------
  const [decodedToken, setDecodedToken] = useState<DecodedToken>({ role: "" });
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

  // ---------------- Role-based Defaults ----------------
  const tokenSchoolId = useMemo(
    () => (role === "school" ? decodedToken.id : decodedToken.schoolId),
    [role, decodedToken.id, decodedToken.schoolId]
  );

  const tokenBranchId = useMemo(
    () => (role === "branch" ? decodedToken.id : undefined),
    [role, decodedToken.id]
  );

  // ---------------- Apply Role Filters & Auto-fetch ----------------
  useEffect(() => {
    if (role === "school" && tokenSchoolId) {
      setFilterSchoolId(tokenSchoolId);
      setShouldFetchBranches(true);
    }
    if (role === "branch" && tokenBranchId) {
      setFilterBranchId(tokenBranchId);
    }
    if (role === "branchGroup") {
      setShouldFetchBranches(true);
    }
  }, [role, tokenSchoolId, tokenBranchId]);

  // ---------------- Reset Dependent Filters ----------------
  useEffect(() => {
    if (!filterSchoolId && role === "superAdmin") {
      setFilterBranchId(undefined);
      setShouldFetchBranches(false);
    }
  }, [filterSchoolId, role]);

  // ---------------- Lazy Dropdown Queries ----------------
  const { data: schools = [], isLoading: schoolsLoading } =
    useSchoolDropdown(shouldFetchSchools);

  const { data: branches = [], isLoading: branchesLoading } = useBranchDropdown(
    filterSchoolId,
    shouldFetchBranches,
    role === "branchGroup"
  );

  // ---------------- Dropdown Items ----------------
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

  const statusItems = [
    { label: "Approved", value: "Approved" },
    { label: "Rejected", value: "Rejected" },
    { label: "Pending", value: "Pending" },
  ];

  // ---------------- API Filters ----------------
  const filters: Filters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      schoolId: filterSchoolId,
      branchId: filterBranchId,
      isApproved: filterStatus,
    }),
    [debouncedSearch, filterSchoolId, filterBranchId, filterStatus]
  );

  // ---------------- Reset Pagination When Filters Change ----------------
  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [filters.search, filters.schoolId, filters.branchId, filters.isApproved]);

  const {
    driver,
    total,
    isLoading: isDriverLoading,
    deleteDriver,
    updateDriver,
    createDriver,
    approveDriver,
    isApproveLoading,
    isCreateDriver,
    isUpdateDriver,
    isDeleteDriver,
  } = useDriver(pagination, sorting, filters);

  const handleDelete = useCallback(
    async (row: any) => {
      try {
        if (!confirm("Are you sure you want to delete this driver?")) return;
        deleteDriver(row._id);
      } catch (err: any) {
        console.error("Error deleting driver:", err);
        alert(err?.message || "Failed to delete driver");
      }
    },
    [deleteDriver]
  );

  const handleEdit = useCallback((row: any) => {
    setEditingDriver(row);
    setShowForm(true);
  }, []);

  const handleFormSubmit = useCallback(
    async (data: any) => {
      if (editingDriver) {
        try {
          const check = await driverService.checkAlreadyAssign(
            data.deviceObjId
          );

          if (check?.assigned) {
            const userConfirmed = confirm(
              `${check.message}. Do you still want to continue?`
            );
            if (!userConfirmed) return;
          }
          updateDriver({ id: editingDriver._id, payload: data });
        } catch (err: any) {
          toast.error(err?.message || "Update failed");
        }
      } else {
        console.log("[Create Driver]", data);
        if (data.deviceObjId === "") {
          createDriver(data);
        } else {
          try {
            const check = await driverService.checkAlreadyAssign(
              data?.deviceObjId
            );

            if (check?.assigned) {
              const userConfirmed = confirm(
                `${check.message}. Do you still want to continue?`
              );
              if (!userConfirmed) return;
            }
            createDriver(data);
          } catch (err: any) {
            toast.error(err?.message || "Create failed");
          }
        }
      }
      setShowForm(false);
      setEditingDriver(null);
    },
    [editingDriver, updateDriver, createDriver]
  );

  const handleFormClose = useCallback(() => {
    setShowForm(false);
    setEditingDriver(null);
  }, []);

  // ---------------- Clear Filters ----------------
  const handleClearFilters = useCallback(() => {
    setSearchInput("");
    if (role === "superAdmin") {
      setFilterSchoolId(undefined);
      setShouldFetchBranches(false);
    }
    if (role === "superAdmin" || role === "school" || role === "branchGroup") {
      setFilterBranchId(undefined);
    }
    setFilterStatus(undefined);
  }, [role]);

  // ---------------- Check Active Filters ----------------
  const hasActiveFilters = useMemo(() => {
    return (
      searchInput !== "" ||
      (role === "superAdmin" && filterSchoolId !== undefined) ||
      ((role === "superAdmin" || role === "school" || role === "branchGroup") &&
        filterBranchId !== undefined) ||
      filterStatus !== undefined
    );
  }, [searchInput, filterSchoolId, filterBranchId, filterStatus, role]);

  // ---------------- Table columns ----------------
  const columns = useMemo(() => {
    const cols = [...getDriverColumns(handleEdit, handleDelete)];
    cols.splice(cols.length - 1, 0, {
      header: "Registration Status",
      cell: ({ row }) => {
        const { isApproved, _id } = row.original;

        const StatusSegmentedControl = () => {
          const [status, setStatus] = useState(isApproved);

          const handleStatusChange = (newStaus) => {
            setStatus(newStaus);
            approveDriver({
              id: _id,
              isApproved: newStaus,
            });
          };

          const statuses = [
            {
              value: "Approved",
              label: "Approved",
              color: "bg-green-100 text-green-700 border-green-300",
            },
            {
              value: "Rejected",
              label: "Rejected",
              color: "bg-red-100 text-red-700 border-red-300",
            },
          ];

          return (
            <div className="inline-flex rounded-md border border-gray-200 bg-gray-50 p-1">
              {statuses.map(({ value, label, color }) => (
                <button
                  key={value}
                  onClick={() => handleStatusChange(value)}
                  disabled={isApproveLoading}
                  className={`
                  px-3 py-1 text-xs font-medium rounded transition-all duration-200
                  ${
                    status === value
                      ? color
                      : "bg-transparent text-gray-600 hover:bg-gray-100"
                  }
                  ${
                    isApproveLoading
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer"
                  }
                `}
                >
                  {label}
                </button>
              ))}
            </div>
          );
        };

        return <StatusSegmentedControl />;
      },
    });
    return cols;
  }, [handleDelete, handleEdit, isApproveLoading, approveDriver]);

  // ---------------- Table ----------------
  const { table, tableElement } = CustomTableServerSidePagination({
    data: driver || [],
    columns,
    pagination,
    totalCount: total,
    loading: isDriverLoading,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    sorting,
    emptyMessage: "No drivers found",
    manualPagination: true,
    pageSizeOptions: [5, 10, 15, 20, 30, 50, 100, 200, 300, 400, 500],
    showSerialNumber: true,
    enableSorting: true,
    enableMultiSelect: false,
  });

  return (
    <div className="flex flex-col h-full">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold mb-3">Drivers</h2>
        {/* Clear Filters Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleClearFilters}
          className={`cursor-pointer flex items-center gap-2 ${
            !hasActiveFilters ? "opacity-50 cursor-not-allowed" : ""
          }`}
          disabled={!hasActiveFilters}
        >
          <FilterX className="h-4 w-4" />
          Clear Filters
        </Button>
      </div>

      <div className="flex justify-between">
        {/* SEARCH & FILTERS BAR */}
        <div className="flex flex-wrap items-center gap-3 my-3">
          {/* Search Bar */}
          <div className="flex gap-2 items-center">
            <SearchBar
              value={searchInput}
              onChange={setSearchInput}
              placeholder="Search drivers..."
              width="w-[280px]"
            />
            {isDriverLoading && debouncedSearch && (
              <div className="text-sm text-muted-foreground whitespace-nowrap">
                Searching...
              </div>
            )}
          </div>

          {/* School Filter (SuperAdmin only) */}
          {role === "superAdmin" && (
            <Combobox
              items={schoolItems}
              value={filterSchoolId}
              onValueChange={(value) => {
                setFilterSchoolId(value);
                if (value) {
                  setShouldFetchBranches(true);
                }
              }}
              className="cursor-pointer"
              placeholder="Select School"
              searchPlaceholder="Search schools..."
              emptyMessage={
                schoolsLoading ? "Loading schools..." : "No school found."
              }
              width="w-[150px]"
              open={schoolOpen}
              onOpenChange={(open) => {
                setSchoolOpen(open);
                if (open) {
                  setShouldFetchSchools(true);
                }
              }}
            />
          )}

          {/* Branch Filter (SuperAdmin, School, BranchGroup) */}
          {(role === "superAdmin" ||
            role === "school" ||
            role === "branchGroup") && (
            <Combobox
              items={branchItems}
              value={filterBranchId}
              onValueChange={setFilterBranchId}
              className="cursor-pointer"
              placeholder="Select Branch"
              searchPlaceholder="Search branches..."
              emptyMessage={
                branchesLoading ? "Loading branches..." : "No branch found."
              }
              width="w-[150px]"
              disabled={role === "superAdmin" && !filterSchoolId}
              open={branchOpen}
              onOpenChange={(open) => {
                setBranchOpen(open);
                if (open && role !== "school") {
                  setShouldFetchBranches(true);
                }
              }}
            />
          )}

          {/* Status Filter */}
          <Combobox
            items={statusItems}
            value={filterStatus}
            onValueChange={setFilterStatus}
            className="cursor-pointer"
            placeholder="Select Status"
            searchPlaceholder="Search statuses..."
            emptyMessage="No status found."
            width="w-[150px]"
            open={statusOpen}
            onOpenChange={setStatusOpen}
          />
        </div>

        {/*Add Driver*/}
        <div className="flex items-center justify-between">
          <Button
            onClick={() => setShowForm(true)}
            className="mb-3 cursor-pointer"
          >
            Add Driver
          </Button>
        </div>
      </div>

      {/* RESULTS COUNT */}
      {hasActiveFilters && (
        <div className="text-sm text-muted-foreground mb-2">
          {total} driver{total !== 1 ? "s" : ""} found
          {searchInput && ` matching "${searchInput}"`}
        </div>
      )}

      {/* TABLE */}
      <div className="flex-1 min-h-0 mb-3 pb-3">{tableElement}</div>

      {showForm && (
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="p-0 max-w-[700px] w-full">
            <AddDriverForm
              onSubmit={handleFormSubmit}
              onClose={handleFormClose}
              initialData={editingDriver}
              isCreating={isCreateDriver}
              isUpdating={isUpdateDriver}
              decodedToken={decodedToken}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
