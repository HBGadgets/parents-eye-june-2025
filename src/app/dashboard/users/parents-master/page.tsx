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
import { useExport } from "@/hooks/useExport";
import { formatDate } from "@/util/formatDate";
import { Alert } from "@/components/Alert";
import ResponseLoader from "@/components/ResponseLoader";
import { ColumnVisibilitySelector } from "@/components/column-visibility-selector";

// Parent interface 
interface Parent {
  _id: string;
  parentName: string;
  mobileNo: string;
  email: string;
  username: string;
  password: string;
  isActive?: boolean;
  createdAt: string;
  updatedAt?: string;
}

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData, TValue> {
    flex?: number;
    minWidth?: number;
    maxWidth?: number;
  }
}

export default function ParentsMaster() {
  const queryClient = useQueryClient();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [filteredData, setFilteredData] = useState<Parent[]>([]);
  const [filterResults, setFilterResults] = useState<Parent[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Parent | null>(null);
  const [editTarget, setEditTarget] = useState<Parent | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const { exportToPDF, exportToExcel } = useExport();

  // Fetch parents data
  const {
    data: parents,
    isLoading,
    isError,
    error,
  } = useQuery<Parent[]>({
    queryKey: ["parents"],
    queryFn: async () => {
      const res = await api.get<Parent[]>("/parent");
      return res;
    },
  });

  useEffect(() => {
    if (parents && parents.length > 0) {
      setFilteredData(parents);
      setFilterResults(parents); // For search base
    }
  }, [parents]);

  // Define the columns for the table
  const columns: ColumnDef<Parent, CellContent>[] = [
    {
      header: "Parent Name",
      accessorFn: (row) => ({
        type: "text",
        value: row.parentName ?? "",
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
      header: "Email",
      accessorFn: (row) => ({
        type: "text",
        value: row.email ?? "",
      }),
      meta: { flex: 1, minWidth: 200, maxWidth: 350 },
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
      accessorFn: (row) => ({
        type: "text",
        value: row.password ?? "",
      }),
      meta: { flex: 1, minWidth: 150, maxWidth: 300 },
      enableHiding: true,
    },
    {
      header: "Status",
      accessorFn: (row) => ({
        type: "text",
        value: row.isActive ? "Active" : "Inactive",
        variant: row.isActive ? "success" : "destructive",
      }),
      meta: { flex: 0.5, minWidth: 130, maxWidth: 150 },
      enableHiding: true,
    },
    {
      header: "Registration Date",
      accessorFn: (row) => ({
        type: "text",
        value: formatDate(row.createdAt) ?? "",
      }),
      meta: { flex: 1, minWidth: 300 },
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
            disabled: updateParentMutation.isPending,
          },
          {
            type: "button",
            label: "Delete",
            onClick: () => setDeleteTarget(row),
            className: "text-red-600 cursor-pointer",
            disabled: deleteParentMutation.isPending,
          },
        ],
      }),
      meta: { flex: 1.5, minWidth: 150, maxWidth: 200 },
      enableSorting: false,
      enableHiding: true,
    },
  ];

  // columns for export
  const columnsForExport = [
    { key: "parentName", header: "Parent Name" },
    { key: "mobileNo", header: "Mobile" },
    { key: "email", header: "Email" },
    { key: "username", header: "Username" },
    { key: "password", header: "Password" },
    {
    key: "isActive", header: "Status",
    formatter: (value) => (value ? "Active" : "Inactive"), },
    {
    key: "createdAt",
    header: "Created At",
    formatter: (value) => new Date(value).toLocaleDateString("en-GB"),
    }
  ];

  // Define the fields for the edit dialog
  const parentFieldConfigs: FieldConfig[] = [
  { label: "Parent Name", key: "parentName", type: "text", required: true },
  { label: "Mobile Number", key: "mobileNo", type: "text", required: true }, // FIXED
  { label: "Email", key: "email", type: "email", required: true },           // FIXED
  { label: "Username", key: "username", type: "text", required: true },
  { label: "Password", key: "password", type: "text", required: true },
  { label: "Active Status", key: "isActive", type: "checkbox" },
];

  // Mutation to add a new parent
  const addParentMutation = useMutation({
    mutationFn: async (newParent: any) => {
      const parent = await api.post("/parent", newParent);
      return parent.parent;
    },
    onSuccess: (createdParent) => {
      queryClient.setQueryData<Parent[]>(["parents"], (oldParents = []) => {
        return [...oldParents, createdParent];
      });
    },
  });

  // Mutation for edit parent data
  const updateParentMutation = useMutation({
    mutationFn: async ({
      parentId,
      data,
    }: {
      parentId: string;
      data: Partial<Parent>;
    }) => {
      return await api.put(`/parent/${parentId}`, data);
    },
    onSuccess: (_, { parentId, data }) => {
      queryClient.setQueryData<Parent[]>(["parents"], (oldData) => {
        if (!oldData) return [];
        return oldData.map((parent) =>
          parent._id === parentId ? { ...parent, ...data } : parent
        );
      });

      // Update filteredData manually
      setFilteredData((prev) =>
        prev.map((parent) =>
          parent._id === parentId ? { ...parent, ...data } : parent
        )
      );

      setEditDialogOpen(false);
      setEditTarget(null);
      alert("Parent updated successfully.");
    },
    onError: (err) => {
      alert("Failed to update parent.\nerror: " + err);
    },
  });

