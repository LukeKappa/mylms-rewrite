'use client';

interface CourseHeaderProps {
  courseName: string;
  totalSections: number;
  visibleSections: number;
}

export function CourseHeader({ courseName, totalSections, visibleSections }: CourseHeaderProps) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">{courseName}</h1>
      <p className="text-neutral-400 text-sm">
        Showing {visibleSections} of {totalSections} sections
      </p>
    </div>
  );
}
