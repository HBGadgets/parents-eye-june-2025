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
import type { Geofence } from "@/interface/modal";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/apiService";
import { Alert } from "@/components/Alert";

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
              // Handle edit action
              setOpen(true);
              setMode("edit");
              setGeofenceId(row._id);
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
        <Dialog open={open} onOpenChange={setOpen}>
          {/* —————————————————— trigger —————————————————— */}
          <div className="p-4">
            <DialogTrigger asChild>
              <Button className="cursor-pointer" onClick={() => setMode("add")}>
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
            <GeofenceManager mode={mode} geofenceId={geofenceId} />
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
