import fs from 'fs';
import path from 'path';

const CACHE_DIR = path.join(process.cwd(), 'data', 'cache');
const TELEMETRY_FILE = path.join(CACHE_DIR, 'endpoint_telemetry.json');

interface EndpointStats {
  endpoint: string;
  successCount: number;
  failureCount: number;
  lastSuccess: number | null;
  lastFailure: number | null;
  averageResponseTime: number; // milliseconds
  errorMessages: string[]; // Last 5 error messages
}

interface TelemetryData {
  [endpoint: string]: EndpointStats;
}

/**
 * Service to track API endpoint usage and failures for analytics
 */
class TelemetryServiceClass {
  private data: TelemetryData = {};
  private isServerless = !!(process.env.VERCEL || process.env.NODE_ENV === 'production');

  constructor() {
    if (!this.isServerless) {
      this.loadFromFile();
    }
  }

  private loadFromFile() {
    try {
      if (fs.existsSync(TELEMETRY_FILE)) {
        const fileData = fs.readFileSync(TELEMETRY_FILE, 'utf-8');
        this.data = JSON.parse(fileData);
      }
    } catch (error) {
      console.error('[Telemetry] Failed to load data:', error);
    }
  }

  private saveToFile() {
    if (this.isServerless) return;
    try {
      if (!fs.existsSync(CACHE_DIR)) {
        fs.mkdirSync(CACHE_DIR, { recursive: true });
      }
      fs.writeFileSync(TELEMETRY_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (error) {
      console.error('[Telemetry] Failed to save data:', error);
    }
  }

  /**
   * Record a successful API call
   */
  recordSuccess(endpoint: string, responseTime: number): void {
    if (!this.data[endpoint]) {
      this.data[endpoint] = {
        endpoint,
        successCount: 0,
        failureCount: 0,
        lastSuccess: null,
        lastFailure: null,
        averageResponseTime: 0,
        errorMessages: [],
      };
    }

    const stats = this.data[endpoint];
    stats.successCount++;
    stats.lastSuccess = Date.now();
    
    // Update average response time
    const totalCalls = stats.successCount + stats.failureCount;
    stats.averageResponseTime = 
      (stats.averageResponseTime * (totalCalls - 1) + responseTime) / totalCalls;

    this.saveToFile();
  }

  /**
   * Record a failed API call
   */
  recordFailure(endpoint: string, errorMessage: string): void {
    if (!this.data[endpoint]) {
      this.data[endpoint] = {
        endpoint,
        successCount: 0,
        failureCount: 0,
        lastSuccess: null,
        lastFailure: null,
        averageResponseTime: 0,
        errorMessages: [],
      };
    }

    const stats = this.data[endpoint];
    stats.failureCount++;
    stats.lastFailure = Date.now();
    
    // Keep only last 5 error messages
    stats.errorMessages.unshift(errorMessage);
    if (stats.errorMessages.length > 5) {
      stats.errorMessages = stats.errorMessages.slice(0, 5);
    }

    this.saveToFile();
  }

  /**
   * Get stats for a specific endpoint
   */
  getStats(endpoint: string): EndpointStats | null {
    return this.data[endpoint] || null;
  }

  /**
   * Get all endpoint stats sorted by failure rate
   */
  getAllStats(): EndpointStats[] {
    const stats = Object.values(this.data);
    
    // Sort by failure rate (descending)
    return stats.sort((a, b) => {
      const rateA = a.failureCount / (a.successCount + a.failureCount || 1);
      const rateB = b.failureCount / (b.successCount + b.failureCount || 1);
      return rateB - rateA;
    });
  }

  /**
   * Get summary statistics
   */
  getSummary() {
    const stats = this.getAllStats();
    
    const totalCalls = stats.reduce((sum, s) => sum + s.successCount + s.failureCount, 0);
    const totalSuccess = stats.reduce((sum, s) => sum + s.successCount, 0);
    const totalFailures = stats.reduce((sum, s) => sum + s.failureCount, 0);
    
    const mostProblematic = stats.filter(s => 
      s.failureCount / (s.successCount + s.failureCount) > 0.5
    );

    return {
      totalEndpoints: stats.length,
      totalCalls,
      totalSuccess,
      totalFailures,
      successRate: totalCalls > 0 ? (totalSuccess / totalCalls) * 100 : 0,
      mostProblematic: mostProblematic.map(s => ({
        endpoint: s.endpoint,
        failureRate: (s.failureCount / (s.successCount + s.failureCount)) * 100,
        failures: s.failureCount,
      })),
    };
  }

  /**
   * Clear all telemetry data
   */
  clear(): void {
    this.data = {};
    if (!this.isServerless) {
      try {
        if (fs.existsSync(TELEMETRY_FILE)) {
          fs.unlinkSync(TELEMETRY_FILE);
          console.log('[Telemetry] Cleared all data');
        }
      } catch (error) {
        console.error('[Telemetry] Failed to clear data:', error);
      }
    }
  }
}

export const TelemetryService = new TelemetryServiceClass();
