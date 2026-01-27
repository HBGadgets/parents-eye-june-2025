"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { studentService } from "@/services/api/studentService";
import { PaginationState, SortingState } from "@tanstack/react-table";
import { toast } from "sonner";

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
      filters.routeObjId,
      filters.statusOfRegister,
    ],
    queryFn: () =>
      studentService.getStudents({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: filters.search,
        branchId: filters.branchId,
        schoolId: filters.schoolId,
        routeObjId: filters.routeObjId,
        statusOfRegister: filters.statusOfRegister,
      }),
    placeholderData: keepPreviousData,
  });

  const exportExcelMutation = useMutation({
    mutationFn: (params: Record<string, any>) =>
      studentService.exportExcel(params),
    onSuccess: (blob: Blob) => {
      try {
        // Create a temporary URL for the blob
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Students_${
          new Date().toISOString().split("T")[0]
        }.xlsx`;

        // Trigger download
        document.body.appendChild(link);
        link.click();

        // Cleanup
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast.success("Excel file downloaded successfully.");
      } catch (error) {
        toast.error("Failed to download file.");
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Export failed");
    },
  });

  const exportPdfMutation = useMutation({
    mutationFn: (params: Record<string, any>) =>
      studentService.exportPDF(params),
    onSuccess: (blob: Blob) => {
      try {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Students_${
          new Date().toISOString().split("T")[0]
        }.xlsx`;

        document.body.appendChild(link);
        link.click();

        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast.success("PDF file downloaded successfully.");
      } catch (error) {
        toast.error("Failed to download PDF.");
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "PDF failed");
    },
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

const approveStudent = useMutation({
  mutationFn: ({
    id,
    statusOfRegister,
  }: {
    id: string;
    statusOfRegister: string;
  }) => studentService.approveStudent(id, statusOfRegister),

  onSuccess: (data, variables) => {
    const { statusOfRegister } = variables;

    // Show toast based on action
    if (statusOfRegister === "registered") {
      toast.success("Student Approve");
    } else {
      toast.warning("Student Rejected");
    }

    queryClient.invalidateQueries({ queryKey: ["students"] });
  },

  onError: (err: any) => {
    toast.error(err?.response?.data?.message || "Approval failed");
  },
});



  return {
    students: getStudentsQuery.data?.children || [],
    total: getStudentsQuery.data?.total || 0,
    isLoading: getStudentsQuery.isLoading,
    isFetching: getStudentsQuery.isFetching,
    isPlaceholderData: getStudentsQuery.isPlaceholderData,

    createStudent: createStudentMutation.mutate,
    updateStudent: updateStudentMutation.mutate,
    updateStudentAsync: updateStudentMutation.mutateAsync,
    deleteStudent: deleteStudentMutation.mutate,
    exportExcel: exportExcelMutation.mutate,
    exportPdf: exportPdfMutation.mutate,
    approveStudent: approveStudent.mutate,

    isCreateLoading: createStudentMutation.isPending,
    isUpdateLoading: updateStudentMutation.isPending,
    isDeleteLoading: deleteStudentMutation.isPending,
    isExcelExporting: exportExcelMutation.isPending,
    isPdfExporting: exportPdfMutation.isPending,
    isApproveLoading: approveStudent.isPending
  };
};
