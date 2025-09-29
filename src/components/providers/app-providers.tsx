"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useEffect, useState } from "react";
import { Analytics } from "./analytics";
import { Toaster } from "sonner";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { NavigationProvider } from "@/providers/navigation-provider";

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 1000 * 30,
          },
        },
      }),
  );

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    let cancelled = false;

    async function loadAxe() {
      try {
        const [{ default: axe }, React] = await Promise.all([
          import("@axe-core/react"),
          import("react"),
        ]);
        if (!cancelled && typeof window !== "undefined") {
          axe(React, window, 1000);
        }
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.warn("Accessibility tooling (axe-core) unavailable", error);
        }
      }
    }

    loadAxe();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <NavigationProvider>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            classNames: {
              toast:
                "bg-white/80 dark:bg-zinc-900/80 backdrop-blur shadow-lg border border-zinc-200/50",
            },
          }}
        />
        {process.env.NODE_ENV === "development" ? (
          <ReactQueryDevtools initialIsOpen={false} />
        ) : null}
        <Analytics />
      </NavigationProvider>
    </QueryClientProvider>
  );
}