// Mutation to delete parent(s)
const deleteParentMutation = useMutation({
  mutationFn: async (ids: string[]) => {
    // backend expects { ids: [...] }
    return await api.mulDelete("/parent", { ids });
  },
  onSuccess: () => {
    alert("Parent(s) deleted successfully!");
     queryClient.invalidateQueries({ queryKey: ["parents"] });
  },
  onError: (err: any) => {
    console.error("Delete error:", err);
    alert(err?.response?.data?.message || "Failed to delete parent(s).");
  },
});



  // Handle search
  const handleSearchResults = useCallback((results: Parent[]) => {
    setFilteredData(results);
  }, []);

  // Handle save action for edit parent
  const handleSave = (updatedData: Partial<Parent>) => {
    if (!editTarget) return;

    const changedFields: Partial<Record<keyof Parent, unknown>> = {};

    for (const key in updatedData) {
      const newValue = updatedData[key as keyof Parent];
      const oldValue = editTarget[key as keyof Parent];

      if (newValue !== undefined && newValue !== oldValue) {
        changedFields[key as keyof Parent] = newValue;
      }
    }

    if (Object.keys(changedFields).length === 0) {
      console.log("No changes detected.");
      return;
    }

    updateParentMutation.mutate({
      parentId: editTarget._id,
      data: changedFields,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = {
      parentName: form.parentName.value,
      parentMobile: form.contactNo.value,
      parentEmail: form.email.value,
      username: form.username.value,
      password: form.password.value,
      address: form.address.value,
      isActive: form.isActive.checked,
    };

    try {
      await addParentMutation.mutateAsync(data);
      closeButtonRef.current?.click();
      form.reset();
      alert("Parent added successfully.");
    } catch (err) {
      alert("Failed to add parent.\nerror: " + err);
    }
  };

  const handleDateFilter = useCallback(
    (start: Date | null, end: Date | null) => {
      if (!parents || (!start && !end)) {
        setFilteredData(parents || []);
        return;
      }

      const filtered = parents.filter((parent) => {
        if (!parent.createdAt) return false;

        const createdDate = new Date(parent.createdAt);
        return (!start || createdDate >= start) && (!end || createdDate <= end);
      });

      setFilteredData(filtered);
    },
    [parents]
  );

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
            displayKey={["parentName", "username", "parentEmail", "parentMobile"]}
            onResults={handleSearchResults}
            className="w-[300px] mb-4"
          />
          {/* Date range picker */}
          <DateRangeFilter
            onDateRangeChange={handleDateFilter}
            title="Search by Registration Date"
          />
          {/* Column visibility selector */}
          <ColumnVisibilitySelector
            columns={table.getAllColumns()}
            buttonVariant="outline"
            buttonSize="default"
          />
        </section>

        {/* Add Parent */}
        <section>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="default">Add Parent</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <form onSubmit={handleSubmit} className="space-y-4">
                <DialogHeader>
                  <DialogTitle>Add Parent</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="parentName">Parent Name</Label>
                    <Input
                      id="parentName"
                      name="parentName"
                      placeholder="Enter parent name"
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="parentEmail">Email</Label>
                    <Input
                      id="parentEmail"
                      name="parentEmail"
                      type="email"
                      placeholder="Enter email address"
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="contactNo">Mobile No</Label>
                    <Input
                      id="contactNo"
                      name="contactNo"
                      type="tel"
                      placeholder="Enter mobile number"
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

                  <div className="flex items-center gap-3 mt-6">
                    <input
                      type="checkbox"
                      id="isActive"
                      name="isActive"
                      className="h-5 w-5"
                      defaultChecked
                    />
                    <Label htmlFor="isActive">Active Status</Label>
                  </div>
                </div>

                <DialogFooter>
                  <DialogClose asChild>
                    <Button ref={closeButtonRef} variant="outline">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button type="submit" disabled={addParentMutation.isPending}>
                    {addParentMutation.isPending ? "Saving..." : "Save Parent"}
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
          pageSizeArray={[5, 10, 20, 50]}
          maxHeight={600}
          minHeight={200}
          showSerialNumber={true}
          noDataMessage="No parents found"
          isLoading={isLoading}
        />
      </section>

      {/* Alert Boxes */}
      <section>
        <div>
          {deleteTarget && (
            <Alert<Parent>
              title="Are you absolutely sure?"
              description={`This will permanently delete ${deleteTarget?.parentName} and all associated data.`}
              actionButton={(target) => {
                deleteParentMutation.mutate([target._id]);
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
            fields={parentFieldConfigs}
            title="Edit Parent"
            description="Update the parent information below. Fields marked with * are required."
            avatarConfig={{
              imageKey: "avatar",
              nameKeys: ["parentName"],
            }}
          />
        )}
      </section>

      {/* Floating Menu */}
      <section>
        <FloatingMenu
          onExportPdf={() => {
            console.log("Export PDF triggered");
            exportToPDF(filteredData, columnsForExport, {
              title: "Parents Master Report",
              companyName: "Parents Eye",
              metadata: {
                Total: `${filteredData.length} parents`,
              },
            });
          }}
          onExportExcel={() => {
            console.log("Export Excel triggered");
            exportToExcel(filteredData, columnsForExport, {
              title: "Parents Master Report",
              companyName: "Parents Eye",
              metadata: {
                Total: `${filteredData.length} parents`,
              },
            });
          }}
        />
      </section>
    </main>
  );
}