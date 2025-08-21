"use client";

import React, { useEffect, useState } from "react";
import {
  ColumnDef,
  getCoreRowModel,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";
import GeofenceManager from "@/components/geofence-manager/GeofenceManager";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogClose,
  DialogHeader,
} from "@/components/ui/dialog";
import { X } from "lucide-react";
import { DialogTitle } from "@radix-ui/react-dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";
import { useGeofeneces } from "@/hooks/useGeofence";
import type { Branch, Geofence, Route, School } from "@/interface/modal";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/apiService";
import { Alert } from "@/components/Alert";
import { useBranchData } from "@/hooks/useBranchData";
import { useRouteData } from "@/hooks/useRouteData";

export default function Geofence() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState([]);
  const [debouncedName, setDebouncedName] = useState("");
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [deleteTarget, setDeleteTarget] = useState<Geofence | null>(null);
  const [mode, setMode] = useState<"add" | "edit">("add");
  const [geofenceId, setGeofenceId] = useState<string | null>(null);
  const [geofenceRouteId, setGeofenceRouteId] = useState<Route | null>(null);
  const [geofenceSchoolId, setGeofenceSchoolId] = useState<School | null>(null);
  const [geofenceBranchId, setGeofenceBranchId] = useState<Branch | null>(null);
  const [selectedGeofence, setSelectedGeofence] = useState<Geofence | null>(
    null
  ); // 🆕 Add this
  const {
    data: geofenceData,
    isLoading,
    error,
    isError,
    isFetching,
  } = useGeofeneces({
    pagination,
    sorting,
    name: debouncedName,
  });
  const { data: branchData } = useBranchData();
  const { data: routeData } = useRouteData();

  // Debounce Geofence name search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedName(name);
      setPagination((prev) => ({ ...prev, pageIndex: 0 })); // Reset to page 1 on search
    }, 500); // 500ms debounce delay

    return () => clearTimeout(handler);
  }, [name]);

  // Delete Geofence Mutation
  const deleteGeofenceMutation = useMutation({
    mutationFn: async (geofenceId: string) => {
      return await api.delete(`/onegeofence/${geofenceId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["geofences"] }); // 🔥 This invalidates all geofence-related queries
      alert("Geofence deleted successfully.");
    },
    onError: (err) => {
      alert("Failed to delete geofence.\nError: " + err);
    },
  });

  useEffect(() => {
    console.log("Geofence data:", geofenceData);
  }, [geofenceData]);

  // 🆕 Fix the dialog change handler
  const handleDialogChange = (isOpen: boolean) => {
    setOpen(isOpen);

    // Only reset state when closing
    if (!isOpen) {
      setSelectedGeofence(null);
      setGeofenceId(null);
      setGeofenceRouteId(null);
      setGeofenceSchoolId(null);
      setGeofenceBranchId(null);
      setMode("add");
    }
  };

  // 🆕 Separate handler for add button
  const handleAddGeofence = () => {
    setMode("add");
    setSelectedGeofence(null);
    setGeofenceId(null);
    setGeofenceRouteId(null);
    setGeofenceSchoolId(null);
    setGeofenceBranchId(null);
    setOpen(true);
  };

  // table columns definition
  const columns: ColumnDef<Geofence>[] = [
    {
      id: "name",
      header: "Device Name",
      accessorFn: (row) => row.route?.device?.name || "N/A",
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "geofenceName",
      header: "Geofence Name",
      accessorFn: (row) => row.geofenceName || "N/A",
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "schoolName",
      header: "School Name",
      accessorFn: (row) => row.school?.schoolName || "N/A",
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "branchName",
      header: "Branch Name",
      accessorFn: (row) => row.branch?.branchName || "N/A",
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "pickupTime",
      header: "Pickup Time",
      accessorFn: (row) => row.pickupTime || "N/A",
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "dropTime",
      header: "Drop Time",
      accessorFn: (row) => row.dropTime || "N/A",
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
              const geofence = row.original;
              console.log("🔧 Edit button clicked for geofence:", geofence._id);

              // Set basic data
              setMode("edit");
              setGeofenceId(geofence._id);
              setSelectedGeofence(geofence);

              let foundSchool = null;
              let foundBranch = null;
              let foundRoute = null;

              // Find related objects
              if (geofence.branchId && branchData) {
                foundBranch = branchData.find(
                  (branch) => branch._id === geofence.branchId
                );
                console.log("Found Branch:", foundBranch);

                if (foundBranch && foundBranch.schoolId) {
                  foundSchool = foundBranch.schoolId;
                  console.log("Found School from Branch:", foundSchool);
                }
              }

              if (geofence.routeObjId && routeData) {
                foundRoute = routeData.find(
                  (route) => route._id === geofence.routeObjId
                );
                console.log("Found Route:", foundRoute);
              }

              // Set the found objects
              setGeofenceSchoolId(foundSchool);
              setGeofenceBranchId(foundBranch);
              setGeofenceRouteId(foundRoute);

              // 🆕 NEW: Log coordinates for debugging
              if (geofence.area?.center) {
                console.log("📍 Geofence coordinates:", geofence.area.center);
              }

              // Open dialog
              setOpen(true);
            }}
            className="cursor-pointer bg-[#f3c623] hover:bg-[#D3A80C]"
          >
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteTarget(row.original)}
            disabled={deleteGeofenceMutation.isPending}
            className="cursor-pointer hover:bg-red-700"
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  // server side pagination table instance
  const { table, tableElement } = CustomTableServerSidePagination({
    data: geofenceData?.data || [],
    columns,
    pagination,
    totalCount: geofenceData?.total || 0,
    loading: isLoading || isFetching,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    sorting,
    columnVisibility,
    onColumnVisibilityChange: setColumnVisibility,
    emptyMessage: "No geofence found",
    pageSizeOptions: [5, 10, 20, 30, 50],
    enableSorting: true,
    showSerialNumber: true,
  });
  return (
    <>
      <header>
        {/* Geofence Manager */}
        <Dialog open={open} onOpenChange={handleDialogChange}>
          {/* —————————————————— trigger —————————————————— */}
          <div className="flex justify-end mb-4">
            <DialogTrigger asChild>
              <Button className="cursor-pointer" onClick={handleAddGeofence}>
                Add geofence
              </Button>
            </DialogTrigger>
          </div>

          {/* ——————————— full-screen modal ——————————— */}
          <DialogContent className="w-screen h-screen max-w-none max-h-none p-0 rounded-none !m-0 !left-0 !top-0 !transform-none !translate-x-0 !translate-y-0">
            <VisuallyHidden>
              <DialogTitle>Add Geofence</DialogTitle>
            </VisuallyHidden>
            {/* close button */}
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 z-[1000] cursor-pointer"
              >
                <X className="h-6 w-6" />
              </Button>
            </DialogClose>

            {/* your manager renders only while the modal is open */}
            <GeofenceManager
              mode={mode}
              initialData={selectedGeofence} // 🆕 Pass the geofence data
              geofenceId={geofenceId}
              geofenceRouteId={geofenceRouteId}
              geofenceSchoolId={geofenceSchoolId}
              geofenceBranchId={geofenceBranchId}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ["geofences"] });
              }}
            />
          </DialogContent>
        </Dialog>
      </header>
      <main>
        {/* table */}
        <section>{tableElement}</section>
        {/* Alert Dialog */}
        <section>
          {/* Delete */}
          <div>
            {deleteTarget && (
              <Alert<Geofence>
                title="Are you absolutely sure?"
                description={`This will permanently delete ${deleteTarget?.geofenceName} and all associated data.`}
                actionButton={(target) => {
                  deleteGeofenceMutation.mutate(target._id);
                  setDeleteTarget(null);
                }}
                target={deleteTarget}
                setTarget={setDeleteTarget}
                butttonText="Delete"
              />
            )}
          </div>
        </section>
      </main>
    </>
  );
}
