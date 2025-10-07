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
import { Supervisor } from "@/interface/modal";
import { useExport } from "@/hooks/useExport";
import { formatDate } from "@/util/formatDate";
import { Alert } from "@/components/Alert";
import ResponseLoader from "@/components/ResponseLoader";
import { CustomFilter } from "@/components/ui/CustomFilter";
import { ColumnVisibilitySelector } from "@/components/column-visibility-selector";
import { useSchoolData } from "@/hooks/useSchoolData";
import { SearchableSelect } from "@/components/custom-select";
import { useBranchData } from "@/hooks/useBranchData";
import { useDeviceData } from "@/hooks/useDeviceData";

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData, TValue> {
    flex?: number;
    minWidth?: number;
    maxWidth?: number;
  }
}

interface SupervisorResponse {
  total: number;
  page: number;
  totalPages: number;
  supervisors: Supervisor[];
}

interface SelectOption {
  label: string;
  value: string;
}

export default function SupervisorApprove() {
  const queryClient = useQueryClient();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [filteredData, setFilteredData] = useState<Supervisor[]>([]);
  const [filterResults, setFilterResults] = useState<Supervisor[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Supervisor | null>(null);
  const [editTarget, setEditTarget] = useState<Supervisor | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [accessApprove, setAccessApprove] = useState<Supervisor | null>(null);
  const [school, setSchool] = useState<string | undefined>(undefined);
  const [branch, setBranch] = useState<string | undefined>(undefined);
  const [device, setDevice] = useState<string | undefined>(undefined);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const { data: schoolData } = useSchoolData();
  const { data: branchData } = useBranchData();
  const { data: deviceData } = useDeviceData();

  // Fetch supervisor data - FIXED: Extract supervisors array from response
  const {
    data: supervisors,
    isLoading,
    isError,
    error,
  } = useQuery<Supervisor[]>({
    queryKey: ["supervisors"],
    queryFn: async () => {
      const res = await api.get<SupervisorResponse>("/supervisor");
      return res.supervisors; // Extract the supervisors array
    },
  });

  // School data
  const schoolOptions: SelectOption[] = schoolData
    ? Array.from(
        new Map(
          schoolData
            .filter((s) => s._id && s.schoolName)
            .map((s) => [s._id, { label: s.schoolName, value: s._id }])
        ).values()
      )
    : [];

  useEffect(() => {
    if (supervisors && supervisors.length > 0) {
      setFilteredData(supervisors);
      setFilterResults(supervisors); // For search base
    }
  }, [supervisors]);

  // Branch data
  const branchOptions: SelectOption[] = branchData
    ? Array.from(
        new Map(
          branchData
            .filter((s) => s._id && s.branchName)
            .map((s) => [s._id, { label: s.branchName, value: s._id }])
        ).values()
      )
    : [];

  // Device data
  const deviceOptions: SelectOption[] = deviceData?.devices
    ? Array.from(
        new Map(
          deviceData.devices
            .filter((s) => s._id && s.name)
            .map((s) => [s._id, { label: s.name, value: s._id }])
        ).values()
      )
    : [];

  const filteredBranchOptions = useMemo(() => {
    if (!school || !branchData) return [];
    return branchData
      .filter(branch => branch.schoolId?._id === school)
      .map(branch => ({
        label: branch.branchName,
        value: branch._id
      }));
  }, [school, branchData]);

  // Filter devices based on selected branch
  const filteredDeviceOptions = useMemo(() => {
    if (!branch || !deviceData?.devices) return [];
    return deviceData.devices
      .filter(device => device.branchId?._id === branch)
      .map(device => ({
        label: device.name,
        value: device._id
      }));
  }, [branch, deviceData]);

  // Reset branch and device when school changes
  useEffect(() => {
    setBranch(undefined);
    setDevice(undefined);
  }, [school]);

  // Reset device when branch changes
  useEffect(() => {
    setDevice(undefined);
  }, [branch]);

  const columns: ColumnDef<Supervisor, CellContent>[] = [
    {
      header: "Supervisor Name",
      accessorFn: (row) => ({
        type: "text",
        value: row.supervisorName ?? "",
      }),
      meta: { flex: 1, minWidth: 200, maxWidth: 300 },
      enableHiding: true,
    },
     {
      header: "School Name",
      accessorFn: (row) => ({
        type: "text",
        value: row.schoolId?.schoolName ?? "--",
      }),
      meta: { flex: 1, minWidth: 200, maxWidth: 300 },
      enableHiding: true,
    },
     {
      header: "Branch Name",
      accessorFn: (row) => ({
        type: "text",
        value: row.branchId?.branchName ?? "--",
      }),
      meta: { flex: 1, minWidth: 200, maxWidth: 300 },
      enableHiding: true,
    },
    {
      header: "Device Name",
      accessorFn: (row) => ({
        type: "text",
        value: row.deviceObjId?.name ?? "--",
      }),
      meta: { flex: 1, minWidth: 200, maxWidth: 300 },
      enableHiding: true,
    },
    {
      header: "Mobile",
      accessorFn: (row) => ({
        type: "text",
        value: row.supervisorMobile ?? "",
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
      meta: { flex: 1, minWidth: 200 },
      enableHiding: true,
    },
    {
      header: "Status",
      accessorFn: (row) => ({
        type: "text",
        value: row.status ?? "Pending",
      }),
      meta: { flex: 1, minWidth: 120, maxWidth: 150 },
      enableHiding: true,
    },

    {
      header: "Approve/Reject",
      accessorFn: (row) => ({
        type: "group",
        items: row.status === "Pending"
          ? [
              {
                type: "button",
                label: "Approve",
                onClick: () =>
                  ApproveMutation.mutate({
                    _id: row._id,
                    status: "Approve",
                  }),
                disabled: ApproveMutation.isPending,
                className:
                  "flex-shrink-0 text-xs w-20 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-full px-2 py-1 mr-1",
              },
              {
                type: "button",
                label: "Reject",
                onClick: () =>
                  ApproveMutation.mutate({
                    _id: row._id,
                    status: "Rejected",
                  }),
                disabled: ApproveMutation.isPending,
                className:
                  "flex-shrink-0 text-xs w-20 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-full px-2 py-1",
              },
            ]
          : [
              {
                type: "button",
                label: row.status === "Approved" ? "Approved" : "Rejected",
                onClick: () => {},
                disabled: true,
                className: `flex-shrink-0 text-xs w-24 ${
                  row.status === "Approved"
                    ? "bg-green-300 text-green-800"
                    : "bg-red-300 text-red-800"
                } font-semibold rounded-full px-2 py-1`,
              },
            ],
      }),
      meta: {
        flex: 1,
        minWidth: 180,
        maxWidth: 200,
      },
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
            disabled: updateSupervisorMutation.isPending,
          },
          {
            type: "button",
            label: "Delete",
            onClick: () => setDeleteTarget(row),
            className: "text-red-600 cursor-pointer",
            disabled: deleteSupervisorMutation.isPending,
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
    { key: "supervisorName", header: "Supervisor Name" },
    { key: "supervisorMobile", header: "Mobile" },
    { key: "username", header: "Supervisor Username" },
    { key: "password", header: "Supervisor Password" },
    { key: "schoolId.schoolName", header: "School Name" },
    { key: "branchId.branchName", header: "Branch Name" },
    { key: "deviceObjId.name", header: "Device Name" },
    { key: "status", header: "Status" },
    { key: "createdAt", header: "Registration Date" },
  ];

  // Define the fields for the edit dialog
  const supervisorFieldConfigs: FieldConfig[] = [
    {
      label: "Supervisor Name",
      key: "supervisorName",
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
      label: "Branch Name",
      key: "branchId",
      type: "select",
      required: true,
      options: branchOptions,
    },
    {
      label: "Device Name",
      key: "deviceObjId",
      type: "select",
      required: true,
      options: deviceOptions,
    },
    {
      label: "Mobile Number",
      key: "supervisorMobile",
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

  // Mutation to add a new supervisor
  const addSupervisorMutation = useMutation({
    mutationFn: async (newSupervisor: any) => {
      const response = await api.post("/supervisor", newSupervisor);
      return response.data;
    },
    onSuccess: (createdSupervisor, variables) => {
      const school = schoolData?.find(s => s._id === variables.schoolId);
      const branch = branchData?.find(b => b._id === variables.branchId);
      const device = deviceData?.devices?.find(d => d._id === variables.deviceObjId);

      const newSupervisorWithResolvedReferences = {
        ...createdSupervisor,
        password: variables.password,
        schoolId: school
          ? { _id: school._id, schoolName: school.schoolName }
          : { _id: variables.schoolId, schoolName: "Unknown School" },
        branchId: branch
          ? { _id: branch._id, branchName: branch.branchName }
          : { _id: variables.branchId, branchName: "Unknown Branch" },
        deviceObjId: device
          ? { _id: device._id, device: device.name }
          : { _id: variables.deviceObjId, device: "Unknown Device" },
      };

      queryClient.setQueryData<Supervisor[]>(["supervisors"], (oldSupervisors = []) => {
        return [...oldSupervisors, newSupervisorWithResolvedReferences];
      });
    },
    onError: (error: any) => {
      alert(
        `Failed to add supervisor: ${
          error.response?.data?.message || error.message
        }`
      );
    },
  });

  // Fixed: ApproveMutation with correct status values
  const ApproveMutation = useMutation({
    mutationFn: async (supervisor: { _id: string; status: "Approve" | "Rejected" }) => {
      return await api.post(`/supervisor/approve/${supervisor._id}`, {
        status: supervisor.status,
      });
    },
    onSuccess: (updated, variables) => {
      queryClient.setQueryData<Supervisor[]>(["supervisors"], (oldData) =>
        oldData?.map((supervisor) =>
          supervisor._id === variables._id
            ? { 
                ...supervisor, 
                status: variables.status === "Approve" ? "Approved" : "Rejected" 
              }
            : supervisor
        )
      );
      alert("Access updated successfully.");
    },
    onError: (err) => {
      alert("Failed to update access.\nerror: " + err);
    },
  });

  // Mutation for edit supervisor data
  const updateSupervisorMutation = useMutation({
    mutationFn: async ({
      supervisorId,
      data,
    }: {
      supervisorId: string;
      data: Partial<Supervisor>;
    }) => {
      return await api.put(`/supervisor/${supervisorId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supervisors'] });
      setEditDialogOpen(false);
      setEditTarget(null);
      alert("Supervisor updated successfully.");
    },
    onError: (err) => {
      alert("Failed to update supervisor.\nerror: " + err);
    },
  });

  // Mutation to delete a supervisor
  const deleteSupervisorMutation = useMutation({
    mutationFn: async (supervisorId: string) => {
      return await api.delete(`/supervisor/${supervisorId}`);
    },
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData<Supervisor[]>(["supervisors"], (oldData) =>
        oldData?.filter((supervisor) => supervisor._id !== deletedId)
      );
      alert("Supervisor deleted successfully.");
    },
    onError: (err) => {
      alert("Failed to delete supervisor.\nerror: " + err);
    },
  });

  // Handle search
  const handleSearchResults = useCallback((results: Supervisor[]) => {
    setFilteredData(results);
  }, []);

  // Handle save action for edit supervisor
  const handleSave = (updatedData: Partial<Supervisor>) => {
    if (!editTarget) return;

    const changedFields: Partial<Record<keyof Supervisor, unknown>> = {};
    const flatEditTarget = {
      ...editTarget,
      schoolId: editTarget.schoolId._id,
      branchId: editTarget.branchId._id,
      deviceObjId: editTarget.deviceObjId._id,
    };

    for (const key in updatedData) {
      const newValue = updatedData[key as keyof Supervisor];
      const oldValue = editTarget[key as keyof Supervisor];

      if (newValue !== undefined && newValue !== oldValue) {
        changedFields[key as keyof Supervisor] = newValue;
      }
    }

    if (Object.keys(changedFields).length === 0) {
      console.log("No changes detected.");
      return;
    }

    updateSupervisorMutation.mutate({
      supervisorId: editTarget._id,
      data: changedFields,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    if (!school) {
      alert("Please select a school");
      return;
    } else if (!branch) {
      alert("Please select a branch");
      return;
    } else if (!device) {
      alert("Please select a device");
      return;
    }

    const data = {
      supervisorName: formData.get("supervisorName") as string,
      supervisorMobile: formData.get("supervisorMobile") as string,
      username: formData.get("username") as string,
      password: formData.get("password") as string,
      email: formData.get("email") as string,
      schoolId: school,
      branchId: branch,
      deviceObjId: device,
    };

    await addSupervisorMutation.mutateAsync(data);

    if (!addSupervisorMutation.isError) {
      closeButtonRef.current?.click();
      form.reset();
      setSchool(undefined);
      setBranch(undefined);
      setDevice(undefined);
      alert("Supervisor added successfully.");
    }
  };

  const handleDateFilter = useCallback(
    (start: Date | null, end: Date | null) => {
      if (!supervisors || (!start && !end)) {
        setFilteredData(supervisors || []);
        return;
      }

      const filtered = supervisors.filter((supervisor) => {
        if (!supervisor.createdAt) return false;

        const createdDate = new Date(supervisor.createdAt);
        return (!start || createdDate >= start) && (!end || createdDate <= end);
      });

      setFilteredData(filtered);
    },
    [supervisors]
  );

  const handleCustomFilter = useCallback((filtered: Supervisor[]) => {
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
      {/* Progress loader at the top */}
      <ResponseLoader isLoading={isLoading} />

      <header className="flex items-center justify-between mb-4">
        <section className="flex space-x-4">
          {/* Search component */}
          <SearchComponent
            data={filterResults}
            displayKey={["supervisorName", "username", "email", "supervisorMobile"]}
            onResults={handleSearchResults}
            className="w-[300px] mb-4"
          />
          {/* Date range picker */}
          <DateRangeFilter
            onDateRangeChange={handleDateFilter}
            title="Search by Registration Date"
          />

          {/* Custom Filter - Using the exact same design as driver page */}
          <CustomFilter
            data={filteredData}
            originalData={supervisors}
            filterFields={["status"]}
            onFilter={handleCustomFilter}
            placeholder={"Filter by Approval"}
            valueFormatter={(value) => {
              if (!value) return "";

              console.log("myval", value);

              const formatted = value.toString().toLowerCase();

              if (formatted === "rejected") return "Rejected";
              if (formatted === "approved") return "Approved";
              if (formatted === "pending") return "Pending";

              return value;
            }}
          />

          {/* Column visibility selector */}
          <ColumnVisibilitySelector
            columns={table.getAllColumns()}
            buttonVariant="outline"
            buttonSize="default"
          />
        </section>

        {/* Add supervisor */}
        <section>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="default">Add Supervisor</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <form onSubmit={handleSubmit} className="space-y-4">
                <DialogHeader>
                  <DialogTitle>Add Supervisor</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="supervisorName">Supervisor Name</Label>
                    <Input
                      id="supervisorName"
                      name="supervisorName"
                      placeholder="Enter supervisor name"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="schoolId">School</Label>
                    <SearchableSelect
                      value={school}
                      onChange={setSchool}
                      options={schoolOptions}
                      placeholder="Select school"
                      allowClear={true}
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="branchId">Branch</Label>
                    <SearchableSelect
                      value={branch}
                      onChange={setBranch}
                      options={filteredBranchOptions}
                      placeholder={
                        !school ? "Select school first" : filteredBranchOptions.length ? "Select branch" : "No branches available"
                      }
                      allowClear={true}
                      disabled={!school}
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="deviceObjId">Device</Label>
                    <SearchableSelect
                      value={device}
                      onChange={setDevice}
                      options={filteredDeviceOptions}
                      placeholder={!school ? "Select school first" : !branch ? "Select branch first" : filteredDeviceOptions.length ? "Select device" : "No device available"} 
                      allowClear={true}
                      disabled={!branch}
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
                    <Label htmlFor="supervisorMobile">Mobile No</Label>
                    <Input
                      id="supervisorMobile"
                      name="supervisorMobile"
                      type="tel"
                      placeholder="Enter supervisor mobile number"
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
                  <Button type="submit" disabled={addSupervisorMutation.isPending}>
                    {addSupervisorMutation.isPending ? "Saving..." : "Save Supervisor"}
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
          noDataMessage="No supervisors found"
          isLoading={isLoading}
        />
      </section>

      {/* Alert Boxes */}
      <section>
        <div>
          {deleteTarget && (
            <Alert<Supervisor>
              title="Are you absolutely sure?"
              description={`This will permanently delete ${deleteTarget?.supervisorName} and all associated data.`}
              actionButton={(target) => {
                deleteSupervisorMutation.mutate(target._id);
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
            data={{
              ...editTarget,
              schoolId: editTarget.schoolId._id,
              branchId: editTarget.branchId._id,
              deviceObjId: editTarget.deviceObjId._id,
            }}
            isOpen={editDialogOpen}
            onClose={() => {
              setEditDialogOpen(false);
              setEditTarget(null);
            }}
            onSave={handleSave}
            fields={supervisorFieldConfigs}
            title="Edit Supervisor"
            description="Update the supervisor information below. Fields marked with * are required."
            avatarConfig={{
              imageKey: "logo",
              nameKeys: ["supervisorName"],
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
              title: "Supervisor Master Report",
              companyName: "Parents Eye",
              metadata: {
                Total: `${filteredData.length} supervisors`,
              },
            });
          }}
          onExportExcel={() => {
            console.log("Export Excel triggered");
            exportToExcel(filteredData, columnsForExport, {
              title: "Supervisor Master Report",
              companyName: "Parents Eye",
              metadata: {
                Total: `${filteredData.length} supervisors`,
              },
            });
          }}
        />
      </section>
    </main>
  );
}