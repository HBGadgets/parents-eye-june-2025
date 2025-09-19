"use client";

import React, { useCallback, useEffect, useState } from "react";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";
import SearchComponent from "@/components/ui/SearchOnlydata";
import DateRangeFilter from "@/components/ui/DateRangeFilter";
import { FloatingMenu } from "@/components/floatingMenu";
import { VisibilityState, type ColumnDef } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/apiService";
import { useExport } from "@/hooks/useExport";
import ResponseLoader from "@/components/ResponseLoader";
import { ColumnVisibilitySelector } from "@/components/column-visibility-selector";

// Mocked auth store (replace with your actual auth logic)
const useAuthStore = () => ({
  role: "superadmin", // "school" or "branch"
  schoolId: "68788528f8911140870e7a32",
  branchId: "6878ced3cf6cab94db74b243",
});

interface PickupDrop {
  _id: string;
  serialNo?: number;
  studentName: string;
  contact: string;
  pickupDateTime: string;
  pickupAddress: string;
  dropDateTime: string;
  dropAddress: string;
  status: "present" | "pending" | "absent";
  schoolName?: string;
  branchName?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Utility function to format date and time
const formatDateTime = (dateString: string): string => {
  if (!dateString || dateString === "-") return "-";
  
  try {
    const date = new Date(dateString);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) return "-";
    
    // Format as: DD/MM/YYYY, HH:MM AM/PM
    const formattedDate = date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    
    const formattedTime = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    
    return `${formattedDate}, ${formattedTime}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return "-";
  }
};

// Alternative formatting function for a more compact display
const formatDateTimeCompact = (dateString: string): string => {
  if (!dateString || dateString === "-") return "-";
  
  try {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) return "-";
    
    // Format as: DD-MMM-YYYY HH:MM
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).replace(',', '');
  } catch (error) {
    console.error('Error formatting date:', error);
    return "-";
  }
};

const usePickupDropData = ({
  pagination,
  sorting,
  studentName,
  role,
  schoolId,
  branchId,
}: any) => {
  return useQuery({
    queryKey: ["pickup-drop-data", pagination, sorting, studentName, role, schoolId, branchId],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: (pagination.pageIndex + 1).toString(),
        limit: pagination.pageSize.toString(),
        ...(studentName && { studentName }),
      });

      if (sorting.length > 0) {
        params.append("sortBy", sorting[0].id);
        params.append("sortOrder", sorting[0].desc ? "desc" : "asc");
      }

      if (role === "school" && schoolId) {
        params.append("schoolId", schoolId);
      } else if (role === "branch" && branchId) {
        params.append("branchId", branchId);
      }

      const response = await api.get(`pickup-drop?${params}`);

      return {
        pickupDropData: (response.results || []).map((item: any, index: number) => ({
          _id: item._id,
          serialNo: index + 1 + pagination.pageIndex * pagination.pageSize,
          studentName: item.childId?.childName || "-",
          contact: "-", // replace with actual contact
          pickupDateTime: formatDateTime(item.pickupTime), // Format pickup time
          pickupAddress: "-", // replace with actual address
          dropDateTime: formatDateTime(item.dropTime), // Format drop time
          dropAddress: "-", // replace with actual address
          status: item.pickup ? "present" : item.drop ? "pending" : "absent",
          schoolName: item.schoolId?.schoolName || "-",
          branchName: item.branchId?.branchName || "-",
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        })),
        total: response.total || 0,
        totalPages: response.totalPages || 0,
      };
    },
    keepPreviousData: true,
  });
};

export default function PickupDropMaster() {
  const { role, schoolId, branchId } = useAuthStore();
  const [filteredData, setFilteredData] = useState<PickupDrop[]>([]);
  const [filterResults, setFilterResults] = useState<PickupDrop[]>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState([]);
  const [debouncedName, setDebouncedName] = useState("");

  const { exportToPDF, exportToExcel } = useExport();

  const { data: pickupDropResponse, isLoading, isFetching } = usePickupDropData({
    pagination,
    sorting,
    studentName: debouncedName,
    role,
    schoolId,
    branchId,
  });

  const pickupDropData = pickupDropResponse?.pickupDropData || [];

  useEffect(() => {
    const handler = setTimeout(() => {
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }, 500);
    return () => clearTimeout(handler);
  }, [debouncedName]);

  useEffect(() => {
    if (pickupDropData?.length > 0) {
      setFilteredData(pickupDropData);
      setFilterResults(pickupDropData);
    }
  }, [pickupDropData]);

  const getStatusColor = (status: string) => {
    const colors = {
      present: "bg-green-100 text-green-800",
      pending: "bg-yellow-100 text-yellow-800",
      absent: "bg-red-100 text-red-800",
    };
    return colors[status.toLowerCase() as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const AddressCell = ({ address }: { address: string }) => (
    <span>{address || "-"}</span>
  );

  // Custom cell component for date-time display
  const DateTimeCell = ({ dateTime }: { dateTime: string }) => (
    <span className="text-sm" title={dateTime}>
      {dateTime}
    </span>
  );

  const columns: ColumnDef<PickupDrop>[] = [
    { id: "studentName", header: "Student Name", accessorKey: "studentName", enableHiding: true, enableSorting: true },
    ...(role === "superadmin" || role === "school"
      ? [
          {
            id: "schoolName",
            header: "School",
            accessorKey: "schoolName",
            enableHiding: true,
            enableSorting: true,
          },
        ]
      : []),
    ...(role === "superadmin" || role === "school" || role === "branch"
      ? [
          {
            id: "branchName",
            header: "Branch",
            accessorKey: "branchName",
            enableHiding: true,
            enableSorting: true,
          },
        ]
      : []),
    { id: "contact", header: "Contact", accessorKey: "contact", enableHiding: true, enableSorting: true },
    { 
      id: "pickupDateTime", 
      header: "Pickup Date & Time", 
      cell: ({ row }) => <DateTimeCell dateTime={row.original.pickupDateTime} />,
      accessorKey: "pickupDateTime", 
      enableHiding: true, 
      enableSorting: true 
    },
    {
      id: "pickupAddress",
      header: "Pickup Address",
      cell: ({ row }) => <AddressCell address={row.original.pickupAddress} />,
      accessorKey: "pickupAddress",
      enableHiding: true,
      enableSorting: true,
    },
    { 
      id: "dropDateTime", 
      header: "Drop Date & Time", 
      cell: ({ row }) => <DateTimeCell dateTime={row.original.dropDateTime} />,
      accessorKey: "dropDateTime", 
      enableHiding: true, 
      enableSorting: true 
    },
    {
      id: "dropAddress",
      header: "Drop Address",
      cell: ({ row }) => <AddressCell address={row.original.dropAddress} />,
      accessorKey: "dropAddress",
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(row.original.status)}`}>
          {row.original.status}
        </span>
      ),
      accessorKey: "status",
      enableHiding: true,
      enableSorting: true,
    },
  ];

  const exportData = filteredData.map((item) => ({
    serialNo: item.serialNo || "",
    studentName: item.studentName,
    contact: item.contact,
    pickupDateTime: item.pickupDateTime || "-",
    pickupAddress: item.pickupAddress || "-",
    dropDateTime: item.dropDateTime || "-",
    dropAddress: item.dropAddress || "-",
    status: item.status,
    ...(role === "superadmin" || role === "school" ? { schoolName: item.schoolName } : {}),
    ...(role !== "student" ? { branchName: item.branchName } : {}),
  }));

  const columnsForExport = [
    { key: "serialNo", header: "S.No." },
    { key: "studentName", header: "Student Name" },
    ...(role === "superadmin" || role === "school" ? [{ key: "schoolName", header: "School" }] : []),
    ...(role !== "student" ? [{ key: "branchName", header: "Branch" }] : []),
    { key: "contact", header: "Contact" },
    { key: "pickupDateTime", header: "Pickup Date & Time" },
    { key: "pickupAddress", header: "Pickup Address" },
    { key: "dropDateTime", header: "Drop Date & Time" },
    { key: "dropAddress", header: "Drop Address" },
    { key: "status", header: "Status" },
  ];

  const handleSearchResults = useCallback((results: PickupDrop[]) => {
    setFilteredData(results);
  }, []);

  const handleDateFilter = useCallback((start: Date | null, end: Date | null) => {
    setFilteredData(pickupDropData || []);
  }, [pickupDropData]);

  const { table, tableElement } = CustomTableServerSidePagination({
    data: pickupDropResponse?.pickupDropData || [],
    columns,
    pagination,
    totalCount: pickupDropResponse?.total || 0,
    loading: isLoading || isFetching,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    sorting,
    columnVisibility,
    onColumnVisibilityChange: setColumnVisibility,
    emptyMessage: "No pickup & drop records found",
    pageSizeOptions: [5, 10, 20, 30, 50],
    enableSorting: true,
    showSerialNumber: true,
  });

  return (
    <main>
      <ResponseLoader isLoading={isLoading} />

      <header className="flex items-center justify-between mb-4">
        <section className="flex space-x-4">
          <SearchComponent
            data={filterResults}
            displayKey={["studentName", "contact", "status"]}
            onResults={handleSearchResults}
            className="w-[300px] mb-4"
          />
          <DateRangeFilter onDateRangeChange={handleDateFilter} title="Search by Date" />
          <ColumnVisibilitySelector
            columns={table.getAllColumns()}
            buttonVariant="outline"
            buttonSize="default"
          />
        </section>
      </header>

      <section className="mb-4">{tableElement}</section>

      <FloatingMenu
        onExportPdf={() =>
          exportToPDF(exportData, columnsForExport, {
            title: "Pickup & Drop Records Report",
            companyName: "Parents Eye",
            metadata: { Total: `${exportData.length} records` },
          })
        }
        onExportExcel={() =>
          exportToExcel(exportData, columnsForExport, {
            title: "Pickup & Drop Records Report",
            companyName: "Parents Eye",
            metadata: { Total: `${exportData.length} records` },
          })
        }
      />
    </main>
  );
}