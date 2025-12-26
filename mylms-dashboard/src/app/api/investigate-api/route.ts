'use server';

import { NextResponse } from 'next/server';
import { getMoodleClient } from '@/lib/moodle';
import { cookies } from 'next/headers';

/**
 * Investigation endpoint to check if Moodle API returns HTML content
 * Access: GET /api/investigate-api?courseid=12345
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = parseInt(searchParams.get('courseid') || '30404');

    const cookieStore = await cookies();
    const token = cookieStore.get('moodle_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'No API token found' }, { status: 401 });
    }

    const client = await getMoodleClient();
    if (!client) {
      return NextResponse.json({ error: 'No API client' }, { status: 500 });
    }

    console.log(`Investigating API content for course ${courseId}...`);
    
    const contents = await client.call('core_course_get_contents', { courseid: courseId });
    
    const findings: any[] = [];
    let hasInlineContent = false;

    contents.forEach((section: any) => {
      section.modules.forEach((mod: any) => {
        const moduleInfo: any = {
          name: mod.name,
          type: mod.modname,
          id: mod.id,
          hasContents: !!mod.contents,
          contentsCount: mod.contents?.length || 0,
          hasDescription: !!mod.description,
          inlineHTMLFound: false,
        };

        // Check for inline HTML content
        if (mod.contents && Array.isArray(mod.contents)) {
          mod.contents.forEach((content: any) => {
            if (content.content && content.content.length > 0) {
              moduleInfo.inlineHTMLFound = true;
              moduleInfo.contentPreview = content.content.substring(0, 200);
              moduleInfo.contentLength = content.content.length;
              hasInlineContent = true;
            }
          });
        }

        if (mod.description) {
          moduleInfo.descriptionLength = mod.description.length;
        }

        findings.push(moduleInfo);
      });
    });

    return NextResponse.json({
      courseId,
      totalModules: findings.length,
      hasInlineContent,
      modulesWithInlineContent: findings.filter(f => f.inlineHTMLFound).length,
      findings,
      recommendation: hasInlineContent 
        ? '✅ API returns HTML content! You can optimize by using inline content instead of scraping.'
        : '❌ API does not return HTML content. Continue using cheerio scraping.'
    });

  } catch (error: any) {
    console.error('Investigation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
