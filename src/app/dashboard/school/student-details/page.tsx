"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/apiService";
import { CustomTable, CellContent } from "@/components/ui/CustomTable";
import { DynamicEditDialog, FieldConfig } from "@/components/ui/EditModal";
import type { ColumnDef } from "@tanstack/react-table";
import SearchComponent from "@/components/ui/SearchOnlydata";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Student } from "@/interface/modal";
import { DatePicker } from "@/components/ui/datePicker";

export default function StudentDetails() {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [filteredData, setFilteredData] = useState<Student[]>([]);
  const [filterResults, setFilterResults] = useState<Student[]>([]);
  const [addDialogOpen, setAddDialogOpen] = useState<boolean>(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Student | null>(null);
  const [open, setOpen] = useState(false);
  const [dob, setDob] = useState<Date | undefined>(undefined);
  const queryClient = useQueryClient();

  // Fetch students data
  const {
    data: students,
    isLoading,
    isError,
    error,
  } = useQuery<Student[]>({
    queryKey: ["students"],
    queryFn: async () => {
      const res = await api.get<{ children: Student[] }>("/child");
      return res.children;
    },
  });

  useEffect(() => {
    if (students && students.length > 0) {
      setFilteredData(students);
      setFilterResults(students); // For search base
    }
  }, [students]);

  const handleSearchResults = useCallback((results: Student[]) => {
    setFilteredData(results);
  }, []);

  // Mutation to delete a student
  const deleteStudentMutation = useMutation({
    mutationFn: async (studentId: string) => {
      return await api.delete(`/child/${studentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
    onError: (err) => {
      console.error(err);
      alert("Failed to delete student.");
    },
  });

  // Dynamic field configuration for the edit dialog
  const editFieldConfigs: FieldConfig[] = [
    {
      key: "childName",
      label: "Student Name",
      type: "text",
      placeholder: "Student Name",
      required: true,
      validation: {
        minLength: 2,
        message: "Student name must be at least 2 characters",
      },
    },
    {
      key: "className",
      label: "Class",
      type: "text",
      placeholder: "Enter class name",
    },
    {
      key: "deviceId.routeNo",
      label: "Route No",
      type: "number",
      placeholder: "Enter route number",
    },
    {
      key: "section",
      label: "Section",
      type: "text",
      placeholder: "Enter section",
    },
    {
      key: "schoolId.schoolName",
      label: "School",
      type: "text",
      placeholder: "Enter School Name",
    },
    {
      key: "branchId.branchName",
      label: "Branch",
      type: "text",
      placeholder: "Enter phone number",
    },
    // {
    //   key: "DOB",
    //   label: "Date of Birth",
    //   type: "text",
    //   required: true,
    //   placeholder: "Enter company name",
    // },
    {
      key: "image",
      label: "Profile Image URL",
      type: "url",
      placeholder: "https://example.com/image.jpg",
      gridCols: 1, // Full width
    },
  ];

  // Define the columns for the table
  const columns: ColumnDef<Student, CellContent>[] = [
    {
      header: "Student Name",
      accessorFn: (row) => ({
        type: "text",
        value: row.childName ?? "",
      }),
      cell: (info) => info.getValue(),
      meta: { flex: 1, minWidth: 200, maxWidth: 300 },
    },
    {
      header: "Class",
      accessorFn: (row) => ({
        type: "text",
        value: row.className ?? "",
      }),
      cell: (info) => info.getValue(),
      meta: { flex: 1, minWidth: 150, maxWidth: 300 },
    },
    {
      header: "Route No",
      accessorFn: (row) => ({
        type: "text",
        value: row.deviceId?.routeNo ?? "",
      }),
      cell: (info) => info.getValue(),
      meta: { flex: 1, minWidth: 150, maxWidth: 300 },
    },
    {
      header: "Section",
      accessorFn: (row) => ({
        type: "text",
        value: row.section ?? "",
      }),
      cell: (info) => info.getValue(),
      meta: { flex: 1, minWidth: 150, maxWidth: 300 },
    },
    {
      header: "School",
      accessorFn: (row) => ({
        type: "text",
        value: row.schoolId?.schoolName ?? "",
      }),
      cell: (info) => info.getValue(),
      meta: { flex: 1, minWidth: 150, maxWidth: 300 },
    },
    {
      header: "Branch",
      accessorFn: (row) => ({
        type: "text",
        value: row.branchId?.branchName ?? "",
      }),
      cell: (info) => info.getValue(),
      meta: { flex: 1, minWidth: 150, maxWidth: 300 },
    },
    {
      header: "DOB",
      accessorFn: (row) => ({
        type: "text",
        value: row.DOB
          ? new Date(row.DOB).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "",
      }),
      cell: (info) => info.getValue(),
      meta: { flex: 1, minWidth: 150, maxWidth: 300 },
    },
    {
      header: "Age",
      accessorFn: (row) => ({
        type: "text",
        value: row.age?.toString() ?? "",
      }),
      cell: (info) => info.getValue(),
      meta: { flex: 1, minWidth: 100, maxWidth: 300 },
    },
    {
      header: "Parent Name",
      accessorFn: (row) => ({
        type: "text",
        value: row.parentId?.parentName ?? "",
      }),
      cell: (info) => info.getValue(),
      meta: { flex: 1, minWidth: 180, maxWidth: 300 },
    },
    {
      header: "Contact No",
      accessorFn: (row) => ({
        type: "text",
        value: row.parentId?.contactNo ?? "",
      }),
      cell: (info) => info.getValue(),
      meta: { flex: 1, minWidth: 180, maxWidth: 300 },
    },
    {
      header: "Gender",
      accessorFn: (row) => ({
        type: "text",
        value: row.gender ?? "",
      }),
      cell: (info) => info.getValue(),
      meta: { flex: 1, minWidth: 150, maxWidth: 300 },
    },
    {
      header: "Bus No.",
      accessorFn: (row) => ({
        type: "text",
        value: row.deviceId?.name ?? "",
      }),
      cell: (info) => info.getValue(),
      meta: { flex: 1, minWidth: 150, maxWidth: 300 },
    },
    {
      header: "Pickup Point",
      accessorFn: (row) => ({
        type: "text",
        value: row.geofenceId?.name ?? "",
      }),
      cell: (info) => info.getValue(),
      meta: { flex: 1, minWidth: 180, maxWidth: 300 },
    },
    {
      header: "Registration Date",
      accessorFn: (row) => ({
        type: "text",
        value: row.createdAt
          ? new Date(row.createdAt).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "",
      }),
      cell: (info) => info.getValue(),
      meta: { flex: 1, minWidth: 220, maxWidth: 300 },
    },
    {
      header: "UserName",
      accessorFn: (row) => ({
        type: "text",
        value: row.parentId?.userName ?? "",
      }),
      cell: (info) => info.getValue(),
      meta: { flex: 1, minWidth: 150, maxWidth: 300 },
    },
    {
      header: "Password",
      accessorFn: (row) => ({
        type: "text",
        value: row.parentId?.password ?? "",
      }),
      cell: (info) => info.getValue(),
      meta: { flex: 1, minWidth: 150, maxWidth: 300 },
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
              alert(`Edit student: ${row.childName}`);
            },
          },
          {
            type: "button",
            label: "Delete",
            onClick: () => setSelectedStudent(row),
            disabled: deleteStudentMutation.isPending,
          },
        ],
      }),
      cell: (info) => info.getValue(),
      meta: { flex: 1.5, minWidth: 150, maxWidth: 200 },
      enableSorting: false,
    },
  ];
  // Handle edit action
  const handleEdit = useCallback((user: Student) => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  }, []);

  const handleAddStudent = () => {
    setAddDialogOpen(true);
    alert("Add student functionality is not implemented yet.");
  };

  if (isLoading) return <p className="p-4">Loading student details...</p>;
  if (isError)
    return (
      <p className="p-4 text-red-600">
        {(error as Error).message || "Failed to load student details."}
      </p>
    );

  return (
    <main>
      <section>
        <div className="flex items-center justify-between mb-4">
          {/* Search component */}
          <SearchComponent
            data={filterResults}
            displayKey={[
              "childName",
              "className",
              "section",
              "gender",
              "schoolId.schoolName",
              "branchId.branchName",
              "parentId.parentName",
              "parentId.contactNo",
              "deviceId.routeNo",
              "geofenceId.name",
            ]}
            onResults={handleSearchResults}
            className="w-[300px] mb-4"
          />
          {/* Add student button */}
          <Dialog>
            <form>
              <DialogTrigger asChild>
                <Button variant="default">Add student</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add Student</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4">
                  <div className="grid gap-3">
                    <Label htmlFor="childName">Student Name</Label>
                    <Input
                      id="childName"
                      name="childName"
                      placeholder="Enter student name"
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="className">Class</Label>
                    <Input
                      id="className"
                      name="className"
                      placeholder="Enter class name"
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="section">Section</Label>
                    <Input
                      id="section"
                      name="section"
                      placeholder="Enter section"
                    />
                  </div>
                  <div className="grid gap-3">
                    <DatePicker
                      label="Date of Birth"
                      open={open}
                      setOpen={setOpen}
                      date={dob}
                      setDate={setDob}
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="age">Age</Label>
                    <Input
                      id="age"
                      name="age"
                      type="number"
                      min={0}
                      placeholder="Enter age"
                      // defaultValue="@peduarte"
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="geofenceId">Pickup Point</Label>
                    <Input
                      id="geofenceId"
                      name="geofenceId"
                      placeholder="Enter pickup point"
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="section">Section</Label>
                    <Input
                      id="section"
                      name="section"
                      // defaultValue="@peduarte"
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="section">Section</Label>
                    <Input
                      id="section"
                      name="section"
                      // defaultValue="@peduarte"
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="section">Section</Label>
                    <Input
                      id="section"
                      name="section"
                      // defaultValue="@peduarte"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button type="submit">Save changes</Button>
                </DialogFooter>
              </DialogContent>
            </form>
          </Dialog>
        </div>
      </section>
      <section>
        {/* Table component */}
        <CustomTable
          data={filteredData || []}
          columns={columns}
          pageSizeArray={[10, 20, 50]}
          showFilters={true}
          tableClass="bg-white rounded shadow"
        />
      </section>
      {/* Delete student modal */}
      {selectedStudent && (
        <AlertDialog
          open={!!selectedStudent}
          onOpenChange={() => setSelectedStudent(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone and will permanently delete the
                student record along with all associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  deleteStudentMutation.mutate(selectedStudent._id);
                  setSelectedStudent(null);
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </main>
  );
}
