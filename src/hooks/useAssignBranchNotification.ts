"use client";

import { branchNotificaionService } from "@/services/api/branchNotificaionService";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const useBranchNotifications = (branchId: string, enabled = false) => {
  const queryClient = useQueryClient();

  // ============================
  // GET: Branch Notifications
  // ============================
  const getBranchNotificationsQuery = useQuery({
    queryKey: ["branch-notifications", branchId],
    queryFn: () => branchNotificaionService.getBranchNotifications(branchId),
    enabled,
  });

  // ============================
  // POST: Assign Notification
  // ============================
  const assignNotificationMutation = useMutation({
    mutationFn: (payload: any) =>
      branchNotificaionService.assignBranchNotification(
        branchId as string,
        payload
      ),
    onSuccess: () => {
      toast.success("Notification assigned successfully");
      queryClient.invalidateQueries({
        queryKey: ["branch-notifications", branchId],
      });
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || "Failed to assign notification"
      );
    },
  });

  // ============================
  // PUT: Update Notification
  // ============================
  const updateNotificationMutation = useMutation({
    mutationFn: (payload: any) =>
      branchNotificaionService.updateBranchNotification(
        branchId as string,
        payload
      ),
    onSuccess: () => {
      toast.success("Notification updated successfully");
      queryClient.invalidateQueries({
        queryKey: ["branch-notifications", branchId],
      });
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || "Failed to update notification"
      );
    },
  });

  // ============================
  // DELETE: Notification
  // ============================
  const deleteNotificationMutation = useMutation({
    mutationFn: () =>
      branchNotificaionService.deleteBranchNotification(branchId as string),
    onSuccess: () => {
      toast.success("Notification deleted successfully");
      queryClient.invalidateQueries({
        queryKey: ["branch-notifications", branchId],
      });
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || "Failed to delete notification"
      );
    },
  });

  return {
    // Data
    notifications: getBranchNotificationsQuery.data?.data || {},
    isLoading: getBranchNotificationsQuery.isLoading,
    isFetching: getBranchNotificationsQuery.isFetching,
    refetch: getBranchNotificationsQuery.refetch,

    // Mutations
    assignNotification: assignNotificationMutation.mutate,
    updateNotification: updateNotificationMutation.mutate,
    deleteNotification: deleteNotificationMutation.mutate,

    // Mutation states
    isAssigning: assignNotificationMutation.isPending,
    isUpdating: updateNotificationMutation.isPending,
    isDeleting: deleteNotificationMutation.isPending,
  };
};
