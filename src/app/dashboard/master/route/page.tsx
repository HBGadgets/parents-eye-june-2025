"use client";

import { useEffect, useState } from "react";
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

export default function RoutePage() {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 500);
  const [filters, setFilters] = useState<{ search?: string }>({});
  const [showForm, setShowForm] = useState(false);
  const [editRoute, setEditRoute] = useState<Route | null>(null);
  const [schoolId, setSchoolId] = useState<string | undefined>();
  const [branchId, setBranchId] = useState<string | undefined>();
  const [filterSchoolId, setFilterSchoolId] = useState<string>();
  const [filterBranchId, setFilterBranchId] = useState<string>();
  const [schoolSearch, setSchoolSearch] = useState("");
  const [branchSearch, setBranchSearch] = useState("");
  const { data: schools = [] } = useSchoolDropdown();
  const { data: branches = [] } = useBranchDropdown(schoolId);
  const { data: devices = [] } = useDeviceDropdown(branchId);
  const decodedToken = jwtDecode<{
    role: string;
    schoolId?: string;
    id?: string;
  }>(Cookies.get("token") || "");

  const role = decodedToken.role;

  // Auto IDs from token
  const tokenSchoolId =
    role === "school" ? decodedToken.id : decodedToken.schoolId;

  const tokenBranchId = role === "branch" ? decodedToken.id : undefined;

  const { routes, total, isLoading, deleteRoute, updateRoute, createRoute } =
    useRoutes(pagination, sorting, filters);

  useEffect(() => {
    if (role === "school" && tokenSchoolId) {
      setFilterSchoolId(tokenSchoolId);
      setSchoolId(tokenSchoolId);
    }

    if (role === "branch" && tokenBranchId) {
      setFilterBranchId(tokenBranchId);
      setBranchId(tokenBranchId);
    }
  }, []);

  useEffect(() => {
    if (!isLoading) setShowForm(false);
  }, [isLoading]);

  useEffect(() => {
    if (!filterSchoolId) {
      setFilterBranchId(undefined);
    }
  }, [filterSchoolId]);

  useEffect(() => {
    setFilters({
      search: debouncedSearch || undefined,
      schoolId: filterSchoolId,
      branchId: filterBranchId,
    });

    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [debouncedSearch, filterSchoolId, filterBranchId]);

  const schoolItems = schools.map((s) => ({
    label: s.schoolName!,
    value: s._id,
  }));

  const branchItems = branches.map((b) => ({
    label: b.branchName!,
    value: b._id,
  }));

  const closeModal = () => {
    setShowForm(false);
    setEditRoute(null);
  };

  const handleEdit = (row: Route) => {
    setEditRoute(row);
    setSchoolId(row.schoolId._id);
    setBranchId(row.branchId._id);
    setShowForm(true);
  };

  const handleDelete = (row: Route) => {
    if (confirm("Delete this route?")) {
      deleteRoute(row._id);
    }
  };

  const columns = getRouteColumns(handleEdit, handleDelete);

  const { table, tableElement } = CustomTableServerSidePagination({
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
    <div>
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
              setShowForm(false);
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
