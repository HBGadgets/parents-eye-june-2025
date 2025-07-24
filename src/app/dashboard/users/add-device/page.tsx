"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ColumnDef,
  getCoreRowModel,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";
import { useDevices } from "@/hooks/useDevice";
import { Device } from "@/interface/modal";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";
import ResponseLoader from "@/components/ResponseLoader";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/apiService";
import { SearchBar } from "@/components/search-bar/SearchBarPagination";
import { Alert } from "@/components/Alert";
import { DynamicEditDialog, FieldConfig } from "@/components/ui/EditModal";
import { useSchoolData } from "@/hooks/useSchoolData";
import { useBranchData } from "@/hooks/useBranchData";
import { FloatingMenu } from "@/components/floatingMenu";
import { useExport } from "@/hooks/useExport";
import { ColumnVisibilitySelector } from "@/components/column-visibility-selector";
import DateRangeFilter from "@/components/ui/DateRangeFilter";
import { CustomFilter } from "@/components/ui/CustomFilter";
import { set } from "date-fns";

const DevicesPage = () => {
  const queryClient = useQueryClient();
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [deleteTarget, setDeleteTarget] = useState<Device | null>(null);
  const [editTarget, setEditTarget] = useState<Device | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [filteredData, setFilteredData] = useState<Device[]>([]); // For manual updates
  const [sorting, setSorting] = useState([]);
  const [deviceName, setDeviceName] = useState("");
  const [debouncedDeviceName, setDebouncedDeviceName] = useState(deviceName);
  const { data: schoolData } = useSchoolData();
  const { data: branchData } = useBranchData();
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [filteredBranches, setFilteredBranches] = useState<any[]>([]);
  const { exportToPDF, exportToExcel } = useExport();
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [filterResults, setFilterResults] = useState<Device[]>([]);

  const {
    data: devicesData,
    isLoading,
    error,
    isError,
    isFetching,
  } = useDevices({
    pagination,
    sorting,
    deviceName: debouncedDeviceName,
  });

  // Debounce deviceName search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedDeviceName(deviceName);
      setPagination((prev) => ({ ...prev, pageIndex: 0 })); // Reset to page 1 on search
    }, 500); // 500ms debounce delay

    return () => clearTimeout(handler);
  }, [deviceName]);

  // Add this useEffect to filter branches when school is selected
  useEffect(() => {
    if (selectedSchoolId && branchData) {
      const filtered = branchData.filter(
        (branch: any) => branch.schoolId._id === selectedSchoolId
      );
      setFilteredBranches(filtered);
    } else {
      setFilteredBranches([]);
    }
  }, [selectedSchoolId, branchData]);

  // Add this useEffect to handle branch reset when school changes
  useEffect(() => {
    if (editTarget && selectedSchoolId && filteredBranches.length > 0) {
      // Check if current branch belongs to the selected school
      const currentBranchId = editTarget.branchId?._id;
      const branchBelongsToSchool = filteredBranches.some(
        (branch) => branch._id === currentBranchId
      );

      // If current branch doesn't belong to selected school, reset it
      if (currentBranchId && !branchBelongsToSchool) {
        setEditTarget((prev) => ({
          ...prev!,
          branchId: { _id: "", branchName: "" },
        }));
      }
    }
  }, [filteredBranches, selectedSchoolId]);

  useEffect(() => {
    setFilteredData(devicesData?.devices || []);
  }, [devicesData]);

  const columns: ColumnDef<Device>[] = [
    {
      id: "name",
      header: "Device Name",
      accessorFn: (row) => row.name ?? "",
      meta: { flex: 1, minWidth: 100, maxWidth: 300 },
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "uniqueId",
      header: "IMEI Number",
      accessorFn: (row) => row.uniqueId ?? "",
      meta: { flex: 1, minWidth: 100, maxWidth: 300 },
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "sim",
      header: "Sim Number",
      accessorFn: (row) => row.sim ?? "",
      meta: { flex: 1, minWidth: 100, maxWidth: 300 },
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "speed",
      header: "Speed",
      accessorFn: (row) => row.speed ?? "",
      meta: { flex: 1, minWidth: 100, maxWidth: 300 },
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "average",
      header: "Average Speed",
      accessorFn: (row) => row.average ?? "",
      meta: { flex: 1, minWidth: 100, maxWidth: 300 },
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "Driver",
      header: "Driver",
      accessorFn: (row) => row.Driver ?? "",
      meta: { flex: 1, minWidth: 100, maxWidth: 300 },
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "model",
      header: "Model",
      accessorFn: (row) => row.model ?? "",
      meta: { flex: 1, minWidth: 100, maxWidth: 300 },
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "category",
      header: "Category",
      accessorFn: (row) => row.category ?? "",
      meta: { flex: 1, minWidth: 100, maxWidth: 300 },
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "deviceId",
      header: "Device ID",
      accessorFn: (row) => row.deviceId ?? "",
      meta: { flex: 1, minWidth: 100, maxWidth: 300 },
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "status",
      header: "Status",
      accessorFn: (row) => row.status ?? "",
      meta: { flex: 1, minWidth: 100, maxWidth: 300 },
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "lastUpdate",
      header: "Last Updated",
      accessorFn: (row) =>
        row.lastUpdate ? new Date(row.lastUpdate).toLocaleString() : "",
      meta: { flex: 1, minWidth: 100, maxWidth: 300 },
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "schoolId",
      header: "School Name",
      accessorFn: (row) => row.schoolId?.schoolName ?? "",
      meta: { flex: 1, minWidth: 100, maxWidth: 300 },
      enableHiding: true,
      enableSorting: false,
    },
    {
      id: "branchId",
      header: "Branch Name",
      accessorFn: (row) => row.branchId?.branchName ?? "",
      meta: { flex: 1, minWidth: 100, maxWidth: 300 },
      enableHiding: true,
      enableSorting: false,
    },
    {
      id: "createdAt",
      header: "Registration Date",
      accessorFn: (row) =>
        row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "",
      meta: { flex: 1, minWidth: 100, maxWidth: 300 },
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "actions",
      header: "Action",
      cell: ({ row }) => {
        const rowData = row.original;
        return (
          <div className="flex items-center justify-center gap-2">
            <button
              className="bg-yellow-400 hover:bg-yellow-500 text-[#733e0a] font-semibold py-1 px-3 rounded-md cursor-pointer"
              onClick={() => {
                const device = row.original;
                setEditTarget(device);
                setEditDialogOpen(true);

                // Initialize selectedSchoolId with the current school
                const currentSchoolId = device.schoolId?._id || null;
                setSelectedSchoolId(currentSchoolId);

                // Initialize filtered branches based on current school
                if (currentSchoolId && branchData) {
                  const filtered = branchData.filter(
                    (branch: any) => branch.schoolId._id === currentSchoolId
                  );
                  setFilteredBranches(filtered);
                }
              }}
            >
              Edit
            </button>
            <button
              className="bg-yellow-400 hover:bg-yellow-500 text-red-600 font-semibold py-1 px-3 rounded-md cursor-pointer"
              onClick={() => {
                setDeleteTarget(rowData);
              }}
            >
              Delete
            </button>
          </div>
        );
      },
      meta: { flex: 1.5, minWidth: 150, maxWidth: 200 },
      enableSorting: false,
      enableHiding: true,
    },
  ];

  // console.log("schoolData", schoolData);
  // console.log("branchData", branchData);
  // console.log("devicesData", devicesData);

  // columns for export
  const columnsForExport = [
    { key: "name", header: "Device Name" },
    { key: "uniqueId", header: "IMEI Number" },
    { key: "sim", header: "Sim Number" },
    { key: "speed", header: "Speed" },
    { key: "average", header: "Average Speed" },
    { key: "Driver", header: "Driver Name" },
    { key: "model", header: "Model" },
    { key: "category", header: "Category" },
    { key: "deviceId", header: "Device ID" },
    { key: "status", header: "Status" },
    { key: "lastUpdate", header: "Last Update" },
    { key: "schoolId.schoolName", header: "School Name" },
    { key: "branchId.branchName", header: "Branch Name" },
    { key: "createdAt", header: "Registration Date" },
  ];

  // Define the fields for the edit dialog
  const deviceFieldConfigs: FieldConfig[] = [
    {
      label: "Device Name",
      key: "name",
      type: "text",
    },
    {
      label: "Sim Number",
      key: "sim",
      type: "number",
    },
    {
      label: "IMEI Number",
      key: "uniqueId",
      type: "text",
    },
    {
      label: "Speed",
      key: "speed",
      type: "text",
    },
    {
      label: "Average",
      key: "average",
      type: "text",
    },
    {
      label: "Driver",
      key: "Driver",
      type: "text",
    },
    {
      label: "Model",
      key: "model",
      type: "text",
    },
    {
      label: "Category",
      key: "category",
      type: "text",
    },
    {
      label: "Route No",
      key: "routeNo",
      type: "text",
    },
    {
      label: "School Name",
      key: "schoolId._id",
      type: "searchable-select",
      options: schoolData || [],
      labelKey: "schoolName",
      valueKey: "_id",
    },
    {
      label: "Branch Name",
      key: "branchId._id",
      type: "searchable-select",
      options: filteredBranches || [],
      labelKey: "branchName",
      valueKey: "_id",
      disabled: !selectedSchoolId || filteredBranches.length === 0, // Enable when school is selected and branches are available
    },
  ];

  // Mutation to delete a school
  const deleteDeviceMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      return await api.delete(`/device/${deviceId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] }); // 🔥 THIS invalidates all device-related queries
      alert("Device deleted successfully.");
    },
    onError: (err) => {
      alert("Failed to delete device.\nerror: " + err);
    },
  });

  // Mutation to update a device
  const updateDeviceMutation = useMutation({
    mutationFn: async ({
      deviceId,
      data,
    }: {
      deviceId: string;
      data: Partial<Device>;
    }) => {
      return await api.put(`/device/${deviceId}`, data);
    },
    onSuccess: (_, { deviceId, data }) => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });

      // Update filteredData manually
      setFilteredData((prev) =>
        prev.map((device) =>
          device._id === deviceId ? { ...device, ...data } : device
        )
      );

      setEditDialogOpen(false);
      setEditTarget(null);
      alert("School updated successfully.");
    },
    onError: (err) => {
      alert("Failed to update school.\nerror: " + err);
    },
  });

  const handleSave = (updatedData: Partial<Device>) => {
    if (!editTarget) return;

    const changedFields: Partial<Record<keyof Device, unknown>> = {};

    for (const key in updatedData) {
      const newValue = updatedData[key as keyof Device];
      const oldValue = editTarget[key as keyof Device];

      if (newValue !== undefined && newValue !== oldValue) {
        changedFields[key as keyof Device] = newValue;
      }
    }

    console.log("Changed fields:", changedFields);

    if (Object.keys(changedFields).length === 0) {
      console.log("No changes detected.");
      return;
    }

    updateDeviceMutation.mutate({
      deviceId: editTarget._id,
      data: changedFields,
    });
  };

  const handleSchoolChange = (key: string, value: any, option?: any) => {
    console.log("handleSchoolChange", key, value, option);

    // Handle school selection
    if (key === "schoolId._id") {
      const previousSchoolId = selectedSchoolId;
      setSelectedSchoolId(value);

      // Only reset branch selection if school actually changed
      if (editTarget && previousSchoolId !== value) {
        setEditTarget({
          ...editTarget,
          schoolId: { _id: value, schoolName: option?.schoolName || "" },
          branchId: { _id: "", branchName: "" }, // Reset branch selection only when school changes
        });
      } else if (editTarget) {
        // Just update the school without resetting branch
        setEditTarget({
          ...editTarget,
          schoolId: { _id: value, schoolName: option?.schoolName || "" },
        });
      }
    }

    // Handle branch selection
    if (key === "branchId._id" && editTarget) {
      setEditTarget({
        ...editTarget,
        branchId: { _id: value, branchName: option?.branchName || "" },
      });
    }

    if (option) {
      console.log("Selected option:", option);
    }
  };

  // NEEED TO PASSS IN THE QUERY PARAMETERRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR
  const handleDateFilter = useCallback(
    (start: Date | null, end: Date | null) => {
      if (!devicesData.devices || (!start && !end)) {
        setFilteredData(devicesData.devices || []);
        return;
      }

      const filtered = devicesData.devices.filter((device) => {
        if (!device.createdAt) return false;

        const createdDate = new Date(device.createdAt);
        return (!start || createdDate >= start) && (!end || createdDate <= end);
      });

      setFilteredData(filtered);
    },
    [devicesData]
  );

  const handleCustomFilter = useCallback((filtered: Device[]) => {
    setFilteredData(filtered);
  }, []);
  {
    /* NEEED TO PASSS IN THE QUERY PARAMETERRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR */
  }

  // Replace your existing CustomTableServerSidePagination usage with:
  const { table, tableElement } = CustomTableServerSidePagination({
    data: devicesData?.devices || [],
    columns,
    pagination,
    totalCount: devicesData?.total || 0,
    loading: isLoading || isFetching,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    sorting,
    columnVisibility,
    onColumnVisibilityChange: setColumnVisibility,
    emptyMessage: "No devices found",
    pageSizeOptions: [5, 10, 20, 30, 50],
    enableSorting: true,
    showSerialNumber: true,
  });

  return (
    <div className="p-4">
      {/* Progress loader at the top */}
      <ResponseLoader isLoading={isLoading} />

      <header className="flex items-center gap-4 mb-4">
        {/* Search Input */}
        <SearchBar
          value={deviceName}
          onChange={setDeviceName}
          placeholder="Search by device name..."
          width="w-full md:w-1/4"
        />

        {/* NEEED TO PASSS IN THE QUERY PARAMETERRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR */}

        {/* Column visibility selector */}
        <ColumnVisibilitySelector
          columns={table.getAllColumns()}
          buttonVariant="outline"
          buttonSize="default"
        />

        {/* Access Filter*/}
        <CustomFilter
          data={filterResults}
          originalData={filterResults}
          filterFields={["status"]}
          onFilter={handleCustomFilter}
          placeholder={"Filter by Status"}
          className="w-[180px]"
        />

        {/* NEEED TO PASSS IN THE QUERY PARAMETERRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR */}
        {/* Date range picker
        <DateRangeFilter
          onDateRangeChange={handleDateFilter}
          title="Search by Registration Date"
        /> */}
      </header>

      {/* Table Section */}
      <section>
        {/* <CustomTableServerSidePagination
          data={devicesData?.devices || []}
          columns={columns}
          pagination={pagination}
          totalCount={devicesData?.total || 0}
          loading={isLoading || isFetching}
          onPaginationChange={setPagination}
          onSortingChange={setSorting}
          sorting={sorting}
          emptyMessage="No devices found"
          pageSizeOptions={[5, 10, 20, 30, 50]}
        /> */}
        {tableElement}
      </section>

      {/* Delete Dialog */}
      <section>
        <div>
          {deleteTarget && (
            <Alert<Device>
              title="Are you absolutely sure?"
              description={`This will permanently delete ${deleteTarget?.name} and all associated data.`}
              actionButton={(target) => {
                deleteDeviceMutation.mutate(target._id);
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
        {/* Edit Dialog */}
        <section>
          {editTarget && (
            <DynamicEditDialog
              data={editTarget}
              isOpen={editDialogOpen}
              onClose={() => {
                setEditDialogOpen(false);
                setEditTarget(null);
                setSelectedSchoolId(null);
                setFilteredBranches([]);
              }}
              onSave={handleSave}
              fields={deviceFieldConfigs}
              title="Edit Device"
              description="Update the device information below. Fields marked with * are required."
              avatarConfig={{
                imageKey: "logo",
                nameKeys: ["name"],
              }}
              onFieldChange={handleSchoolChange}
            />
          )}
        </section>
      </section>
      {/* Floating Menu */}
      <section>
        <FloatingMenu
          onExportPdf={() => {
            console.log("Export PDF triggered"); // ✅ Add this for debugging
            exportToPDF(devicesData?.devices, columnsForExport, {
              title: "All Devices Data",
              companyName: "Parents Eye",
              metadata: {
                Total: `${devicesData?.devices?.length} devices`,
              },
            });
          }}
          onExportExcel={() => {
            console.log("Export Excel triggered"); // ✅ Add this too
            exportToExcel(devicesData?.devices, columnsForExport, {
              title: "All Devices Data",
              companyName: "Parents Eye",
              metadata: {
                Total: `${devicesData?.devices.length} devices`,
              },
            });
          }}
        />
      </section>
    </div>
  );
};

export default DevicesPage;
