/**
 * Script to extract all available API functions from Moodle
 * Run with: npx ts-node src/lib/moodle/__tests__/get-site-functions.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MOODLE_URL = process.env.NEXT_PUBLIC_MOODLE_URL || 'https://mylms.vossie.net';
const MOODLE_TOKEN = process.env.MOODLE_TOKEN;

async function getSiteInfo() {
  const params = new URLSearchParams({
    wstoken: MOODLE_TOKEN!,
    wsfunction: 'core_webservice_get_site_info',
    moodlewsrestformat: 'json',
  });

  const url = `${MOODLE_URL}/webservice/rest/server.php?${params.toString()}`;
  const response = await fetch(url);
  const data = await response.json();
  
  return data;
}

async function main() {
  console.log('🔍 Fetching all available API functions...\n');
  
  const siteInfo = await getSiteInfo();
  
  if (!siteInfo.functions) {
    console.log('❌ No functions found');
    return;
  }

  console.log(`✅ Found ${siteInfo.functions.length} total functions\n`);

  // Group functions by category
  const categories: Record<string, any[]> = {};
  
  siteInfo.functions.forEach((fn: any) => {
    const prefix = fn.name.split('_')[0];
    if (!categories[prefix]) {
      categories[prefix] = [];
    }
    categories[prefix].push(fn);
  });

  // Print summary
  console.log('📊 Functions by category:\n');
  Object.keys(categories).sort().forEach(category => {
    console.log(`${category}: ${categories[category].length} functions`);
  });

  // Create detailed markdown output
  let markdown = '# Moodle API Function Map\n\n';
  markdown += `Generated: ${new Date().toISOString()}\n\n`;
  markdown += `Total Functions: ${siteInfo.functions.length}\n\n`;
  markdown += `## Categories\n\n`;

  Object.keys(categories).sort().forEach(category => {
    markdown += `### ${category} (${categories[category].length} functions)\n\n`;
    
    categories[category].sort((a, b) => a.name.localeCompare(b.name)).forEach(fn => {
      markdown += `- **${fn.name}**\n`;
      if (fn.version) markdown += `  - Version: ${fn.version}\n`;
    });
    
    markdown += '\n';
  });

  // Highlight important categories
  markdown += '\n## Key Categories for LMS Dashboard\n\n';
  
  const importantCategories = [
    'core_course',
    'core_enrol', 
    'core_user',
    'mod_book',
    'mod_resource',
    'mod_forum',
    'mod_assign',
    'tool_mobile',
    'core_calendar',
    'core_message',
    'core_grades'
  ];

  importantCategories.forEach(cat => {
    if (categories[cat]) {
      markdown += `### ${cat}\n\n`;
      categories[cat].forEach(fn => {
        markdown += `- \`${fn.name}\`\n`;
      });
      markdown += '\n';
    }
  });

  // Write to file
  const outputPath = path.resolve(process.cwd(), 'src/lib/moodle/__tests__/MOODLE_API_FUNCTIONS.md');
  fs.writeFileSync(outputPath, markdown);
  
  console.log(`\n✅ Created API map at: ${outputPath}`);
  
  // Also create JSON for programmatic use
  const jsonPath = path.resolve(process.cwd(), 'src/lib/moodle/__tests__/moodle-api-functions.json');
  fs.writeFileSync(jsonPath, JSON.stringify({
    generated: new Date().toISOString(),
    totalFunctions: siteInfo.functions.length,
    categories,
    functions: siteInfo.functions
  }, null, 2));
  
  console.log(`✅ Created JSON map at: ${jsonPath}`);
}

main().catch(console.error);
