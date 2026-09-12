import { RunRecord, verifyRun } from "./bank-book";
const database = "yuzu-book-archive-v1";
async function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(database, 1);
    req.onupgradeneeded = () =>
      req.result.createObjectStore("runs", { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
export async function saveRun(run: RunRecord) {
  await verifyRun(run);
  const database = await db();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = database.transaction("runs", "readwrite"),
        store = tx.objectStore("runs"),
        get = store.get(run.id);
      get.onsuccess = () => {
        if (!get.result) store.add(run);
        else if (get.result.resultHash !== run.resultHash) tx.abort();
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(Error("Immutable run conflict"));
    });
  } finally {
    database.close();
  }
}
export async function listRuns(): Promise<RunRecord[]> {
  const database = await db();
  try {
    return await new Promise((resolve, reject) => {
      const tx = database.transaction("runs", "readonly"),
        req = tx.objectStore("runs").getAll();
      req.onsuccess = () =>
        resolve(
          req.result.sort((a: RunRecord, b: RunRecord) =>
            b.createdAt.localeCompare(a.createdAt),
          ),
        );
      req.onerror = () => reject(req.error);
    });
  } finally {
    database.close();
  }
}
export async function localArchive(
  method: "GET" | "POST",
  run?: RunRecord,
): Promise<RunRecord[] | { id: string }> {
  const response = await fetch("http://127.0.0.1:8787/runs", {
    method,
    headers:
      method === "POST" ? { "Content-Type": "application/json" } : undefined,
    body: run ? JSON.stringify(run) : undefined,
  });
  if (!response.ok) throw Error(await response.text());
  return response.json();
}
