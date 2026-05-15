import logger from './logger';

interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
}

const defaultOptions: RetryOptions = {
  maxRetries: 3,
  baseDelay: 1000,
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const { maxRetries, baseDelay } = { ...defaultOptions, ...options };
  let lastError: any;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on certain errors (e.g., 400 Bad Request)
      if (error.status === 400 || error.status === 401) {
        throw error;
      }

      if (i < maxRetries) {
        const delay = baseDelay * Math.pow(2, i);
        logger.warn(`Retry attempt ${i + 1} after ${delay}ms...`, { error: error.message });
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Rate limiter to respect Notion's API limits (3 requests per second)
 */
export const rateLimit = (() => {
  let lastCall = 0;
  const MIN_DELAY = 350; // Roughly 3 requests per second

  return async <T>(fn: () => Promise<T>): Promise<T> => {
    const now = Date.now();
    const elapsed = now - lastCall;
    
    if (elapsed < MIN_DELAY) {
      await new Promise((resolve) => setTimeout(resolve, MIN_DELAY - elapsed));
    }
    
    const result = await fn();
    lastCall = Date.now();
    return result;
  };
})();
