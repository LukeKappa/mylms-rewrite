# core_course_get_contents API Parameters

## Test Results Summary

Based on testing against your Moodle instance at `mylms.vossie.net`, here's what the `core_course_get_contents` endpoint can receive.

## ✅ Working Parameters

### Required
- **`courseid`** (int) - The course ID to retrieve contents from
  - Example: `6109`
  - This is the only required parameter

### Optional - Content Filtering
- **`excludemodules`** (int) - Whether to exclude module data
  - `0` = Include modules (default)
  - `1` = Exclude modules, sections only
  - ✅ Tested and working

- **`excludecontents`** (int) - Whether to exclude file/content data
  - `0` = Include contents (default)
  - `1` = Exclude contents (module metadata only)
  - ✅ Tested and working

- **`includestealthmodules`** (int) - Whether to include hidden/stealth modules
  - `0` = Exclude stealth modules (default)
  - `1` = Include stealth modules
  - ✅ Tested and working

### Optional - Section Filtering
- **`sectionid`** (int) - Filter to a specific section by its ID
  - Returns only that section
  - ✅ Tested and working
  - Example: Get section ID from initial call, then filter

- **`sectionnumber`** (int) - Filter to a specific section by its number (0-based)
  - `0` = First section
  - `1` = Second section, etc.
  - ✅ Tested and working

### Optional - Module Filtering
- **`modid`** (int) - Filter to a specific module by its ID (CM ID)
  - Returns sections containing that module
  - ✅ Tested and working

## ❌ Non-Working Parameters

- **`modname`** (string) - Filter by module type (e.g., 'book', 'resource')
  - ❌ Returns error: "Invalid parameter value detected"
  - This parameter may not be supported in your Moodle version

## Response Structure

When successful, the API returns an array of sections:

```typescript
[
  {
    id: number,              // Section ID
    name: string,            // Section name
    visible: number,         // Whether section is visible
    summary: string,         // Section description
    summaryformat: number,   // Format of summary
    section: number,         // Section number (0-based)
    hiddenbynumsections: number,
    uservisible: boolean,    // Whether visible to current user
    
    modules: [               // Array of modules (if not excluded)
      {
        id: number,          // Module CM ID
        url: string,         // Module URL
        name: string,        // Module name
        instance: number,    // Module instance ID
        contextid: number,
        visible: number,
        uservisible: boolean,
        visibleoncoursepage: number,
        modicon: string,     // Icon URL
        modname: string,     // Module type (e.g., 'book', 'resource')
        purpose: string,
        branded: boolean,
        modplural: string,
        indent: number,
        onclick: string,
        afterlink: string,
        customdata: string,
        noviewlink: boolean,
        completion: number,
        downloadcontent: number,
        dates: [],
        groupmode: number,
        
        contents: [          // Array of files/contents (if not excluded)
          {
            type: string,            // 'file' or 'content'
            filename: string,        // File name
            filepath: string,        // File path
            filesize: number,        // Size in bytes
            fileurl: string,         // Download URL
            content: string,         // HTML content (for books)
            timecreated: number,     // Timestamp
            timemodified: number,    // Timestamp
            sortorder: number,
            userid: number,
            author: string,
            license: string,
            tags: []
          }
        ],
        
        contentsinfo: {      // Summary of contents
          filescount: number,
          filessize: number,
          lastmodified: number,
          mimetypes: string[]
        }
      }
    ]
  }
]
```

## Usage Examples

### Basic - Get all course contents
```typescript
const data = await callMoodleApi('core_course_get_contents', {
  courseid: '6109'
});
```

### Metadata only (faster)
```typescript
const data = await callMoodleApi('core_course_get_contents', {
  courseid: '6109',
  excludecontents: '1'  // Don't fetch file contents
});
```

### Get specific section
```typescript
// By section ID
const data = await callMoodleApi('core_course_get_contents', {
  courseid: '6109',
  sectionid: '12345'
});

// Or by section number (0-based)
const data = await callMoodleApi('core_course_get_contents', {
  courseid: '6109',
  sectionnumber: '0'  // First section
});
```

### Get specific module
```typescript
const data = await callMoodleApi('core_course_get_contents', {
  courseid: '6109',
  modid: '579436'  // CM ID of the module
});
```

## Key Findings for Book Content

✅ **Books are fully accessible via this API!**

For book modules (`modname: 'book'`), the `contents` array includes:
1. A `structure` entry with the book's chapter structure
2. An `index.html` entry with the full HTML content
3. Additional chapter files as needed

Example book module response:
```
Book: 1.1. Notes [ ± 60 min ]
CMID: 579434
Instance ID: 95375
Contents: 13 items
  - structure (JSON with chapter structure)
  - index.html (Full book HTML content)
  - Additional chapter files...
```

## Performance Tips

1. **Use `excludecontents=1`** when you only need to list modules without their content
2. **Filter by section** when working with a specific part of the course
3. **Cache the results** as course content doesn't change frequently
4. **Use `modid`** when you need to refresh a single module's data

## Testing Your Instance

Run the comprehensive test script:
```bash
npx ts-node src/lib/moodle/__tests__/test-course-contents.ts
```

This will test all parameters against your Moodle instance and show you exactly what works.
