import { NextResponse } from 'next/server';
import { getMoodleClient } from '@/lib/moodle';

// Simple in-memory cache with TTL
const cache = new Map<string, { data: any; expires: number }>();
const CACHE_TTL = 30000; // 30 seconds

export async function GET(request: Request) {
  try {
    const client = await getMoodleClient();
    
    if (!client) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check cache first
    const cacheKey = 'courses_data';
    const cached = cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      console.log('[API] Returning cached courses data');
      return NextResponse.json(cached.data);
    }

    // Fetch fresh data
    const siteInfo = await client.getSiteInfo();
    const courses = await client.getUserCourses(siteInfo.userid);

    const data = { siteInfo, courses };

    // Store in cache
    cache.set(cacheKey, {
      data,
      expires: Date.now() + CACHE_TTL
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('API Error (courses):', error);
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
  }
}
