/**
 * Logger utility for YARIKIRU MCP Server
 *
 * Provides structured logging with timing information for monitoring
 * and debugging MCP operations.
 */

/**
 * Log an MCP request with structured formatting
 * @param {string} operation - The operation name (e.g., 'listGoals')
 * @param {object} args - The arguments passed to the operation
 */
export function logRequest(operation, args) {
  const timestamp = new Date().toISOString();
  const sanitizedArgs = sanitizeArgs(args);
  console.error(`[MCP REQUEST] ${timestamp} ${operation}`, JSON.stringify(sanitizedArgs, null, 2));
}

/**
 * Log an MCP response with duration
 * @param {string} operation - The operation name
 * @param {any} result - The result returned
 * @param {number} duration - Duration in milliseconds
 */
export function logResponse(operation, result, duration) {
  const timestamp = new Date().toISOString();
  const resultSummary = summarizeResult(result);
  console.error(`[MCP RESPONSE] ${timestamp} ${operation} completed in ${duration}ms`, resultSummary);
}

/**
 * Log an MCP error with stack trace
 * @param {string} operation - The operation name
 * @param {Error} error - The error object
 */
export function logError(operation, error) {
  const timestamp = new Date().toISOString();
  console.error(`[MCP ERROR] ${timestamp} ${operation} failed:`, error.message);
  if (error.stack) {
    console.error(`[MCP ERROR] Stack trace:`, error.stack);
  }
}

/**
 * Log a warning message
 * @param {string} operation - The operation name
 * @param {string} message - Warning message
 */
export function logWarning(operation, message) {
  const timestamp = new Date().toISOString();
  console.error(`[MCP WARNING] ${timestamp} ${operation}: ${message}`);
}

/**
 * Log info message
 * @param {string} message - Info message
 */
export function logInfo(message) {
  const timestamp = new Date().toISOString();
  console.error(`[MCP INFO] ${timestamp} ${message}`);
}

/**
 * Sanitize arguments to prevent logging sensitive data
 * @param {object} args - Raw arguments
 * @returns {object} Sanitized arguments
 */
function sanitizeArgs(args) {
  if (!args || typeof args !== 'object') {
    return args;
  }

  const sanitized = { ...args };
  const sensitiveKeys = ['apiKey', 'password', 'token', 'secret', 'authorization'];

  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Create a summary of the result for logging
 * @param {any} result - The result object
 * @returns {string} A summary string
 */
function summarizeResult(result) {
  if (!result) {
    return '';
  }

  if (Array.isArray(result)) {
    return `(Array, length: ${result.length})`;
  }

  if (typeof result === 'object') {
    const keys = Object.keys(result);
    if (keys.length <= 5) {
      return JSON.stringify(result);
    }
    return `(Object with keys: ${keys.slice(0, 5).join(', ')}...)`;
  }

  return String(result).substring(0, 100);
}

/**
 * Create a timed execution wrapper
 * @param {string} operation - Operation name for logging
 * @returns {object} Object with start and end methods
 */
export function createTimer(operation) {
  const startTime = Date.now();
  let hasEnded = false;

  return {
    /**
     * End the timer and log the result
     * @param {any} result - The result to log
     * @returns {number} Duration in milliseconds
     */
    end(result) {
      if (hasEnded) {
        logWarning(operation, 'Timer ended multiple times');
        return 0;
      }
      hasEnded = true;
      const duration = Date.now() - startTime;
      logResponse(operation, result, duration);
      return duration;
    },

    /**
     * Get current elapsed time without ending the timer
     * @returns {number} Elapsed milliseconds
     */
    elapsed() {
      return Date.now() - startTime;
    }
  };
}

/**
 * Measure execution time of an async function
 * @param {string} operation - Operation name for logging
 * @param {Function} fn - Async function to measure
 * @returns {Promise<any>} Result of the function
 */
export async function measure(operation, fn) {
  const timer = createTimer(operation);
  try {
    const result = await fn();
    timer.end(result);
    return result;
  } catch (error) {
    logError(operation, error);
    throw error;
  }
}

export default {
  logRequest,
  logResponse,
  logError,
  logWarning,
  logInfo,
  createTimer,
  measure
};
