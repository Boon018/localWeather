export const Store = {
  prefix: "alpen.v1.",
  memory: new Map(),
  blocked: false,
  get(k, f = null) {
    if (this.memory.has(k)) return this.memory.get(k);
    try {
      const raw = localStorage.getItem(this.prefix + k);
      return raw === null ? f : JSON.parse(raw);
    } catch {
      this.blocked = true;
      return f;
    }
  },
  set(k, v) {
    this.memory.set(k, v);
    try {
      localStorage.setItem(this.prefix + k, JSON.stringify(v));
      return true;
    } catch {
      this.blocked = true;
      return false;
    }
  },
  keys() {
    let disk = [];
    try {
      disk = Object.keys(localStorage)
        .filter((k) => k.startsWith(this.prefix))
        .map((k) => k.slice(this.prefix.length));
    } catch {
      this.blocked = true;
    }
    return [...new Set([...disk, ...this.memory.keys()])];
  },
  remove(k) {
    this.memory.delete(k);
    try {
      localStorage.removeItem(this.prefix + k);
    } catch {
      this.blocked = true;
    }
  },
  clear() {
    this.keys().forEach((k) => this.remove(k));
  },
};
export const priorCacheProbe = Store.get("persistenceProbe");
Store.set("persistenceProbe", {
  writtenAt: Date.now(),
  id: Math.random().toString(36).slice(2),
});
