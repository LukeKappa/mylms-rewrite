'use client';

import { useState, useEffect } from 'react';
import { Trash2, RefreshCw, TrendingDown, CheckCircle, XCircle, Clock, Zap } from 'lucide-react';
import { 
  getApiCache, 
  clearApiCache, 
  getTelemetryStats, 
  getTelemetrySummary, 
  clearTelemetry 
} from '@/app/adminActions';

export function AdminPanel() {
  const [apiCache, setApiCache] = useState<any>({});
  const [telemetryData, setTelemetryData] = useState<any>([]);
  const [summary, setSummary] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'cache' | 'telemetry'>('cache');

  const loadData = async () => {
    // Load API cache
    const cache = await getApiCache();
    setApiCache(cache);

    // Load telemetry
    const stats = await getTelemetryStats();
    setTelemetryData(stats);

    const summaryData = await getTelemetrySummary();
    setSummary(summaryData);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleClearCache = async () => {
    if (confirm('Are you sure you want to clear the API availability cache?')) {
      await clearApiCache();
      loadData();
    }
  };

  const handleClearTelemetry = async () => {
    if (confirm('Are you sure you want to clear all telemetry data?')) {
      await clearTelemetry();
      loadData();
    }
  };

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
  };

  const formatResponseTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">API Admin Panel</h1>
        <p className="text-neutral-400">Monitor and manage API endpoint availability and performance</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-neutral-800">
        <button
          onClick={() => setActiveTab('cache')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'cache'
              ? 'text-blue-500 border-b-2 border-blue-500'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          API Availability Cache
        </button>
        <button
          onClick={() => setActiveTab('telemetry')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'telemetry'
              ? 'text-blue-500 border-b-2 border-blue-500'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          Telemetry & Analytics
        </button>
      </div>

      {/* Cache Tab */}
      {activeTab === 'cache' && (
        <div className="space-y-6">
          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={loadData}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={handleClearCache}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Clear Cache
            </button>
          </div>

          {/* Cache Entries */}
          <div className="grid gap-4">
            {Object.entries(apiCache).length === 0 ? (
              <div className="text-center py-12 text-neutral-400">
                <p>No cache entries found. Cache data will appear here after API calls are made.</p>
              </div>
            ) : (
              Object.entries(apiCache).map(([endpoint, data]: [string, any]) => (
                <div
                  key={endpoint}
                  className="bg-neutral-900 border border-neutral-800 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {data.available ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}
                        <h3 className="text-white font-medium">{endpoint}</h3>
                      </div>
                      <div className="grid sm:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-neutral-400">Status</p>
                          <p className={data.available ? 'text-green-500' : 'text-red-500'}>
                            {data.available ? 'Available' : 'Unavailable'}
                          </p>
                        </div>
                        <div>
                          <p className="text-neutral-400">Last Checked</p>
                          <p className="text-white">{formatDate(data.lastChecked)}</p>
                        </div>
                        <div>
                          <p className="text-neutral-400">Failure Count</p>
                          <p className="text-white">{data.failureCount}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Telemetry Tab */}
      {activeTab === 'telemetry' && (
        <div className="space-y-6">
          {/* Summary Stats */}
          {summary && (
            <div className="grid sm:grid-cols-4 gap-4">
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-blue-500" />
                  <p className="text-neutral-400 text-sm">Total Calls</p>
                </div>
                <p className="text-2xl font-bold text-white">{summary.totalCalls}</p>
              </div>
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <p className="text-neutral-400 text-sm">Success Rate</p>
                </div>
                <p className="text-2xl font-bold text-white">{summary.successRate.toFixed(1)}%</p>
              </div>
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-5 h-5 text-yellow-500" />
                  <p className="text-neutral-400 text-sm">Endpoints</p>
                </div>
                <p className="text-2xl font-bold text-white">{summary.totalEndpoints}</p>
              </div>
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <p className="text-neutral-400 text-sm">Problematic</p>
                </div>
                <p className="text-2xl font-bold text-white">{summary.mostProblematic.length}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={loadData}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={handleClearTelemetry}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Clear Telemetry
            </button>
          </div>

          {/* Endpoint Stats Table */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-800 text-neutral-300 text-sm">
                  <tr>
                    <th className="text-left p-4">Endpoint</th>
                    <th className="text-center p-4">Success</th>
                    <th className="text-center p-4">Failures</th>
                    <th className="text-center p-4">Success Rate</th>
                    <th className="text-center p-4">Avg Response Time</th>
                    <th className="text-left p-4">Last Error</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {telemetryData.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-neutral-400">
                        No telemetry data available yet
                      </td>
                    </tr>
                  ) : (
                    telemetryData.map((stat: any) => {
                      const total = stat.successCount + stat.failureCount;
                      const successRate = total > 0 ? (stat.successCount / total) * 100 : 0;
                      
                      return (
                        <tr key={stat.endpoint} className="border-t border-neutral-800 hover:bg-neutral-800/50">
                          <td className="p-4 text-white font-medium">{stat.endpoint}</td>
                          <td className="p-4 text-center text-green-500">{stat.successCount}</td>
                          <td className="p-4 text-center text-red-500">{stat.failureCount}</td>
                          <td className="p-4 text-center">
                            <span className={successRate >= 80 ? 'text-green-500' : successRate >= 50 ? 'text-yellow-500' : 'text-red-500'}>
                              {successRate.toFixed(1)}%
                            </span>
                          </td>
                          <td className="p-4 text-center text-white">
                            {formatResponseTime(stat.averageResponseTime)}
                          </td>
                          <td className="p-4 text-neutral-400 max-w-xs truncate">
                            {stat.errorMessages[0] || '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
