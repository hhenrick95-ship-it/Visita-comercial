import { useState, useEffect, useCallback } from "react";

interface PendingOperation {
  id: string;
  type: "insert" | "update" | "delete";
  table: string;
  data: any;
  timestamp: number;
}

const DB_NAME = "visitas-lopes-offline";
const DB_VERSION = 1;
const STORE_NAME = "pending-operations";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
}

async function addPendingOperation(operation: PendingOperation): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(operation);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

async function getAllPendingOperations(): Promise<PendingOperation[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function clearPendingOperations(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

async function removePendingOperation(id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Update pending count
  const updatePendingCount = useCallback(async () => {
    try {
      const operations = await getAllPendingOperations();
      setPendingCount(operations.length);
    } catch (error) {
      console.error("Error getting pending count:", error);
    }
  }, []);

  // Add operation to pending queue
  const addToPendingQueue = useCallback(async (
    type: "insert" | "update" | "delete",
    table: string,
    data: any
  ) => {
    const operation: PendingOperation = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      table,
      data,
      timestamp: Date.now()
    };

    await addPendingOperation(operation);
    await updatePendingCount();
  }, [updatePendingCount]);

  // Sync pending operations
  const syncPendingOperations = useCallback(async () => {
    if (!isOnline || isSyncing) return;

    setIsSyncing(true);
    try {
      const operations = await getAllPendingOperations();

      for (const operation of operations) {
        try {
          // Import supabase dynamically to avoid circular dependencies
          const { supabase } = await import("@/integrations/supabase/client");

          // Use raw SQL-like approach for dynamic table names
          const tableName = operation.table as "visit_forms" | "feedbacks" | "form_responses";

          if (operation.type === "insert") {
            const { error } = await supabase
              .from(tableName)
              .insert(operation.data);
            if (error) throw error;
          } else if (operation.type === "update") {
            const { error } = await supabase
              .from(tableName)
              .update(operation.data.updates)
              .eq("id", operation.data.id);
            if (error) throw error;
          } else if (operation.type === "delete") {
            const { error } = await supabase
              .from(tableName)
              .delete()
              .eq("id", operation.data.id);
            if (error) throw error;
          }

          await removePendingOperation(operation.id);
        } catch (error) {
          console.error(`Error syncing operation ${operation.id}:`, error);
          // Keep operation in queue for retry
        }
      }

      await updatePendingCount();
      setLastSyncTime(new Date());
    } catch (error) {
      console.error("Error syncing:", error);
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, updatePendingCount]);

  // Clear all pending operations
  const clearQueue = useCallback(async () => {
    await clearPendingOperations();
    await updatePendingCount();
  }, [updatePendingCount]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when coming back online
      syncPendingOperations();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial count
    updatePendingCount();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncPendingOperations, updatePendingCount]);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    lastSyncTime,
    addToPendingQueue,
    syncPendingOperations,
    clearQueue
  };
}
