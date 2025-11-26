"use client";

import { Model, GetModelsResponse } from "@/interface/modal";
import { modelService } from "@/services/api/modelService";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const useModels = () => {
  const queryClient = useQueryClient();

  // GET ALL MODELS
  const getModelsQuery = useQuery<GetModelsResponse>({
    queryKey: ["models"],
    queryFn: modelService.getModels,
    select: (res) => res.data, // return only data array
  });

  // CREATE MODEL
  const createModelMutation = useMutation({
    mutationFn: modelService.createModel,
    onSuccess: () => {
      toast.success("Model created successfully");
      queryClient.invalidateQueries(["models"]);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create model");
    },
  });

  // UPDATE MODEL
  const updateModelMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: { modelName: string };
    }) => modelService.updateModel(id, payload),
    onSuccess: () => {
      toast.success("Model updated successfully");
      queryClient.invalidateQueries(["models"]);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update model");
    },
  });

  // DELETE MODEL
  const deleteModelMutation = useMutation({
    mutationFn: (id: string) => modelService.deleteModel(id),
    onSuccess: () => {
      toast.success("Model deleted successfully");
      queryClient.invalidateQueries(["models"]);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete model");
    },
  });

  return {
    // Queries
    models: getModelsQuery.data || [],
    isLoading: getModelsQuery.isLoading,

    // Mutations
    createModel: createModelMutation.mutate,
    updateModel: updateModelMutation.mutate,
    deleteModel: deleteModelMutation.mutate,

    // Mutation loading states
    isCreating: createModelMutation.isPending,
    isUpdating: updateModelMutation.isPending,
    isDeleting: deleteModelMutation.isPending,
  };
};
