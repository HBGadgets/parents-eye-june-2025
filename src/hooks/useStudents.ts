import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchStudents,
  createStudent,
  updateStudent,
  deleteStudent,
} from "@/lib/api/student";

// READ
export const useStudents = () =>
  useQuery({ queryKey: ["students"], queryFn: fetchStudents });

// CREATE
export const useCreateStudent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createStudent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
  });
};

// UPDATE
export const useUpdateStudent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateStudent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
  });
};

// DELETE
export const useDeleteStudent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteStudent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
  });
};
