import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        try {
          const res = await fetch(queryKey[0] as string, {
            credentials: "include",
          });

          if (!res.ok) {
            if (res.status >= 500) {
              throw new Error(`Sunucu hatası: ${res.status}`);
            }

            const errorText = await res.text();
            throw new Error(errorText || `İstek hatası: ${res.status}`);
          }

          return res.json();
        } catch (error: any) {
          console.error('API Hatası:', error);
          throw error;
        }
      },
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      onError: (error: any) => {
        console.error('Mutation Hatası:', error);
      }
    }
  },
});