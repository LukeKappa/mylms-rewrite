'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CourseContent } from './CourseContent';
import { ArrowLeft } from 'lucide-react';
import { dbService } from '@/lib/indexedDB';
import { backendClient } from '@/lib/backendClient';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

interface Activity {
  id: string;
  name: string;
  type: string;
  url: string;
  modname: string;
  completed?: boolean;
}

interface CourseSection {
  id: number;
  name: string;
  visible?: number;
  summary?: string;
  section: number;
  uservisible?: boolean;
  modules?: any[];
  activities: Activity[];
}

interface CourseData {
  title: string;
  sections: CourseSection[];
}

export default function CoursePage({ params }: PageProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [courseData, setCourseData] = useState<CourseData | null>(null);
  const [courseId, setCourseId] = useState<string | null>(null);

  useEffect(() => {
    async function loadCourse() {
      try {
        const resolvedParams = await params;
        const id = resolvedParams.id;
        setCourseId(id);
        
        // Get token from localStorage
        const token = localStorage.getItem('moodle_token');
        if (!token) {
          router.push('/');
          return;
        }
        
        // Try to get course name from localStorage (courses are stored there from dashboard)
        let courseName = `Course ${id}`;
        try {
          const storedCourses = localStorage.getItem('moodle_courses');
          if (storedCourses) {
            const courses = JSON.parse(storedCourses);
            if (Array.isArray(courses)) {
              const course = courses.find((c: any) => c.id === parseInt(id));
              if (course && course.fullname) {
                courseName = course.fullname;
              }
            }
          }
        } catch (e) {
          console.warn('[CoursePage] Failed to get course name from localStorage:', e);
        }
        
        // Try to load from cache first
        try {
          const cachedCourse = await dbService.getCourse(parseInt(id));
          if (cachedCourse) {
            console.log('[CoursePage] Cache hit (IndexedDB):', id);
            // Preserve the course name if we found it
            if (courseName !== `Course ${id}`) {
              (cachedCourse as CourseData).title = courseName;
            }
            setCourseData(cachedCourse as CourseData);
            setIsLoading(false); // Show cached content immediately
          }
        } catch (e) {
          console.warn('[CoursePage] Failed to read from IndexedDB:', e);
        }

        // Fetch from Rust backend
        const data = await backendClient.getCourseContents(token, parseInt(id));
        
        // Transform response to match expected format
        // Note: Backend uses #[serde(flatten)] so section fields are at top level
        const sections: CourseSection[] = data.sections.map((s: any) => ({
          id: s.id,
          name: s.name || 'Unnamed Section',
          visible: s.visible,
          summary: s.summary,
          section: s.section,
          uservisible: s.uservisible,
          modules: s.modules || [],
          activities: s.activities || [],
        }));
        
        const transformedData: CourseData = {
          title: courseName,
          sections,
        };
        
        setCourseData(transformedData);
        
        // Save to cache
        try {
          await dbService.saveCourse(parseInt(id), transformedData);
          console.log('[CoursePage] Saved course to IndexedDB');
        } catch (e) {
          console.warn('[CoursePage] Failed to save to IndexedDB:', e);
        }
        
      } catch (error) {
        console.error('Failed to load course:', error);
        // If auth error, redirect to login
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    }

    loadCourse();
  }, [params, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
          <p className="text-neutral-400">Loading course...</p>
        </div>
      </div>
    );
  }

  if (!courseData) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center text-red-400">
          <p>Failed to load course</p>
          <Link href="/dashboard" className="text-blue-400 hover:underline mt-4 inline-block">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-8">
          <Link 
            href="/dashboard" 
            className="inline-flex items-center gap-2 text-neutral-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft size={20} />
            <span>Back to Dashboard</span>
          </Link>
        </div>

        <CourseContent sections={courseData.sections} courseName={courseData.title} />
      </div>
    </div>
  );
}
