import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import {
  saveProducts, getProducts,
  saveCustomers, getCustomers,
  saveCachedData, getCachedData,
} from "@/lib/offlineDb";
import { startAutoSync, getPendingCount } from "@/lib/syncService";
import type { Product, Customer } from "@shared/schema";

interface OfflineContextType {
  isOnline: boolean;
  pendingCount: number;
  refreshCount: () => void;
}

export const OfflineContext = createContext<OfflineContextType>({
  isOnline: true,
  pendingCount: 0,
  refreshCount: () => {},
});

export function useOfflineContext() {
  return useContext(OfflineContext);
}

export function useOfflineProviderValue(qc: QueryClient) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const syncCleanup = useRef<(() => void) | null>(null);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  const refreshCount = useCallback(() => {
    getPendingCount().then(setPendingCount).catch(() => {});
  }, []);

  useEffect(() => {
    refreshCount();
    syncCleanup.current = startAutoSync((result) => {
      refreshCount();
      if (result.synced > 0) {
        qc.invalidateQueries({ queryKey: ["/api/products"] });
        qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
        qc.invalidateQueries({ queryKey: ["/api/bills"] });
      }
    });
    return () => {
      if (syncCleanup.current) syncCleanup.current();
    };
  }, [refreshCount, qc]);

  useEffect(() => {
    refreshCount();
  }, [isOnline, refreshCount]);

  return { isOnline, pendingCount, refreshCount };
}

export function useOnlineStatus() {
  return useOfflineContext().isOnline;
}

export function usePendingSync() {
  const { pendingCount, refreshCount } = useOfflineContext();
  return { pendingCount, refreshCount };
}

export function useOfflineProducts() {
  const { isOnline } = useOfflineContext();
  const queryClient = useQueryClient();

  const query = useQuery<Product[]>({
    queryKey: ["/api/products"],
    enabled: isOnline,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (query.data && query.data.length > 0) {
      saveProducts(query.data).catch(() => {});
    }
  }, [query.data]);

  useEffect(() => {
    if (!isOnline && !query.data) {
      getProducts().then((cached) => {
        if (cached.length > 0) {
          queryClient.setQueryData(["/api/products"], cached);
        }
      }).catch(() => {});
    }
  }, [isOnline, query.data, queryClient]);

  return query;
}

export function useOfflineCustomers() {
  const { isOnline } = useOfflineContext();
  const queryClient = useQueryClient();

  const query = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    enabled: isOnline,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (query.data && query.data.length > 0) {
      saveCustomers(query.data).catch(() => {});
    }
  }, [query.data]);

  useEffect(() => {
    if (!isOnline && !query.data) {
      getCustomers().then((cached) => {
        if (cached.length > 0) {
          queryClient.setQueryData(["/api/customers"], cached);
        }
      }).catch(() => {});
    }
  }, [isOnline, query.data, queryClient]);

  return query;
}

export function useOfflineDashboard() {
  const { isOnline } = useOfflineContext();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["/api/dashboard"],
    enabled: isOnline,
    staleTime: 1000 * 60 * 2,
  });

  useEffect(() => {
    if (query.data) {
      saveCachedData("dashboard", query.data).catch(() => {});
    }
  }, [query.data]);

  useEffect(() => {
    if (!isOnline && !query.data) {
      getCachedData("dashboard").then((cached) => {
        if (cached) {
          queryClient.setQueryData(["/api/dashboard"], cached);
        }
      }).catch(() => {});
    }
  }, [isOnline, query.data, queryClient]);

  return query;
}
