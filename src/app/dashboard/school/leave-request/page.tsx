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
import { useLeaveRequests } from "@/hooks/useLeaveRequests";
import { LeaveRequest } from "@/interface/modal";

declare module "@tanstack/react-table" {
  export interface ColumnMeta<TData, TValue> {
    flex?: number;
    minWidth?: number;
    maxWidth?: number;
  }
}

export default function LeaveRequestMaster() {
  const queryClient = useQueryClient();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [filteredData, setFilteredData] = useState<LeaveRequest[]>([]);
  const [filterResults, setFilterResults] = useState<LeaveRequest[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<LeaveRequest | null>(null);
  const [editTarget, setEditTarget] = useState<LeaveRequest | null>(null);
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

  // Fetch leave request data using the hook with server-side pagination
  const {
    data: leaveRequestData,
    isLoading,
    error,
    isError,
    isFetching,
  } = useLeaveRequests({
    pagination,
    sorting,
    reason: debouncedName,
  });

  console.log("leaveRequestData", leaveRequestData)

  // Extract the actual leave requests array from the response
  const leaveRequests = leaveRequestData?.leaveRequests || [];

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedName(debouncedName);
      setPagination((prev) => ({ ...prev, pageIndex: 0 })); // Reset to page 1 on search
    }, 500); // 500ms debounce delay

    return () => clearTimeout(handler);
  }, [debouncedName]);

  useEffect(() => {
    if (leaveRequests && leaveRequests.length > 0) {
      setFilteredData(leaveRequests);
      setFilterResults(leaveRequests); // For search base
    }
  }, [leaveRequests]);

  // Helper function to get status badge color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Helper function to get leave type color
  const getLeaveTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "sick":
        return "bg-red-100 text-red-800";
      case "personal":
        return "bg-blue-100 text-blue-800";
      case "emergency":
        return "bg-orange-100 text-orange-800";
      case "vacation":
        return "bg-purple-100 text-purple-800";
      case "other":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Define the columns for the table (updated for server-side pagination)
  const columns: ColumnDef<LeaveRequest>[] = [
    {
      id: "studentName",
      header: "Student Name",
      accessorFn: (row) => row.childId?.childName ?? "",
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "class",
      header: "Class",
      accessorFn: (row) => row.childId?.className ?? "",
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "section",
      header: "Section",
      accessorFn: (row) => row.childId?.section ?? "",
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "rollNumber",
      header: "Roll No.",
      accessorFn: (row) => row.childId?.rollNumber ?? "",
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "parentName",
      header: "Parent Name",
      accessorFn: (row) => row.parentId?.parentName ?? "",
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "reason",
      header: "Reason",
      cell: ({ row }) => {
        const fullReason = row.original.reason ?? "";
        const preview =
          fullReason.length > 8
            ? fullReason.substring(0, 8) + "..."
            : fullReason;

        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium cursor-pointer ${getLeaveTypeColor(
                    row.original.reason ?? ""
                  )}`}
                >
                  {preview}
                </span>
              </TooltipTrigger>
              <TooltipContent side="front">
                <p>{fullReason}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "startDate",
      header: "From Date",
      accessorFn: (row) => formatDate(row.startDate) ?? "",
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "endDate",
      header: "To Date",
      accessorFn: (row) => formatDate(row.endDate) ?? "",
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        if ((row.original.status ?? "").toLowerCase() === "pending") {
          return (
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant="outline"
                className="bg-green-100 text-green-700 hover:bg-green-200"
                disabled={updateLeaveRequestMutation.isPending}
                onClick={() =>
                  updateLeaveRequestMutation.mutate({
                    leaveRequestId: row.original._id,
                    data: { status: "Approved" },
                  })
                }
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="bg-red-100 text-red-700 hover:bg-red-200"
                disabled={updateLeaveRequestMutation.isPending}
                onClick={() =>
                  updateLeaveRequestMutation.mutate({
                    leaveRequestId: row.original._id,
                    data: { status: "Rejected" },
                  })
                }
              >
                Reject
              </Button>
            </div>
          );
        }

        // For non-pending statuses, show badge
        return (
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
              row.original.status ?? ""
            )}`}
          >
            {row.original.status?.charAt(0).toUpperCase() + row.original.status?.slice(1)}
          </span>
        );
      },
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "createdAt",
      header: "Request Date",
      accessorFn: (row) => formatDate(row.createdAt) ?? "",
      enableHiding: true,
      enableSorting: true,
    },
    // {
    //   id: "actions",
    //   header: "Actions",
    //   cell: ({ row }) => (
    //     <div className="flex items-center justify-center gap-2">
    //       <Button
    //         variant="outline"
    //         size="sm"
    //         onClick={() => {
    //           setEditTarget(row.original);
    //           setEditDialogOpen(true);
    //         }}
    //         className="cursor-pointer"
    //         disabled={updateLeaveRequestMutation.isPending}
    //       >
    //         Edit
    //       </Button>
    //       <Button
    //         variant="destructive"
    //         size="sm"
    //         onClick={() => setDeleteTarget(row.original)}
    //         className="cursor-pointer"
    //         disabled={deleteLeaveRequestMutation.isPending}
    //       >
    //         Delete
    //       </Button>
    //     </div>
    //   ),
    //   enableSorting: false,
    //   enableHiding: true,
    // },
  ];

  const exportData = filteredData.map((item) => ({
  studentName: item.childId?.childName ?? "",
  studentClass: item.childId?.className ?? "",
  studentRollNumber: item.childId?.rollNumber ?? "",
  parentName: item.parentId?.parentName ?? "",
  leaveReason: item.reason ?? "",
  fromDate: formatDate(item.startDate) ?? "",
  toDate: formatDate(item.endDate) ?? "",
  totalDays: item.startDate && item.endDate 
    ? Math.ceil((new Date(item.endDate).getTime() - new Date(item.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1 
    : "",
  status: item.status ?? "",
  createdAt: formatDate(item.createdAt) ?? "",
  }));

  // columns for export
  const columnsForExport = [
    { key: "studentName", header: "Student Name" },
    { key: "studentClass", header: "Class" },
    { key: "studentRollNumber", header: "Roll Number" },
    { key: "parentName", header: "Parent Name" },
    { key: "leaveReason", header: "Leave Reason" },
    { key: "fromDate", header: "From Date" },
    { key: "toDate", header: "To Date" },
    { key: "status", header: "Status" },
    { key: "createdAt", header: "Request Date" },
  ];

  // Define the fields for the edit dialog
  const leaveRequestFieldConfigs: FieldConfig[] = [
    {
      label: "Student Name",
      key: "studentName",
      type: "text",
      required: true,
    },
    {
      label: "Student Class",
      key: "studentClass",
      type: "text",
      required: true,
    },
    {
      label: "Roll Number",
      key: "studentRollNumber",
      type: "text",
      required: true,
    },
    {
      label: "Parent Name",
      key: "parentName",
      type: "text",
      required: true,
    },
    {
      label: "Leave Reason",
      key: "leaveReason",
      type: "textarea",
      required: true,
    },
    {
      label: "From Date",
      key: "fromDate",
      type: "date",
      required: true,
    },
    {
      label: "To Date",
      key: "toDate",
      type: "date",
      required: true,
    },
    {
      label: "Status",
      key: "status",
      type: "select",
      options: [
        { value: "pending", label: "Pending" },
        { value: "approved", label: "Approved" },
        { value: "rejected", label: "Rejected" },
      ],
      required: true,
    },
    {
      label: "Rejection Reason (if rejected)",
      key: "rejectionReason",
      type: "textarea",
      required: false,
    },
  ];

  // Mutation to add a new leave request
  const addLeaveRequestMutation = useMutation({
    mutationFn: async (newLeaveRequest: any) => {
      const leaveRequest = await api.post("/leave-request", newLeaveRequest);
      return leaveRequest.leaveRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      alert("Leave request added successfully.");
    },
    onError: (err) => {
      alert("Failed to add leave request.\nerror: " + err);
    },
  });

  // Mutation for edit leave request data
  const updateLeaveRequestMutation = useMutation({
    mutationFn: async ({
      leaveRequestId,
      data,
    }: {
      leaveRequestId: string;
      data: Partial<LeaveRequest>;
    }) => {
      // return await api.put(`/leave-request/${leaveRequestId}`, data);
      alert ("Api is not Created");
    },
    // onSuccess: () => {
    //   queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
    //   setEditDialogOpen(false);
    //   setEditTarget(null);
    //   alert("Leave request updated successfully.");
    // },
    // onError: (err) => {
    //   alert("Failed to update leave request.\nerror: " + err);
    // },
  });

  // Mutation to delete a leave request
  const deleteLeaveRequestMutation = useMutation({
    mutationFn: async (leaveRequestId: string) => {
      return await api.delete(`/leave-request/${leaveRequestId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      alert("Leave request deleted successfully.");
    },
    onError: (err) => {
      alert("Failed to delete leave request.\nerror: " + err);
    },
  });

  // Handle search
  const handleSearchResults = useCallback((results: LeaveRequest[]) => {
    setFilteredData(results);
  }, []);

  // Handle save action for edit leave request
  const handleSave = (updatedData: Partial<LeaveRequest>) => {
    if (!editTarget) return;

    const changedFields: Partial<Record<keyof LeaveRequest, unknown>> = {};

    for (const key in updatedData) {
      const newValue = updatedData[key as keyof LeaveRequest];
      const oldValue = editTarget[key as keyof LeaveRequest];

      if (newValue !== undefined && newValue !== oldValue) {
        changedFields[key as keyof LeaveRequest] = newValue;
      }
    }

    if (Object.keys(changedFields).length === 0) {
      console.log("No changes detected.");
      return;
    }

    updateLeaveRequestMutation.mutate({
      leaveRequestId: editTarget._id,
      data: changedFields,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    
    const fromDate = form.fromDate.value;
    const toDate = form.toDate.value;
    
    const data = {
      studentName: form.studentName.value,
      studentClass: form.studentClass.value,
      studentRollNumber: form.studentRollNumber.value,
      parentName: form.parentName.value,
      parentMobile: form.parentMobile.value,
      leaveType: form.leaveType.value,
      leaveReason: form.leaveReason.value,
      fromDate: fromDate,
      toDate: toDate,
      status: "pending", // Default status
    };

    try {
      await addLeaveRequestMutation.mutateAsync(data);
      closeButtonRef.current?.click();
      form.reset();
    } catch (err) {
      console.error("Failed to add leave request:", err);
    }
  };

  const handleDateFilter = useCallback(
    (start: Date | null, end: Date | null) => {
      if (!leaveRequests || (!start && !end)) {
        setFilteredData(leaveRequests || []);
        return;
      }

      const filtered = leaveRequests.filter((request) => {
        if (!request.createdAt) return false;

        const createdDate = new Date(request.createdAt);
        return (!start || createdDate >= start) && (!end || createdDate <= end);
      });

      setFilteredData(filtered);
    },
    [leaveRequests]
  );

  // Server-side pagination table instance
  const { table, tableElement } = CustomTableServerSidePagination({
    data: leaveRequestData?.leaveRequests || [],
    columns,
    pagination,
    totalCount: leaveRequestData?.total || 0,
    loading: isLoading || isFetching,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    sorting,
    columnVisibility,
    onColumnVisibilityChange: setColumnVisibility,
    emptyMessage: "No leave requests found",
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
            displayKey={["studentName", "parentName", "studentClass", "parentMobile"]}
            onResults={handleSearchResults}
            className="w-[300px] mb-4"
          />
          {/* Date range picker */}
          <DateRangeFilter
            onDateRangeChange={handleDateFilter}
            title="Search by Request Date"
          />
          {/* Column visibility selector */}
          <ColumnVisibilitySelector
            columns={table.getAllColumns()}
            buttonVariant="outline"
            buttonSize="default"
          />
        </section>

        {/* Add Leave Request */}
        {/* <section>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="default">Add Leave Request</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
              <form onSubmit={handleSubmit} className="space-y-4">
                <DialogHeader>
                  <DialogTitle>Add Leave Request</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="studentName">Student Name</Label>
                    <Input
                      id="studentName"
                      name="studentName"
                      placeholder="Enter student name"
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="studentClass">Student Class</Label>
                    <Input
                      id="studentClass"
                      name="studentClass"
                      placeholder="Enter class (e.g., 10th A)"
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="studentRollNumber">Roll Number</Label>
                    <Input
                      id="studentRollNumber"
                      name="studentRollNumber"
                      placeholder="Enter roll number"
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="parentName">Parent Name</Label>
                    <Input
                      id="parentName"
                      name="parentName"
                      placeholder="Enter parent name"
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="parentMobile">Parent Mobile</Label>
                    <Input
                      id="parentMobile"
                      name="parentMobile"
                      type="tel"
                      placeholder="Enter parent mobile number"
                      pattern="[0-9]{10}"
                      maxLength={10}
                      autoComplete="tel"
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="leaveType">Leave Type</Label>
                    <Select name="leaveType" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select leave type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sick">Sick Leave</SelectItem>
                        <SelectItem value="personal">Personal</SelectItem>
                        <SelectItem value="emergency">Emergency</SelectItem>
                        <SelectItem value="vacation">Vacation</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="fromDate">From Date</Label>
                    <Input
                      id="fromDate"
                      name="fromDate"
                      type="date"
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="toDate">To Date</Label>
                    <Input
                      id="toDate"
                      name="toDate"
                      type="date"
                      required
                    />
                  </div>

                  <div className="grid gap-2 md:col-span-2">
                    <Label htmlFor="leaveReason">Leave Reason</Label>
                    <textarea
                      id="leaveReason"
                      name="leaveReason"
                      placeholder="Enter reason for leave"
                      rows={3}
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      required
                    />
                  </div>
                </div>

                <DialogFooter>
                  <DialogClose asChild>
                    <Button ref={closeButtonRef} variant="outline">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button type="submit" disabled={addLeaveRequestMutation.isPending}>
                    {addLeaveRequestMutation.isPending ? "Saving..." : "Save Request"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </section> */}
      </header>

      {/* Table component with server-side pagination */}
      <section className="mb-4">
        {tableElement}
      </section>

      {/* Alert Boxes */}
      <section>
        <div>
          {deleteTarget && (
            <Alert<LeaveRequest>
              title="Are you absolutely sure?"
              description={`This will permanently delete the leave request for ${deleteTarget?.childId?.childName} and all associated data.`}
              actionButton={(target) => {
                deleteLeaveRequestMutation.mutate(target._id);
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
      {/* <section>
        {editTarget && (
          <DynamicEditDialog
            data={editTarget}
            isOpen={editDialogOpen}
            onClose={() => {
              setEditDialogOpen(false);
              setEditTarget(null);
            }}
            onSave={handleSave}
            fields={leaveRequestFieldConfigs}
            title="Edit Leave Request"
            description="Update the leave request information below. Fields marked with * are required."
            avatarConfig={{
              imageKey: "",
              nameKeys: ["studentName", "studentClass"],
            }}
          />
        )}
      </section> */}

      {/* Floating Menu */}
      <section>
       <FloatingMenu
        onExportPdf={() => {
        exportToPDF(exportData, columnsForExport, {
          title: "Leave Request Report",
          companyName: "Parents Eye",
          metadata: {
            Total: `${exportData.length} requests`,
          },
        });
      }}
      onExportExcel={() => {
      exportToExcel(exportData, columnsForExport, {
          title: "Leave Request Report",
          companyName: "Parents Eye",
          metadata: {
            Total: `${exportData.length} requests`,
          },
        });
      }}
    />
      </section>
    </main>
  );
}