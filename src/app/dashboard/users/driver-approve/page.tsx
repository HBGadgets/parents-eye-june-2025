"use client";

import React, { useCallback, useEffect, useState, useRef, useMemo } from "react";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CustomTable, CellContent } from "@/components/ui/CustomTable";
import SearchComponent from "@/components/ui/SearchOnlydata";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import DateRangeFilter from "@/components/ui/DateRangeFilter";
import { FloatingMenu } from "@/components/floatingMenu";
import { getCoreRowModel, useReactTable, VisibilityState, type ColumnDef } from "@tanstack/react-table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/apiService";
import { useExport } from "@/hooks/useExport";
import { formatDate } from "@/util/formatDate";
import { Alert } from "@/components/Alert";
import ResponseLoader from "@/components/ResponseLoader";
import { CustomFilter } from "@/components/ui/CustomFilter";
import { ColumnVisibilitySelector } from "@/components/column-visibility-selector";
import { useSchoolData } from "@/hooks/useSchoolData";
import { useBranchData } from "@/hooks/useBranchData";
import { useInfiniteDeviceData } from "@/hooks/useInfiniteDeviceData";
import { Driver } from "@/interface/modal";
import Cookies from "js-cookie";
import { getDecodedToken } from "@/lib/jwt";

interface SelectOption {
  label: string;
  value: string;
}

// Reusable Form Component
const DriverForm = ({ 
  formData, 
  onInputChange, 
  school, 
  setSchool,
  schoolSearch,
  setSchoolSearch,
  branch, 
  setBranch,
  branchSearch,
  setBranchSearch,
  device, 
  setDevice,
  deviceSearch,
  setDeviceSearch,
  schoolOptions,
  branchOptions,
  deviceItems,
  hasNextPage,
  fetchNextPage,
  isFetchingNextPage,
  isFetching,
  usernameError,
}: any) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div className="grid gap-2">
      <Label htmlFor="driverName">Driver Name</Label>
      <Input
        id="driverName"
        name="driverName"
        value={formData?.driverName}
        onChange={onInputChange}
        placeholder="Enter driver name"
        required
      />
    </div>
    
    <div className="grid gap-2">
      <Label>School *</Label>
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
      <Label>Branch *</Label>
      <Combobox 
        items={branchOptions} 
        value={branch} 
        onValueChange={setBranch}
        placeholder={!school ? "Select school first" : branchOptions.length ? "Search branch..." : "No branches available"}
        searchPlaceholder="Search branches..." 
        emptyMessage={!school ? "Please select a school first" : branchOptions.length === 0 ? "No branches found for this school" : "No branches match your search"}
        width="w-full" 
        disabled={!school}
        onSearchChange={setBranchSearch} 
        searchValue={branchSearch} 
      />
    </div>

    <div className="grid gap-2">
      <Label>Device *</Label>
      <Combobox 
        items={deviceItems} 
        value={device} 
        onValueChange={setDevice}
        placeholder={!school ? "Select school first" : !branch ? "Select branch first" : "Search device..."}
        searchPlaceholder="Search devices..." 
        emptyMessage={!school ? "Please select a school first" : !branch ? "Please select a branch first" : "No devices found"}
        width="w-full" 
        disabled={!branch}
        onSearchChange={setDeviceSearch} 
        searchValue={deviceSearch}
        onReachEnd={() => {
          if (hasNextPage && !isFetchingNextPage && !isFetching) {
            fetchNextPage();
          }
        }}
        isLoadingMore={isFetchingNextPage}
      />
    </div>

    <div className="grid gap-2">
      <Label htmlFor="email">Email</Label>
      <Input
        id="email"
        name="email"
        type="email"
        value={formData?.email}
        onChange={onInputChange}
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
        value={formData?.driverMobile}
        onChange={onInputChange}
        placeholder="Enter mobile number"
        pattern="[0-9]{10}"
        maxLength={10}
        required
      />
    </div>

    <div className="grid gap-2">
      <Label htmlFor="username">Username</Label>
      <Input
        id="username"
        name="username"
        value={formData?.username}
        onChange={onInputChange}
        placeholder="Enter username"
        required
        className={usernameError ? "border-red-500" : ""}
      />
      {usernameError && <p className="text-red-500 text-sm">{usernameError}</p>}
    </div>

    <div className="grid gap-2">
      <Label htmlFor="password">Password</Label>
      <Input
        id="password"
        name="password"
        type="text"
        value={formData?.password}
        onChange={onInputChange}
        placeholder="Enter password"
        required
      />
    </div>
  </div>
);

