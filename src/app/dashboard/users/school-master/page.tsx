"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CustomTable, CellContent } from "@/components/ui/CustomTable";
import { DynamicEditDialog, FieldConfig } from "@/components/ui/EditModal";
import SearchComponent from "@/components/ui/SearchOnlydata";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/datePicker";
import { SearchableSelect } from "@/components/custom-select";
import DateRangeFilter from "@/components/ui/DateRangeFilter";
import { FloatingMenu } from "@/components/floatingMenu";
import type { ColumnDef } from "@tanstack/react-table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/apiService";
import { useSchoolData } from "@/hooks/useSchoolData";
import { useBranchData } from "@/hooks/useBranchData";
import { useDeviceData } from "@/hooks/useDeviceData";
import { useGeofenceData } from "@/hooks/useGeofenceData";
import { School } from "@/interface/modal";
import { useExport } from "@/hooks/useExport";

export default function SchoolMaster() {
  const queryClient = useQueryClient();
  const [filteredData, setFilteredData] = useState<School[]>([]);
  const [filterResults, setFilterResults] = useState<School[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [accessTarget, setAccessTarget] = useState<School | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<School | null>(null);
  const [editTarget, setEditTarget] = useState<School | null>(null); // Optional

  // Fetch school data
  const {
    data: schools,
    isLoading,
    isError,
    error,
  } = useQuery<School[]>({
    queryKey: ["schools"],
    queryFn: async () => {
      const res = await api.get<School[]>("/school");
      return res;
    },
  });

  useEffect(() => {
    if (schools && schools.length > 0) {
      setFilteredData(schools);
      setFilterResults(schools); // For search base
    }
  }, [schools]);

  // Define the columns for the table
  const columns: ColumnDef<School, CellContent>[] = [
    {
      header: "School Name",
      accessorFn: (row) => ({
        type: "text",
        value: row.schoolName ?? "",
      }),
      cell: (info) => info.getValue(),
      meta: { flex: 1, minWidth: 200, maxWidth: 300 },
    },
    {
      header: "Mobile",
      accessorFn: (row) => ({
        type: "text",
        value: row.schoolMobile ?? "",
      }),
      cell: (info) => info.getValue(),
      meta: { flex: 1, minWidth: 150, maxWidth: 300 },
    },
    {
      header: "Username",
      accessorFn: (row) => ({
        type: "text",
        value: row.username ?? "",
      }),
      cell: (info) => info.getValue(),
      meta: { flex: 1, minWidth: 150, maxWidth: 300 },
    },
    {
      header: "Password",
      accessorFn: (row) => ({
        type: "text",
        value: row.password ?? "",
      }),
      cell: (info) => info.getValue(),
      meta: { flex: 1, minWidth: 150, maxWidth: 300 },
    },
    {
      header: "Access",
      accessorFn: (row) => ({
        type: "group",
        items: [
          {
            type: "button",
            label: row.fullAccess
              ? `Grant Limited Access`
              : ` Grant Full Access`,
            onClick: () => setAccessTarget(row),
            disabled: accessMutation.isPending,
          },
        ],
      }),
      cell: (info) => info.getValue(),
      meta: { flex: 1.5, minWidth: 150, maxWidth: 200 },
      enableSorting: false,
    },
    {
      header: "Action",
      accessorFn: (row) => ({
        type: "group",
        items: [
          {
            type: "button",
            label: "Edit",
            onClick: () => setEditTarget(row),
            disabled: accessMutation.isPending,
          },
          {
            type: "button",
            label: "Delete",
            onClick: () => setDeleteTarget(row),
            disabled: deleteSchoolMutation.isPending,
          },
        ],
      }),
      cell: (info) => info.getValue(),
      meta: { flex: 1.5, minWidth: 150, maxWidth: 200 },
      enableSorting: false,
    },
  ];

  // Mutation for Access access
  const accessMutation = useMutation({
    mutationFn: async (school: { _id: string; fullAccess: boolean }) => {
      return await api.put(`/school/accessgrant/${school?._id}`, {
        fullAccess: school?.fullAccess,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schools"] });
    },
    onError: (err) => {
      console.error(err);
      alert("Failed to update student.");
    },
  });

  // Mutation for edit school data
  const updateSchoolMutation = useMutation({
    mutationFn: async (updatedSchool: School) => {
      return await api.put(`/school/${updatedSchool._id}`, updatedSchool);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schools"] });
      setEditDialogOpen(false);
      setSelectedSchool(null);
    },
    onError: (err) => {
      console.error(err);
      alert("Failed to update student.");
    },
  });

  // Mutation to delete a school
  const deleteSchoolMutation = useMutation({
    mutationFn: async (schoolId: string) => {
      return await api.delete(`/school/${schoolId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schools"] });
    },
    onError: (err) => {
      console.error(err);
      alert("Failed to delete student.");
    },
  });

  // Handle search
  const handleSearchResults = useCallback((results: School[]) => {
    setFilteredData(results);
  }, []);

  // Handle save action for edit school
  // const handleSave = (updatedData: Partial<School>) => {
  //   if (!selectedSchool) return;

  //   const updateSchool: School = {
  //     ...selectedSchool,
  //     ...updatedData,

  //   };
  //   }
  // };

  return (
    <main>
      <section>
        <section className="flex items-center justify-between mb-4">
          <section className="flex space-x-4">
            {/* Search component */}
            <SearchComponent
              data={filterResults}
              displayKey={["schoolName", "username", "email", "schoolMobile"]}
              onResults={handleSearchResults}
              className="w-[300px] mb-4"
            />
            {/* <p>Add column selector</p> */}
            {/* Date range picker */}
            {/* <DateRangeFilter onDateRangeChange={handleDateFilter} /> */}
          </section>
        </section>
      </section>
      <section className="mb-4">
        {/* Table component */}
        <CustomTable
          data={filteredData || []}
          columns={columns}
          pageSizeArray={[10, 20, 50]}
          showFilters={true}
          tableClass="bg-white rounded shadow"
        />
      </section>
      {/* Alert Boxes */}
      <section>
        {/* Access controll alert box*/}
        <div>
          <AlertDialog
            open={!!accessTarget}
            onOpenChange={() => setAccessTarget(null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  You are about to give {accessTarget?.schoolName}{" "}
                  {accessTarget?.fullAccess ? "limited" : "full"} access.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    if (accessTarget) {
                      accessMutation.mutate({
                        _id: accessTarget._id,
                        fullAccess: !accessTarget.fullAccess,
                      });
                    }
                    setAccessTarget(null);
                  }}
                >
                  Confirm
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        {/* Delete school alert box */}
        <div>
          {deleteTarget && (
            <AlertDialog
              open={!!deleteTarget}
              onOpenChange={() => setDeleteTarget(null)}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete {deleteTarget?.schoolName} and
                    all associated data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      deleteSchoolMutation.mutate(deleteTarget._id);
                      setDeleteTarget(null);
                    }}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </section>
    </main>
  );
}
