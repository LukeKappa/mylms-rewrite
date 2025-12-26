/**
 * Tests to explore what's exposed in the Moodle Mobile API endpoints
 * 
 * This test suite checks the tool_mobile_get_content endpoint for various
 * module types, especially books, to understand what data is available.
 */

describe('Moodle Mobile API Exploration', () => {
  const MOODLE_URL = process.env.NEXT_PUBLIC_MOODLE_URL || 'https://mylms.vossie.net';
  const MOODLE_TOKEN = process.env.MOODLE_TOKEN || process.env.TEST_MOODLE_TOKEN;
  
  // Skip tests if no token is provided
  const testIf = (condition: boolean) => condition ? test : test.skip;
  const hasToken = !!MOODLE_TOKEN;

  describe('tool_mobile_get_content API', () => {
    testIf(hasToken)('should expose book content via mobile_course_view', async () => {
      // This test requires actual CMID and Course ID values
      // Replace YOUR_BOOK_CMID and YOUR_COURSE_ID with real values from your Moodle instance
      const BOOK_CMID = process.env.TEST_BOOK_CMID || 'YOUR_BOOK_CMID';
      const COURSE_ID = process.env.TEST_COURSE_ID || 'YOUR_COURSE_ID';

      if (BOOK_CMID === 'YOUR_BOOK_CMID' || COURSE_ID === 'YOUR_COURSE_ID') {
        console.warn('⚠️  Skipping test: Set TEST_BOOK_CMID and TEST_COURSE_ID environment variables');
        return;
      }

      const url = `${MOODLE_URL}/webservice/rest/server.php`;
      const params = new URLSearchParams({
        wstoken: MOODLE_TOKEN!,
        wsfunction: 'tool_mobile_get_content',
        moodlewsrestformat: 'json',
        component: 'mod_book',
        method: 'mobile_course_view',
        'args[0][name]': 'cmid',
        'args[0][value]': BOOK_CMID,
        'args[1][name]': 'courseid',
        'args[1][value]': COURSE_ID,
      } as Record<string, string>);

      const response = await fetch(`${url}?${params.toString()}`);
      expect(response.ok).toBe(true);

      const data = await response.json();
      
      // Log the full response for inspection
      console.log('📖 Book Content Response:', JSON.stringify(data, null, 2));

      // Check for error
      expect(data.exception).toBeUndefined();
      expect(data.errorcode).toBeUndefined();

      // Document what fields are available
      if (data) {
        console.log('✅ Available fields:', Object.keys(data));
        
        // Common expected fields from mobile API responses
        if (data.templates) console.log('📄 Templates available:', data.templates.length);
        if (data.javascript) console.log('🔧 JavaScript included');
        if (data.otherdata) console.log('📦 Other data fields:', Object.keys(data.otherdata || {}));
        if (data.files) console.log('📁 Files:', data.files.length);
      }
    });

    testIf(hasToken)('should check available mobile methods for mod_book', async () => {
      const url = `${MOODLE_URL}/webservice/rest/server.php`;
      const params = new URLSearchParams({
        wstoken: MOODLE_TOKEN!,
        wsfunction: 'core_webservice_get_site_info',
        moodlewsrestformat: 'json',
      } as Record<string, string>);

      const response = await fetch(`${url}?${params.toString()}`);
      const data = await response.json();

      // Find all available book-related functions
      const bookFunctions = data.functions?.filter((fn: any) => 
        fn.name.includes('book') || fn.name.includes('mod_book')
      ) || [];

      console.log('📚 Available book-related functions:');
      bookFunctions.forEach((fn: any) => {
        console.log(`  - ${fn.name}`);
      });

      // Find mobile content functions
      const mobileFunctions = data.functions?.filter((fn: any) => 
        fn.name.includes('mobile') && fn.name.includes('content')
      ) || [];

      console.log('\n📱 Available mobile content functions:');
      mobileFunctions.forEach((fn: any) => {
        console.log(`  - ${fn.name}`);
      });

      expect(data.functions).toBeDefined();
    });

    testIf(hasToken)('should test mod_book_get_books_by_courses', async () => {
      const COURSE_ID = process.env.TEST_COURSE_ID || 'YOUR_COURSE_ID';

      if (COURSE_ID === 'YOUR_COURSE_ID') {
        console.warn('⚠️  Skipping test: Set TEST_COURSE_ID environment variable');
        return;
      }

      const url = `${MOODLE_URL}/webservice/rest/server.php`;
      const params = new URLSearchParams({
        wstoken: MOODLE_TOKEN!,
        wsfunction: 'mod_book_get_books_by_courses',
        moodlewsrestformat: 'json',
        'courseids[0]': COURSE_ID,
      } as Record<string, string>);

      const response = await fetch(`${url}?${params.toString()}`);
      const data = await response.json();

      console.log('📚 Books by courses response:', JSON.stringify(data, null, 2));

      if (!data.exception && data.books) {
        console.log(`✅ Found ${data.books.length} books in course ${COURSE_ID}`);
        data.books.forEach((book: any) => {
          console.log(`\n📖 Book: ${book.name}`);
          console.log(`   ID: ${book.id}`);
          console.log(`   CM ID: ${book.coursemodule}`);
          console.log(`   Available fields:`, Object.keys(book));
        });
      }
    });

    testIf(hasToken)('should test alternative mobile content methods', async () => {
      const BOOK_CMID = process.env.TEST_BOOK_CMID || 'YOUR_BOOK_CMID';
      const COURSE_ID = process.env.TEST_COURSE_ID || 'YOUR_COURSE_ID';

      if (BOOK_CMID === 'YOUR_BOOK_CMID' || COURSE_ID === 'YOUR_COURSE_ID') {
        console.warn('⚠️  Skipping test: Set TEST_BOOK_CMID and TEST_COURSE_ID environment variables');
        return;
      }

      const methods = [
        'mobile_view',
        'mobile_book_view',
        'mobile_contents_view',
      ];

      const url = `${MOODLE_URL}/webservice/rest/server.php`;

      for (const method of methods) {
        console.log(`\n🔍 Testing method: ${method}`);
        
        const params = new URLSearchParams({
          wstoken: MOODLE_TOKEN!,
          wsfunction: 'tool_mobile_get_content',
          moodlewsrestformat: 'json',
          component: 'mod_book',
          method: method,
          'args[0][name]': 'cmid',
          'args[0][value]': BOOK_CMID,
          'args[1][name]': 'courseid',
          'args[1][value]': COURSE_ID,
        } as Record<string, string>);

        try {
          const response = await fetch(`${url}?${params.toString()}`);
          const data = await response.json();

          if (data.exception || data.errorcode) {
            console.log(`   ❌ Method '${method}' failed:`, data.message || data.errorcode);
          } else {
            console.log(`   ✅ Method '${method}' succeeded!`);
            console.log(`   Available fields:`, Object.keys(data));
          }
        } catch (error) {
          console.log(`   ❌ Method '${method}' threw error:`, error);
        }
      }
    });
  });

  describe('Standard Moodle API for Books', () => {
    testIf(hasToken)('should check if mod_book_view_book exists', async () => {
      const BOOK_ID = process.env.TEST_BOOK_ID || 'YOUR_BOOK_ID';

      if (BOOK_ID === 'YOUR_BOOK_ID') {
        console.warn('⚠️  Skipping test: Set TEST_BOOK_ID environment variable (the book instance ID, not CMID)');
        return;
      }

      const url = `${MOODLE_URL}/webservice/rest/server.php`;
      const params = new URLSearchParams({
        wstoken: MOODLE_TOKEN!,
        wsfunction: 'mod_book_view_book',
        moodlewsrestformat: 'json',
        bookid: BOOK_ID,
      } as Record<string, string>);

      const response = await fetch(`${url}?${params.toString()}`);
      const data = await response.json();

      console.log('📖 mod_book_view_book response:', JSON.stringify(data, null, 2));

      if (data.exception || data.errorcode) {
        console.log('❌ mod_book_view_book not available or failed');
      } else {
        console.log('✅ mod_book_view_book succeeded');
      }
    });

    testIf(hasToken)('should test core_course_get_contents for book modules', async () => {
      const COURSE_ID = process.env.TEST_COURSE_ID || 'YOUR_COURSE_ID';

      if (COURSE_ID === 'YOUR_COURSE_ID') {
        console.warn('⚠️  Skipping test: Set TEST_COURSE_ID environment variable');
        return;
      }

      const url = `${MOODLE_URL}/webservice/rest/server.php`;
      const params = new URLSearchParams({
        wstoken: MOODLE_TOKEN!,
        wsfunction: 'core_course_get_contents',
        moodlewsrestformat: 'json',
        courseid: COURSE_ID,
      } as Record<string, string>);

      const response = await fetch(`${url}?${params.toString()}`);
      const data = await response.json();

      console.log('📚 Looking for book modules in course contents...');

      if (Array.isArray(data)) {
        data.forEach((section: any) => {
          const bookModules = section.modules?.filter((mod: any) => mod.modname === 'book') || [];
          
          if (bookModules.length > 0) {
            console.log(`\n📖 Section "${section.name}" contains ${bookModules.length} book(s):`);
            bookModules.forEach((book: any) => {
              console.log(`\n  Book: ${book.name}`);
              console.log(`  Module ID (CMID): ${book.id}`);
              console.log(`  Instance ID: ${book.instance}`);
              console.log(`  URL: ${book.url}`);
              console.log(`  Available fields:`, Object.keys(book));
              
              if (book.contents && book.contents.length > 0) {
                console.log(`  Contents available (${book.contents.length} items):`);
                book.contents.forEach((content: any, idx: number) => {
                  console.log(`    [${idx}]:`, Object.keys(content));
                });
              } else {
                console.log(`  ⚠️  No contents array or empty`);
              }
            });
          }
        });
      }
    });
  });

  describe('Documentation', () => {
    test('should document how to use these tests', () => {
      console.log(`
🧪 Moodle API Exploration Test Suite
=====================================

This test suite helps you discover what data is available from the Moodle API,
particularly for book modules.

📋 Setup Instructions:
----------------------
1. Create a .env.local file in your project root (if not exists)
2. Add the following environment variables:

   NEXT_PUBLIC_MOODLE_URL=https://mylms.vossie.net
   MOODLE_TOKEN=your_actual_moodle_token
   TEST_COURSE_ID=123         # Replace with a real course ID
   TEST_BOOK_CMID=456         # Replace with a real book course module ID
   TEST_BOOK_ID=789           # Replace with a real book instance ID

3. Run the tests:
   npm test -- api-exploration.test.ts

📚 How to find these IDs:
-------------------------
- Course ID: Visit a course page, check URL: /course/view.php?id=XXX
- Book CMID: Visit a book, check URL: /mod/book/view.php?id=XXX
- Book Instance ID: Look at the book module in core_course_get_contents response

🔍 What to look for:
--------------------
The tests will output detailed JSON responses showing:
- Available fields in each API response
- Whether mobile API methods work for books
- What content is exposed (if any)
- Alternative methods to fetch book data

💡 Expected Findings:
---------------------
Based on typical Moodle installations:
- tool_mobile_get_content may or may not support books (depends on version)
- mod_book_get_books_by_courses provides metadata but not chapter content
- core_course_get_contents shows book modules but usually not chapter content
- Book chapters may need to be scraped from the web interface
      `);
      
      expect(true).toBe(true);
    });
  });
});
