"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRoutes } from "@/hooks/useRoute";
import { PaginationState, SortingState } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Route } from "@/interface/modal";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";
import { getRouteColumns } from "@/components/columns/columns";
import AddRouteForm from "@/components/route/AddRouteForm";
import {
  useBranchDropdown,
  useSchoolDropdown,
  useDeviceDropdown,
} from "@/hooks/useDropdown";
import { SearchBar } from "@/components/search-bar/SearchBarPagination";
import { useDebounce } from "@/hooks/useDebounce";
import { jwtDecode } from "jwt-decode";
import { Combobox } from "@/components/ui/combobox";
import Cookies from "js-cookie";
import { ColumnVisibilitySelector } from "@/components/column-visibility-selector";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { routeService } from "@/services/api/routeService";
import { toast } from "sonner";

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

export default function RoutePage() {
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

  // Form dropdown states - for dependent dropdown API calls
  const [schoolId, setSchoolId] = useState<string | undefined>();
  const [branchId, setBranchId] = useState<string | undefined>();
  const [shouldFetchDevices, setShouldFetchDevices] = useState(false);

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
      setShouldFetchDevices(true); // Enables device dropdown to fetch data
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

  // Dropdown data hooks - use form states for dependent fetching
  const { data: schools = [] } = useSchoolDropdown(role === "superAdmin");

  // Determine when to fetch branches based on role
  const shouldFetchBranches = useMemo(() => {
    if (role === "branch") return false; // Never fetch for branch role (comes from token)
    if (role === "branchGroup") return true; // Always fetch for branchGroup (all branches)
    if (role === "school") return !!schoolId; // Fetch when schoolId exists
    if (role === "superAdmin") return !!(filterSchoolId || schoolId); // Fetch when filter is selected or form schoolId exists
    return false;
  }, [role, schoolId, filterSchoolId]);

  // Determine schoolId parameter for branch dropdown
  const branchDropdownSchoolId = useMemo(() => {
    if (role === "branchGroup") return undefined; // No schoolId needed for branchGroup
    return filterSchoolId || schoolId;
  }, [role, filterSchoolId, schoolId]);

  const { data: branches = [] } = useBranchDropdown(
    branchDropdownSchoolId,
    shouldFetchBranches,
    role === "branchGroup"
  );

  const { data: devices = [], isLoading: isLoadingDevices } = useDeviceDropdown(
    branchId,
    shouldFetchDevices
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
    routes,
    total,
    isLoading: isLoadingRoutes,
    deleteRoute,
    updateRoute,
    createRoute,
    exportExcel,
    exportPdf,
    isCreating,
    isUpdating,
    isDeleting,
    isExcelExporting,
    isPdfExporting,
  } = useRoutes(pagination, sorting, filters);

  const [showForm, setShowForm] = useState(false);
  const [editRoute, setEditRoute] = useState<Route | null>(null);

  useEffect(() => {
    if (!isLoadingRoutes) setShowForm(false);
  }, [isLoadingRoutes]);

  const closeModal = useCallback(() => {
    setShowForm(false);
    setEditRoute(null);
  }, []);

  const handleEdit = useCallback((row: Route) => {
    setEditRoute?.(row);
    setSchoolId?.(row?.schoolId?._id);
    setBranchId?.(row?.branchId?._id);
    setShowForm?.(true);
  }, []);

  const handleCreateRoute = useCallback(async (payload: any) => {
    try {
      const check = await routeService.checkAlreadyAssign(payload?.deviceObjId);

      if (check?.assigned) {
        const userConfirmed = confirm(
          `${check.message}. Do you still want to assign this route number to this vehicle?`
        );
        if (!userConfirmed) return;
      }

      createRoute(payload);
    } catch (error: any) {
      toast.error(error?.message || "Failed to create route");
    }
  }, []);

  const handleUpdateRoute = useCallback(
    async (editRoute: Route, payload: any) => {
      try {
        const check = await routeService.checkAlreadyAssign(
          payload?.deviceObjId
        );

        if (check?.assigned) {
          const userConfirmed = confirm(
            `${check.message}. Do you still want to assign this route number to this vehicle? If you continue, the previous route assignment will be replaced.`
          );
          if (!userConfirmed) return;
        }

        updateRoute({ id: editRoute?._id, payload: payload });
      } catch (error: any) {
        toast.error(error?.message || "Failed to update route");
      }
    },
    []
  );

  const handleDelete = useCallback(
    (row: Route) => {
      if (confirm("Delete this route?")) {
        deleteRoute(row._id);
      }
    },
    [deleteRoute]
  );

  // -------------- Excel Export Handler ----------------
  const handleExcelExport = () => {
    exportExcel({
      search: filters.search,
      branchId: filters.branchId,
      schoolId: filters.schoolId,
      sortBy: sorting[0]?.id,
      sortOrder: sorting[0]?.desc ? "desc" : "asc",
    });
  };

  // ---------------- PDF Export Handler ----------------
  const handlePDFExport = () => {
    exportPdf({
      search: filters.search,
      branchId: filters.branchId,
      schoolId: filters.schoolId,
      sortBy: sorting[0]?.id,
      sortOrder: sorting[0]?.desc ? "desc" : "asc",
    });
  };

  const columns = useMemo(
    () => getRouteColumns(handleEdit, handleDelete),
    [handleEdit, handleDelete]
  );

  const { table, tableElement } = CustomTableServerSidePagination({
    data: routes || [],
    columns,
    pagination,
    totalCount: total,
    loading: isLoadingRoutes,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    sorting,
    emptyMessage: "No routes found",
    pageSizeOptions: [5, 10, 15, 20, 30],
    showSerialNumber: true,
    enableSorting: true,
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Routes</h2>
        <div className="mr-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="cursor-pointer"
                disabled={isExcelExporting || isPdfExporting}
              >
                {isExcelExporting || isPdfExporting ? "Exporting..." : "Export"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={handleExcelExport}
              >
                Export to Excel
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={handlePDFExport}
              >
                Export to PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex justify-between items-center my-3 gap-3">
        <div className="flex gap-3 items-center">
          <SearchBar
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search by route number..."
            width="w-[280px]"
          />

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

        <Button
          className="cursor-pointer"
          onClick={() => {
            setEditRoute(null);
            setSchoolId(undefined);
            setBranchId(undefined);
            setShowForm(true);
          }}
        >
          Add Route
        </Button>
      </div>

      <div className="flex-1 min-h-0 pb-3">{tableElement}</div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <AddRouteForm
            initialData={editRoute}
            onClose={closeModal}
            onSubmit={(data) => {
              if (editRoute) {
                // updateRoute({ id: editRoute._id, payload: data });
                handleUpdateRoute(editRoute, data);
              } else {
                handleCreateRoute(data);
              }
            }}
            decodedToken={decodedToken}
            schools={schools}
            branches={branches}
            devices={devices}
            selectedSchoolId={schoolId}
            selectedBranchId={branchId}
            onSchoolChange={setSchoolId}
            onBranchChange={setBranchId}
            shouldFetchDevices={shouldFetchDevices}
            onFetchDevices={setShouldFetchDevices}
            isLoadingDevices={isLoadingDevices}
            isLoadingRoutes={isLoadingRoutes}
            isCreating={isCreating}
            isUpdating={isUpdating}
            isDeleting={isDeleting}
          />
        </div>
      )}
    </div>
  );
}
