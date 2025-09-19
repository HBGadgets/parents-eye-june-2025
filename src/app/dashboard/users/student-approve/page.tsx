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
import { getCoreRowModel, useReactTable, VisibilityState, type ColumnDef } from "@tanstack/react-table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/apiService";
import { useExport } from "@/hooks/useExport";
import { formatDate } from "@/util/formatDate";
import { Alert } from "@/components/Alert";
import ResponseLoader from "@/components/ResponseLoader";
import { CustomFilter } from "@/components/ui/CustomFilter";
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
  const [filterResults, setFilterResults] = useState<Student[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [editTarget, setEditTarget] = useState<Student | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [school, setSchool] = useState<string | undefined>(undefined);
  const [branch, setBranch] = useState<string | undefined>(undefined);

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
    ? Array.from(
        new Map(
          schoolData
            .filter((s) => s._id && s.schoolName)
            .map((s) => [s._id, { label: s.schoolName, value: s._id }])
        ).values()
      )
    : [];

  // Branch options filtered by selected school
  const filteredBranchOptions = useMemo(() => {
    if (!school || !branchData) return [];
    return branchData
      .filter((branch) => branch.schoolId?._id === school)
      .map((branch) => ({ label: branch.branchName, value: branch._id }));
  }, [school, branchData]);

  // All branch options for edit dialog
  const branchOptions: SelectOption[] = branchData
    ? Array.from(
        new Map(
          branchData
            .filter((s) => s._id && s.branchName)
            .map((s) => [s._id, { label: s.branchName, value: s._id }])
        ).values()
      )
    : [];

  // Reset branch when school changes
  useEffect(() => setBranch(undefined), [school]);

  // Update filtered data when students change
  useEffect(() => {
    if (students?.length) {
      setFilteredData(students);
      setFilterResults(students);
    }
  }, [students]);

  // Mutations
  const addStudentMutation = useMutation({
    mutationFn: async (newStudent: any) => await api.post("/student", newStudent),
    onSuccess: (createdStudent, variables) => {
      const school = schoolData?.find((s) => s._id === variables.schoolId);
      const branch = branchData?.find((b) => b._id === variables.branchId);

      const newStudentWithResolvedReferences = {
        ...createdStudent,
        password: variables.password,
        schoolId: school
          ? { _id: school._id, schoolName: school.schoolName }
          : { _id: variables.schoolId, schoolName: "Unknown School" },
        branchId: branch
          ? { _id: branch._id, branchName: branch.branchName }
          : { _id: variables.branchId, branchName: "Unknown Branch" },
      };

      queryClient.setQueryData<Student[]>(["students"], (old = []) => [
        ...old,
        newStudentWithResolvedReferences,
      ]);
      alert("Student added successfully.");
    },
    onError: (error: any) =>
      alert(`Failed to add student: ${error.response?.data?.message || error.message}`),
  });

  const ApproveMutation = useMutation({
    mutationFn: async (student: { _id: string; isApproved: "Approved" | "Rejected" }) =>
      await api.post(`/student/approve/${student._id}`, { isApproved: student.isApproved }),
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
    mutationFn: async ({ studentId, data }: { studentId: string; data: Partial<Student> }) =>
      await api.put(`/student/${studentId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setEditDialogOpen(false);
      setEditTarget(null);
      alert("Student updated successfully.");
    },
    onError: () => alert("Failed to update student."),
  });

  const deleteStudentMutation = useMutation({
    mutationFn: async (studentId: string) => await api.delete(`/student/${studentId}`),
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData<Student[]>(["students"], (oldData) =>
        oldData?.filter((student) => student._id !== deletedId)
      );
      alert("Student deleted successfully.");
    },
    onError: () => alert("Failed to delete student."),
  });

  // Table columns
  const columns: ColumnDef<Student, CellContent>[] = [
    {
      header: "Student Name",
      accessorFn: (row) => ({ type: "text", value: row.studentName ?? "" }),
      meta: { flex: 1, minWidth: 200, maxWidth: 300 },
      enableHiding: true,
    },
    {
      header: "School Name",
      accessorFn: (row) => ({ type: "text", value: row.schoolId?.schoolName ?? "--" }),
      meta: { flex: 1, minWidth: 200, maxWidth: 300 },
      enableHiding: true,
    },
    {
      header: "Branch Name",
      accessorFn: (row) => ({ type: "text", value: row.branchId?.branchName ?? "--" }),
      meta: { flex: 1, minWidth: 200, maxWidth: 300 },
      enableHiding: true,
    },
    {
      header: "Class",
      accessorFn: (row) => ({ type: "text", value: row.class ?? "--" }),
      meta: { flex: 1, minWidth: 120, maxWidth: 150 },
      enableHiding: true,
    },
    {
      header: "Roll Number",
      accessorFn: (row) => ({ type: "text", value: row.rollNumber ?? "--" }),
      meta: { flex: 1, minWidth: 150, maxWidth: 200 },
      enableHiding: true,
    },
    {
      header: "Section",
      accessorFn: (row) => ({ type: "text", value: row.section ?? "--" }),
      meta: { flex: 1, minWidth: 150, maxWidth: 200 },
      enableHiding: true,
    },
    {
      header: "Mobile",
      accessorFn: (row) => ({ type: "text", value: row.studentMobile ?? "" }),
      meta: { flex: 1, minWidth: 150, maxWidth: 300 },
      enableHiding: true,
    },
    {
      header: "Username",
      accessorFn: (row) => ({ type: "text", value: row.username ?? "" }),
      meta: { flex: 1, minWidth: 150, maxWidth: 300 },
      enableHiding: true,
    },
    {
      header: "Password",
      accessorFn: (row) => ({ type: "text", value: row.password ?? "" }),
      meta: { flex: 1, minWidth: 150, maxWidth: 300 },
      enableHiding: true,
    },
    {
      header: "Registration Date",
      accessorFn: (row) => ({ type: "text", value: formatDate(row.createdAt) ?? "" }),
      meta: { flex: 1, minWidth: 200 },
      enableHiding: true,
    },
    {
      header: "Approve/Reject",
      accessorFn: (row) => ({
        type: "group",
        items:
          row.isApproved === "Pending"
            ? [
                {
                  type: "button",
                  label: "Approved",
                  onClick: () => ApproveMutation.mutate({ _id: row._id, isApproved: "Approved" }),
                  disabled: ApproveMutation.isPending,
                  className:
                    "flex-shrink-0 text-xs w-20 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-full px-2 py-1 mr-1",
                },
                {
                  type: "button",
                  label: "Reject",
                  onClick: () => ApproveMutation.mutate({ _id: row._id, isApproved: "Rejected" }),
                  disabled: ApproveMutation.isPending,
                  className:
                    "flex-shrink-0 text-xs w-20 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-full px-2 py-1",
                },
              ]
            : [
                {
                  type: "button",
                  label: row.isApproved === "Approved" ? "Approved" : "Rejected",
                  onClick: () => {},
                  disabled: true,
                  className: `flex-shrink-0 text-xs w-24 ${
                    row.isApproved === "Approved"
                      ? "bg-green-300 text-green-800"
                      : "bg-red-300 text-red-800"
                  } font-semibold rounded-full px-2 py-1`,
                },
              ],
      }),
      meta: { flex: 1, minWidth: 180, maxWidth: 200 },
      enableSorting: false,
      enableHiding: true,
    },
    {
      header: "Action",
      accessorFn: (row) => ({
        type: "group",
        items: [
          {
            type: "button",
            label: "Edit",
            onClick: () => {
              setEditTarget(row);
              setEditDialogOpen(true);
            },
            className: "cursor-pointer",
            disabled: updateStudentMutation.isPending,
          },
          {
            type: "button",
            label: "Delete",
            onClick: () => setDeleteTarget(row),
            className: "text-red-600 cursor-pointer",
            disabled: deleteStudentMutation.isPending,
          },
        ],
      }),
      meta: { flex: 1.5, minWidth: 150, maxWidth: 200 },
      enableSorting: false,
      enableHiding: true,
    },
  ];

  // Export columns
  const columnsForExport = [
    { key: "studentName", header: "Student Name" },
    { key: "studentMobile", header: "Mobile" },
    { key: "rollNumber", header: "Roll Number" },
    { key: "class", header: "Class" },
    { key: "section", header: "Section" },
    { key: "username", header: "Student Username" },
    { key: "password", header: "Student Password" },
    { key: "schoolId.schoolName", header: "School Name" },
    { key: "branchId.branchName", header: "Branch Name" },
    { key: "isApproved", header: "Status" },
    { key: "createdAt", header: "Registration Date" },
  ];

  // Edit dialog field configs
  const studentFieldConfigs: FieldConfig[] = [
    { label: "Student Name", key: "studentName", type: "text", required: true },
    { label: "School Name", key: "schoolId", type: "select", required: true, options: schoolOptions },
    { label: "Branch Name", key: "branchId", type: "select", required: true, options: branchOptions },
    { label: "Roll Number", key: "rollNumber", type: "text", required: true },
    { label: "Class", key: "class", type: "text", required: true },
    { label: "Section", key: "section", type: "text", required: true },
    { label: "Mobile Number", key: "studentMobile", type: "text", required: true },
    { label: "Username", key: "username", type: "text", required: true },
    { label: "Password", key: "password", type: "text", required: true },
  ];

  // Event handlers
  const handleSearchResults = useCallback((results: Student[]) => setFilteredData(results), []);

  const handleSave = (updatedData: Partial<Student>) => {
    if (!editTarget) return;

    const changedFields: Partial<Record<keyof Student, unknown>> = {};
    for (const key in updatedData) {
      const newValue = updatedData[key as keyof Student];
      const oldValue = editTarget[key as keyof Student];
      if (newValue !== undefined && newValue !== oldValue) {
        changedFields[key as keyof Student] = newValue;
      }
    }

    if (Object.keys(changedFields).length === 0) return;

    updateStudentMutation.mutate({ studentId: editTarget._id, data: changedFields });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    if (!school) return alert("Please select a school");
    if (!branch) return alert("Please select a branch");

    const data = {
      studentName: formData.get("studentName") as string,
      studentMobile: formData.get("studentMobile") as string,
      rollNumber: formData.get("rollNumber") as string,
      class: formData.get("class") as string,
      username: formData.get("username") as string,
      password: formData.get("password") as string,
      email: formData.get("email") as string,
      schoolId: school,
      branchId: branch,
    };

    await addStudentMutation.mutateAsync(data);

    if (!addStudentMutation.isError) {
      closeButtonRef.current?.click();
      form.reset();
      setSchool(undefined);
      setBranch(undefined);
    }
  };

  const handleDateFilter = useCallback(
    (start: Date | null, end: Date | null) => {
      if (!students || (!start && !end)) return setFilteredData(students || []);

      const filtered = students.filter((student) => {
        if (!student.createdAt) return false;
        const createdDate = new Date(student.createdAt);
        return (!start || createdDate >= start) && (!end || createdDate <= end);
      });

      setFilteredData(filtered);
    },
    [students]
  );

  const handleCustomFilter = useCallback((filtered: Student[]) => setFilteredData(filtered), []);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { columnVisibility },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <main>
      <ResponseLoader isLoading={isLoading} />

      <header className="flex items-center justify-between mb-4">
        <section className="flex space-x-4">
          <SearchComponent
            data={filterResults}
            displayKey={["studentName", "username", "email", "studentMobile", "rollNumber"]}
            onResults={handleSearchResults}
            className="w-[300px] mb-4"
          />
          <DateRangeFilter onDateRangeChange={handleDateFilter} title="Search by Registration Date" />
          <CustomFilter
            data={filteredData}
            originalData={students}
            filterFields={["isApproved"]}
            onFilter={handleCustomFilter}
            placeholder="Filter by Approval"
            valueFormatter={(value) => {
              if (!value) return "";
              const formatted = value.toString().toLowerCase();
              return formatted === "rejected" ? "Rejected" : formatted === "approved" ? "Approved" : formatted === "pending" ? "Pending" : value;
            }}
          />
          <ColumnVisibilitySelector
            columns={table.getAllColumns()}
            buttonVariant="outline"
            buttonSize="default"
          />
        </section>

        <section>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="default">Add Student</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <form onSubmit={handleSubmit} className="space-y-4">
                <DialogHeader>
                  <DialogTitle>Add Student</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="studentName">Student Name</Label>
                    <Input id="studentName" name="studentName" placeholder="Enter student name" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="schoolId">School</Label>
                    <SearchableSelect
                      value={school}
                      onChange={setSchool}
                      options={schoolOptions}
                      placeholder="Select school"
                      allowClear={true}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="branchId">Branch</Label>
                    <SearchableSelect
                      value={branch}
                      onChange={setBranch}
                      options={filteredBranchOptions}
                      placeholder={
                        !school
                          ? "select school first"
                          : filteredBranchOptions.length
                          ? "select branch"
                          : "No branches available"
                      }
                      allowClear={true}
                      disabled={!school}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="rollNumber">Roll Number</Label>
                    <Input id="rollNumber" name="rollNumber" placeholder="Enter roll number" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="class">Class</Label>
                    <Input id="class" name="class" placeholder="Enter class" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" placeholder="Enter email address" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="studentMobile">Mobile No</Label>
                    <Input
                      id="studentMobile"
                      name="studentMobile"
                      type="tel"
                      placeholder="Enter student mobile number"
                      pattern="[0-9]{10}"
                      maxLength={10}
                      autoComplete="tel"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="username">Username</Label>
                    <Input id="username" name="username" type="text" placeholder="Enter username" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" name="password" type="text" placeholder="Enter password" required />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button ref={closeButtonRef} variant="outline">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button type="submit" disabled={addStudentMutation.isPending}>
                    {addStudentMutation.isPending ? "Saving..." : "Save Student"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </section>
      </header>

      <section className="mb-4">
        <CustomTable
          data={filteredData || []}
          columns={columns}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
          pageSizeArray={[10, 20, 50]}
          maxHeight={600}
          minHeight={200}
          showSerialNumber={true}
          noDataMessage="No students found"
          isLoading={isLoading}
        />
      </section>

      {deleteTarget && (
        <Alert<Student>
          title="Are you absolutely sure?"
          description={`This will permanently delete ${deleteTarget?.studentName} and all associated data.`}
          actionButton={(target) => {
            deleteStudentMutation.mutate(target._id);
            setDeleteTarget(null);
          }}
          target={deleteTarget}
          setTarget={setDeleteTarget}
          butttonText="Delete"
        />
      )}

      {editTarget && (
        <DynamicEditDialog
          data={{
            ...editTarget,
            schoolId: editTarget.schoolId._id,
            branchId: editTarget.branchId._id,
          }}
          isOpen={editDialogOpen}
          onClose={() => {
            setEditDialogOpen(false);
            setEditTarget(null);
          }}
          onSave={handleSave}
          fields={studentFieldConfigs}
          title="Edit Student"
          description="Update the student information below. Fields marked with * are required."
          avatarConfig={{
            imageKey: "logo",
            nameKeys: ["studentName"],
          }}
        />
      )}

      <FloatingMenu
        onExportPdf={() =>
          exportToPDF(filteredData, columnsForExport, {
            title: "Student Master Report",
            companyName: "Parents Eye",
            metadata: { Total: `${filteredData.length} students` },
          })
        }
        onExportExcel={() =>
          exportToExcel(filteredData, columnsForExport, {
            title: "Student Master Report",
            companyName: "Parents Eye",
            metadata: { Total: `${filteredData.length} students` },
          })
        }
      />
    </main>
  );
}