/**
 * Helper script to discover Course IDs and Book IDs for testing
 * 
 * Run with: npm run find-test-ids
 * 
 * This will connect to your Moodle instance and show you all available
 * courses and books with their IDs that you can use for testing.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MOODLE_URL = process.env.NEXT_PUBLIC_MOODLE_URL || 'https://mylms.vossie.net';
const MOODLE_TOKEN = process.env.MOODLE_TOKEN;

interface Course {
  id: number;
  fullname: string;
  shortname: string;
}

interface BookModule {
  id: number; // CMID
  instance: number; // Book instance ID
  name: string;
  url: string;
}

interface Section {
  name: string;
  modules: any[];
}

async function callMoodleApi(wsfunction: string, args: Record<string, any> = {}): Promise<any> {
  const params = new URLSearchParams({
    wstoken: MOODLE_TOKEN!,
    wsfunction,
    moodlewsrestformat: 'json',
    ...args,
  } as Record<string, string>);

  const url = `${MOODLE_URL}/webservice/rest/server.php?${params.toString()}`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  if (data.exception || data.errorcode) {
    throw new Error(data.message || data.errorcode);
  }
  
  return data;
}

async function getSiteInfo() {
  console.log('🔍 Fetching site information...\n');
  const siteInfo = await callMoodleApi('core_webservice_get_site_info');
  return {
    userid: siteInfo.userid,
    fullname: siteInfo.fullname,
  };
}

async function getCourses(userid: number): Promise<Course[]> {
  console.log('📚 Fetching your courses...\n');
  const courses = await callMoodleApi('core_enrol_get_users_courses', { userid: userid.toString() });
  return courses;
}

async function getBooksInCourse(courseId: number): Promise<BookModule[]> {
  try {
    const sections: Section[] = await callMoodleApi('core_course_get_contents', { 
      courseid: courseId.toString() 
    });
    
    const books: BookModule[] = [];
    
    sections.forEach(section => {
      section.modules?.forEach(mod => {
        if (mod.modname === 'book') {
          books.push({
            id: mod.id, // This is the CMID
            instance: mod.instance, // This is the book instance ID
            name: mod.name,
            url: mod.url,
          });
        }
      });
    });
    
    return books;
  } catch (error) {
    console.error(`   ⚠️  Error fetching books for course ${courseId}:`, error);
    return [];
  }
}

async function main() {
  console.log('🎯 Moodle Test ID Finder');
  console.log('='.repeat(80));
  
  if (!MOODLE_TOKEN) {
    console.log('\n❌ Error: MOODLE_TOKEN not set in .env.local');
    console.log('\nPlease add your Moodle token to .env.local:');
    console.log('  MOODLE_TOKEN=your_token_here\n');
    console.log('You can get your token from your Moodle instance after logging in.');
    console.log('Check your browser cookies or use the Moodle mobile app token service.\n');
    process.exit(1);
  }

  console.log(`\n📍 Moodle URL: ${MOODLE_URL}`);
  console.log(`🔑 Token: ${MOODLE_TOKEN.substring(0, 8)}...\n`);

  try {
    // Get user info
    const { userid, fullname } = await getSiteInfo();
    console.log(`👤 Logged in as: ${fullname} (ID: ${userid})\n`);

    // Get all courses
    const courses = await getCourses(userid);
    
    if (courses.length === 0) {
      console.log('⚠️  No courses found for this user.\n');
      process.exit(0);
    }

    console.log(`✅ Found ${courses.length} course(s)\n`);
    console.log('='.repeat(80));

    let totalBooks = 0;
    const suggestions: Array<{courseId: number, bookCmid: number, bookInstance: number, courseName: string, bookName: string}> = [];

    // Check each course for books
    for (const course of courses) {
      console.log(`\n📖 Course: ${course.fullname}`);
      console.log(`   Short name: ${course.shortname}`);
      console.log(`   Course ID: ${course.id}`);
      
      const books = await getBooksInCourse(course.id);
      
      if (books.length > 0) {
        console.log(`   📚 Books found: ${books.length}`);
        books.forEach((book, idx) => {
          console.log(`\n   Book ${idx + 1}: ${book.name}`);
          console.log(`      CMID (Course Module ID): ${book.id}`);
          console.log(`      Instance ID: ${book.instance}`);
          console.log(`      URL: ${book.url}`);
          
          totalBooks++;
          suggestions.push({
            courseId: course.id,
            bookCmid: book.id,
            bookInstance: book.instance,
            courseName: course.fullname,
            bookName: book.name,
          });
        });
      } else {
        console.log(`   ℹ️  No books in this course`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 SUMMARY');
    console.log('='.repeat(80));
    console.log(`\nTotal Courses: ${courses.length}`);
    console.log(`Total Books: ${totalBooks}\n`);

    if (suggestions.length > 0) {
      console.log('💡 SUGGESTED TEST VALUES FOR .env.local:');
      console.log('='.repeat(80));
      
      const suggestion = suggestions[0];
      console.log(`\n# Use this book for testing:`);
      console.log(`# Course: "${suggestion.courseName}"`);
      console.log(`# Book: "${suggestion.bookName}"`);
      console.log(`TEST_COURSE_ID=${suggestion.courseId}`);
      console.log(`TEST_BOOK_CMID=${suggestion.bookCmid}`);
      console.log(`TEST_BOOK_ID=${suggestion.bookInstance}`);
      
      console.log('\n✅ Copy the above 3 lines to your .env.local file!\n');
      
      if (suggestions.length > 1) {
        console.log(`\nℹ️  You have ${suggestions.length} books total. Here are all options:\n`);
        suggestions.forEach((s, idx) => {
          console.log(`Option ${idx + 1}:`);
          console.log(`  Course: "${s.courseName}"`);
          console.log(`  Book: "${s.bookName}"`);
          console.log(`  TEST_COURSE_ID=${s.courseId}`);
          console.log(`  TEST_BOOK_CMID=${s.bookCmid}`);
          console.log(`  TEST_BOOK_ID=${s.bookInstance}\n`);
        });
      }
    } else {
      console.log('⚠️  No books found in any of your courses.');
      console.log('\nYou can still add any course ID for testing:');
      if (courses.length > 0) {
        console.log(`\nTEST_COURSE_ID=${courses[0].id}  # ${courses[0].fullname}`);
      }
      console.log('\nNote: Book-specific tests will be skipped without book IDs.\n');
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
    console.error('\nTroubleshooting:');
    console.error('  1. Check that your MOODLE_TOKEN is valid');
    console.error('  2. Make sure you have access to courses');
    console.error('  3. Verify your Moodle URL is correct');
    console.error('  4. Check your internet connection\n');
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);
