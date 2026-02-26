/**
 * Data Fetcher utility for YARIKIRU MCP Server
 *
 * Provides caching and standardized data fetching patterns for consistency
 * across parallel operations.
 */

/**
 * DataFetcher class with built-in caching
 */
export class DataFetcher {
  /**
   * @param {object} mcpClient - The MCP client/call function
   * @param {object} options - Configuration options
   * @param {number} options.cacheTTL - Cache time-to-live in milliseconds (default: 5000)
   * @param {number} options.maxCacheSize - Maximum cache entries (default: 100)
   */
  constructor(mcpClient, options = {}) {
    this.mcpClient = mcpClient;
    this.cache = new Map();
    this.cacheTimestamps = new Map();
    this.cacheTTL = options.cacheTTL ?? 5000; // 5 seconds default
    this.maxCacheSize = options.maxCacheSize ?? 100;

    // Periodic cache cleanup
    this.cleanupInterval = setInterval(() => this.cleanupExpired(), 10000);
  }

  /**
   * Fetch a goal with optional caching
   * @param {string} goalId - The goal ID to fetch
   * @param {boolean} useCache - Whether to use cache (default: true)
   * @returns {Promise<object>} The goal object
   */
  async fetchGoal(goalId, useCache = true) {
    const cacheKey = `goal:${goalId}`;

    if (useCache && this.cache.has(cacheKey)) {
      const timestamp = this.cacheTimestamps.get(cacheKey);
      if (Date.now() - timestamp < this.cacheTTL) {
        return this.cache.get(cacheKey);
      }
    }

    const goal = await this.mcpClient('get_goal', { goalId });
    this.setCache(cacheKey, goal);
    return goal;
  }

  /**
   * Fetch multiple goals in parallel
   * @param {string[]} goalIds - Array of goal IDs
   * @param {boolean} useCache - Whether to use cache
   * @returns {Promise<object[]>} Array of goals
   */
  async fetchGoals(goalIds, useCache = true) {
    const promises = goalIds.map(id => this.fetchGoal(id, useCache));
    return Promise.all(promises);
  }

  /**
   * Fetch a project with optional caching
   * @param {string} projectId - The project ID
   * @param {boolean} useCache - Whether to use cache
   * @returns {Promise<object>} The project object
   */
  async fetchProject(projectId, useCache = true) {
    const cacheKey = `project:${projectId}`;

    if (useCache && this.cache.has(cacheKey)) {
      const timestamp = this.cacheTimestamps.get(cacheKey);
      if (Date.now() - timestamp < this.cacheTTL) {
        return this.cache.get(cacheKey);
      }
    }

    // Assuming list_projects returns all projects
    const result = await this.mcpClient('list_projects', {});
    const project = result.projects?.find(p => p.id === projectId);

    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    this.setCache(cacheKey, project);
    return project;
  }

  /**
   * Fetch all projects (cached)
   * @param {boolean} useCache - Whether to use cache
   * @returns {Promise<object[]>} Array of projects
   */
  async fetchAllProjects(useCache = true) {
    const cacheKey = 'projects:all';

    if (useCache && this.cache.has(cacheKey)) {
      const timestamp = this.cacheTimestamps.get(cacheKey);
      if (Date.now() - timestamp < this.cacheTTL) {
        return this.cache.get(cacheKey);
      }
    }

    const result = await this.mcpClient('list_projects', {});
    const projects = result.projects ?? [];
    this.setCache(cacheKey, projects);
    return projects;
  }

  /**
   * Fetch a subtask with optional caching
   * @param {string} subtaskId - The subtask ID
   * @param {boolean} useCache - Whether to use cache
   * @returns {Promise<object>} The subtask object
   */
  async fetchSubtask(subtaskId, useCache = true) {
    const cacheKey = `subtask:${subtaskId}`;

    if (useCache && this.cache.has(cacheKey)) {
      const timestamp = this.cacheTimestamps.get(cacheKey);
      if (Date.now() - timestamp < this.cacheTTL) {
        return this.cache.get(cacheKey);
      }
    }

    // Subtasks are typically part of goals, so we might need to fetch the parent goal
    // For now, implement a direct fetch if available
    const result = await this.mcpClient('get_goal', { goalId: subtaskId });
    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * Fetch graph data for a goal
   * @param {string} goalId - The goal ID
   * @param {boolean} useCache - Whether to use cache
   * @returns {Promise<object>} Graph data
   */
  async fetchGraph(goalId, useCache = true) {
    const cacheKey = `graph:${goalId}`;

    if (useCache && this.cache.has(cacheKey)) {
      const timestamp = this.cacheTimestamps.get(cacheKey);
      if (Date.now() - timestamp < this.cacheTTL) {
        return this.cache.get(cacheKey);
      }
    }

    const graph = await this.mcpClient('get_graph', { goalId });
    this.setCache(cacheKey, graph);
    return graph;
  }

  /**
   * Set a cache entry with timestamp
   * @private
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   */
  setCache(key, value) {
    // Enforce max cache size using LRU eviction
    if (this.cache.size >= this.maxCacheSize && !this.cache.has(key)) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
      this.cacheTimestamps.delete(oldestKey);
    }

    this.cache.set(key, value);
    this.cacheTimestamps.set(key, Date.now());
  }

  /**
   * Clean up expired cache entries
   * @private
   */
  cleanupExpired() {
    const now = Date.now();
    for (const [key, timestamp] of this.cacheTimestamps.entries()) {
      if (now - timestamp > this.cacheTTL) {
        this.cache.delete(key);
        this.cacheTimestamps.delete(key);
      }
    }
  }

  /**
   * Clear all cache entries
   */
  clearCache() {
    this.cache.clear();
    this.cacheTimestamps.clear();
  }

  /**
   * Clear cache entries matching a pattern
   * @param {string} pattern - Pattern to match (e.g., 'goal:')
   */
  clearCachePattern(pattern) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(pattern)) {
        this.cache.delete(key);
        this.cacheTimestamps.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   * @returns {object} Cache stats
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      ttl: this.cacheTTL,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Cleanup when done
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clearCache();
  }
}

/**
 * Create a DataFetcher instance with the given MCP client
 * @param {Function} mcpClient - The MCP call function
 * @param {object} options - Configuration options
 * @returns {DataFetcher} New DataFetcher instance
 */
export function createDataFetcher(mcpClient, options = {}) {
  return new DataFetcher(mcpClient, options);
}

export default DataFetcher;
