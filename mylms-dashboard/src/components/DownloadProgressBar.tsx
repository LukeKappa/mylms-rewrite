'use client';

import { useState, useEffect } from 'react';
import { Pause, Play, X } from 'lucide-react';

interface DownloadProgress {
  current: number;
  total: number;
  percentage: number;
  status: string;
  speed?: number; // items per second
  estimatedTimeRemaining?: number; // seconds
}

interface DownloadProgressBarProps {
  progress: DownloadProgress;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  isPaused?: boolean;
  isDownloading?: boolean;
}

export function DownloadProgressBar({
  progress,
  onPause,
  onResume,
  onCancel,
  isPaused = false,
  isDownloading = false,
}: DownloadProgressBarProps) {
  const [localSpeed, setLocalSpeed] = useState(0);
  const [localETA, setLocalETA] = useState(0);

  useEffect(() => {
    if (progress.speed !== undefined) {
      setLocalSpeed(progress.speed);
    }
    if (progress.estimatedTimeRemaining !== undefined) {
      setLocalETA(progress.estimatedTimeRemaining);
    }
  }, [progress.speed, progress.estimatedTimeRemaining]);

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes}m ${secs}s`;
  };

  if (!isDownloading && progress.percentage === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-neutral-900 border border-neutral-800 rounded-lg shadow-2xl p-4 z-50">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <h3 className="text-sm font-medium text-white">
            {isPaused ? 'Download Paused' : progress.status}
          </h3>
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-1">
          {isDownloading && (
            <>
              {isPaused ? (
                <button
                  onClick={onResume}
                  className="p-1.5 hover:bg-neutral-800 rounded transition-colors"
                  title="Resume"
                >
                  <Play className="w-4 h-4 text-green-500" />
                </button>
              ) : (
                <button
                  onClick={onPause}
                  className="p-1.5 hover:bg-neutral-800 rounded transition-colors"
                  title="Pause"
                >
                  <Pause className="w-4 h-4 text-yellow-500" />
                </button>
              )}
            </>
          )}
          <button
            onClick={onCancel}
            className="p-1.5 hover:bg-neutral-800 rounded transition-colors"
            title="Cancel"
          >
            <X className="w-4 h-4 text-red-500" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative w-full h-2 bg-neutral-800 rounded-full overflow-hidden mb-3">
        <div
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300 ease-out"
          style={{ width: `${progress.percentage}%` }}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-neutral-400">Progress</p>
          <p className="text-white font-medium">
            {progress.current} / {progress.total} ({progress.percentage}%)
          </p>
        </div>
        
        {localSpeed > 0 && (
          <div>
            <p className="text-neutral-400">Speed</p>
            <p className="text-white font-medium">
              {localSpeed.toFixed(1)} items/s
            </p>
          </div>
        )}
        
        {localETA > 0 && !isPaused && (
          <div className="col-span-2">
            <p className="text-neutral-400">Estimated time remaining</p>
            <p className="text-white font-medium">{formatTime(localETA)}</p>
          </div>
        )}
      </div>

      {/* Paused Message */}
      {isPaused && (
        <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-xs text-yellow-400">
          Download paused. Click resume to continue.
        </div>
      )}
    </div>
  );
}
