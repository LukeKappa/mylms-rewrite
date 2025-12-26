import { getMoodleClient } from './moodle';

/**
 * Check if Moodle API returns HTML content directly in core_course_get_contents
 * This would allow us to skip scraping entirely for some modules
 */
export async function investigateAPIContent() {
  try {
    const client = await getMoodleClient();
    if (!client) {
      console.log('No API client available');
      return;
    }

    // Test with a sample course - replace with your actual course ID
    const testCourseId = 30404; // Your course ID from the screenshot
    
    console.log('\n========== Investigating API Content ==========');
    console.log(`Fetching course contents for course ${testCourseId}...`);
    
    const contents = await client.call('core_course_get_contents', { courseid: testCourseId });
    
    console.log(`Found ${contents.length} sections`);
    
    // Check each section/module for content
    contents.forEach((section: any, sIndex: number) => {
      console.log(`\nSection ${sIndex}: ${section.name}`);
      
      section.modules.forEach((mod: any, mIndex: number) => {
        console.log(`  Module ${mIndex}: ${mod.name} (type: ${mod.modname})`);
        
        // Check if module has contents array
        if (mod.contents && Array.isArray(mod.contents)) {
          console.log(`    ✅ Has contents array (${mod.contents.length} items)`);
          
          mod.contents.forEach((content: any, cIndex: number) => {
            console.log(`      Content ${cIndex}:`);
            console.log(`        - type: ${content.type}`);
            console.log(`        - filename: ${content.filename}`);
            
            // THIS IS KEY: Check if there's HTML content directly in the response
            if (content.content) {
              console.log(`        - 🎯 HAS INLINE CONTENT! Length: ${content.content.length} chars`);
              console.log(`        - Preview: ${content.content.substring(0, 100)}...`);
            }
          });
        }
        
        // Check for description/intro fields that might have HTML
        if (mod.description) {
          console.log(`    📝 Has description: ${mod.description.substring(0, 100)}...`);
        }
      });
    });
    
    console.log('\n========== Investigation Complete ==========\n');
    
  } catch (error) {
    console.error('Investigation failed:', error);
  }
}

// Run this manually in console or as a test endpoint
if (require.main === module) {
  investigateAPIContent();
}
