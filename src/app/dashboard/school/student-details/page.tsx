"use client";

import React, { useCallback, useEffect, useState } from "react";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";
import { DynamicEditDialog, FieldConfig } from "@/components/ui/EditModal";
import SearchComponent from "@/components/ui/SearchOnlydata";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/datePicker";
import { SearchableSelect } from "@/components/custom-select";
import DateRangeFilter from "@/components/ui/DateRangeFilter";
import { FloatingMenu } from "@/components/floatingMenu";
import type {
  ColumnDef,
  SortingState,
  PaginationState,
  VisibilityState,
} from "@tanstack/react-table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/apiService";
import { useSchoolData } from "@/hooks/useSchoolData";
import { useBranchData } from "@/hooks/useBranchData";
import { useDeviceData } from "@/hooks/useDeviceData";
import { Student } from "@/interface/modal";
import { useExport } from "@/hooks/useExport";
import { useStudents } from "@/hooks/useStudent";
import { ResponseLoader } from "@/components/RouteLoader";
import { SearchBar } from "@/components/search-bar/SearchBarPagination";
import { CustomFilter } from "@/components/ui/CustomFilter";
import { Alert } from "@/components/Alert";
import { AddStudentForm } from "@/components/add-student/add-student";

export default function StudentDetails() {
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [editTarget, setEditTarget] = useState<Student | null>(null);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState([]);
  const [studentName, setStudentName] = useState("");
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [debouncedStudentName, setDebouncedStudentName] = useState(studentName);
  const [register, setRegister] = useState(false);
  const { exportToPDF, exportToExcel } = useExport();

  const {
    data: studentsData,
    isLoading,
    error,
    isError,
    isFetching,
  } = useStudents({
    pagination,
    sorting,
    childName: debouncedStudentName,
  });

  // columns for table
  const columns: ColumnDef<Student>[] = [
    {
      id: "childName",
      header: "Student Name",
      accessorFn: (row) => row.childName ?? "N/A",
      meta: { flex: 1, minWidth: 100, maxWidth: 300 },
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "age",
      header: "Age",
      accessorFn: (row) => row.age ?? "N/A",
      meta: { flex: 1, minWidth: 100, maxWidth: 300 },
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "className",
      header: "Class",
      accessorFn: (row) => row.className ?? "N/A",
      meta: { flex: 1, minWidth: 100, maxWidth: 300 },
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "section",
      header: "Section",
      accessorFn: (row) => row.section ?? "N/A",
      meta: { flex: 1, minWidth: 100, maxWidth: 300 },
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "schoolName",
      header: "School",
      accessorFn: (row) => row.schoolId?.schoolName ?? "N/A",
      meta: { flex: 1, minWidth: 100, maxWidth: 300 },
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "branchName",
      header: "Branch",
      accessorFn: (row) => row.branchId?.branchName ?? "N/A",
      meta: { flex: 1, minWidth: 100, maxWidth: 300 },
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "parentName",
      header: "Parent Name",
      accessorFn: (row) => row.parentId?.parentName ?? "N/A",
      meta: { flex: 1, minWidth: 100, maxWidth: 300 },
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "mobileNo",
      header: "Contact no",
      accessorFn: (row) => row.parentId?.mobileNo ?? "N/A",
      meta: { flex: 1, minWidth: 100, maxWidth: 300 },
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "pickupLocation",
      header: "Pickup Location",
      accessorFn: (row) => row.geofenceId?.geofenceName ?? "N/A",
      meta: { flex: 1, minWidth: 100, maxWidth: 300 },
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "username",
      header: "Username",
      accessorFn: (row) => row.parentId?.username ?? "N/A",
      meta: { flex: 1, minWidth: 100, maxWidth: 300 },
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "password",
      header: "Password",
      accessorFn: (row) => row.parentId?.password ?? "N/A",
      meta: { flex: 1, minWidth: 100, maxWidth: 300 },
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "statusOfRegister",
      header: "Status of Register",
      accessorFn: (row) => row.statusOfRegister ?? "N/A",
      cell: ({ getValue }) => {
        const value = getValue();
        const isPending = value?.toLowerCase() === "pending";
        const capitalized =
          typeof value === "string"
            ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
            : "N/A";

        return (
          <span
            className={`px-3 py-1 rounded-full text-white text-sm font-medium
          ${isPending ? "bg-red-500" : "bg-green-500"}`}
          >
            {capitalized}
          </span>
        );
      },
      meta: { flex: 1.5, minWidth: 150, maxWidth: 200 },
      enableSorting: false,
      enableHiding: true,
    },
    {
      id: "action",
      header: "Action",
      cell: ({ row }) => {
        const rowData = row.original;
        return (
          <div className="flex items-center justify-center gap-2">
            <button className="bg-yellow-400 hover:bg-yellow-500 text-[#733e0a] font-semibold py-1 px-3 rounded-md cursor-pointer">
              Edit
            </button>
            <button
              className="bg-red-500 hover:bg-red-600 text-white font-semibold py-1 px-3 rounded-md cursor-pointer"
              onClick={() => {
                setDeleteTarget(rowData);
              }}
            >
              Delete
            </button>
          </div>
        );
      },
    },
  ];

  // columns for export report
  const columnsForExport = [
    { key: "childName", header: "Child Name" },
    { key: "section", header: "Section" },
    { key: "age", header: "Age" },
    { key: "schoolId.schoolName", header: "School" },
    { key: "branchId.branchName", header: "Branch" },
    { key: "parentId.parentName", header: "Parent Name" },
    { key: "parentId.mobileNo", header: "Contact no" },
    { key: "geofenceId.geofenceName", header: "Pickup Location" },
    { key: "parentId.username", header: "Username" },
    { key: "parentId.password", header: "Password" },
    { key: "statusOfRegister", header: "Status of Register" },
  ];

  // delete student mutation
  const deleteDeviceMutation = useMutation({
    mutationFn: async (_id: string) => {
      return await api.delete(`/child/${_id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] }); // 🔥 THIS invalidates all student-related queries
      alert("Student deleted successfully.");
    },
    onError: (err) => {
      alert("Failed to delete student.\nerror: " + err);
    },
  });

  // server side pagination table instance
  const { table, tableElement } = CustomTableServerSidePagination({
    data: studentsData?.children || [],
    columns,
    pagination,
    totalCount: studentsData?.total || 0,
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

  return (
    <>
      <header className="flex items-center gap-4 mb-4 justify-between">
        <section>
          {/* Search Input */}

          {/* <SearchBar
          value={deviceName}
          onChange={setDeviceName}
          placeholder="Search by device name..."
          width="w-full md:w-1/4"
        /> */}

          {/* Access Filter*/}
          {/* <CustomFilter
          data={filterResultsts}
          originalData={filterResults}
          filterFields={["status"]}
          onFilter={handleCustomFilter}
          placeholder={"Filter by Status"}
          className="w-[180px]"
        /> */}
        </section>
        {/* Add Student */}
        <section>
          <AddStudentForm />
        </section>
      </header>
      <main>
        {/* Table Section */}
        <section>{tableElement}</section>
        {/* Alert Dialog */}
        <section>
          {/* Delete Dialog */}
          <div>
            {deleteTarget && (
              <Alert<Student>
                title="Are you absolutely sure?"
                description={`This will permanently delete ${deleteTarget?.childName} and all associated data.`}
                actionButton={(target) => {
                  deleteDeviceMutation.mutate(target._id);
                  setDeleteTarget(null);
                }}
                target={deleteTarget}
                setTarget={setDeleteTarget}
                butttonText="Delete"
              />
            )}
          </div>
        </section>
        {/* Floating Menu */}
        <section>
          <FloatingMenu
            onExportPdf={() => {
              // console.log("Export PDF triggered");
              exportToPDF(studentsData?.children, columnsForExport, {
                title: "All Students Data",
                companyName: "Parents Eye",
                metadata: {
                  Total: `${studentsData?.children?.length} students`,
                },
              });
            }}
            onExportExcel={() => {
              // console.log("Export Excel triggered");
              exportToExcel(studentsData?.children, columnsForExport, {
                title: "All students Data",
                companyName: "Parents Eye",
                metadata: {
                  Total: `${studentsData?.children.length} students`,
                },
              });
            }}
          />
        </section>
      </main>
    </>
  );
}