// Custom hook for form state management
const useDriverForm = (initialData?: Driver) => {
  const [school, setSchool] = useState("");
  const [schoolSearch, setSchoolSearch] = useState("");
  const [branch, setBranch] = useState("");
  const [branchSearch, setBranchSearch] = useState("");
  const [device, setDevice] = useState("");
  const [deviceSearch, setDeviceSearch] = useState("");

  useEffect(() => {
    if (initialData) {
      setSchool(initialData.schoolId?._id || initialData.schoolId || "");
      setBranch(initialData.branchId?._id || initialData.branchId || "");
      setDevice(initialData.deviceObjId?._id || initialData.deviceObjId || "");
    }
  }, [initialData]);

  const resetForm = () => {
    setSchool("");
    setSchoolSearch("");
    setBranch("");
    setBranchSearch("");
    setDevice("");
    setDeviceSearch("");
  };

  useEffect(() => {
    setBranch("");
    setBranchSearch("");
    setDevice("");
    setDeviceSearch("");
  }, [school]);

  useEffect(() => {
    setDevice("");
    setDeviceSearch("");
  }, [branch]);

  return {
    school, setSchool, schoolSearch, setSchoolSearch,
    branch, setBranch, branchSearch, setBranchSearch,
    device, setDevice, deviceSearch, setDeviceSearch,
    resetForm
  };
};

