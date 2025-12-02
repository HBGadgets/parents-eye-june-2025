"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { studentService } from "@/services/api/studentService";
import { PaginationState, SortingState } from "@tanstack/react-table";
import { toast } from "sonner";
import { createStudent } from "@/lib/api/student";

export const useStudent = (
  pagination: PaginationState,
  sorting: SortingState,
  filters: Record<string, any>
) => {
  const queryClient = useQueryClient();

  const getStudentsQuery = useQuery({
    queryKey: [
      "students",
      pagination.pageIndex,
      pagination.pageSize,
      sorting,
      filters.search,
      filters.schoolId,
      filters.branchId,
    ],
    queryFn: () =>
      studentService.getStudents({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: filters.search,
        branchId: filters.branchId,
        schoolId: filters.schoolId,
      }),
    keepPreviousData: true,
  });

  const createStudentMutation = useMutation({
    mutationFn: studentService.createStudent,
    onSuccess: () => {
      toast.success("Student created successfully");
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Create failed");
    },
  });

  const updateStudentMutation = useMutation({
    mutationFn: ({ id, payload }: any) =>
      studentService.updateStudent(id, payload),
    onSuccess: () => {
      toast.success("Student updated successfully");
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Update failed");
    },
  });

  const deleteStudentMutation = useMutation({
    mutationFn: studentService.deleteStudent,
    onSuccess: () => {
      toast.success("Student deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Delete failed");
    },
  });

  return {
    students: getStudentsQuery.data?.children || [],
    total: getStudentsQuery.data?.total || 0,
    isLoading: getStudentsQuery.isLoading,

    createStudent: createStudentMutation.mutate,
    updateStudent: updateStudentMutation.mutate,
    deleteStudent: deleteStudentMutation.mutate,

    isCreateLoading: createStudentMutation.isPending,
    isUpdateLoading: updateStudentMutation.isPending,
    isDeleteLoading: deleteStudentMutation.isPending,
  };
};
