import { getPendingBills, removePendingBill, savePendingBill } from "./offlineDb";
import { apiRequest } from "./queryClient";

let isSyncing = false;
let syncStarted = false;
let syncInterval: ReturnType<typeof setInterval> | null = null;
let onSyncCallback: ((result: { synced: number; failed: number }) => void) | null = null;

async function trySync() {
  if (navigator.onLine) {
    const result = await syncPendingBills();
    if (result.synced > 0 && onSyncCallback) {
      onSyncCallback(result);
    }
  }
}

function handleOnline() {
  setTimeout(trySync, 2000);
}

export async function syncPendingBills(): Promise<{ synced: number; failed: number }> {
  if (isSyncing || !navigator.onLine) return { synced: 0, failed: 0 };

  isSyncing = true;
  let synced = 0;
  let failed = 0;

  try {
    const pending = await getPendingBills();
    for (const bill of pending) {
      try {
        const { pendingAt, ...billData } = bill;
        await apiRequest("POST", "/api/bills", billData);
        await removePendingBill(bill.billNumber);
        synced++;
      } catch {
        failed++;
      }
    }
  } finally {
    isSyncing = false;
  }

  return { synced, failed };
}

export async function createBillOffline(billData: any): Promise<void> {
  await savePendingBill(billData);
}

export async function getPendingCount(): Promise<number> {
  const pending = await getPendingBills();
  return pending.length;
}

export function startAutoSync(onSync?: (result: { synced: number; failed: number }) => void) {
  if (onSync) {
    onSyncCallback = onSync;
  }

  if (syncStarted) {
    return () => {};
  }

  syncStarted = true;
  syncInterval = setInterval(trySync, 30000);
  window.addEventListener("online", handleOnline);
  trySync();

  return () => {
    if (syncInterval) {
      clearInterval(syncInterval);
      syncInterval = null;
    }
    window.removeEventListener("online", handleOnline);
    syncStarted = false;
    onSyncCallback = null;
  };
}
