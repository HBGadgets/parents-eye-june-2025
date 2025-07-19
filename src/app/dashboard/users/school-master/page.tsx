"use client";

import React, { useCallback, useEffect, useState, useRef } from "react";
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
import DateRangeFilter from "@/components/ui/DateRangeFilter";
import { FloatingMenu } from "@/components/floatingMenu";
import {
  getCoreRowModel,
  useReactTable,
  VisibilityState,
  type ColumnDef,
} from "@tanstack/react-table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/apiService";
import { School } from "@/interface/modal";
import { useExport } from "@/hooks/useExport";
import { formatDate } from "@/util/formatDate";
import { Alert } from "@/components/Alert";
import ResponseLoader from "@/components/ResponseLoader";
// import { CustomFilter } from "@/components/ui/CustomFilter";
import { ColumnVisibilitySelector } from "@/components/column-visibility-selector";

// type SchoolAccess = {
//   _id: string;
//   schoolName: string;
//   fullAccess: boolean;
// };

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData, TValue> {
    flex?: number;
    minWidth?: number;
    maxWidth?: number;
  }
}

export default function SchoolMaster() {
  const queryClient = useQueryClient();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [filteredData, setFilteredData] = useState<School[]>([]);
  const [filterResults, setFilterResults] = useState<School[]>([]);
  // const [accessTarget, setAccessTarget] = useState<School | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<School | null>(null);
  const [editTarget, setEditTarget] = useState<School | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const { exportToPDF, exportToExcel } = useExport();

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
      // cell: (info) => info.getValue(),
      meta: { flex: 1, minWidth: 200, maxWidth: 300 },
      enableHiding: true,
    },
    {
      header: "Mobile",
      accessorFn: (row) => ({
        type: "text",
        value: row.schoolMobile ?? "",
      }),
      // cell: (info) => info.getValue(),
      meta: { flex: 1, minWidth: 150, maxWidth: 300 },
      enableHiding: true,
    },
    {
      header: "Username",
      accessorFn: (row) => ({
        type: "text",
        value: row.username ?? "",
      }),
      // cell: (info) => info.getValue(),
      meta: { flex: 1, minWidth: 150, maxWidth: 300 },
      enableHiding: true,
    },
    {
      header: "Password",
      accessorFn: (row) => ({
        type: "text",
        value: row.password ?? "",
      }),
      // cell: (info) => info.getValue(),
      meta: { flex: 1, minWidth: 150, maxWidth: 300 },
      enableHiding: true,
    },
    {
      header: "Registration Date",
      accessorFn: (row) => ({
        type: "text",
        value: formatDate(row.createdAt) ?? "",
      }),
      // cell: (info) => info.getValue(),
      meta: { flex: 1, minWidth: 200 },
      enableHiding: true,
    },
    // No need to add this in school master add this in branch master
    // {
    //   header: "Access",
    //   accessorFn: (row) => ({
    //     type: "group",
    //     items: [
    //       {
    //         type: "button",
    //         label: row.fullAccess
    //           ? "Grant Limited Access"
    //           : "Grant Full Access",
    //         onClick: () => setAccessTarget(row),
    //         disabled: accessMutation.isPending,
    //         className: `w-38 text-center text-sm bg-yellow-400 hover:bg-yellow-500 font-semibold rounded-full px-4 py-2 ${
    //           row.fullAccess ? "text-red-600" : "text-emerald-600"
    //         }`,
    //       },
    //     ],
    //   }),
    //   // cell: (info) => info.getValue(),
    //   meta: { flex: 1.5, minWidth: 150, maxWidth: 200 },
    //   enableSorting: false,
    //   enableHiding: true,
    // },
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
            className: "cursor-pointer",
            disabled: updateSchoolMutation.isPending,
          },
          {
            type: "button",
            label: "Delete",
            onClick: () => setDeleteTarget(row),
            className: "text-red-600 cursor-pointer",
            disabled: deleteSchoolMutation.isPending,
          },
        ],
      }),
      // cell: (info) => info.getValue(),
      meta: { flex: 1.5, minWidth: 150, maxWidth: 200 },
      enableSorting: false,
      enableHiding: true,
    },
  ];

  // columns for export
  const columnsForExport = [
    { key: "schoolName", header: "School Name" },
    { key: "schoolMobile", header: "Mobile" },
    { key: "username", header: "School Username" },
    { key: "password", header: "School Password" },
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

  // Mutation to add a new school
  const addSchoolMutation = useMutation({
    mutationFn: async (newSchool: any) => {
      const school = await api.post("/school", newSchool);
      return school.school;
    },
    onSuccess: (createdSchool) => {
      queryClient.setQueryData<School[]>(["schools"], (oldSchools = []) => {
        return [...oldSchools, createdSchool];
      });
    },
  });

  // Mutation for Access control
  // const accessMutation = useMutation({
  //   mutationFn: async (school: { _id: string; fullAccess: boolean }) => {
  //     return await api.put(`/school/accessgrant/${school._id}`, {
  //       fullAccess: school.fullAccess,
  //     });
  //   },
  //   onSuccess: (updated, variables) => {
  //     queryClient.setQueryData<School[]>(["schools"], (oldData) =>
  //       oldData?.map((school) =>
  //         school._id === variables._id
  //           ? { ...school, fullAccess: variables.fullAccess }
  //           : school
  //       )
  //     );
  //     alert("Access updated successfully.");
  //   },
  //   onError: (err) => {
  //     alert("Failed to update access.\nerror: " + err);
  //   },
  // });

  // Mutation for edit school data
  const updateSchoolMutation = useMutation({
    mutationFn: async ({
      schoolId,
      data,
    }: {
      schoolId: string;
      data: Partial<School>;
    }) => {
      return await api.put(`/school/${schoolId}`, data);
    },
    onSuccess: (_, { schoolId, data }) => {
      queryClient.setQueryData<School[]>(["schools"], (oldData) => {
        if (!oldData) return [];
        return oldData.map((school) =>
          school._id === schoolId ? { ...school, ...data } : school
        );
      });

      // Update filteredData manually
      setFilteredData((prev) =>
        prev.map((school) =>
          school._id === schoolId ? { ...school, ...data } : school
        )
      );

      setEditDialogOpen(false);
      setEditTarget(null);
      alert("School updated successfully.");
    },
    onError: (err) => {
      alert("Failed to update school.\nerror: " + err);
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
      alert("School deleted successfully.");
    },
    onError: (err) => {
      alert("Failed to delete student.\nerror: " + err);
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

      if (newValue !== undefined && newValue !== oldValue) {
        changedFields[key as keyof School] = newValue;
      }
    }

    if (Object.keys(changedFields).length === 0) {
      console.log("No changes detected.");
      return;
    }

    updateSchoolMutation.mutate({
      schoolId: editTarget._id,
      data: changedFields,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = {
      schoolName: form.schoolName.value,
      username: form.username.value,
      password: form.password.value,
      email: form.email.value,
      schoolMobile: form.schoolMobile.value,
      fullAccess: form.fullAccess.checked,
    };

    try {
      await addSchoolMutation.mutateAsync(data);
      closeButtonRef.current?.click();
      form.reset();
      alert("School added successfully.");
    } catch (err) {
      alert("Failed to add school.\nerror: " + err);
    }
  };

  const handleDateFilter = useCallback(
    (start: Date | null, end: Date | null) => {
      if (!schools || (!start && !end)) {
        setFilteredData(schools || []);
        return;
      }

      const filtered = schools.filter((school) => {
        if (!school.createdAt) return false;

        const createdDate = new Date(school.createdAt);
        return (!start || createdDate >= start) && (!end || createdDate <= end);
      });

      setFilteredData(filtered);
    },
    [schools]
  );

  // const handleCustomFilter = useCallback((filtered: School[]) => {
  //   setFilteredData(filtered);
  // }, []);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { columnVisibility },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <main>
      {/* Progress loader at the top */}
      <ResponseLoader isLoading={isLoading} />

      <header className="flex items-center justify-between mb-4">
        <section className="flex space-x-4">
          {/* Search component */}
          <SearchComponent
            data={filterResults}
            displayKey={["schoolName", "username", "email", "schoolMobile"]}
            onResults={handleSearchResults}
            className="w-[300px] mb-4"
          />
          {/* Date range picker */}
          <DateRangeFilter
            onDateRangeChange={handleDateFilter}
            title="Search by Registration Date"
          />
          {/* Access Filter*/}
          {/* <CustomFilter
            data={filterResults}
            originalData={filterResults}
            filterFields={["fullAccess"]}
            onFilter={handleCustomFilter}
            placeholder={"Filter by Access"}
            className="w-[180px]"
            valueFormatter={(value) =>
              value ? "Full Access" : "Limited Access"
            }
            booleanToLable={"fullAccess"}
            trueValue={"Full Access"}
            falseValue={"Limited Access"}
          /> */}
          {/* Column visibility selector */}
          <ColumnVisibilitySelector
            columns={table.getAllColumns()}
            buttonVariant="outline"
            buttonSize="default"
          />
        </section>

        {/* Add School */}
        <section>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="default">Add School</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <form onSubmit={handleSubmit} className="space-y-4">
                <DialogHeader>
                  <DialogTitle>Add School</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="schoolName">School Name</Label>
                    <Input
                      id="schoolName"
                      name="schoolName"
                      placeholder="Enter school name"
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="Enter email address"
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="schoolMobile">Mobile No</Label>
                    <Input
                      id="schoolMobile"
                      name="schoolMobile"
                      type="tel"
                      placeholder="Enter school mobile number"
                      pattern="[0-9]{10}"
                      maxLength={10}
                      autoComplete="tel"
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      name="username"
                      type="text"
                      placeholder="Enter username"
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      name="password"
                      type="text"
                      placeholder="Enter password"
                      required
                    />
                  </div>

                  {/* <div className="flex items-center gap-3 mt-6">
                    <input
                      type="checkbox"
                      id="fullAccess"
                      name="fullAccess"
                      className="h-5 w-5"
                    />
                    <Label htmlFor="fullAccess">Full Access</Label>
                  </div> */}
                </div>

                <DialogFooter>
                  <DialogClose asChild>
                    <Button ref={closeButtonRef} variant="outline">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button type="submit" disabled={addSchoolMutation.isPending}>
                    {addSchoolMutation.isPending ? "Saving..." : "Save School"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </section>
      </header>

      {/* Table component */}
      <section className="mb-4">
        <CustomTable
          data={filteredData || []}
          columns={columns}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
          pageSizeArray={[10, 20, 50]}
          maxHeight={600}
          minHeight={200}
          showSerialNumber={true}
          noDataMessage="No schools found"
          isLoading={isLoading}
        />
      </section>

      {/* Alert Boxes */}
      <section>
        {/* Access Alert */}
        {/* <div>
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
        </div> */}

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
      {/* Edit Dialog */}
      <section>
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
              imageKey: "logo",
              nameKeys: ["schoolName"],
            }}
          />
        )}
      </section>
      {/* Floating Menu */}
      <section>
        <FloatingMenu
          onExportPdf={() => {
            console.log("Export PDF triggered"); // ✅ Add this for debugging
            exportToPDF(filteredData, columnsForExport, {
              title: "School Master Report",
              companyName: "Parents Eye",
              metadata: {
                Total: `${filteredData.length} schools`,
              },
            });
          }}
          onExportExcel={() => {
            console.log("Export Excel triggered"); // ✅ Add this too
            exportToExcel(filteredData, columnsForExport, {
              title: "School Master Report",
              companyName: "Parents Eye",
              metadata: {
                Total: `${filteredData.length} schools`,
              },
            });
          }}
        />
      </section>
    </main>
  );
}
