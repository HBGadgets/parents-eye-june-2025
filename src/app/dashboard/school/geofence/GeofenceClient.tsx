"use client";

import React, { useEffect, useState } from "react";
import { ColumnDef, VisibilityState } from "@tanstack/react-table";
import GeofenceManager from "@/components/geofence-manager/GeofenceManager";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogClose,
} from "@/components/ui/dialog";
import { X } from "lucide-react";
import { DialogTitle } from "@radix-ui/react-dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";
import type { Branch, Geofence, Route, School } from "@/interface/modal";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/apiService";
import { Alert } from "@/components/Alert";
import { useBranchData } from "@/hooks/useBranchData";
import { useInfiniteRouteData } from "@/hooks/useInfiniteRouteData";
import { FloatingMenu } from "@/components/floatingMenu";
import { useExport } from "@/hooks/useExport";
import { useGeofences } from "@/hooks/useGeofence";

export default function GeofenceClient() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState([]);
  const [name, setName] = useState("");
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
  );
  const { exportToPDF, exportToExcel } = useExport();

  const { data: geofenceData, isLoading } = useGeofences({
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    search: debouncedName,
    sortBy: sorting?.[0]?.id,
    sortOrder: sorting?.[0]?.desc ? "desc" : "asc",
  });

  const { data: branchData } = useBranchData();
  const { data: routeData } = useInfiniteRouteData();

  // Debounce Geofence name search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedName(name);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }, 500);

    return () => clearTimeout(handler);
  }, [name]);

  // Delete Geofence Mutation
  const deleteGeofenceMutation = useMutation({
    mutationFn: async (geofenceId: string) => {
      return await api.delete(`/onegeofence/${geofenceId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["geofences"] });
      alert("Geofence deleted successfully.");
    },
    onError: (err) => {
      alert("Failed to delete geofence.\nError: " + err);
    },
  });

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
    setOpen(true);
  };

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
      id: "routeNumber",
      header: "Route Number",
      accessorFn: (row) => row.route?.routeNumber || "N/A",
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
              // console.log("🔧 Edit button clicked for geofence:", geofence._id);

              setMode("edit");
              setGeofenceId(geofence._id);
              setSelectedGeofence(geofence);

              let foundSchool = null;
              let foundBranch = null;
              let foundRoute = null;

              if (geofence.branchId && branchData) {
                foundBranch = branchData.find(
                  (branch) => branch._id === geofence.branchId
                );

                if (foundBranch && foundBranch.schoolId) {
                  foundSchool = foundBranch.schoolId;
                }
              }

              if (geofence.routeObjId && routeData) {
                foundRoute = routeData.find(
                  (route) => route._id === geofence.routeObjId
                );
              }

              setGeofenceSchoolId(foundSchool);
              setGeofenceBranchId(foundBranch);
              setGeofenceRouteId(foundRoute);

              if (geofence.area?.center) {
                // console.log("📍 Geofence coordinates:", geofence.area.center);
              }

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

  // console.log("📦 Geofence data:", geofenceData);

  const { tableElement } = CustomTableServerSidePagination({
    data: geofenceData?.data || [],
    columns,
    pagination,
    totalCount: geofenceData?.total || 0,
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
  });

  return (
    <>
      <header>
        <Dialog open={open} onOpenChange={handleDialogChange}>
          <div className="flex justify-end mb-4">
            <DialogTrigger asChild>
              <Button className="cursor-pointer" onClick={handleAddGeofence}>
                Add geofence
              </Button>
            </DialogTrigger>
          </div>

          <DialogContent className="w-screen h-screen max-w-none max-h-none p-0 rounded-none !m-0 !left-0 !top-0 !transform-none !translate-x-0 !translate-y-0">
            <VisuallyHidden>
              <DialogTitle>Add Geofence</DialogTitle>
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

            <GeofenceManager
              mode={mode}
              initialData={selectedGeofence}
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
        <section>{tableElement}</section>
        <section>
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
        </section>
        <section>
          <FloatingMenu
            onExportPdf={() => {
              exportToPDF([], [], {
                title: "All Students Data",
                companyName: "Parents Eye",
              });
            }}
            onExportExcel={() => {
              exportToExcel([], [], {
                title: "All students Data",
                companyName: "Parents Eye",
              });
            }}
          />
        </section>
      </main>
    </>
  );
}
