"use client";

import React, { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import DateRangeFilter from "@/components/ui/DateRangeFilter";
import { FloatingMenu } from "@/components/floatingMenu";
import {
  VisibilityState,
  type ColumnDef,
} from "@tanstack/react-table";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/apiService";
import { useExport } from "@/hooks/useExport";
import { formatDate } from "@/util/formatDate";
import { Alert } from "@/components/Alert";
import ResponseLoader from "@/components/ResponseLoader";
import { ColumnVisibilitySelector } from "@/components/column-visibility-selector";
import { useLeaveRequests } from "@/hooks/useLeaveRequests";
import { LeaveRequest } from "@/interface/modal";
import SearchComponent from "@/components/ui/SearchOnlydata";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";

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
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(
    {}
  );

  // Server-side pagination states
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<any[]>([]);
  const [searchValue, setSearchValue] = useState("");

  const { exportToPDF, exportToExcel } = useExport();

  // Fetch leave request data
  const {
    data: leaveRequestData,
    isLoading,
    error,
    isError,
    isFetching,
  } = useLeaveRequests({
    pagination,
    sorting,
    reason: searchValue,
  });

  const leaveRequests = leaveRequestData?.leaveRequests || [];

  useEffect(() => {
    if (leaveRequests && leaveRequests.length > 0) {
      setFilteredData(leaveRequests);
      setFilterResults(leaveRequests);
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

  // ✅ Fixed mutation: send capitalized status to backend
  const updateLeaveRequestMutation = useMutation({
    mutationFn: async ({
      leaveRequestId,
      status,
      startDate,
      endDate,
    }: {
      leaveRequestId: string;
      status: "Approved" | "Rejected";
      startDate: string;
      endDate: string;
    }) => {
      const payload = {
        status: status,
        startDate,
        endDate,
      };

      console.log("Sending updateLeaveRequest payload:", payload);

      return await api.put(
        `/leave-request/${leaveRequestId}`,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      alert("Leave request updated successfully.");
    },
    onError: (err: any) => {
      console.error("Update Leave Request Error:", err?.response?.data || err);
      const msg =
        err?.response?.data?.details ||
        err?.response?.data?.message ||
        err.message;
      alert("Failed to update leave request.\nError: " + msg);
    },
  });

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

  const columns: ColumnDef<LeaveRequest>[] = [
    {
      id: "studentName",
      header: "Student Name",
      accessorFn: (row) => row.childId?.childName ?? "",
    },
    {
      id: "class",
      header: "Class",
      accessorFn: (row) => row.childId?.className ?? "",
    },
    {
      id: "section",
      header: "Section",
      accessorFn: (row) => row.childId?.section ?? "",
    },
    {
      id: "parentName",
      header: "Parent Name",
      accessorFn: (row) => row.parentId?.parentName ?? "",
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
    },
    {
      id: "startDate",
      header: "From Date",
      accessorFn: (row) => formatDate(row.startDate) ?? "",
    },
    {
      id: "endDate",
      header: "To Date",
      accessorFn: (row) => formatDate(row.endDate) ?? "",
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
                    status: "Approved",
                    startDate: row.original.startDate,
                    endDate: row.original.endDate,
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
                    status: "Rejected",
                    startDate: row.original.startDate,
                    endDate: row.original.endDate,
                  })
                }
              >
                Reject
              </Button>
            </div>
          );
        }

        return (
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
              row.original.status ?? ""
            )}`}
          >
            {row.original.status
              ? row.original.status.charAt(0).toUpperCase() +
                row.original.status.slice(1).toLowerCase()
              : ""}
          </span>
        );
      },
    },
    {
      id: "createdAt",
      header: "Request Date",
      accessorFn: (row) => formatDate(row.createdAt) ?? "",
    },
  ];

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
      <ResponseLoader isLoading={isLoading} />

      <header className="flex items-center justify-between mb-4">
        <section className="flex space-x-4">
          <SearchComponent
            data={filterResults}
            displayKey={[
              "studentName",
              "parentName",
              "studentClass",
              "parentMobile",
            ]}
            onResults={(results) => setFilteredData(results)}
            className="w-[300px] mb-4"
          />
          <DateRangeFilter
            onDateRangeChange={(start, end) => {
              if (!leaveRequests || (!start && !end)) {
                setFilteredData(leaveRequests || []);
                return;
              }

              const filtered = leaveRequests.filter((request) => {
                if (!request.createdAt) return false;
                const createdDate = new Date(request.createdAt);
                return (
                  (!start || createdDate >= start) &&
                  (!end || createdDate <= end)
                );
              });

              setFilteredData(filtered);
            }}
            title="Search by Request Date"
          />
          <ColumnVisibilitySelector
            columns={table.getAllColumns()}
            buttonVariant="outline"
            buttonSize="default"
          />
        </section>
      </header>

      <section className="mb-4">{tableElement}</section>

      <section>
        {deleteTarget && (
          <Alert<LeaveRequest>
            title="Are you absolutely sure?"
            description={`This will permanently delete the leave request for ${deleteTarget?.childId?.childName} and all associated data.`}
            actionButton={(target) => {
              setDeleteTarget(null);
            }}
            target={deleteTarget}
            setTarget={setDeleteTarget}
            butttonText="Delete"
          />
        )}
      </section>

      <section>
        <FloatingMenu
          onExportPdf={() => {
            exportToPDF(filteredData, columns, {
              title: "Leave Request Report",
              companyName: "Parents Eye",
              metadata: {
                Total: `${filteredData.length} requests`,
              },
            });
          }}
          onExportExcel={() => {
            exportToExcel(filteredData, columns, {
              title: "Leave Request Report",
              companyName: "Parents Eye",
              metadata: {
                Total: `${filteredData.length} requests`,
              },
            });
          }}
        />
      </section>
    </main>
  );
}