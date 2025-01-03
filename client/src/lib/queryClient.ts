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
            if (res.status === 401 && process.env.NODE_ENV === 'production') {
              // Production'da auth hatalarını yoksay
              return null;
            }

            if (res.status >= 500) {
              throw new Error(`${res.status}: ${res.statusText}`);
            }

            throw new Error(`${res.status}: ${await res.text()}`);
          }

          return res.json();
        } catch (error) {
          if (process.env.NODE_ENV === 'production') {
            console.error('API Error:', error);
            return null;
          }
          throw error;
        }
      },
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: process.env.NODE_ENV === 'production' ? 3 : false,
    },
    mutations: {
      retry: false,
    }
  },
});