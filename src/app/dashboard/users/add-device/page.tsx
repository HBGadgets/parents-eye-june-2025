"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ColumnDef, VisibilityState } from "@tanstack/react-table";
import { useDevices } from "@/hooks/useDevice";
import { useSchoolData } from "@/hooks/useSchoolData";
import { useBranchData } from "@/hooks/useBranchData";
import { useRoutes } from "@/hooks/useRoute";
import { useDriver } from "@/hooks/useDriver";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/apiService";
import { Device } from "@/interface/modal";
import { toast } from "sonner";
import Cookies from "js-cookie";
import { getDecodedToken } from "@/lib/jwt";

// 🧩 UI Components
import ResponseLoader from "@/components/ResponseLoader";
import { SearchBar } from "@/components/search-bar/SearchBarPagination";
import { Alert } from "@/components/Alert";
import { DynamicEditDialog, FieldConfig } from "@/components/ui/EditModal";
import { AddDeviceForm } from "@/components/Device/add-device-form";
import { FloatingMenu } from "@/components/floatingMenu";
import { ColumnVisibilitySelector } from "@/components/column-visibility-selector";
import { CustomFilter } from "@/components/ui/CustomFilter";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";
import { useExport } from "@/hooks/useExport";

type UserRole = "superAdmin" | "school" | "branchGroup" | "branch" | null;

