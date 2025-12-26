import { cookies } from 'next/headers';
import { MoodleClient } from './moodle/client';
import { getMoodleToken } from './moodle/auth';
import * as Types from './moodle/types';

export * from './moodle/types';
export * from './moodle/client';
export * from './moodle/auth';

// Facade function to maintain backward compatibility
export async function getMoodleClient() {
  const cookieStore = await cookies();
  const token = cookieStore.get('moodle_token')?.value;

  if (!token) {
    return null;
  }

  // Build and return the client API
  const client = new MoodleClient(token);
    
    return {
      // Bind methods to client instance
      call: client.call.bind(client) as any, // Expose raw call if needed
      getSiteInfo: client.getSiteInfo.bind(client),
      getUserCourses: client.getUserCourses.bind(client),
      getCourseContents: async (courseId: number) => {
         // Fetch the course list to get the actual course title
         const siteInfo = await client.getSiteInfo();
         const courses = await client.getUserCourses(siteInfo.userid);
         const course = courses.find(c => c.id === courseId);
         
         // Get sections
         const sections = await client.getCourseContents(courseId);
         
         // Return the actual course name (displayname or fullname) or fallback to Course ID
         return { 
           title: course?.displayname || course?.fullname || `Course ${courseId}`, 
           sections 
         };
      },
      batchFetchResources: client.batchFetchResources.bind(client),
      getCourseModule: async (cmid: number) => client.call('core_course_get_course_module', { cmid }),
    };
}
