"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import ReportFilter from "@/components/report-filters/Report-Filter";
import {
  VisibilityState,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";
import { api } from "@/services/apiService";
import ResponseLoader from "@/components/ResponseLoader";
import { useDeviceData } from "@/hooks/useDeviceData";

type DistanceRow = Record<string, any>;

const DistanceReportPage: React.FC = () => {
  const [data, setData] = useState<DistanceRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [columnVisibility, setColumnVisibility] =
    useState<VisibilityState>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showTable, setShowTable] = useState(false);

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [currentFilters, setCurrentFilters] = useState<any>(null);

  // Vehicle selection state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [selectedVehicleName, setSelectedVehicleName] = useState("");

  const {
    data: vehicleData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useDeviceData({ searchTerm });

  // Flatten all vehicles
  const allVehicles = useMemo(() => {
    if (!vehicleData?.pages) return [];
    return vehicleData.pages.flat();
  }, [vehicleData]);

  const vehicleMetaData = useMemo(() => {
    if (!Array.isArray(allVehicles)) return [];
    return allVehicles.map((vehicle) => ({
      value: vehicle.deviceId.toString(),
      label: vehicle.name,
    }));
  }, [allVehicles]);

  const handleVehicleReachEnd = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleSearchChange = useCallback((search: string) => {
    setSearchTerm(search);
  }, []);

  const handleVehicleChange = useCallback(
    (value: string) => {
      setSelectedVehicle(value);
      const selected = vehicleMetaData.find((v) => v.value === value);
      setSelectedVehicleName(selected?.label || "");
    },
    [vehicleMetaData]
  );

  const [columns, setColumns] = useState<ColumnDef<DistanceRow>[]>([
    { accessorKey: "sn", header: "Sr No." },
    { accessorKey: "deviceName", header: "Vehicle Name", size: 200 },
    {
      accessorKey: "totalDistance",
      header: "Total Distance (km)",
      size: 200,
      cell: (info) => ((info.getValue<number>() ?? 0).toFixed(2)),
    },
  ]);

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toISOString().slice(0, 10);
  };

  const fetchDistanceReportData = async (
    filters: any,
    paginationState: any,
    sortingState: SortingState
  ) => {
    if (!filters) return;
    setIsLoading(true);

    try {
      const fromDate = formatDate(filters.startDate);
      const toDate = formatDate(filters.endDate);

      const requestBody: any = {
        deviceIds: [filters.deviceId],
        period: "Custom",
        from: fromDate,
        to: toDate,
        page: String(paginationState.pageIndex + 1),
        limit: String(paginationState.pageSize),
      };

      if (sortingState.length > 0) {
        const sort = sortingState[0];
        requestBody.sortBy = sort.id;
        requestBody.sortOrder = sort.desc ? "desc" : "asc";
      }

      const response = await api.post(`/report/distance-report`, requestBody, {
        headers: { "Content-Type": "application/json" },
      });

      const resData = response?.data ?? response;

      let dataArray: any[] = [];
      if (Array.isArray(resData)) dataArray = resData;
      else if (Array.isArray(resData.data)) dataArray = resData.data;
      else if (Array.isArray(resData.result)) dataArray = resData.result;
      else dataArray = [];

      if (!dataArray || dataArray.length === 0) {
        setData([]);
        setTotalCount(0);
        return;
      }

      // Extract dynamic date keys
      let dateKeys = Object.keys(dataArray[0]).filter((k) =>
        /^\d{4}-\d{2}-\d{2}$/.test(k)
      );
      if (dateKeys.length === 0) {
        dateKeys = Object.keys(dataArray[0]).filter(
          (k) => k !== "deviceId" && k !== "_id" && k !== "message"
        );
      }
      dateKeys = Array.from(new Set(dateKeys)).sort();

      const dynamicColumns: ColumnDef<DistanceRow>[] = [
        { accessorKey: "sn", header: "Sr No." },
        { accessorKey: "deviceName", header: "Vehicle Name", size: 200 },
        ...dateKeys.map((dateKey) => ({
          accessorKey: dateKey,
          header: dateKey,
          size: 110,
          cell: (info: any) => {
            const v = info.getValue();
            if (v === undefined || v === null) return "0.00";
            const num = typeof v === "number" ? v : parseFloat(String(v)) || 0;
            return num.toFixed(2);
          },
        })),
        {
          accessorKey: "totalDistance",
          header: "Total Distance (km)",
          size: 200,
          cell: (info) => ((info.getValue<number>() ?? 0).toFixed(2)),
        },
      ];
      setColumns(dynamicColumns);

      const transformed: DistanceRow[] = dataArray.map((item: any, idx: number) => {
        const row: DistanceRow = {};
        row.id = item._id ?? item.deviceId ?? `row-${idx}`;
        row.sn = paginationState.pageIndex * paginationState.pageSize + idx + 1;
        row.deviceName = filters.deviceName; // ✅ from selectedVehicleName
        let totalDistance = 0;
        dateKeys.forEach((k) => {
          const raw = item[k];
          const num =
            typeof raw === "number" ? raw : parseFloat(String(raw || "0")) || 0;
          row[k] = num;
          totalDistance += num;
        });
        row.totalDistance = totalDistance;
        return row;
      });

      setData(transformed);
      setTotalCount(resData.total ?? resData.totalCount ?? transformed.length);
    } catch (error: any) {
      console.error("Error fetching distance report data:", error);
      alert(
        error?.response?.data?.message || error?.message || "Unknown error"
      );
      setData([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentFilters && showTable) {
      fetchDistanceReportData(currentFilters, pagination, sorting);
    }
  }, [pagination, sorting, currentFilters, showTable]);

  const handleFilterSubmit = async (filters: any) => {
    if (!selectedVehicle || !filters.startDate || !filters.endDate) {
      alert("Please select a vehicle and both dates");
      return;
    }

    const updatedFilters = {
      ...filters,
      deviceId: selectedVehicle,
      deviceName: selectedVehicleName,
    };

    setPagination({ pageIndex: 0, pageSize: 10 });
    setSorting([]);
    setColumnVisibility({});
    setCurrentFilters(updatedFilters);
    setShowTable(true);

    await fetchDistanceReportData(updatedFilters, { pageIndex: 0, pageSize: 10 }, []);
  };

  const { table, tableElement } = CustomTableServerSidePagination({
    data,
    columns,
    pagination,
    totalCount,
    loading: isLoading,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    sorting,
    columnVisibility,
    onColumnVisibilityChange: setColumnVisibility,
    emptyMessage:
      "No distance reports found. Please check your filters and try again.",
    pageSizeOptions: [5, 10, 20, 30, 50],
    enableSorting: true,
    showSerialNumber: false,
  });

  return (
    <div>
      <ResponseLoader isLoading={isLoading} />

      <ReportFilter
        onFilterSubmit={handleFilterSubmit}
        columns={table.getAllColumns()}
        showColumnVisibility
        className="mb-6"
        vehicleMetaData={vehicleMetaData}
        selectedVehicle={selectedVehicle}
        onVehicleChange={handleVehicleChange}
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        onVehicleReachEnd={handleVehicleReachEnd}
        isFetchingNextPage={isFetchingNextPage}
        hasNextPage={hasNextPage}
      />

      {showTable && <section className="mb-4">{tableElement}</section>}
    </div>
  );
};

export default DistanceReportPage;
