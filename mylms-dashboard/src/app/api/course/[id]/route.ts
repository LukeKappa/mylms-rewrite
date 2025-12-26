import { NextResponse } from 'next/server';
import { getMoodleClient } from '@/lib/moodle';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = await getMoodleClient();
    
    if (!client) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const resolvedParams = await params;
    const courseId = parseInt(resolvedParams.id);
    
    const courseData = await client.getCourseContents(courseId);

    return NextResponse.json(courseData);
  } catch (error) {
    console.error('API Error (course contents):', error);
    return NextResponse.json({ error: 'Failed to fetch course contents' }, { status: 500 });
  }
}
