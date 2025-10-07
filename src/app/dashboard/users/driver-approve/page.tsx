"use client";

import React, {
  useCallback,
  useEffect,
  useState,
  useRef,
  useMemo,
} from "react";

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
// import { driver } from "@/interface/modal";
import { useExport } from "@/hooks/useExport";
import { formatDate } from "@/util/formatDate";
import { Alert } from "@/components/Alert";
import ResponseLoader from "@/components/ResponseLoader";
import { CustomFilter } from "@/components/ui/CustomFilter";
import { ColumnVisibilitySelector } from "@/components/column-visibility-selector";
import { useSchoolData } from "@/hooks/useSchoolData";
import { SearchableSelect } from "@/components/custom-select";
import { useBranchData } from "@/hooks/useBranchData";
// import { Value } from "@radix-ui/react-select";
import { useDeviceData } from "@/hooks/useDeviceData";
import { Driver } from "@/interface/modal";
// import { headers } from "next/headers";
// interface SchoolMinimal {
//   _id: string;
//   schoolName: string;
// }
// interface BranchMinimal {
//   _id: string;
//   branchName: string;
// }
// interface DeviceMinimal {
//   _id: string;
//   name: string;
// }
declare module "@tanstack/react-table" {
  interface ColumnMeta<TData, TValue> {
    flex?: number;
    minWidth?: number;
    maxWidth?: number;
  }
}

