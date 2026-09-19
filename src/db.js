let database;
export async function openDatabase() {
  if (database) return database;
  database = new Promise((resolve, reject) => {
    const request = indexedDB.open(new URLSearchParams(location.search).has('demo')?'chrs-radio-room-study':'chrs-radio-room', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('preferences');
      request.result.createObjectStore('radios', {keyPath:'id'});
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Storage is open in an older tab.'));
  });
  return database;
}
export async function read(store, key) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const req = key === undefined ? db.transaction(store).objectStore(store).getAll() : db.transaction(store).objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
export async function write(store, value, key) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    if (key === undefined) tx.objectStore(store).put(value); else tx.objectStore(store).put(value, key);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
