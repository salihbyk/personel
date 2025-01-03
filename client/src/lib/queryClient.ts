import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const res = await fetch(queryKey[0] as string);

        if (!res.ok) {
          if (res.status >= 500) {
            throw new Error(`${res.status}: ${res.statusText}`);
          }

          throw new Error(`${res.status}: ${await res.text()}`);
        }

        return res.json();
      },
      // Enable automatic background refresh
      staleTime: 30000, // Consider data fresh for 30 seconds
      refetchInterval: 30000, // Refetch every 30 seconds
      refetchOnWindowFocus: true, // Refetch when window regains focus
      retry: 1,
    },
    mutations: {
      retry: false,
      // Automatically invalidate queries after mutations
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
        queryClient.invalidateQueries({ queryKey: ["/api/leaves"] });
        queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      },
    }
  },
});