export default function driverApprove() {
  const queryClient = useQueryClient();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [filteredData, setFilteredData] = useState<Driver[]>([]);
  const [filterResults, setFilterResults] = useState<Driver[]>([]);
  // const [accessTarget, setAccessTarget] = useState<driver | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Driver | null>(null);
  const [editTarget, setEditTarget] = useState<Driver | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const { exportToPDF, exportToExcel } = useExport();
  // const [accessApprove, setAccessApprove] = useState<Driver | null>(null);
  const [school, setSchool] = useState<string | undefined>(undefined);
  const { data: schoolData } = useSchoolData();
  const [branch, setbranch] = useState<string | undefined>(undefined);
  const { data: branchData } = useBranchData();
  const [device, setdevice] = useState<string | undefined>(undefined);
  const { data: deviceData } = useDeviceData();

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Fetch driver data
  const { data: drivers, isLoading } = useQuery<Driver[]>({
    queryKey: ["drivers"],
    queryFn: async () => {
      const res = await api.get<Driver[]>("/driver");
      return res;
    },
  });

  //school data
  const schoolOptions: selectOption[] = schoolData
    ? Array.from(
        new Map(
          schoolData
            .filter((s) => s._id && s.schoolName)
            .map((s) => [s._id, { label: s.schoolName, value: s._id }])
        ).values()
      )
    : [];

  useEffect(() => {
    if (drivers && drivers.length > 0) {
      setFilteredData(drivers);
      setFilterResults(drivers); // For search base
    }
  }, [drivers]);

  //branch DATA
  const branchOptions: selectOption[] = branchData
    ? Array.from(
        new Map(
          branchData
            .filter((s) => s._id && s.branchName)
            .map((s) => [s._id, { label: s.branchName, value: s._id }])
        ).values()
      )
    : [];

  //device DATA
  const deviceOptions: selectOption[] = deviceData?.devices
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
    console.log("my school", school);
    return branchData
      .filter((branch) => branch.schoolId?._id === school)
      .map((branch) => ({
        label: branch.branchName,
        value: branch._id,
      }));
  }, [school, branchData]);

  // Filter devices based on selected branch
  const filteredDeviceOptions = useMemo(() => {
    if (!branch || !deviceData?.devices) return [];
    return deviceData.devices
      .filter((device) => device.branchId?._id === branch)
      .map((device) => ({
        label: device.name,
        value: device._id,
      }));
  }, [branch, deviceData]);

  // Reset branch and device when school changes
  useEffect(() => {
    setbranch(undefined);
    setdevice(undefined);
  }, [school]);

  // Reset device when branch changes
  useEffect(() => {
    setdevice(undefined);
  }, [branch]);

  const columns: ColumnDef<driver, CellContent>[] = [
    {
      header: "driver Name",
      accessorFn: (row) => ({
        type: "text",
        value: row.driverName ?? "",
      }),
      // cell: (info) => info.getValue(),
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
        value: row.driverMobile ?? "",
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

    {
      header: "Approve/Reject",
      accessorFn: (row) => ({
        type: "group",
        items:
          row.isApproved === "Pending"
            ? [
                {
                  type: "button",
                  label: "Approved",
                  onClick: () =>
                    ApproveMutation.mutate({
                      _id: row._id,
                      isApproved: "Approved",
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
                      isApproved: "Rejected",
                    }),
                  disabled: ApproveMutation.isPending,
                  className:
                    "flex-shrink-0 text-xs w-20 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-full px-2 py-1",
                },
              ]
            : [
                {
                  type: "button",
                  label:
                    row.isApproved === "Approved" ? "Approved" : "Rejected",
                  onClick: () => {},
                  disabled: true,
                  className: `flex-shrink-0 text-xs w-24 ${
                    row.isApproved === "Approved"
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
            disabled: updatedriverMutation.isPending,
          },
          {
            type: "button",
            label: "Delete",
            onClick: () => setDeleteTarget(row),
            className: "text-red-600 cursor-pointer",
            disabled: deletedriverMutation.isPending,
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
    { key: "driverName", header: "driver Name" },
    { key: "driverMobile", header: "Mobile" },
    { key: "username", header: "driver Username" },
    { key: "password", header: "driver Password" },
    { key: "schoolId.schoolName", header: "School Name" },
    { key: "branchId.branchName", header: "Branch Name" },
    {
      key: "deviceObjId.name",
      header: "Device Name",
    },
    {
      key: "isApproved",
      header: "status",
    },
    { key: "createdAt", header: "Registration Date" },
  ];

  // Define the fields for the edit dialog
  const driverFieldConfigs: FieldConfig[] = [
    {
      label: "driver Name",
      key: "driverName",
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
      key: "driverMobile",
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

  // Mutation to add a new driver

  const adddriverMutation = useMutation({
    mutationFn: async (newdriver: any) => {
      const response = await api.post("/driver", newdriver);
      return response.data; // assumes `data` has the created driver object
    },
    onSuccess: (createddriver, variables) => {
      const school = schoolData?.find((s) => s._id === variables.schoolId);
      const branch = branchData?.find((b) => b._id === variables.branchId);
      const device = deviceData?.devices?.find(
        (d) => d._id === variables.deviceObjId
      );

      const newdriverWithResolvedReferences = {
        ...createddriver,
        password: variables.password, // since backend likely won't return it
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

      queryClient.setQueryData<driver[]>(["drivers"], (olddrivers = []) => {
        return [...olddrivers, newdriverWithResolvedReferences];
      });
    },

    onError: (error: any) => {
      alert(
        `Failed to add driver: ${
          error.response?.data?.message || error.message
        }`
      );
    },
  });

  const ApproveMutation = useMutation({
    mutationFn: async (driver: {
      _id: string;
      isApproved: "Approve" | "Rejected";
    }) => {
      return await api.post(`/driver/approve/${driver._id}`, {
        isApproved: driver.isApproved,
      });
    },
    onSuccess: (updated, variables) => {
      queryClient.setQueryData<driver[]>(["drivers"], (oldData) =>
        oldData?.map((driver) =>
          driver._id === variables._id
            ? { ...driver, isApproved: variables.isApproved }
            : driver
        )
      );
      alert("Access updated successfully.");
    },
    onError: (err) => {
      alert("Failed to update access.\nerror: " + err);
    },
  });
  // Mutation for edit driver data
  const updatedriverMutation = useMutation({
    mutationFn: async ({
      driverId,
      data,
    }: {
      driverId: string;
      data: Partial<driver>;
    }) => {
      return await api.put(`/driver/${driverId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver"] });
      setEditDialogOpen(false);
      setEditTarget(null);
      alert("branch updated successfully.");
    },
    onError: (err) => {
      alert("Failed to update branch.\nerror: " + err);
    },
  });

  // Mutation to delete a driver
  const deletedriverMutation = useMutation({
    mutationFn: async (driverId: string) => {
      return await api.delete(`/driver/${driverId}`);
    },
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData<driver[]>(["drivers"], (oldData) =>
        oldData?.filter((driver) => driver._id !== deletedId)
      );
      alert("driver deleted successfully.");
    },
    onError: (err) => {
      alert("Failed to delete driver.\nerror: " + err);
    },
  });

  // Handle search
  const handleSearchResults = useCallback((results: driver[]) => {
    setFilteredData(results);
  }, []);

  // Handle save action for edit driver
  const handleSave = (updatedData: Partial<driver>) => {
    if (!editTarget) return;

    const changedFields: Partial<Record<keyof driver, unknown>> = {};
    const flatEditTarget = {
      ...editTarget,
      schoolId: editTarget.schoolId._id,
      branchId: editTarget.branchId._id,
      deviceObjId: editTarget.deviceObjId._id,
    };
    for (const key in updatedData) {
      const newValue = updatedData[key as keyof driver];
      const oldValue = editTarget[key as keyof driver];

      if (newValue !== undefined && newValue !== oldValue) {
        changedFields[key as keyof driver] = newValue;
      }
    }

    if (Object.keys(changedFields).length === 0) {
      console.log("No changes detected.");
      return;
    }

    updatedriverMutation.mutate({
      driverId: editTarget._id,
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
      driverName: formData.get("driverName") as string,
      driverMobile: formData.get("driverMobile") as string,
      username: formData.get("username") as string,
      password: formData.get("password") as string,
      email: formData.get("email") as string,
      schoolId: school,
      branchId: branch,
      deviceObjId: device,
    };

    await adddriverMutation.mutateAsync(data); // let onSuccess/onError handle feedback

    if (!adddriverMutation.isError) {
      closeButtonRef.current?.click();
      form.reset();
      setSchool(undefined);
      alert("driver added successfully.");
    }
  };

  const handleDateFilter = useCallback(
    (start: Date | null, end: Date | null) => {
      if (!drivers || (!start && !end)) {
        setFilteredData(drivers || []);
        return;
      }

      const filtered = drivers.filter((driver) => {
        if (!driver.createdAt) return false;

        const createdDate = new Date(driver.createdAt);
        return (!start || createdDate >= start) && (!end || createdDate <= end);
      });

      setFilteredData(filtered);
    },
    [drivers]
  );

  const handleCustomFilter = useCallback((filtered: driver[]) => {
    setFilteredData(filtered);
  }, []);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { columnVisibility },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
  });

  console.log("driver............",drivers)

  return (
    <main>
      {/* Progress loader at the top */}
      <ResponseLoader isLoading={isLoading} />

      <header className="flex items-center justify-between mb-4">
        <section className="flex space-x-4">
          {/* Search component */}
          <SearchComponent
            data={filterResults}
            displayKey={["driverName", "username", "email", "driverMobile"]}
            onResults={handleSearchResults}
            className="w-[300px] mb-4"
          />
          {/* Date range picker */}
          <DateRangeFilter
            onDateRangeChange={handleDateFilter}
            title="Search by Registration Date"
          />

          <CustomFilter
            data={filteredData}
            originalData={drivers}
            filterFields={["isApproved"]}
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

        {/* Add driver */}
        <section>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="default">Add driver</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <form onSubmit={handleSubmit} className="space-y-4">
                <DialogHeader>
                  <DialogTitle>Add driver</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="driverName">driver Name</Label>
                    <Input
                      id="driverName"
                      name="driverName"
                      placeholder="Enter driver name"
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
                      onChange={setbranch}
                      options={filteredBranchOptions}
                      // placeholder={filteredBranchOptions.length ? "Select branch" : "No branches available"}
                      placeholder={
                        !school
                          ? "select school first"
                          : filteredBranchOptions.length
                          ? "select branch"
                          : "No branches available"
                      }
                      allowClear={true}
                      disabled={!school}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="deviceObjId">Device</Label>
                    <SearchableSelect
                      value={device}
                      onChange={setdevice}
                      options={filteredDeviceOptions}
                      // placeholder={filteredDeviceOptions.length ? "Select device" : "No devices available"}
                      placeholder={
                        !school
                          ? "select school first"
                          : !branch
                          ? "Select branch first"
                          : filteredDeviceOptions.length
                          ? "select device"
                          : "No device available"
                      }
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
                    <Label htmlFor="driverMobile">Mobile No</Label>
                    <Input
                      id="driverMobile"
                      name="driverMobile"
                      type="tel"
                      placeholder="Enter driver mobile number"
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
                  <Button type="submit" disabled={adddriverMutation.isPending}>
                    {adddriverMutation.isPending ? "Saving..." : "Save driver"}
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
          noDataMessage="No drivers found"
          isLoading={isLoading}
        />
      </section>

      {/* Alert Boxes */}
      <section>
        <div>
          {deleteTarget && (
            <Alert<driver>
              title="Are you absolutely sure?"
              description={`This will permanently delete ${deleteTarget?.driverName} and all associated data.`}
              actionButton={(target) => {
                deletedriverMutation.mutate(target._id);
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
            fields={driverFieldConfigs}
            title="Edit driver"
            description="Update the driver information below. Fields marked with * are required."
            avatarConfig={{
              imageKey: "logo",
              nameKeys: ["driverName"],
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
              title: "driver Master Report",
              companyName: "Parents Eye",
              metadata: {
                Total: `${filteredData.length} drivers`,
              },
            });
          }}
          onExportExcel={() => {
            console.log("Export Excel triggered"); // ✅ Add this too
            exportToExcel(filteredData, columnsForExport, {
              title: "driver Master Report",
              companyName: "Parents Eye",
              metadata: {
                Total: `${filteredData.length} drivers`,
              },
            });
          }}
        />
      </section>
    </main>
  );
}
