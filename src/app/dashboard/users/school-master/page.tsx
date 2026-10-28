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
import { Eye, EyeOff } from "lucide-react";
import authAxios from "@/lib/authAxios";
import { toast } from "sonner";
import { ModuleAccessModal } from "@/components/access/ModuleAccessModal";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<School | null>(null);
  const [editTarget, setEditTarget] = useState<School | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [permissionTarget, setPermissionTarget] = useState<School | null>(null);
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
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
      setFilterResults(schools); // For search base
      // Only reset filteredData if user is not actively searching
      if (!searchQuery.trim()) {
        setFilteredData(schools);
      }
    } else {
      setFilteredData([]);
      setFilterResults([]);
    }
  }, [schools, searchQuery]);


  // Define the columns for the table
  const columns: ColumnDef<School, CellContent>[] = [
    {
      header: "School Name",
      accessorFn: (row) => ({
        type: "text",
        value: row.schoolName ?? "",
      }),
      meta: { flex: 1, minWidth: 200, maxWidth: 300 },
      enableHiding: true,
    },
    {
      header: "Mobile",
      accessorFn: (row) => ({
        type: "text",
        value: row.mobileNo ?? "",
      }),
      meta: { flex: 1, minWidth: 150, maxWidth: 300 },
      enableHiding: true,
    },
    {
      header: "Username",
      accessorFn: (row) => ({
        type: "text",
        value: row.username ?? "",
      }),
      meta: { flex: 1, minWidth: 150, maxWidth: 300 },
      enableHiding: true,
    },
    {
      header: "Password",
      accessorKey: "password",
      cell: ({ row }) => {
        const [show, setShow] = React.useState(false);
        const password = row.original.password;

        return (
          <div className="flex items-center justify-center gap-2">
            <span className="font-mono">
              {show ? password : "•".repeat(password?.length || 8)}
            </span>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShow((prev) => !prev);
              }}
              className="p-1 hover:bg-gray-200 rounded cursor-pointer"
            >
              {show ? (
                <EyeOff className="h-4 w-4 text-gray-700" />
              ) : (
                <Eye className="h-4 w-4 text-gray-700" />
              )}
            </button>
          </div>
        );
      },
      meta: { flex: 1, minWidth: 150, maxWidth: 300 },
    },
    {
      header: "Registration Date",
      accessorFn: (row) => ({
        type: "text",
        value: formatDate(row.createdAt) ?? "",
      }),
      meta: { flex: 1, minWidth: 200 },
      enableHiding: true,
    },

    {
      header: "Access",
      accessorFn: (row: School) => ({
        type: "group",
        items: [
          {
            type: "button",
            label: "Permissions",
            onClick: () => {
              setPermissionTarget(row);
              setPermissionDialogOpen(true);
            },
            className:
              "w-32 text-center text-xs bg-yellow-400 hover:bg-yellow-500 font-semibold text-yellow-950 rounded-full px-3 py-1.5 cursor-pointer",
          },
        ],
      }),
      meta: { flex: 1, minWidth: 150, maxWidth: 180 },
      enableSorting: false,
      enableHiding: true,
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
            className: "cursor-pointer",
            disabled: false,
          },
          {
            type: "button",
            label: "Delete",
            onClick: () => setDeleteTarget(row),
            className: "text-red-600 cursor-pointer",
            disabled: false,
          },
          {
            type: "button",
            label: (row as any).Active ? "Deactivate" : "Activate",
            onClick: () => deactivateMutation.mutate(row),
            className: `${(row as any).Active
              ? "bg-red-100 text-red-700 hover:bg-red-200"
              : "bg-green-100 text-green-700 hover:bg-green-200"
              } w-24`,
            disabled: deactivateMutation.isPending,
          },
        ],
      }),
      meta: {
        minWidth: 280,
        maxWidth: 320,
        width: 300,
      },
      enableSorting: false,
      enableHiding: true,
    },

  ];

  // // columns for export
  // const columnsForExport = [
  //   { key: "schoolName", header: "School Name" },
  //   { key: "mobileNo", header: "Mobile" },
  //   { key: "username", header: "School Username" },
  //   { key: "password", header: "School Password" },
  //   { key: "createdAt", header: "Registration Date" },
  // ];

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
      key: "mobileNo",
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

      // Update filteredData manually so active search results reflect the change immediately
      setFilteredData((prev) =>
        prev.map((school) =>
          school._id === schoolId ? { ...school, ...data } : school
        )
      );

      // Also update filterResults manually so search base stays fresh
      setFilterResults((prev) =>
        prev.map((school) =>
          school._id === schoolId ? { ...school, ...data } : school
        )
      );

      setEditDialogOpen(false);
      setEditTarget(null);
      toast.success("School updated successfully.");
    },
    onError: (err: any) => {
      toast.error(
        `Failed to update school: ${err?.response?.data?.message || err?.message || err}`
      );
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
      setFilteredData((prev) =>
        prev.filter((school) => school._id !== deletedId)
      );
      setFilterResults((prev) =>
        prev.filter((school) => school._id !== deletedId)
      );
      toast.success("School deleted successfully.");
    },
    onError: (err: any) => {
      toast.error(
        `Failed to delete school: ${err?.response?.data?.message || err?.message || err}`
      );
    },
  });


  const deactivateMutation = useMutation({
    mutationFn: async (school: any) => {
      const token = Cookies.get("token");
      return await authAxios.put(
        `/user/deactivate/${school._id}`,
        {
          Active: !school.Active,
          userRole: school.role,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schools"] });
      toast.success("School status updated successfully.");
    },
    onError: (err: any) => {
      toast.error(
        `Failed to update school status: ${err.response?.data?.message || err.message
        }`
      );
    },
  });

  useEffect(() => {
    if (deleteTarget) {
      const confirmed = window.confirm(
        `Are you sure you want to delete "${deleteTarget.schoolName}"? This action cannot be undone.`
      );

      if (confirmed) {
        deleteSchoolMutation.mutate(deleteTarget._id);
      }

      setDeleteTarget(null);
    }
  }, [deleteTarget, deleteSchoolMutation]);

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
      schoolName: (form.elements.namedItem("schoolName") as HTMLInputElement)
        ?.value,
      username: (form.elements.namedItem("username") as HTMLInputElement)
        ?.value,
      password: (form.elements.namedItem("password") as HTMLInputElement)
        ?.value,
      email: (form.elements.namedItem("email") as HTMLInputElement)?.value,
      mobileNo: (form.elements.namedItem("mobileNo") as HTMLInputElement)
        ?.value,
    };


    try {
      await addSchoolMutation.mutateAsync(data);
      closeButtonRef.current?.click();
      form.reset();
      toast.success("School added successfully.");
    } catch (err) {
      toast.error(err.response?.data.message);
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

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { columnVisibility },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <ResponseLoader isLoading={isLoading} />

      <header className="flex items-center justify-between mb-3 shrink-0">
        <section className="flex space-x-4 items-center">
          <SearchComponent
            data={filterResults}
            displayKey={["schoolName", "username", "email", "mobileNo"]}
            onResults={handleSearchResults}
            onQueryChange={setSearchQuery}
            className="w-[300px]"
          />

          <div>
            <DateRangeFilter
              onDateRangeChange={handleDateFilter}
              title="Search by Registration Date"
            />
          </div>

          <ColumnVisibilitySelector
            columns={table.getAllColumns()}
            buttonVariant="outline"
            buttonSize="default"
          />
        </section>

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
                    <Label htmlFor="mobileNo">Mobile No</Label>
                    <Input
                      id="mobileNo"
                      name="mobileNo"
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

      <section className="flex-1 min-h-0 flex flex-col">
        <CustomTable
          data={filteredData || []}
          columns={columns}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
          pageSizeArray={[10, 20, 50]}
          showSerialNumber={true}
          noDataMessage="No schools found"
          isLoading={isLoading}
          fullHeight={true}
          autoFitRows={true}
        />
      </section>

      <section>
        {/* <div>
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
        </div> */}
      </section>

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

        {permissionTarget && (
          <ModuleAccessModal
            isOpen={permissionDialogOpen}
            onClose={() => {
              setPermissionDialogOpen(false);
              setPermissionTarget(null);
            }}
            targetType="school"
            targetId={permissionTarget._id}
            targetName={permissionTarget.schoolName}
            initialAccess={(permissionTarget as any).access}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["schools"] });
            }}
          />
        )}
      </section>

      {/* <section>
        <FloatingMenu
          onExportPdf={() => {
            console.log("Export PDF triggered");
            exportToPDF(filteredData, columnsForExport, {
              title: "School Master Report",
              companyName: "Parents Eye",
              metadata: {
                Total: `${filteredData.length} schools`,
              },
            });
          }}
          onExportExcel={() => {
            console.log("Export Excel triggered");
            exportToExcel(filteredData, columnsForExport, {
              title: "School Master Report",
              companyName: "Parents Eye",
              metadata: {
                Total: `${filteredData.length} schools`,
              },
            });
          }}
        />
      </section> */}
    </div>
  );
}
