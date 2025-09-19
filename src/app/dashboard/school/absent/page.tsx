"use client";

import React, { useCallback, useEffect, useState, useRef } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";
import { DynamicEditDialog, FieldConfig } from "@/components/ui/EditModal";
import SearchComponent from "@/components/ui/SearchOnlydata";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { formatDate } from "@/util/formatDate";
import { Alert } from "@/components/Alert";
import ResponseLoader from "@/components/ResponseLoader";
import { ColumnVisibilitySelector } from "@/components/column-visibility-selector";

// Define the Absent interface based on the fields shown in the image
interface Absent {
  _id: string;
  serialNo?: number;
  childName: string;
  className: string;
  rollNo: string;
  section: string;
  pickupPoint: string;
  deviceName: string;
  pickupTime: string;
  schoolName: string;
  branchName: string;
  date: string;
  createdAt?: string;
  updatedAt?: string;
}

declare module "@tanstack/react-table" {
  export interface ColumnMeta<TData, TValue> {
    flex?: number;
    minWidth?: number;
    maxWidth?: number;
  }
}

// Custom hook for fetching absent data (similar to useLeaveRequests)
const useAbsentData = ({ pagination, sorting, childName }: any) => {
  return useQuery({
    queryKey: ["absent-data", pagination, sorting, childName],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: (pagination.pageIndex + 1).toString(),
        limit: pagination.pageSize.toString(),
        ...(childName && { childName }),
      });

      if (sorting.length > 0) {
        params.append('sortBy', sorting[0].id);
        params.append('sortOrder', sorting[0].desc ? 'desc' : 'asc');
      }

      const response = await api.get(`/absent-data?${params}`);
      return {
        absentData: response.absentData || [],
        total: response.total || 0,
        totalPages: response.totalPages || 0,
      };
    },
    keepPreviousData: true,
  });
};

