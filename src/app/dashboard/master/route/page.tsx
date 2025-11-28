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

export default function RoutePage() {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [filters, setFilters] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [editRoute, setEditRoute] = useState<Route | null>(null);
  const [schoolId, setSchoolId] = useState<string | undefined>();
  const [branchId, setBranchId] = useState<string | undefined>();
  const { data: schools = [] } = useSchoolDropdown();
  const { data: branches = [] } = useBranchDropdown(schoolId);
  const { data: devices = [] } = useDeviceDropdown(branchId);

  const { routes, total, isLoading, deleteRoute, updateRoute, createRoute } =
    useRoutes(pagination, sorting, filters);

  useEffect(() => {
    if (!isLoading) setShowForm(false);
  }, [isLoading]);

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

  useEffect(() => {
    console.log("Se lected School ID:", schoolId);
  }, [schoolId]);

  console.log("branches:", branches);

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xl font-bold">Routes</h2>
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
          {/* <div className="bg-white rounded-lg p-5 w-[380px]"> */}
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
            schools={schools}
            branches={branches}
            devices={devices}
            selectedSchoolId={schoolId}
            selectedBranchId={branchId}
            onSchoolChange={setSchoolId}
            onBranchChange={setBranchId}
          />
          {/* </div> */}
        </div>
      )}
    </div>
  );
}
