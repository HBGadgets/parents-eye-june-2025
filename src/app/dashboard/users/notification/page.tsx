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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableDropdown } from "@/components/SearcheableDropdownFilter";
import { useSchoolData } from "@/hooks/useSchoolData";
import { useBranchData } from "@/hooks/useBranchData";
import { useDeviceData } from "@/hooks/useDeviceData";
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

// Notification interface
interface NotificationAssignment {
  _id: string;
  deviceId: string;
  deviceName: string;
  schoolName: string;
  schoolId: string;
  branchName: string;
  branchId: string;
  assignedNotifications: string[];
  createdAt?: string;
  updatedAt?: string;
}

interface School {
  _id: string;
  schoolName: string;
}

interface Branch {
  _id: string;
  branchName: string;
  schoolId: string;
}

interface Device {
  _id: string;
  deviceName: string;
  deviceId: string;
  branchId: string;
}

// Defensive array fallback helpers
const safeArray = (arr: any): any[] => Array.isArray(arr) ? arr : [];

const NOTIFICATION_OPTIONS = [
  "Ignition On",
  "Ignition Off", 
  "Geofence Enter",
  "Geofence Exit",
  "Student Present",
  "Student Absent",
  "Leave Request Status"
];

export default function NotificationMaster() {
  const queryClient = useQueryClient();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [filteredData, setFilteredData] = useState<NotificationAssignment[]>([]);
  const [filterResults, setFilterResults] = useState<NotificationAssignment[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<NotificationAssignment | null>(null);
  const [editTarget, setEditTarget] = useState<NotificationAssignment | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  
  // Form states
  const [selectedSchool, setSelectedSchool] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedDevice, setSelectedDevice] = useState("");
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  
  const { exportToPDF, exportToExcel } = useExport();

  // Use hooks
  const { data: schoolDataHook } = useSchoolData();
  const { data: branchDataHook } = useBranchData();
  const { data: deviceDataHook } = useDeviceData();

  // Fetch schools - using existing fallback
  const {
    data: schoolsRaw,
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

  const schools = safeArray(schoolDataHook) || safeArray(schoolsRaw);
  const branches = safeArray(branchDataHook);
  const devices = safeArray(deviceDataHook);

  // Prepare dropdown data
  const schoolOptions = useMemo(() => (
    schools.map((school) => ({
      label: school.schoolName,
      value: school._id,
    }))
  ), [schools]);

  const branchOptions = useMemo(() => (
    branches
      .filter((branch: any) => branch.schoolId?._id === selectedSchool)
      .map((branch: any) => ({
        label: branch.branchName,
        value: branch._id,
      }))
  ), [branches, selectedSchool]);

  const deviceOptions = useMemo(() => (
    devices
      .filter((device: any) => device.branchId?._id === selectedBranch)
      .map((device: any) => ({
        label: `${device.deviceName} (${device.deviceId})`,
        value: device._id,
        deviceId: device.deviceId,
        deviceName: device.deviceName,
      }))
  ), [devices, selectedBranch]);

  // Handle notification state sync (assuming notifications comes from main query or prop)
  useEffect(() => {
    if (filterResults && filterResults.length > 0) {
      setFilteredData(filterResults);
    }
  }, [filterResults]);

  // Handle notification change in table rows
  const handleNotificationChange = useCallback(
    (assignmentId: string, newNotifications: string[]) => {
      updateNotificationMutation.mutate({
        assignmentId,
        data: { assignedNotifications: newNotifications },
      });
    },
    []
  );

  // Define the columns for the table
  const columns: ColumnDef<NotificationAssignment, CellContent>[] = [
    {
      header: "Device ID",
      accessorFn: (row) => ({
        type: "text",
        value: row.deviceId ?? "",
      }),
      meta: { flex: 1, minWidth: 150, maxWidth: 200 },
      enableHiding: true,
    },
    {
      header: "Device Name",
      accessorFn: (row) => ({
        type: "text",
        value: row.deviceName ?? "",
      }),
      meta: { flex: 1, minWidth: 150, maxWidth: 250 },
      enableHiding: true,
    },
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
      header: "Branch Name",
      accessorFn: (row) => ({
        type: "text",
        value: row.branchName ?? "",
      }),
      meta: { flex: 1, minWidth: 150, maxWidth: 250 },
      enableHiding: true,
    },
    {
      header: "Assigned Notifications",
      accessorFn: (row) => ({
        type: "custom",
        value: (
          <Select
            value={row.assignedNotifications?.join(",")}
            onValueChange={(value) => {
              const notifications = value ? value.split(",") : [];
              handleNotificationChange(row._id, notifications);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select notifications">
                {row.assignedNotifications?.length > 0
                  ? `${row.assignedNotifications.length} selected`
                  : "Select notifications"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {NOTIFICATION_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={row.assignedNotifications?.includes(option) || false}
                      onChange={(e) => {
                        const currentNotifications = row.assignedNotifications || [];
                        let newNotifications;
                        if (e.target.checked) {
                          newNotifications = [...currentNotifications, option];
                        } else {
                          newNotifications = currentNotifications.filter(n => n !== option);
                        }
                        handleNotificationChange(row._id, newNotifications);
                      }}
                      className="mr-2"
                    />
                    <span>{option}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ),
      }),
      meta: { flex: 1.5, minWidth: 250, maxWidth: 350 },
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
            disabled: updateNotificationMutation.isPending,
          },
          {
            type: "button",
            label: "Delete",
            onClick: () => setDeleteTarget(row),
            className: "text-red-600 cursor-pointer",
            disabled: deleteNotificationMutation.isPending,
          },
        ],
      }),
      meta: { flex: 1, minWidth: 150, maxWidth: 200 },
      enableSorting: false,
      enableHiding: true,
    },
  ];

  // Columns for export
  const columnsForExport = [
    { key: "deviceId", header: "Device ID" },
    { key: "deviceName", header: "Device Name" },
    { key: "schoolName", header: "School Name" },
    { key: "branchName", header: "Branch Name" },
    { key: "assignedNotifications", header: "Assigned Notifications" },
  ];

  // Edit fields (always safe with fallback array)
  const notificationFieldConfigs: FieldConfig[] = [
    {
      label: "School",
      key: "schoolId",
      type: "select",
      required: true,
      options: schools.map(school => ({ value: school._id, label: school.schoolName })),
    },
    {
      label: "Branch",
      key: "branchId", 
      type: "select",
      required: true,
      options: branches.map(branch => ({ value: branch._id, label: branch.branchName })),
    },
    {
      label: "Device",
      key: "deviceId",
      type: "select", 
      required: true,
      options: devices.map(device => ({ value: device._id, label: `${device.deviceName} (${device.deviceId})` })),
    },
    {
      label: "Assigned Notifications",
      key: "assignedNotifications",
      type: "multiselect",
      required: true,
      options: NOTIFICATION_OPTIONS.map(option => ({ value: option, label: option })),
    },
  ];

  // Mutation to add new notification assignment
  const addNotificationMutation = useMutation({
    mutationFn: async (newNotification: any) => {
      const notification = await api.post("/notifications", newNotification);
      return notification.notification;
    },
    onSuccess: (createdNotification) => {
      queryClient.setQueryData<NotificationAssignment[]>(["notifications"], (oldNotifications = []) => {
        return [...oldNotifications, createdNotification];
      });
    },
  });

  // Edit notification assignment
  const updateNotificationMutation = useMutation({
    mutationFn: async ({
      assignmentId,
      data,
    }: {
      assignmentId: string;
      data: Partial<NotificationAssignment>;
    }) => {
      return await api.put(`/notifications/${assignmentId}`, data);
    },
    onSuccess: (_, { assignmentId, data }) => {
      queryClient.setQueryData<NotificationAssignment[]>(["notifications"], (oldData) => {
        if (!oldData) return [];
        return oldData.map((notification) =>
          notification._id === assignmentId ? { ...notification, ...data } : notification
        );
      });

      setFilteredData((prev) =>
        prev.map((notification) =>
          notification._id === assignmentId ? { ...notification, ...data } : notification
        )
      );

      setEditDialogOpen(false);
      setEditTarget(null);
      alert("Notification assignment updated successfully.");
    },
    onError: (err) => {
      alert("Failed to update notification assignment.\nerror: " + err);
    },
  });

  // Mutation to delete notification assignment
  const deleteNotificationMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      return await api.delete(`/notifications/${assignmentId}`);
    },
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData<NotificationAssignment[]>(["notifications"], (oldData) =>
        safeArray(oldData).filter((notification) => notification._id !== deletedId)
      );
      alert("Notification assignment deleted successfully.");
    },
    onError: (err) => {
      alert("Failed to delete notification assignment.\nerror: " + err);
    },
  });

  // Search
  const handleSearchResults = useCallback((results: NotificationAssignment[]) => {
    setFilteredData(results);
  }, []);

  // Save handler
  const handleSave = (updatedData: Partial<NotificationAssignment>) => {
    if (!editTarget) return;

    const changedFields: Partial<NotificationAssignment> = {};
    for (const key in updatedData) {
      const newValue = updatedData[key as keyof NotificationAssignment];
      const oldValue = editTarget[key as keyof NotificationAssignment];
      if (newValue !== undefined && newValue !== oldValue) {
        changedFields[key as keyof NotificationAssignment] = newValue;
      }
    }

    if (Object.keys(changedFields).length === 0) {
      console.log("No changes detected.");
      return;
    }

    updateNotificationMutation.mutate({
      assignmentId: editTarget._id,
      data: changedFields,
    });
  };

  // Form submit handler (use fallback array)
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedSchool || !selectedBranch || !selectedDevice || selectedNotifications.length === 0) {
      alert("Please fill in all required fields");
      return;
    }

    const selectedSchoolData = schools.find(s => s._id === selectedSchool);
    const selectedBranchData = branches.find(b => b._id === selectedBranch);
    const selectedDeviceData = devices.find(d => d._id === selectedDevice);

    const data = {
      deviceId: selectedDeviceData?.deviceId,
      deviceName: selectedDeviceData?.deviceName,
      schoolName: selectedSchoolData?.schoolName,
      schoolId: selectedSchool,
      branchName: selectedBranchData?.branchName,
      branchId: selectedBranch,
      assignedNotifications: selectedNotifications,
    };

    try {
      await addNotificationMutation.mutateAsync(data);
      closeButtonRef.current?.click();
      setSelectedSchool("");
      setSelectedBranch("");
      setSelectedDevice("");
      setSelectedNotifications([]);
      alert("Notification assignment added successfully.");
    } catch (err) {
      alert("Failed to add notification assignment.\nerror: " + err);
    }
  };

  // Date range filter
  const handleDateFilter = useCallback(
    (start: Date | null, end: Date | null) => {
      if (!filteredData || (!start && !end)) {
        setFilteredData(safeArray(filteredData));
        return;
      }
      const filtered = safeArray(filteredData).filter((notification) => {
        if (!notification.createdAt) return false;
        const createdDate = new Date(notification.createdAt);
        return (!start || createdDate >= start) && (!end || createdDate <= end);
      });
      setFilteredData(filtered);
    },
    [filteredData]
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
      <ResponseLoader isLoading={isLoading} />

      <header className="flex items-center justify-between mb-4">
        <section className="flex space-x-4">
          <SearchComponent
            data={filterResults}
            displayKey={["deviceId", "deviceName", "schoolName", "branchName"]}
            onResults={handleSearchResults}
            className="w-[300px] mb-4"
          />
          <DateRangeFilter
            onDateRangeChange={handleDateFilter}
            title="Search by Date"
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
              <Button variant="default">Add Assigned Notifications</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[80vh]">
              <form onSubmit={handleSubmit} className="space-y-4">
                <DialogHeader>
                  <DialogTitle>Add Assigned Notifications</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="school">School *</Label>
                      <Select value={selectedSchool} onValueChange={setSelectedSchool} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select School" />
                        </SelectTrigger>
                        <SelectContent>
                          {schools.map((school) => (
                            <SelectItem key={school._id} value={school._id}>
                              {school.schoolName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="branch">Branch *</Label>
                      <Select
                        value={selectedBranch}
                        onValueChange={setSelectedBranch}
                        disabled={!selectedSchool}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Branch" />
                        </SelectTrigger>
                        <SelectContent>
                          {branches.map((branch) => (
                            <SelectItem key={branch._id} value={branch._id}>
                              {branch.branchName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="device">Device *</Label>
                    <Select
                      value={selectedDevice}
                      onValueChange={setSelectedDevice}
                      disabled={!selectedBranch}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Device" />
                      </SelectTrigger>
                      <SelectContent>
                        {devices.map((device) => (
                          <SelectItem key={device._id} value={device._id}>
                            {device.deviceName} ({device.deviceId})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="notifications">Assigned Notifications *</Label>
                    <div className="border rounded-md p-3 max-h-48 overflow-y-auto bg-white">
                      <div className="space-y-2">
                        {NOTIFICATION_OPTIONS.map((option) => (
                          <div key={option} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={option}
                              checked={selectedNotifications.includes(option)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedNotifications([...selectedNotifications, option]);
                                } else {
                                  setSelectedNotifications(
                                    selectedNotifications.filter(n => n !== option)
                                  );
                                }
                              }}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                            <Label htmlFor={option} className="text-sm font-normal cursor-pointer">
                              {option}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <DialogFooter className="flex justify-end space-x-2">
                  <DialogClose asChild>
                    <Button ref={closeButtonRef} variant="outline">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button
                    type="submit"
                    disabled={addNotificationMutation.isPending}
                    className="bg-yellow-500 hover:bg-yellow-600 text-black"
                  >
                    {addNotificationMutation.isPending ? "Saving..." : "Save Assignment"}
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
          noDataMessage="No notification assignments found"
          isLoading={isLoading}
        />
      </section>

      <section>
        <div>
          {deleteTarget && (
            <Alert<NotificationAssignment>
              title="Are you absolutely sure?"
              description={`This will permanently delete the notification assignment for ${deleteTarget?.deviceName} and all associated data.`}
              actionButton={(target) => {
                deleteNotificationMutation.mutate(target._id);
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
            data={editTarget}
            isOpen={editDialogOpen}
            onClose={() => {
              setEditDialogOpen(false);
              setEditTarget(null);
            }}
            onSave={handleSave}
            fields={notificationFieldConfigs}
            title="Edit Notification Assignment"
            description="Update the notification assignment information below. Fields marked with * are required."
          />
        )}
      </section>

      <section>
        <FloatingMenu
          onExportPdf={() => {
            exportToPDF(filteredData, columnsForExport, {
              title: "Notification Assignment Report",
              companyName: "Parents Eye",
              metadata: {
                Total: `${filteredData.length} assignments`,
              },
            });
          }}
          onExportExcel={() => {
            exportToExcel(filteredData, columnsForExport, {
              title: "Notification Assignment Report", 
              companyName: "Parents Eye",
              metadata: {
                Total: `${filteredData.length} assignments`,
              },
            });
          }}
        />
      </section>
    </main>
  );
}
