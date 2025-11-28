"use client";

import { GetCategoriesResponse } from "@/interface/modal";
import { categoryService } from "@/services/api/categoryService";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const useCategory = () => {
  const queryClient = useQueryClient();

  // GET
  const getCategoryQuery = useQuery<GetCategoriesResponse>({
    queryKey: ["categories"],
    queryFn: categoryService.getCategories,
    select: (res) => res.data,
  });

  // CREATE
  const createCategoryMutation = useMutation({
    mutationFn: categoryService.createCategory,
    onSuccess: () => {
      toast.success("Category created");
      queryClient.invalidateQueries(["categories"]);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Create failed");
    },
  });

  // UPDATE
  const updateCategoryMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: { categoryName: string };
    }) => categoryService.updateCategory(id, payload),
    onSuccess: () => {
      toast.success("Category updated");
      queryClient.invalidateQueries(["categories"]);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Update failed");
    },
  });

  // DELETE
  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => categoryService.deleteCategory(id),
    onSuccess: () => {
      toast.success("Category deleted");
      queryClient.invalidateQueries(["categories"]);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Delete failed");
    },
  });

  return {
    categories: getCategoryQuery.data || [],
    isLoading: getCategoryQuery.isLoading,

    createCategory: createCategoryMutation.mutate,
    updateCategory: updateCategoryMutation.mutate,
    deleteCategory: deleteCategoryMutation.mutate,

    isCreating: createCategoryMutation.isPending,
    isUpdating: updateCategoryMutation.isPending,
    isDeleting: deleteCategoryMutation.isPending,
  };
};
