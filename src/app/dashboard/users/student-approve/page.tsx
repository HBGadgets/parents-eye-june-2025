"use client";

import React, { useCallback, useEffect, useState, useRef, useMemo } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CustomTable, CellContent } from "@/components/ui/CustomTable";
import { DynamicEditDialog, FieldConfig } from "@/components/ui/EditModal";
import SearchComponent from "@/components/ui/SearchOnlydata";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
import { useSchoolData } from "@/hooks/useSchoolData";
import { SearchableSelect } from "@/components/custom-select";
import { useBranchData } from "@/hooks/useBranchData";

interface Student {
  _id: string;
  studentName: string;
  studentMobile: string;
  username: string;
  password: string;
  email: string;
  class: string;
  rollNumber: string;
  section: string;
  parentId?: { _id: string; parentName: string };
  schoolId: { _id: string; schoolName: string };
  branchId: { _id: string; branchName: string };
  isApproved: "Pending" | "Approved" | "Rejected";
  createdAt: string;
}

interface SelectOption {
  label: string;
  value: string;
}

export default function StudentApprove() {
  const queryClient = useQueryClient();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [filteredData, setFilteredData] = useState<Student[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [editTarget, setEditTarget] = useState<Student | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [school, setSchool] = useState<string>();
  const [branch, setBranch] = useState<string>();
  const [approvalFilter, setApprovalFilter] = useState<string>("");

  const { exportToPDF, exportToExcel } = useExport();
  const { data: schoolData } = useSchoolData();
  const { data: branchData } = useBranchData();

  // Fetch students
  const { data: students, isLoading } = useQuery<Student[]>({
    queryKey: ["students"],
    queryFn: async () => await api.get<Student[]>("/student"),
  });

  // School options
  const schoolOptions: SelectOption[] = schoolData
    ? schoolData.map((s) => ({ label: s.schoolName, value: s._id }))
    : [];

  // Branch options filtered by selected school
  const filteredBranchOptions = useMemo(() => {
    if (!school || !branchData) return [];
    return branchData
      .filter((b) => b.schoolId?._id === school)
      .map((b) => ({ label: b.branchName, value: b._id }));
  }, [school, branchData]);

  // Reset branch when school changes
  useEffect(() => setBranch(undefined), [school]);

  // Update filtered data
  useEffect(() => {
    if (!students) return;
    let data = students;

    if (approvalFilter) {
      data = data.filter((s) => s.isApproved === approvalFilter);
    }

    setFilteredData(data);
  }, [students, approvalFilter]);

  // --- Mutations (same as before) ---
  const addStudentMutation = useMutation({
    mutationFn: async (newStudent: any) => await api.post("/student", newStudent),
    onSuccess: (createdStudent, variables) => {
      const school = schoolData?.find((s) => s._id === variables.schoolId);
      const branch = branchData?.find((b) => b._id === variables.branchId);

      queryClient.setQueryData<Student[]>(["students"], (old = []) => [
        ...old,
        {
          ...createdStudent,
          password: variables.password,
          schoolId: school
            ? { _id: school._id, schoolName: school.schoolName }
            : { _id: variables.schoolId, schoolName: "Unknown School" },
          branchId: branch
            ? { _id: branch._id, branchName: branch.branchName }
            : { _id: variables.branchId, branchName: "Unknown Branch" },
        },
      ]);
      alert("Student added successfully.");
    },
    onError: (error: any) =>
      alert(
        `Failed to add student: ${
          error.response?.data?.message || error.message
        }`
      ),
  });

  const ApproveMutation = useMutation({
    mutationFn: async (student: {
      _id: string;
      isApproved: "Approved" | "Rejected";
    }) =>
      await api.post(`/student/approve/${student._id}`, {
        isApproved: student.isApproved,
      }),
    onSuccess: (_, variables) => {
      queryClient.setQueryData<Student[]>(["students"], (oldData) =>
        oldData?.map((student) =>
          student._id === variables._id
            ? { ...student, isApproved: variables.isApproved }
            : student
        )
      );
      alert("Access updated successfully.");
    },
    onError: () => alert("Failed to update access."),
  });

  const updateStudentMutation = useMutation({
    mutationFn: async ({
      studentId,
      data,
    }: {
      studentId: string;
      data: Partial<Student>;
    }) => await api.put(`/student/${studentId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setEditDialogOpen(false);
      setEditTarget(null);
      alert("Student updated successfully.");
    },
    onError: () => alert("Failed to update student."),
  });

  const deleteStudentMutation = useMutation({
    mutationFn: async (studentId: string) =>
      await api.delete(`/student/${studentId}`),
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData<Student[]>(["students"], (oldData) =>
        oldData?.filter((student) => student._id !== deletedId)
      );
      alert("Student deleted successfully.");
    },
    onError: () => alert("Failed to delete student."),
  });

  // --- Columns config (same as before) ---
  const columns: ColumnDef<Student, CellContent>[] = [
    { header: "Student Name", accessorFn: (row) => ({ type: "text", value: row.studentName }) },
    { header: "School Name", accessorFn: (row) => ({ type: "text", value: row.schoolId?.schoolName ?? "--" }) },
    { header: "Branch Name", accessorFn: (row) => ({ type: "text", value: row.branchId?.branchName ?? "--" }) },
    { header: "Class", accessorFn: (row) => ({ type: "text", value: row.class ?? "--" }) },
    { header: "Roll Number", accessorFn: (row) => ({ type: "text", value: row.rollNumber ?? "--" }) },
    { header: "Section", accessorFn: (row) => ({ type: "text", value: row.section ?? "--" }) },
    { header: "Mobile", accessorFn: (row) => ({ type: "text", value: row.studentMobile }) },
    { header: "Username", accessorFn: (row) => ({ type: "text", value: row.username }) },
    { header: "Password", accessorFn: (row) => ({ type: "text", value: row.password }) },
    { header: "Registration Date", accessorFn: (row) => ({ type: "text", value: formatDate(row.createdAt) }) },
    {
      header: "Approve/Reject",
      accessorFn: (row) => ({
        type: "group",
        items:
          row.isApproved === "Pending"
            ? [
                { type: "button", label: "Approved", onClick: () => ApproveMutation.mutate({ _id: row._id, isApproved: "Approved" }), className: "w-20 bg-green-500 text-white rounded-full px-2 py-1" },
                { type: "button", label: "Reject", onClick: () => ApproveMutation.mutate({ _id: row._id, isApproved: "Rejected" }), className: "w-20 bg-red-500 text-white rounded-full px-2 py-1" },
              ]
            : [
                {
                  type: "button",
                  label: row.isApproved,
                  onClick: () => {},
                  disabled: true,
                  className: `w-24 rounded-full px-2 py-1 ${row.isApproved === "Approved" ? "bg-green-300 text-green-800" : "bg-red-300 text-red-800"}`,
                },
              ],
      }),
    },
    {
      header: "Action",
      accessorFn: (row) => ({
        type: "group",
        items: [
          { type: "button", label: "Edit", onClick: () => { setEditTarget(row); setEditDialogOpen(true); } },
          { type: "button", label: "Delete", onClick: () => setDeleteTarget(row), className: "text-red-600" },
        ],
      }),
    },
  ];

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { columnVisibility },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
  });

  // --- UI ---
  return (
    <main>
      <ResponseLoader isLoading={isLoading} />

      {/* 🔹 Filters Section */}
      <header className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <SearchComponent
          data={students || []}
          displayKey={[
            "studentName",
            "username",
            "email",
            "studentMobile",
            "rollNumber",
          ]}
          onResults={setFilteredData}
        />

        <DateRangeFilter
          onDateRangeChange={(start, end) => {
            if (!students) return;
            let data = students;
            if (start || end) {
              data = data.filter((student) => {
                const created = new Date(student.createdAt);
                return (!start || created >= start) && (!end || created <= end);
              });
            }
            if (approvalFilter) {
              data = data.filter((s) => s.isApproved === approvalFilter);
            }
            setFilteredData(data);
          }}
          title="Search by Registration Date"
        />

        {/* 🔹 Approval filter with SearchableSelect */}
        <div>
          <SearchableSelect
            options={[
              { label: "Approved", value: "Approved" },
              { label: "Rejected", value: "Rejected" },
              { label: "Pending", value: "Pending" },
            ]}
            value={approvalFilter ? { label: approvalFilter, value: approvalFilter } : null}
            onChange={(option) => setApprovalFilter(option?.value || "")}
            placeholder="Filter by Access..."
            isClearable
          />
        </div>

        <ColumnVisibilitySelector columns={table.getAllColumns()} />
      </header>

      {/* ✅ Table */}
      <section className="mb-4">
        <CustomTable
          data={filteredData}
          columns={columns}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
          pageSizeArray={[10, 20, 50]}
          maxHeight={600}
          showSerialNumber
          noDataMessage="No students found"
          isLoading={isLoading}
        />
      </section>
    </main>
  );
}
