// Local MongoDB client adapter via Mongoose Express API
export const db = "local-mongo";

const cache = new Map();
const CACHE_TTL = 3000; // 3 seconds cache TTL for lightning fast tab switching

function getCached(key) {
  const item = cache.get(key);
  if (item && (Date.now() - item.time < CACHE_TTL)) {
    return item.data;
  }
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, time: Date.now() });
}

function invalidateCollectionCache(collectionName) {
  for (const key of cache.keys()) {
    if (key.startsWith(collectionName)) {
      cache.delete(key);
    }
  }
}

export function collection(db, collectionName) {
  return { collectionName };
}

export function doc(db, collectionName, id) {
  if (typeof db === "object" && db.collectionName) {
    return { collectionName: db.collectionName, id: String(collectionName) };
  }
  return { collectionName, id: String(id) };
}

export async function getDoc(docRef) {
  try {
    const cacheKey = `${docRef.collectionName}:${docRef.id}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const res = await fetch(`/api/db/${docRef.collectionName}/${encodeURIComponent(docRef.id)}`);
    if (!res.ok) {
      const emptyResult = { exists: () => false, data: () => null, id: docRef.id };
      return emptyResult;
    }
    const data = await res.json();
    const isValid = data !== null && typeof data === "object" && !data.error && Object.keys(data).length > 0;
    const docId = String(docRef.id);
    const normalizedData = isValid ? { ...data, id: data.id || data._id || docId, _id: data._id || data.id || docId } : null;

    const result = {
      exists: () => isValid,
      data: () => normalizedData,
      id: docId
    };
    if (isValid) setCache(cacheKey, result);
    return result;
  } catch (err) {
    return { exists: () => false, data: () => null, id: docRef.id };
  }
}

export async function getDocs(queryOrCollRef) {
  try {
    const collectionName = queryOrCollRef.collectionName;
    const isQuery = queryOrCollRef.whereFilters && queryOrCollRef.whereFilters.length > 0;
    const cacheKey = isQuery 
      ? `${collectionName}:query:${JSON.stringify(queryOrCollRef.whereFilters)}`
      : `${collectionName}:all`;

    const cached = getCached(cacheKey);
    if (cached) return cached;

    let docs = [];
    if (isQuery) {
      const res = await fetch(`/api/db-query/${collectionName}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filters: queryOrCollRef.whereFilters })
      });
      docs = await res.json();
    } else {
      const res = await fetch(`/api/db/${collectionName}`);
      docs = await res.json();
    }

    const list = Array.isArray(docs) ? docs : [];
    const normalizedList = list.map(d => {
      if (!d || typeof d !== "object") return null;
      const docId = String(d.id || d._id || "");
      return { ...d, id: docId, _id: docId };
    }).filter(Boolean);

    const result = {
      docs: normalizedList.map(d => ({ id: d.id, data: () => d })),
      forEach: (cb) => normalizedList.forEach(d => cb({ id: d.id, data: () => d })),
      size: normalizedList.length,
      empty: normalizedList.length === 0
    };
    setCache(cacheKey, result);
    return result;
  } catch (err) {
    return { docs: [], forEach: () => {}, size: 0, empty: true };
  }
}

export async function setDoc(docRef, data, options) {
  try {
    invalidateCollectionCache(docRef.collectionName);
    const res = await fetch(`/api/db/${docRef.collectionName}/${encodeURIComponent(docRef.id)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, merge: options?.merge })
    });
    return await res.json();
  } catch (err) {
    console.error("setDoc error:", err);
  }
}

export async function updateDoc(docRef, data) {
  try {
    invalidateCollectionCache(docRef.collectionName);
    const res = await fetch(`/api/db/${docRef.collectionName}/${encodeURIComponent(docRef.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    return await res.json();
  } catch (err) {
    console.error("updateDoc error:", err);
  }
}

export async function deleteDoc(docRef) {
  try {
    invalidateCollectionCache(docRef.collectionName);
    const res = await fetch(`/api/db/${docRef.collectionName}/${encodeURIComponent(docRef.id)}`, {
      method: "DELETE"
    });
    return await res.json();
  } catch (err) {
    console.error("deleteDoc error:", err);
  }
}

export async function addDoc(collRef, data) {
  try {
    invalidateCollectionCache(collRef.collectionName);
    const res = await fetch(`/api/db/${collRef.collectionName}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    return { id: result.id || result._id };
  } catch (err) {
    console.error("addDoc error:", err);
    return { id: null };
  }
}

export function query(collRef, ...whereClauses) {
  return {
    collectionName: collRef.collectionName,
    whereFilters: whereClauses.map(w => w.filter)
  };
}

export function where(field, op, value) {
  return { filter: { field, op, value } };
}

export function arrayUnion(...elements) {
  return { __op: "arrayUnion", elements };
}

export function arrayRemove(...elements) {
  return { __op: "arrayRemove", elements };
}

export function increment(value) {
  return { __op: "increment", value };
}

export function serverTimestamp() {
  return new Date().toISOString();
}

export function writeBatch(db) {
  const operations = [];
  return {
    set(docRef, data, options) {
      operations.push({ type: "set", docRef, data, options });
    },
    update(docRef, data) {
      operations.push({ type: "update", docRef, data });
    },
    delete(docRef) {
      operations.push({ type: "delete", docRef });
    },
    async commit() {
      for (const op of operations) {
        if (op.type === "set") await setDoc(op.docRef, op.data, op.options);
        else if (op.type === "update") await updateDoc(op.docRef, op.data);
        else if (op.type === "delete") await deleteDoc(op.docRef);
      }
    }
  };
}

export function onSnapshot(target, callback) {
  const poll = async () => {
    try {
      if (target.id) {
        const snap = await getDoc(target);
        callback(snap);
      } else {
        const snap = await getDocs(target);
        callback(snap);
      }
    } catch (e) {
      console.error("onSnapshot error:", e);
    }
  };
  poll();
  const interval = setInterval(poll, 4000);
  return () => clearInterval(interval);
}
