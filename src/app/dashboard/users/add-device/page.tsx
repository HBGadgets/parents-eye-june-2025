"use client";

import React, { useState, useEffect } from "react";
import { ColumnDef } from "@tanstack/react-table";
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

  // Debounce deviceName search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedDeviceName(deviceName);
      setPagination((prev) => ({ ...prev, pageIndex: 0 })); // Reset to page 1 on search
    }, 500); // 500ms debounce delay

    return () => clearTimeout(handler);
  }, [deviceName]);

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
                setEditTarget(row.original);
                setEditDialogOpen(true);
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

  console.log("schoolData", schoolData);

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

      options: [
        { label: "parentseye", value: "68788528f8911140870e7a32" },
        { label: "sbjainschool", value: "6878856c7fe7ec5e0429bb4a" },
        { label: "crtrack", value: "68788bcf7fe7ec5e0429bbe9" },
        { label: "HB Gadget", value: "6878b8eeee5c33d4eaa589d6" },
        { label: "rocketsales", value: "6878b94fee5c33d4eaa589e1" },
        { label: "fgdms", value: "6878b982ee5c33d4eaa589f4" },
        { label: "karmanya", value: "6878b9efee5c33d4eaa58a03" },
        { label: "jain international", value: "6878d8de6431914c981c70b8" },
        { label: "Sunbeam School", value: "687a088cb62b4867cc41e027" },
        { label: "Model High School", value: "687a088cb62b4867cc41e031" },
      ],
    },
    {
      label: "Branch Name",
      key: "branchId._id",
      type: "searchable-select",
      options:
        branchData?.map((branch) => ({
          label: branch.branchName,
          value: branch._id,
        })) || [],
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
      queryClient.setQueryData<Device[]>(["devices"], (oldData) => {
        if (!oldData) return [];
        return oldData.map((device) =>
          device._id === deviceId ? { ...device, ...data } : device
        );
      });

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

  return (
    <div className="p-4">
      {/* Progress loader at the top */}
      <ResponseLoader isLoading={isLoading} />

      <header>
        {/* Search Input */}
        <SearchBar
          value={deviceName}
          onChange={setDeviceName}
          placeholder="Search by device name..."
          width="w-full md:w-1/4"
        />
      </header>

      {/* Table Section */}
      <section>
        <CustomTableServerSidePagination
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
        />
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
              }}
              onSave={handleSave}
              fields={deviceFieldConfigs}
              title="Edit School"
              description="Update the school information below. Fields marked with * are required."
              avatarConfig={{
                imageKey: "logo",
                nameKeys: ["schoolName"],
              }}
            />
          )}
        </section>
      </section>
    </div>
  );
};

export default DevicesPage;
