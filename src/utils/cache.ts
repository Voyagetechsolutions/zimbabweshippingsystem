/**
 * Client-side caching utilities
 * Provides in-memory and localStorage caching strategies
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class CacheManager {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Set item in cache
   */
  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
    };

    this.memoryCache.set(key, entry);

    // Also save to localStorage for persistence
    try {
      localStorage.setItem(
        `cache_${key}`,
        JSON.stringify(entry)
      );
    } catch (error) {
      // Silently fail if localStorage is full or unavailable
      console.warn('Failed to save to localStorage:', error);
    }
  }

  /**
   * Get item from cache
   */
  get<T>(key: string): T | null {
    // Try memory cache first
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && memoryEntry.expiresAt > Date.now()) {
      return memoryEntry.data as T;
    }

    // Try localStorage
    try {
      const stored = localStorage.getItem(`cache_${key}`);
      if (stored) {
        const entry: CacheEntry<T> = JSON.parse(stored);
        if (entry.expiresAt > Date.now()) {
          // Restore to memory cache
          this.memoryCache.set(key, entry);
          return entry.data;
        } else {
          // Expired, remove it
          this.delete(key);
        }
      }
    } catch (error) {
      console.warn('Failed to read from localStorage:', error);
    }

    return null;
  }

  /**
   * Delete item from cache
   */
  delete(key: string): void {
    this.memoryCache.delete(key);
    try {
      localStorage.removeItem(`cache_${key}`);
    } catch (error) {
      console.warn('Failed to delete from localStorage:', error);
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.memoryCache.clear();
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('cache_')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear localStorage cache:', error);
    }
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();

    // Clean memory cache
    this.memoryCache.forEach((entry, key) => {
      if (entry.expiresAt <= now) {
        this.memoryCache.delete(key);
      }
    });

    // Clean localStorage
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('cache_')) {
          const stored = localStorage.getItem(key);
          if (stored) {
            try {
              const entry: CacheEntry<any> = JSON.parse(stored);
              if (entry.expiresAt <= now) {
                localStorage.removeItem(key);
              }
            } catch {
              // Invalid entry, remove it
              localStorage.removeItem(key);
            }
          }
        }
      });
    } catch (error) {
      console.warn('Failed to cleanup localStorage:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    memoryEntries: number;
    localStorageEntries: number;
    totalSize: number;
  } {
    let localStorageEntries = 0;
    let totalSize = 0;

    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('cache_')) {
          localStorageEntries++;
          const item = localStorage.getItem(key);
          if (item) {
            totalSize += item.length;
          }
        }
      });
    } catch (error) {
      console.warn('Failed to get cache stats:', error);
    }

    return {
      memoryEntries: this.memoryCache.size,
      localStorageEntries,
      totalSize,
    };
  }
}

// Export singleton instance
export const cache = new CacheManager();

// Run cleanup every 10 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    cache.cleanup();
  }, 10 * 60 * 1000);
}

/**
 * React Query cache configuration
 */
export const queryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (previously cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: true,
    },
  },
};
