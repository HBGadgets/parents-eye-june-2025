"use client";

import React, { useState } from "react";
import ReportFilter from "@/components/report-filters/Report-Filter";
import {
  getCoreRowModel,
  useReactTable,
  VisibilityState,
  type ColumnDef,
} from "@tanstack/react-table";
import { CustomTable } from "@/components/ui/CustomTable";

// Define Geofence Report Data type
interface GeofenceReportData {
  id: string;
  sn: number;
  name: string;
  type: string;
  message: string;
  location: string;
  createdAt: string;
}

const GeofenceReportPage: React.FC = () => {
  const [data, setData] = useState<GeofenceReportData[]>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showTable, setShowTable] = useState(false);

  // Table columns for Geofence Report
  const columns: ColumnDef<GeofenceReportData>[] = [
    { accessorKey: "sn", header: "SN" },
    { accessorKey: "name", header: "Name" },
    { accessorKey: "type", header: "Type" },
    { accessorKey: "message", header: "Message" },
    { accessorKey: "location", header: "Location" },
    { accessorKey: "createdAt", header: "Created At" },
  ];

  const table = useReactTable({
    data,
    columns,
    state: { columnVisibility },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleFilterSubmit = async (filters: any) => {
    console.log("Geofence Report Filters applied:", filters);
    setIsLoading(true);

    try {
      // Example: call API
      const response = await fetch(
        `/api/geofence-reports?schoolId=${filters.schoolId || ""}
        &branchId=${filters.branchId || ""}
        &deviceId=${filters.deviceId || ""}
        &startDate=${filters.startDate?.toISOString() || ""}
        &endDate=${filters.endDate?.toISOString() || ""}`
      );

      const json = await response.json();

      const transformed: GeofenceReportData[] = json.map(
        (item: any, index: number) => ({
          id: item._id || `row-${index}`,
          sn: index + 1,
          name: item.name,
          type: item.type,
          message: item.message,
          location: item.location,
          createdAt: new Date(item.createdAt).toLocaleString(),
        })
      );

      setData(transformed);
      setShowTable(true);
    } catch (error) {
      console.error("Error fetching geofence report data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Geofence Reports</h1>

      {/* Reuse ReportFilter here */}
      <ReportFilter
        onFilterSubmit={handleFilterSubmit}
        columns={table.getAllColumns()}
        showColumnVisibility={true}
        className="mb-6"
      />

      {/* Show table only after submit */}
      {showTable && (
        <CustomTable
          data={data}
          columns={columns}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
          pageSizeArray={[10, 20, 50]}
          maxHeight={600}
          minHeight={200}
          showSerialNumber={false}
          noDataMessage="No geofence reports found"
          isLoading={isLoading}
        />
      )}

      {/* Loading state */}
      {isLoading && !showTable && (
        <div className="flex justify-center items-center py-8">
          <div className="text-lg">Loading geofence report data...</div>
        </div>
      )}
    </div>
  );
};

export default GeofenceReportPage;
