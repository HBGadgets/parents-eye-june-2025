"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createTicketType,
  getTicketTypes,
} from "@/services/api/supportService";

export const useTicketType = () => {
  const queryClient = useQueryClient();

  const getTicketTypesQuery = useQuery({
    queryKey: ["ticketTypes"],
    queryFn: () => getTicketTypes(),
    placeholderData: keepPreviousData,
  });

  const createTicketTypeMutation = useMutation({
    mutationFn: (payload: { name: string; description: string }) =>
      createTicketType(payload),
    onSuccess: () => {
      toast.success("Ticket type created successfully");
      queryClient.invalidateQueries({ queryKey: ["ticketTypes"] });
    },
    onError: () => {
      toast.error("Failed to create ticket type");
    },
  });

  return {
    getTicketTypesQuery,
    createTicketTypeMutation,
  };
};
