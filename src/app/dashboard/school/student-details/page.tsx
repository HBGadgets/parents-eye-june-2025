"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/apiService";
import { CustomTable, CellContent } from "@/components/ui/CustomTable";
import type { ColumnDef } from "@tanstack/react-table";

interface Student {
  _id: string;
  childName: string;
  email: string;
  schoolId: {
    schoolName: string;
  };
  branchId: {
    branchName: string;
  };
  parentId?: {
    parentName: string;
  } | null;
  role: string;
}

export default function StudentDetails() {
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
    staleTime: 5 * 60 * 1000,
  });

  const columns: ColumnDef<Student, CellContent>[] = [
    {
      header: "Name",
      accessorFn: (row) => ({
        type: "text",
        value: row.childName,
      }),
      cell: (info) => info.getValue(),
    },
    {
      header: "Email",
      accessorFn: (row) => ({
        type: "custom",
        render: () => (
          <a
            href={`mailto:${row.email}`}
            className="text-blue-600 hover:underline"
          >
            {row.email}
          </a>
        ),
      }),
      cell: (info) => info.getValue(),
    },
    {
      header: "School",
      accessorFn: (row) => ({
        type: "text",
        value: row.schoolId.schoolName,
      }),
      cell: (info) => info.getValue(),
    },
    {
      header: "Branch",
      accessorFn: (row) => ({
        type: "text",
        value: row.branchId.branchName,
      }),
      cell: (info) => info.getValue(),
    },
    {
      header: "Parent",
      accessorFn: (row) => ({
        type: "text",
        value: row.parentId?.parentName ?? "N/A",
      }),
      cell: (info) => info.getValue(),
    },
    {
      header: "Role",
      accessorFn: (row) => ({
        type: "text",
        value: row.role,
      }),
      cell: (info) => info.getValue(),
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
    <div>
      <CustomTable
        data={students || []}
        columns={columns}
        pageSizeArray={[10, 20, 50]}
        showFilters={true}
        tableClass="bg-white rounded shadow"
      />
    </div>
  );
}
