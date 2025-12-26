import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { DashboardCache } from '@/lib/dashboardCache';

export async function POST() {
  try {
    const cookieStore = await cookies();
    
    // Clear all auth cookies
    cookieStore.delete('moodle_token');
    cookieStore.delete('moodle_session');
    cookieStore.delete('moodle_cookie_name');
    cookieStore.delete('moodle_sesskey');
    cookieStore.delete('moodle_session_full');
    cookieStore.delete('selected_courses');
    
    // Clear dashboard cache
    DashboardCache.clearAll();
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}
