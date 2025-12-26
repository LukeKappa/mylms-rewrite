'use server';

import { ApiAvailabilityCache } from '@/lib/apiAvailabilityCache';
import { TelemetryService } from '@/lib/telemetry';

export async function getApiCache() {
  return ApiAvailabilityCache.getAll();
}

export async function clearApiCache() {
  ApiAvailabilityCache.clear();
  return { success: true };
}

export async function getTelemetryStats() {
  return TelemetryService.getAllStats();
}

export async function getTelemetrySummary() {
  return TelemetryService.getSummary();
}

export async function clearTelemetry() {
  TelemetryService.clear();
  return { success: true };
}
