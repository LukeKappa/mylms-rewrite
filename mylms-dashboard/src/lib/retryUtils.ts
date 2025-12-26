/**
 * Retry a function with exponential backoff
 * @param fn Function to retry
 * @param maxRetries Maximum number of retry attempts
 * @param baseDelay Base delay in milliseconds
 * @returns Result of the function
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on certain errors
      if (error && typeof error === 'object') {
        const errorObj = error as any;
        // Don't retry on authentication errors or invalid records
        if (
          errorObj.message?.includes('external_functions') ||
          errorObj.errorcode === 'invalidrecord' ||
          errorObj.errorcode === 'invalidtoken' ||
          errorObj.message?.includes('Invalid token')
        ) {
          throw error; // Don't retry these
        }
      }
      
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
        console.log(`[Retry] Attempt ${attempt + 1}/${maxRetries} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

/**
 * Progress callback type for tracking download progress
 */
export interface ProgressCallback {
  (progress: {
    current: number;
    total: number;
    percentage: number;
    currentUrl?: string;
    status: 'downloading' | 'complete' | 'error';
  }): void;
}
