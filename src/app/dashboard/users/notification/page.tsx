"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import SearchComponent from "@/components/ui/SearchOnlydata";
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
import { Combobox } from "@/components/ui/combobox";
import { useSchoolData } from "@/hooks/useSchoolData";
import { useBranchData } from "@/hooks/useBranchData";
import { useInfiniteDeviceData } from "@/hooks/useInfiniteDeviceData";
import Cookies from "js-cookie";
import { getDecodedToken } from "@/lib/jwt";
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

  // dropdown states
  const [selectedSchool, setSelectedSchool] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");

  // hooks
  const { exportToPDF, exportToExcel } = useExport();
  const { data: schoolData } = useSchoolData();
  const { data: branchData } = useBranchData();

  const normalizedRole = useMemo(() => {
    const r = (role || "").toLowerCase();
    if (["superadmin", "super_admin", "admin", "root"].includes(r)) return "superAdmin";
    if (["school", "schooladmin"].includes(r)) return "school";
    if (["branch", "branchadmin"].includes(r)) return "branch";
    return undefined;
  }, [role]);

  // Decode role
  useEffect(() => {
    const token = Cookies.get("token");
    if (token) {
      const decoded = getDecodedToken(token);
      setRole((decoded?.role || "").toLowerCase());
    }
  }, []);

  const {
    data: deviceData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
  } = useInfiniteDeviceData({
    role: normalizedRole as any,
    branchId: selectedBranch || undefined,
    search,
    limit: 20,
  });

  const schools = useMemo(() => {
    if (!schoolData) return [];
    return schoolData.map((s: any) => ({ label: s.schoolName, value: s._id }));
  }, [schoolData]);

  const isSuperAdmin = ["admin", "superadmin", "super_admin", "root"].includes(
    (role || "").toLowerCase()
  );
  const isSchoolRole = ["school", "schooladmin"].includes((role || "").toLowerCase());

  const branches = useMemo(() => {
    if (!branchData) return [];
    if (isSuperAdmin) {
      if (!selectedSchool) return [];
      return branchData
        .filter((b: any) => b.schoolId?._id === selectedSchool)
        .map((b: any) => ({ label: b.branchName, value: b._id }));
    }
    return branchData.map((b: any) => ({ label: b.branchName, value: b._id }));
  }, [branchData, isSuperAdmin, selectedSchool]);

  const deviceItems = useMemo(() => {
    if (!deviceData?.pages?.length) return [];
    return deviceData.pages.flatMap((pg: any) => {
      const list = pg.devices ?? pg.data ?? [];
      return list.map((d: any) => ({ label: d.name, value: d._id, id: d.deviceId }));
    });
  }, [deviceData]);

  // mutations
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
    updateNotificationMutation.mutate({
      assignmentId,
      data: { assignedNotifications: newNotifications },
    });
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

    const deviceName =
      deviceItems.find((d) => d.value === selectedDevice)?.label || "Unknown Device";
    const schoolName =
      schools.find((s) => s.value === selectedSchool)?.label || "Unknown School";
    const branchName =
      branches.find((b) => b.value === selectedBranch)?.label || "Unknown Branch";

    const data = {
      deviceId: selectedDevice,
      deviceName,
      schoolId: selectedSchool,
      schoolName,
      branchId: selectedBranch,
      branchName,
      assignedNotifications: selectedNotifications,
    };

    await addNotificationMutation.mutateAsync(data);
    closeButtonRef.current?.click();
    setSelectedSchool(null);
    setSelectedBranch(null);
    setSelectedDevice(null);
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
      <ResponseLoader isLoading={false} />
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
              setSelectedSchool(null);
              setSelectedBranch(null);
              setSelectedDevice(null);
              setSelectedNotifications([]);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button variant="default">Add Assigned Notifications</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px] max-h-[80vh] overflow-y-auto">
            <form onSubmit={handleSubmit} className="space-y-4">
              <DialogHeader>
                <DialogTitle>Add Assigned Notifications</DialogTitle>
              </DialogHeader>

              {/* Combobox Dropdowns */}
              <div className="space-y-4">
                {isSuperAdmin && (
                  <Combobox
                    items={schools}
                    value={selectedSchool}
                    onValueChange={setSelectedSchool}
                    placeholder="Select School"
                    searchPlaceholder="Search Schools..."
                    emptyMessage="No schools found"
                  />
                )}

                <Combobox
                  items={branches}
                  value={selectedBranch}
                  onValueChange={setSelectedBranch}
                  placeholder="Select Branch"
                  searchPlaceholder="Search Branches..."
                  emptyMessage={
                    isSuperAdmin && !selectedSchool
                      ? "Select a school first"
                      : "No branches found"
                  }
                  disabled={isSuperAdmin && !selectedSchool}
                />

                <Combobox
                  items={deviceItems}
                  value={selectedDevice}
                  onValueChange={setSelectedDevice}
                  placeholder="Select Device"
                  searchPlaceholder="Search devices..."
                  emptyMessage={
                    !selectedBranch ? "Select a branch first" : "No devices found"
                  }
                  onSearchChange={setSearch}
                  searchValue={search}
                  onReachEnd={() => {
                    if (hasNextPage && !isFetchingNextPage && !isFetching) fetchNextPage();
                  }}
                  isLoadingMore={isFetchingNextPage}
                  disabled={!selectedBranch}
                />

                {/* Notification Selection */}
                <div className="grid gap-2">
                  <Label>Assigned Notifications *</Label>
                  <div className="flex justify-between items-center mb-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (selectedNotifications.length === NOTIFICATION_OPTIONS.length)
                          setSelectedNotifications([]);
                        else setSelectedNotifications([...NOTIFICATION_OPTIONS]);
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
                            if (e.target.checked)
                              setSelectedNotifications([...selectedNotifications, option]);
                            else
                              setSelectedNotifications(
                                selectedNotifications.filter((n) => n !== option)
                              );
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
