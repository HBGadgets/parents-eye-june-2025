"use client";

import React, { useCallback, useEffect, useState } from "react";
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
import { School } from "@/interface/modal";
import { useExport } from "@/hooks/useExport";
import { Alert } from "@/components/Alert";
import ResponseLoader from "@/components/ResponseLoader";
type SchoolAccess = {
  _id: string;
  schoolName: string;
  fullAccess: boolean;
};

export default function SchoolMaster() {
  const queryClient = useQueryClient();
  const [filteredData, setFilteredData] = useState<School[]>([]);
  const [filterResults, setFilterResults] = useState<School[]>([]);
  const [accessTarget, setAccessTarget] = useState<School | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<School | null>(null);
  const [editTarget, setEditTarget] = useState<School | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

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

  const cachedSchools = queryClient.getQueryData<School[]>(["schools"]);
  console.log("Cached Schools:", cachedSchools);

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
            onClick: () => {
              setEditTarget(row);
              setEditDialogOpen(true);
            },
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

  // Define the fields for the edit dialog
  const schoolFieldConfigs: FieldConfig[] = [
    {
      label: "School Name",
      key: "schoolName",
      type: "text",
      required: true,
    },
    {
      label: "Mobile Number",
      key: "schoolMobile",
      type: "text",
      required: true,
    },
    {
      label: "Username",
      key: "username",
      type: "text",
      required: true,
    },
    {
      label: "Password",
      key: "password",
      type: "text",
      required: true,
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
    mutationFn: async ({
      schoolId,
      data,
    }: {
      schoolId: string;
      data: Partial<School>;
    }) => {
      return await api.put(`/school/${schoolId}`, data); // Payload is just the edited fields
    },
    onSuccess: (_, { schoolId, data }) => {
      queryClient.setQueryData<School[]>(["schools"], (oldData) => {
        if (!oldData) return [];

        return oldData.map((school) =>
          school._id === schoolId ? { ...school, ...data } : school
        );
      });

      // Update filteredData manually to reflect changes in UI
      setFilteredData((prev) =>
        prev.map((school) =>
          school._id === schoolId ? { ...school, ...data } : school
        )
      );

      setEditDialogOpen(false);
      setEditTarget(null);
    },
    onError: (err) => {
      console.error(err);
      alert("Failed to update school.");
    },
  });

  // Mutation to delete a school
  const deleteSchoolMutation = useMutation({
    mutationFn: async (schoolId: string) => {
      return await api.delete(`/school/${schoolId}`);
    },
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData<School[]>(["schools"], (oldData) =>
        oldData?.filter((school) => school._id !== deletedId)
      );
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
  const handleSave = (updatedData: Partial<School>) => {
    if (!editTarget) return;

    const changedFields: Partial<Record<keyof School, unknown>> = {};

    for (const key in updatedData) {
      const newValue = updatedData[key as keyof School];
      const oldValue = editTarget[key as keyof School];

      // Only include keys that have changed
      if (newValue !== undefined && newValue !== oldValue) {
        changedFields[key as keyof School] = newValue;
      }
    }

    if (Object.keys(changedFields).length === 0) {
      console.log("No changes detected.");
      return;
    }

    // Pass _id separately to the mutation, not in the payload
    updateSchoolMutation.mutate({
      schoolId: editTarget._id,
      data: changedFields,
    });
  };

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
      {/* Table component */}
      {/* <section className="mb-4">
        <CustomTable
          data={filteredData || []}
          columns={columns}
          pageSizeArray={[10, 20, 50]}
          showFilters={true}
          tableClass="bg-white rounded shadow"
        />
      </section> */}
        {isLoading ? (
      <ResponseLoader />
    ) : (
      <section className="mb-4">
        <CustomTable
          data={filteredData || []}
          columns={columns}
          pageSizeArray={[10, 20, 50]}
          showFilters={true}
          tableClass="bg-white rounded shadow"
        />
      </section>
    )}
      {/* Alert Boxes */}
      <section>
        {/* Access controll alert box*/}
        <div>
          <Alert<SchoolAccess>
            title="Are you absolutely sure?"
            description={`You are about to give ${accessTarget?.schoolName} ${
              accessTarget?.fullAccess ? "limited" : "full"
            } access.`}
            actionButton={(target) => {
              accessMutation.mutate({
                _id: target._id,
                fullAccess: !target.fullAccess,
              });
            }}
            target={accessTarget}
            setTarget={setAccessTarget}
            butttonText="Confirm"
          />
        </div>
        {/* Delete school alert box */}
        <div>
          {deleteTarget && (
            <Alert<School>
              title="Are you absolutely sure?"
              description={`This will permanently delete ${deleteTarget?.schoolName} and all associated data.`}
              actionButton={(target) => {
                deleteSchoolMutation.mutate(target._id);
                setDeleteTarget(null);
              }}
              target={deleteTarget}
              setTarget={setDeleteTarget}
              butttonText="Delete"
            />
          )}
        </div>
      </section>
      <section>
        {/* Edit Dialog */}
        {editTarget && (
          <DynamicEditDialog
            data={editTarget}
            isOpen={editDialogOpen}
            onClose={() => {
              setEditDialogOpen(false);
              setEditTarget(null);
            }}
            onSave={handleSave}
            fields={schoolFieldConfigs}
            title="Edit School"
            description="Update the school information below. Fields marked with * are required."
            avatarConfig={{
              imageKey: "logo", // change to your actual image key if any
              nameKeys: ["schoolName"],
            }}
          />
        )}
      </section>
    </main>
  );
}
