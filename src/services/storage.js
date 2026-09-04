const memoryStorage = new Map();

function storage() {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function read(key, fallback) {
  try {
    const store = storage();
    const value = store ? store.getItem(key) : memoryStorage.get(key);
    if (!value) return fallback;
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed) || !key.toLowerCase().includes("cart")) return parsed;
    return parsed
      .filter((item) => item && typeof item === "object")
      .map((item) => ({
        ...item,
        modId: item.modId || item.mod_id || item.id || "",
        version: item.version || item.version_id || "",
        kind: item.kind || (item.source === "factorio" ? "direct" : "direct"),
        title: item.title || item.filename || "",
      }));
  } catch {
    return fallback;
  }
}

export function readCompatible(keys, fallback) {
  for (const key of keys) {
    const value = read(key, undefined);
    if (value !== undefined && value !== null) return value;
  }
  return fallback;
}

export function normalizeCart(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => ({
      ...item,
      title: item.title || item.filename || item.name || "mod-file",
      url: item.url || item.downloadUrl || "",
      modId: item.modId || item.mod_id || item.projectId || item.project_id || item.id || "",
      version: item.version || item.versionId || item.version_id || "",
      downloadUrl: item.downloadUrl || item.download_url || "",
      kind: item.kind || "direct",
    }))
    .filter((item) => item.url);
}

export function write(key, value) {
  try {
    const serialized = JSON.stringify(value);
    const store = storage();
    if (store) store.setItem(key, serialized);
    else memoryStorage.set(key, serialized);
  } catch {
    memoryStorage.set(key, JSON.stringify(value));
  }
}

export function saveCartProfile(name, cart) {
  const profile = {
    format: "iara-mod-manager-cart",
    version: 1,
    name: String(name || "cart"),
    savedAt: new Date().toISOString(),
    items: normalizeCart(cart),
  };
  downloadJson(`${profile.name.replace(/[^\w.-]+/g, "_")}.json`, profile);
}

export function parseCartProfile(text) {
  const parsed = JSON.parse(text);
  const items = Array.isArray(parsed) ? parsed : parsed?.items;
  if (!Array.isArray(items)) throw new Error("Invalid cart profile: items missing");
  return normalizeCart(items);
}

export function downloadJson(name, value) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 0);
}