export default function AbsentMaster() {
  const queryClient = useQueryClient();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [filteredData, setFilteredData] = useState<Absent[]>([]);
  const [filterResults, setFilterResults] = useState<Absent[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Absent | null>(null);
  const [editTarget, setEditTarget] = useState<Absent | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  
  // Server-side pagination states
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState([]);
  const [debouncedName, setDebouncedName] = useState("");
  
  const { exportToPDF, exportToExcel } = useExport();

  // Fetch absent data using the custom hook
  const {
    data: absentResponse,
    isLoading,
    error,
    isError,
    isFetching,
  } = useAbsentData({
    pagination,
    sorting,
    childName: debouncedName,
  });

  console.log("absentResponse", absentResponse);

  // Extract the actual absent data array from the response
  const absentData = absentResponse?.absentData || [];

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedName(debouncedName);
      setPagination((prev) => ({ ...prev, pageIndex: 0 })); // Reset to page 1 on search
    }, 500); // 500ms debounce delay

    return () => clearTimeout(handler);
  }, [debouncedName]);

  useEffect(() => {
    if (absentData && absentData.length > 0) {
      setFilteredData(absentData);
      setFilterResults(absentData); // For search base
    }
  }, [absentData]);

  // Helper function to get pickup time color based on time
  const getPickupTimeColor = (time: string) => {
    const hour = parseInt(time.split(':')[0]);
    if (hour < 8) {
      return "bg-green-100 text-green-800"; // Early
    } else if (hour < 10) {
      return "bg-yellow-100 text-yellow-800"; // On time
    } else {
      return "bg-red-100 text-red-800"; // Late
    }
  };

  // Helper function to get section color
  const getSectionColor = (section: string) => {
    const colors = [
      "bg-blue-100 text-blue-800",
      "bg-purple-100 text-purple-800",
      "bg-green-100 text-green-800",
      "bg-orange-100 text-orange-800",
      "bg-pink-100 text-pink-800",
    ];
    const index = section.charCodeAt(0) % colors.length;
    return colors[index];
  };

  // Define the columns for the table
  const columns: ColumnDef<Absent>[] = [
    {
      id: "childName",
      header: "Child Name",
      accessorKey: "childName",
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "className",
      header: "Class",
      accessorKey: "className",
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "rollNo",
      header: "Roll No.",
      accessorKey: "rollNo",
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "section",
      header: "Section",
      cell: ({ row }) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${getSectionColor(
            row.original.section
          )}`}
        >
          {row.original.section}
        </span>
      ),
      accessorKey: "section",
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "pickupPoint",
      header: "Pickup Point",
      cell: ({ row }) => {
        const fullPoint = row.original.pickupPoint;
        const preview =
          fullPoint.length > 15
            ? fullPoint.substring(0, 15) + "..."
            : fullPoint;

        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-pointer">
                  {preview}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>{fullPoint}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
      accessorKey: "pickupPoint",
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "deviceName",
      header: "Device Name",
      accessorKey: "deviceName",
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "pickupTime",
      header: "Pickup Time",
      cell: ({ row }) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${getPickupTimeColor(
            row.original.pickupTime
          )}`}
        >
          {row.original.pickupTime}
        </span>
      ),
      accessorKey: "pickupTime",
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "schoolName",
      header: "School Name",
      cell: ({ row }) => {
        const fullName = row.original.schoolName;
        const preview =
          fullName.length > 12
            ? fullName.substring(0, 12) + "..."
            : fullName;

        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-pointer">
                  {preview}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>{fullName}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
      accessorKey: "schoolName",
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "branchName",
      header: "Branch Name",
      accessorKey: "branchName",
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "date",
      header: "Date",
      accessorFn: (row) => formatDate(row.date) ?? "",
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditTarget(row.original);
              setEditDialogOpen(true);
            }}
            className="cursor-pointer"
            disabled={updateAbsentMutation.isPending}
          >
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteTarget(row.original)}
            className="cursor-pointer"
            disabled={deleteAbsentMutation.isPending}
          >
            Delete
          </Button>
        </div>
      ),
      enableSorting: false,
      enableHiding: true,
    },
  ];

  const exportData = filteredData.map((item) => ({
    serialNo: item.serialNo || "",
    childName: item.childName,
    className: item.className,
    rollNo: item.rollNo,
    section: item.section,
    pickupPoint: item.pickupPoint,
    deviceName: item.deviceName,
    pickupTime: item.pickupTime,
    schoolName: item.schoolName,
    branchName: item.branchName,
    date: formatDate(item.date) ?? "",
  }));

  // columns for export
  const columnsForExport = [
    { key: "serialNo", header: "S.No." },
    { key: "childName", header: "Child Name" },
    { key: "className", header: "Class" },
    { key: "rollNo", header: "Roll No." },
    { key: "section", header: "Section" },
    { key: "pickupPoint", header: "Pickup Point" },
    { key: "deviceName", header: "Device Name" },
    { key: "pickupTime", header: "Pickup Time" },
    { key: "schoolName", header: "School Name" },
    { key: "branchName", header: "Branch Name" },
    { key: "date", header: "Date" },
  ];

  // Define the fields for the edit dialog
  const absentFieldConfigs: FieldConfig[] = [
    {
      label: "Child Name",
      key: "childName",
      type: "text",
      required: true,
    },
    {
      label: "Class",
      key: "className",
      type: "text",
      required: true,
    },
    {
      label: "Roll Number",
      key: "rollNo",
      type: "text",
      required: true,
    },
    {
      label: "Section",
      key: "section",
      type: "text",
      required: true,
    },
    {
      label: "Pickup Point",
      key: "pickupPoint",
      type: "text",
      required: true,
    },
    {
      label: "Device Name",
      key: "deviceName",
      type: "text",
      required: true,
    },
    {
      label: "Pickup Time",
      key: "pickupTime",
      type: "time",
      required: true,
    },
    {
      label: "School Name",
      key: "schoolName",
      type: "text",
      required: true,
    },
    {
      label: "Branch Name",
      key: "branchName",
      type: "text",
      required: true,
    },
    {
      label: "Date",
      key: "date",
      type: "date",
      required: true,
    },
  ];

  // Mutation to add a new absent record
  const addAbsentMutation = useMutation({
    mutationFn: async (newAbsent: any) => {
      const absent = await api.post("/absent-data", newAbsent);
      return absent.absentData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["absent-data"] });
      alert("Absent record added successfully.");
    },
    onError: (err) => {
      alert("Failed to add absent record.\nerror: " + err);
    },
  });

  // Mutation for edit absent data
  const updateAbsentMutation = useMutation({
    mutationFn: async ({
      absentId,
      data,
    }: {
      absentId: string;
      data: Partial<Absent>;
    }) => {
      return await api.put(`/absent-data/${absentId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["absent-data"] });
      setEditDialogOpen(false);
      setEditTarget(null);
      alert("Absent record updated successfully.");
    },
    onError: (err) => {
      alert("Failed to update absent record.\nerror: " + err);
    },
  });

  // Mutation to delete an absent record
  const deleteAbsentMutation = useMutation({
    mutationFn: async (absentId: string) => {
      return await api.delete(`/absent-data/${absentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["absent-data"] });
      alert("Absent record deleted successfully.");
    },
    onError: (err) => {
      alert("Failed to delete absent record.\nerror: " + err);
    },
  });

  // Handle search
  const handleSearchResults = useCallback((results: Absent[]) => {
    setFilteredData(results);
  }, []);

  // Handle save action for edit absent record
  const handleSave = (updatedData: Partial<Absent>) => {
    if (!editTarget) return;

    const changedFields: Partial<Record<keyof Absent, unknown>> = {};

    for (const key in updatedData) {
      const newValue = updatedData[key as keyof Absent];
      const oldValue = editTarget[key as keyof Absent];

      if (newValue !== undefined && newValue !== oldValue) {
        changedFields[key as keyof Absent] = newValue;
      }
    }

    if (Object.keys(changedFields).length === 0) {
      console.log("No changes detected.");
      return;
    }

    updateAbsentMutation.mutate({
      absentId: editTarget._id,
      data: changedFields,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    
    const data = {
      childName: form.childName.value,
      className: form.className.value,
      rollNo: form.rollNo.value,
      section: form.section.value,
      pickupPoint: form.pickupPoint.value,
      deviceName: form.deviceName.value,
      pickupTime: form.pickupTime.value,
      schoolName: form.schoolName.value,
      branchName: form.branchName.value,
      date: form.date.value,
    };

    try {
      await addAbsentMutation.mutateAsync(data);
      closeButtonRef.current?.click();
      form.reset();
    } catch (err) {
      console.error("Failed to add absent record:", err);
    }
  };

  const handleDateFilter = useCallback(
    (start: Date | null, end: Date | null) => {
      if (!absentData || (!start && !end)) {
        setFilteredData(absentData || []);
        return;
      }

      const filtered = absentData.filter((record) => {
        if (!record.date) return false;

        const recordDate = new Date(record.date);
        return (!start || recordDate >= start) && (!end || recordDate <= end);
      });

      setFilteredData(filtered);
    },
    [absentData]
  );

  // Server-side pagination table instance
  const { table, tableElement } = CustomTableServerSidePagination({
    data: absentResponse?.absentData || [],
    columns,
    pagination,
    totalCount: absentResponse?.total || 0,
    loading: isLoading || isFetching,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    sorting,
    columnVisibility,
    onColumnVisibilityChange: setColumnVisibility,
    emptyMessage: "No absent records found",
    pageSizeOptions: [5, 10, 20, 30, 50],
    enableSorting: true,
    showSerialNumber: true,
  });

  return (
    <main>
      {/* Progress loader at the top */}
      <ResponseLoader isLoading={isLoading} />

      <header className="flex items-center justify-between mb-4">
        <section className="flex space-x-4">
          {/* Search component */}
          <SearchComponent
            data={filterResults}
            displayKey={["childName", "className", "rollNo", "section", "schoolName"]}
            onResults={handleSearchResults}
            className="w-[300px] mb-4"
          />
          {/* Date range picker */}
          <DateRangeFilter
            onDateRangeChange={handleDateFilter}
            title="Search by Date"
          />
          {/* Column visibility selector */}
          <ColumnVisibilitySelector
            columns={table.getAllColumns()}
            buttonVariant="outline"
            buttonSize="default"
          />
        </section>

        
      </header>

      {/* Table component with server-side pagination */}
      <section className="mb-4">
        {tableElement}
      </section>

      {/* Alert Boxes */}
      <section>
        <div>
          {deleteTarget && (
            <Alert<Absent>
              title="Are you absolutely sure?"
              description={`This will permanently delete the absent record for ${deleteTarget?.childName} and all associated data.`}
              actionButton={(target) => {
                deleteAbsentMutation.mutate(target._id);
                setDeleteTarget(null);
              }}
              target={deleteTarget}
              setTarget={setDeleteTarget}
              butttonText="Delete"
            />
          )}
        </div>
      </section>

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
            fields={absentFieldConfigs}
            title="Edit Absent Record"
            description="Update the absent record information below. Fields marked with * are required."
            avatarConfig={{
              imageKey: "",
              nameKeys: ["childName", "className"],
            }}
          />
        )}
      </section>

      {/* Floating Menu */}
      <section>
        <FloatingMenu
          onExportPdf={() => {
            exportToPDF(exportData, columnsForExport, {
              title: "Absent Records Report",
              companyName: "Parents Eye",
              metadata: {
                Total: `${exportData.length} records`,
              },
            });
          }}
          onExportExcel={() => {
            exportToExcel(exportData, columnsForExport, {
              title: "Absent Records Report",
              companyName: "Parents Eye",
              metadata: {
                Total: `${exportData.length} records`,
              },
            });
          }}
        />
      </section>
    </main>
  );
}
