"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationService, SendNotificationPayload } from "@/services/api/notificationService";
import { toast } from "sonner";

export const useNotification = (historyParams?: Record<string, any>) => {
  const queryClient = useQueryClient();

  const sendNotificationMutation = useMutation({
    mutationFn: (payload: SendNotificationPayload) =>
      notificationService.sendParentNotification(payload),
    onSuccess: () => {
      toast.success("Notification sent successfully to parents!");
      queryClient.invalidateQueries({ queryKey: ["notification-history"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to send notification");
    },
  });

  const useNotificationHistoryQuery = useQuery({
    queryKey: ["notification-history", historyParams],
    queryFn: () => notificationService.getNotificationHistory(historyParams),
    placeholderData: (previousData) => previousData,
    refetchOnWindowFocus: false,
  });

  return {
    sendNotification: sendNotificationMutation.mutate,
    sendNotificationAsync: sendNotificationMutation.mutateAsync,
    isSending: sendNotificationMutation.isPending,
    historyData: useNotificationHistoryQuery.data,
    isHistoryLoading: useNotificationHistoryQuery.isLoading,
    refetchHistory: useNotificationHistoryQuery.refetch,
  };
};
