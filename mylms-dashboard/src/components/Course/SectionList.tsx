'use client';

import { CourseSection } from '../../lib/moodle';
import { ActivityItem } from '../../app/dashboard/course/[id]/ActivityItem';

interface SectionListProps {
  sections: CourseSection[];
}

export function SectionList({ sections }: SectionListProps) {
  if (sections.length === 0) {
    return (
      <div className="text-center py-12 bg-neutral-900/30 rounded-xl border border-neutral-800 border-dashed">
        <p className="text-neutral-500">No sections selected. Use the filter to view content.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <div key={section.id} className="bg-neutral-900/50 border border-neutral-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-800 bg-neutral-900">
            <h2 className="text-lg font-semibold text-white">{section.name}</h2>
          </div>
          
          <div className="divide-y divide-neutral-800">
            {section.activities.map((activity, idx) => (
              <ActivityItem key={`${section.id}-${idx}`} activity={activity} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
