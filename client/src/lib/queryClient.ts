import { QueryClient } from "@tanstack/react-query";

// API Base URL - Production'da backend URL'ini kullan
export const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const endpoint = queryKey[0] as string;
        const url = `${API_BASE_URL}${endpoint}`;
        
        const res = await fetch(url, {
          credentials: "include",
        });

        if (!res.ok) {
          if (res.status >= 500) {
            throw new Error(`${res.status}: ${res.statusText}`);
          }

          throw new Error(`${res.status}: ${await res.text()}`);
        }

        return res.json();
      },
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    }
  },
});