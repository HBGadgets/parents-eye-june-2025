"use client";

import React, { useEffect, useState } from "react";
import ReportFilter from "@/components/report-filters/Report-Filter";
import {
  VisibilityState,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";
import { api } from "@/services/apiService";
import ResponseLoader from "@/components/ResponseLoader";


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
        deviceIds: Array.isArray(filters.deviceId)
          ? filters.deviceId
          : [filters.deviceId],
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

      
      const [deviceRes, response] = await Promise.all([
        api.get("/device"),
        api.post(`/report/distance-report`, requestBody, {
          headers: { "Content-Type": "application/json" },
        })
      ]);

      const deviceList = deviceRes.data || [];
      const deviceMap: Record<string, string> = {};
      deviceList.forEach((d: any) => {
        deviceMap[d.deviceId] = d.name; 
      });

      console.log("Raw axios response:", response);

      
      const resData = response?.data ?? response;
      console.log("Unwrapped payload (resData):", resData);

      let dataArray: any[] = [];
      if (Array.isArray(resData)) dataArray = resData;
      else if (Array.isArray(resData.data)) dataArray = resData.data;
      else if (Array.isArray(resData.result)) dataArray = resData.result;
      else dataArray = [];

      console.log("Resolved dataArray:", dataArray);

      if (!dataArray || dataArray.length === 0) {
        setData([]);
        setTotalCount(0);
        return;
      }

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
        
        row.deviceName = deviceMap[item.deviceId] || filters.deviceName || item.deviceName || item.vehicleName || `Device-${item.deviceId ?? "NA"}`;

        let totalDistance = 0;
        dateKeys.forEach((k) => {
          const raw = item[k];
          const num = typeof raw === "number" ? raw : parseFloat(String(raw || "0")) || 0;
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
        `Failed to fetch distance report: ${
          error?.response?.data?.message || error?.message || "Unknown error"
        }`
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
    console.log("Filter submitted:", filters);

    if (!filters.deviceId) {
      alert("Please select a device before generating the report");
      return;
    }
    if (!filters.startDate || !filters.endDate) {
      alert("Please select both start and end dates");
      return;
    }
    if (new Date(filters.startDate) > new Date(filters.endDate)) {
      alert("Start date cannot be after end date");
      return;
    }

    setPagination({ pageIndex: 0, pageSize: 10 });
    setSorting([]);
    setColumnVisibility({});

    setCurrentFilters(filters);
    setShowTable(true);


    await fetchDistanceReportData(filters, { pageIndex: 0, pageSize: 10 }, []);
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
      <h1 className="text-xl font-bold mb-4">Distance Reports</h1>

      <ReportFilter
        onFilterSubmit={handleFilterSubmit}
        columns={table.getAllColumns()}
        showColumnVisibility={true}
        className="mb-6"
      />

      {showTable && <section className="mb-4">{tableElement}</section>}
    </div>
  );
};

export default DistanceReportPage;