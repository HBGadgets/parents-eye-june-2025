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
import type { ColumnDef } from "@tanstack/react-table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/apiService";
import { Branch } from "@/interface/modal";
import { useExport } from "@/hooks/useExport";
import { formatDate } from "@/util/formatDate";
import { Alert } from "@/components/Alert";
import ResponseLoader from "@/components/ResponseLoader";
import { CustomFilter } from "@/components/ui/CustomFilter";


export default function BranchMaster() {
  const queryClient = useQueryClient();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [filteredData, setFilteredData] = useState<Branch[]>([]);
  const [filterResults, setFilterResults] = useState<Branch[]>([]);

  const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null);
  const [editTarget, setEditTarget] = useState<Branch | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { exportToPDF, exportToExcel } = useExport();

  // Fetch Branch data
  const {
    data: Branchs,
    isLoading,
    isError,
    error,
  } = useQuery<Branch[]>({
    queryKey: ["Branchs"],
    queryFn: async () => {
      const res = await api.get<Branch[]>("/branch");
      return res;
    },
  });

  useEffect(() => {
    if (Branchs && Branchs.length > 0) {
      setFilteredData(Branchs);
      setFilterResults(Branchs); // For search base
    }
  }, [Branchs]);

  // Define the columns for the table
  const columns: ColumnDef<Branch, CellContent>[] = [
    {
      header: "Branch Name",
      accessorFn: (row) => ({
        type: "text",
        value: row.branchName ?? "",
      }),
      cell: (info) => info.getValue(),
      meta: { flex: 1, minWidth: 200, maxWidth: 300 },
    },
     {
      header: "School Name",
      accessorFn: (row) => ({
        type: "text",
        value: row.schoolId.schoolName ?? "",
      }),
      cell: (info) => info.getValue(),
      meta: { flex: 1, minWidth: 200, maxWidth: 300 },
    },
    {
      header: "Mobile",
      accessorFn: (row) => ({
        type: "text",
        value: row.mobileNo ?? "",
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
      header: "Email",
      accessorFn: (row) => ({
        type: "text",
        value: row.email ?? "",
      }),
      cell: (info) => info.getValue(),
      meta: { flex: 1, minWidth: 150, maxWidth: 300 },
    },
    {
      header: "Registration Date",
      accessorFn: (row) => ({
        type: "text",
        value: formatDate(row.createdAt) ?? "",
      }),
      cell: (info) => info.getValue(),
      meta: { flex: 1, minWidth: 150, maxWidth: 300 },
    },
   
  ];

  // columns for export
  const columnsForExport = [
    { key: "branchName", header: "Branch Name" },
    {key:"schoolId.schoolName", header: "school Name"},
    { key: "mobileNo", header: "Mobile No." },
   
    { key: "username", header: "Branch Username" },
    { key: "password", header: "Branch Password" },
    { key: "email", header: "Branch Email" },
  
  ];

  // Define the fields for the edit dialog
  const BranchFieldConfigs: FieldConfig[] = [
    {
      label: "Branch Name",
      key: "branchName",
      type: "text",
      required: true,
    },
    {
      label: "Mobile Number",
      key: "BranchMobile",
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

  // Mutation to add a new Branch
  const addBranchMutation = useMutation({
    mutationFn: async (newBranch: any) => {
      const Branch = await api.post("/branch", newBranch);
      return Branch.Branch;
    },
    onSuccess: (createdBranch) => {
      queryClient.setQueryData<Branch[]>(["Branchs"], (oldBranchs = []) => {
        return [...oldBranchs, createdBranch];
      });
      alert("Branch added successfully.");
    },
    onError: (err) => {
      alert("Failed to add Branch.\nerror: " + err);
    },
  });

 
  // Mutation for edit Branch data
  const updateBranchMutation = useMutation({
    mutationFn: async ({
      BranchId,
      data,
    }: {
      BranchId: string;
      data: Partial<Branch>;
    }) => {
      return await api.put(`/Branch/${BranchId}`, data);
    },
    onSuccess: (_, { BranchId, data }) => {
      queryClient.setQueryData<Branch[]>(["Branchs"], (oldData) => {
        if (!oldData) return [];
        return oldData.map((Branch) =>
          Branch._id === BranchId ? { ...Branch, ...data } : Branch
        );
      });

      // Update filteredData manually
      setFilteredData((prev) =>
        prev.map((Branch) =>
          Branch._id === BranchId ? { ...Branch, ...data } : Branch
        )
      );

      setEditDialogOpen(false);
      setEditTarget(null);
      alert("Branch updated successfully.");
    },
    onError: (err) => {
      alert("Failed to update Branch.\nerror: " + err);
    },
  });

  // Mutation to delete a Branch
  const deleteBranchMutation = useMutation({
    mutationFn: async (BranchId: string) => {
      return await api.delete(`/Branch/${BranchId}`);
    },
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData<Branch[]>(["Branchs"], (oldData) =>
        oldData?.filter((Branch) => Branch._id !== deletedId)
      );
      alert("Branch deleted successfully.");
    },
    onError: (err) => {
      alert("Failed to delete student.\nerror: " + err);
    },
  });

  // Handle search
  const handleSearchResults = useCallback((results: Branch[]) => {
    setFilteredData(results);
  }, []);

  // Handle save action for edit Branch
  const handleSave = (updatedData: Partial<Branch>) => {
    if (!editTarget) return;

    const changedFields: Partial<Record<keyof Branch, unknown>> = {};

    for (const key in updatedData) {
      const newValue = updatedData[key as keyof Branch];
      const oldValue = editTarget[key as keyof Branch];

      if (newValue !== undefined && newValue !== oldValue) {
        changedFields[key as keyof Branch] = newValue;
      }
    }

    if (Object.keys(changedFields).length === 0) {
      console.log("No changes detected.");
      return;
    }

    updateBranchMutation.mutate({
      BranchId: editTarget._id,
      data: changedFields,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = {
      branchName: form.branchName.value,
      username: form.username.value,
      password: form.password.value,
      email: form.email.value,
      BranchMobile: form.BranchMobile.value,
      // fullAccess: form.fullAccess.checked,
    };

    try {
      await addBranchMutation.mutateAsync(data);
      closeButtonRef.current?.click();
      form.reset();
      alert("Branch added successfully.");
    } catch (err) {
      alert("Failed to add Branch.\nerror: " + err);
    }
  };

  const handleDateFilter = useCallback(
    (start: Date | null, end: Date | null) => {
      if (!Branchs || (!start && !end)) {
        setFilteredData(Branchs || []);
        return;
      }

      const filtered = Branchs.filter((Branch) => {
        if (!Branch.createdAt) return false;

        const createdDate = new Date(Branch.createdAt);
        return (!start || createdDate >= start) && (!end || createdDate <= end);
      });

      setFilteredData(filtered);
    },
    [Branchs]
  );



  return (
    <main>
      {/* Progress loader at the top */}
      <ResponseLoader isLoading={isLoading} />

      <header className="flex items-center justify-between mb-4">
        <section className="flex space-x-4">
          {/* Search component */}
          <SearchComponent
            data={filterResults}
            displayKey={["branchName", "username", "email", "BranchMobile"]}
            onResults={handleSearchResults}
            className="w-[300px] mb-4"
          />
          {/* Date range picker */}
          <DateRangeFilter
            onDateRangeChange={handleDateFilter}
            title="Search by Registration Date"
          />
         
        
        </section>

        {/* Add Branch */}
        <section>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="default">Add Branch</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <form onSubmit={handleSubmit} className="space-y-4">
                <DialogHeader>
                  <DialogTitle>Add Branch</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="branchName">Branch Name</Label>
                    <Input
                      id="branchName"
                      name="branchName"
                      placeholder="Enter Branch name"
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
                    <Label htmlFor="BranchMobile">Mobile No</Label>
                    <Input
                      id="BranchMobile"
                      name="BranchMobile"
                      type="tel"
                      placeholder="Enter Branch mobile number"
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
                  <Button type="submit" disabled={addBranchMutation.isPending}>
                    {addBranchMutation.isPending ? "Saving..." : "Save Branch"}
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
          pageSizeArray={[10, 20, 50]}
          // showFilters={true}
          tableClass="bg-white rounded shadow"
          isLoading={isLoading}
        />
      </section>

      {/* Alert Boxes */}
      <section>
       

        <div>
          {deleteTarget && (
            <Alert<Branch>
              title="Are you absolutely sure?"
              description={`This will permanently delete ${deleteTarget?.branchName} and all associated data.`}
              actionButton={(target) => {
                deleteBranchMutation.mutate(target._id);
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
            fields={BranchFieldConfigs}
            title="Edit Branch"
            description="Update the Branch information below. Fields marked with * are required."
            avatarConfig={{
              imageKey: "logo",
              nameKeys: ["branchName"],
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
              title: "Branch Master Report",
              companyName: "Parents Eye",
              metadata: {
                Total: `${filteredData.length} Branchs`,
              },
            });
          }}
          onExportExcel={() => {
            console.log("Export Excel triggered"); // ✅ Add this too
            exportToExcel(filteredData, columnsForExport, {
              title: "Branch Master Report",
              companyName: "Parents Eye",
              metadata: {
                Total: `${filteredData.length} Branchs`,
              },
            });
          }}
        />
      </section>
    </main>
  );
}
