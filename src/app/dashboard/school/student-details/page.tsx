"use client";

import AddStudentForm from "@/components/add-student/add-student";
import { getStudentColumns } from "@/components/columns/columns";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";
import { useBranchDropdown, useSchoolDropdown } from "@/hooks/useDropdown";
import { useStudent } from "@/hooks/useStudent";
import { Student } from "@/interface/modal";
import { SortingState, PaginationState } from "@tanstack/react-table";
import { jwtDecode } from "jwt-decode";
import { useCallback, useEffect, useMemo, useState } from "react";
import Cookies from "js-cookie";
import { Button } from "@/components/ui/button";

type DecodedToken = {
  role: string;
  schoolId?: string;
  id?: string;
  branchId?: string;
};

type Filters = {
  schoolId?: string;
  branchId?: string;
};

export default function StudentDetails() {
  // ---------------- Pagination & Sorting ----------------
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);

  // ---------------- Modal/Form State ----------------
  const [showForm, setShowForm] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);

  // ---------------- Filter State (TABLE ONLY) ----------------
  const [filterSchoolId, setFilterSchoolId] = useState<string>();
  const [filterBranchId, setFilterBranchId] = useState<string>();

  // ---------------- Form State (FORM ONLY) ----------------
  const [formSchoolId, setFormSchoolId] = useState<string>();
  const [formBranchId, setFormBranchId] = useState<string>();
  const [formParentId, setFormParentId] = useState<string>();

  // ---------------- Auth ----------------
  const [decodedToken, setDecodedToken] = useState<DecodedToken>({ role: "" });
  const role = decodedToken.role || "";

  // ---------------- Decode Token ----------------
  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) return;

    try {
      const decoded = jwtDecode<DecodedToken>(token);
      setDecodedToken(decoded);
    } catch (err) {
      console.error("Token decode failed", err);
    }
  }, []);

  // ---------------- Role-based Defaults ----------------
  const tokenSchoolId = useMemo(
    () => (role === "school" ? decodedToken.id : decodedToken.schoolId),
    [role, decodedToken.id, decodedToken.schoolId]
  );

  const tokenBranchId = useMemo(
    () => (role === "branch" ? decodedToken.id : undefined),
    [role, decodedToken.id]
  );

  // ---------------- Apply Role Filters ONCE ----------------
  useEffect(() => {
    if (role === "school" && tokenSchoolId) setFilterSchoolId(tokenSchoolId);
    if (role === "branch" && tokenBranchId) setFilterBranchId(tokenBranchId);
  }, [role, tokenSchoolId, tokenBranchId]);

  // ---------------- API Filters ----------------
  const filters: Filters = useMemo(
    () => ({
      schoolId: filterSchoolId,
      branchId: filterBranchId,
    }),
    [filterSchoolId, filterBranchId]
  );

  // ---------------- Dropdown Data ----------------
  const { data: schools = [] } = useSchoolDropdown();
  const { data: branches = [] } = useBranchDropdown(formSchoolId);

  // ---------------- API ----------------
  const {
    students,
    total,
    isLoading,
    deleteStudent,
    updateStudent,
    createStudent,
    isDeleteLoading,
  } = useStudent(pagination, sorting, filters);

  // ---------------- Auto Close Form on Success ----------------
  useEffect(() => {
    if (!isLoading) setShowForm(false);
  }, [isLoading]);

  // ---------------- Handlers ----------------
  const closeModal = useCallback(() => {
    setShowForm(false);
    setEditStudent(null);
    setFormSchoolId(undefined);
    setFormBranchId(undefined);
    setFormParentId(undefined);
  }, []);

  const handleEdit = useCallback((row: Student) => {
    setEditStudent(row);
    setFormSchoolId(row.schoolId._id);
    setFormBranchId(row.branchId._id);
    setFormParentId(row.parentId._id);
    setShowForm(true);
  }, []);

  const handleDelete = useCallback(
    (row: Student) => {
      if (confirm("Delete this student?")) {
        deleteStudent([row._id]);
      }
    },
    [deleteStudent]
  );

  // ---------------- Table Columns ----------------
  const columns = useMemo(
    () => getStudentColumns(handleEdit, handleDelete),
    [handleEdit, handleDelete]
  );

  // ---------------- Table ----------------
  const { table, tableElement, selectedRows } = CustomTableServerSidePagination(
    {
      data: students || [],
      columns,
      pagination,
      totalCount: total,
      loading: isLoading,
      onPaginationChange: setPagination,
      onSortingChange: setSorting,
      sorting,
      emptyMessage: "No students found",
      pageSizeOptions: [5, 10, 15, 20, 30],
      showSerialNumber: true,
      enableSorting: true,
      enableMultiSelect: true,
    }
  );

  // ---------------- Bulk Delete ----------------
  const selectedCount = selectedRows.length;

  const handleBulkDelete = useCallback(() => {
    if (!selectedCount) return;

    if (!confirm(`Delete ${selectedCount} students?`)) return;

    deleteStudent(selectedRows);
    table?.resetRowSelection?.();
  }, [deleteStudent, selectedRows, table, selectedCount]);

  // ---------------- UI ----------------
  return (
    <div className="flex flex-col h-full">
      <h2 className="text-xl font-bold mb-4">Students</h2>

      {/* ACTION BAR */}
      <div className="flex justify-between items-center my-3">
        <Button
          disabled={!selectedCount || isDeleteLoading}
          onClick={handleBulkDelete}
          className={`text-sm transition ${
            selectedCount && !isDeleteLoading
              ? "bg-red-600 hover:bg-red-700"
              : "bg-gray-400 cursor-not-allowed"
          }`}
        >
          {isDeleteLoading
            ? "Deleting..."
            : `Delete Selected (${selectedCount})`}
        </Button>

        <Button
          onClick={() => {
            setEditStudent(null);
            setFormSchoolId(undefined);
            setFormBranchId(undefined);
            setFormParentId(undefined);
            setShowForm(true);
          }}
          className="cursor-pointer"
        >
          Add Student
        </Button>
      </div>

      {/* TABLE */}
      <div className="flex-1 min-h-0 pb-3">{tableElement}</div>

      {/* MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <AddStudentForm
            initialData={editStudent}
            onClose={closeModal}
            onSubmit={(data) => {
              if (editStudent) {
                updateStudent({ id: editStudent._id, payload: data });
              } else {
                createStudent(data);
              }
            }}
            decodedToken={decodedToken}
            schools={schools}
            branches={branches}
            selectedSchoolId={formSchoolId}
            selectedBranchId={formBranchId}
            selectedParentId={formParentId}
            onSchoolChange={setFormSchoolId}
            onBranchChange={setFormBranchId}
            onParentChange={setFormParentId}
          />
        </div>
      )}
    </div>
  );
}
