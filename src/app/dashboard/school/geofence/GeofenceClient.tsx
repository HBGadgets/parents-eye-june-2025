"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { VisibilityState } from "@tanstack/react-table";
import GeofenceManager from "@/components/geofence-manager/GeofenceManager";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogClose,
} from "@/components/ui/dialog";
import { X, Trash2, FilterX } from "lucide-react";
import { DialogTitle } from "@radix-ui/react-dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";
import type { Branch, Geofence, Route, School } from "@/interface/modal";
import { useGeofence } from "@/hooks/useGeofence";
import { getGeofenceCoumns } from "@/components/columns/columns";
import { jwtDecode } from "jwt-decode";
import Cookies from "js-cookie";
import { Combobox } from "@/components/ui/combobox";
import { SearchBar } from "@/components/search-bar/SearchBarPagination";
import { useDebounce } from "@/hooks/useDebounce";
import { useBranchDropdown, useSchoolDropdown } from "@/hooks/useDropdown";
import { ColumnVisibilitySelector } from "@/components/column-visibility-selector";
import { useGeofenceStore } from "@/store/geofenceStore";

type DecodedToken = {
  role: string;
  schoolId?: string;
  id?: string;
};

type Filters = {
  search?: string;
  schoolId?: string;
  branchId?: string;
};

