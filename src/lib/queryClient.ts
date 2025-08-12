import { QueryClient } from "@tanstack/react-query";

export const getQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 30, // 30 minutes
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
};
