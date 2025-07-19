"use client";

import React, { useState, useEffect } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useDevices } from "@/hooks/useDevice";
import { Device } from "@/interface/modal";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";

const DevicesPage = () => {
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const [sorting, setSorting] = useState([]);
  const [deviceName, setDeviceName] = useState("");
  const [debouncedDeviceName, setDebouncedDeviceName] = useState(deviceName);

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

  console.log("device data", devicesData);

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
  ];

  return (
    <div className="p-4">
      {/* Search Input */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by device name..."
          value={deviceName}
          onChange={(e) => setDeviceName(e.target.value)}
          className="px-3 py-2 border rounded-md w-full md:w-1/2"
        />
      </div>

      {/* Error State */}
      {isError && (
        <div className="text-red-600 mb-4">
          Error loading devices: {error?.message || "Unknown error"}
        </div>
      )}

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
    </div>
  );
};

export default DevicesPage;
