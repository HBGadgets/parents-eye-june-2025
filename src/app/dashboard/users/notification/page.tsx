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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import ResponseLoader from "@/components/ResponseLoader";
import { ColumnVisibilitySelector } from "@/components/column-visibility-selector";
import { useSchoolData } from "@/hooks/useSchoolData";
import { useBranchData } from "@/hooks/useBranchData";
import { useDeviceData } from "@/hooks/useDeviceData";
import { Alert } from "@/components/Alert";

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

const safeArray = (arr: any): any[] => (Array.isArray(arr) ? arr : []);

const NOTIFICATION_OPTIONS = [
  "Ignition On",
  "Ignition Off",
  "Geofence Enter",
  "Geofence Exit",
  "Student Present",
  "Student Absent",
  "Leave Request Status",
];

export default function NotificationMaster() {
  const queryClient = useQueryClient();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [filteredData, setFilteredData] = useState<NotificationAssignment[]>([]);
  const [filterResults, setFilterResults] = useState<NotificationAssignment[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<NotificationAssignment | null>(null);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  // Form state
  const [selectedSchool, setSelectedSchool] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedDevice, setSelectedDevice] = useState("");
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);

  const { exportToPDF, exportToExcel } = useExport();
  const { data: schoolDataHook } = useSchoolData();
  const { data: branchDataHook } = useBranchData();
  const { data: deviceDataHook } = useDeviceData();

  const { data: schoolsRaw, isLoading } = useQuery<School[]>({
    queryKey: ["schools"],
    queryFn: async () => await api.get<School[]>("/school"),
  });

  const schools = safeArray(schoolDataHook) || safeArray(schoolsRaw);
  const branches = safeArray(branchDataHook);
  const devices = safeArray(deviceDataHook);

  const branchOptions = useMemo(
    () =>
      branches
        .filter((b: any) => b.schoolId?._id === selectedSchool)
        .map((b: any) => ({ label: b.branchName, value: b._id })),
    [branches, selectedSchool]
  );

  const deviceOptions = useMemo(
    () =>
      devices
        .filter((d: any) => d.branchId?._id === selectedBranch)
        .map((d: any) => ({
          label: `${d.deviceName} (${d.deviceId})`,
          value: d._id,
          deviceId: d.deviceId,
          deviceName: d.deviceName,
        })),
    [devices, selectedBranch]
  );

  useEffect(() => {
    if (filterResults?.length > 0) setFilteredData(filterResults);
  }, [filterResults]);

  const addNotificationMutation = useMutation({
    mutationFn: async (newNotification: any) => await api.post("/notifications", newNotification),
    onSuccess: (createdNotification) => {
      queryClient.setQueryData<NotificationAssignment[]>(["notifications"], (old = []) => [
        ...old,
        createdNotification.notification,
      ]);
      alert("Notification assignment added successfully.");
    },
  });

  const updateNotificationMutation = useMutation({
    mutationFn: async ({
      assignmentId,
      data,
    }: {
      assignmentId: string;
      data: Partial<NotificationAssignment>;
    }) => await api.put(`/notifications/${assignmentId}`, data),
    onSuccess: (_, { assignmentId, data }) => {
      queryClient.setQueryData<NotificationAssignment[]>(["notifications"], (old = []) =>
        old.map((n) => (n._id === assignmentId ? { ...n, ...data } : n))
      );
      setFilteredData((prev) =>
        prev.map((n) => (n._id === assignmentId ? { ...n, ...data } : n))
      );
      alert("Notification assignment updated successfully.");
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (assignmentId: string) => await api.delete(`/notifications/${assignmentId}`),
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData<NotificationAssignment[]>(["notifications"], (old = []) =>
        old.filter((n) => n._id !== deletedId)
      );
      alert("Notification assignment deleted successfully.");
    },
  });

  const handleNotificationChange = (assignmentId: string, newNotifications: string[]) => {
    updateNotificationMutation.mutate({ assignmentId, data: { assignedNotifications: newNotifications } });
  };

  const handleSearchResults = useCallback((results: NotificationAssignment[]) => {
    setFilteredData(results);
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedSchool || !selectedBranch || !selectedDevice || selectedNotifications.length === 0) {
      alert("Please fill in all required fields");
      return;
    }

    const school = schools.find((s) => s._id === selectedSchool);
    const branch = branches.find((b) => b._id === selectedBranch);
    const device = devices.find((d) => d._id === selectedDevice);

    const data = {
      deviceId: device?.deviceId,
      deviceName: device?.deviceName,
      schoolName: school?.schoolName,
      schoolId: selectedSchool,
      branchName: branch?.branchName,
      branchId: selectedBranch,
      assignedNotifications: selectedNotifications,
    };

    await addNotificationMutation.mutateAsync(data);
    closeButtonRef.current?.click();
    setSelectedSchool("");
    setSelectedBranch("");
    setSelectedDevice("");
    setSelectedNotifications([]);
  };

  const columns: ColumnDef<NotificationAssignment, CellContent>[] = [
    { header: "Device ID", accessorKey: "deviceId" },
    { header: "Device Name", accessorKey: "deviceName" },
    { header: "School Name", accessorKey: "schoolName" },
    { header: "Branch Name", accessorKey: "branchName" },
    {
      header: "Assigned Notifications",
      accessorFn: (row) => ({
        type: "custom",
        value: (
          <div className="space-y-1">
            {NOTIFICATION_OPTIONS.map((opt) => (
              <div key={opt} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={row.assignedNotifications.includes(opt)}
                  onChange={(e) => {
                    const updated = e.target.checked
                      ? [...row.assignedNotifications, opt]
                      : row.assignedNotifications.filter((n) => n !== opt);
                    handleNotificationChange(row._id, updated);
                  }}
                />
                <span>{opt}</span>
              </div>
            ))}
          </div>
        ),
      }),
    },
    {
      header: "Action",
      accessorFn: (row) => ({
        type: "group",
        items: [
          {
            type: "button",
            label: "Delete",
            onClick: () => setDeleteTarget(row),
            className: "text-red-600 cursor-pointer",
          },
        ],
      }),
    },
  ];

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
            className="w-[300px]"
          />
          <DateRangeFilter onDateRangeChange={() => {}} title="Search by Date" />
          <ColumnVisibilitySelector
            columns={table.getAllColumns()}
            buttonVariant="outline"
            buttonSize="default"
          />
        </section>

        {/* Add Dialog */}
        <Dialog
          onOpenChange={(open) => {
            if (!open) {
              // Reset only when dialog closes
              setSelectedSchool("");
              setSelectedBranch("");
              setSelectedDevice("");
              setSelectedNotifications([]);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button variant="default">Add Assigned Notifications</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] max-h-[80vh]">
            <form onSubmit={handleSubmit} className="space-y-4">
              <DialogHeader>
                <DialogTitle>Add Assigned Notifications</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* School */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>School *</Label>
                    <Select value={selectedSchool} onValueChange={setSelectedSchool} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select School" />
                      </SelectTrigger>
                      <SelectContent>
                        {schools.map((s) => (
                          <SelectItem key={s._id} value={s._id}>
                            {s.schoolName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label>Branch *</Label>
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
                        {branchOptions.map((b) => (
                          <SelectItem key={b.value} value={b.value}>
                            {b.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Device */}
                <div className="grid gap-2">
                  <Label>Device *</Label>
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
                      {deviceOptions.map((d) => (
                        <SelectItem key={d.value} value={d.value}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Notifications */}
                <div className="grid gap-2">
                  <Label>Assigned Notifications *</Label>
                  <div className="flex justify-between items-center mb-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (selectedNotifications.length === NOTIFICATION_OPTIONS.length) {
                          setSelectedNotifications([]); // Deselect all
                        } else {
                          setSelectedNotifications([...NOTIFICATION_OPTIONS]); // Select all
                        }
                      }}
                    >
                      {selectedNotifications.length === NOTIFICATION_OPTIONS.length
                        ? "Deselect All"
                        : "Select All"}
                    </Button>
                  </div>
                  <div className="border rounded-md p-3 max-h-48 overflow-y-auto bg-white">
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
                                selectedNotifications.filter((n) => n !== option)
                              );
                            }
                          }}
                          className="h-4 w-4 border-gray-300 rounded"
                        />
                        <Label htmlFor={option} className="text-sm font-normal cursor-pointer">
                          {option}
                        </Label>
                      </div>
                    ))}
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
      </header>

      {/* Table */}
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

      {/* Delete Alert */}
      {deleteTarget && (
        <Alert<NotificationAssignment>
          title="Are you absolutely sure?"
          description={`This will permanently delete ${deleteTarget?.deviceName}'s notifications.`}
          actionButton={(target) => {
            deleteNotificationMutation.mutate(target._id);
            setDeleteTarget(null);
          }}
          target={deleteTarget}
          setTarget={setDeleteTarget}
          butttonText="Delete"
        />
      )}

      {/* Floating Menu */}
      <FloatingMenu
        onExportPdf={() =>
          exportToPDF(filteredData, [{ key: "deviceName", header: "Device Name" }], {
            title: "Notification Assignment Report",
          })
        }
        onExportExcel={() =>
          exportToExcel(filteredData, [{ key: "deviceName", header: "Device Name" }], {
            title: "Notification Assignment Report",
          })
        }
      />
    </main>
  );
}
