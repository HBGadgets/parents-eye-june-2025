"use client";

import React, { useState, useEffect, useCallback } from "react";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";
import SearchComponent from "@/components/ui/SearchOnlydata";
import DateRangeFilter from "@/components/ui/DateRangeFilter";
import { ColumnVisibilitySelector } from "@/components/column-visibility-selector";
import { SearchableSelect } from "@/components/custom-select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/apiService";
import ResponseLoader from "@/components/ResponseLoader";
import { formatDate } from "@/util/formatDate";
import { FloatingMenu } from "@/components/floatingMenu";
import { useExport } from "@/hooks/useExport";
import { Button } from "@/components/ui/button";
import type { ColumnDef, VisibilityState } from "@tanstack/react-table";

interface Child {
  _id: string;
  childName: string;
  className: string;
  section: string;
  createdAt: string;
  isApproved?: "Pending" | "Approved" | "Rejected";
  parentId?: {
    parentName: string;
    username: string;
    password: string;
    mobileNo: string;
  };
  schoolId?: { schoolName: string };
  branchId?: { branchName: string };
}

export default function StudentApprove() {
  const queryClient = useQueryClient();
  const { exportToPDF, exportToExcel } = useExport();

  // --- States ---
  const [children, setChildren] = useState<Child[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [approvalFilter, setApprovalFilter] = useState<string>("");
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState<any[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });

  // --- Fetch Data (with server-side search & filters) ---
  const fetchChildren = useCallback(async () => {
    try {
      setIsLoading(true);
      const sort = sorting.map((s) => `${s.id}:${s.desc ? "desc" : "asc"}`).join(",");
      const params: Record<string, any> = {
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
      };

      if (searchValue) params.search = searchValue;
      if (approvalFilter) params.status = approvalFilter;
      if (dateRange.start) params.startDate = dateRange.start.toISOString();
      if (dateRange.end) params.endDate = dateRange.end.toISOString();
      if (sort) params.sort = sort;

      const res = await api.get<{ children: Child[]; total: number }>("/child", { params });
      setChildren(res.children || []);
      setTotalCount(res.total || 0);
    } catch (error) {
      console.error("Error fetching students:", error);
      setChildren([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [pagination, searchValue, approvalFilter, sorting, dateRange]);

  useEffect(() => {
    fetchChildren();
  }, [fetchChildren]);

  // --- Approve / Reject Mutation ---
  const approveMutation = useMutation({
    mutationFn: async ({
      _id,
      isApproved,
    }: {
      _id: string;
      isApproved: "Approved" | "Rejected";
    }) => await api.put(`/child/approve/${_id}`, { isApproved }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["children"] });
      fetchChildren();
      alert("Status updated successfully!");
    },
    onError: () => alert("Failed to update status."),
  });

  // --- Columns ---
  const columns: ColumnDef<Child>[] = [
    { id: "childName", header: "Student Name", accessorFn: (row) => row.childName ?? "--" },
    { id: "parentName", header: "Parent Name", accessorFn: (row) => row.parentId?.parentName ?? "--" },
    { id: "schoolName", header: "School Name", accessorFn: (row) => row.schoolId?.schoolName ?? "--" },
    { id: "branchName", header: "Branch Name", accessorFn: (row) => row.branchId?.branchName ?? "--" },
    { id: "className", header: "Class", accessorFn: (row) => row.className ?? "--" },
    { id: "section", header: "Section", accessorFn: (row) => row.section ?? "--" },
    { id: "mobile", header: "Mobile", accessorFn: (row) => row.parentId?.mobileNo ?? "--" },
    { id: "username", header: "Username", accessorFn: (row) => row.parentId?.username ?? "--" },
    { id: "password", header: "Password", accessorFn: (row) => row.parentId?.password ?? "--" },
    { id: "createdAt", header: "Registration Date", accessorFn: (row) => formatDate(row.createdAt) },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const child = row.original;
        const status = child.isApproved?.toLowerCase();

        if (status === "pending" || !status) {
          return (
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-green-500 hover:bg-green-600 text-white font-semibold rounded-full px-3 py-1"
                disabled={approveMutation.isPending}
                onClick={() =>
                  approveMutation.mutate({
                    _id: child._id,
                    isApproved: "Approved",
                  })
                }
              >
                Approve
              </Button>
              <Button
                size="sm"
                className="bg-red-500 hover:bg-red-600 text-white font-semibold rounded-full px-3 py-1"
                disabled={approveMutation.isPending}
                onClick={() =>
                  approveMutation.mutate({
                    _id: child._id,
                    isApproved: "Rejected",
                  })
                }
              >
                Reject
              </Button>
            </div>
          );
        }

        let badgeClass = "";
        if (status === "approved")
          badgeClass = "bg-green-100 text-green-700 border border-green-300";
        else if (status === "rejected")
          badgeClass = "bg-red-100 text-red-700 border border-red-300";
        else badgeClass = "bg-gray-100 text-gray-700 border border-gray-300";

        return (
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${badgeClass}`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        );
      },
    },
  ];

  // --- Table ---
  const { table, tableElement } = CustomTableServerSidePagination({
    data: children,
    columns,
    pagination,
    totalCount,
    loading: isLoading,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    sorting,
    columnVisibility,
    onColumnVisibilityChange: setColumnVisibility,
    emptyMessage: "No students found",
    pageSizeOptions: [5, 10, 20, 30, 50],
    enableSorting: true,
    showSerialNumber: true,
  });

  // --- Export ---
  const exportData = children.map((c) => ({
    studentName: c.childName,
    parentName: c.parentId?.parentName ?? "",
    className: c.className,
    schoolName: c.schoolId?.schoolName ?? "",
    branchName: c.branchId?.branchName ?? "",
    status: c.isApproved,
    registeredOn: formatDate(c.createdAt),
  }));

  const columnsForExport = [
    { key: "studentName", header: "Student Name" },
    { key: "parentName", header: "Parent Name" },
    { key: "className", header: "Class" },
    { key: "schoolName", header: "School" },
    { key: "branchName", header: "Branch" },
    { key: "status", header: "Status" },
    { key: "registeredOn", header: "Registered On" },
  ];

  return (
    <main>
      <ResponseLoader isLoading={isLoading} />

      {/* Filters */}
      <header className="flex flex-wrap items-center gap-4 mb-4">
        <SearchComponent
          onInputChange={(val) => {
            setSearchValue(val);
            setPagination((prev) => ({ ...prev, pageIndex: 0 }));
          }}
          placeholder="Search by student"
          className="w-[250px]"
        />

        <DateRangeFilter
          onDateRangeChange={(start, end) => setDateRange({ start, end })}
          title="Filter by Registration Date"
        />

        <SearchableSelect
          options={[
            { label: "Approved", value: "Approved" },
            { label: "Rejected", value: "Rejected" },
            { label: "Pending", value: "Pending" },
          ]}
          value={
            approvalFilter ? { label: approvalFilter, value: approvalFilter } : null
          }
          onChange={(opt) => {
            setApprovalFilter(opt?.value || "");
            setPagination((prev) => ({ ...prev, pageIndex: 0 }));
          }}
          placeholder="Filter by Status"
          isClearable
        />

        <ColumnVisibilitySelector columns={table.getAllColumns()} />
      </header>

      {/* Table */}
      <section className="mb-4">{tableElement}</section>

      {/* Export Menu */}
      <FloatingMenu
        onExportPdf={() =>
          exportToPDF(exportData, columnsForExport, {
            title: "Student Approval Report",
            companyName: "Parents Eye",
          })
        }
        onExportExcel={() =>
          exportToExcel(exportData, columnsForExport, {
            title: "Student Approval Report",
            companyName: "Parents Eye",
          })
        }
      />
    </main>
  );
}
