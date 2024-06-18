class VueFileCache {
  constructor() {
    this.cache = new Map();
    this.idCounter = 0;
    this.cleanupInterval = setInterval(() => this.cleanupCache(), 600000); // Cleanup every 10 minutes
  }

  generateUniqueId() {
    return `cache-${Date.now()}-${++this.idCounter}`;
  }

  addCache(vueContent, vueFileName, additionalData) {
    const cacheId = this.generateUniqueId();
    const cacheEntry = { widget: vueContent, name: vueFileName, data: additionalData, time: Date.now() };
    this.cache.set(cacheId, cacheEntry);
    return cacheId;
  }

  getCache(cacheId) {
    const cacheEntry = this.cache.get(cacheId);
    if (cacheEntry) {
      cacheEntry.lastAccessed = Date.now();
      return cacheEntry;
    }
    return null;
  }

  deleteCache(cacheId) {
    return this.cache.delete(cacheId);
  }

  cleanupCache() {
    const now = Date.now();
    for (const [cacheId, cacheEntry] of this.cache.entries()) {
      if (now - cacheEntry.lastAccessed > 600000) { // 10 minutes in milliseconds
        this.cache.delete(cacheId);
      }
    }
  }
}
export default new VueFileCache()