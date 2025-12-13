"use client";

import { getDriverColumns } from "@/components/columns/columns";
import { useDebounce } from "@/hooks/useDebounce";
import { useDriver } from "@/hooks/useDriver";
import {
  useBranchDropdown,
  useDeviceDropdown,
  useRouteDropdown,
  useSchoolDropdown,
} from "@/hooks/useDropdown";
import { SortingState, PaginationState } from "@tanstack/react-table";
import { jwtDecode } from "jwt-decode";
import Cookies from "js-cookie";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";
import { SearchBar } from "@/components/search-bar/SearchBarPagination";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { Combobox } from "@/components/ui/combobox";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import AddDriverForm from "@/components/driver/add-driver";

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
  routeObjId?: string;
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
  const [filterRouteId, setFilterRouteId] = useState<string>();

  // ---------------- Combobox Open States ----------------
  const [schoolOpen, setSchoolOpen] = useState(false);
  const [branchOpen, setBranchOpen] = useState(false);
  const [routeOpen, setRouteOpen] = useState(false);

  // ---------------- Lazy Loading States ----------------
  const [shouldFetchSchools, setShouldFetchSchools] = useState(false);
  const [shouldFetchBranches, setShouldFetchBranches] = useState(false);
  const [shouldFetchRoutes, setShouldFetchRoutes] = useState(false);
const [shouldFetchDevices, setShouldFetchDevices] = useState(false);
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

  const tokenBranchGroupSchoolId = useMemo(
    () => (role === "branchGroup" ? decodedToken.schoolId : undefined),
    [role, decodedToken.schoolId]
  );

  // ---------------- Apply Role Filters & Auto-fetch ----------------
  useEffect(() => {
    if (role === "school" && tokenSchoolId) {
      setFilterSchoolId(tokenSchoolId);
      setShouldFetchBranches(true);
    }
    if (role === "branch" && tokenBranchId) {
      setFilterBranchId(tokenBranchId);
      setShouldFetchRoutes(true);
    }
    if (role === "branchGroup") {
      setShouldFetchBranches(true);
    }
  }, [role, tokenSchoolId, tokenBranchId]);

  // ---------------- Reset Dependent Filters ----------------
  useEffect(() => {
    if (!filterSchoolId && role === "superAdmin") {
      setFilterBranchId(undefined);
      setFilterRouteId(undefined);
      setShouldFetchBranches(false);
    }
  }, [filterSchoolId, role]);

  useEffect(() => {
    if (!filterBranchId) {
      setFilterRouteId(undefined);
      setShouldFetchRoutes(false);
      setShouldFetchDevices(false);
    }
  }, [filterBranchId]);

  // ---------------- Lazy Dropdown Queries ----------------
  const { data: schools = [], isLoading: schoolsLoading } =
    useSchoolDropdown(shouldFetchSchools);

  const { data: branches = [], isLoading: branchesLoading } = useBranchDropdown(
    filterSchoolId,
    shouldFetchBranches,
    role === "branchGroup"
  );

  const { data: routes = [], isLoading: routesLoading } = useRouteDropdown(
    filterBranchId,
    shouldFetchRoutes
  );

  const { data: devices = [], isLoading: devicesLoading } = useDeviceDropdown(
    filterBranchId,
    shouldFetchDevices
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

  const routeItems = useMemo(
    () =>
      routes.map((r: any) => ({
        label: r.routeNumber,
        value: r._id,
      })),
    [routes]
  );
  

  // ---------------- API Filters ----------------
  const filters: Filters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      schoolId: filterSchoolId,
      branchId: filterBranchId,
      routeObjId: filterRouteId,
    }),
    [debouncedSearch, filterSchoolId, filterBranchId, filterRouteId]
  );

  // ---------------- Reset Pagination When Filters Change ----------------
  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [filters.search, filters.schoolId, filters.branchId, filters.routeObjId]);

  const {
    driver,
    total,
    isLoading: isDriverLoading,
    deleteDriver,
    updateDriver,
    createDriver,
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
    console.log("Editing driver with id:", row._id);
    setEditingDriver(row);
    setShowForm(true);
  }, []);

  const handleFormSubmit = useCallback(
    (data: any) => {
      if (editingDriver) {
        updateDriver({ id: editingDriver._id, payload: data });
      } else {
        createDriver(data);
      }
      setShowForm(false);
      setEditingDriver(null);
    },
    [editingDriver, updateDriver, createDriver]
  );

  const handleApprove = useCallback((row: any) => {
    console.log("Approving driver with id:", row._id);
  }, []);

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
      setShouldFetchRoutes(false);
    }
    setFilterRouteId(undefined);
  }, [role]);

  // ---------------- Check Active Filters ----------------
  const hasActiveFilters = useMemo(() => {
    return (
      searchInput !== "" ||
      (role === "superAdmin" && filterSchoolId !== undefined) ||
      ((role === "superAdmin" || role === "school" || role === "branchGroup") &&
        filterBranchId !== undefined) ||
      filterRouteId !== undefined
    );
  }, [searchInput, filterSchoolId, filterBranchId, filterRouteId, role]);

  // ---------------- Table columns ----------------
  const columns = useMemo(
    () => getDriverColumns(handleEdit, handleDelete, handleApprove),
    [handleDelete, handleEdit, handleApprove]
  );

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
              placeholder="Select School"
              searchPlaceholder="Search schools..."
              emptyMessage={
                schoolsLoading ? "Loading schools..." : "No school found."
              }
              width="w-[200px]"
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
              onValueChange={(value) => {
                setFilterBranchId(value);
                if (value) {
                  setShouldFetchRoutes(true);
                }
              }}
              placeholder="Select Branch"
              searchPlaceholder="Search branches..."
              emptyMessage={
                branchesLoading ? "Loading branches..." : "No branch found."
              }
              width="w-[200px]"
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

          {/* Route Filter (All roles except SuperAdmin without branch) */}
          {(role === "branch" ||
            role === "superAdmin" ||
            role === "school" ||
            role === "branchGroup") && (
            <Combobox
              items={routeItems}
              value={filterRouteId}
              onValueChange={setFilterRouteId}
              placeholder="Select Route"
              searchPlaceholder="Search routes..."
              emptyMessage={
                routesLoading ? "Loading routes..." : "No route found."
              }
              width="w-[200px]"
              disabled={
                (role === "superAdmin" ||
                  role === "school" ||
                  role === "branchGroup") &&
                !filterBranchId
              }
              open={routeOpen}
              onOpenChange={(open) => {
                setRouteOpen(open);
                if (open && role !== "branch") {
                  setShouldFetchRoutes(true);
                }
              }}
              // Add these props if your useRouteDropdown supports pagination
              onReachEnd={() => {
                // Implement load more routes logic here if needed
                console.log("Load more routes");
              }}
              isLoadingMore={false} // Set to true when loading more data
            />
          )}

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Clear Filters
            </Button>
          )}
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
          <DialogContent className="p-0 max-w-fit">
            <AddDriverForm
              onSubmit={handleFormSubmit}
              onClose={handleFormClose}
              initialData={editingDriver}
              schools={schools}
              branches={branches}
              devices={devices}
              selectedSchoolId={filterSchoolId}
              selectedBranchId={filterBranchId}
              onSchoolChange={setFilterSchoolId}
              onBranchChange={setFilterBranchId}
              isLoadingBranches={branchesLoading}
              isLoadingDevices={devicesLoading}
              isCreating={isCreateDriver}
              isUpdating={isUpdateDriver}
              onFetchBranches={setShouldFetchBranches}
              onFetchDevices={setShouldFetchDevices}
              decodedToken={decodedToken}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
