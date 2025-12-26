'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, BookOpen, X, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Course {
  id: number;
  fullname: string;
  shortname: string;
}

interface CommandPaletteProps {
  allCourses: Course[];
}

export function CommandPalette({ allCourses }: CommandPaletteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Filter courses based on query
  const filteredCourses = allCourses.filter(course => 
    course.fullname.toLowerCase().includes(query.toLowerCase()) || 
    course.shortname.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 5); // Limit to 5 results

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }

      if (!isOpen) return;

      if (e.key === 'Escape') {
        setIsOpen(false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredCourses.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredCourses.length) % filteredCourses.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCourses[selectedIndex]) {
          router.push(`/dashboard/course/${filteredCourses[selectedIndex].id}`);
          setIsOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCourses, selectedIndex, router]);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
    if (!isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  return (
    <>
      {/* Trigger Button (Visible in Header) */}
      <button
        onClick={() => setIsOpen(true)}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-md text-neutral-500 hover:text-neutral-300 hover:border-neutral-700 transition-all text-sm group"
      >
        <Search size={14} />
        <span>Search...</span>
        <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-neutral-800 rounded border border-neutral-700 text-neutral-400 group-hover:text-neutral-300">
          Ctrl K
        </kbd>
      </button>

      {/* Mobile Trigger (Icon Only) */}
      <button
        onClick={() => setIsOpen(true)}
        className="md:hidden p-2 text-neutral-400 hover:text-white"
      >
        <Search size={20} />
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] px-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Dialog */}
          <div className="relative w-full max-w-xl bg-black border border-neutral-800 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100">
            {/* Search Input */}
            <div className="flex items-center px-4 py-3 border-b border-neutral-800">
              <Search size={20} className="text-neutral-500 mr-3" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                placeholder="Search courses..."
                className="flex-1 bg-transparent border-none outline-none text-white placeholder-neutral-600 text-lg"
              />
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 text-neutral-500 hover:text-white rounded-md"
              >
                <X size={18} />
              </button>
            </div>

            {/* Results */}
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {filteredCourses.length === 0 ? (
                <div className="p-8 text-center text-neutral-500">
                  {query ? 'No results found.' : 'Type to search...'}
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="px-2 py-1.5 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Courses
                  </div>
                  {filteredCourses.map((course, index) => (
                    <Link
                      key={course.id}
                      href={`/dashboard/course/${course.id}`}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center justify-between px-3 py-3 rounded-lg transition-colors group ${
                        index === selectedIndex 
                          ? 'bg-neutral-800 text-white' 
                          : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200'
                      }`}
                      onMouseEnter={() => setSelectedIndex(index)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-md ${
                          index === selectedIndex ? 'bg-neutral-700' : 'bg-neutral-900 border border-neutral-800'
                        }`}>
                          <BookOpen size={16} />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{course.fullname}</div>
                          <div className="text-xs text-neutral-500 font-mono truncate">{course.shortname}</div>
                        </div>
                      </div>
                      {index === selectedIndex && (
                        <ArrowRight size={16} className="text-neutral-500" />
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 bg-neutral-900/50 border-t border-neutral-800 text-[10px] text-neutral-500 flex justify-between items-center">
              <div className="flex gap-3">
                <span>Use <kbd className="font-mono bg-neutral-800 px-1 rounded border border-neutral-700">↑</kbd> <kbd className="font-mono bg-neutral-800 px-1 rounded border border-neutral-700">↓</kbd> to navigate</span>
                <span><kbd className="font-mono bg-neutral-800 px-1 rounded border border-neutral-700">Enter</kbd> to select</span>
              </div>
              <span><kbd className="font-mono bg-neutral-800 px-1 rounded border border-neutral-700">Esc</kbd> to close</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
