/**
 * Test script to explore core_course_get_contents API parameters
 * 
 * Run with: npx ts-node src/lib/moodle/__tests__/test-course-contents.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MOODLE_URL = process.env.NEXT_PUBLIC_MOODLE_URL || 'https://mylms.vossie.net';
const MOODLE_TOKEN = process.env.MOODLE_TOKEN;
const TEST_COURSE_ID = process.env.TEST_COURSE_ID;

async function callMoodleApi(wsfunction: string, args: Record<string, any> = {}): Promise<any> {
  const params = new URLSearchParams({
    wstoken: MOODLE_TOKEN!,
    wsfunction,
    moodlewsrestformat: 'json',
    ...args,
  });

  const url = `${MOODLE_URL}/webservice/rest/server.php?${params.toString()}`;
  
  console.log(`\n🔗 Request URL: ${url.substring(0, 100)}...`);
  console.log(`📋 Parameters:`, Object.keys(args).length > 0 ? args : 'none (just courseid)');
  
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

async function testBasicCourseContents() {
  console.log('\n' + '='.repeat(80));
  console.log('📋 TEST 1: Basic core_course_get_contents (just courseid)');
  console.log('='.repeat(80));

  try {
    const data = await callMoodleApi('core_course_get_contents', {
      courseid: TEST_COURSE_ID,
    });

    console.log(`\n✅ Success! Received ${Array.isArray(data) ? data.length : 0} section(s)`);
    
    if (Array.isArray(data) && data.length > 0) {
      const firstSection = data[0];
      console.log(`\n📦 First section structure:`);
      console.log(`   Section fields: ${Object.keys(firstSection).join(', ')}`);
      
      if (firstSection.modules && firstSection.modules.length > 0) {
        const firstModule = firstSection.modules[0];
        console.log(`\n   📄 First module structure:`);
        console.log(`      Module fields: ${Object.keys(firstModule).join(', ')}`);
        console.log(`      Module name: ${firstModule.name}`);
        console.log(`      Module type: ${firstModule.modname}`);
      }
    }
    
    return data;
  } catch (error) {
    console.log(`\n❌ Error: ${error}`);
    return null;
  }
}

async function testWithOptions() {
  console.log('\n' + '='.repeat(80));
  console.log('📋 TEST 2: Testing optional parameters');
  console.log('='.repeat(80));

  const options = [
    { name: 'excludemodules', value: '0', description: 'Include modules (default)' },
    { name: 'excludemodules', value: '1', description: 'Exclude module data' },
    { name: 'excludecontents', value: '0', description: 'Include contents (default)' },
    { name: 'excludecontents', value: '1', description: 'Exclude contents data' },
    { name: 'includestealthmodules', value: '0', description: 'Exclude stealth modules (default)' },
    { name: 'includestealthmodules', value: '1', description: 'Include stealth modules' },
  ];

  for (const option of options) {
    console.log(`\n\n🧪 Testing: ${option.description}`);
    console.log(`   Parameter: ${option.name}=${option.value}`);
    
    try {
      const params = {
        courseid: TEST_COURSE_ID,
        [option.name]: option.value,
      } as Record<string, string>;
      
      const data = await callMoodleApi('core_course_get_contents', params);
      
      if (Array.isArray(data)) {
        console.log(`   ✅ Success! Received ${data.length} section(s)`);
        
        if (data.length > 0 && data[0].modules) {
          console.log(`      First section has ${data[0].modules.length} modules`);
          
          if (data[0].modules.length > 0) {
            const mod = data[0].modules[0];
            console.log(`      Module has ${Object.keys(mod).length} fields`);
            console.log(`      Module fields: ${Object.keys(mod).join(', ')}`);
            
            if (mod.contents) {
              console.log(`      ✅ Module contents present: ${mod.contents.length} item(s)`);
            } else {
              console.log(`      ⚠️  Module contents not present`);
            }
          }
        }
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error}`);
    }
  }
}

async function testSectionIdFilter() {
  console.log('\n' + '='.repeat(80));
  console.log('📋 TEST 3: Testing sectionid parameter (filter by section)');
  console.log('='.repeat(80));

  try {
    // First get all sections to see available IDs
    const allSections = await callMoodleApi('core_course_get_contents', {
      courseid: TEST_COURSE_ID,
    });

    if (Array.isArray(allSections) && allSections.length > 0) {
      console.log(`\n📚 Available sections:`);
      allSections.forEach((section: any, idx: number) => {
        console.log(`   [${idx}] ID=${section.id}, Name="${section.name}"`);
      });

      // Test filtering by first section
      const firstSectionId = allSections[0].id;
      console.log(`\n\n🧪 Testing filter by sectionid=${firstSectionId}`);
      
      const filtered = await callMoodleApi('core_course_get_contents', {
        courseid: TEST_COURSE_ID,
        sectionid: firstSectionId.toString(),
      });

      if (Array.isArray(filtered)) {
        console.log(`   ✅ Filtered result: ${filtered.length} section(s)`);
        if (filtered.length > 0) {
          console.log(`      Section ID: ${filtered[0].id}`);
          console.log(`      Section name: ${filtered[0].name}`);
        }
      }
    }
  } catch (error) {
    console.log(`\n❌ Error: ${error}`);
  }
}

async function testSectionNumberFilter() {
  console.log('\n' + '='.repeat(80));
  console.log('📋 TEST 4: Testing sectionnumber parameter');
  console.log('='.repeat(80));

  try {
    console.log(`\n🧪 Testing filter by sectionnumber=0 (first section)`);
    
    const filtered = await callMoodleApi('core_course_get_contents', {
      courseid: TEST_COURSE_ID,
      sectionnumber: '0',
    });

    if (Array.isArray(filtered)) {
      console.log(`   ✅ Filtered result: ${filtered.length} section(s)`);
      if (filtered.length > 0) {
        console.log(`      Section: ${filtered[0].name}`);
        console.log(`      Modules: ${filtered[0].modules?.length || 0}`);
      }
    }
  } catch (error) {
    console.log(`\n❌ Error: ${error}`);
  }
}

async function testModuleIdFilter() {
  console.log('\n' + '='.repeat(80));
  console.log('📋 TEST 5: Testing modid parameter (filter by module)');
  console.log('='.repeat(80));

  try {
    // First get all modules to find an ID
    const allSections = await callMoodleApi('core_course_get_contents', {
      courseid: TEST_COURSE_ID,
    });

    let firstModId = null;
    if (Array.isArray(allSections)) {
      for (const section of allSections) {
        if (section.modules && section.modules.length > 0) {
          firstModId = section.modules[0].id;
          console.log(`\n📄 Found module: ${section.modules[0].name} (ID=${firstModId})`);
          break;
        }
      }
    }

    if (firstModId) {
      console.log(`\n🧪 Testing filter by modid=${firstModId}`);
      
      const filtered = await callMoodleApi('core_course_get_contents', {
        courseid: TEST_COURSE_ID,
        modid: firstModId.toString(),
      });

      console.log(`   ✅ Result type: ${typeof filtered}`);
      console.log(`   Result: ${JSON.stringify(filtered, null, 2).substring(0, 500)}...`);
    } else {
      console.log(`\n⚠️  No modules found in course`);
    }
  } catch (error) {
    console.log(`\n❌ Error: ${error}`);
  }
}

async function testModuleNumberFilter() {
  console.log('\n' + '='.repeat(80));
  console.log('📋 TEST 6: Testing modname parameter (filter by module type)');
  console.log('='.repeat(80));

  const modTypes = ['book', 'resource', 'url', 'label', 'folder'];

  for (const modType of modTypes) {
    console.log(`\n🧪 Testing filter by modname=${modType}`);
    
    try {
      const filtered = await callMoodleApi('core_course_get_contents', {
        courseid: TEST_COURSE_ID,
        modname: modType,
      });

      if (Array.isArray(filtered)) {
        let totalModules = 0;
        filtered.forEach((section: any) => {
          if (section.modules) {
            const matching = section.modules.filter((m: any) => m.modname === modType);
            totalModules += matching.length;
          }
        });
        console.log(`   ✅ Found ${totalModules} ${modType} module(s)`);
      }
    } catch (error) {
      console.log(`   ⚠️  Error or not supported: ${error}`);
    }
  }
}

async function printParameterSummary() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 PARAMETER SUMMARY FOR core_course_get_contents');
  console.log('='.repeat(80));
  console.log(`
📋 Required Parameters:
   • courseid (int) - The course ID

📋 Optional Parameters (based on Moodle documentation):
   • excludemodules (int) - 1 to exclude modules, 0 to include (default 0)
   • excludecontents (int) - 1 to exclude contents, 0 to include (default 0)
   • includestealthmodules (int) - 1 to include stealth modules (default 0)
   • sectionid (int) - Filter by specific section ID
   • sectionnumber (int) - Filter by section number (0-based)
   • modid (int) - Filter by specific module ID
   • modname (string) - Filter by module type (e.g., 'book', 'resource')

💡 Tips:
   • Use excludecontents=1 for faster queries if you only need metadata
   • Use sectionid or sectionnumber to get modules from a specific section
   • Use modid to get a single module's data
   • Module contents include files, URLs, and other resources
  `);
}

async function main() {
  console.log('\n🚀 core_course_get_contents API Parameter Explorer');
  console.log('=' .repeat(80));
  
  if (!MOODLE_TOKEN) {
    console.log('\n❌ Error: MOODLE_TOKEN not set in environment variables');
    console.log('\nPlease set MOODLE_TOKEN in your .env.local file\n');
    process.exit(1);
  }

  if (!TEST_COURSE_ID) {
    console.log('\n❌ Error: TEST_COURSE_ID not set in environment variables');
    console.log('\nPlease set TEST_COURSE_ID in your .env.local file\n');
    process.exit(1);
  }

  console.log(`\n📍 Moodle URL: ${MOODLE_URL}`);
  console.log(`🔑 Token: ${MOODLE_TOKEN.substring(0, 8)}...`);
  console.log(`📚 Test Course ID: ${TEST_COURSE_ID}`);

  // Run all tests
  await testBasicCourseContents();
  await testWithOptions();
  await testSectionIdFilter();
  await testSectionNumberFilter();
  await testModuleIdFilter();
  await testModuleNumberFilter();
  await printParameterSummary();

  console.log('\n✅ Exploration complete!\n');
}

// Run the script
main().catch(console.error);
