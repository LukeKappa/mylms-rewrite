/**
 * Standalone script to explore Moodle Mobile API endpoints
 * 
 * Run with: npx ts-node src/lib/moodle/__tests__/explore-api.ts
 * 
 * Or add to package.json:
 * "scripts": {
 *   "explore-api": "ts-node src/lib/moodle/__tests__/explore-api.ts"
 * }
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MOODLE_URL = process.env.NEXT_PUBLIC_MOODLE_URL || 'https://mylms.vossie.net';
const MOODLE_TOKEN = process.env.MOODLE_TOKEN;
const TEST_COURSE_ID = process.env.TEST_COURSE_ID;
const TEST_BOOK_CMID = process.env.TEST_BOOK_CMID;
const TEST_BOOK_ID = process.env.TEST_BOOK_ID;

interface ApiTestResult {
  endpoint: string;
  method?: string;
  success: boolean;
  data?: any;
  error?: string;
  availableFields?: string[];
}

const results: ApiTestResult[] = [];

async function callMoodleApi(wsfunction: string, args: Record<string, any> = {}): Promise<any> {
  const params = new URLSearchParams({
    wstoken: MOODLE_TOKEN!,
    wsfunction,
    moodlewsrestformat: 'json',
    ...args,
  });

  const url = `${MOODLE_URL}/webservice/rest/server.php?${params.toString()}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.exception || data.errorcode) {
      throw new Error(data.message || data.errorcode);
    }
    
    return data;
  } catch (error) {
    throw error;
  }
}

async function testMobileContentApi() {
  console.log('\n🔍 Testing tool_mobile_get_content API...\n');

  if (!TEST_BOOK_CMID || !TEST_COURSE_ID) {
    console.log('⚠️  Skipping: Set TEST_BOOK_CMID and TEST_COURSE_ID environment variables\n');
    return;
  }

  const methods = [
    'mobile_course_view',
    'mobile_view',
    'mobile_book_view',
    'mobile_contents_view',
  ];

  for (const method of methods) {
    const params = new URLSearchParams({
      wstoken: MOODLE_TOKEN!,
      wsfunction: 'tool_mobile_get_content',
      moodlewsrestformat: 'json',
      component: 'mod_book',
      method: method,
      'args[0][name]': 'cmid',
      'args[0][value]': TEST_BOOK_CMID,
      'args[1][name]': 'courseid',
      'args[1][value]': TEST_COURSE_ID,
    });

    const url = `${MOODLE_URL}/webservice/rest/server.php?${params.toString()}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.exception || data.errorcode) {
        console.log(`❌ Method '${method}': ${data.message || data.errorcode}`);
        results.push({
          endpoint: 'tool_mobile_get_content',
          method,
          success: false,
          error: data.message || data.errorcode,
        });
      } else {
        console.log(`✅ Method '${method}' succeeded!`);
        console.log(`   Available fields: ${Object.keys(data).join(', ')}\n`);
        
        if (data.templates) {
          console.log(`   📄 Templates: ${data.templates.length} template(s)`);
        }
        if (data.otherdata) {
          console.log(`   📦 Other data: ${Object.keys(data.otherdata).join(', ')}`);
        }
        if (data.files) {
          console.log(`   📁 Files: ${data.files.length} file(s)`);
        }
        
        console.log('');
        
        results.push({
          endpoint: 'tool_mobile_get_content',
          method,
          success: true,
          data: JSON.stringify(data, null, 2),
          availableFields: Object.keys(data),
        });
      }
    } catch (error) {
      console.log(`❌ Method '${method}': ${error}\n`);
      results.push({
        endpoint: 'tool_mobile_get_content',
        method,
        success: false,
        error: String(error),
      });
    }
  }
}

async function testBooksByCoursesApi() {
  console.log('\n📚 Testing mod_book_get_books_by_courses...\n');

  if (!TEST_COURSE_ID) {
    console.log('⚠️  Skipping: Set TEST_COURSE_ID environment variable\n');
    return;
  }

  try {
    const data = await callMoodleApi('mod_book_get_books_by_courses', {
      'courseids[0]': TEST_COURSE_ID,
    });

    console.log(`✅ Found ${data.books?.length || 0} book(s) in course ${TEST_COURSE_ID}\n`);
    
    if (data.books && data.books.length > 0) {
      data.books.forEach((book: any) => {
        console.log(`📖 ${book.name}`);
        console.log(`   ID: ${book.id}`);
        console.log(`   CM ID: ${book.coursemodule}`);
        console.log(`   Fields: ${Object.keys(book).join(', ')}\n`);
      });
    }

    results.push({
      endpoint: 'mod_book_get_books_by_courses',
      success: true,
      data: JSON.stringify(data, null, 2),
      availableFields: data.books?.[0] ? Object.keys(data.books[0]) : [],
    });
  } catch (error) {
    console.log(`❌ Error: ${error}\n`);
    results.push({
      endpoint: 'mod_book_get_books_by_courses',
      success: false,
      error: String(error),
    });
  }
}

async function testCourseContentsApi() {
  console.log('\n📋 Testing core_course_get_contents for book modules...\n');

  if (!TEST_COURSE_ID) {
    console.log('⚠️  Skipping: Set TEST_COURSE_ID environment variable\n');
    return;
  }

  try {
    const data = await callMoodleApi('core_course_get_contents', {
      courseid: TEST_COURSE_ID,
    });

    let bookCount = 0;
    
    if (Array.isArray(data)) {
      data.forEach((section: any) => {
        const bookModules = section.modules?.filter((mod: any) => mod.modname === 'book') || [];
        
        if (bookModules.length > 0) {
          console.log(`📖 Section "${section.name}" contains ${bookModules.length} book(s):\n`);
          bookModules.forEach((book: any) => {
            bookCount++;
            console.log(`   Book: ${book.name}`);
            console.log(`   CMID: ${book.id}`);
            console.log(`   Instance ID: ${book.instance}`);
            console.log(`   URL: ${book.url}`);
            console.log(`   Fields: ${Object.keys(book).join(', ')}`);
            
            if (book.contents && book.contents.length > 0) {
              console.log(`   ✅ Contents: ${book.contents.length} item(s)`);
              book.contents.slice(0, 2).forEach((content: any, idx: number) => {
                console.log(`      [${idx}] ${content.filename || content.type}: ${Object.keys(content).join(', ')}`);
              });
            } else {
              console.log(`   ⚠️  No contents in module data`);
            }
            console.log('');
          });
        }
      });
    }

    console.log(`Total books found: ${bookCount}\n`);

    results.push({
      endpoint: 'core_course_get_contents',
      success: true,
      data: `Found ${bookCount} book module(s)`,
    });
  } catch (error) {
    console.log(`❌ Error: ${error}\n`);
    results.push({
      endpoint: 'core_course_get_contents',
      success: false,
      error: String(error),
    });
  }
}

async function testSiteInfo() {
  console.log('\n🔧 Testing core_webservice_get_site_info...\n');

  try {
    const data = await callMoodleApi('core_webservice_get_site_info');

    const bookFunctions = data.functions?.filter((fn: any) => 
      fn.name.toLowerCase().includes('book')
    ) || [];

    const mobileFunctions = data.functions?.filter((fn: any) => 
      fn.name.toLowerCase().includes('mobile') && fn.name.toLowerCase().includes('content')
    ) || [];

    console.log(`📚 Book-related functions (${bookFunctions.length}):`);
    bookFunctions.forEach((fn: any) => console.log(`   - ${fn.name}`));
    
    console.log(`\n📱 Mobile content functions (${mobileFunctions.length}):`);
    mobileFunctions.forEach((fn: any) => console.log(`   - ${fn.name}`));
    
    console.log('');

    results.push({
      endpoint: 'core_webservice_get_site_info',
      success: true,
      data: `Found ${bookFunctions.length} book functions and ${mobileFunctions.length} mobile content functions`,
    });
  } catch (error) {
    console.log(`❌ Error: ${error}\n`);
    results.push({
      endpoint: 'core_webservice_get_site_info',
      success: false,
      error: String(error),
    });
  }
}

async function printSummary() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY OF API EXPLORATION');
  console.log('='.repeat(80) + '\n');

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}\n`);

  if (successful.length > 0) {
    console.log('Working Endpoints:');
    successful.forEach(r => {
      const label = r.method ? `${r.endpoint} (${r.method})` : r.endpoint;
      console.log(`  ✅ ${label}`);
      if (r.availableFields && r.availableFields.length > 0) {
        console.log(`     Fields: ${r.availableFields.join(', ')}`);
      }
    });
    console.log('');
  }

  if (failed.length > 0) {
    console.log('Failed Endpoints:');
    failed.forEach(r => {
      const label = r.method ? `${r.endpoint} (${r.method})` : r.endpoint;
      console.log(`  ❌ ${label}`);
      if (r.error) {
        console.log(`     Error: ${r.error}`);
      }
    });
    console.log('');
  }

  console.log('💡 Recommendations:');
  console.log('  - If mobile API methods failed, use standard APIs instead');
  console.log('  - If book content is not available via API, use web scraping');
  console.log('  - Check mod_book_get_books_by_courses for book metadata');
  console.log('  - Use core_course_get_contents to discover book modules\n');
}

async function main() {
  console.log('🚀 Moodle Mobile API Explorer');
  console.log('=' .repeat(80));
  
  if (!MOODLE_TOKEN) {
    console.log('\n❌ Error: MOODLE_TOKEN not set in environment variables');
    console.log('\nPlease add to your .env.local:');
    console.log('  MOODLE_TOKEN=your_token_here');
    console.log('  TEST_COURSE_ID=123');
    console.log('  TEST_BOOK_CMID=456');
    console.log('  TEST_BOOK_ID=789\n');
    process.exit(1);
  }

  console.log(`\n📍 Moodle URL: ${MOODLE_URL}`);
  console.log(`🔑 Token: ${MOODLE_TOKEN.substring(0, 8)}...`);
  console.log(`📚 Test Course ID: ${TEST_COURSE_ID || 'Not set'}`);
  console.log(`📖 Test Book CMID: ${TEST_BOOK_CMID || 'Not set'}`);
  console.log(`📘 Test Book ID: ${TEST_BOOK_ID || 'Not set'}`);

  await testSiteInfo();
  await testBooksByCoursesApi();
  await testCourseContentsApi();
  await testMobileContentApi();
  await printSummary();

  console.log('✅ Exploration complete!\n');
}

// Run the script
main().catch(console.error);
