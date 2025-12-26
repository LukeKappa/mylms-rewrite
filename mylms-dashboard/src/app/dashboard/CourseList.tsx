'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BookOpen, CheckCircle2 } from 'lucide-react';
import { CourseSelection } from './CourseSelection';

interface Course {
  id: number;
  fullname: string;
  shortname: string;
  completed?: boolean;
  progress?: number;
}

interface CourseListProps {
  allCourses: Course[];
  selectedIds: number[];
  onSelectionChange?: (selectedIds: number[]) => void;
}

export function CourseList({ allCourses, selectedIds, onSelectionChange }: CourseListProps) {
  // Filter by selection (cookie)
  const displayCourses = selectedIds.length > 0 
    ? allCourses.filter(c => selectedIds.includes(c.id))
    : allCourses;

  return (
    <div>
      {/* Header Section */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">My Courses</h1>
          <p className="text-neutral-500">
            {selectedIds.length > 0 
              ? `Showing ${displayCourses.length} of ${allCourses.length} courses`
              : `You are enrolled in ${allCourses.length} courses`
            }
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <CourseSelection 
            allCourses={allCourses.map(c => ({ 
              id: c.id, 
              fullname: c.fullname, 
              shortname: c.shortname 
            }))}
            initialSelectedIds={selectedIds}
            onSelectionChange={onSelectionChange}
          />
        </div>
      </div>

      {/* Course Grid */}
      {displayCourses.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-neutral-800 rounded-xl">
          <p className="text-neutral-500 text-lg">No courses found</p>
          <p className="text-neutral-600 text-sm mt-2">
            Click "Manage Courses" to select courses to display
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {displayCourses.map((course) => (
            <Link 
              key={course.id}
              href={`/dashboard/course/${course.id}`}
              className="block"
            >
              <div 
                className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 hover:border-neutral-600 transition-all group shadow-sm hover:shadow-md cursor-pointer h-full flex flex-col"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 bg-neutral-800 rounded-lg text-neutral-400 group-hover:bg-white group-hover:text-black transition-colors">
                    <BookOpen size={20} />
                  </div>
                  {course.completed && (
                    <div className="text-green-500" title="Completed">
                      <CheckCircle2 size={20} />
                    </div>
                  )}
                </div>
                
                <h3 className="font-semibold text-lg text-white mb-1 line-clamp-2" title={course.fullname}>
                  {course.fullname}
                </h3>
                
                <p className="text-neutral-500 font-mono text-sm mb-4 line-clamp-1">
                  {course.shortname}
                </p>
                
                {course.progress !== undefined && course.progress !== null && (
                  <div className="mt-auto">
                    <div className="flex justify-between text-xs text-neutral-500 mb-1">
                      <span>Progress</span>
                      <span>{Math.round(course.progress)}%</span>
                    </div>
                    <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-white rounded-full" 
                        style={{ width: `${course.progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
