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

  const tokenSchoolId = useMemo(
    () => (role === "school" ? decodedToken.id : decodedToken.schoolId),
    [role, decodedToken.id, decodedToken.schoolId]
  );

  const tokenBranchId = useMemo(
    () => (role === "branch" ? decodedToken.id : undefined),
    [role, decodedToken.id]
  );

  const [schoolId, setSchoolId] = useState<string | undefined>();
  const [branchId, setBranchId] = useState<string | undefined>();

  useEffect(() => {
    if (role === "school" && tokenSchoolId) {
      setFilterSchoolId(tokenSchoolId);
      setSchoolId(tokenSchoolId);
    }

    if (role === "branch" && tokenBranchId) {
      setFilterBranchId(tokenBranchId);
      setBranchId(tokenBranchId);
    }
  }, [role, tokenSchoolId, tokenBranchId]);

  useEffect(() => {
    if (!filterSchoolId) {
      setFilterBranchId(undefined);
    }
  }, [filterSchoolId]);

  const filters: Filters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      schoolId: filterSchoolId,
      branchId: filterBranchId,
    }),
    [debouncedSearch, filterSchoolId, filterBranchId]
  );

  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [filters.search, filters.schoolId, filters.branchId]);

  const { data: schools = [] } = useSchoolDropdown();
  const { data: branches = [] } = useBranchDropdown(schoolId);
  const { data: devices = [] } = useDeviceDropdown(branchId);

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
  const { routes, total, isLoading, deleteRoute, updateRoute, createRoute } =
    useRoutes(pagination, sorting, filters);

  const [showForm, setShowForm] = useState(false);

  const [editRoute, setEditRoute] = useState<Route | null>(null);

  useEffect(() => {
    if (!isLoading) setShowForm(false);
  }, [isLoading]);

  const closeModal = useCallback(() => {
    setShowForm(false);
    setEditRoute(null);
  }, []);

  const handleEdit = useCallback((row: Route) => {
    setEditRoute(row);
    setSchoolId(row.schoolId._id);
    setBranchId(row.branchId._id);
    setShowForm(true);
  }, []);

  const handleDelete = useCallback(
    (row: Route) => {
      if (confirm("Delete this route?")) {
        deleteRoute(row._id);
      }
    },
    [deleteRoute]
  );

  const columns = useMemo(
    () => getRouteColumns(handleEdit, handleDelete),
    [handleEdit, handleDelete]
  );

  const { tableElement } = CustomTableServerSidePagination({
    data: routes || [],
    columns,
    pagination,
    totalCount: total,
    loading: isLoading,
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
      <h2 className="text-xl font-bold">Routes</h2>

      <div className="flex justify-between items-center my-3 gap-3">
        <SearchBar
          value={searchInput}
          onChange={setSearchInput}
          placeholder="Search by route number..."
          width="w-[280px]"
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
                updateRoute({ id: editRoute._id, payload: data });
              } else {
                createRoute(data);
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
          />
        </div>
      )}
    </div>
  );
}
