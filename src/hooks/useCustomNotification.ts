"use client";

import { customNotificationService } from "@/services/api/customNotificationService";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { PaginationState, SortingState } from "@tanstack/react-table";
import { toast } from "sonner";

export const useCustomNotification = (
  pagination?: any,
  sorting?: any,
  filters?: Record<string, any>
) => {
  const queryClient = useQueryClient();

  const getCustomMessagesQuery = useQuery({
    queryKey: [
      "custom-notification",
      pagination?.pageIndex,
      pagination?.pageSize,
      filters?.search,
    ],
    queryFn: () =>
      customNotificationService.getCustomMessages({
        page: pagination ? pagination.pageIndex + 1 : undefined,
        limit: pagination?.pageSize,
        search: filters?.search,
      }),
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const sendCustomMessageMutation = useMutation({
    mutationFn: (formData: FormData) =>
      customNotificationService.sendCustomMessage(formData),
    onSuccess: () => {
      toast.success("Notification sent successfully");
      queryClient.invalidateQueries({ queryKey: ["custom-notification"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to send notification");
    },
  });

  return {
    messages: getCustomMessagesQuery.data?.data || [],
    total: getCustomMessagesQuery.data?.totalCount || 0,
    isLoading: getCustomMessagesQuery.isLoading,
    isFetching: getCustomMessagesQuery.isFetching,
    isPlaceholderData: getCustomMessagesQuery.isPlaceholderData,

    sendCustomMessage: sendCustomMessageMutation.mutate,
    isSending: sendCustomMessageMutation.isPending,
  };
};
