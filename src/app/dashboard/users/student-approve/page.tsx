"use client";

import React, { useState } from "react";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";
import SearchComponent from "@/components/ui/SearchOnlydata";
import DateRangeFilter from "@/components/ui/DateRangeFilter";
import { ColumnVisibilitySelector } from "@/components/column-visibility-selector";
import { SearchableSelect } from "@/components/custom-select";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { api } from "@/services/apiService";
import ResponseLoader from "@/components/ResponseLoader";
import { formatDate } from "@/util/formatDate";
import { FloatingMenu } from "@/components/floatingMenu";
import { useExport } from "@/hooks/useExport";
import { Button } from "@/components/ui/button";
import type { ColumnDef, VisibilityState } from "@tanstack/react-table";

// --- Interfaces ---
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

  // --- States ---
  const [filteredData, setFilteredData] = useState<Child[]>([]);
  const [approvalFilter, setApprovalFilter] = useState<string>("");
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState<any[]>([]);
  const [searchValue, setSearchValue] = useState("");

  const { exportToPDF, exportToExcel } = useExport();

  // --- Fetch children (server-side pagination) ---
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["children", pagination, sorting, searchValue, approvalFilter],
    queryFn: async () => {
      const params: Record<string, any> = {
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
      };
      if (searchValue) params.search = searchValue;
      if (approvalFilter) params.isApproved = approvalFilter;

      return await api.get<{
        children: Child[];
        total: number;
      }>("/child", { params });
    },
    keepPreviousData: true,
  });

  const children = data?.children || [];
  const totalCount = data?.total || 0;

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
      alert("Approval status updated.");
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
    { id: "childMobile", header: "Mobile", accessorFn: (row) => row.parentId?.mobileNo ?? "--" },
    { id: "username", header: "Username", accessorFn: (row) => row.parentId?.username ?? "--" },
    { id: "password", header: "Password", accessorFn: (row) => row.parentId?.password ?? "--" },
    { id: "createdAt", header: "Registration Date", accessorFn: (row) => formatDate(row.createdAt) },
    {
      id: "approveReject",
      header: "Status",
      cell: ({ row }) => {
        const child = row.original;

        // Show Approve/Reject buttons for pending students
        if (child.isApproved?.toLowerCase() === "pending") {
          return (
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-green-500 text-white"
                onClick={() =>
                  approveMutation.mutate({ _id: child._id, isApproved: "Approved" })
                }
              >
                Approve
              </Button>
              <Button
                size="sm"
                className="bg-red-500 text-white"
                onClick={() =>
                  approveMutation.mutate({ _id: child._id, isApproved: "Rejected" })
                }
              >
                Reject
              </Button>
            </div>
          );
        }

        // Normalize status to lowercase safely
        const rawStatus = child.isApproved || "Unknown";
        const status = typeof rawStatus === "string" ? rawStatus.toLowerCase() : "unknown";

        // Badge classes
        let badgeClass = "bg-gray-100 text-gray-700";
        if (status === "approved") badgeClass = "bg-green-100 text-green-700";
        if (status === "rejected") badgeClass = "bg-red-100 text-red-700";
        if (status === "pending") badgeClass = "bg-yellow-100 text-yellow-700";

        return (
          <span className={`px-3 py-1 rounded-full text-xs ${badgeClass}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        );
      },
    },
  ];

  // --- Table with server-side pagination ---
  const { table, tableElement } = CustomTableServerSidePagination({
    data: children,
    columns,
    pagination,
    totalCount,
    loading: isLoading || isFetching,
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

  // --- Export Data ---
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

  // --- UI ---
  return (
    <main>
      <ResponseLoader isLoading={isLoading} />

      {/* 🔹 Filters Section */}
      <header className="flex flex-wrap items-center gap-4 mb-4">
        <SearchComponent
          data={children}
          displayKey={["childName", "parentId.parentName", "parentId.username", "parentId.mobileNo"]}
          onResults={setFilteredData}
          onInputChange={(val) => setSearchValue(val)}
          className="w-[250px]"
        />
        <DateRangeFilter
          onDateRangeChange={(start, end) => {
            if (!children) return;
            let filtered = children;
            if (start || end) {
              filtered = children.filter((c) => {
                const created = new Date(c.createdAt);
                return (!start || created >= start) && (!end || created <= end);
              });
            }
            setFilteredData(filtered);
          }}
          title="Search by Registration Date"
        />
        <SearchableSelect
          options={[
            { label: "Approved", value: "Approved" },
            { label: "Rejected", value: "Rejected" },
            { label: "Pending", value: "Pending" },
          ]}
          value={approvalFilter ? { label: approvalFilter, value: approvalFilter } : null}
          onChange={(opt) => setApprovalFilter(opt?.value || "")}
          placeholder="Filter by Status"
          isClearable
        />
        <ColumnVisibilitySelector columns={table.getAllColumns()} />
      </header>

      {/* 🔹 Table */}
      <section className="mb-4">{tableElement}</section>

      {/* 🔹 Floating Export Menu */}
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