const DevicesPage = () => {
  const queryClient = useQueryClient();

  /** =========================
   * 🔹 STATE & DATA HOOKS
   * ========================= */
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [deleteTarget, setDeleteTarget] = useState<Device | null>(null);
  const [editTarget, setEditTarget] = useState<Device | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [filteredData, setFilteredData] = useState<Device[]>([]);
  const [deviceName, setDeviceName] = useState("");
  const [debouncedDeviceName, setDebouncedDeviceName] = useState(deviceName);
  const [sorting, setSorting] = useState([]);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const { exportToPDF, exportToExcel } = useExport();

  // API hooks
  const { data: schoolData } = useSchoolData();
  const { data: branchData } = useBranchData();
  const { data: driverData } = useDriver();
  const { data: routeData } = useRoutes({ limit: "all" });

  const {
    data: devicesData,
    isLoading,
    isFetching,
  } = useDevices({
    pagination,
    sorting,
    deviceName: debouncedDeviceName,
  });

  /** =========================
   * 🧠 EFFECTS
   * ========================= */
  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedDeviceName(deviceName);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }, 500);
    return () => clearTimeout(timer);
  }, [deviceName]);

  // Detect logged-in user role
  useEffect(() => {
    const token = Cookies.get("token");
    const decoded = token ? getDecodedToken(token) : null;
    const role = decoded?.role;
    if (["superAdmin", "school", "branchGroup", "branch"].includes(role)) {
      setUserRole(role as UserRole);
    }
  }, []);

  // Update local filtered data when devices change
  useEffect(() => {
    setFilteredData(devicesData?.devices || []);
  }, [devicesData]);

  /** =========================
   * 🏫 FILTERING LOGIC
   * ========================= */
  const filteredBranches = useMemo(() => {
    if (!selectedSchoolId || !branchData) return [];
    return branchData.filter(
      (branch: any) => branch.schoolId?._id === selectedSchoolId
    );
  }, [selectedSchoolId, branchData]);

  const filteredRoutes = useMemo(() => {
    if (!selectedBranchId || !routeData?.data) return [];
    return routeData.data.filter(
      (route: any) => route.branchId?._id === selectedBranchId
    );
  }, [selectedBranchId, routeData]);

  const handleSchoolChange = (key: string, value: any, option?: any) => {
    if (key === "schoolId._id") {
      const prevSchoolId = selectedSchoolId;
      setSelectedSchoolId(value);

      if (editTarget && prevSchoolId !== value) {
        setEditTarget({
          ...editTarget,
          schoolId: { _id: value, schoolName: option?.schoolName || "" },
          branchId: { _id: "", branchName: "" },
        });
        setSelectedBranchId(null);
      }
    }
  };

  const handleBranchChange = (key: string, value: any, option?: any) => {
    if (key === "branchId._id") {
      setSelectedBranchId(value);
      if (editTarget) {
        setEditTarget({
          ...editTarget,
          branchId: { _id: value, branchName: option?.branchName || "" },
        });
      }
    }
  };

  /** =========================
   * ✏️ EDIT CONFIGURATION
   * ========================= */
  const deviceEditFieldConfigs: FieldConfig[] = [
    { label: "Device Name", key: "name", type: "text" },
    { label: "Sim Number", key: "sim", type: "text" },
    { label: "IMEI Number", key: "uniqueId", type: "text" },
    { label: "Speed Limit (KM/H)", key: "speed", type: "number" },
    { label: "Average (KM/Litre)", key: "average", type: "number" },
    {
      label: "Driver",
      key: "driver",
      type: "searchable-select",
      options: driverData || [],
      labelKey: "driverName",
      valueKey: "_id",
    },
    { label: "Model", key: "model", type: "text" },
    { label: "Category", key: "category", type: "text" },
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
      disabled: !selectedSchoolId || filteredBranches.length === 0,
    },
    {
      label: "Route No",
      key: "routeNo",
      type: "searchable-select",
      options: filteredRoutes || [],
      labelKey: "routeNumber",
      valueKey: "_id",
      disabled: !selectedBranchId || filteredRoutes.length === 0,
    },
  ];

  /** =========================
   * 🔄 MUTATIONS
   * ========================= */
  const deleteDeviceMutation = useMutation({
    mutationFn: async (deviceId: string) => api.delete(`/device/${deviceId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      toast.success("Device deleted successfully.");
    },
    onError: () => toast.error("Failed to delete device."),
  });

  const updateDeviceMutation = useMutation({
    mutationFn: async ({
      deviceId,
      data,
    }: {
      deviceId: string;
      data: Partial<Device>;
    }) => api.put(`/device/${deviceId}`, data),
    onSuccess: (_, { deviceId, data }) => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      setFilteredData((prev) =>
        prev.map((d) => (d._id === deviceId ? { ...d, ...data } : d))
      );
      setEditDialogOpen(false);
      setEditTarget(null);
      toast.success("Device updated successfully.");
    },
    onError: () => toast.error("Failed to update device."),
  });

  /** =========================
   * 📊 TABLE COLUMNS
   * ========================= */
  const columns: ColumnDef<Device>[] = [
    { id: "name", header: "Device Name", accessorFn: (r) => r.name ?? "" },
    { id: "uniqueId", header: "IMEI Number", accessorFn: (r) => r.uniqueId ?? "" },
    { id: "sim", header: "Sim Number", accessorFn: (r) => r.sim ?? "" },
    { id: "speed", header: "Speed", accessorFn: (r) => r.speed ?? "" },
    { id: "average", header: "Average Speed", accessorFn: (r) => r.average ?? "" },
    { id: "Driver", header: "Driver", accessorFn: (r) => r.Driver ?? "" },
    { id: "model", header: "Model", accessorFn: (r) => r.model ?? "" },
    { id: "category", header: "Category", accessorFn: (r) => r.category ?? "" },
    { id: "deviceId", header: "Device ID", accessorFn: (r) => r.deviceId ?? "" },
    { id: "status", header: "Status", accessorFn: (r) => r.status ?? "" },
    {
      id: "lastUpdate",
      header: "Last Updated",
      accessorFn: (r) =>
        r.lastUpdate ? new Date(r.lastUpdate).toLocaleString() : "",
    },
    {
      id: "schoolId",
      header: "School Name",
      accessorFn: (r) => r.schoolId?.schoolName ?? "",
    },
    {
      id: "branchId",
      header: "Branch Name",
      accessorFn: (r) => r.branchId?.branchName ?? "",
    },
    {
      id: "createdAt",
      header: "Registration Date",
      accessorFn: (r) =>
        r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "",
    },
  ];

  if (userRole === "superAdmin") {
    columns.push({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex gap-2 justify-center">
          <button
            className="bg-yellow-400 hover:bg-yellow-500 text-[#733e0a] font-semibold py-1 px-3 rounded-md cursor-pointer"
            onClick={() => {
              const device = row.original;
              setEditTarget(device);
              setEditDialogOpen(true);
              setSelectedSchoolId(device.schoolId?._id || null);
              setSelectedBranchId(device.branchId?._id || null);
            }}
          >
            Edit
          </button>
          <button
            className="bg-yellow-400 hover:bg-yellow-500 text-red-600 font-semibold py-1 px-3 rounded-md cursor-pointer"
            onClick={() => setDeleteTarget(row.original)}
          >
            Delete
          </button>
        </div>
      ),
    });
  }

  /** =========================
   * 🧮 TABLE INSTANCE
   * ========================= */
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
  });

  /** =========================
   * 🧾 RENDER
   * ========================= */
  return (
    <div className="p-4">
      <ResponseLoader isLoading={isLoading} />

      <header className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-4 flex-1">
          <SearchBar
            value={deviceName}
            onChange={setDeviceName}
            placeholder="Search by device name..."
            width="w-full md:w-1/4"
          />
          <ColumnVisibilitySelector
            columns={table.getAllColumns()}
            buttonVariant="outline"
          />
          {/* <CustomFilter
            data={filteredData}
            filterFields={["status"]}
            onFilter={setFilteredData}
            placeholder="Filter by Status"
            className="w-[180px]"
          /> */}
        </div>
        {userRole === "superAdmin" && <AddDeviceForm />}
      </header>

      <section>{tableElement}</section>

      {deleteTarget && (
        <Alert<Device>
          title="Are you sure?"
          description={`This will permanently delete ${deleteTarget.name}.`}
          actionButton={(target) => {
            deleteDeviceMutation.mutate(target._id);
            setDeleteTarget(null);
          }}
          target={deleteTarget}
          setTarget={setDeleteTarget}
          butttonText="Delete"
        />
      )}

      {editTarget && (
        <DynamicEditDialog
          data={editTarget}
          isOpen={editDialogOpen}
          onClose={() => {
            setEditDialogOpen(false);
            setEditTarget(null);
            setSelectedSchoolId(null);
            setSelectedBranchId(null);
          }}
          onSave={(data) =>
            updateDeviceMutation.mutate({
              deviceId: editTarget._id,
              data,
            })
          }
          fields={deviceEditFieldConfigs}
          title="Edit Device"
          description="Update the device information below."
          onFieldChange={(key, value, option) => {
            handleSchoolChange(key, value, option);
            handleBranchChange(key, value, option);
          }}
        />
      )}

      <FloatingMenu
        onExportPdf={() =>
          exportToPDF(devicesData?.devices, columns, {
            title: "All Devices Data",
            companyName: "Parents Eye",
          })
        }
        onExportExcel={() =>
          exportToExcel(devicesData?.devices, columns, {
            title: "All Devices Data",
            companyName: "Parents Eye",
          })
        }
      />
    </div>
  );
};

export default DevicesPage;
