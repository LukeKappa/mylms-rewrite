'use client';

import { useState } from 'react';
import { Settings, Check, Search } from 'lucide-react';

interface Course {
  id: number;
  fullname: string;
  shortname: string;
}

interface CourseSelectionProps {
  allCourses: Course[];
  initialSelectedIds: number[];
  onSelectionChange?: (selectedIds: number[]) => void;
}

export function CourseSelection({ allCourses, initialSelectedIds, onSelectionChange }: CourseSelectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Filter initial IDs to only include those that exist in the current courses list
  // This prevents stale IDs from cookies counting towards the total
  const validInitialIds = initialSelectedIds.filter(id => allCourses.some(c => c.id === id));
  
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set(validInitialIds));
  const [searchQuery, setSearchQuery] = useState('');

  const toggleCourse = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    setSelectedIds(new Set(allCourses.map(c => c.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleSave = () => {
    const selected = Array.from(selectedIds);
    localStorage.setItem('selected_courses', JSON.stringify(selected));
    setIsOpen(false);
    
    // Notify parent to refresh
    if (onSelectionChange) {
      onSelectionChange(selected);
    } else {
      // Fallback to page reload if no callback
      window.location.reload();
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-lg hover:border-neutral-600 transition-colors text-sm"
      >
        <Settings size={16} />
        Manage Courses
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-neutral-800">
              <h2 className="text-xl font-bold text-white">Select Courses to Display</h2>
              <p className="text-sm text-neutral-500 mt-1">
                Choose which courses appear on your dashboard
              </p>
            </div>

            {/* Search & List */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="px-6 py-3 border-b border-neutral-800">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                    <Search size={16} />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter courses..."
                    className="w-full bg-black border border-neutral-800 text-white text-sm rounded-lg pl-9 pr-4 py-2 focus:ring-1 focus:ring-neutral-700 focus:border-neutral-700 placeholder-neutral-600 transition-all"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-2">
                  {allCourses
                    .filter(course => 
                      course.fullname.toLowerCase().includes(searchQuery.toLowerCase()) || 
                      course.shortname.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((course) => (
                    <label
                      key={course.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-800/50 cursor-pointer transition-colors"
                    >
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(course.id)}
                          onChange={() => toggleCourse(course.id)}
                          className="sr-only"
                        />
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          selectedIds.has(course.id) 
                            ? 'bg-white border-white' 
                            : 'border-neutral-600 bg-transparent'
                        }`}>
                          {selectedIds.has(course.id) && <Check size={14} className="text-black" />}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium truncate">{course.fullname}</div>
                        <div className="text-xs text-neutral-500 font-mono">{course.shortname}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-neutral-800 flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={selectAll}
                  className="text-sm text-neutral-400 hover:text-white transition-colors"
                >
                  Select All
                </button>
                <span className="text-neutral-700">|</span>
                <button
                  onClick={deselectAll}
                  className="text-sm text-neutral-400 hover:text-white transition-colors"
                >
                  Deselect All
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-neutral-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={selectedIds.size === 0}
                  className="px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save ({selectedIds.size})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
