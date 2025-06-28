"use client";

import React, { useState } from "react";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/apiService";
import { CustomTable, CellContent } from "@/components/ui/CustomTable";
import type { ColumnDef } from "@tanstack/react-table";

interface Student {
  _id: string;
  childName: string;
  className: string;
  section: string;
  DOB: string;
  age: number;
  gender: string;
  geofenceId: {
    _id: string;
    name: string;
  };
  deviceId: {
    _id: string;
    name: string;
    routeNo: string;
  };
  assignDevice: boolean;
  parentId: {
    _id: string;
    parentName: string;
    contactNo: string;
    userName: string;
    password: string;
  };
  schoolId: {
    _id: string;
    schoolName: string;
  };
  branchId: {
    _id: string;
    branchName: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function StudentDetails() {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const queryClient = useQueryClient();

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

  const columns: ColumnDef<Student, CellContent>[] = [
    {
      header: "Student Name",
      accessorFn: (row) => ({
        type: "text",
        value: row.childName ?? "",
      }),
      cell: (info) => info.getValue(),
      meta: { minWidth: 200 },
    },
    {
      header: "Class",
      accessorFn: (row) => ({
        type: "text",
        value: row.className ?? "",
      }),
      cell: (info) => info.getValue(),
      meta: { minWidth: 150 },
    },
    {
      header: "Route No",
      accessorFn: (row) => ({
        type: "text",
        value: row.deviceId?.routeNo ?? "",
      }),
      cell: (info) => info.getValue(),
      meta: { minWidth: 150 },
    },
    {
      header: "Section",
      accessorFn: (row) => ({
        type: "text",
        value: row.section ?? "",
      }),
      cell: (info) => info.getValue(),
      meta: { minWidth: 150 },
    },
    {
      header: "School",
      accessorFn: (row) => ({
        type: "text",
        value: row.schoolId?.schoolName ?? "",
      }),
      cell: (info) => info.getValue(),
      meta: { minWidth: 150 },
    },
    {
      header: "Branch",
      accessorFn: (row) => ({
        type: "text",
        value: row.branchId?.branchName ?? "",
      }),
      cell: (info) => info.getValue(),
      meta: { minWidth: 150 },
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
      meta: { minWidth: 150 },
    },
    {
      header: "Age",
      accessorFn: (row) => ({
        type: "text",
        value: row.age?.toString() ?? "",
      }),
      cell: (info) => info.getValue(),
      meta: { minWidth: 150 },
    },
    {
      header: "Parent Name",
      accessorFn: (row) => ({
        type: "text",
        value: row.parentId?.parentName ?? "",
      }),
      cell: (info) => info.getValue(),
      meta: { minWidth: 200 },
    },
    {
      header: "Contact No",
      accessorFn: (row) => ({
        type: "text",
        value: row.parentId?.contactNo ?? "",
      }),
      cell: (info) => info.getValue(),
      meta: { minWidth: 200 },
    },
    {
      header: "Gender",
      accessorFn: (row) => ({
        type: "text",
        value: row.gender ?? "",
      }),
      cell: (info) => info.getValue(),
      meta: { minWidth: 200 },
    },
    {
      header: "Bus No.",
      accessorFn: (row) => ({
        type: "text",
        value: row.deviceId?.name ?? "",
      }),
      cell: (info) => info.getValue(),
      meta: { minWidth: 200 },
    },
    {
      header: "Pickup Point",
      accessorFn: (row) => ({
        type: "text",
        value: row.geofenceId?.name ?? "",
      }),
      cell: (info) => info.getValue(),
      meta: { minWidth: 200 },
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
      meta: { minWidth: 250 },
    },
    {
      header: "UserName",
      accessorFn: (row) => ({
        type: "text",
        value: row.parentId?.userName ?? "",
      }),
      cell: (info) => info.getValue(),
      meta: { minWidth: 150 },
    },
    {
      header: "Password",
      accessorFn: (row) => ({
        type: "text",
        value: row.parentId?.password ?? "",
      }),
      cell: (info) => info.getValue(),
      meta: { minWidth: 200 },
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

  if (isLoading) return <p className="p-4">Loading student details...</p>;
  if (isError)
    return (
      <p className="p-4 text-red-600">
        {(error as Error).message || "Failed to load student details."}
      </p>
    );

  return (
    <main>
      <section>{/* Optional search here */}</section>
      <section>
        <CustomTable
          data={students || []}
          columns={columns}
          pageSizeArray={[10, 20, 50]}
          showFilters={true}
          tableClass="bg-white rounded shadow"
        />
      </section>
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
