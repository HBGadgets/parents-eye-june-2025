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

export default function ReadDevice() {
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
    pageSizeOptions: [5, 10, 20, 30, 50, 100, "All"],
    enableSorting: true,
    showSerialNumber: true,
    // Enable virtualization
    enableVirtualization: true,
    estimatedRowHeight: 50,
    overscan: 5,
    maxHeight: "600px",
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

      <main>
        <section>{tableElement}</section>
      </main>

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
}
