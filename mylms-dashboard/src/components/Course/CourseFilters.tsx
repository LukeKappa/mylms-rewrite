'use client';

import { useState, useRef, useEffect } from 'react';
import { Filter, Download, CheckCircle, Loader2, Trash2, X, Search, FileDown } from 'lucide-react';
import { CourseSection } from '../../lib/moodle';

interface CourseFiltersProps {
  // Section filtering
  sections: CourseSection[];
  visibleSections: Set<string>;
  onToggleSectionVisibility: (sectionName: string) => void;
  onToggleAllSections: () => void;
  
  // Activity type filtering
  availableActivityTypes: string[];
  visibleActivityTypes: Set<string>;
  onToggleActivityType: (type: string) => void;
  onToggleAllActivityTypes: () => void;
  
  // Search
  searchQuery: string;
  onSearchChange: (query: string) => void;
  
  // Sync/Download
  isSyncing: boolean;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  onSync: () => void;
  onCancelSync: () => void;
  totalActivities: number;
  
  // Cache
  clearCacheStatus: 'idle' | 'clearing' | 'success' | 'error';
  onClearCache: () => void;
  
  // PDF Export
  isExporting?: boolean;
  onExportPdf?: () => void;
}

export function CourseFilters({
  sections,
  visibleSections,
  onToggleSectionVisibility,
  onToggleAllSections,
  availableActivityTypes,
  visibleActivityTypes,
  onToggleActivityType,
  onToggleAllActivityTypes,
  searchQuery,
  onSearchChange,
  isSyncing,
  syncStatus,
  onSync,
  onCancelSync,
  totalActivities,
  clearCacheStatus,
  onClearCache,
  isExporting,
  onExportPdf,
}: CourseFiltersProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isTypeFilterOpen, setIsTypeFilterOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex flex-col gap-3 w-full md:w-auto">
      <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
        {/* Search Bar */}
        <div className="relative w-full md:w-auto group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500 group-hover:text-neutral-300 transition-colors">
            <Search size={14} />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search..."
            className="w-full md:w-64 bg-neutral-900 border border-neutral-800 text-white text-sm rounded-md pl-9 pr-16 py-1.5 focus:outline-none focus:border-neutral-700 placeholder-neutral-500 hover:border-neutral-700 transition-all"
          />
          <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-neutral-800 rounded border border-neutral-700 text-neutral-400 group-hover:text-neutral-300 transition-colors">
              Ctrl K
            </kbd>
          </div>
        </div>
        
        {/* Sync/Cancel Button */}
        {isSyncing ? (
          <button
            onClick={onCancelSync}
            className="flex items-center justify-center w-10 h-10 rounded-lg transition-colors border bg-red-900/30 border-red-800 text-red-400 hover:bg-red-900/50"
            title="Cancel Sync"
          >
            <X size={18} />
          </button>
        ) : (
          <button
            onClick={onSync}
            disabled={syncStatus === 'success'}
            className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors border ${
              syncStatus === 'success' 
                ? 'bg-green-900/30 border-green-800 text-green-400'
                : syncStatus === 'error'
                ? 'bg-red-900/30 border-red-800 text-red-400'
                : 'bg-neutral-800 hover:bg-neutral-700 text-white border-neutral-700'
            }`}
            title={syncStatus === 'success' ? 'Synced' : syncStatus === 'error' ? 'Sync Error' : 'Download Offline'}
          >
            {syncStatus === 'success' ? (
              <CheckCircle size={18} />
            ) : syncStatus === 'error' ? (
              <X size={18} />
            ) : (
              <Download size={18} />
            )}
          </button>
        )}

        {/* Export PDF Button */}
        {onExportPdf && (
          <button
            onClick={onExportPdf}
            disabled={isExporting}
            className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors border ${
              isExporting
                ? 'bg-blue-900/30 border-blue-800 text-blue-400'
                : 'bg-neutral-800 hover:bg-neutral-700 text-white border-neutral-700'
            }`}
            title="Export as PDF"
          >
            {isExporting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <FileDown size={18} />
            )}
          </button>
        )}

        {/* Clear Cache Button */}
        <button
          onClick={onClearCache}
          disabled={clearCacheStatus === 'clearing'}
          className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors border ${
            clearCacheStatus === 'success'
              ? 'bg-green-900/30 border-green-800 text-green-400'
              : clearCacheStatus === 'error'
              ? 'bg-red-900/30 border-red-800 text-red-400'
              : 'bg-neutral-800 hover:bg-neutral-700 text-white border-neutral-700'
          }`}
          title="Clear Cache"
        >
          {clearCacheStatus === 'clearing' ? (
            <Loader2 size={18} className="animate-spin" />
          ) : clearCacheStatus === 'success' ? (
            <CheckCircle size={18} />
          ) : (
            <Trash2 size={18} />
          )}
        </button>

        {/* Section Filter Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors border ${
              isFilterOpen ? 'bg-neutral-700 border-neutral-600' : 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700'
            } text-white`}
            title="Filter Sections"
          >
            <Filter size={18} />
          </button>

          {isFilterOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl z-50 overflow-hidden">
              <div className="p-3 border-b border-neutral-800 flex justify-between items-center bg-neutral-900">
                <span className="text-sm font-medium text-white">Select Sections</span>
                <button 
                  onClick={onToggleAllSections}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  {visibleSections.size === sections.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div className="max-h-96 overflow-y-auto p-2 space-y-1">
                {sections.map((section) => (
                  <label 
                    key={section.name} 
                    className="flex items-center gap-3 p-2 hover:bg-neutral-800 rounded-lg cursor-pointer transition-colors"
                  >
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                      visibleSections.has(section.name) 
                        ? 'bg-blue-600 border-blue-600' 
                        : 'border-neutral-600 bg-transparent'
                    }`}>
                      {visibleSections.has(section.name) && (
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={visibleSections.has(section.name)}
                      onChange={() => onToggleSectionVisibility(section.name)}
                    />
                    <span className={`text-sm truncate ${
                      visibleSections.has(section.name) ? 'text-white' : 'text-neutral-400'
                    }`}>
                      {section.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Activity Type Filter */}
        <div className="relative">
          <button
            onClick={() => setIsTypeFilterOpen(!isTypeFilterOpen)}
            className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors border ${
              isTypeFilterOpen ? 'bg-neutral-700 border-neutral-600' : 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700'
            } text-white`}
            title="Filter Activity Types"
          >
            <div className="relative">
              <Filter size={18} />
              {visibleActivityTypes.size > 0 && (
                <span className="absolute -top-2 -right-2 w-4 h-4 bg-blue-600 text-[10px] flex items-center justify-center rounded-full border border-neutral-900">
                  {visibleActivityTypes.size}
                </span>
              )}
            </div>
          </button>

          {isTypeFilterOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl z-50 overflow-hidden">
              <div className="p-3 border-b border-neutral-800 flex justify-between items-center bg-neutral-900">
                <span className="text-sm font-medium text-white">Select Activity Types</span>
                <button 
                  onClick={onToggleAllActivityTypes}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  {visibleActivityTypes.size === 6 ? 'Reset to Notes' : 'Select All'}
                </button>
              </div>
              <div className="max-h-96 overflow-y-auto p-2 space-y-1">
                {[
                  { id: 'book', label: '📖 Notes (Book)', default: true },
                  { id: 'page', label: '📄 Pages', default: false },
                  { id: 'resource', label: '📎 Resources', default: false },
                  { id: 'folder', label: '📁 Folders', default: false },
                  { id: 'lesson', label: '📚 Lessons', default: false },
                  { id: 'url', label: '🔗 URLs', default: false },
                ].filter(type => availableActivityTypes.includes(type.id)).map((type) => (
                  <label 
                    key={type.id} 
                    className="flex items-center gap-3 p-2 hover:bg-neutral-800 rounded-lg cursor-pointer transition-colors"
                  >
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                      visibleActivityTypes.has(type.id) 
                        ? 'bg-blue-600 border-blue-600' 
                        : 'border-neutral-600 bg-transparent'
                    }`}>
                      {visibleActivityTypes.has(type.id) && (
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={visibleActivityTypes.has(type.id)}
                      onChange={() => onToggleActivityType(type.id)}
                    />
                    <span className={`text-sm flex items-center gap-2 ${
                      visibleActivityTypes.has(type.id) ? 'text-white' : 'text-neutral-400'
                    }`}>
                      {type.label}
                      {type.default && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-green-900/30 text-green-400 rounded border border-green-800">
                          DEFAULT
                        </span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar - Shows when syncing */}
      {isSyncing && (
        <div className="w-full">
          <div className="flex items-center justify-between text-xs text-neutral-400 mb-1.5">
            <span>Downloading {totalActivities} {totalActivities === 1 ? 'activity' : 'activities'}...</span>
            <span className="flex items-center gap-1">
              <Loader2 size={12} className="animate-spin" />
              In progress
            </span>
          </div>

          <div className="h-2 bg-neutral-800 rounded-full overflow-hidden border border-neutral-700">
            <div className="h-full bg-gradient-to-r from-neutral-400 via-neutral-300 to-neutral-400 animate-pulse relative">
              {/* Animated shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
            </div>
          </div>
          <style jsx>{`
            @keyframes shimmer {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(100%); }
            }
            .animate-shimmer {
              animation: shimmer 2s infinite;
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