export default function GeofenceClient() {
  const [open, setOpen] = useState(false);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 500);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [mode, setMode] = useState<"add" | "edit">("add");
  const [geofenceId, setGeofenceId] = useState<string | null>(null);
  const [geofenceRouteId, setGeofenceRouteId] = useState<Route | null>(null);
  const [geofenceSchoolId, setGeofenceSchoolId] = useState<School | null>(null);
  const [geofenceBranchId, setGeofenceBranchId] = useState<Branch | null>(null);
  const [selectedGeofence, setSelectedGeofence] = useState<Geofence | null>(
    null
  );

  // Filter states - only set when user explicitly selects from dropdown
  const [filterSchoolId, setFilterSchoolId] = useState<string>();
  const [filterBranchId, setFilterBranchId] = useState<string>();

  // Form dropdown states - for dependent dropdown API calls (if needed in GeofenceManager)
  const [schoolId, setSchoolId] = useState<string | undefined>();
  const [branchId, setBranchId] = useState<string | undefined>();
  // const [rowData, setRowData] = useState<Geofence>({ } as Geofence);
  const setEditData = useGeofenceStore((state) => state.setRowData);

  const [decodedToken, setDecodedToken] = useState<DecodedToken>({ role: "" });

  const role = decodedToken.role || "";

  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) return;

    try {
      const decoded = jwtDecode<DecodedToken>(token);
      setDecodedToken(decoded);
    } catch (err) {
      console.error("Failed to decode token", err);
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

  // Set form dropdown states based on role
  useEffect(() => {
    if (role === "school" && tokenSchoolId) {
      setSchoolId(tokenSchoolId);
    }

    if (role === "branch" && tokenBranchId) {
      setBranchId(tokenBranchId);
    }

    if (role === "branchGroup" && tokenBranchGroupId) {
      setBranchId(tokenBranchGroupId);
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
      schoolId: filterSchoolId,
      branchId: filterBranchId,
    }),
    [debouncedSearch, filterSchoolId, filterBranchId]
  );

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return !!(searchInput || filterSchoolId || filterBranchId);
  }, [searchInput, filterSchoolId, filterBranchId]);

  // Clear all filters handler
  const handleClearFilters = useCallback(() => {
    setSearchInput("");
    setFilterSchoolId(undefined);
    setFilterBranchId(undefined);
  }, []);

  // Reset pagination when filters change
  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [filters.search, filters.schoolId, filters.branchId]);

  // Dropdown data hooks
  const { data: schools = [] } = useSchoolDropdown(role === "superAdmin");

  // Determine when to fetch branches based on role
  const shouldFetchBranches = useMemo(() => {
    if (role === "branch") return false;
    if (role === "branchGroup") return true;
    if (role === "school") return !!schoolId;
    if (role === "superAdmin") return !!(filterSchoolId || schoolId);
    return false;
  }, [role, schoolId, filterSchoolId]);

  // Determine schoolId parameter for branch dropdown
  const branchDropdownSchoolId = useMemo(() => {
    if (role === "branchGroup") return undefined;
    return filterSchoolId || schoolId;
  }, [role, filterSchoolId, schoolId]);

  const { data: branches = [] } = useBranchDropdown(
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

  // Use the custom hook with filters
  const { geofence, isLoading, total, deleteGeofence, isDeleteLoading } =
    useGeofence(pagination, sorting, filters);

  const handleDialogChange = (isOpen: boolean) => {
    setOpen(isOpen);

    if (!isOpen) {
      setSelectedGeofence(null);
      setGeofenceId(null);
      setGeofenceRouteId(null);
      setGeofenceSchoolId(null);
      setGeofenceBranchId(null);
      setMode("add");
    }
  };

  const handleAddGeofence = () => {
    setMode("add");
    setSelectedGeofence(null);
    setGeofenceId(null);
    setGeofenceRouteId(null);
    setGeofenceSchoolId(null);
    setGeofenceBranchId(null);
    setSchoolId(undefined);
    setBranchId(undefined);
    setOpen(true);
  };

  const handleDelete = (geofence: Geofence) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${geofence.geofenceName}"? This action cannot be undone.`
    );

    if (confirmed) {
      deleteGeofence([geofence._id]);
    }
  };

  // Bulk delete handler
  const handleBulkDelete = useCallback(
    (selectedIds: (string | number)[]) => {
      if (selectedIds.length === 0) {
        alert("Please select at least one geofence to delete.");
        return;
      }

      const confirmed = window.confirm(
        `Are you sure you want to delete ${selectedIds.length} geofence(s)? This action cannot be undone.`
      );

      if (confirmed) {
        deleteGeofence(selectedIds as string[]);
      }
    },
    [deleteGeofence]
  );

  const handleEdit = useCallback((row: Geofence) => {
    setEditData(row);

    setSelectedGeofence(row);
    setGeofenceId(row._id);

    // Set the nested objects correctly
    // setGeofenceSchoolId(row.?schoolId);
    // setGeofenceBranchId(row.?branchId);
    setGeofenceRouteId(row.route || null);

    setMode("edit");
    setOpen(true);
  }, []);

  const columns = useMemo(
    () => getGeofenceCoumns(handleEdit, handleDelete),
    [handleEdit, handleDelete]
  );

  const { tableElement, selectedRows, table } = CustomTableServerSidePagination(
    {
      data: geofence || [],
      columns,
      pagination,
      totalCount: total || 0,
      loading: isLoading,
      onPaginationChange: setPagination,
      onSortingChange: setSorting,
      sorting,
      columnVisibility,
      onColumnVisibilityChange: setColumnVisibility,
      emptyMessage: "No geofence found",
      pageSizeOptions: [5, 10, 20, 30, 50],
      enableSorting: true,
      showSerialNumber: true,
      enableMultiSelect: true,
      getRowId: (row) => row._id,
    }
  );

  return (
    <div className="flex flex-col h-full">
      <header>
        <Dialog open={open} onOpenChange={handleDialogChange}>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Geofences</h2>
            {/* Bulk Delete Button */}
            <Button
              variant="destructive"
              className={`cursor-pointer flex items-center gap-2 ${
                selectedRows.length > 0
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : "cursor-not-allowed opacity-50"
              }`}
              onClick={() => handleBulkDelete(selectedRows)}
              disabled={isDeleteLoading || selectedRows.length === 0}
            >
              <Trash2 className="h-4 w-4" />
              Delete ({selectedRows.length})
            </Button>
          </div>

          <DialogContent className="w-screen h-screen max-w-none max-h-none p-0 rounded-none !m-0 !left-0 !top-0 !transform-none !translate-x-0 !translate-y-0">
            <VisuallyHidden>
              <DialogTitle>
                {mode === "add" ? "Add Geofence" : "Edit Geofence"}
              </DialogTitle>
            </VisuallyHidden>
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 z-[1000] cursor-pointer"
              >
                <X className="h-6 w-6" />
              </Button>
            </DialogClose>

            {/* Add key prop to force remount */}
            <GeofenceManager
              key={geofenceId || "new"} // This forces React to create a new instance
              mode={mode}
              initialData={selectedGeofence}
              geofenceId={geofenceId}
              geofenceRouteId={geofenceRouteId}
              geofenceSchoolId={geofenceSchoolId}
              geofenceBranchId={geofenceBranchId}
              onSuccess={() => {
                handleDialogChange(false);
              }}
            />
          </DialogContent>
        </Dialog>
      </header>

      <div className="flex justify-between items-center my-3">
        <div className="flex gap-3 items-center">
          <SearchBar
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search by geofence name..."
            width="w-[280px]"
          />

          <ColumnVisibilitySelector
            className="cursor-pointer"
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
                width="w-[150px]"
                className="cursor-pointer"
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
                width="w-[150px]"
                className="cursor-pointer"
                emptyMessage="No branches found"
                disabled={role === "superAdmin" && !filterSchoolId}
              />
            )}

            {/* CLEAR FILTERS BUTTON */}
            <Button
              variant="outline"
              size="default"
              className={`cursor-pointer flex items-center gap-2 ${
                !hasActiveFilters ? "opacity-50 cursor-not-allowed" : ""
              }`}
              onClick={handleClearFilters}
              disabled={!hasActiveFilters}
            >
              <FilterX className="h-4 w-4" />
              Clear Filters
            </Button>
          </div>
        </div>

        <div>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="cursor-pointer" onClick={handleAddGeofence}>
                Add Geofence
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      </div>

      <main className="flex-1 min-h-0 pb-3">
        <section>{tableElement}</section>
      </main>
    </div>
  );
}
