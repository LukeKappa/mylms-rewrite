'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { CommandPalette } from './CommandPalette';
import { CourseList } from './CourseList';
import { AddTokenButton } from './AddTokenButton';
import { backendClient, Course, UserInfo } from '@/lib/backendClient';

export default function DashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        // Get token from localStorage
        const token = localStorage.getItem('moodle_token');
        
        if (!token) {
          router.push('/');
          return;
        }

        // Fetch courses from Rust backend
        const data = await backendClient.getCourses(token);
        
        setUserInfo({
          userid: data.userid,
          username: '', // Not returned by backend
          fullname: data.fullname,
        });
        setAllCourses(data.courses);
        
        // Save courses to localStorage so course pages can get course names
        localStorage.setItem('moodle_courses', JSON.stringify(data.courses));

        // Load selected course IDs from localStorage
        const stored = localStorage.getItem('selected_courses');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            setSelectedIds(Array.isArray(parsed) ? parsed.map(Number) : []);
          } catch (e) {
            console.error('Failed to parse selected courses:', e);
          }
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
        // If error (likely auth), redirect to login
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('moodle_token');
    localStorage.removeItem('user_info');
    localStorage.removeItem('selected_courses');
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
          <p className="text-neutral-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!userInfo) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center text-red-400">
          <p>Failed to load dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-neutral-200">
      {/* Header */}
      <header className="bg-black border-b border-neutral-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-max">
            <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center text-black font-bold text-sm">
              {userInfo.fullname.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <span className="font-medium text-white hidden sm:block">{userInfo.fullname}</span>
          </div>

          <div className="flex-1 flex justify-center max-w-2xl">
            <CommandPalette allCourses={allCourses as any} />
          </div>
          
          <div className="flex items-center gap-3">
            <AddTokenButton />
            
            <button 
              onClick={handleLogout}
              className="text-sm text-neutral-400 hover:text-white flex items-center gap-2 transition-colors min-w-max"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <CourseList 
          allCourses={allCourses as any} 
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
        />
      </main>
    </div>
  );
}
