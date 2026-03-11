const DB_NAME = "tayyab-pos-db";
const DB_VERSION = 1;

const STORES = {
  products: "products",
  customers: "customers",
  pendingBills: "pendingBills",
  cachedData: "cachedData",
};

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORES.products)) {
        db.createObjectStore(STORES.products, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORES.customers)) {
        db.createObjectStore(STORES.customers, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORES.pendingBills)) {
        db.createObjectStore(STORES.pendingBills, { keyPath: "billNumber" });
      }
      if (!db.objectStoreNames.contains(STORES.cachedData)) {
        db.createObjectStore(STORES.cachedData, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getStore(storeName: string, mode: IDBTransactionMode = "readonly") {
  const db = await openDB();
  const tx = db.transaction(storeName, mode);
  return { store: tx.objectStore(storeName), tx };
}

export async function saveProducts(products: any[]) {
  const { store, tx } = await getStore(STORES.products, "readwrite");
  const clearReq = store.clear();
  await new Promise<void>((resolve, reject) => {
    clearReq.onsuccess = () => resolve();
    clearReq.onerror = () => reject(clearReq.error);
  });
  for (const product of products) {
    store.put(product);
  }
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getProducts(): Promise<any[]> {
  const { store } = await getStore(STORES.products);
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveCustomers(customers: any[]) {
  const { store, tx } = await getStore(STORES.customers, "readwrite");
  const clearReq = store.clear();
  await new Promise<void>((resolve, reject) => {
    clearReq.onsuccess = () => resolve();
    clearReq.onerror = () => reject(clearReq.error);
  });
  for (const customer of customers) {
    store.put(customer);
  }
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCustomers(): Promise<any[]> {
  const { store } = await getStore(STORES.customers);
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function savePendingBill(bill: any) {
  const { store, tx } = await getStore(STORES.pendingBills, "readwrite");
  store.put({ ...bill, pendingAt: Date.now() });
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingBills(): Promise<any[]> {
  const { store } = await getStore(STORES.pendingBills);
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function removePendingBill(billNumber: string) {
  const { store, tx } = await getStore(STORES.pendingBills, "readwrite");
  store.delete(billNumber);
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveCachedData(key: string, data: any) {
  const { store, tx } = await getStore(STORES.cachedData, "readwrite");
  store.put({ key, data, updatedAt: Date.now() });
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCachedData(key: string): Promise<any | null> {
  const { store } = await getStore(STORES.cachedData);
  return new Promise((resolve, reject) => {
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result?.data || null);
    req.onerror = () => reject(req.error);
  });
}
