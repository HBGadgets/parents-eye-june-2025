"use client";

import React, { useCallback, useEffect, useState, useRef, useMemo } from "react";
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
import { Combobox } from "@/components/ui/combobox";
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
import { useSchoolData } from "@/hooks/useSchoolData";
import { branch } from "@/interface/modal";
import { useExport } from "@/hooks/useExport";
import { formatDate } from "@/util/formatDate";
import { Alert } from "@/components/Alert";
import ResponseLoader from "@/components/ResponseLoader";
import { CustomFilter } from "@/components/ui/CustomFilter";
import { ColumnVisibilitySelector } from "@/components/column-visibility-selector";
import DatePicker from 'react-datepicker';
import { CalendarDays } from 'lucide-react';

import 'react-datepicker/dist/react-datepicker.css';
import ExpirationDatePicker from "@/components/ui/ExpirationDatePicker";

type branchAccess = {
  _id: string;
  branchName: string;
  fullAccess: boolean;
};
interface SchoolMinimal {
  _id: string;
  schoolName: string;
}
declare module "@tanstack/react-table" {
  interface ColumnMeta<TData, TValue> {
    flex?: number;
    minWidth?: number;
    maxWidth?: number;
  }
}

export default function BranchMaster() {
  const queryClient = useQueryClient();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [filteredData, setFilteredData] = useState<branch[]>([]);
  const [filterResults, setFilterResults] = useState<branch[]>([]);
  const [accessTarget, setAccessTarget] = useState<branch | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<branch | null>(null);
  const [editTarget, setEditTarget] = useState<branch | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const { exportToPDF, exportToExcel } = useExport();
  const { data: schoolData } = useSchoolData();
  const [school, setSchool] = useState<string>("");
  const [schoolSearch, setSchoolSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isVerificationDialogOpen, setIsVerificationDialogOpen] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [currentProtectedField, setCurrentProtectedField] = useState<string | null>(null);

  // Fetch branch data
  const {
    data: branchs,
    isLoading,
    isError,
    error,
  } = useQuery<branch[]>({
    queryKey: ["branchs"],
    queryFn: async () => {
      const res = await api.get<branch[]>("/branch");
      return res;
    },
  });

  // School data - Convert to Combobox format
  const schoolOptions = useMemo(() => 
    schoolData && schoolData.length > 0 
      ? schoolData
          .filter((s) => s._id && s.schoolName)
          .map((s) => ({ 
            label: s.schoolName, 
            value: s._id 
          }))
      : [], 
    [schoolData]
  );

  useEffect(() => {
    if (branchs && branchs.length > 0) {
      setFilteredData(branchs);
      setFilterResults(branchs);
    }
  }, [branchs]);

  // Define the columns for the table
  const columns: ColumnDef<branch, CellContent>[] = [
    {
      header: "Branch Name",
      accessorFn: (row) => ({
        type: "text",
        value: row.branchName ?? "",
      }),
      meta: { flex: 1, minWidth: 200, maxWidth: 300 },
      enableHiding: true,
    },
    {
      header: "School Name",
      accessorFn: (row) => ({
        type: "text",
        value: row.schoolId.schoolName ?? "",
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
      accessorFn: (row) => ({
        type: "text",
        value: row.password ?? "",
      }),
      meta: { flex: 1, minWidth: 150, maxWidth: 300 },
      enableHiding: true,
    },
    {
      header: "Registration Date",
      accessorFn: (row) => ({
        type: "text",
        value: formatDate(row.createdAt) ?? "",
      }),
      meta: { flex: 1, minWidth: 150, maxWidth: 300 },
      enableHiding: true,
    },
  
    {
  header: "Expiration Date",
  accessorFn: (row) => ({
    type: "text",
    value: row.subscriptionExpirationDate
      ? formatDate(row.subscriptionExpirationDate)
      : "---",
  }),
  meta: { flex: 1, minWidth: 150, maxWidth: 300 },
  enableHiding: true,
},

    {
      header: "Access",
      accessorFn: (row) => ({
        type: "group",
        items: [
          {
            type: "button",
            label: row.fullAccess
              ? "Grant Limited Access"
              : "Grant Full Access",
            onClick: () => setAccessTarget(row),
            disabled: accessMutation.isPending,
            className: `w-38 text-center text-sm bg-yellow-400 hover:bg-yellow-500 font-semibold rounded-full px-4 py-2 ${
              row.fullAccess ? "text-red-600" : "text-emerald-600"
            }`,
          },
        ],
      }),
      meta: { flex: 1.5, minWidth: 150, maxWidth: 200 },
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
            disabled: accessMutation.isPending,
          },
          {
            type: "button",
            label: "Delete",
            onClick: () => setDeleteTarget(row),
            disabled: deletebranchMutation.isPending,
          },
        ],
      }),
      meta: { flex: 1.5, minWidth: 150, maxWidth: 200 },
      enableSorting: false,
      enableHiding: true,
    },
  ];

  // Columns for export
  const columnsForExport = [
    { key: "branchName", header: "Branch Name" },
    { key: "schoolId.schoolName", header: "School Name" },
    { key: "mobileNo", header: "Mobile" },
    { key: "email", header: "Email" },
    { key: "username", header: "branch Username" },
    { key: "password", header: "branch Password" },
        { key: "subscriptionExpirationDate", header: "Expiration Date" },

        { key: "createdAt", header: "Registration Date" },

    {
      key: "fullAccess",
      header: "Access Level",
      formatter: (val: boolean) => (val ? "Full Access" : "Limited Access"),
    },
  ];

  // Define the fields for the edit dialog
  const getBranchFieldConfigs = (schoolOptions: { label: string; value: string }[]): FieldConfig[] => [
    {
      label: "Branch Name",
      key: "branchName",
      type: "text",
      required: true,
    },
    {
      label: "School Name",
      key: "schoolId",
      type: "select",
      required: true,
      options: schoolOptions,
    },
  {
  label: "Mobile Number",
  key: "mobileNo",
  type: "text",
  required: true,
  transformInput: (value) => String(value), // Add this to ensure string conversion
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
      {
      label: "Expiration Date",
      key: "subscriptionExpirationDate",
      type: "date",
      isProtected: true,
      disabled: !isVerified, // Disabled until verified
      onFocus: () => {
        if (!isVerified) {
          setCurrentProtectedField("subscriptionExpirationDate");
          setIsVerificationDialogOpen(true);
        }
      }
    },

  ];
  const handleVerificationSuccess = () => {
    setIsVerified(true);
    setIsVerificationDialogOpen(false);
  };
  // Mutation to add a new branch
  const addbranchMutation = useMutation({
    mutationFn: async (newbranch: any) => {
      const branch = await api.post("/branch", newbranch);
      return branch.branch;
    },
    onSuccess: (createdbranch, variables) => {
      const school = schoolData?.find(s => s._id === variables.schoolId);
      const newBranchWithSchool: branch = {
        ...createdbranch,
        password: variables.password,
        schoolId: {
          _id: createdbranch.schoolId,
          schoolName: school?.schoolName || "Unknown School"
        }
      };

      queryClient.setQueryData<branch[]>(["branchs"], (oldbranchs = []) => {
        return [...oldbranchs, newBranchWithSchool];
      });
    },
  });

  // Mutation for Access control
  const accessMutation = useMutation({
    mutationFn: async (branch: { _id: string; fullAccess: boolean }) => {
      return await api.put(`/branch/accessgrant/${branch._id}`, {
        fullAccess: branch.fullAccess,
      });
    },
    onSuccess: (updated, variables) => {
      queryClient.setQueryData<branch[]>(["branchs"], (oldData) =>
        oldData?.map((branch) =>
          branch._id === variables._id
            ? { ...branch, fullAccess: variables.fullAccess }
            : branch
        )
      );
      alert("Access updated successfully.");
    },
    onError: (err) => {
      alert("Failed to update access.\nerror: " + err);
    },
  });

  // Mutation for edit branch data
  const updatebranchMutation = useMutation({
    mutationFn: async ({
      branchId,
      data,
    }: {
      branchId: string;
      data: Partial<branch>;
    }) => {
      return await api.put(`/branch/${branchId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branchs'] });
      setEditDialogOpen(false);
      setEditTarget(null);
      alert("branch updated successfully.");
    },
    onError: (err) => {
      alert("Failed to update branch.\nerror: " + err);
    },
  });

  // Mutation to delete a branch
  const deletebranchMutation = useMutation({
    mutationFn: async (branchId: string) => {
      return await api.delete(`/branch/${branchId}`);
    },
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData<branch[]>(["branchs"], (oldData) =>
        oldData?.filter((branch) => branch._id !== deletedId)
      );
      alert("branch deleted successfully.");
    },
    onError: (err) => {
      alert("Failed to delete student.\nerror: " + err);
    },
  });

  // Handle search
  const handleSearchResults = useCallback((results: branch[]) => {
    setFilteredData(results);
  }, []);

  // Handle save action for edit branch
 const handleSave = (updatedData: Partial<branch>) => {
  if (!editTarget) return;

  const changedFields: Partial<Record<keyof branch, unknown>> = {};
  const flatEditTarget = {
    ...editTarget,
    schoolId: editTarget.schoolId._id, // Use the ID for comparison
  };

  for (const key in updatedData) {
    const newValue = updatedData[key as keyof branch];
    const oldValue = flatEditTarget[key as keyof branch];

    if (newValue !== undefined && newValue !== oldValue) {
      changedFields[key as keyof branch] = newValue;
    }
  }

    if (Object.keys(changedFields).length === 0) {
      console.log("No changes detected.");
      return;
    }

    updatebranchMutation.mutate({
      branchId: editTarget._id,
      data: changedFields,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    
    if (!school) {
      alert("Please select a school");
      return;
    }

const formattedDate = selectedDate
  ? selectedDate.toLocaleDateString('en-CA')
  : "";


    const data = {
      branchName: form.branchName.value,
      schoolId: school,
      mobileNo: form.branchMobile.value,
      username: form.username.value,
      password: form.password.value,
      email: form.email.value,
      subscriptionExpirationDate:formattedDate,
      fullAccess: form.fullAccess.checked,
    };

    try {
      await addbranchMutation.mutateAsync(data);
      closeButtonRef.current?.click();
      form.reset();
      setSchool("");
      setSchoolSearch("");
      alert("Branch added successfully.");
    } catch (err: any) {
      alert(`Failed to add branch: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleDateFilter = useCallback(
    (start: Date | null, end: Date | null) => {
      if (!branchs || (!start && !end)) {
        setFilteredData(branchs || []);
        return;
      }

      const filtered = branchs.filter((branch) => {
        if (!branch.createdAt) return false;

        const createdDate = new Date(branch.createdAt);
        return (!start || createdDate >= start) && (!end || createdDate <= end);
      });

      setFilteredData(filtered);
    },
    [branchs]
  );

  const handleCustomFilter = useCallback((filtered: branch[]) => {
    setFilteredData(filtered);
  }, []);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { columnVisibility },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <main>
      <ResponseLoader isLoading={isLoading} />

      <header className="flex items-center justify-between mb-4">
        <section className="flex space-x-4">
          <SearchComponent
            data={filterResults}
            displayKey={["branchName", "username", "email", "branchMobile"]}
            onResults={handleSearchResults}
            className="w-[300px] mb-4"
          />
          <DateRangeFilter
            onDateRangeChange={handleDateFilter}
            title="Search by Registration Date"
          />
          <CustomFilter
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
          />
          <ColumnVisibilitySelector
            columns={table.getAllColumns()}
            buttonVariant="outline"
            buttonSize="default"
          />
        </section>

        <section>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="default">Add branch</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <form onSubmit={handleSubmit} className="space-y-4">
                <DialogHeader>
                  <DialogTitle>Add branch</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="branchName">branch Name</Label>
                    <Input
                      id="branchName"
                      name="branchName"
                      placeholder="Enter branch name"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="schoolId">School *</Label>
                    <Combobox 
                      items={schoolOptions} 
                      value={school} 
                      onValueChange={setSchool}
                      placeholder="Search school..." 
                      searchPlaceholder="Search schools..." 
                      emptyMessage="No school found."
                      width="w-full" 
                      onSearchChange={setSchoolSearch} 
                      searchValue={schoolSearch} 
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
                    <Label htmlFor="branchMobile">Mobile No</Label>
                    <Input
                      id="branchMobile"
                      name="branchMobile"
                      type="tel"
                      placeholder="Enter branch mobile number"
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
                  
        
   <ExpirationDatePicker value={selectedDate} onChange={setSelectedDate} />

                  <div className="flex items-center gap-3 mt-6">
                    <input
                      type="checkbox"
                      id="fullAccess"
                      name="fullAccess"
                      className="h-5 w-5"
                    />
                    <Label htmlFor="fullAccess">Full Access</Label>
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button ref={closeButtonRef} variant="outline">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button type="submit" disabled={addbranchMutation.isPending}>
                    {addbranchMutation.isPending ? "Saving..." : "Save branch"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </section>
      </header>

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
          noDataMessage="No branchs found"
          isLoading={isLoading}
        />
      </section>

      <section>
        <div>
          <Alert<branchAccess>
            title="Are you absolutely sure?"
            description={`You are about to give ${accessTarget?.branchName} ${
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

        <div>
          {deleteTarget && (
            <Alert<branch>
              title="Are you absolutely sure?"
              description={`This will permanently delete ${deleteTarget?.branchName} and all associated data.`}
              actionButton={(target) => {
                deletebranchMutation.mutate(target._id);
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
        {editTarget && (
          <DynamicEditDialog
            data={{
              ...editTarget,
              schoolId: editTarget.schoolId._id,
            }}
            isOpen={editDialogOpen}
            onClose={() => {
              setEditDialogOpen(false);
              setEditTarget(null);
              setIsVerified(false)
            }}
            onSave={handleSave}
            fields={getBranchFieldConfigs(schoolOptions)}
            title="Edit Branch"
            description="Update the branch information below. Fields marked with * are required."
            avatarConfig={{
              imageKey: "logo",
              nameKeys: ["branchName"],
            }}
          />
        )}
      </section>
      
      <section>
        <FloatingMenu
          onExportPdf={() => {
            exportToPDF(filteredData, columnsForExport, {
              title: "branch Master Report",
              companyName: "Parents Eye",
              metadata: {
                Total: `${filteredData.length} branchs`,
              },
            });
          }}
          onExportExcel={() => {
            exportToExcel(filteredData, columnsForExport, {
              title: "branch Master Report",
              companyName: "Parents Eye",
              metadata: {
                Total: `${filteredData.length} branchs`,
              },
            });
          }}
        />
      </section>
    </main>
  );
}