export default function DriverApprove() {
  const queryClient = useQueryClient();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [filteredData, setFilteredData] = useState<Driver[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Driver | null>(null);
  const [editTarget, setEditTarget] = useState<Driver | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const { exportToPDF, exportToExcel } = useExport();
  const [role, setRole] = useState<string | null>(null);

  // Form hooks
  const addForm = useDriverForm();
  const editForm = useDriverForm(editTarget || undefined);

  // Data hooks
  const { data: schoolData } = useSchoolData();
  const { data: branchData } = useBranchData();
  const { data: drivers, isLoading } = useQuery<Driver[]>({
    queryKey: ["drivers"],
    queryFn: async () => await api.get<Driver[]>("/driver"),
  });

  const normalizedRole = useMemo(() => {
    const r = (role || "").toLowerCase();
    if (["superadmin", "super_admin", "admin", "root"].includes(r)) return "superAdmin";
    if (["school", "schooladmin"].includes(r)) return "school";
    if (["branch", "branchadmin"].includes(r)) return "branch";
    return undefined;
  }, [role]);

  useEffect(() => {
    const token = Cookies.get("token");
    if (token) {
      const decoded = getDecodedToken(token);
      setRole((decoded?.role || "").toLowerCase());
    }
  }, []);

  // Device data for add dialog
  const addDeviceQuery = useInfiniteDeviceData({
    role: normalizedRole as any,
    branchId: addForm.branch || undefined,
    search: addForm.deviceSearch,
    limit: 20,
  });

  // Device data for edit dialog
  const editDeviceQuery = useInfiniteDeviceData({
    role: normalizedRole as any,
    branchId: editForm.branch || undefined,
    search: editForm.deviceSearch,
    limit: 20,
  });

  // Memoized options
  const schoolOptions: SelectOption[] = useMemo(() => 
    schoolData?.filter(s => s._id && s.schoolName).map(s => ({ label: s.schoolName, value: s._id })) || [], 
    [schoolData]
  );

  const getFilteredBranchOptions = (schoolId: string) => useMemo(() => 
    branchData?.filter(b => b.schoolId?._id === schoolId).map(b => ({ label: b.branchName, value: b._id })) || [],
    [schoolId, branchData]
  );

  const getDeviceItems = (deviceData: any) => useMemo(() => {
    if (!deviceData?.pages?.length) return [];
    return deviceData.pages.flatMap((pg: any) => {
      const list = pg.devices ?? pg.data ?? [];
      return list.filter((d: any) => d._id && d.name).map((d: any) => ({ label: d.name, value: d._id }));
    });
  }, [deviceData]);

  useEffect(() => {
    if (drivers) {
      setFilteredData(drivers);
    }
  }, [drivers]);

  // Mutations
  const addDriverMutation = useMutation({
    mutationFn: async (newDriver: any) => await api.post("/driver", newDriver),
    onSuccess: (createdDriver, variables) => {
      const school = schoolData?.find(s => s._id === variables.schoolId);
      const branch = branchData?.find(b => b._id === variables.branchId);
      const device = getDeviceItems(addDeviceQuery.data).find(d => d.value === variables.deviceObjId);

      queryClient.setQueryData<Driver[]>(["drivers"], (old = []) => [
        ...old,
        {
          ...createdDriver,
          password: variables.password,
          schoolId: school ? { _id: school._id, schoolName: school.schoolName } : { _id: variables.schoolId, schoolName: "Unknown" },
          branchId: branch ? { _id: branch._id, branchName: branch.branchName } : { _id: variables.branchId, branchName: "Unknown" },
          deviceObjId: device ? { _id: device.value, name: device.label } : { _id: variables.deviceObjId, name: "Unknown" },
        }
      ]);
      alert("Driver added successfully.");
    },
    onError: (error: any) => alert(`Failed to add driver: ${error.response?.data?.message || error.message}`),
  });

  const approveMutation = useMutation({
    mutationFn: async (driver: { _id: string; isApproved: "Approved" | "Rejected" }) => 
      await api.post(`/driver/approve/${driver._id}`, { isApproved: driver.isApproved }),
    onSuccess: (_, variables) => {
      queryClient.setQueryData<Driver[]>(["drivers"], (old) =>
        old?.map(d => d._id === variables._id ? { ...d, isApproved: variables.isApproved } : d)
      );
      alert("Driver status updated successfully.");
    },
    onError: () => alert("Failed to update driver status."),
  });

  const updateDriverMutation = useMutation({
    mutationFn: async ({ driverId, data }: { driverId: string; data: Partial<Driver> }) => {
      if (data.username && editTarget && data.username === editTarget.username) {
        const { username, ...dataWithoutUsername } = data;
        return await api.put(`/driver/${driverId}`, dataWithoutUsername);
      }
      return await api.put(`/driver/${driverId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      setEditDialogOpen(false);
      setEditTarget(null);
      editForm.resetForm();
      alert("Driver updated successfully.");
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message;
      alert(msg.includes("username") ? "Username may already be taken." : `Failed to update driver: ${msg}`);
    },
  });

  const deleteDriverMutation = useMutation({
    mutationFn: async (driverId: string) => await api.delete(`/driver/${driverId}`),
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData<Driver[]>(["drivers"], (old) => old?.filter(d => d._id !== deletedId));
      alert("Driver deleted successfully.");
    },
    onError: () => alert("Failed to delete driver."),
  });

  // Table columns
  const columns: ColumnDef<Driver, CellContent>[] = [
    {
      header: "Driver Name",
      accessorFn: (row) => ({ type: "text", value: row.driverName ?? "" }),
      meta: { flex: 1, minWidth: 200, maxWidth: 300 },
      enableHiding: true,
    },
    {
      header: "School Name",
      accessorFn: (row) => ({ type: "text", value: row.schoolId?.schoolName ?? "--" }),
      meta: { flex: 1, minWidth: 200, maxWidth: 300 },
      enableHiding: true,
    },
    {
      header: "Branch Name",
      accessorFn: (row) => ({ type: "text", value: row.branchId?.branchName ?? "--" }),
      meta: { flex: 1, minWidth: 200, maxWidth: 300 },
      enableHiding: true,
    },
    {
      header: "Device Name",
      accessorFn: (row) => ({ type: "text", value: row.deviceObjId?.name ?? "--" }),
      meta: { flex: 1, minWidth: 200, maxWidth: 300 },
      enableHiding: true,
    },
    {
      header: "Mobile",
      accessorFn: (row) => ({ type: "text", value: row.driverMobile ?? "" }),
      meta: { flex: 1, minWidth: 150, maxWidth: 300 },
      enableHiding: true,
    },
    {
      header: "Username",
      accessorFn: (row) => ({ type: "text", value: row.username ?? "" }),
      meta: { flex: 1, minWidth: 150, maxWidth: 300 },
      enableHiding: true,
    },
    {
      header: "Password",
      accessorFn: (row) => ({ type: "text", value: row.password ?? "" }),
      meta: { flex: 1, minWidth: 150, maxWidth: 300 },
      enableHiding: true,
    },
    {
      header: "Registration Date",
      accessorFn: (row) => ({ type: "text", value: formatDate(row.createdAt) ?? "" }),
      meta: { flex: 1, minWidth: 200 },
      enableHiding: true,
    },
    {
      header: "Approve/Reject",
      accessorFn: (row) => ({
        type: "group",
        items: row.isApproved === "Pending" ? [
          {
            type: "button",
            label: "Approved",
            onClick: () => approveMutation.mutate({ _id: row._id, isApproved: "Approved" }),
            disabled: approveMutation.isPending,
            className: "flex-shrink-0 text-xs w-20 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-full px-2 py-1 mr-1",
          },
          {
            type: "button",
            label: "Reject",
            onClick: () => approveMutation.mutate({ _id: row._id, isApproved: "Rejected" }),
            disabled: approveMutation.isPending,
            className: "flex-shrink-0 text-xs w-20 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-full px-2 py-1",
          },
        ] : [
          {
            type: "button",
            label: row.isApproved === "Approved" ? "Approved" : "Rejected",
            onClick: () => {},
            disabled: true,
            className: `flex-shrink-0 text-xs w-24 ${row.isApproved === "Approved" ? "bg-green-300 text-green-800" : "bg-red-300 text-red-800"} font-semibold rounded-full px-2 py-1`,
          },
        ],
      }),
      meta: { flex: 1, minWidth: 180, maxWidth: 200 },
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
            disabled: updateDriverMutation.isPending,
          },
          {
            type: "button",
            label: "Delete",
            onClick: () => setDeleteTarget(row),
            className: "text-red-600 cursor-pointer",
            disabled: deleteDriverMutation.isPending,
          },
        ],
      }),
      meta: { flex: 1.5, minWidth: 150, maxWidth: 200 },
      enableSorting: false,
      enableHiding: true,
    },
  ];

  const columnsForExport = [
    { key: "driverName", header: "Driver Name" },
    { key: "driverMobile", header: "Mobile" },
    { key: "username", header: "Username" },
    { key: "password", header: "Password" },
    { key: "schoolId.schoolName", header: "School Name" },
    { key: "branchId.branchName", header: "Branch Name" },
    { key: "deviceObjId.name", header: "Device Name" },
    { key: "isApproved", header: "Status" },
    { key: "createdAt", header: "Registration Date" },
  ];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    if (!addForm.school || !addForm.branch || !addForm.device) {
      alert("Please select School, Branch, and Device");
      return;
    }

    const data = {
      driverName: formData.get("driverName") as string,
      driverMobile: formData.get("driverMobile") as string,
      username: formData.get("username") as string,
      password: formData.get("password") as string,
      email: formData.get("email") as string,
      schoolId: addForm.school,
      branchId: addForm.branch,
      deviceObjId: addForm.device,
    };

    await addDriverMutation.mutateAsync(data);
    if (!addDriverMutation.isError) {
      closeButtonRef.current?.click();
      form.reset();
      addForm.resetForm();
    }
  };

  const handleEditSave = (updatedData: Partial<Driver>) => {
    if (!editTarget) return;

    const changedFields: Partial<Driver> = {};
    const flatTarget = {
      ...editTarget,
      schoolId: editTarget.schoolId?._id || editTarget.schoolId,
      branchId: editTarget.branchId?._id || editTarget.branchId,
      deviceObjId: editTarget.deviceObjId?._id || editTarget.deviceObjId,
    };

    for (const key in updatedData) {
      const newVal = updatedData[key as keyof Driver];
      const oldVal = flatTarget[key as keyof Driver];
      if (newVal !== undefined && newVal !== oldVal) {
        if (key === 'username' && newVal === editTarget.username) continue;
        changedFields[key as keyof Driver] = newVal;
      }
    }

    if (Object.keys(changedFields).length === 0) {
      alert("No changes detected.");
      return;
    }

    updateDriverMutation.mutate({ driverId: editTarget._id, data: changedFields });
  };

  const EditDriverDialog = () => {
    if (!editTarget) return null;

    const [formData, setFormData] = useState({
      driverName: editTarget.driverName || "",
      driverMobile: editTarget.driverMobile || "",
      username: editTarget.username || "",
      password: editTarget.password || "",
      email: editTarget.email || "",
    });
    const [usernameError, setUsernameError] = useState("");

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setFormData(prev => ({ ...prev, [name]: value }));
      if (name === 'username') setUsernameError("");
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!editForm.school || !editForm.branch || !editForm.device) {
        alert("Please select School, Branch, and Device");
        return;
      }
      if (!formData.username.trim()) {
        setUsernameError("Username is required");
        return;
      }

      handleEditSave({
        ...formData,
        schoolId: editForm.school,
        branchId: editForm.branch,
        deviceObjId: editForm.device,
      });
    };

    return (
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Edit Driver</DialogTitle>
            </DialogHeader>
            <DriverForm
              formData={formData}
              onInputChange={handleInputChange}
              school={editForm.school}
              setSchool={editForm.setSchool}
              schoolSearch={editForm.schoolSearch}
              setSchoolSearch={editForm.setSchoolSearch}
              branch={editForm.branch}
              setBranch={editForm.setBranch}
              branchSearch={editForm.branchSearch}
              setBranchSearch={editForm.setBranchSearch}
              device={editForm.device}
              setDevice={editForm.setDevice}
              deviceSearch={editForm.deviceSearch}
              setDeviceSearch={editForm.setDeviceSearch}
              schoolOptions={schoolOptions}
              branchOptions={getFilteredBranchOptions(editForm.school)}
              deviceItems={getDeviceItems(editDeviceQuery.data)}
              hasNextPage={editDeviceQuery.hasNextPage}
              fetchNextPage={editDeviceQuery.fetchNextPage}
              isFetchingNextPage={editDeviceQuery.isFetchingNextPage}
              isFetching={editDeviceQuery.isFetching}
              usernameError={usernameError}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setEditDialogOpen(false);
                setEditTarget(null);
                editForm.resetForm();
              }}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateDriverMutation.isPending}>
                {updateDriverMutation.isPending ? "Updating..." : "Update Driver"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  };

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
            data={drivers || []}
            displayKey={["driverName", "username", "email", "driverMobile"]}
            onResults={setFilteredData}
            className="w-[300px] mb-4"
          />
          <DateRangeFilter
            onDateRangeChange={(start, end) => {
              if (!drivers || (!start && !end)) {
                setFilteredData(drivers || []);
                return;
              }
              const filtered = drivers.filter(d => {
                if (!d.createdAt) return false;
                const date = new Date(d.createdAt);
                return (!start || date >= start) && (!end || date <= end);
              });
              setFilteredData(filtered);
            }}
            title="Search by Registration Date"
          />
          <CustomFilter
            data={filteredData}
            originalData={drivers}
            filterFields={["isApproved"]}
            onFilter={setFilteredData}
            placeholder="Filter by Approval"
            valueFormatter={(v) => v ? v.toString().charAt(0).toUpperCase() + v.toString().slice(1).toLowerCase() : ""}
          />
          <ColumnVisibilitySelector columns={table.getAllColumns()} />
        </section>

        <section>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="default">Add Driver</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <form onSubmit={handleSubmit} className="space-y-4">
                <DialogHeader>
                  <DialogTitle>Add Driver</DialogTitle>
                </DialogHeader>
                <DriverForm
                  school={addForm.school}
                  setSchool={addForm.setSchool}
                  schoolSearch={addForm.schoolSearch}
                  setSchoolSearch={addForm.setSchoolSearch}
                  branch={addForm.branch}
                  setBranch={addForm.setBranch}
                  branchSearch={addForm.branchSearch}
                  setBranchSearch={addForm.setBranchSearch}
                  device={addForm.device}
                  setDevice={addForm.setDevice}
                  deviceSearch={addForm.deviceSearch}
                  setDeviceSearch={addForm.setDeviceSearch}
                  schoolOptions={schoolOptions}
                  branchOptions={getFilteredBranchOptions(addForm.school)}
                  deviceItems={getDeviceItems(addDeviceQuery.data)}
                  hasNextPage={addDeviceQuery.hasNextPage}
                  fetchNextPage={addDeviceQuery.fetchNextPage}
                  isFetchingNextPage={addDeviceQuery.isFetchingNextPage}
                  isFetching={addDeviceQuery.isFetching}
                />
                <DialogFooter>
                  <DialogClose asChild>
                    <Button ref={closeButtonRef} variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button type="submit" disabled={addDriverMutation.isPending}>
                    {addDriverMutation.isPending ? "Saving..." : "Save Driver"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </section>
      </header>

      <section className="mb-4">
        <CustomTable
          data={filteredData}
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

      {deleteTarget && (
        <Alert<Driver>
          title="Are you absolutely sure?"
          description={`This will permanently delete ${deleteTarget?.driverName} and all associated data.`}
          actionButton={(target) => {
            deleteDriverMutation.mutate(target._id);
            setDeleteTarget(null);
          }}
          target={deleteTarget}
          setTarget={setDeleteTarget}
          butttonText="Delete"
        />
      )}

      {editTarget && <EditDriverDialog />}

      <FloatingMenu
        onExportPdf={() => exportToPDF(filteredData, columnsForExport, {
          title: "Driver Master Report",
          companyName: "Parents Eye",
          metadata: { Total: `${filteredData.length} drivers` },
        })}
        onExportExcel={() => exportToExcel(filteredData, columnsForExport, {
          title: "Driver Master Report",
          companyName: "Parents Eye",
          metadata: { Total: `${filteredData.length} drivers` },
        })}
      />
    </main>
  );
}